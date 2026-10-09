/* Máy chủ xưởng nhôm: nhận đơn, khoá, CORS, tải Excel/CSV, trang máy cắt */
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const tm = fs.mkdtempSync(path.join(os.tmpdir(), 'mnsx-'));
process.env.DU_LIEU = tm; process.env.KHOA = 'khoa-thu-123'; process.env.KHOA_XEM = 'xem-456';
const { may_chu } = require('../server/may-chu.js');
const M = require('../src/mnwd-sanxuat.js');
const { T, eq, ok, chay } = require('./khung-thu.js');
let goc = '';
const R = { order_bar: [{ code: 'XF55-01', name: 'Khung', color: 'Ghi', type: 'frame', length: 1200, count: 2, angle_one: '45', angle_two: '45', position: 'bk1:up' }, { code: 'XF55-01', name: 'Khung', color: 'Ghi', type: 'frame', length: 1500, count: 2, angle_one: '45', angle_two: '45' }], order_glass: [{ name: 'K', specs: '6.38', width: 1100, height: 1400, count: 1, type: 'fixedGlass' }], order_addon: [] };
const DON = { don: 'HĐ 282254', cong_trinh: 'Nhà anh Hùng', bo: [{ ky_hieu: 'D1', so_luong: 1, svg: '<svg onload="x()"></svg>', boc_tach: M.gonBocTach(R) }, { ky_hieu: 'S1', so_luong: 1, boc_tach: M.gonBocTach(R) }] };
const goi = (p, o) => fetch(goc + p, Object.assign({ redirect: 'manual' }, o || {}));

T('Khởi động', async () => { await new Promise((r) => may_chu.listen(0, '127.0.0.1', r)); goc = 'http://127.0.0.1:' + may_chu.address().port; eq((await (await goi('/suc-khoe')).json()).ok, true); });

let ma = '';
T('Gửi đơn: sai khoá bị chặn, đúng khoá lưu được; CORS chỉ cho WindoorCraft', async () => {
  let r = await goi('/api/don', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Khoa': 'sai' }, body: JSON.stringify(DON) });
  eq(r.status, 401);
  r = await goi('/api/don', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Khoa': 'xem-456' }, body: JSON.stringify(DON) });
  eq(r.status, 401, 'khoá chỉ xem không gửi được');
  r = await goi('/api/don', { method: 'OPTIONS', headers: { Origin: 'https://ln.windoorcraft.com', 'Access-Control-Request-Method': 'POST' } });
  eq([r.status, r.headers.get('access-control-allow-origin')], [204, 'https://ln.windoorcraft.com']);
  ok(/X-Khoa/.test(r.headers.get('access-control-allow-headers')));
  r = await goi('/api/don', { method: 'OPTIONS', headers: { Origin: 'https://la.com' } });
  eq(r.headers.get('access-control-allow-origin'), null, 'trang lạ không được');
  r = await goi('/api/don', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Khoa': 'khoa-thu-123', Origin: 'https://ln.windoorcraft.com' }, body: JSON.stringify(DON) });
  const j = await r.json();
  ok(j.ok && /^C\d{6}-001$/.test(j.ma), 'mã đơn', j); eq([j.so_dong, j.so_cay], [4, 2]);
  ma = j.ma;
  const d = JSON.parse(fs.readFileSync(path.join(tm, 'don', ma + '.json'), 'utf8'));
  eq(d.bo[0].svg, '', 'svg có script bị bỏ');
  r = await goi('/api/don', { method: 'POST', headers: { 'X-Khoa': 'khoa-thu-123', 'Content-Type': 'application/json' }, body: JSON.stringify({ bo: [{ ky_hieu: 'X', boc_tach: { nhom: [] } }] }) });
  eq(r.status, 400); ok(/chưa có số bóc tách/.test((await r.json()).loi));
  r = await goi('/api/don', { method: 'POST', headers: { 'X-Khoa': 'khoa-thu-123', 'Content-Type': 'application/json' }, body: '{hỏng' });
  eq(r.status, 400);
});

T('Máy cắt: danh sách đơn mới, tải Excel/CSV, đánh dấu đã lấy', async () => {
  let j = await (await goi('/api/don?moi=1', { headers: { 'X-Khoa': 'khoa-thu-123' } })).json();
  eq(j.don.map((d) => d.ma), [ma]); ok(/^C\d{6}-001-HD-282254$/.test(j.don[0].tep), j.don[0].tep);
  eq((await goi('/tai/' + ma + '.xlsx')).status, 401);
  const r = await goi('/tai/' + ma + '.xlsx?k=khoa-thu-123');
  eq(r.status, 200); ok(/attachment; filename=".*\.xlsx"/.test(r.headers.get('content-disposition')));
  const f = path.join(tm, 'a.xlsx'); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  eq(cp.execFileSync('python3', ['-c', "import openpyxl,sys;ws=openpyxl.load_workbook(sys.argv[1])['Cat nhom'];print(ws.max_row,ws['E2'].value)", f]).toString().trim(), '5 1500');
  const b = Buffer.from(await (await goi('/tai/' + ma + '.csv?k=xem-456')).arrayBuffer()); const csv = b.toString('utf8');
  ok(b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf && /STT;Mã thanh;/.test(csv) && csv.split('\r\n').length === 6, 'CSV có BOM, 4 dòng');
  j = await (await goi('/api/don?moi=1', { headers: { 'X-Khoa': 'khoa-thu-123' } })).json();
  eq(j.don.length, 0, 'tải rồi → không còn trong danh sách mới');
  const p = await (await goi('/api/don/' + ma + '/xong', { method: 'POST', headers: { 'X-Khoa': 'khoa-thu-123' } })).json();
  eq(p.trang_thai, 'xong');
});

T('Trang máy cắt + bản vẽ', async () => {
  ok(/Khoá xưởng/.test(await (await goi('/may')).text()));
  eq((await goi('/may?k=sai')).status, 401);
  const h = await (await goi('/may?k=xem-456&loc=het')).text();
  ok(h.includes(ma) && h.includes('HĐ 282254') && h.includes('Cắt xong'));
  ok(!(await (await goi('/may?k=xem-456')).text()).includes('<form'), 'khoá chỉ xem: không có nút Cắt xong');
  const bv = await goi('/ban-ve/' + ma + '?k=xem-456');
  ok(/BẢN VẼ SẢN XUẤT/.test(await bv.text()) && /default-src 'none'/.test(bv.headers.get('content-security-policy')));
  const r = await goi('/doi/' + ma + '/xong?k=khoa-thu-123', { method: 'POST' });
  eq(r.status, 303);
  eq((await goi('/../../etc/passwd')).status, 404);
  may_chu.close(); fs.rmSync(tm, { recursive: true, force: true });
});
chay('máy chủ xưởng');
