import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export async function GET(req: Request) {
  return handleCleanup(req);
}

export async function POST(req: Request) {
  return handleCleanup(req);
}

async function handleCleanup(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    
    // Proteção básica por token para evitar abusos na rota pública de cron
    const cronSecret = process.env.CRON_SECRET || 'shift_cleanup_key_2026';
    if (token !== cronSecret) {
      return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date().toISOString();

    // 1. Encontrar projetos que foram finalizados e já passaram do período de 30 dias
    const { data: expiredProjects, error: projError } = await supabaseAdmin
      .from('shift_projects')
      .select('id, title')
      .eq('status', 'completed')
      .lt('expires_at', now);

    if (projError) {
      throw new Error('Erro ao buscar projetos expirados: ' + projError.message);
    }

    if (!expiredProjects || expiredProjects.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum projeto expirado para limpar no momento.' 
      });
    }

    let cleanedProjectsCount = 0;
    let deletedFilesCount = 0;

    // 2. Processar a exclusão física dos arquivos para cada projeto expirado
    for (const project of expiredProjects) {
      // Buscar todos os arquivos cadastrados para este projeto
      const { data: files } = await supabaseAdmin
        .from('shift_project_files')
        .select('id, url_high_res')
        .eq('project_id', project.id);

      if (files && files.length > 0) {
        const origPaths = files.map(f => f.url_high_res);
        const prevPaths = origPaths.map(path => path.replace('originals/', 'previews/'));

        // Excluir os originais do bucket privado
        const { error: errOrig } = await supabaseAdmin.storage
          .from('shift-originals')
          .remove(origPaths);

        if (errOrig) {
          console.error(`Erro ao apagar originais do projeto ${project.id}:`, errOrig);
        }

        // Excluir os previews do bucket público
        const { error: errPrev } = await supabaseAdmin.storage
          .from('shift-previews')
          .remove(prevPaths);

        if (errPrev) {
          console.error(`Erro ao apagar previews do projeto ${project.id}:`, errPrev);
        }

        deletedFilesCount += files.length;
      }

      // 3. Atualizar o status do projeto para 'expired'
      const { error: updateError } = await supabaseAdmin
        .from('shift_projects')
        .update({ status: 'expired' })
        .eq('id', project.id);

      if (updateError) {
        console.error(`Erro ao atualizar status do projeto ${project.id} para expirado:`, updateError);
      } else {
        cleanedProjectsCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Limpeza concluída com sucesso.`,
      projectsCleaned: cleanedProjectsCount,
      filesDeleted: deletedFilesCount
    });

  } catch (err: any) {
    console.error('Cleanup cron error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
