const axios = require('axios');
const cheerio = require('cheerio');
const { supabase } = require('./src/lib/supabase-bot');
const scraperService = require('./src/services/scraper-service');

/**
 * Converte data DD/MM/AAAA para ISO
 */
function formatarData(dataPt) {
  if (!dataPt) return null;
  const parts = dataPt.split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`;
}

async function extrairDetalhesNoticia(url) {
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    
    // Título real do H1
    const titulo = $('h1').first().text().trim().replace(/Qual o seu nível de satisfação.*/g, '').trim();
    
    // Extrações refinadas: Autor, Catálogo (Tag) e Acessos (Visualizações)
    // O html tem um span com id="quantinforma", tag bi-tag-fill, e bi-person-circle
    const autor = $('.bi-person-circle').parent().text().match(/Por\s+(.*?)\s+\d{2}\//)?.[1]?.trim() || 'Prefeitura de Aracati';
    const categoria = $('.bi-tag-fill').parent().text().trim() || '#Geral';
    const acessosText = $('#quantinforma').text().trim() || '0';
    const acessos = parseInt(acessosText, 10);
    
    // Data via Regex (procura padrão 00/00/0000 no texto)
    const corpoTexto = $('body').text();
    const matchData = corpoTexto.match(/(\d{2}\/\d{2}\/\d{4})/);
    const dataPublicacao = matchData ? formatarData(matchData[0]) : null;

    // Conteúdo (Geralmente está dentro de uma div container que não é o menu)
    // Vamos pegar o texto principal removendo scripts e menus conhecidos
    $('script, style, nav, footer, header').remove();
    
    let conteudo = '';
    $('div').each((i, el) => {
        const txt = $(el).children().length === 0 ? $(el).text().trim() : '';
        if (txt.length > 200 && !conteudo) {
            conteudo = txt;
        }
    });

    // Fallback
    if (!conteudo) {
        conteudo = $('main').text().trim() || $('article').text().trim() || 'Conteúdo não identificado';
    }

    // Limpeza de Espaços em Branco (evita múltiplos parágrafos puros vazios)
    conteudo = conteudo.replace(/(\n\s*){2,}/g, '\n\n').trim();

    return { 
        titulo, 
        dataPublicacao, 
        conteudo: conteudo.substring(0, 5000), // Limite de segurança
        resumo: conteudo.substring(0, 200).replace(/\n/g, ' ') + '...',
        autor,
        categoria,
        acessos: isNaN(acessos) ? 0 : acessos
    };
  } catch (err) {
    console.error(`⚠️ Erro ao detalhar ${url}:`, err.message);
    return null;
  }
}

async function rasparNoticiasV2() {
  console.log('🚀 Iniciando raspagem de NOTICIAS (Motor v2)...');

  const { data: municipio } = await supabase
    .from('tab_municipios')
    .select('*')
    .eq('nome', 'Aracati')
    .single();

  if (!municipio) {
    console.error('❌ Município não encontrado no banco.');
    return;
  }

  const urlLista = `${municipio.url_base}/informa.php`;

  try {
    const { data: html } = await axios.get(urlLista);
    const $ = cheerio.load(html);
    
    const linksProcessados = new Set();
    const itemQueue = [];

    // Coleta links e imagens da lista
    $('a[href*="/informa/"]').each((i, el) => {
      const link = $(el).attr('href');
      const img = $(el).find('img').attr('src');
      const urlCompleta = link.startsWith('http') ? link : `${municipio.url_base}/${link.replace(/^\//, '')}`;

      if (!linksProcessados.has(urlCompleta) && itemQueue.length < 20) {
        linksProcessados.add(urlCompleta);
        itemQueue.push({
          url: urlCompleta,
          imagemOriginal: img ? (img.startsWith('http') ? img : `${municipio.url_base}/${img.replace(/^\//, '')}`) : null
        });
      }
    });

    console.log(`📌 Encontradas ${itemQueue.length} notícias para processar (Limite de 20).`);

    for (const item of itemQueue) {
      console.log(`\n⏳ [${itemQueue.indexOf(item) + 1}/20] Processando: ${item.url}`);
      
      const detalhes = await extrairDetalhesNoticia(item.url);
      if (!detalhes) continue;

      console.log(`   - Título: ${detalhes.titulo.substring(0, 40)}...`);
      console.log(`   - Data: ${detalhes.dataPublicacao || 'N/A'}`);

      let novaImagemUrl = null;
      if (item.imagemOriginal) {
        console.log(`   - Subindo imagem...`);
        novaImagemUrl = await scraperService.uploadMedia(item.imagemOriginal);
      }

      const sucesso = await scraperService.salvarNoticia({
        municipio_id: municipio.id,
        titulo: detalhes.titulo,
        url_original: item.url,
        imagem_url: novaImagemUrl,
        conteudo: detalhes.conteudo,
        resumo: detalhes.resumo,
        data_publicacao: detalhes.dataPublicacao,
        autor: detalhes.autor,
        categoria: detalhes.categoria,
        acessos: detalhes.acessos
      });

      if (sucesso) console.log('   ✅ Salvo no Supabase!');
    }

    console.log('\n✨ Raspagem v2 concluída com sucesso!');

  } catch (err) {
    console.error('💥 Erro fatal:', err.message);
  }
}

rasparNoticiasV2();
