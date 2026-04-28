import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { modulo, municipio_id, limit } = body;

    if (!modulo || !municipio_id || limit === undefined) {
      return NextResponse.json({ error: 'Módulo, município e limite são obrigatórios' }, { status: 400 });
    }

    const tableName = `tab_${modulo}`;
    
    if (limit === 'all') {
      const { error } = await supabaseAdmin
        .from(tableName)
        .delete()
        .eq('municipio_id', municipio_id);
        
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Todos os registros excluídos.', deletedCount: 'Todos os' });
    }

    // Obter os IDs mais antigos para exclusão
    const parsedLimit = parseInt(limit, 10);
    const { data: oldestRecords, error: fetchError } = await supabaseAdmin
      .from(tableName)
      .select('id')
      .eq('municipio_id', municipio_id)
      // Assume que todas as tabelas principais têm data_publicacao. 
      // Em caso de tabelas sem data_publicacao, pode-se usar created_at como fallback, mas o usuário garantiu que tem.
      .order('data_publicacao', { ascending: true })
      .limit(parsedLimit);

    if (fetchError) throw fetchError;

    if (!oldestRecords || oldestRecords.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum registro encontrado para exclusão.', deletedCount: 0 });
    }

    const idsToDelete = oldestRecords.map(r => r.id);

    const { error: deleteError } = await supabaseAdmin
      .from(tableName)
      .delete()
      .in('id', idsToDelete);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, deletedCount: idsToDelete.length });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
