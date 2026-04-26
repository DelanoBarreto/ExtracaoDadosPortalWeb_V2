const fs = require('fs');
let code = fs.readFileSync('admin-dashboard/src/App.jsx', 'utf8');

// 1. viewMode
code = code.replace(
  "const [viewMode,          setViewMode]          = useState('cards'); // 'cards' | 'table'",
  "const [selectedItems,     setSelectedItems]     = useState([]);\n  const [editItem, setEditItem] = useState(null);"
);

// 2. Fetch data
code = code.replace(
  "useEffect(() => { fetchData(); }, [activeModule]);",
  "useEffect(() => { fetchData(); setSelectedItems([]); }, [activeModule]);"
);

// 3. handleCancel and handleMultipleDelete
const cancelAndMultipleStr = `
  const handleCancelScrape = async () => {
    try {
      await axios.post(\`\${API_BASE}/scrape/cancel\`);
      appendLog('🛑 Cancelamento solicitado...');
      setIsScraping(false);
    } catch(e) { appendLog('❌ Erro cancelar: '+e.message); }
  };

  const handleDeleteMultiple = async () => {
    if(selectedItems.length === 0) return;
    if (!window.confirm(\`Deseja excluir \${selectedItems.length} itens selecionados?\`)) return;
    appendLog(\`🗑️ Excluindo \${selectedItems.length} itens...\`);
    for (const item of selectedItems) {
      try {
        let table = activeModule === 'noticias' ? 'tab_noticias' : activeModule === 'lrf' ? 'tab_lrf' : 'tab_secretarias';
        let fileUrl = activeModule === 'noticias' ? item.imagem_url : activeModule === 'lrf' ? item.arquivo_url : item.foto_url;
        await axios.delete(\`\${API_BASE}/items\`, { params: { id: item.id, table, bucket: 'arquivos_municipais', file_url: fileUrl } });
      } catch (e) { appendLog('❌ Erro 1 item: '+e.message); }
    }
    appendLog('✅ Selecionados removidos.');
    setSelectedItems([]); fetchStats(); fetchData();
  };
`;
code = code.replace(
  "const handleDeleteItem = async (item) => {",
  cancelAndMultipleStr + "\n  const handleDeleteItem = async (item) => {"
);

// 4. Action bar buttons
const btnPrimaryTarget = `<button className={\`btn-primary \${isScraping ? 'running' : ''}\`} onClick={handleScrape} disabled={!actionsEnabled}>
              <RefreshCcw size={15} style={isScraping ? { animation: 'spin 1s linear infinite' } : {}} />
              {isScraping ? 'Processando...' : \`Coletar \${currentMod.label}\`}
            </button>`;

const btnPrimaryReplace = `{isScraping ? (
              <button className="btn-danger running" onClick={handleCancelScrape}>
                 <X size={15} /> Parar Coleta
              </button>
            ) : (
              <button className="btn-primary" onClick={handleScrape} disabled={!actionsEnabled}>
                 <RefreshCcw size={15} /> Coletar {currentMod.label}
              </button>
            )}`;
code = code.replace(btnPrimaryTarget, btnPrimaryReplace);

const btnClearTarget = `<button className="btn-danger" onClick={handleClearData} disabled={!actionsEnabled}>
              <Trash2 size={15} /> Zerar Dados
            </button>`;
const btnClearReplace = `{selectedItems.length > 0 ? (
               <button className="btn-danger" onClick={handleDeleteMultiple}>
                 <Trash2 size={15} /> Excluir {selectedItems.length}
               </button>
            ) : (
               <button className="btn-danger" onClick={handleClearData} disabled={!actionsEnabled}>
                 <Trash2 size={15} /> Zerar Dados
               </button>
            )}`;
code = code.replace(btnClearTarget, btnClearReplace);

fs.writeFileSync('admin-dashboard/src/App.jsx', code);
console.log('App.jsx Actions and state updated.');
