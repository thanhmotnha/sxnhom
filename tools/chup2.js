// Chụp bảng ở hai cỡ màn hình: node tools/chup2.js <thư mục ra>
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const ra = process.argv[2];
  const br = await chromium.launch();
  for (const [ten, w, hh] of [['rong', 1900, 1000], ['hep', 1366, 768]]) {
    const pg = await br.newPage({ viewport: { width: w, height: hh } });
    const loi = [];
    pg.on('pageerror', (e) => loi.push('PAGEERROR ' + e.message));
    await pg.goto('file://' + path.resolve(__dirname, 'trang-gia-lap.html'));
    await pg.waitForTimeout(300);
    const host = pg.locator('#mnwd-host');
    await host.locator('button.mo').click();
    await pg.waitForTimeout(250);
    await pg.screenshot({ path: path.join(ra, 'ui-' + ten + '.png') });
    console.log(ten, loi.length ? loi.join('\n') : 'không lỗi');
    await pg.close();
  }
  await br.close();
})();
