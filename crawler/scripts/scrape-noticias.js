import { ScraperService } from '../engine/scraper.service.js';

async function extrairDetalhes(service, url) {
  try {
    const $ = await service.fetchHtml(url);
    if (!$) return null;
    
    // Limpeza de UI
    $('header, footer, nav, aside, .sidebar, #sidebar, .breadcrumb, .area-avaliacao, script, style').remove();
    
    let titulo = $('.TitleInforma-detalhe').first().text().trim() || $('h1').first().text().trim();
    let resumo = $('.SubtitleInforma-detalhe').first().text().trim() || $('meta[property="og:description"]').attr('content') || '';
    
    let coreContent = '';
    const contentSelectors = ['.p-info', '.TextoInforma-detalhe', 'article'];
    for (const sel of contentSelectors) {
      const el = $(sel).clone();
      el.find('h1, h2, h3, .TitleInforma-detalhe, #speak').remove();
      let txt = el.text().trim();
      if (txt.length > 50) {
        coreContent = txt;
        break;
      }
    }

    return { 
      titulo, 
      resumo: resumo.substring(0, 500), 
      conteudo: coreContent.substring(0, 5000) 
    };
  } catch (err) {
    service.log(`Erro detalhes ${url}: ${err.message}`, 'warn');
    return null;
  }
}

async function run() {
  const service = new ScraperService('NOTICIAS');
  const { limit, municipio_id, url_base, municipio_nome } = service.args;

  if (!municipio_id || !url_base) {
    service.log('FALTAM PARÂMETROS: --municipio_id e --url_base são obrigatórios.', 'error');
    process.exit(1);
  }

  service.log(`Iniciando coleta para ${municipio_nome} em ${url_base}`);

  try {
    const urlLista = `${url_base}/informa.php`;
    const $ = await service.fetchHtml(urlLista);
    if (!$) return;
    
    const links = [];
    $('a[href*="/informa/"]').each((i, el) => {
      const href = $(el).attr('href');
      const img = $(el).find('img').attr('src');
      const fullUrl = new URL(href, url_base).href;
      if (!links.some(l => l.url === fullUrl)) {
        links.push({ url: fullUrl, img: img ? new URL(img, url_base).href : null });
      }
    });

    let itemsSaved = 0;
    const itemsToProcess = links.slice(0, limit);

    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      service.logProgress(i + 1, itemsToProcess.length, `Analisando: ${item.url.substring(0, 40)}...`);

      const detalhes = await extrairDetalhes(service, item.url);
      if (!detalhes) continue;

      let novaImagemUrl = null;
      if (item.img) {
        novaImagemUrl = await service.uploadMedia(item.img, 'arquivos_municipais', `${municipio_nome}/noticias`);
      }

      const sucesso = await service.salvarDados('tab_noticias', {
        municipio_id,
        titulo: detalhes.titulo,
        resumo: detalhes.resumo,
        conteudo: detalhes.conteudo,
        url_original: item.url,
        imagem_url: novaImagemUrl,
        status: 'rascunho',
        data_publicacao: new Date().toISOString()
      });

      if (sucesso) itemsSaved++;
    }

    service.log(`Finalizado: ${itemsSaved} novas notícias processadas.`, 'success');
    process.exit(0);

  } catch (err) {
    service.log(`Erro crítico: ${err.message}`, 'error');
    process.exit(1);
  }
}

run();
