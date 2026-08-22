const fs=require('fs');
const file='admin/index.html';
if(!fs.existsSync(file)){console.error(`Missing ${file}`);process.exit(1);}
let s=fs.readFileSync(file,'utf8');
if(!s.includes('href="/admin/activity-followup.css"'))s=s.replace('</head>','  <link rel="stylesheet" href="/admin/activity-followup.css">\n</head>');
if(!s.includes('src="/admin/activity-followup.js"'))s=s.replace('</body>','  <script src="/admin/activity-followup.js"></script>\n</body>');
fs.writeFileSync(file,s,'utf8');
console.log('Updated admin/index.html');
console.log('Imaginable OS 7.2-A installed: Activity + Needs Attention');
