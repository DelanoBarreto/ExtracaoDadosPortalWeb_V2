const { supabase } = require('./src/lib/supabase-bot');

async function check() {
    const { data, error, count } = await supabase
        .from('tab_noticias')
        .select('*', { count: 'exact' });
    
    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log(`Total de notícias no banco: ${count}`);
    if (data.length > 0) {
        console.log('Primeira notícia:', data[0].titulo);
        console.log('Município ID:', data[0].municipio_id);
    } else {
        console.log('Tabela vazia!');
    }
}

check();
