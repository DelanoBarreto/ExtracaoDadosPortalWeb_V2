const fs = require('fs');
let code = fs.readFileSync('admin-dashboard/src/App.jsx', 'utf8');

// 1. Remove the tab-bar
code = code.replace(/<div className="tab-bar">[\s\S]*?<\/div>/, '');

// 2. Remove the empty spaces where viewMode was checked
// viewMode === 'cards' ? ( <div className="cards-grid"> ... </div> ) : ( <div className="data-list">
// I'll just use regex to replace `<div className="cards-grid">...</div> ) : (`
const cardsRegex = /viewMode === 'cards' \? \([\s\S]*?\) : \(/;
code = code.replace(cardsRegex, '');

// And remove the ending `) }`
code = code.replace(/}\s*\)\s*<\/div>/, '}\n              </div>');

code = code.replace(/const \[viewMode,\s*setViewMode\]\s*=\s*useState\('cards'\);/, '');

fs.writeFileSync('admin-dashboard/src/App.jsx', code);
console.log('Cards layout removed.');
