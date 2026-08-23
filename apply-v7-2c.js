const fs=require('fs');
const file='admin/leads.html';
if(!fs.existsSync(file)){console.error('Missing '+file);process.exit(1);}
let s=fs.readFileSync(file,'utf8');
if(!s.includes('href="/admin/lead-editor.css"'))s=s.replace('</head>','  <link rel="stylesheet" href="/admin/lead-editor.css">\n</head>');
if(!s.includes('src="/admin/lead-editor.js"'))s=s.replace('</body>','  <script src="/admin/lead-editor.js"></script>\n</body>');
fs.writeFileSync(file,s,'utf8');
console.log('Updated admin/leads.html');
console.log('Imaginable OS 7.2-C installed: Lead Management');
