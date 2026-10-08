const fs = require('fs');
const path = require('path');

let html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/styles.css', 'utf8');
const prayerJs = fs.readFileSync('js/prayer.js', 'utf8');
const athkarJs = fs.readFileSync('js/athkar.js', 'utf8');
const habitsJs = fs.readFileSync('js/habits.js', 'utf8');
const analyticsJs = fs.readFileSync('js/analytics.js', 'utf8');
const notifJs = fs.readFileSync('js/notifications.js', 'utf8');
const appJs = fs.readFileSync('js/app.js', 'utf8');
const iconSvg = fs.readFileSync('icons/icon.svg', 'utf8');
const iconBase64 = 'data:image/svg+xml;base64,' + Buffer.from(iconSvg).toString('base64');

// دمج ملف الـ CSS بالكامل
html = html.replace('<link rel="stylesheet" href="css/styles.css">', `<style>\n${css}\n</style>`);

// دمج الأيقونات كـ Data URI
html = html.split('icons/icon.svg').join(iconBase64);

// دمج كل أكواد الجافاسكريبت في وسم واحد متكامل
const allJs = [
  '// --- prayer.js ---\n' + prayerJs,
  '// --- athkar.js ---\n' + athkarJs,
  '// --- habits.js ---\n' + habitsJs,
  '// --- analytics.js ---\n' + analyticsJs,
  '// --- notifications.js ---\n' + notifJs,
  '// --- app.js ---\n' + appJs
].join('\n\n');

const scriptTagsRegex = /<script src="js\/prayer\.js"><\/script>[\s\S]*?<script src="js\/app\.js"><\/script>/;
html = html.replace(scriptTagsRegex, `<script>\n${allJs}\n</script>`);

fs.writeFileSync('khutwa_standalone.html', html, 'utf8');
console.log('Successfully generated khutwa_standalone.html! Size: ' + (html.length / 1024).toFixed(1) + ' KB');
