/**
 * Crawler de notícias (piloto da arquitetura `extracao`).
 *
 * Camadas (decisão D7):
 *  - bruta: HTML da página guardado no R2 + `dados_brutos` no banco;
 *  - preparação: linha em `extracao.noticias` com situacao = 'a_revisar';
 *  - lacunas: `campos_pendentes` e `alertas` dizem o que o PortalGov ainda precisa.
 *
 * Uso:
 *   node crawlers/raspar-noticias-v2.js --org=aracati --limit=20
 *   node crawlers/raspar-noticias-v2.js --org=aracati --limit=0          (ilimitado)
 *   node crawlers/raspar-noticias-v2.js --org=aracati --execucao_id=<uuid> (pedido `pendente` do painel)
 *   node crawlers/raspar-noticias-v2.js --org=aracati --limit=3 --dry     (não grava nada)
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { dataBrParaIso, extensaoDaUrl, chaveObjeto } = require('../src/lib/extracao-utils');
const { enviarObjeto } = require('../src/lib/r2');
const extracao = require('../src/services/extracao-service');

const MODULO = 'noticias';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
const PAUSA_ENTRE_REQUISICOES_MS = 400; // raspagem educada com o site da prefeitura
const MAX_PAGINAS = 50;

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function lerArgumentos(argv) {
  const valor = (nome) => argv.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1];
  const limite = valor('limit') !== undefined ? parseInt(valor('limit'), 10) : 20;
  if (Number.isNaN(limite) || limite < 0) throw new Error('--limit deve ser um número >= 0 (0 = ilimitado).');
  return {
    org: valor('org') || 'aracati',
    limite,
    execucaoId: valor('execucao_id'),
    dry: argv.includes('--dry'),
  };
}

async function baixarPagina(url) {
  const { data } = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': USER_AGENT } });
  return data;
}

/**
 * Lê uma página de notícia e devolve campos estruturados + o HTML bruto.
 * @param {string} url
 * @returns {Promise<object|null>} null se a página não pôde ser lida.
 */
async function extrairDetalhesNoticia(url) {
  try {
    const htmlBruto = await baixarPagina(url);
    const $ = cheerio.load(htmlBruto);

    // Limpeza inicial: navegação e ruído global
    $('header, footer, nav, aside, .sidebar, #sidebar, .breadcrumb, .breadcrumbs, .navigation, .area-avaliacao, #form_aval_informa, .area-comentarios, .links-sociais, .print-download, script, style, .LinkInforma3, .type-link1, .area-mais-lidas, .relacionadas, #speak, #speak_text, [id^="speak"]').remove();

    let titulo = $('.TitleInforma-detalhe').first().text().trim();
    if (!titulo) titulo = $('h1').first().text().trim();
    titulo = titulo.replace(/Qual o seu nível de satisfação.*/gi, '').trim();

    let autor = 'Prefeitura';
    let categoria = 'Geral';
    let dataPublicacao = null;

    const newsContainer = $('#Noticia, article, .noticia-detalhe').first();
    let metaContainer = newsContainer.find('.fa-user, .bi-person-circle').first().parent();
    if (!metaContainer.length) metaContainer = $('.fa-user, .bi-person-circle').first().parent();
    const metaLine = metaContainer.text().replace(/\s+/g, ' ').trim();

    const dataMatch = metaLine.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dataMatch) {
      dataPublicacao = dataBrParaIso(dataMatch[0]);
    } else {
      const qualquerData = newsContainer.text().match(/(\d{2}\/\d{2}\/\d{4})/) || $('body').text().match(/(\d{2}\/\d{2}\/\d{4})/);
      if (qualquerData) dataPublicacao = dataBrParaIso(qualquerData[0]);
    }

    const autorMatch = metaLine.match(/Por\s+(.*?)(?=\s\d{2}\/\d{2}|$|#)/i);
    if (autorMatch) {
      autor = autorMatch[1].trim();
    } else {
      const autorAlternativo = newsContainer.find('.bi-person-circle, .fa-user').parent().text().match(/Por\s+(.*?)\s+\d{2}\//)?.[1]?.trim();
      if (autorAlternativo) autor = autorAlternativo;
    }

    const catMatch = metaLine.match(/#([a-zA-Zà-úÀ-Ú0-9_-]+)/);
    if (catMatch) {
      categoria = catMatch[1];
    } else {
      const tagText = newsContainer.find('.fa-tag, .bi-tag, .bi-tag-fill').first().parent().text().trim();
      if (tagText) categoria = tagText.replace('#', '').trim();
    }
    if (categoria === 'Geral' || !categoria) {
      const categoriaEspecifica = newsContainer.find('center > span > span:nth-child(3), center > span > span:contains("#")').text().trim();
      if (categoriaEspecifica) categoria = categoriaEspecifica.replace('#', '').trim();
    }
    if (!categoria || categoria.trim() === '') categoria = 'Geral';

    // Resumo: subtítulo, depois og:description, description e o texto logo após o título
    let resumo = $('.SubtitleInforma-detalhe').first().text().trim();
    if (!resumo || resumo.length < 10) resumo = $('meta[property="og:description"]').attr('content') || '';
    if (!resumo || resumo.length < 10) resumo = $('meta[name="description"]').attr('content') || '';
    if (!resumo || resumo.length < 10) resumo = $('.TitleInforma-detalhe').first().next('p, div').text().trim();
    resumo = resumo.replace(/\n/g, ' ').trim();

    // Conteúdo: guarda o HTML (formatação preservada) e o texto plano
    let conteudoHtml = '';
    let textoPlano = '';
    const seletoresConteudo = ['#Noticia > div:nth-child(3) > div > div > div.p-info', '.p-info', '.TextoInforma-detalhe', '.NoticiaInnerBody', '.noticia-texto', '.entry-content', 'article'];
    for (const seletor of seletoresConteudo) {
      const el = $(seletor).first().clone();
      if (!el.length) continue;
      el.find('.LinkInforma3, .type-link1, .sidebar, aside, .area-mais-lidas, .relacionadas, .newsletter, .tags').remove();
      el.find('h1, h2, h3, .TitleInforma-detalhe, .SubtitleInforma-detalhe, .links-sociais, .area-avaliacao, .fa-user, .fa-calendar, .fa-eye, #speak, #speak_text, #btn-ouvir, [id^="speak"]').remove();

      let texto = el.text().trim();
      if (titulo && texto.toLowerCase().startsWith(titulo.toLowerCase())) texto = texto.substring(titulo.length).trim();

      if (texto.length > 50 && !texto.includes('Início') && texto.length > resumo.length / 2) {
        textoPlano = texto.replace(/(\n\s*){2,}/g, '\n\n').trim();
        conteudoHtml = (el.html() || '').trim();
        break;
      }
    }

    return { titulo, dataPublicacao, autor, categoria, resumo: resumo.substring(0, 1000), conteudoHtml, textoPlano, metaLine, htmlBruto };
  } catch (err) {
    console.error(`⚠️ Erro ao detalhar ${url}: ${err.message}`);
    return null;
  }
}

async function baixarImagem(urlImagem) {
  const resposta = await axios.get(urlImagem, { responseType: 'arraybuffer', timeout: 20000, headers: { 'User-Agent': USER_AGENT } });
  return { buffer: Buffer.from(resposta.data), contentType: resposta.headers['content-type'] || 'application/octet-stream' };
}

/**
 * Processa uma notícia: grava HTML bruto e imagem no R2 e a linha em extracao.noticias.
 * @returns {Promise<'criada'|'duplicada'|'erro'>}
 */
async function processarNoticia({ fonte, execucaoId, item, dry }) {
  const detalhes = await extrairDetalhesNoticia(item.url);
  if (!detalhes || !detalhes.titulo) return 'erro';

  const alertas = [];
  if (!detalhes.dataPublicacao) alertas.push({ campo: 'data_publicacao', aviso: 'data não encontrada na página' });
  if (!detalhes.conteudoHtml) alertas.push({ campo: 'conteudo_html', aviso: 'corpo da notícia não identificado' });
  if (!detalhes.resumo) alertas.push({ campo: 'resumo', aviso: 'resumo não encontrado' });

  console.log(`      📝 ${detalhes.titulo} | 📅 ${detalhes.dataPublicacao ?? 's/ data'} | 👤 ${detalhes.autor} | 🏷️ ${detalhes.categoria}`);
  if (dry) return 'criada';

  const chaveHtml = chaveObjeto({ orgSlug: fonte.slug, modulo: MODULO, origem: item.url, extensao: '.html', subpasta: 'raw' });
  await enviarObjeto(chaveHtml, detalhes.htmlBruto, 'text/html; charset=utf-8');

  let imagemKey = null;
  if (item.imagemOriginal) {
    try {
      const { buffer, contentType } = await baixarImagem(item.imagemOriginal);
      imagemKey = chaveObjeto({ orgSlug: fonte.slug, modulo: MODULO, origem: item.imagemOriginal, extensao: extensaoDaUrl(item.imagemOriginal, '.jpg') });
      await enviarObjeto(imagemKey, buffer, contentType);
    } catch (err) {
      alertas.push({ campo: 'imagem_key', aviso: `falha ao baixar a imagem: ${err.message}` });
    }
  } else {
    alertas.push({ campo: 'imagem_key', aviso: 'notícia sem imagem na listagem' });
  }

  return extracao.salvarNoticia({
    organizacao_id: fonte.organizacao_id,
    execucao_id: execucaoId,
    titulo: detalhes.titulo,
    resumo: detalhes.resumo || null,
    conteudo_html: detalhes.conteudoHtml || null,
    imagem_key: imagemKey,
    autor: detalhes.autor,
    categoria: detalhes.categoria,
    data_publicacao: detalhes.dataPublicacao,
    url_original: item.url,
    campos_pendentes: ['categoria_id', 'orgao_id'],
    alertas,
    dados_brutos: {
      fonte_url: item.url,
      html_key: chaveHtml,
      imagem_original: item.imagemOriginal,
      linha_de_metadados: detalhes.metaLine,
      categoria_bruta: detalhes.categoria,
      texto_plano: detalhes.textoPlano.slice(0, 20000),
    },
  });
}

async function rasparNoticias() {
  const { org, limite, execucaoId: execucaoPedida, dry } = lerArgumentos(process.argv.slice(2));
  const fonte = await extracao.obterFonte(org);
  const urlBase = fonte.url_base.replace(/\/$/, '');
  const limiteEfetivo = limite === 0 ? Infinity : limite;

  console.log(`🚀 NOTÍCIAS | ${fonte.nome} (${fonte.slug}) | limite: ${limite === 0 ? 'ilimitado' : limite}${dry ? ' | DRY-RUN (não grava)' : ''}`);

  const execucaoId = dry
    ? null
    : await extracao.iniciarExecucao({ organizacaoId: fonte.organizacao_id, modulo: MODULO, parametros: { limite }, execucaoId: execucaoPedida });

  const totais = { lidos: 0, novos: 0, erros: 0 };
  let falhaFatal = null;

  try {
    const urlLista = `${urlBase}/informa.php`;
    const vistos = new Set();
    let pagina = 0;

    while (totais.novos < limiteEfetivo && pagina < MAX_PAGINAS) {
      const urlPagina = pagina === 0 ? urlLista : `${urlLista}?pagina=${pagina}`;
      console.log(`\n📄 [PÁGINA ${pagina + 1}] ${urlPagina}`);
      const $ = cheerio.load(await baixarPagina(urlPagina));

      const itens = [];
      $('a[href*="/informa/"]').each((_, el) => {
        const link = $(el).attr('href');
        const img = $(el).find('img').attr('src');
        let url;
        try { url = new URL(link, urlBase).href; } catch { return; }
        if (vistos.has(url)) return;
        vistos.add(url);
        itens.push({ url, imagemOriginal: img ? new URL(img, urlBase).href : null });
      });

      if (itens.length === 0) { console.log('   🏁 Fim da lista.'); break; }

      for (const item of itens) {
        if (totais.novos >= limiteEfetivo) break;
        totais.lidos++;

        if (!dry && (await extracao.noticiaJaExiste(fonte.organizacao_id, item.url))) {
          console.log('   ⏭️ já preparada, pulando');
          continue;
        }

        console.log(`   ✨ ${item.url}`);
        try {
          const resultado = await processarNoticia({ fonte, execucaoId, item, dry });
          if (resultado === 'criada') { totais.novos++; console.log('   ✅ preparada (a_revisar)'); }
          else if (resultado === 'erro') totais.erros++;
        } catch (err) {
          totais.erros++;
          console.error(`   ❌ ${item.url}: ${err.message}`);
        }
        await esperar(PAUSA_ENTRE_REQUISICOES_MS);
      }
      pagina++;
    }
  } catch (err) {
    falhaFatal = err;
    console.error(`💥 Erro fatal: ${err.message}`);
  }

  if (execucaoId) {
    await extracao.finalizarExecucao(execucaoId, {
      status: falhaFatal ? 'falhou' : 'concluida',
      ...totais,
      erroResumo: falhaFatal?.message,
    });
  }
  console.log(`\n✨ Fim. Lidos: ${totais.lidos} | Novos: ${totais.novos} | Erros: ${totais.erros}`);
  if (falhaFatal) process.exitCode = 1;
}

rasparNoticias().catch((err) => {
  console.error(`💥 ${err.message}`);
  process.exit(1);
});
