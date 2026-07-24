const fs = require('fs');
const path = 'src/components/SiswaView.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('acc[idx] = Math.max(acc[idx] || 10, val.length);', 'acc[idx] = Math.max(acc[idx] || 0, val.length);');
fs.writeFileSync(path, content, 'utf8');
