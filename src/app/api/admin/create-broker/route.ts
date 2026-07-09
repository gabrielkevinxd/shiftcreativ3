import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { email, password, fullName, companyName } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Criar o usuário no Auth do Supabase (ignora verificação de e-mail por ser gerado pelo admin)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
    }

    const userId = authData.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Falha ao recuperar ID do usuário criado.' }, { status: 500 });
    }

    // 2. Criar/atualizar o perfil do corretor na tabela shift_profiles
    const { error: profileError } = await supabaseAdmin
      .from('shift_profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        company_name: companyName,
        role: 'broker'
      });

    if (profileError) {
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Corretor cadastrado com sucesso!' });

  } catch (err: any) {
    console.error('Create broker error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
