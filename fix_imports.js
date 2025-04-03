const fs = require('fs');
const path = require('path');

// Directory da scansionare
const baseDir = path.join(__dirname, 'src/components/modules/POSDashboard');

// Funzione per trovare tutti i file .jsx, .tsx, .js, .ts in una directory e subdirectory
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, fileList);
    } else if (/\.(jsx|tsx|js|ts)$/.test(file)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Funzione per aggiustare i percorsi di importazione
function fixImports(filePath) {
  console.log(`Elaborazione di ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Aggiusta i percorsi di importazione
  content = content.replace(/from ['"]\.\.\/types\/dashboard['"]/, 'from \'../types/dashboard\'');
  content = content.replace(/from ['"]\.\.\/components\/common\/([^'"]*)['"]/, 'from \'../components/common/$1\'');
  content = content.replace(/from ['"]\.\.\/components\/tree\/([^'"]*)['"]/, 'from \'../components/tree/$1\'');
  content = content.replace(/from ['"]\.\.\/components\/orders\/([^'"]*)['"]/, 'from \'../components/orders/$1\'');
  content = content.replace(/from ['"]\.\.\/components\/stats\/([^'"]*)['"]/, 'from \'../components/stats/$1\'');
  content = content.replace(/from ['"]\.\.\/components\/form\/([^'"]*)['"]/, 'from \'../components/form/$1\'');
  
  // Salva il file aggiornato
  fs.writeFileSync(filePath, content, 'utf8');
}

// Trova tutti i file e aggiusta i percorsi di importazione
const files = findFiles(baseDir);
files.forEach(fixImports);

console.log(`Aggiornati ${files.length} file.`);
