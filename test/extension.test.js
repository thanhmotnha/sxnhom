/* Thử chính gói tiện ích (dist/extension) trong Chromium thật: Chrome có nhận manifest không, mã có được nạp vào trang
 * ln.windoorcraft.com không (world MAIN), bảng có hiện và vẽ được không. Trang WindoorCraft được thay bằng trang giả lập. */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');
const { T, eq, ok, chay } = require('./khung-thu.js');

const GOI = path.resolve(__dirname, '../dist/extension');
const mock = fs.readFileSync(path.resolve(__dirname, 'mock-windoor.js'), 'utf8');
const trang = (ten_route) => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>WindoorCraft (giả lập)</title></head>
<body style="margin:0"><div id="app"><div style="height:42px">WINDOOR CRAFT</div><div id="webcc" style="position:fixed;left:0;top:42px;right:0;bottom:0"></div></div>
<script>${mock}</script>
<script>window.K = MNWD_MOCK.tao({ win: window, tre_luu: 60, tre_he_nhom: 80 }); K.draw.$route.name = ${JSON.stringify(ten_route)}; K.goc.$route = K.draw.$route;</script>
</body></html>`;

let cx;
let mang = null; // giả lập GitHub: null = mất mạng
const mo = async (duong, ten_route) => {
  const pg = await cx.newPage();
  pg.loi = [];
  pg.on('pageerror', (e) => pg.loi.push(e.message));
  await pg.route('https://ln.windoorcraft.com/**', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: trang(ten_route) }));
  await pg.route('https://raw.githubusercontent.com/**', (r) => (mang ? mang(r) : r.abort()));
  await pg.goto('https://ln.windoorcraft.com' + duong);
  await pg.waitForTimeout(2200); // tiện ích dò trang mỗi 1,5 giây
  return pg;
};

T('Chrome nhận gói tiện ích, nạp mã vào trang Thiết kế, vẽ được', async () => {
  const man = JSON.parse(fs.readFileSync(path.join(GOI, 'manifest.json'), 'utf8'));
  eq([man.manifest_version, man.content_scripts[0].world, man.content_scripts[0].matches], [3, 'MAIN', ['https://ln.windoorcraft.com/*']], 'manifest V3, chạy trong trang, chỉ ở ln.windoorcraft.com');
  ok(['icon16.png', 'icon48.png', 'icon128.png', 'goc.js', 'nap.js'].every((f) => fs.existsSync(path.join(GOI, f))), 'đủ file trong gói');
  eq(Object.keys(man).filter((k) => /permission/i.test(k)), [], 'không xin quyền gì thêm');
  const pg = await mo('/draw?drawType=2', 'draw');
  ok(await pg.evaluate(() => !!window.MNWD && !!window.MNWD.ui && !!document.querySelector('#mnwd-host')), 'mã của tiện ích chạy trong trang (thấy window.webcc của WindoorCraft)');
  eq(await pg.evaluate(() => window.MNWD.PHIEN_BAN), man.version, 'đúng phiên bản');
  const h = pg.locator('#mnwd-host');
  ok(await h.locator('button.mo').isVisible(), 'nút mở bảng hiện ở trang Thiết kế');
  await h.locator('button.mo').click();
  await h.getByRole('button', { name: 'Vẽ vào WindoorCraft', exact: true }).click();
  await pg.waitForTimeout(400);
  ok(/Đối chiếu với bản vẽ: khớp/.test(await h.locator('.cot-phai .tb.tot, .tb.tot').first().innerText()), 'vẽ được qua bảng');
  ok(await pg.evaluate(() => !window.webcc.shapeManager.isEmpty), 'bản vẽ có khung');
  eq(pg.loi, [], 'không lỗi script');
  await pg.close();
});

T('Trang In / trang đăng nhập: tiện ích im lặng', async () => {
  const pg = await mo('/printer?contract_id=1', 'printer');
  ok(!(await pg.locator('#mnwd-host button.mo').isVisible().catch(() => false)), 'trang In: không hiện nút, không che thanh công cụ in');
  await pg.close();
  const pg2 = await mo('/login', 'login');
  eq(await pg2.locator('#mnwd-host').count(), 0, 'trang đăng nhập: chưa gắn gì vào trang');
  eq(pg2.loi, [], 'không lỗi script');
  await pg2.close();
});

T('Tự cập nhật: chỉ chạy bản GitHub có chữ ký đúng; mất mạng dùng bản đã tải', async () => {
  const kp = process.env.MNWD_KHOA || '/home/claude/windoor-khoa/khoa-ky-phat-hanh.pem';
  if (!fs.existsSync(kp)) { ok(true, 'không có khoá ký trên máy này — bỏ qua'); return; }
  const crypto = require('crypto');
  const goc = fs.readFileSync(path.resolve(__dirname, '../dist/mn-windoor.js'), 'utf8');
  const ma = (v) => goc.replace(/M\.PHIEN_BAN = '[^']+'/, "M.PHIEN_BAN = '" + v + "'");
  const ky = (s, kh) => crypto.sign('sha256', Buffer.from(s), { key: kh || crypto.createPrivateKey(fs.readFileSync(kp)), dsaEncoding: 'ieee-p1363' }).toString('base64');
  const ghep = (v, chu_ky, noi) => async (r) => {
    const u = r.request().url();
    if (/phat-hanh\.json/.test(u)) return r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ban: v, tep: 'https://raw.githubusercontent.com/thanhmotnha/sxnhom/v' + v + '/dist/mn-windoor.js', chu_ky: chu_ky }) });
    return r.fulfill({ contentType: 'text/plain', headers: { 'Access-Control-Allow-Origin': '*' }, body: noi });
  };
  const xem = (pg) => pg.evaluate(() => [window.MNWD && window.MNWD.PHIEN_BAN, window.__mnwd_nguon && window.__mnwd_nguon.nguon, !!document.querySelector('#mnwd-host')]);
  const man = JSON.parse(fs.readFileSync(path.join(GOI, 'manifest.json'), 'utf8'));
  // 1. bản trên GitHub bị sửa (chữ ký của khoá khác) → không chạy, dùng bản gốc
  const la = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey;
  mang = ghep('9.9.8', ky(ma('9.9.8'), la), ma('9.9.8'));
  let pg = await mo('/draw?drawType=2', 'draw');
  eq(await xem(pg), [man.version, 'goc', true], 'sai chữ ký → bản gốc');
  await pg.close();
  // 2. chữ ký đúng nhưng nội dung bị đổi → không chạy
  mang = ghep('9.9.8', ky(ma('9.9.8')), ma('9.9.8') + '\nwindow.__la = 1;');
  pg = await mo('/draw?drawType=2', 'draw');
  eq((await xem(pg))[1], 'goc', 'nội dung bị chèn → bản gốc');
  eq(await pg.evaluate(() => window.__la), undefined, 'mã chèn không chạy');
  await pg.close();
  // 3. bản mới, chữ ký đúng → chạy bản mới
  mang = ghep('9.9.9', ky(ma('9.9.9')), ma('9.9.9'));
  pg = await mo('/draw?drawType=2', 'draw');
  eq(await xem(pg), ['9.9.9', 'github', true], 'chạy bản mới từ GitHub');
  await pg.close();
  // 4. mất mạng → bản đã tải lần trước
  mang = null;
  pg = await mo('/draw?drawType=2', 'draw');
  eq(await xem(pg), ['9.9.9', 'bo_nho', true], 'mất mạng: dùng bản đã tải');
  eq(pg.loi, [], 'không lỗi script');
  await pg.evaluate(() => localStorage.removeItem('mnwd.ban_tai'));
  await pg.close();
});

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mnwd-ext-'));
  cx = await chromium.launchPersistentContext(dir, { channel: 'chromium', headless: true, viewport: { width: 1700, height: 950 }, args: ['--disable-extensions-except=' + GOI, '--load-extension=' + GOI] });
  try { await chay('gói tiện ích'); } finally { await cx.close(); fs.rmSync(dir, { recursive: true, force: true }); }
})();
