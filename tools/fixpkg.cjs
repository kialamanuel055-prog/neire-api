const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const had = Object.prototype.hasOwnProperty.call(p, 'type');
if (had) delete p.type;
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
console.log(had ? 'removido "type": "module"' : 'package.json ja estava em CommonJS');
