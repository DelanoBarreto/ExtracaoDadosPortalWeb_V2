import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { ids, status } = await request.json();

    if (!ids?.length || !status) {
      return NextResponse.json({ error: 'IDs e status são obrigatórios' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('tab_lrf')
      .update({ status })
      .in('id', ids);

    if (error) throw error;
    return NextResponse.json({ success: true, updated: ids.length });

  } catch (error: any) {
    console.error('❌ Erro no bulk-status LRF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
