// Dựng trang xem toàn bộ mẫu (dùng khi phát triển): node tools/xem-mau.js <file.html> <file.png>
const fs = require('fs');
const M = require('../src/mnwd-core.js');
require('../src/mnwd-preview.js');
const [, , html, png] = process.argv;
let b = '<meta charset="utf8"><body style="font:12px system-ui;margin:10px;background:#fff"><div style="display:flex;flex-wrap:wrap;gap:10px">';
for (const x of M.MAU) {
  const m = M.apMau({}, x);
  const k = M.tinh(m, { khung: 45, do: 38 }, { chia_deu: 'tim' });
  b += '<div style="border:1px solid #ccd;padding:6px;width:300px"><b>' + x.ma + '</b> ' + x.ten + '<br>' + M.veSvg(k, { rong: 290, cao_max: 230 }) + '<div>' + M.veSvg(k, { rong: 64, cao_max: 54, co_kt: false }) + '</div></div>';
}
b += '</div>';
fs.writeFileSync(html, b);
(async () => {
  const { chromium } = require('playwright');
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 1600, height: 900 } });
  await pg.goto('file://' + require('path').resolve(html));
  await pg.screenshot({ path: png, fullPage: true });
  await br.close();
})();
