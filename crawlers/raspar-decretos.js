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

async function extrairDetalhesDecreto(url, urlBase) {
  try {
    const { data: html } = await axios.get(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(html);
    
    // Extrai o título completo (ex: "Decreto: 053/2026")
    const tituloCompleto = $('div.titulo strong').text().trim();
    
    let numero = tituloCompleto;
    if (tituloCompleto.includes(':')) {
      numero = tituloCompleto.split(':')[1].trim();
    }

    // Extrai o PDF
    const pdfRelative = $('div.titulo a.btn-primary').attr('href');
    let arquivoOriginal = null;
    if (pdfRelative) {
        arquivoOriginal = pdfRelative.startsWith('http') ? pdfRelative : `${urlBase}/${pdfRelative.replace(/^\//, '')}`;
    }

    // Extrai data e descrição iterando as divs com texto
    let dataDecreto = null;
    let ementa = null;

    $('div.col-md-12').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('Data do decreto:')) {
            dataDecreto = text.replace('Data do decreto:', '').trim();
        }
        if (text.includes('Descrição:')) {
            ementa = text.replace('Descrição:', '').trim();
        }
    });

    const dataIso = formatarData(dataDecreto);
    const ano = dataIso ? parseInt(dataIso.split('-')[0]) : null;

    return {
      numero,
      data_decreto: dataIso,
      ano,
      ementa,
      arquivoOriginal
    };
  } catch (err) {
    console.error(`⚠️ Erro ao detalhar decreto ${url}:`, err.message);
    return null;
  }
}

async function rasparDecretos() {
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

  console.log(`🚀 Iniciando DECRETOS | Município: ${municipioNome} | Limite: ${limit}...`);

  const urlLista = `${urlBase}/decretos.php`;

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
        const link = $page(el).find('a[href*="decretos.php?id="]').first().attr('href');
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
          .from('tab_decretos')
          .select('id')
          .eq('url_original', itemUrl)
          .maybeSingle();

        if (existente) {
          console.log(`   ⏭️ Já cadastrado: ${itemUrl}`);
          continue;
        }

        console.log(`   ✨ Extraindo: ${itemUrl}`);
        const info = await extrairDetalhesDecreto(itemUrl, urlBase);
        if (!info) continue;

        let novaArquivoUrl = null;
        if (info.arquivoOriginal) {
          console.log(`      📂 Subindo PDF: ${info.arquivoOriginal}`);
          const folderPath = `${municipioNome}/Decretos`;
          novaArquivoUrl = await scraperService.uploadMedia(info.arquivoOriginal, 'arquivos_municipais', folderPath);
        }

        const { error: insertError } = await supabase
          .from('tab_decretos')
          .insert({
            municipio_id: municipioId,
            numero: info.numero,
            data_decreto: info.data_decreto,
            ano: info.ano,
            tipo: 'Municipal', // Padrão solicitado pelo usuário
            ementa: info.ementa,
            arquivo_url: novaArquivoUrl,
            url_original: itemUrl,
            status: 'rascunho' // Padrão
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

    console.log(`\n✨ Concluído! ${itemsSaved} novos decretos adicionados.`);

  } catch (err) {
    console.error('💥 Erro fatal:', err.message);
  }
}

rasparDecretos();
