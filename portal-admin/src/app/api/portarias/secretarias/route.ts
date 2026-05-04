import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');

    if (!municipio_id) {
      return NextResponse.json({ error: 'municipio_id é obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('tab_portarias')
      .select('secretaria')
      .eq('municipio_id', municipio_id)
      .not('secretaria', 'is', null)
      .not('secretaria', 'eq', '')
      .order('secretaria', { ascending: true });

    if (error) throw error;

    const secretarias = Array.from(new Set(data?.map(i => i.secretaria))).filter(Boolean) as string[];

    return NextResponse.json(secretarias);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
