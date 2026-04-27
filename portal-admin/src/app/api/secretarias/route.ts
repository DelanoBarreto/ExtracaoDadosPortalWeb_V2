import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');

    let query = supabaseAdmin
      .from('tab_secretarias')
      .select('*')
      .order('nome_secretaria', { ascending: true });

    if (municipio_id) {
      query = query.eq('municipio_id', municipio_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
