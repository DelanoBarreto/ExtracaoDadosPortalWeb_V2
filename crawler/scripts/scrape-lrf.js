import { ScraperService } from '../engine/scraper.service.js';

async function formatarData(dataPt) {
  if (!dataPt) return null;
  const partes = dataPt.trim().split('/');
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes;
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T12:00:00Z`;
}

async function startScraping() {
  const service = new ScraperService('LRF');
  const { limit, municipio_id, url_base, municipio_nome } = service.args;

  if (!url_base || !municipio_id) {
    service.log('❌ Parâmetros insuficientes. --url_base e --municipio_id são obrigatórios.', 'error');
    process.exit(1);
  }

  service.log(`🚀 Iniciando LRF para ${municipio_nome}`);

  try {
    let itemsSaved = 0;
    const processedIds = new Set();
    let currentPage = 0;
    let hasMore = true;

    while (itemsSaved < limit && hasMore) {
      const pageUrl = currentPage === 0 
        ? `${url_base}/lrf.php`
        : `${url_base}/lrf.php?pagina=${currentPage}`;

      service.log(`📄 [PÁGINA ${currentPage + 1}] Lendo listagem...`);
      const $ = await service.fetchHtml(pageUrl);
      
      if (!$) {
        hasMore = false;
        break;
      }

      const pageIds = [];
      $('a[href*="lrf.php?id="]').each((_, el) => {
        const href = $(el).attr('href');
        const id = href?.match(/id=(\d+)/)?.[1];
        if (id && !processedIds.has(id)) {
          processedIds.add(id);
          pageIds.push(id);
        }
      });

      if (pageIds.length === 0) {
        hasMore = false;
        break;
      }

      for (const id of pageIds) {
        if (itemsSaved >= limit) break;

        const detailUrl = `${url_base}/lrf.php?id=${id}`;
        service.log(`⏳ Analisando: ${detailUrl}`);
        
        const $d = await service.fetchHtml(detailUrl);
        if (!$d) continue;

        let titulo = $d('h1, h2').first().text().trim();
        let dataOriginal = '';
        let competencia = '';

        $d('div, p, span, strong').each((_, el) => {
          const txt = $d(el).text().trim();
          if (/^DATA:/i.test(txt)) dataOriginal = $d(el).next().text().trim() || txt.split(/DATA:/i)[1]?.trim();
          if (/^COMPET[EÊ]NCIA:/i.test(txt)) competencia = $d(el).next().text().trim() || txt.split(/COMPET[EÊ]NCIA:/i)[1]?.trim();
        });

        const pdfLinks = [];
        $d('a[href*=".pdf"]').each((_, el) => {
          const href = $d(el).attr('href');
          if (href) {
            const fullUrl = href.startsWith('http') ? href : `${url_base}/${href.replace(/^\//, '')}`;
            pdfLinks.push(fullUrl);
          }
        });

        if (pdfLinks.length === 0) continue;

        let savedAny = false;
        for (const pdfUrl of pdfLinks) {
          const { data: existe } = await service.supabase
            .from('tab_lrf')
            .select('id')
            .eq('url_original', pdfUrl)
            .maybeSingle();

          if (existe) continue;

          const storageUrls = await service.uploadPDF(pdfUrl, 'arquivos_municipais', `${municipio_nome}/LRF`);
          
          for (const sUrl of storageUrls) {
            await service.supabase.from('tab_lrf').insert({
              municipio_id,
              titulo: titulo || 'Documento LRF',
              ano: competencia?.match(/\d{4}/)?.[0] || new Date().getFullYear(),
              competencia: competencia || 'Não informada',
              data_publicacao: await formatarData(dataOriginal),
              arquivo_url: sUrl,
              url_original: pdfUrl,
              tipo: titulo.split(' - ')[0] || 'LRF'
            });
            savedAny = true;
          }
        }

        if (savedAny) {
          itemsSaved++;
          service.logProgress(itemsSaved, limit, `Salvo: ${titulo.substring(0, 30)}`);
        }
      }

      currentPage++;
      if (currentPage > 20) break;
    }

    service.log(`🏁 FIM: ${itemsSaved} novos documentos processados.`, 'success');
    process.exit(0);
  } catch (err) {
    service.log(`❌ ERRO CRÍTICO: ${err.message}`, 'error');
    process.exit(1);
  }
}

startScraping();
