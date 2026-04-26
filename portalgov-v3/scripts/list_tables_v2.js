const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fppbzfnaknfpqucwjrhz.supabase.co';
const supabaseKey = 'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  // Supabase doesn't have a direct "list tables" in JS client easily without RPC or querying information_schema
  // But we can try to query common tables or use an RPC if available.
  // A better way is to query information_schema.tables via a custom SQL if allowed, 
  // but since we are in JS client, let's try some variations.

  console.log('--- Listando Tabelas via information_schema ---');
  const { data, error } = await supabase.rpc('get_tables_info'); // If RPC exists

  if (error) {
    // If RPC fails, try a direct query to information_schema (if permissions allow)
    const { data: tables, error: err2 } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (err2) {
       // Try another approach: query a known table and see what else exists
       console.log('Tentando listar via query direta a information_schema.tables...');
       const { data: tables2, error: err3 } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
       if (err3) {
         console.error('Não foi possível listar as tabelas automaticamente.');
         return;
       }
       tables2.forEach(t => console.log(`- ${t.table_name}`));
    } else {
      tables.forEach(t => console.log(`- ${t.tablename}`));
    }
  } else {
    console.log(data);
  }
}

listTables();
