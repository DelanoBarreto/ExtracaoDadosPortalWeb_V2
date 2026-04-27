const axios = require('axios');
const cheerio = require('cheerio');
const { supabase } = require('../legacy_backup/src/lib/supabase-bot');
const scraperService = require('../legacy_backup/src/services/scraper-service');

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
    const { data: html } = await axios.get(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(html);
    
    // LIMPEZA INICIAL - Remover elementos globais de navegação e ruído
    $('header, footer, nav, aside, .sidebar, #sidebar, .breadcrumb, .breadcrumbs, .navigation, .area-avaliacao, #form_aval_informa, .area-comentarios, .links-sociais, .print-download, script, style, .LinkInforma3, .type-link1, .area-mais-lidas, .relacionadas, #speak, #speak_text, [id^="speak"]').remove();
    
    // 1. EXTRAÇÃO DE TÍTULO
    let titulo = $('.TitleInforma-detalhe').first().text().trim();
    if (!titulo) titulo = $('h1').first().text().trim();
    titulo = titulo.replace(/Qual o seu nível de satisfação.*/gi, '').trim();

    // 2. EXTRAÇÃO DE METADADOS
    let autor = 'Prefeitura';
    let categoria = 'Geral';
    let dataPublicacao = null;

    // Escopo da notícia para evitar pegar ícones do rodapé
    const newsContainer = $('#Noticia, article, .noticia-detalhe').first();
    
    // Tenta capturar o container de metadados (FontAwesome ou Bootstrap Icons)
    // Procuramos especificamente dentro do contexto da notícia
    let metaContainer = newsContainer.find('.fa-user, .bi-person-circle').first().parent();
    
    // Se não achou no container específico, tenta no body (fallback)
    if (!metaContainer.length) {
        metaContainer = $('.fa-user, .bi-person-circle').first().parent();
    }

    const metaLine = metaContainer.text().replace(/\s+/g, ' ').trim();
    
    // Data
    const dataMatch = metaLine.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dataMatch) {
        dataPublicacao = formatarData(dataMatch[0]);
    } else {
        // Busca data em qualquer lugar da notícia ou body
        const anyDataMatch = newsContainer.text().match(/(\d{2}\/\d{2}\/\d{4})/) || $('body').text().match(/(\d{2}\/\d{2}\/\d{4})/);
        if (anyDataMatch) dataPublicacao = formatarData(anyDataMatch[0]);
    }

    // Autor
    const autorMatch = metaLine.match(/Por\s+(.*?)(?=\s\d{2}\/\d{2}|$|#)/i);
    if (autorMatch) {
        autor = autorMatch[1].trim();
    } else {
        const bAutor = newsContainer.find('.bi-person-circle, .fa-user').parent().text().match(/Por\s+(.*?)\s+\d{2}\//)?.[1]?.trim();
        if (bAutor) autor = bAutor;
    }

    // Categoria (Default 'Geral' já está setado)
    // 1. Tenta hashtag no metaLine (incluindo acentos)
    const catMatch = metaLine.match(/#([a-zA-Zà-úÀ-Ú0-9_-]+)/);
    if (catMatch) {
        categoria = catMatch[1];
    } 
    // 2. Se ainda for Geral, tenta ícones de tag dentro da notícia
    else {
        const tagText = newsContainer.find('.fa-tag, .bi-tag, .bi-tag-fill').first().parent().text().trim();
        if (tagText) {
            categoria = tagText.replace('#', '').trim();
        }
    }

    // 3. Fallback final: Selector específico sugerido pelo usuário
    if (categoria === 'Geral' || !categoria) {
        const specificCat = newsContainer.find('center > span > span:nth-child(3), center > span > span:contains("#")').text().trim();
        if (specificCat) categoria = specificCat.replace('#', '').trim();
    }

    // Garante que categoria nunca seja vazio ou nulo (sempre 'Geral' se não achar)
    if (!categoria || categoria.trim() === '') {
        categoria = 'Geral';
    }

    // 3. EXTRAÇÃO DE RESUMO E CONTEÚDO
    // No padrão Assesi, o resumo é o SubtitleInforma-detalhe ou o og:description
    let resume = $('.SubtitleInforma-detalhe').first().text().trim();
    
    if (!resume || resume.length < 10) {
        resume = $('meta[property="og:description"]').attr('content') || '';
    }

    if (!resume || resume.length < 10) {
        resume = $('meta[name="description"]').attr('content') || '';
    }

    // Se ainda não achou, tenta pegar o texto logo após o título
    if (!resume || resume.length < 10) {
        resume = $('.TitleInforma-detalhe').first().next('p, div').text().trim();
    }

    let coreContent = '';
    // .p-info é comum no Assesi para o conteúdo real
    const contentSelectors = ['#Noticia > div:nth-child(3) > div > div > div.p-info', '.p-info', '.TextoInforma-detalhe', '.NoticiaInnerBody', '.noticia-texto', '.entry-content', 'article'];
    
    for (const sel of contentSelectors) {
      const el = $(sel).clone();
      
      // REMOÇÃO DE RUÍDO ESPECÍFICO (Sidebar, links relacionados, etc.)
      el.find('.LinkInforma3, .type-link1, .sidebar, aside, .area-mais-lidas, .relacionadas, .newsletter, .tags').remove();
      
      // Remove elementos de UI, títulos repetidos e metadados dentro do corpo
      // Removemos speak_text e qualquer div de suporte à acessibilidade que duplique o texto
      el.find('h1, h2, h3, .TitleInforma-detalhe, .SubtitleInforma-detalhe, .links-sociais, .area-avaliacao, .fa-user, .fa-calendar, .fa-eye, #speak, #speak_text, #btn-ouvir, [id^="speak"]').remove();
      
      let txt = el.text().trim();
      
      // Se o texto começar com o título da notícia, removemos essa repetição
      if (txt.toLowerCase().startsWith(titulo.toLowerCase())) {
          txt = txt.substring(titulo.length).trim();
      }

      // O conteúdo real deve ser substancial. 
      if (txt.length > 50 && !txt.includes('Início') && txt.length > (resume.length / 2)) {
        coreContent = txt;
        break;
      }
    }

    // Caso de notícia sem descrição detalhada (como o exemplo #84)
    if (!coreContent || coreContent.length < 50) {
        coreContent = 'Sem descrição detalhada.';
    }

    coreContent = coreContent.replace(/(\n\s*){2,}/g, '\n\n').trim();
    
    // Limpeza final de ruído de navegação no início do conteúdo
    coreContent = coreContent.replace(/^(Início|Notícias|NOTÍCIAS|Detalhe)\s+\d{2}[-/][A-Z]{3}[-/]\d{4}\s+/gi, '');
    coreContent = coreContent.replace(/^(Início|Notícias|NOTÍCIAS|Detalhe)\s+/gi, '');

    resume = resume.replace(/\n/g, ' ').trim();

    return { 
        titulo, 
        dataPublicacao, 
        conteudo: coreContent.substring(0, 5000),
        resumo: resume.substring(0, 500),
        autor,
        categoria,
        acessos: 0 
    };
  } catch (err) {
    console.error(`⚠️ Erro ao detalhar ${url}:`, err.message);
    return null;
  }
}

async function rasparNoticiasV2() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 20;

  // Novos argumentos para tornar o scraper dinâmico
  const idArg = args.find(a => a.startsWith('--municipio_id='));
  const urlArg = args.find(a => a.startsWith('--url_base='));
  const nomeArg = args.find(a => a.startsWith('--municipio_nome='));

  let municipioId = idArg ? idArg.split('=')[1] : null;
  let urlBase = urlArg ? urlArg.split('=')[1].replace(/"/g, '') : null;
  // Normaliza URL base para remover barra final se existir (ajuda na classe URL)
  if (urlBase) urlBase = urlBase.replace(/\/$/, '');
  let municipioNome = nomeArg ? nomeArg.split('=')[1].replace(/"/g, '') : 'Desconhecido';

  // Fallback para Aracati se nada for passado (compatibilidade)
  if (!municipioId || !urlBase) {
    console.log('⚠️ Parâmetros de município não fornecidos. Buscando fallback: Aracati...');
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
      console.error('❌ Falha crítica: Nenhum município identificado para raspagem.');
      return;
    }
  }

  console.log(`🚀 Iniciando NOTICIAS | Município: ${municipioNome} | Limite: ${limit === 0 ? 'ILIMITADO' : limit}...`);

  const urlLista = `${urlBase}/informa.php`;

  try {
    const { data: html } = await axios.get(urlLista, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(html);
    
    const linksProcessados = new Set();
    let itemsSaved = 0;
    const effectiveLimit = limit === 0 ? Infinity : limit;
    let currentPage = 0;
    let hasMorePages = true;

    while (itemsSaved < effectiveLimit && hasMorePages) {
      const urlComPagina = currentPage === 0 ? urlLista : `${urlLista}?pagina=${currentPage}`;
      console.log(`\n📄 [PÁGINA ${currentPage + 1}] Lendo links de: ${urlComPagina}`);
      
      const { data: pageHtml } = await axios.get(urlComPagina, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const $page = cheerio.load(pageHtml);
      
      const pageItems = [];
      $page('a[href*="/informa/"]').each((i, el) => {
        const link = $page(el).attr('href');
        const img = $page(el).find('img').attr('src');
        
        // Uso da classe URL para evitar barras duplas e erros de caminho relativo
        let urlCompleta;
        try {
          urlCompleta = new URL(link, urlBase).href;
        } catch (e) {
          urlCompleta = link.startsWith('http') ? link : `${urlBase}${link.startsWith('/') ? '' : '/'}${link}`;
        }

        if (!linksProcessados.has(urlCompleta)) {
          linksProcessados.add(urlCompleta);
          pageItems.push({
            url: urlCompleta,
            imagemOriginal: img ? (img.startsWith('http') ? img : `${urlBase}/${img.replace(/^\//, '')}`) : null
          });
        }
      });

      if (pageItems.length === 0) {
        console.log('   🏁 Nenhuma nova notícia encontrada nesta página. Fim da lista.');
        hasMorePages = false;
        break;
      }

      console.log(`   🔎 [${itemsSaved + 1}/${effectiveLimit}] Encontrados ${pageItems.length} links na página. Verificando novidades...`);

      for (const item of pageItems) {
        if (itemsSaved >= effectiveLimit) break;

        // Verificação preventiva robusta
        const { data: existente } = await supabase
          .from('tab_noticias')
          .select('id')
          .eq('url_original', item.url)
          .maybeSingle();

        if (existente) {
          console.log(`   ⏭️ [${itemsSaved + 1}/${effectiveLimit}] Já cadastrado. Pulando.`);
          continue;
        }

        console.log(`   ✨ [${itemsSaved + 1}/${effectiveLimit}] NOVO ITEM DETECTADO: ${item.url}`);
        const detalhes = await extrairDetalhesNoticia(item.url);
        if (!detalhes) continue;

        console.log(`      📝 Título: ${detalhes.titulo}`);
        console.log(`      📅 Data: ${detalhes.dataPublicacao}`);
        console.log(`      👤 Autor: ${detalhes.autor}`);
        console.log(`      👁️  Acessos: ${detalhes.acessos}`);

        let novaImagemUrl = null;
        if (item.imagemOriginal) {
          const folderPath = `${municipioNome}/noticias`;
          novaImagemUrl = await scraperService.uploadMedia(item.imagemOriginal, 'arquivos_municipais', folderPath);
        }

        const sucesso = await scraperService.salvarNoticia({
          municipio_id: municipioId,
          titulo: detalhes.titulo,
          url_original: item.url,
          imagem_url: novaImagemUrl,
          conteudo: detalhes.conteudo,
          resumo: detalhes.resumo,
          data_publicacao: detalhes.dataPublicacao,
          autor: detalhes.autor,
          categoria: detalhes.categoria,
          acessos: detalhes.acessos,
          status: 'rascunho'
        });

        if (sucesso) {
          console.log('   ✅ Salvo no Supabase!');
          itemsSaved++;
        }
      }

      currentPage++;
      // Segurança: evitar loops infinitos (máximo 50 páginas por execução)
      if (currentPage >= 50 && effectiveLimit !== Infinity) {
          console.log('   ⚠️ Teto de 50 páginas atingido. Encerrando para segurança.');
          hasMorePages = false;
      }
    }

    console.log(`\n✨ Raspagem concluída! Total de novos itens adicionados: ${itemsSaved}`);

  } catch (err) {
    console.error('💥 Erro fatal:', err.message);
  }
}

rasparNoticiasV2();
