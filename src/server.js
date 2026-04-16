const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { supabase } = require('./lib/supabase-bot');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const logFile = path.join(__dirname, '../last-run.log');

// Limpa o arquivo de log no início
fs.writeFileSync(logFile, 'Iniciando servidor...\n');

/**
 * Endpoints de Gestão
 */

// Listar municípios
app.get('/api/municipios', async (req, res) => {
    const { data, error } = await supabase.from('tab_municipios').select('*');
    if (error) return res.status(500).json(error);
    res.json(data);
});

// Status do banco
app.get('/api/stats', async (req, res) => {
    const { count: noticias } = await supabase.from('tab_noticias').select('*', { count: 'exact', head: true });
    const { count: lrf } = await supabase.from('tab_lrf').select('*', { count: 'exact', head: true });
    res.json({ noticias: noticias || 0, lrf: lrf || 0 });
});

// Listar notícias do banco
app.get('/api/noticias', async (req, res) => {
    const { data, error } = await supabase.from('tab_noticias').select('*').order('data_publicacao', { ascending: false });
    if (error) return res.status(500).json(error);
    res.json(data || []);
});

// Listar arquivos LRF do banco
app.get('/api/lrf', async (req, res) => {
    console.log('🔍 Buscando Arquivos LRF no banco...');
    const { data, error } = await supabase
        .from('tab_lrf')
        .select('*')
        .order('data_publicacao', { ascending: false });
    
    if (error) {
        console.error('❌ Erro no Supabase:', error);
        return res.status(500).json(error);
    }
    res.json(data || []);
});

// Executar Scraper
app.post('/api/scrape', (req, res) => {
    const modulo = req.body.modulo || 'noticias';

    // Mapeia explicitamente o módulo para o script correto
    const SCRIPT_MAP = {
        'noticias': '../raspar-noticias-v2.js',
        'lrf':      '../raspar-lrf.js',
        'atos':     '../raspar-lrf.js',
    };
    const targetScript = SCRIPT_MAP[modulo] || '../raspar-noticias-v2.js';
    const scriptPath = path.join(__dirname, targetScript);

    const logMsg = `🚀 [${new Date().toLocaleTimeString()}] Módulo: [${modulo.toUpperCase()}] → Script: ${path.basename(scriptPath)}\n`;
    console.log(logMsg.trim());
    fs.writeFileSync(logFile, logMsg);

    // IMPORTANTE: renomeado para 'childProcess' para não sobrescrever o global process do Node.js
    const childProcess = exec(`node "${scriptPath}"`);
    childProcess.stdout.on('data', (data) => fs.appendFileSync(logFile, data));
    childProcess.stderr.on('data', (data) => fs.appendFileSync(logFile, `❌ ERRO: ${data}`));
    childProcess.on('close', (code) => fs.appendFileSync(logFile, `\n🏁 [${new Date().toLocaleTimeString()}] Processo finalizado com código ${code}\n`));

    res.json({ message: `Raspagem de ${modulo} iniciada`, script: path.basename(scriptPath) });
});

// Resetar TUDO
app.delete('/api/clear-data', async (req, res) => {
    try {
        await supabase.from('tab_noticias').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('tab_lrf').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        fs.writeFileSync(logFile, `🗑️ [${new Date().toLocaleTimeString()}] Banco completo zerado.\n`);
        res.json({ message: 'Banco completo zerado com sucesso' });
    } catch (err) {
        res.status(500).json(err);
    }
});

// Resetar SOMENTE tab_lrf
app.delete('/api/clear-lrf', async (req, res) => {
    try {
        const { error } = await supabase.from('tab_lrf').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        const { count } = await supabase.from('tab_lrf').select('*', { count: 'exact', head: true });
        console.log(`🗑️ tab_lrf zerada. Registros restantes: ${count}`);
        fs.writeFileSync(logFile, `🗑️ [${new Date().toLocaleTimeString()}] Tabela LRF zerada. Restam: ${count}\n`);
        res.json({ message: 'Tabela LRF zerada com sucesso', restantes: count });
    } catch (err) {
        console.error('Erro ao zerar LRF:', err);
        res.status(500).json({ error: err.message });
    }
});

// Ler Logs
app.get('/api/logs', (req, res) => {
    if (fs.existsSync(logFile)) {
        const logs = fs.readFileSync(logFile, 'utf8');
        res.json({ logs });
    } else {
        res.json({ logs: 'Aguardando início...' });
    }
});

app.listen(port, () => {
    console.log(`📡 Backend API rodando em http://localhost:${port}`);
});
