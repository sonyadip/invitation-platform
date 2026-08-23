const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, 'src/templates');
const templateDirs = fs.readdirSync(templatesDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

let changed = 0;
for (const t of templateDirs) {
  const filePath = path.join(templatesDir, t, t.charAt(0).toUpperCase() + t.slice(1) + 'Template.astro');
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace Option
    content = content.replace(
      /<option value="attending">Hadir<\/option>/g,
      '<option value="attending">Hadir</option>\n                      <option value="tentative">Ragu</option>'
    );
    
    // Replace badge class
    content = content.replace(
      /wish-card__badge \$\{wish\.attendance_status === ['"]attending['"] \? ['"]wish-card__badge--attend['"] : ['"]wish-card__badge--absent['"]\}/g,
      'wish-card__badge '
    );
    
    // Replace text
    content = content.replace(
      /\{wish\.attendance_status === ['"]attending['"] \? ['"]Hadir['"] : ['"]Absen['"]\}/g,
      '{wish.attendance_status === "attending" ? "Hadir" : wish.attendance_status === "tentative" ? "Ragu" : "Absen"}'
    );
    
    fs.writeFileSync(filePath, content, 'utf-8');
    changed++;
    console.log('Updated ' + t);
  }
}
console.log('Updated ' + changed + ' templates.');

