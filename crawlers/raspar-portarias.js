const axios = require('axios');
const cheerio = require('cheerio');
const { supabase } = require('../src/lib/supabase-bot');
const scraperService = require('../src/services/scraper-service');

/**
 * Converte data DD/MM/AAAA para ISO
 */
function formatarData(dataPt) {
  if (!dataPt) return null;
  const parts = dataPt.split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

async function extrairDetalhesPortaria(url, urlBase) {
  try {
    const { data: html } = await axios.get(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(html);
    
    const tituloCompleto = $('div.titulo strong').text().trim();
    // Exemplo: "NOMEAÇÃO: 001.01.05/2026" ou "APROVAR: 002.29.09/2025 - COLETIVA"
    
    let numero = tituloCompleto;
    if (tituloCompleto.includes(':')) {
      numero = tituloCompleto.split(':')[1].trim();
    }

    const pdfRelative = $('div.titulo a.btn-primary').attr('href');
    let arquivoOriginal = null;
    if (pdfRelative) {
        arquivoOriginal = pdfRelative.startsWith('http') ? pdfRelative : `${urlBase}/${pdfRelative.replace(/^\//, '')}`;
    }

    let dataPortaria = null;
    let tipo = null;
    let agente = null;
    let cargo = null;
    let secretaria = null;
    let detalhamento = null;

    $('div.col-md-12').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('Data da portaria:')) dataPortaria = text.replace('Data da portaria:', '').trim();
        if (text.includes('Tipo:')) tipo = text.replace('Tipo:', '').trim();
        if (text.includes('Agente:')) agente = text.replace('Agente:', '').trim();
        if (text.includes('Cargo:')) cargo = text.replace('Cargo:', '').trim();
        if (text.includes('Secretaria:')) secretaria = text.replace('Secretaria:', '').trim();
        
        // Detalhamento é especial: fica em uma div com text-align: justify
        if ($(el).css('text-align') === 'justify') {
            detalhamento = text;
        }
    });

    // Fallback para detalhamento se o seletor CSS falhar (alguns cheerio não pegam CSS inline)
    if (!detalhamento) {
        const detailLabel = $('div.titulo1:contains("Detalhamento da portaria")').parent();
        detalhamento = detailLabel.next('div').text().trim();
    }

    const dataIso = formatarData(dataPortaria);
    const ano = dataIso ? parseInt(dataIso.split('-')[0]) : null;

    return {
      numero,
      data_portaria: dataIso,
      ano,
      tipo,
      agente,
      cargo,
      secretaria,
      detalhamento,
      arquivoOriginal
    };
  } catch (err) {
    console.error(`⚠️ Erro ao detalhar portaria ${url}:`, err.message);
    return null;
  }
}

async function rasparPortarias() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 10;

  const idArg = args.find(a => a.startsWith('--municipio_id='));
  const urlArg = args.find(a => a.startsWith('--url_base='));
  const nomeArg = args.find(a => a.startsWith('--municipio_nome='));

  let municipioId = idArg ? idArg.split('=')[1] : null;
  let urlBase = urlArg ? urlArg.split('=')[1].replace(/"/g, '') : null;
  if (urlBase) urlBase = urlBase.replace(/\/$/, '');
  let municipioNome = nomeArg ? nomeArg.split('=')[1].replace(/"/g, '') : 'Aracati';

  // Fallback para Aracati se nada for passado
  if (!municipioId || !urlBase) {
    const { data: fallback } = await supabase
      .from('tab_municipios')
      .select('*')
      .eq('nome', 'Aracati')
      .single();
    
    if (fallback) {
      municipioId = fallback.id;
      urlBase = fallback.url_base.replace(/\/$/, '');
      municipioNome = fallback.nome;
    } else {
      console.error('❌ Falha crítica: Município não identificado.');
      return;
    }
  }

  console.log(`🚀 Iniciando PORTARIAS | Município: ${municipioNome} | Limite: ${limit}...`);

  const urlLista = `${urlBase}/portaria.php`;

  try {
    const { data: html } = await axios.get(urlLista, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(html);
    
    let itemsSaved = 0;
    const effectiveLimit = limit === 0 ? Infinity : limit;
    let currentPage = 0;
    let hasMorePages = true;

    while (itemsSaved < effectiveLimit && hasMorePages) {
      const urlComPagina = currentPage === 0 ? urlLista : `${urlLista}?pagina=${currentPage}`;
      console.log(`\n📄 [PÁGINA ${currentPage + 1}] Lendo de: ${urlComPagina}`);
      
      const { data: pageHtml } = await axios.get(urlComPagina, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const $page = cheerio.load(pageHtml);
      
      const pageItems = [];
      $page('.list-group').each((i, el) => {
        const link = $page(el).find('a[href*="portaria.php?id="]').first().attr('href');
        if (link) {
          try {
            const urlCompleta = new URL(link, urlBase).href;
            pageItems.push(urlCompleta);
          } catch (e) {
            const urlCompleta = `${urlBase}/${link.replace(/^\//, '')}`;
            pageItems.push(urlCompleta);
          }
        }
      });

      if (pageItems.length === 0) {
        console.log('   🏁 Fim da lista.');
        hasMorePages = false;
        break;
      }

      for (const itemUrl of pageItems) {
        if (itemsSaved >= effectiveLimit) break;

        // Verificação de duplicidade (URL Original é o melhor âncora)
        const { data: existente } = await supabase
          .from('tab_portarias')
          .select('id')
          .eq('url_original', itemUrl)
          .maybeSingle();

        if (existente) {
          console.log(`   ⏭️ Já cadastrado: ${itemUrl}`);
          continue;
        }

        console.log(`   ✨ Extraindo: ${itemUrl}`);
        const info = await extrairDetalhesPortaria(itemUrl, urlBase);
        if (!info) continue;

        let novaArquivoUrl = null;
        if (info.arquivoOriginal) {
          console.log(`      📂 Subindo PDF: ${info.arquivoOriginal}`);
          const folderPath = `${municipioNome}/portarias`;
          novaArquivoUrl = await scraperService.uploadMedia(info.arquivoOriginal, 'arquivos_municipais', folderPath);
        }

        const { error: insertError } = await supabase
          .from('tab_portarias')
          .insert({
            municipio_id: municipioId,
            numero: info.numero,
            data_portaria: info.data_portaria,
            ano: info.ano,
            tipo: info.tipo,
            agente: info.agente,
            cargo: info.cargo,
            secretaria: info.secretaria,
            detalhamento: info.detalhamento,
            arquivo_url: novaArquivoUrl,
            url_original: itemUrl,
            status: 'publicado' // Portarias raspadas já entram como publicadas por padrão
          });

        if (!insertError) {
          console.log(`   ✅ Salvo: ${info.numero}`);
          itemsSaved++;
        } else {
          console.error(`   ❌ Erro ao salvar ${info.numero}:`, insertError.message);
        }
      }

      // Paginação
      const nextBtn = $page('a[aria-label="Next"]:last-child');
      if (nextBtn.length > 0 && itemsSaved < effectiveLimit) {
          currentPage++;
      } else {
          hasMorePages = false;
      }
    }

    console.log(`\n✨ Concluído! ${itemsSaved} novas portarias adicionadas.`);

  } catch (err) {
    console.error('💥 Erro fatal:', err.message);
  }
}

rasparPortarias();
