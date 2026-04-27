import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { count: noticias } = await supabaseAdmin
      .from('tab_noticias')
      .select('*', { count: 'exact', head: true });

    const { count: lrf } = await supabaseAdmin
      .from('tab_lrf')
      .select('*', { count: 'exact', head: true });

    const { count: secretarias } = await supabaseAdmin
      .from('tab_secretarias')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({ 
      noticias: noticias || 0, 
      lrf: lrf || 0, 
      secretarias: secretarias || 0 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
