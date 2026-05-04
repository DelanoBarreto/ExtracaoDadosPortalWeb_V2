/**
 * ROTA DE SETUP - USE UMA ÚNICA VEZ
 * Cria o usuário admin inicial no Supabase Auth.
 * Após criar, DELETE este arquivo ou remova a rota.
 *
 * Acesse: GET /api/auth/setup-admin
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  // Segurança: só funciona em desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Não disponível em produção.' }, { status: 403 });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@portalgov.com',
      password: 'admin123',
      email_confirm: true, // Pula verificação de e-mail
      user_metadata: {
        nome: 'Administrador Master',
        role: 'admin',
      },
    });

    if (error) {
      // Se já existe, só informa
      if (error.message.includes('already registered')) {
        return NextResponse.json({ message: '✅ Usuário admin já existe no sistema.' });
      }
      throw error;
    }

    return NextResponse.json({
      message: '✅ Usuário admin criado com sucesso!',
      email: data.user.email,
      id: data.user.id,
      instrucao: '⚠️ Delete o arquivo /api/auth/setup-admin/route.ts após usar.'
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
