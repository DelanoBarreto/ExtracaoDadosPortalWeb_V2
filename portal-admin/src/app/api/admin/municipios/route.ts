import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { action, id, nome, url_base } = await request.json();

    if (action === 'insert') {
      const { data, error } = await supabaseAdmin
        .from('tab_municipios')
        .insert([{ nome, url_base, ativo: true }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ data });
    } 
    
    if (action === 'update') {
      const { data, error } = await supabaseAdmin
        .from('tab_municipios')
        .update({ nome, url_base })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === 'delete') {
      const { error } = await supabaseAdmin
        .from('tab_municipios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action not found' }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Erro na api de municipios:', error);
    return NextResponse.json({ error: error.message || 'Erro desconhecido' }, { status: 500 });
  }
}
