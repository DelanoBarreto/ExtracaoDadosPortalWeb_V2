const axios = require('axios');
const cheerio = require('cheerio');
const { supabase } = require('./src/lib/supabase-bot');
const scraperService = require('./src/services/scraper-service');

// Configurações
const MUNICIP_NOME = 'Aracati';
const BASE_URL = 'https://aracati.ce.gov.br';

const CATEGORIAS = [
    { id: 4,  nome: 'RGF'  },
    { id: 7,  nome: 'RREO' },
    { id: 8,  nome: 'LOA'  },
    { id: 9,  nome: 'LDO'  },
    { id: 26, nome: 'PPA'  },
    { id: 38, nome: 'PFA'  },
    { id: 39, nome: 'CMED' }
];

function formatarData(dataPt) {
    if (!dataPt) return null;
    const partes = dataPt.trim().split('/');
    if (partes.length !== 3) return null;
    const [dia, mes, ano] = partes;
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T12:00:00Z`;
}

/**
 * Extrai metadados e TODOS os PDFs de uma página de detalhe LRF.
 * Um documento pode ter múltiplos arquivos PDF (partes) quando muito grande.
 * Retorna null se a página não tiver PDF.
 */
async function extrairDetalhesLRF(pageUrl) {
    try {
        const { data: html } = await axios.get(pageUrl, { timeout: 15000 });
        const $ = cheerio.load(html);

        // Removendo scripts e estilos para não sujar a extração de texto
        $('script, style').remove();

        // Título: H1 ou H2 que não seja de avaliação de satisfação
        let titulo = '';
        $('h1, h2').each((i, el) => {
            const text = $(el).text().trim();
            if (text && !text.toLowerCase().includes('satisfa')) {
                titulo = titulo || text;
            }
        });

        // Metadados via texto da página (Aracati/Assesi Style)
        let dataOriginal = null;
        let competencia = null;

        // Estratégia 1: Buscar labels específicos e seus textos adjacentes
        $('div, p, span, strong, b').each((i, el) => {
            const $el = $(el);
            const txt = $el.text().trim();

            // DATA
            if (/^DATA:\s*$/i.test(txt) || /^DATA:$/i.test(txt)) {
                const val = $el.next().text().trim();
                if (val && !dataOriginal) dataOriginal = val;
            } else if (txt.match(/^DATA:\s*[\d\/]+/i)) {
                dataOriginal = dataOriginal || txt.split(/DATA:\s*/i)[1].split(/\s/)[0].trim();
            }

            // COMPETÊNCIA
            if (/^COMPET[EÊ]NCIA:\s*$/i.test(txt) || /^COMPET[EÊ]NCIA:$/i.test(txt)) {
                let val = $el.next().text().trim();
                if (val && !competencia) competencia = val.split(/Detalhes|Relat[oó]rio/i)[0].trim();
            } else if (txt.match(/^COMPET[EÊ]NCIA:\s*/i)) {
                let val = txt.split(/COMPET[EÊ]NCIA:\s*/i)[1].trim();
                competencia = competencia || val.split(/Detalhes|Relat[oó]rio/i)[0].split('.')[0].trim();
            }
        });

        // Estratégia 2: Fallback via busca em blocos (caso a Estratégia 1 falhe)
        if (!competencia || !dataOriginal) {
            $('div, p, span, li, strong').each((i, el) => {
                const txt = $(el).text().replace(/\s+/g, ' ').trim();
                
                if (!dataOriginal) {
                    const dataMatch = txt.match(/Data:\s*([\d\/]+)/i);
                    if (dataMatch) dataOriginal = dataMatch[1];
                }

                if (!competencia) {
                    const compMatch = txt.match(/(?:Compet[eê]ncia|Exerc[ií]cio|Refer[eê]ncia|Ano):\s*([^\n\r\t]{3,60})/i);
                    if (compMatch) {
                        competencia = compMatch[1].split(/Detalhes|Relat[oó]rio|Clique/i)[0].split('.')[0].trim();
                    }
                }
            });
        }

        // Ano extraído da competência ou data
        let ano = null;
        const anoMatch = (competencia || dataOriginal || '').match(/\b(20\d{2})\b/);
        if (anoMatch) ano = parseInt(anoMatch[1]);

        // Coleta TODOS os links de PDF únicos da página
        const pdfUrlsSet = new Set();
        $('a[href*=".pdf"], a[href*="/arquivos/"]').each((i, el) => {
            const href = $(el).attr('href');
            if (!href) return;
            const fullUrl = href.startsWith('http')
                ? href
                : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
            if (fullUrl.toLowerCase().includes('.pdf')) {
                pdfUrlsSet.add(fullUrl);
            }
        });

        const pdfUrls = Array.from(pdfUrlsSet);
        if (pdfUrls.length === 0) return null;

        return {
            titulo: titulo || 'Sem título',
            dataPublicacao: formatarData(dataOriginal),
            ano,
            competencia,
            pdfUrls  // Array: 1 item (normal) ou N itens (documento dividido em partes)
        };
    } catch (err) {
        console.error(`⚠️ Erro ao detalhar ${pageUrl}:`, err.message);
        return null;
    }
}

async function rasparLRF() {
    const args = process.argv.slice(2);
    const limitArg = args.find(a => a.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 20;

    console.log(`\n🚀 Iniciando raspagem de LRF | Limite: ${limit === 0 ? 'ILIMITADO' : limit} | Município: ${MUNICIP_NOME}...`);

    try {
        // Pega o ID do município
        const { data: municipio } = await supabase
            .from('tab_municipios')
            .select('id')
            .eq('nome', MUNICIP_NOME)
            .single();

        if (!municipio) throw new Error('Município não encontrado no banco.');

        const linksProcessados = new Set();
        let itemsSaved = 0;
        const effectiveLimit = limit === 0 ? Infinity : limit;
        let currentPage = 0;
        let lastHtmlHash = '';

        while (itemsSaved < effectiveLimit) {
            const urlComPagina = currentPage === 0 
                ? `${BASE_URL}/lrf.php`
                : `${BASE_URL}/lrf.php?pagina=${currentPage}`;
            
            console.log(`\n📄 [PÁGINA ${currentPage + 1}] Lendo: ${urlComPagina}`);
            
            const { data: pageHtml } = await axios.get(urlComPagina, { timeout: 15000 });
            
            // Verifica se a página é a mesma da anterior (evita loop em sites sem paginação real)
            const currentHash = pageHtml.substring(0, 500) + pageHtml.length;
            if (currentPage > 0 && currentHash === lastHtmlHash) {
                console.log('   🏁 O portal retornou o mesmo conteúdo da página anterior. Encerrando busca.');
                break;
            }
            lastHtmlHash = currentHash;

            const $page = cheerio.load(pageHtml);

            // Coleta IDs de TODA a página (incluindo abas de anos escondidas)
            const pageIds = [];
            $page('a[href*="lrf.php?id="]').each((i, el) => {
                const href = $page(el).attr('href');
                const id = href?.match(/id=(\d+)/)?.[1];
                if (id && !linksProcessados.has(id)) {
                    linksProcessados.add(id);
                    pageIds.push(id);
                }
            });

            if (pageIds.length === 0) {
                console.log('   🏁 Nenhum documento novo encontrado nesta página.');
                break;
            }

            console.log(`   🔎 Encontrados ${pageIds.length} documentos únicos na página.`);

            for (const id of pageIds) {
                if (itemsSaved >= effectiveLimit) break;
                
                const pageUrl = `${BASE_URL}/lrf.php?id=${id}`;
                console.log(`\n⏳ [${pageIds.indexOf(id) + 1}/${pageIds.length}] Analisando documentação: ${pageUrl}`);
                
                const detalhes = await extrairDetalhesLRF(pageUrl);
                if (!detalhes) {
                    console.log(`   ⚠️ Sem detalhes ou PDFs. Pulando.`);
                    continue;
                }

                const { titulo, dataPublicacao, ano, competencia, pdfUrls } = detalhes;

                // Tenta extrair o tipo (categoria) do título
                let tipoDetetado = 'LRF';
                if (titulo.includes(' - ')) {
                    tipoDetetado = titulo.split(' - ')[0].trim();
                } else if (titulo.includes('RREO')) tipoDetetado = 'RREO';
                else if (titulo.includes('RGF')) tipoDetetado = 'RGF';
                else if (titulo.includes('LOA')) tipoDetetado = 'LOA';
                else if (titulo.includes('LDO')) tipoDetetado = 'LDO';
                else if (titulo.includes('PPA')) tipoDetetado = 'PPA';

                let algumNovoSalvo = false;
                for (let i = 0; i < pdfUrls.length; i++) {
                    const pdfUrl = pdfUrls[i];
                    
                    // Deduplicação robusta: Verifica se este PDF já foi processado
                    const { data: existe } = await supabase
                        .from('tab_lrf')
                        .select('id')
                        .ilike('url_original', `${pdfUrl}%`)
                        .maybeSingle();

                    if (existe) {
                        console.log(`   ⏭️ Arquivo ${i+1}/${pdfUrls.length} já cadastrado. Pulando.`);
                        continue;
                    }

                    console.log(`   ✨ NOVO PDF detectado. Iniciando processamento...`);
                    const totalPartes = pdfUrls.length;
                    const tituloDoc = totalPartes > 1 ? `${titulo} (Parte ${i + 1}/${totalPartes})` : titulo;

                    // Upload via scraper-service
                    const folderPath = `${MUNICIP_NOME}/LRF`;
                    const partes = await scraperService.uploadPDF(pdfUrl, 'arquivos_municipais', folderPath);

                    if (partes.length === 0) continue;

                    for (let p = 0; p < partes.length; p++) {
                        const { storageUrl, urlOriginal: urlParteOriginal } = partes[p];
                        const uploadsTotal = partes.length;

                        const tituloFinal = uploadsTotal > 1
                            ? `${tituloDoc} [Upload ${p + 1}/${uploadsTotal}]`
                            : tituloDoc;

                        await scraperService.salvarLRF({
                            municipio_id: municipio.id,
                            titulo: tituloFinal,
                            ano,
                            competencia,
                            data_publicacao: dataPublicacao,
                            arquivo_url: storageUrl,
                            url_original: urlParteOriginal,
                            tipo: tipoDetetado
                        });
                        algumNovoSalvo = true;
                    }
                }

                if (algumNovoSalvo) {
                    console.log('   ✅ Novas partes salvas no Supabase!');
                    itemsSaved++;
                }
            }

            currentPage++;
            // Segurança: evitar loops infinitos (máximo 50 páginas)
            if (currentPage >= 50 && effectiveLimit !== Infinity) {
                console.log('   ⚠️ Teto de 50 páginas atingido. Encerrando por segurança.');
                hasMorePages = false;
            }
        }

        console.log(`\n🏁 Raspagem de LRF concluída! Total de novos documentos: ${itemsSaved}`);
    } catch (err) {
        console.error('❌ Erro fatal:', err.message);
        process.exit(1);
    }
}

rasparLRF();
