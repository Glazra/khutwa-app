const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 5050;

// أنواع الملفات المدعومة
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

// معرفة الآي بي المحلي للكمبيوتر على شبكة الواي فاي
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('الملف غير موجود 404');
      } else {
        res.writeHead(500);
        res.end('خطأ في الخادم: ' + err.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Service-Worker-Allowed': '/'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n======================================================');
  console.log(' ✨ تطبيق خُـطـوة (Khutwa) يعمل الآن محلياً بنجاح! ✨');
  console.log('======================================================\n');
  console.log(` 💻 للفتح على هذا الكمبيوتر:`);
  console.log(`    http://localhost:${PORT}\n`);
  console.log(` 📱 للفتح على الموبايل (نفس شبكة الواي فاي المنزلية):`);
  console.log(`    http://${localIP}:${PORT}\n`);
  console.log(' 💡 نصيحة للتثبيت على الموبايل:');
  console.log('    1. افتح الرابط في متصفح Chrome أو Safari على موبايلك.');
  console.log('    2. اضغط على خيارات المتصفح واختر "إضافة إلى الشاشة الرئيسية"');
  console.log('       (Add to Home Screen).');
  console.log('    3. سيعمل التطبيق بعدها بدون إنترنت للأبد!\n');
  console.log(' (اضغط Ctrl + C لإيقاف السيرفر في أي وقت)\n');
});
