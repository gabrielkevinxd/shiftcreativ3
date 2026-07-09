import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { calculatePackCost } from '@/lib/pricing';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Buscar projeto
    const { data: project, error: projError } = await supabaseAdmin
      .from('shift_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projError || !project) {
      return NextResponse.json({ success: false, error: 'Projeto não encontrado.' }, { status: 404 });
    }

    if (project.status === 'expired') {
      return NextResponse.json({ success: false, error: 'Este projeto já expirou.' }, { status: 410 });
    }

    // 2. Se já estiver finalizado (completed), apenas gera novos links de download temporários
    if (project.status === 'completed') {
      const downloadLinks = await generateSignedUrls(supabaseAdmin, projectId);
      return NextResponse.json({
        success: true,
        downloadLinks,
        message: 'Links de download recuperados com sucesso.'
      });
    }

    // 3. Se estiver ativo, processar a conclusão
    // Buscar seleções
    const { data: selections, error: selError } = await supabaseAdmin
      .from('shift_selections')
      .select('file_id')
      .eq('project_id', projectId)
      .eq('selected', true);

    if (selError || !selections || selections.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhuma mídia selecionada para download.' }, { status: 400 });
    }

    // Buscar mídias do projeto
    const { data: files, error: filesError } = await supabaseAdmin
      .from('shift_project_files')
      .select('*')
      .eq('project_id', projectId);

    if (filesError || !files) {
      return NextResponse.json({ success: false, error: 'Erro ao buscar arquivos do projeto.' }, { status: 500 });
    }

    // Contar arquivos selecionados por tipo de forma segura (server-side)
    const selectedFiles = files.filter((f: any) => selections.some((s: any) => s.file_id === f.id));
    const counts = {
      photos: selectedFiles.filter((f: any) => f.file_type === 'photo').length,
      drone: selectedFiles.filter((f: any) => f.file_type === 'drone').length,
      ia: selectedFiles.filter((f: any) => f.file_type === 'ia').length,
      videosCount: selectedFiles.filter((f: any) => f.file_type === 'video').length,
    };

    // Calcular o preço final usando a melhor opção de pacote (faturamento dinâmico)
    const pricingOptions = ['pack1', 'pack2', 'pack3'] as const;
    const pricingBreakdowns = pricingOptions.map(p => calculatePackCost(p, counts));
    const recommendedPricing = pricingBreakdowns.reduce((cheapest, current) => {
      return current.total < cheapest.total ? current : cheapest;
    }, pricingBreakdowns[0]);

    // Data de expiração: 30 dias após o download inicial (hoje)
    const completedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(completedAt.getDate() + 30);

    // 4. Atualizar projeto na DB
    const { error: updateError } = await supabaseAdmin
      .from('shift_projects')
      .update({
        status: 'completed',
        completed_at: completedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        final_price: recommendedPricing.total,
        summary_billing: {
          counts,
          billing: recommendedPricing
        }
      })
      .eq('id', projectId);

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Erro ao finalizar faturamento do projeto: ' + updateError.message }, { status: 500 });
    }

    // 5. Gerar links temporários de download (Signed URLs de 1h)
    const downloadLinks = await generateSignedUrls(supabaseAdmin, projectId);

    return NextResponse.json({
      success: true,
      downloadLinks,
      message: 'Projeto finalizado e mídias liberadas com sucesso.'
    });

  } catch (err: any) {
    console.error('Download api error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Gera links seguros (Signed URLs) temporários de 1 hora para todos os arquivos selecionados
 */
async function generateSignedUrls(supabaseAdmin: any, projectId: string) {
  // Buscar arquivos do projeto selecionados
  const { data: selections } = await supabaseAdmin
    .from('shift_selections')
    .select('file_id')
    .eq('project_id', projectId)
    .eq('selected', true);

  if (!selections || selections.length === 0) return [];

  const { data: files } = await supabaseAdmin
    .from('shift_project_files')
    .select('*')
    .eq('project_id', projectId);

  if (!files) return [];

  const selectedFiles = files.filter((f: any) => selections.some((s: any) => s.file_id === f.id));
  
  const links = [];

  for (const file of selectedFiles) {
    // Caminho relativo no storage privado (ex: originals/uuid/filename.jpg)
    const filePath = file.url_high_res;

    // Gerar Signed URL com validade de 3600 segundos (1 hora)
    const { data: signedData, error } = await supabaseAdmin.storage
      .from('shift-originals')
      .createSignedUrl(filePath, 3600);

    if (signedData?.signedUrl) {
      links.push({
        name: file.name,
        url: signedData.signedUrl
      });
    } else {
      console.error(`Erro ao gerar signed url para ${file.name}:`, error);
    }
  }

  return links;
}
