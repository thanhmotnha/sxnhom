// Chụp bảng điều khiển trên trang giả lập: node tools/chup.js <thư mục ra>
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const ra = process.argv[2];
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 1400, height: 900 } });
  const loi = [];
  pg.on('pageerror', (e) => loi.push('PAGEERROR ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error') loi.push('CONSOLE ' + m.text()); });
  await pg.goto('file://' + path.resolve(__dirname, 'trang-gia-lap.html'));
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: path.join(ra, 'ui0.png') });
  await pg.locator('#mnwd-host').locator('button.mo').click();
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: path.join(ra, 'ui1.png') });
  const host = pg.locator('#mnwd-host');
  await host.locator('.the button[data-the="ds"]').click();
  await pg.waitForTimeout(150);
  await pg.screenshot({ path: path.join(ra, 'ui2.png') });
  await host.locator('.the button[data-the="cd"]').click();
  await pg.waitForTimeout(150);
  await pg.screenshot({ path: path.join(ra, 'ui3.png') });
  console.log(loi.length ? loi.join('\n') : 'không lỗi console');
  await br.close();
})();
