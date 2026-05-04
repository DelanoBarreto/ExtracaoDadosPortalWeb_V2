import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { ids, status } = await request.json();

    if (!ids || !Array.isArray(ids) || !status) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('tab_portarias')
      .update({ status })
      .in('id', ids);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
