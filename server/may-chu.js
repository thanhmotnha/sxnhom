/* Một Nhà · Phần mềm xưởng nhôm (sxnhom.motnha.vn)
 * - Nhận đơn từ tiện ích "Một Nhà · Vẽ cửa" (WindoorCraft), có phiên bản khi gửi lại.
 * - Phần mềm web cho xưởng: đăng nhập SĐT + PIN theo vai trò, duyệt đơn, tiến độ từng bộ, cắt, kính, KCS, lắp đặt, báo cáo.
 * - Trang /may + chương trình tự lấy file cho máy cắt Haffner (Windows 7).
 * Chỉ dùng Node.js ≥ 18, không cần cài thư viện, dữ liệu là file JSON trong thư mục DU_LIEU.
 *
 * Biến môi trường:
 *   CONG=8080                  cổng
 *   DU_LIEU=./du-lieu          thư mục dữ liệu
 *   KHOA=…                     khoá cho tiện ích gửi đơn + chương trình lấy file máy cắt (bắt buộc; dùng cả để tạo tài khoản Chủ đầu tiên)
 *   KHOA_XEM=…                 (tuỳ chọn) khoá chỉ xem / tải cho trang /may
 *   NGUON=https://ln.windoorcraft.com   trang được gọi API từ trình duyệt
 *   BAO_MAT=1                  cookie chỉ gửi qua HTTPS (bật khi đã có HTTPS)
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const M = require('./lib/mnwd-sanxuat.js');
const Kho = require('./lib/kho.js');
const XacThuc = require('./lib/xac-thuc.js');
const D = require('./lib/don.js');

const PHIEN_BAN = '0.4.0';
const CONG = Number(process.env.CONG || 8080);
const KHOA = String(process.env.KHOA || '').split(',').map((x) => x.trim()).filter(Boolean);
const KHOA_XEM = String(process.env.KHOA_XEM || '').split(',').map((x) => x.trim()).filter(Boolean);
const NGUON = String(process.env.NGUON || 'https://ln.windoorcraft.com').split(',').map((x) => x.trim());
const TOI_DA = 8 * 1024 * 1024;
const WEB = path.join(__dirname, 'web');
const kho = new Kho(process.env.DU_LIEU || path.join(__dirname, 'du-lieu'));
const xt = new XacThuc(kho);

const bang = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const dungKhoa = (k, ca_xem) => !!k && (KHOA.some((x) => bang(x, k)) || (!!ca_xem && KHOA_XEM.some((x) => bang(x, k))));
const e = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const gioVN = (iso) => new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
const tenTep = (d) => (d.ma + '-' + String(d.ten || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')).slice(0, 60);
const caiDat = () => Object.assign({ can_duyet: false, cong_ty: 'MỘT NHÀ DESIGN & BUILD' }, kho.doc('cai-dat.json', {}));
const docDon = (ma) => D.chuanDon(kho.docDon(ma));
const dsDon = () => kho.dsDon().map(D.chuanDon);
const ttCat = (d) => ({ don: d.ten + ' · ' + d.ma, cong_trinh: d.cong_trinh, cay: d.may.cay, hao_dau: d.may.hao_dau, mach: d.may.mach, cong_ty: caiDat().cong_ty });
/** CSV danh sách cắt (dấu ; , UTF-8 có BOM) — cho phần mềm máy cắt không đọc .xlsx */
function csvCat(d) {
  const t = M.trangCat(d.bo, ttCat(d))[0].dong;
  const q = (v) => { const s = String(v === undefined || v === null ? '' : v); return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return '﻿' + t.map((r) => r.map(q).join(';')).join('\r\n') + '\r\n';
}
/** Phiếu đặt kính (.xlsx) gom theo loại kính */
function xlsxKinh(d) {
  const dong = [['Loại kính', 'Tên', 'Rộng (mm)', 'Cao (mm)', 'Số tấm', 'm²', 'Ký hiệu cửa', 'Vị trí', 'Trạng thái']];
  const ds = [];
  d.bo.forEach((b) => b.boc_tach.kinh.forEach((k, i) => ds.push([k.loai, k.ten, k.rong, k.cao, k.sl, Math.round((k.rong * k.cao * k.sl) / 1e4) / 100, b.ky_hieu, M.TEN_KINH[k.kieu] || k.kieu, D.TT_KINH[d.kinh_tt[b.id + ':' + i] || 'chua_dat']])));
  ds.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || b[2] - a[2]);
  return M.xlsx([{ ten: 'Dat kinh', dong: dong.concat(ds), rong: [18, 24, 11, 11, 8, 8, 12, 14, 12] }]);
}

// ------------------------------------------------------------------ trang máy cắt (không cần JavaScript, chạy trên trình duyệt cũ)
const KHUNG = (tieu_de, than, lam_moi) => '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge">' + (lam_moi ? '<meta http-equiv="refresh" content="60">' : '') + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + e(tieu_de) + '</title><style>' +
  'body{font-family:"Segoe UI",Arial,sans-serif;margin:0;background:#f2f5f9;color:#1c2733;font-size:16px}.dau{background:#17365d;color:#fff;padding:12px 18px;font-size:20px}.dau small{opacity:.75;font-size:14px;margin-left:10px}.than{padding:14px 18px}' +
  'table{border-collapse:collapse;width:100%;background:#fff}th,td{padding:10px 8px;border-bottom:1px solid #dde3ec;text-align:left;vertical-align:middle}th{background:#dce6f1;font-size:14px}' +
  'a.nut,button.nut{display:inline-block;padding:12px 18px;margin:2px;border-radius:6px;background:#17365d;color:#fff;text-decoration:none;font-size:17px;border:0;cursor:pointer}a.nut.phu,button.nut.phu{background:#6b7c93}a.nut.xanh,button.nut.xanh{background:#1d6b3a}' +
  '.tt{padding:3px 8px;border-radius:10px;font-size:13px;background:#e3e8ef}.tt.cho{background:#fde9b7}.tt.da_lay{background:#d6e6fb}.tt.xong{background:#cfead8}form{display:inline}.nho{color:#5b6b80;font-size:13px}' +
  '</style></head><body><div class="dau">MỘT NHÀ · XƯỞNG NHÔM<small>' + e(tieu_de) + '</small></div><div class="than">' + than + '</div></body></html>';
function trangMay(k, loc) {
  const ds = dsDon().filter((d) => d.trang_thai === 'san_xuat' || (loc === 'het' && d.trang_thai === 'xong')).filter((d) => loc === 'het' || d.cat.tt !== 'xong');
  const kq = encodeURIComponent(k), sua = dungKhoa(k);
  const hang = ds.map((d) => '<tr><td><b>' + e(d.ma) + '</b><br><span class="nho">' + e(gioVN(d.luc)) + (d.phien_ban > 1 ? ' · bản ' + d.phien_ban : '') + '</span></td><td><b>' + e(d.ten) + '</b>' + (d.cong_trinh ? '<br><span class="nho">' + e(d.cong_trinh) + '</span>' : '') + '</td><td>' + d.bo.length + ' bộ · ' + d.so_dong + ' dòng cắt · ' + d.so_cay + ' cây</td><td><span class="tt ' + e(d.cat.tt) + '">' + e(D.TT_CAT[d.cat.tt]) + '</span></td><td>' +
    '<a class="nut" href="/tai/' + e(d.ma) + '.xlsx?k=' + kq + '">Excel</a><a class="nut phu" href="/tai/' + e(d.ma) + '.csv?k=' + kq + '">CSV</a><a class="nut phu" href="/ban-ve/' + e(d.ma) + '?k=' + kq + '" target="_blank">Bản vẽ</a>' +
    (sua && d.cat.tt !== 'xong' ? '<form method="post" action="/doi/' + e(d.ma) + '/xong?k=' + kq + '"><button class="nut xanh">Cắt xong</button></form>' : '') + '</td></tr>').join('');
  return KHUNG('Máy cắt — đơn chờ cắt', '<p><a class="nut phu" href="/may?k=' + kq + '">Làm mới</a> <a class="nut phu" href="/may?k=' + kq + (loc === 'het' ? '' : '&loc=het') + '">' + (loc === 'het' ? 'Chỉ đơn chưa cắt xong' : 'Xem cả đơn đã cắt') + '</a></p>' +
    (ds.length ? '<table><tr><th>Mã</th><th>Đơn</th><th>Khối lượng</th><th>Máy cắt</th><th></th></tr>' + hang + '</table>' : '<p>Chưa có đơn nào chờ cắt.</p>') +
    '<p class="nho">Bấm Excel/CSV để tải file rồi nhập vào phần mềm máy cắt (chế độ nhập dữ liệu). Trang tự làm mới mỗi 60 giây.' + (sua ? '' : ' Khoá chỉ xem: không bấm Cắt xong được.') + '</p>', true);
}
const trangVao = (sai) => KHUNG('Máy cắt', (sai ? '<p style="color:#b03a2e">Sai khoá.</p>' : '') + '<form method="get" action="/may"><p>Khoá xưởng:</p><input name="k" type="password" style="font-size:20px;padding:8px;width:260px"> <button class="nut">Vào</button></form>');

// ------------------------------------------------------------------ tiện ích HTTP
const BAO_MAT_WEB = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' };
function guiJson(res, ma, o, them) { res.writeHead(ma, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, BAO_MAT_WEB, them || {})); res.end(JSON.stringify(o)); }
const CSP_TRANG = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
function guiHtml(res, ma, html, them) { res.writeHead(ma, Object.assign({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': CSP_TRANG }, BAO_MAT_WEB, them || {})); res.end(html); }
function cors(req) {
  const o = req.headers.origin;
  if (!o || NGUON.indexOf(o) < 0) return {};
  return { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Khoa', 'Access-Control-Max-Age': '600' };
}
function docThan(req, toi_da) {
  return new Promise((ok, loi) => {
    let n = 0; const p = [];
    req.on('data', (c) => { n += c.length; if (n > (toi_da || TOI_DA)) { loi(new Error('Dữ liệu quá lớn.')); req.destroy(); } else p.push(c); });
    req.on('end', () => ok(Buffer.concat(p).toString('utf8')));
    req.on('error', loi);
  });
}
const docJson = async (req, toi_da) => {
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) throw new Loi(415, 'Cần gửi dữ liệu dạng JSON.'); // chặn biểu mẫu giả mạo từ trang khác
  const s = await docThan(req, toi_da); if (!s) return {}; try { return JSON.parse(s); } catch (x) { throw new Error('Dữ liệu gửi lên không đúng dạng.'); } };
const cookie = (req, ten) => { const m = String(req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + ten + '=([^;]+)')); return m ? decodeURIComponent(m[1]) : ''; };
const ipCua = (req) => (process.env.SAU_PROXY === '1' ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '') || req.socket.remoteAddress || '';
const quaHttps = (req) => process.env.BAO_MAT === '1' || req.headers['x-forwarded-proto'] === 'https';
const datCookie = (req, gt, giay) => 'mn_phien=' + encodeURIComponent(gt) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + giay + (quaHttps(req) ? '; Secure' : '');
const LOAI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
function guiTinh(res, ten) {
  const f = path.join(WEB, ten);
  if (f.indexOf(WEB + path.sep) !== 0 || !fs.existsSync(f) || !fs.statSync(f).isFile()) return false;
  res.writeHead(200, Object.assign({ 'Content-Type': LOAI[path.extname(f)] || 'application/octet-stream', 'Cache-Control': ten === 'index.html' ? 'no-store' : 'public, max-age=300', 'Content-Security-Policy': CSP }, BAO_MAT_WEB));
  res.end(fs.readFileSync(f));
  return true;
}
class Loi extends Error { constructor(ma, msg) { super(msg); this.ma = ma; } }

// ------------------------------------------------------------------ API phần mềm web (đăng nhập bằng cookie)
async function apiWeb(req, res, u, p, nguoi) {
  const tim = (ma) => { const d = docDon(ma); if (!d) throw new Loi(404, 'Không có đơn ' + ma); return d; };
  const chi = (vai) => { if (!D.co(nguoi, vai)) throw new Loi(403, 'Không có quyền.'); };
  const lay = req.method === 'GET';
  let m;
  if (p === '/api/w/toi' && lay) return { nguoi: nguoi, vai: XacThuc.VAI, buoc: D.BUOC, cai_dat: caiDat(), phien_ban: PHIEN_BAN };
  if (p === '/api/w/bang-viec' && lay) {
    const ds = dsDon();
    const hom_nay = D.ngayVN();
    const tt = ds.map((d) => D.tomTat(d, nguoi));
    const dem = { cho_duyet: 0, san_xuat: 0, xong: 0, tre: 0, canh_bao: 0, cho_may: 0 };
    tt.forEach((t) => { if (dem[t.trang_thai] !== undefined) dem[t.trang_thai] += 1; if (t.tre) dem.tre += 1; if (t.trang_thai === 'san_xuat') dem.canh_bao += t.canh_bao; if (t.trang_thai === 'san_xuat' && t.cat.tt === 'cho') dem.cho_may += 1; });
    return { dem: dem, viec: D.viecCua(ds, nguoi).slice(0, 200), tre: tt.filter((t) => t.tre), cho_duyet: tt.filter((t) => t.trang_thai === 'cho_duyet'), canh_bao: tt.filter((t) => t.canh_bao && t.trang_thai !== 'huy'), hen_tuan: tt.filter((t) => t.trang_thai === 'san_xuat' && t.ngay_hen && t.ngay_hen >= hom_nay && t.ngay_hen <= D.ngayVN(new Date(Date.now() + 7 * 864e5).toISOString())) };
  }
  if (p === '/api/w/don' && lay) {
    const tt = u.searchParams.get('tt') || '', q = String(u.searchParams.get('q') || '').toLowerCase().trim();
    let ds = dsDon().map((d) => D.tomTat(d, nguoi));
    if (tt === 'tre') ds = ds.filter((d) => d.tre); else if (tt) ds = ds.filter((d) => d.trang_thai === tt); else ds = ds.filter((d) => d.trang_thai !== 'huy');
    if (q) ds = ds.filter((d) => [d.ma, d.ten, d.khach, d.cong_trinh, d.ma_hd].join(' ').toLowerCase().indexOf(q) >= 0);
    return { don: ds.slice(0, 500) };
  }
  if ((m = p.match(/^\/api\/w\/don\/(C\d{6}-\d+)$/)) && lay) return D.chiTiet(tim(m[1]), nguoi);
  if ((m = p.match(/^\/api\/w\/don\/(C\d{6}-\d+)\/([\w-]+)$/)) && req.method === 'POST') {
    const b = await docJson(req, 64 * 1024), d = tim(m[1]), viec = m[2]; // đọc xong dữ liệu gửi lên rồi mới mở đơn: không đè lên thay đổi của người khác
    if (viec === 'bo') D.doiBo(d, Array.isArray(b.ids) ? b.ids : [], String(b.toi || ''), nguoi, b.ly_do);
    else if (viec === 'duyet') D.duyet(d, nguoi);
    else if (viec === 'huy') D.huy(d, nguoi, b.ly_do);
    else if (viec === 'mo-lai') D.moLai(d, nguoi);
    else if (viec === 'thong-tin') D.doiThongTin(d, b, nguoi);
    else if (viec === 'kinh') D.doiKinh(d, b.khoa, b.tt, nguoi);
    else if (viec === 'canh-bao') D.xongCanhBao(d, Number(b.i), nguoi);
    else if (viec === 'cat') { chi(['chu', 'dieu_phoi', 'to_cat']); D.doiCat(d, String(b.tt || ''), nguoi.ten); }
    else throw new Loi(404, 'Không có việc này.');
    kho.ghiDon(d);
    return D.chiTiet(d, nguoi);
  }
  if (p === '/api/w/bao-cao' && lay) {
    const thang = /^\d{4}-\d{2}$/.test(u.searchParams.get('thang') || '') ? u.searchParams.get('thang') : D.ngayVN().slice(0, 7);
    chi(['chu', 'dieu_phoi']);
    return D.baoCao(dsDon(), thang, nguoi);
  }
  if (p === '/api/w/nguoi' && lay) { chi('chu'); return { nguoi: xt.dsNguoi().map((n) => xt.congKhai(n)), vai: XacThuc.VAI }; }
  if (p === '/api/w/nguoi' && req.method === 'POST') {
    chi('chu');
    const b = await docJson(req);
    const n = xt.luuNguoi({ id: b.id || undefined, ten: b.ten, sdt: b.sdt, vai: b.vai, pin: b.pin, khoa: b.khoa });
    if (b.id && (b.khoa || b.pin)) xt.huyPhienCua(b.id);
    return { nguoi: n };
  }
  if (p === '/api/w/cai-dat' && req.method === 'POST') {
    chi('chu');
    const b = await docJson(req), c = caiDat();
    if (b.can_duyet !== undefined) c.can_duyet = !!b.can_duyet;
    if (b.cong_ty !== undefined) c.cong_ty = String(b.cong_ty).slice(0, 80);
    kho.ghi('cai-dat.json', c);
    return { cai_dat: c };
  }
  if (p === '/api/w/nguoi-gon' && lay) return { nguoi: xt.dsNguoi().filter((n) => !n.khoa).map((n) => ({ id: n.id, ten: n.ten })) };
  throw new Loi(404, 'Không có đường này.');
}

// ------------------------------------------------------------------ máy chủ
const may_chu = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;
  const ch = cors(req);
  const k = req.headers['x-khoa'] || u.searchParams.get('k') || '';
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, ch); return res.end(); }
    if (p === '/suc-khoe') return guiJson(res, 200, { ok: true, ban: PHIEN_BAN });

    // ---- đăng nhập phần mềm web
    if (p === '/api/trang-thai') return guiJson(res, 200, { ok: true, co_nguoi: xt.coAi(), nguoi: xt.nguoiTuToken(cookie(req, 'mn_phien')), ban: PHIEN_BAN });
    if (p === '/api/cai-dat-dau' && req.method === 'POST') {
      const b = await docJson(req, 16 * 1024);
      if (xt.coAi()) throw new Loi(409, 'Đã có tài khoản — đăng nhập bình thường.');
      if (!dungKhoa(b.khoa)) throw new Loi(401, 'Sai khoá máy chủ (biến KHOA).');
      xt.luuNguoi({ ten: b.ten, sdt: b.sdt, pin: b.pin, vai: ['chu'] });
      const r = xt.dangNhap(b.sdt, b.pin);
      return guiJson(res, 200, { ok: true, nguoi: r.nguoi }, { 'Set-Cookie': datCookie(req, r.token, r.het_giay) });
    }
    if (p === '/api/dang-nhap' && req.method === 'POST') {
      const b = await docJson(req, 16 * 1024);
      let r;
      try { r = xt.dangNhap(b.sdt, b.pin, ipCua(req)); } catch (x) { throw new Loi(401, x.message); }
      return guiJson(res, 200, { ok: true, nguoi: r.nguoi }, { 'Set-Cookie': datCookie(req, r.token, r.het_giay) });
    }
    if (p === '/api/dang-xuat' && req.method === 'POST') {
      if (req.headers['x-mn'] !== '1') throw new Loi(403, 'Yêu cầu không hợp lệ.'); xt.dangXuat(cookie(req, 'mn_phien')); return guiJson(res, 200, { ok: true }, { 'Set-Cookie': datCookie(req, '', 0) }); }
    if (p.indexOf('/api/w/') === 0) {
      const nguoi = xt.nguoiTuToken(cookie(req, 'mn_phien'));
      if (!nguoi) throw new Loi(401, 'Phiên đăng nhập đã hết — đăng nhập lại.');
      // chống giả mạo yêu cầu từ trang khác: mọi thao tác ghi phải kèm tiêu đề riêng (trang lạ không gửi được qua cookie)
      if (req.method !== 'GET' && req.headers['x-mn'] !== '1') throw new Loi(403, 'Yêu cầu không hợp lệ.');
      const kq = await apiWeb(req, res, u, p, nguoi);
      return guiJson(res, 200, Object.assign({ ok: true }, kq));
    }

    // ---- API cho tiện ích + chương trình lấy file của máy cắt (khoá)
    if (p.indexOf('/api/') === 0) {
      if (!dungKhoa(k, req.method === 'GET')) return guiJson(res, 401, { ok: false, loi: 'Sai khoá gửi — xem Cài đặt → Sản xuất trong tiện ích.' }, ch);
      if (p === '/api/don' && req.method === 'POST') {
        const r = D.nhanDon(kho, await docJson(req), caiDat(), 'Tiện ích');
        const d = r.don;
        return guiJson(res, 200, { ok: true, ma: d.ma, moi: r.moi, phien_ban: d.phien_ban, trang_thai: d.trang_thai, so_dong: d.so_dong, so_cay: d.so_cay, canh_bao: r.canh_bao }, ch);
      }
      if (p === '/api/don' && req.method === 'GET') {
        const moi = u.searchParams.get('moi') === '1';
        return guiJson(res, 200, { ok: true, don: dsDon().filter((d) => d.trang_thai === 'san_xuat' && (!moi || d.cat.tt === 'cho')).map((d) => ({ ma: d.ma, don: d.ten, cong_trinh: d.cong_trinh, luc: d.luc, phien_ban: d.phien_ban, trang_thai: d.cat.tt, so_bo: d.bo.length, so_dong: d.so_dong, so_cay: d.so_cay, tep: tenTep(d) + (d.phien_ban > 1 ? '-b' + d.phien_ban : '') })) }, ch);
      }
      const m = p.match(/^\/api\/don\/(C\d{6}-\d+)\/(da-lay|xong)$/);
      if (m && req.method === 'POST') {
        const d = docDon(m[1]); if (!d) return guiJson(res, 404, { ok: false, loi: 'Không có đơn ' + m[1] }, ch);
        D.doiCat(d, m[2].replace('-', '_'), 'Máy cắt'); kho.ghiDon(d);
        return guiJson(res, 200, { ok: true, trang_thai: d.cat.tt }, ch);
      }
      return guiJson(res, 404, { ok: false, loi: 'Không có đường này.' }, ch);
    }

    // ---- trang máy cắt + tải file (khoá hoặc đăng nhập)
    const vao_web = () => !!xt.nguoiTuToken(cookie(req, 'mn_phien'));
    if (p === '/may') {
      if (!k) return guiHtml(res, 200, trangVao(false));
      if (!dungKhoa(k, true)) return guiHtml(res, 401, trangVao(true));
      return guiHtml(res, 200, trangMay(k, u.searchParams.get('loc')));
    }
    let m = p.match(/^\/tai\/(C\d{6}-\d+)(-kinh)?\.(xlsx|csv)$/);
    if (m) {
      if (!dungKhoa(k, true) && !vao_web()) { res.writeHead(401); return res.end('Sai khoá'); }
      const d = docDon(m[1]); if (!d) { res.writeHead(404); return res.end('Không có đơn'); }
      const kinh = !!m[2];
      const noi = kinh ? Buffer.from(xlsxKinh(d)) : m[3] === 'xlsx' ? Buffer.from(M.xlsxCat(d.bo, ttCat(d))) : Buffer.from(csvCat(d), 'utf8');
      if (!kinh && d.cat.tt === 'cho' && dungKhoa(k)) { D.doiCat(d, 'da_lay', 'Máy cắt (tải ' + m[3] + ')'); kho.ghiDon(d); }
      res.writeHead(200, { 'Content-Type': m[3] === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + tenTep(d) + (kinh ? '-kinh' : '') + '.' + m[3] + '"', 'Content-Length': noi.length, 'Cache-Control': 'no-store' });
      return res.end(noi);
    }
    m = p.match(/^\/ban-ve\/(C\d{6}-\d+)$/);
    if (m) {
      if (!dungKhoa(k, true) && !vao_web()) { res.writeHead(401); return res.end('Sai khoá'); }
      const d = docDon(m[1]); if (!d) { res.writeHead(404); return res.end('Không có đơn'); }
      const chon = u.searchParams.get('bo');
      const bo = chon ? d.bo.filter((b) => b.id === chon) : d.bo;
      const html = M.htmlBanVe(bo, ttCat(d)).replace(' onclick="print()"', '').replace('</body>', '<script src="/web/in.js"></script></body>');
      return guiHtml(res, 200, html, { 'Content-Security-Policy': CSP_TRANG + "; script-src 'self'" });
    }
    m = p.match(/^\/doi\/(C\d{6}-\d+)\/xong$/);
    if (m && req.method === 'POST') {
      if (!dungKhoa(k)) { res.writeHead(401); return res.end('Khoá chỉ xem không đổi được trạng thái'); }
      const d = docDon(m[1]); if (d) { D.doiCat(d, 'xong', 'Máy cắt (trang /may)'); kho.ghiDon(d); }
      res.writeHead(303, { Location: '/may?k=' + encodeURIComponent(k) }); return res.end();
    }

    // ---- phần mềm web (một trang)
    if (req.method === 'GET' && (p === '/' || /^\/(don|viec|bao-cao|nguoi|cai-dat)(\/[\w-]*)?$/.test(p))) { if (guiTinh(res, 'index.html')) return undefined; }
    if (req.method === 'GET' && /^\/web\/[\w.-]+$/.test(p) && guiTinh(res, p.slice(5))) return undefined;
    guiHtml(res, 404, KHUNG('Không có trang này', '<p>Không có trang này. <a href="/">Về trang chính</a></p>'));
  } catch (x) {
    const ma = x instanceof Loi ? x.ma : 400;
    guiJson(res, ma, { ok: false, loi: x && x.message ? x.message : String(x) }, ch);
  }
});

if (require.main === module) {
  if (!KHOA.length) { console.error('Thiếu biến KHOA (khoá gửi đơn). Ví dụ: KHOA=chuoi-bi-mat-dai node may-chu.js'); process.exit(1); }
  may_chu.requestTimeout = 60000; may_chu.headersTimeout = 20000;
  may_chu.listen(CONG, () => console.log('Phần mềm xưởng nhôm v' + PHIEN_BAN + ' chạy ở cổng ' + CONG + ', dữ liệu: ' + kho.goc + (xt.coAi() ? '' : '\nChưa có tài khoản: mở trang web, nhập KHOA để tạo tài khoản Chủ.')));
}
module.exports = { may_chu, csvCat, kho, xt };
