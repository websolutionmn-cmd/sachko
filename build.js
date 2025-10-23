
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

const srcDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist', 'public');
fs.rmSync(path.join(__dirname, 'dist'), { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

function hash(c){ return crypto.createHash('md5').update(c).digest('hex').slice(0,8); }

(async () => {
  const shopJs = fs.readFileSync(path.join(srcDir, 'shop.js'), 'utf-8');
  const min = await minify(shopJs);
  const jsHash = hash(min.code);
  const jsName = `shop.${jsHash}.min.js`;
  fs.writeFileSync(path.join(distDir, jsName), min.code);

  const css = fs.readFileSync(path.join(srcDir, 'styles.css'), 'utf-8');
  const minCss = new CleanCSS().minify(css).styles;
  const cssHash = hash(minCss);
  const cssName = `styles.${cssHash}.min.css`;
  fs.writeFileSync(path.join(distDir, cssName), minCss);

  function copyDir(from, to){
    if(!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
    for(const entry of fs.readdirSync(from)){
      const src = path.join(from, entry);
      const dest = path.join(to, entry);
      const st = fs.statSync(src);
      if(st.isDirectory()) copyDir(src, dest);
      else fs.copyFileSync(src, dest);
    }
  }
  copyDir(path.join(srcDir, 'img'), path.join(distDir, 'img'));
  try{ copyDir(path.join(srcDir, 'uploads'), path.join(distDir, 'uploads')); }catch(e){}
  try{ copyDir(path.join(srcDir, 'videos'), path.join(distDir, 'videos')); }catch(e){}

  let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf-8');
  html = html.replace('/styles.css', `/styles.${cssHash}.min.css`)
             .replace('/shop.js', `/shop.${jsHash}.min.js`);
  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf-8');

  let admin = fs.readFileSync(path.join(srcDir, 'admin.html'), 'utf-8');
  admin = admin.replace('/styles.css', `/styles.${cssHash}.min.css`);
  fs.writeFileSync(path.join(distDir, 'admin.html'), admin, 'utf-8');

  console.log('✅ Build ready in /dist/public');
})().catch(err => { console.error(err); process.exit(1); });
