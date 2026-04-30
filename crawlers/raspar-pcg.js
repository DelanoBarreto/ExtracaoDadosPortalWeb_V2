const axios = require('axios');
const cheerio = require('cheerio');
const { supabase } = require('../src/lib/supabase-bot');
const scraperService = require('../src/services/scraper-service');

// Headers para simular navegador real e evitar bloqueio do Cloudflare
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
};

/**
 * Extrai metadados de um item da listagem (pcg.php).
 * Retorna: { titulo, competencia, dataPublicacao, detalheUrl }
 */
function extrairItemListagem($, el, urlBase) {
    const $a = $(el);
    const href = $a.attr('href') || '';

    // Garante URL absoluta para o link de detalhe
    const detalheUrl = href.startsWith('http')
        ? href
        : `${urlBase}/${href.replace(/^\//, '')}`;

    const textoCompleto = $a.text().trim();

    // Extrai data no formato DD/MM/YYYY
    const dataMatch = textoCompleto.match(/(\d{2}\/\d{2}\/\d{4})/);
    const dataPublicacao = dataMatch ? dataMatch[1] : null;

    // Extrai competência (ex: ANUAL/2025, 1º SEMESTRE/2024)
    const compMatch = textoCompleto.match(/((?:ANUAL|MENSAL|SEMESTRAL|BIMESTRAL|QUADRIMESTRAL|[\dº°]+[ºo°]?\s*(?:BIMESTRE|SEMESTRE|QUADRIMESTRE))[\s\/\-]\d{4})/i);
    const competencia = compMatch ? compMatch[1].trim() : null;

    // Extrai título (primeira linha antes de competência ou data)
    const linhas = textoCompleto.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const titulo = linhas[0] || 'PCG - PRESTAÇÃO DE CONTAS DE GOVERNO';

    // Extrai ano da competência ou da data
    let ano = null;
    const anoMatch = (competencia || dataPublicacao || textoCompleto).match(/\b(20\d{2})\b/);
    if (anoMatch) ano = parseInt(anoMatch[1]);

    function formatarData(dataPt) {
        if (!dataPt) return null;
        const partes = dataPt.trim().split('/');
        if (partes.length !== 3) return null;
        const [dia, mes, anoStr] = partes;
        return `${anoStr}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T12:00:00Z`;
    }

    return {
        titulo,
        competencia: competencia || `ANUAL/${ano || new Date().getFullYear()}`,
        dataPublicacao: formatarData(dataPublicacao),
        ano,
        detalheUrl
    };
}

/**
 * Acessa a página de detalhe (pcgs.php?id=XXX) e extrai todos os links PDF.
 */
async function extrairPDFsDaDetalhe(detalheUrl, urlBase) {
    try {
        const { data: html } = await axios.get(detalheUrl, { timeout: 15000, headers: BROWSER_HEADERS });
        const $ = cheerio.load(html);

        const pdfUrls = new Set();

        // Links diretos para PDF dentro do conteúdo da página
        $('a[href*=".pdf"], a[href*=".PDF"]').each((i, el) => {
            const href = $(el).attr('href') || '';
            if (!href || href.includes('javascript')) return;

            const fullUrl = href.startsWith('http')
                ? href
                : `${urlBase}/${href.replace(/^\//, '')}`;
            pdfUrls.add(fullUrl);
        });

        return Array.from(pdfUrls);
    } catch (err) {
        console.error(`   ⚠️ Erro ao acessar página de detalhe ${detalheUrl}:`, err.message);
        return [];
    }
}

async function rasparPCG() {
    const args = process.argv.slice(2);
    const limitArg = args.find(a => a.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 20;

    const idArg = args.find(a => a.startsWith('--municipio_id='));
    const urlArg = args.find(a => a.startsWith('--url_base='));
    const nomeArg = args.find(a => a.startsWith('--municipio_nome='));

    let municipioId = idArg ? idArg.split('=')[1] : null;
    let urlBase = urlArg ? urlArg.split('=')[1].replace(/"/g, '') : null;
    let municipioNome = nomeArg ? nomeArg.split('=')[1].replace(/"/g, '') : 'Desconhecido';

    if (!municipioId || !urlBase) {
        console.log('⚠️ Parâmetros de município não fornecidos. Buscando fallback: Pentecoste...');
        const { data: fallback } = await supabase
            .from('tab_municipios')
            .select('*')
            .ilike('nome', '%pentecoste%')
            .single();

        if (fallback) {
            municipioId = fallback.id;
            urlBase = fallback.url_base;
            municipioNome = fallback.nome;
        } else {
            console.error('❌ Falha crítica: Nenhum município identificado para raspagem.');
            return;
        }
    }

    // Normaliza urlBase (remove barra final)
    urlBase = urlBase.replace(/\/$/, '');

    console.log(`\n🚀 Iniciando PCG | Município: ${municipioNome} | Limite: ${limit === 0 ? 'ILIMITADO' : limit}...`);

    try {
        const idsProcessados = new Set();
        let itemsSaved = 0;
        const effectiveLimit = limit === 0 ? Infinity : limit;
        let currentPage = 0;  // 0 = sem parâmetro (igual ao LRF)
        let lastHtmlHash = '';
        let hasMorePages = true;

        while (itemsSaved < effectiveLimit && hasMorePages) {
            // Página 0 → pcg.php sem parâmetro | Páginas seguintes → pcg.php?pagina=N
            const urlComPagina = currentPage === 0
                ? `${urlBase}/pcg.php`
                : `${urlBase}/pcg.php?pagina=${currentPage}`;

            console.log(`\n📄 [PÁGINA ${currentPage}] Lendo: ${urlComPagina}`);

            const { data: pageHtml } = await axios.get(urlComPagina, { timeout: 15000, headers: BROWSER_HEADERS });

            // Detecta página repetida (sem mais conteúdo)
            const currentHash = pageHtml.substring(0, 800) + pageHtml.length;
            if (currentPage > 1 && currentHash === lastHtmlHash) {
                console.log('   🏁 Conteúdo repetido. Encerrando busca.');
                break;
            }
            lastHtmlHash = currentHash;

            const $page = cheerio.load(pageHtml);

            // Estratégia: captura links para pcgs.php?id=XXX
            const itensEncontrados = [];
            $page('a[href*="pcgs.php?id="]').each((i, el) => {
                const href = $page(el).attr('href') || '';
                // Evita duplicatas pelo ID
                const idMatch = href.match(/id=(\d+)/);
                if (!idMatch) return;
                const id = idMatch[1];
                if (idsProcessados.has(id)) return;
                idsProcessados.add(id);

                const item = extrairItemListagem($page, el, urlBase);
                if (item.detalheUrl) {
                    itensEncontrados.push({ id, ...item });
                }
            });

            if (itensEncontrados.length === 0) {
                console.log('   🏁 Nenhum documento novo encontrado nesta página.');
                break;
            }

            console.log(`   🔎 ${itensEncontrados.length} item(s) encontrado(s) na página.`);

            for (const item of itensEncontrados) {
                if (itemsSaved >= effectiveLimit) break;

                console.log(`\n⏳ [${itemsSaved + 1}/${effectiveLimit === Infinity ? '∞' : effectiveLimit}] "${item.titulo}" | ${item.competencia}`);
                console.log(`   🔗 Detalhe: ${item.detalheUrl}`);

                // Acessa a página de detalhe para pegar os PDFs
                const pdfUrls = await extrairPDFsDaDetalhe(item.detalheUrl, urlBase);

                if (pdfUrls.length === 0) {
                    console.log(`   ⚠️ Nenhum PDF encontrado na página de detalhe. Pulando.`);
                    continue;
                }

                console.log(`   📎 ${pdfUrls.length} PDF(s) encontrado(s).`);

                // Processa cada PDF e faz upload
                const anexosProcessados = [];

                for (let i = 0; i < pdfUrls.length; i++) {
                    const pdfUrl = pdfUrls[i];
                    console.log(`   ✨ Processando PDF ${i + 1}/${pdfUrls.length}: ${pdfUrl.split('/').pop()}`);

                    const folderPath = `${municipioNome}/PCG`;
                    const partes = await scraperService.uploadPDF(pdfUrl, 'arquivos_municipais', folderPath);

                    if (partes.length === 0) {
                        // Falha no upload: preserva o link original
                        const nomeOriginal = decodeURIComponent(pdfUrl.split('/').pop().split('?')[0]) || `Anexo_${i + 1}.pdf`;
                        anexosProcessados.push({ titulo: nomeOriginal, url: pdfUrl });
                        continue;
                    }

                    for (let p = 0; p < partes.length; p++) {
                        const nomeOriginal = decodeURIComponent(pdfUrl.split('/').pop().split('?')[0]) || `Anexo_${i + 1}.pdf`;
                        const tituloExibicao = partes.length > 1
                            ? `${nomeOriginal.replace(/\.pdf$/i, '')}_PARTE_${p + 1}.pdf`
                            : nomeOriginal;

                        anexosProcessados.push({
                            titulo: tituloExibicao,
                            url: partes[p].storageUrl
                        });
                    }
                }

                if (anexosProcessados.length === 0) continue;

                // Salva no banco (tab_lrf com tipo=PCG)
                const itemPCG = {
                    municipio_id: municipioId,
                    titulo: item.titulo,
                    ano: item.ano,
                    competencia: item.competencia,
                    data_publicacao: item.dataPublicacao,
                    arquivo_url: anexosProcessados[0].url,   // retrocompatibilidade
                    url_original: item.detalheUrl,           // chave de deduplicação
                    tipo: 'PCG',
                    status: 'rascunho',
                    anexos: anexosProcessados
                };

                const { error } = await supabase
                    .from('tab_lrf')
                    .upsert(itemPCG, { onConflict: 'url_original' });

                if (error) {
                    console.error(`   ❌ Erro ao salvar no banco:`, error.message);
                } else {
                    console.log(`   ✅ Salvo com ${anexosProcessados.length} anexo(s)!`);
                    itemsSaved++;
                }
            }

            currentPage++;

            // Proteção contra loop infinito
            if (currentPage > 50) {
                console.log('   ⚠️ Limite de 50 páginas atingido. Encerrando.');
                hasMorePages = false;
            }
        }

        console.log(`\n🏁 Raspagem de PCG concluída! Total de documentos processados: ${itemsSaved}`);
    } catch (err) {
        console.error('❌ Erro fatal:', err.message);
        process.exit(1);
    }
}

rasparPCG();
