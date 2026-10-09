/* Phần mềm web xưởng nhôm: đăng nhập, quyền theo vai trò, duyệt, tiến độ, phiên bản, máy cắt, kính, báo cáo — rồi bấm thử giao diện thật. */
const path = require('path'), fs = require('fs'), os = require('os');
const tm = fs.mkdtempSync(path.join(os.tmpdir(), 'mnweb-'));
process.env.DU_LIEU = tm; process.env.KHOA = 'khoa-thu-123'; process.env.KHOA_XEM = 'xem-456';
const { may_chu, xt } = require('../server/may-chu.js');
const M = require('../src/mnwd-sanxuat.js');
const { T, eq, ok, chay } = require('./khung-thu.js');
let goc = '';

const bar = (ma, dai, sl, kg) => ({ code: ma, name: 'Thanh ' + ma, color: 'Ghi', type: 'frame', length: dai, count: sl, angle_one: '45', angle_two: '45', position: 'bk1:up', meter_weight: kg || 1 });
const bo = (ky, rong, cao, gia) => ({ ky_hieu: ky, so_luong: 1, mo_ta: 'Cửa sổ 2 cánh', he_nhom: 'XINGFA 55', rong: rong, cao: cao, ma_don: '282254', svg: '<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="#cde"/></svg>',
  gia: gia, boc_tach: M.gonBocTach({ order_bar: [bar('XF-01', rong, 2), bar('XF-01', cao, 2)], order_glass: [{ name: 'Kính 6.38', specs: 'K638', width: rong - 90, height: cao - 90, count: 1, type: 'fixedGlass' }], order_addon: [{ code: 'GK', name: 'Gioăng', count: 4, length: '' }] }) });
const DON = (them) => Object.assign({ don: 'Nhà anh Hùng', cong_trinh: 'Tô Hiệu', bo: [bo('D1', 1200, 1500, { tong: 5000000, von: 3500000 }), bo('S1', 1000, 1200, { tong: 3000000, von: 2000000 })] }, them || {});

/** Người dùng giả: giữ cookie như trình duyệt */
function Ai() { this.ck = ''; }
Ai.prototype.goi = async function (p, than, tt) {
  const o = { headers: { cookie: this.ck } , redirect: 'manual' };
  if (than !== undefined) { o.method = 'POST'; o.headers['Content-Type'] = 'application/json'; o.headers['X-MN'] = tt && tt.khong_x ? '' : '1'; o.body = JSON.stringify(than); }
  const r = await fetch(goc + p, o);
  const sc = r.headers.get('set-cookie'); if (sc) this.ck = sc.split(';')[0];
  return { st: r.status, j: await r.json().catch(() => null), sc: sc };
};
const guiDon = async (than, khoa) => { const r = await fetch(goc + '/api/don', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Khoa': khoa || 'khoa-thu-123' }, body: JSON.stringify(than) }); return r.json(); };

const chu = new Ai(), cat = new Ai(), lap = new Ai(), kcs = new Ai(), kd = new Ai();
let ma = '';

T('Khởi động + tạo tài khoản Chủ đầu tiên bằng KHOA', async () => {
  await new Promise((r) => may_chu.listen(0, '127.0.0.1', r)); goc = 'http://127.0.0.1:' + may_chu.address().port;
  eq((await chu.goi('/api/trang-thai')).j.co_nguoi, false);
  ok(/6–8/.test((await chu.goi('/api/cai-dat-dau', { khoa: 'khoa-thu-123', ten: 'Jason', sdt: '0912345678', pin: '2468' })).j.loi), 'Chủ cần PIN 6 số');
  eq((await chu.goi('/api/cai-dat-dau', { khoa: 'sai', ten: 'Jason', sdt: '0912345678', pin: '246810' })).st, 401, 'sai KHOA');
  const r = await chu.goi('/api/cai-dat-dau', { khoa: 'khoa-thu-123', ten: 'Jason Nguyễn', sdt: '0912 345 678', pin: '246810' });
  ok(r.j.ok && /HttpOnly/.test(r.sc) && /SameSite=Lax/.test(r.sc), 'tạo + đăng nhập, cookie HttpOnly', r.j);
  eq((await new Ai().goi('/api/cai-dat-dau', { khoa: 'khoa-thu-123', ten: 'X', sdt: '0999999999', pin: '1111' })).st, 409, 'đã có người → không tạo được nữa');
  eq((await chu.goi('/api/w/toi')).j.nguoi.vai, ['chu']);
  const kh = fs.readFileSync(path.join(tm, 'nguoi-dung.json'), 'utf8');
  ok(!/246810/.test(kh), 'PIN không lưu dạng chữ');
});

T('Chủ thêm người, đăng nhập sai bị khoá tạm, ghi thiếu X-MN bị chặn', async () => {
  const them = async (ten, sdt, vai) => (await chu.goi('/api/w/nguoi', { ten: ten, sdt: sdt, vai: vai, pin: '1357' })).j;
  ok((await them('Tổ cắt', '0900000001', ['to_cat'])).ok);
  ok((await them('Tổ lắp', '0900000002', ['to_lap'])).ok);
  ok((await them('KCS', '0900000003', ['kcs'])).ok);
  ok((await them('Kinh doanh', '0900000004', ['kinh_doanh'])).ok);
  eq((await chu.goi('/api/w/nguoi', { ten: 'Trùng', sdt: '0900000001', vai: ['kho'], pin: '1111' })).j.loi, 'Số điện thoại này đã có người dùng.');
  eq((await cat.goi('/api/dang-nhap', { sdt: '0900000001', pin: '1357' })).st, 200);
  await lap.goi('/api/dang-nhap', { sdt: '0900000002', pin: '1357' });
  await kcs.goi('/api/dang-nhap', { sdt: '0900000003', pin: '1357' });
  await kd.goi('/api/dang-nhap', { sdt: '0900000004', pin: '1357' });
  eq((await cat.goi('/api/w/nguoi')).st, 403, 'tổ cắt không xem người dùng');
  const x = new Ai();
  for (let i = 0; i < 5; i++) await x.goi('/api/dang-nhap', { sdt: '0900000009', pin: '0000' });
  ok(/thử lại sau/.test((await x.goi('/api/dang-nhap', { sdt: '0900000009', pin: '0000' })).j.loi), 'sai 5 lần → khoá tạm');
  eq((await chu.goi('/api/w/cai-dat', { can_duyet: true }, { khong_x: true })).st, 403, 'thiếu tiêu đề X-MN → chặn (chống giả mạo)');
  eq((await new Ai().goi('/api/w/bang-viec')).st, 401, 'chưa đăng nhập');
});

T('Đơn cần duyệt: máy cắt chưa thấy; Chủ duyệt → máy thấy; nhân viên không thấy giá', async () => {
  await chu.goi('/api/w/cai-dat', { can_duyet: true });
  const g = await guiDon(DON());
  ok(g.ok && g.moi && g.trang_thai === 'cho_duyet', 'nhận đơn chờ duyệt', g);
  ma = g.ma;
  const may = async () => (await (await fetch(goc + '/api/don?moi=1', { headers: { 'X-Khoa': 'xem-456' } })).json()).don.map((d) => d.ma);
  eq(await may(), [], 'chờ duyệt → máy cắt chưa thấy');
  eq((await kd.goi('/api/w/don/' + ma + '/duyet', {})).st, 400, 'kinh doanh không duyệt được');
  const d = (await chu.goi('/api/w/don/' + ma + '/duyet', {})).j;
  eq(d.trang_thai, 'san_xuat');
  eq(await may(), [ma], 'duyệt → máy cắt thấy');
  eq([d.gia.tong, d.gia.von, d.gia.lai], [8000000, 5500000, 2500000], 'chủ thấy doanh thu, vốn, lãi');
  const x = (await kd.goi('/api/w/don/' + ma)).j;
  ok(x.gia === undefined && x.bo.every((b) => b.gia === undefined), 'kinh doanh không thấy giá');
  ok(!JSON.stringify((await cat.goi('/api/w/don?tt=')).j).includes('3500000'), 'danh sách của tổ không lộ giá vốn');
});

T('Tiến độ: mỗi tổ chỉ bấm được bước của mình; KCS không đạt phải có lý do', async () => {
  let v = (await cat.goi('/api/w/bang-viec')).j.viec;
  eq(v.map((x) => [x.ky_hieu, x.nut[0].ten]), [['D1', 'Cắt xong'], ['S1', 'Cắt xong']], 'việc tổ cắt');
  eq((await lap.goi('/api/w/bang-viec')).j.viec.length, 0, 'tổ lắp chưa có việc');
  const d = (await chu.goi('/api/w/don/' + ma)).j;
  const id = (k) => d.bo.filter((b) => b.ky_hieu === k)[0].id;
  eq((await lap.goi('/api/w/don/' + ma + '/bo', { ids: [id('D1')], toi: 'da_cat' })).st, 400, 'tổ lắp không bấm Cắt xong');
  ok((await cat.goi('/api/w/don/' + ma + '/bo', { ids: [id('D1')], toi: 'da_cat' })).j.ok);
  ok((await lap.goi('/api/w/don/' + ma + '/bo', { ids: [id('D1')], toi: 'lap_rap' })).j.ok);
  ok((await lap.goi('/api/w/don/' + ma + '/bo', { ids: [id('D1')], toi: 'cho_kcs' })).j.ok);
  eq((await kcs.goi('/api/w/don/' + ma + '/bo', { ids: [id('D1')], toi: 'lap_rap' })).j.loi, 'Ghi lý do KCS không đạt.');
  const r = (await kcs.goi('/api/w/don/' + ma + '/bo', { ids: [id('D1')], toi: 'lap_rap', ly_do: 'Hở góc trên trái' })).j;
  eq(r.bo.filter((b) => b.ky_hieu === 'D1')[0].loi_kcs, 'Hở góc trên trái');
  v = (await lap.goi('/api/w/bang-viec')).j.viec;
  eq([v[0].ky_hieu, v[0].loi_kcs, v[0].nut[0].ten], ['D1', 'Hở góc trên trái', 'Lắp ráp xong'], 'quay lại tổ lắp kèm lỗi');
  ok(r.nhat_ky.some((x) => x.ai === 'KCS' && /Hở góc/.test(x.viec)), 'nhật ký ghi ai làm gì');
});

T('Máy cắt: tải file → đã lấy; cắt xong → bộ chờ cắt sang đã cắt', async () => {
  const r = await fetch(goc + '/tai/' + ma + '.xlsx?k=khoa-thu-123');
  eq(r.status, 200);
  let d = (await chu.goi('/api/w/don/' + ma)).j;
  eq(d.cat.tt, 'da_lay');
  await fetch(goc + '/api/don/' + ma + '/xong', { method: 'POST', headers: { 'X-Khoa': 'khoa-thu-123' } });
  d = (await chu.goi('/api/w/don/' + ma)).j;
  eq([d.cat.tt, d.bo.filter((b) => b.ky_hieu === 'S1')[0].tt], ['xong', 'da_cat']);
  eq((await fetch(goc + '/tai/' + ma + '.xlsx')).status, 401, 'không khoá, không đăng nhập → không tải');
  const r2 = await fetch(goc + '/tai/' + ma + '-kinh.xlsx', { headers: { cookie: kd.ck } });
  eq(r2.status, 200, 'đăng nhập → tải phiếu kính');
});

T('Gửi lại cùng HĐ: phiên bản 2, bộ không đổi giữ tiến độ, bộ đổi về chờ cắt + cảnh báo', async () => {
  const moi = DON(); moi.bo[1] = bo('S1', 1050, 1200, { tong: 3100000, von: 2050000 }); moi.bo.push(bo('S2', 800, 800, null));
  const g = await guiDon(moi);
  ok(g.ok && !g.moi && g.ma === ma && g.phien_ban === 2, 'cùng đơn, bản 2', g);
  eq(g.canh_bao.length, 1); ok(/S1.*Đã cắt.*cắt lại/.test(g.canh_bao[0]));
  const d = (await chu.goi('/api/w/don/' + ma)).j;
  const tt = (k) => d.bo.filter((b) => b.ky_hieu === k)[0];
  eq([tt('D1').tt, tt('D1').doi, tt('S1').tt, tt('S1').doi, tt('S2').tt], ['lap_rap', false, 'cho_cat', true, 'cho_cat'], 'giữ / reset đúng');
  eq(d.cat.tt, 'cho', 'máy cắt nhận lại đơn');
  eq(d.gia.du, false, 'S2 chưa có giá → báo thiếu');
  ok(d.canh_bao_ds[0] && !d.canh_bao_ds[0].xong);
  eq((await lap.goi('/api/w/don/' + ma + '/canh-bao', { i: 0 })).st, 400, 'tổ lắp không xử lý cảnh báo');
  ok((await chu.goi('/api/w/don/' + ma + '/canh-bao', { i: 0 })).j.canh_bao === 0);
  const tep = (await (await fetch(goc + '/api/don?moi=1', { headers: { 'X-Khoa': 'xem-456' } })).json()).don[0].tep;
  ok(/-b2$/.test(tep), 'tên file máy cắt có số phiên bản', tep);
});

T('Kính, thông tin đơn, hoàn thành, báo cáo', async () => {
  let d = (await chu.goi('/api/w/don/' + ma)).j;
  eq((await cat.goi('/api/w/don/' + ma + '/kinh', { khoa: [d.kinh[0].khoa], tt: 'da_dat' })).st, 400, 'tổ cắt không đổi kính');
  d = (await chu.goi('/api/w/don/' + ma + '/kinh', { khoa: d.kinh.map((k) => k.khoa), tt: 'da_dat' })).j;
  ok(d.kinh.every((k) => k.tt === 'da_dat'));
  d = (await kd.goi('/api/w/don/' + ma + '/thong-tin', { ngay_hen: '2020-01-01', khach: 'Anh Hùng' })).j;
  eq([d.ngay_hen, d.khach, d.tre], ['2020-01-01', 'Anh Hùng', true], 'kinh doanh sửa hẹn → trễ');
  eq((await chu.goi('/api/w/bang-viec')).j.dem.tre, 1);
  d = (await chu.goi('/api/w/don/' + ma + '/bo', { ids: d.bo.map((b) => b.id), toi: 'da_lap' })).j;
  eq([d.trang_thai, d.tre], ['xong', false], 'mọi bộ đã lắp → hoàn thành');
  const thang = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 7);
  const bc = (await chu.goi('/api/w/bao-cao?thang=' + thang)).j;
  eq([bc.so_don, bc.so_bo, bc.doanh_thu, bc.thieu_gia], [1, 3, 8100000, 1]);
  ok(bc.kg_cay >= bc.kg_tp && bc.kg_tp > 0 && bc.hao_hut >= 0, 'kg cây ≥ kg thành phẩm', bc);
  eq((await cat.goi('/api/w/bao-cao?thang=' + thang)).st, 403, 'tổ cắt không xem báo cáo');
  eq((await chu.goi('/api/w/don/' + ma + '/huy', {})).j.loi, 'Ghi lý do huỷ.');
  eq((await chu.goi('/api/w/don/' + ma + '/huy', { ly_do: 'Khách đổi ý' })).j.trang_thai, 'huy');
  eq((await chu.goi('/api/w/don/' + ma + '/mo-lai', {})).j.trang_thai, 'xong');
});

T('Bảo mật: SVG lạ không chạy, khoá chỉ xem không đổi dữ liệu, chặn biểu mẫu giả mạo', async () => {
  const xau = DON({ don: 'Thử mã lạ', ma_hd: '777' });
  xau.bo[0].svg = '<svg><a><animate attributeName="href" values="javascript:alert(1)"/><rect width="5" height="5"/></a></svg><iframe srcdoc="x"></iframe>';
  const g = await guiDon(xau);
  const bv = await (await fetch(goc + '/ban-ve/' + g.ma + '?k=xem-456')).text();
  ok(!/<svg|<iframe|<animate/.test(bv) && /<img src="data:image\/svg\+xml/.test(bv), 'bản vẽ: SVG chỉ là ảnh');
  const r = await fetch(goc + '/ban-ve/' + g.ma + '?k=xem-456');
  ok(/script-src 'self'/.test(r.headers.get('content-security-policy')) && !/unsafe-inline'[^;]*script|script-src[^;]*unsafe-inline/.test(r.headers.get('content-security-policy')), 'không cho mã chèn trong trang');
  ok(/default-src 'none'/.test((await fetch(goc + '/khong-co')).headers.get('content-security-policy')), 'trang 404 cũng có CSP');
  eq((await fetch(goc + '/doi/' + g.ma + '/xong?k=xem-456', { method: 'POST', redirect: 'manual' })).status, 401, 'khoá chỉ xem không bấm Cắt xong');
  await fetch(goc + '/tai/' + g.ma + '.xlsx?k=xem-456');
  eq((await chu.goi('/api/w/don/' + g.ma)).j.cat.tt, 'cho', 'tải bằng khoá xem không đổi trạng thái');
  const gia = await fetch(goc + '/api/dang-nhap', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ sdt: '0912345678', pin: '246810' }) });
  eq(gia.status, 415, 'đăng nhập bằng biểu mẫu text/plain bị chặn');
  eq((await fetch(goc + '/api/dang-xuat', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: chu.ck }, body: '{}' })).status, 403, 'đăng xuất thiếu X-MN bị chặn');
  const x = new Ai();
  for (let i = 0; i < 20; i++) await x.goi('/api/dang-nhap', { sdt: '09000001' + String(i).padStart(2, '0'), pin: '0000' });
  ok(/thử lại sau/.test((await x.goi('/api/dang-nhap', { sdt: '0912345678', pin: '246810' })).j.loi), 'một máy sai 20 lần (nhiều SĐT) → khoá máy đó');
  await chu.goi('/api/w/don/' + g.ma + '/huy', { ly_do: 'thử' });
  xt.sai = {}; // mở khoá cho phần thử giao diện (cùng máy 127.0.0.1)
});

T('Khoá tài khoản → mất phiên ngay', async () => {
  const ds = (await chu.goi('/api/w/nguoi')).j.nguoi;
  const n = ds.filter((x) => x.sdt === '0900000001')[0];
  ok((await chu.goi('/api/w/nguoi', Object.assign({}, n, { khoa: true }))).j.ok);
  eq((await cat.goi('/api/w/bang-viec')).st, 401);
  const c = ds.filter((x) => x.vai.indexOf('chu') >= 0)[0];
  ok(/ít nhất một tài khoản Chủ/.test((await chu.goi('/api/w/nguoi', Object.assign({}, c, { vai: ['kho'] }))).j.loi), 'không tự bỏ hết quyền Chủ');
});

T('Giao diện: đăng nhập, bảng việc, chi tiết đơn, tổ bấm việc trên điện thoại', async () => {
  let pw; try { pw = require('playwright'); } catch (e) { ok(true, 'không có Playwright — bỏ qua'); return; }
  const br = await pw.chromium.launch();
  const S = path.resolve(__dirname, '..', '.chup'); fs.mkdirSync(S, { recursive: true });
  // đơn mới cho tổ cắt (mở lại tài khoản tổ cắt)
  const ds = (await chu.goi('/api/w/nguoi')).j.nguoi; const n = ds.filter((x) => x.sdt === '0900000001')[0];
  await chu.goi('/api/w/nguoi', Object.assign({}, n, { khoa: false }));
  await chu.goi('/api/w/cai-dat', { can_duyet: false });
  const g = await guiDon(DON({ don: 'Biệt thự chị Lan', ma_hd: '290001', bo: [bo('D1', 1600, 2700, { tong: 9900000, von: 7000000 }), bo('S1', 1400, 1200, { tong: 3200000, von: 2100000 }), bo('S2', 1400, 1200, { tong: 3200000, von: 2100000 })] }));
  ok(g.moi, 'HĐ khác → đơn mới');
  const loi = [];
  const pc = await br.newPage({ viewport: { width: 1360, height: 900 } });
  pc.on('pageerror', (e) => loi.push(e.message));
  await pc.goto(goc + '/');
  await pc.fill('input[type=tel]', '0912345678'); await pc.fill('input[type=password]', '246810');
  await pc.click('button[type=submit]');
  await pc.waitForSelector('text=Việc của tôi');
  ok(await pc.isVisible('nav >> text=Báo cáo'), 'chủ thấy menu Báo cáo');
  await pc.click('nav >> text=Đơn hàng');
  await pc.waitForSelector('text=Biệt thự chị Lan');
  ok(/16\.300\.000/.test(await pc.innerText('table')), 'chủ thấy doanh thu trong danh sách');
  await pc.screenshot({ path: path.join(S, 'don-hang.png') });
  await pc.click('text=Biệt thự chị Lan');
  await pc.waitForSelector('.ds-bo');
  eq(await pc.locator('.bo').count(), 3);
  await pc.screenshot({ path: path.join(S, 'chi-tiet.png'), fullPage: true });
  await pc.click('.the-tab >> text=Cắt nhôm'); await pc.waitForSelector('text=Tối ưu cây');
  await pc.click('.the-tab >> text=Kính'); await pc.waitForSelector('text=Phiếu đặt kính');
  await pc.goto(goc + '/bao-cao'); await pc.waitForSelector('text=hao hụt nhôm');
  await pc.screenshot({ path: path.join(S, 'bao-cao.png'), fullPage: true });
  // tổ cắt trên điện thoại
  const dt = await br.newPage({ viewport: { width: 390, height: 820 }, isMobile: true, hasTouch: true });
  dt.on('pageerror', (e) => loi.push(e.message));
  await dt.goto(goc + '/');
  await dt.fill('input[type=tel]', '0900000001'); await dt.fill('input[type=password]', '1357');
  await dt.click('button[type=submit]');
  await dt.waitForSelector('.viec');
  ok(!(await dt.isVisible('text=Báo cáo')), 'tổ cắt không thấy Báo cáo');
  const truoc = await dt.locator('.viec').count();
  await dt.screenshot({ path: path.join(S, 'to-cat-dien-thoai.png'), fullPage: true });
  await dt.locator('.viec >> text=Cắt xong').first().click();
  await dt.waitForTimeout(500);
  eq(await dt.locator('.viec').count(), truoc - 1, 'bấm Cắt xong → bộ rời danh sách việc');
  ok(!(await dt.content()).includes('7.000.000'), 'điện thoại tổ cắt không lộ giá vốn');
  eq(loi, [], 'không lỗi script');
  await br.close();
  ok(g.ok);
});

T('Dọn', async () => { may_chu.close(); fs.rmSync(tm, { recursive: true, force: true }); });
chay('phần mềm web xưởng');
