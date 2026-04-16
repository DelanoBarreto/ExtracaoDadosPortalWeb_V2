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

        // Título: H1 ou H2 que não seja de avaliação de satisfação
        let titulo = '';
        $('h1, h2').each((i, el) => {
            const text = $(el).text().trim();
            if (text && !text.toLowerCase().includes('satisfa')) {
                titulo = titulo || text;
            }
        });

        // Metadados via texto da página
        const bodyText = $('body').text();
        let dataOriginal = null;
        let competencia = null;

        // Extraindo metadados verificando blocos de texto
        $('div, p, span, li, strong').parent().each((i, el) => {
            const txt = $(el).text().replace(/\s+/g, ' ').trim();
            
            const dataMatch = txt.match(/Data:\s*([\d\/]+)/i);
            if (dataMatch && !dataOriginal) dataOriginal = dataMatch[1];

            const compMatch = txt.match(/(?:Compet[eê]ncia|Exerc[ií]cio|Refer[eê]ncia|Ano):\s*([0-9a-zA-ZáéíóúÁÉÍÓÚçÇ\/\s\-]+)/i);
            if (compMatch && !competencia) {
               const c = compMatch[1].trim();
               if (c && c.toLowerCase() !== 'aguardando') competencia = c;
            }
        });

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

        for (const cat of CATEGORIAS) {
            console.log(`\n📂 Categoria: ${cat.nome} (cat=${cat.id})`);
            const urlLista = `${BASE_URL}/lrf.php?cat=${cat.id}`;
            const { data: html } = await axios.get(urlLista, { timeout: 15000 });
            const $ = cheerio.load(html);

            // Coleta IDs únicos de documentos da lista
            const idsSet = new Set();
            $('a[href*="lrf.php?id="]').each((i, el) => {
                const href = $(el).attr('href');
                const id = href?.match(/id=(\d+)/)?.[1];
                if (id) idsSet.add(id);
            });

            // Aplica limite se definido, senão coleta todos
            const ids = limit > 0 ? Array.from(idsSet).slice(0, limit) : Array.from(idsSet);
            console.log(`   🔎 Encontrados ${idsSet.size} documentos. Processando os ${ids.length} primeiros${limit > 0 ? ` (limite de ${limit})` : ' (todos)'}.`);

            for (const id of ids) {
                const pageUrl = `${BASE_URL}/lrf.php?id=${id}`;

                const detalhes = await extrairDetalhesLRF(pageUrl);
                if (!detalhes) {
                    console.log(`   ⚠️ ID ${id}: sem PDFs detectados. Pulando.`);
                    continue;
                }

                const { pdfUrls, titulo, dataPublicacao, ano, competencia } = detalhes;
                const total = pdfUrls.length;

                if (total > 1) {
                    console.log(`   📑 ID ${id}: "${titulo}" → ${total} partes.`);
                } else {
                    console.log(`   📄 ID ${id}: "${titulo}"`);
                }

                for (let i = 0; i < pdfUrls.length; i++) {
                    const pdfUrl = pdfUrls[i];

                    // Deduplicação: verifica pelo URL físico do arquivo
                    const { data: existe } = await supabase
                        .from('tab_lrf')
                        .select('id')
                        .eq('url_original', pdfUrl)
                        .maybeSingle();

                    if (existe) {
                        console.log(`      ⏭️ Parte ${i + 1}/${total}: já no banco. Pulando.`);
                        continue;
                    }

                    const tituloDoc = total > 1 ? `${titulo} (Parte ${i + 1}/${total})` : titulo;
                    console.log(`   📥 ${tituloDoc}`);

                    // uploadPDF retorna array de { storageUrl, urlOriginal }
                    // Passamos a pasta dinâmica: Aracati/LRF
                    const folderPath = `${MUNICIP_NOME}/LRF`;
                    const partes = await scraperService.uploadPDF(pdfUrl, 'arquivos_municipais', folderPath);

                    if (partes.length === 0) {
                        console.log(`      ❌ Upload falhou completamente. Pulando.`);
                        continue;
                    }

                    for (let p = 0; p < partes.length; p++) {
                        const { storageUrl, urlOriginal: urlParteOriginal } = partes[p];
                        const uploadsTotal = partes.length;

                        // Título diferenciado quando o scraper dividiu por tamanho
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
                            tipo: cat.nome
                        });
                    }
                }
            }
        }

        console.log('\n🏁 Raspagem de LRF finalizada!');
    } catch (err) {
        console.error('❌ Erro fatal:', err.message);
        process.exit(1);
    }
}

iniciar();
