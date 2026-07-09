import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export async function POST() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Criar o bucket privado para arquivos originais se não existir
    const { error: origError } = await supabaseAdmin.storage.createBucket('shift-originals', {
      public: false,
      fileSizeLimit: 104857600, // 100MB por arquivo
    });
    
    if (origError && origError.message !== 'Bucket already exists') {
      console.error('Erro ao criar bucket shift-originals:', origError);
    }

    // 2. Criar o bucket público para previews se não existir
    const { error: prevError } = await supabaseAdmin.storage.createBucket('shift-previews', {
      public: true,
      fileSizeLimit: 15728640, // 15MB por arquivo
    });

    if (prevError && prevError.message !== 'Bucket already exists') {
      console.error('Erro ao criar bucket shift-previews:', prevError);
    }

    // 3. Atualizar o perfil do primeiro usuário para 'admin' se necessário (facilidade de setup)
    // O usuário pode definir seu próprio perfil como admin no banco, mas vamos retornar sucesso de infra
    return NextResponse.json({ 
      success: true, 
      message: 'Estrutura de storage criada com sucesso.' 
    });

  } catch (err: any) {
    console.error('Setup error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 });
  }
}
