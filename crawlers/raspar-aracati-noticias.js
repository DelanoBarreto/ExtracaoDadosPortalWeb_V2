const axios = require('axios');
const cheerio = require('cheerio');
const { supabase } = require('../legacy_backup/src/lib/supabase-bot');
const scraperService = require('../legacy_backup/src/services/scraper-service');

async function rasparNoticiasAracati() {
  console.log('🕵️ Iniciando raspagem de notícias: Aracati...');

  const { data: municipio } = await supabase
    .from('tab_municipios')
    .select('*')
    .eq('nome', 'Aracati')
    .single();

  if (!municipio) return;

  const urlNoticias = `${municipio.url_base}/informa.php`;

  try {
    const { data: html } = await axios.get(urlNoticias);
    const $ = cheerio.load(html);

    const mapaNoticias = new Map();

    // 1. Coleta todos os links de notícias
    $('a[href*="/informa/"]').each((i, el) => {
      const link = $(el).attr('href');
      const texto = $(el).text().trim();
      const img = $(el).find('img').attr('src');
      
      const urlCompleta = link.startsWith('http') ? link : `${municipio.url_base}/${link.replace(/^\//, '')}`;

      if (!mapaNoticias.has(urlCompleta)) {
        mapaNoticias.set(urlCompleta, {
          titulo: '',
          imagem: null,
          url: urlCompleta
        });
      }

      const noticia = mapaNoticias.get(urlCompleta);

      // O título real é o texto mais longo que não seja "Continue lendo..."
      if (texto && texto !== 'Continue lendo...' && texto.length > noticia.titulo.length) {
        noticia.titulo = texto;
      }

      // Tenta pegar a imagem
      if (img) {
        noticia.imagem = img.startsWith('http') ? img : `${municipio.url_base}/${img.replace(/^\//, '')}`;
      }
    });

    const noticiasFinais = Array.from(mapaNoticias.values()).filter(n => n.titulo !== '');

    console.log(`📝 Encontradas ${noticiasFinais.length} notícias reais. Processando...`);

    for (const n of noticiasFinais) {
      console.log(`⏳ Processando: ${n.titulo.substring(0, 50)}...`);

      let novaImagemUrl = null;
      if (n.imagem) {
        novaImagemUrl = await scraperService.uploadMedia(n.imagem);
      }

      await scraperService.salvarNoticia({
        municipio_id: municipio.id,
        titulo: n.titulo,
        url_original: n.url,
        imagem_url: novaImagemUrl,
        conteudo: 'Conteúdo será extraído na próxima fase...'
      });
    }

    console.log('✅ Raspagem de notícias concluída!');

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

rasparNoticiasAracati();
