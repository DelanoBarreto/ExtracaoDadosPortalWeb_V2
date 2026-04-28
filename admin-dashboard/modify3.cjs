const fs = require('fs');
let code = fs.readFileSync('admin-dashboard/src/App.jsx', 'utf8');

const tHeadTarget = '<div className="data-header">';
const tHeadReplace = tHeadTarget + `
                  <div className="header-col col-check" style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
                    <input 
                      type="checkbox" 
                      onChange={e => {
                        // O react pode ter que lidar com isso
                        if (e.target.checked) setSelectedItems(displayData);
                        else setSelectedItems([]);
                      }}
                      checked={displayData.length > 0 && selectedItems.length === displayData.length}
                    />
                  </div>`;

code = code.replace(tHeadTarget, tHeadReplace);

const tRowTarget = /<div \s*key={item\.id} \s*className="data-row row-compact row-ultra-wide"[\s\S]*?onClick={\(\) => setSelectedItem\(item\)}[\s\S]*?>/;

code = code.replace(tRowTarget, match => {
  return match + `
                    <div className="row-col col-check" style={{ width: 40, display: 'flex', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedItems.some(i => i.id === item.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedItems([...selectedItems, item]);
                          else setSelectedItems(selectedItems.filter(i => i.id !== item.id));
                        }}
                      />
                    </div>`;
});

// Update the TBody content format for Secretarias: Secretária, responsável, endereço, tel, atendimento, email em 2 ou 3 linhas.
const tContentTarget = `                    <div className="row-content col-title flex-grow">
                      <h4 className="row-title">{item.titulo || item.nome_secretaria}</h4>
                      {activeModule === 'secretarias' && <p style={{fontSize: 12, color: 'var(--text-muted)'}}>{item.nome_responsavel} - {item.cargo_responsavel}</p>}
                    </div>`;

const tContentReplace = `                    {activeModule === 'secretarias' && (
                      <div className="row-thumb" style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, marginRight: 15, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                        {item.foto_url ? (
                          <img src={item.foto_url} alt="Gestor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <User size={20} color="var(--text-muted)" />
                        )}
                      </div>
                    )}
                    <div className="row-content col-title flex-grow">
                      <h4 className="row-title" style={{ marginBottom: 4 }}>{item.titulo || item.nome_secretaria}</h4>
                      {activeModule === 'secretarias' ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div><strong>Responsável:</strong> {item.nome_responsavel || 'Não informado'} {item.cargo_responsavel ? \`(\${item.cargo_responsavel})\` : ''} | <strong>Email:</strong> {item.email || '-'} | <strong>Tel:</strong> {item.telefone || '-'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}><strong>Endereço:</strong> {item.endereco || '-'} | <strong>Atendimento:</strong> {item.horario_atendimento || '-'}</div>
                        </div>
                      ) : (
                        null // Foricias and LRF, just the title
                      )}
                    </div>`;

code = code.replace(tContentTarget, tContentReplace);

// Also need to add photo in the modal for Secretarias
const modalContentTarget = `<div className="modal-meta">
                {activeModule === 'secretarias' ? (
                  <>
                    <div className="meta-block">`;

const modalContentReplace = `{activeModule === 'secretarias' && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                    <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedItem.foto_url ? (
                        <img src={selectedItem.foto_url} alt="Gestor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <User size={40} color="var(--text-muted)" />
                      )}
                    </div>
                  </div>
                )}
                <div className="modal-meta">
                {activeModule === 'secretarias' ? (
                  <>
                    <div className="meta-block">`;

code = code.replace(modalContentTarget, modalContentReplace);

fs.writeFileSync('admin-dashboard/src/App.jsx', code);
console.log('App.jsx table and modal adjusted.');
