/* Một Nhà · Máy chủ xưởng nhôm (sxnhom.motnha.vn)
 * Nhận đơn cắt từ tiện ích "Một Nhà · Vẽ cửa" (WindoorCraft) → lưu → máy cắt nhôm lấy file Excel/CSV về nhập là cắt.
 * Chỉ dùng Node.js (≥ 16), không cần cài thêm thư viện. Dữ liệu lưu thành file JSON trong thư mục DU_LIEU.
 *
 * Biến môi trường:
 *   CONG=8080                      cổng
 *   DU_LIEU=./du-lieu              thư mục dữ liệu
 *   KHOA=khoa-gui-1,khoa-gui-2     khoá cho tiện ích gửi đơn + chương trình lấy file của máy cắt (bắt buộc)
 *   KHOA_XEM=...                   (tuỳ chọn) khoá chỉ xem / tải cho trang /may; mặc định dùng chung KHOA
 *   NGUON=https://ln.windoorcraft.com   trang được phép gửi (CORS)
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const M = require('./lib/mnwd-sanxuat.js');

const CONG = Number(process.env.CONG || 8080);
const DU_LIEU = path.resolve(process.env.DU_LIEU || path.join(__dirname, 'du-lieu'));
const KHOA = String(process.env.KHOA || '').split(',').map((x) => x.trim()).filter(Boolean);
const KHOA_XEM = String(process.env.KHOA_XEM || '').split(',').map((x) => x.trim()).filter(Boolean);
const NGUON = String(process.env.NGUON || 'https://ln.windoorcraft.com').split(',').map((x) => x.trim());
const TOI_DA = 8 * 1024 * 1024;
const THU_MUC = path.join(DU_LIEU, 'don');
fs.mkdirSync(THU_MUC, { recursive: true });

// ------------------------------------------------------------------ tiện ích
const bang = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const dungKhoa = (k, ca_xem) => !!k && (KHOA.some((x) => bang(x, k)) || (ca_xem && KHOA_XEM.some((x) => bang(x, k))));
const e = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const maHopLe = (m) => /^C\d{6}-\d{3,}$/.test(m);
const docDon = (ma) => { try { return JSON.parse(fs.readFileSync(path.join(THU_MUC, ma + '.json'), 'utf8')); } catch (x) { return null; } };
const ghiDon = (d) => { const f = path.join(THU_MUC, d.ma + '.json'); fs.writeFileSync(f + '.tmp', JSON.stringify(d)); fs.renameSync(f + '.tmp', f); };
const dsDon = () => fs.readdirSync(THU_MUC).filter((f) => /^C\d{6}-\d+\.json$/.test(f)).map((f) => docDon(f.slice(0, -5))).filter(Boolean).sort((a, b) => (b.luc || '').localeCompare(a.luc || ''));
const gioVN = (iso) => { const d = new Date(new Date(iso).getTime() + 7 * 3600e3); return d.toISOString().slice(0, 16).replace('T', ' '); };
const maMoi = () => {
  const n = new Date(Date.now() + 7 * 3600e3), ngay = n.toISOString().slice(2, 10).replace(/-/g, '');
  const co = fs.readdirSync(THU_MUC).filter((f) => f.indexOf('C' + ngay + '-') === 0).map((f) => Number(f.slice(8, -5)) || 0);
  return 'C' + ngay + '-' + String((co.length ? Math.max.apply(null, co) : 0) + 1).padStart(3, '0');
};
const tenTep = (d) => (d.ma + '-' + String(d.don || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')).slice(0, 60);
const TRANG_THAI = { moi: 'Mới', da_lay: 'Máy đã lấy', dang_cat: 'Đang cắt', xong: 'Cắt xong', huy: 'Huỷ' };

/** Kiểm tra + làm sạch đơn gửi lên */
function lamSach(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.bo) || !b.bo.length) throw new Error('Đơn không có bộ cửa nào.');
  if (b.bo.length > 500) throw new Error('Quá 500 bộ trong một đơn.');
  const chu = (v, n) => String(v === undefined || v === null ? '' : v).slice(0, n || 200);
  const so = (v) => (isFinite(Number(v)) ? Number(v) : 0);
  const bo = b.bo.map((x) => {
    const bt = x.boc_tach || {};
    if (!Array.isArray(bt.nhom) || !bt.nhom.length) throw new Error('Bộ ' + chu(x.ky_hieu, 20) + ' chưa có số bóc tách nhôm.');
    return {
      ky_hieu: chu(x.ky_hieu, 40), so_luong: so(x.so_luong) || 1, vi_tri: chu(x.vi_tri), ghi_chu: chu(x.ghi_chu, 500), mo_ta: chu(x.mo_ta, 300), he_nhom: chu(x.he_nhom), kinh: chu(x.kinh), rong: so(x.rong), cao: so(x.cao), ma_don: chu(x.ma_don, 40),
      svg: /^<svg[\s>]/.test(String(x.svg || '')) && !/<script|on\w+\s*=|javascript:/i.test(String(x.svg)) ? String(x.svg).slice(0, 200000) : '',
      boc_tach: {
        nhom: bt.nhom.slice(0, 2000).map((t) => ({ ma: chu(t.ma, 60), ten: chu(t.ten), mau: chu(t.mau, 60), dai: so(t.dai), sl: so(t.sl), goc1: chu(t.goc1, 10), goc2: chu(t.goc2, 10), loai: chu(t.loai, 40), vi_tri: chu(t.vi_tri, 80), kg_m: so(t.kg_m), toi_uu: t.toi_uu === 0 ? 0 : 1 })).filter((t) => t.dai > 0 && t.sl > 0),
        kinh: (bt.kinh || []).slice(0, 500).map((k) => ({ ten: chu(k.ten), loai: chu(k.loai), rong: so(k.rong), cao: so(k.cao), sl: so(k.sl), ky: chu(k.ky, 40), kieu: chu(k.kieu, 40) })),
        pk: (bt.pk || []).slice(0, 1000).map((p) => ({ ma: chu(p.ma, 60), ten: chu(p.ten), sl: so(p.sl), dai: p.dai === '' ? '' : so(p.dai) })),
      },
    };
  });
  const may = b.may || {};
  return { don: chu(b.don, 80) || 'Đơn', cong_trinh: chu(b.cong_trinh), khach: chu(b.khach), nguon: chu(b.nguon, 60), may: { cay: so(may.cay) >= 1000 ? so(may.cay) : 5800, hao_dau: so(may.hao_dau) >= 0 ? so(may.hao_dau) : 10, mach: so(may.mach) >= 0 ? so(may.mach) : 12 }, bo: bo };
}
const ttCat = (d) => ({ don: d.don, cong_trinh: d.cong_trinh, cay: d.may.cay, hao_dau: d.may.hao_dau, mach: d.may.mach });
/** CSV danh sách cắt (dấu ; , UTF-8 có BOM) — cho phần mềm máy cắt không đọc .xlsx */
function csvCat(d) {
  const t = M.trangCat(d.bo, ttCat(d))[0].dong;
  const q = (v) => { const s = String(v === undefined || v === null ? '' : v); return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return '﻿' + t.map((r) => r.map(q).join(';')).join('\r\n') + '\r\n';
}

// ------------------------------------------------------------------ HTML
const KHUNG = (tieu_de, than, k) => '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + e(tieu_de) + '</title><style>' +
  'body{font-family:"Segoe UI",Arial,sans-serif;margin:0;background:#f2f5f9;color:#1c2733;font-size:16px}.dau{background:#17365d;color:#fff;padding:12px 18px;font-size:20px}.dau small{opacity:.75;font-size:14px;margin-left:10px}.than{padding:14px 18px}' +
  'table{border-collapse:collapse;width:100%;background:#fff}th,td{padding:10px 8px;border-bottom:1px solid #dde3ec;text-align:left;vertical-align:middle}th{background:#dce6f1;font-size:14px}' +
  'a.nut,button.nut{display:inline-block;padding:12px 18px;margin:2px;border-radius:6px;background:#17365d;color:#fff;text-decoration:none;font-size:17px;border:0;cursor:pointer}a.nut.phu,button.nut.phu{background:#6b7c93}a.nut.xanh,button.nut.xanh{background:#1d6b3a}' +
  '.tt{padding:3px 8px;border-radius:10px;font-size:13px;background:#e3e8ef}.tt.moi{background:#fde9b7}.tt.da_lay{background:#d6e6fb}.tt.xong{background:#cfead8}.tt.huy{background:#f3d3d0}form{display:inline}.nho{color:#5b6b80;font-size:13px}' +
  '</style></head><body><div class="dau">MỘT NHÀ · XƯỞNG NHÔM<small>' + e(tieu_de) + '</small></div><div class="than">' + than + '</div></body></html>';
function trangMay(k, loc) {
  const ds = dsDon().filter((d) => loc === 'het' || d.trang_thai !== 'xong' && d.trang_thai !== 'huy');
  const kq = encodeURIComponent(k);
  const hang = ds.map((d) => '<tr><td><b>' + e(d.ma) + '</b><br><span class="nho">' + e(gioVN(d.luc)) + '</span></td><td><b>' + e(d.don) + '</b>' + (d.cong_trinh ? '<br><span class="nho">' + e(d.cong_trinh) + '</span>' : '') + '</td><td>' + d.bo.length + ' bộ · ' + d.so_dong + ' dòng cắt · ' + d.so_cay + ' cây</td><td><span class="tt ' + e(d.trang_thai) + '">' + e(TRANG_THAI[d.trang_thai] || d.trang_thai) + '</span></td><td>' +
    '<a class="nut" href="/tai/' + e(d.ma) + '.xlsx?k=' + kq + '">Excel</a><a class="nut phu" href="/tai/' + e(d.ma) + '.csv?k=' + kq + '">CSV</a><a class="nut phu" href="/ban-ve/' + e(d.ma) + '?k=' + kq + '" target="_blank">Bản vẽ</a>' +
    (d.trang_thai !== 'xong' ? '<form method="post" action="/doi/' + e(d.ma) + '/xong?k=' + kq + '"><button class="nut xanh">Cắt xong</button></form>' : '') + '</td></tr>').join('');
  return KHUNG('Máy cắt — đơn chờ cắt', '<p><a class="nut phu" href="/may?k=' + kq + '">Làm mới</a> <a class="nut phu" href="/may?k=' + kq + (loc === 'het' ? '' : '&loc=het') + '">' + (loc === 'het' ? 'Chỉ đơn chưa xong' : 'Xem cả đơn đã xong') + '</a></p>' +
    (ds.length ? '<table><tr><th>Mã</th><th>Đơn</th><th>Khối lượng</th><th>Trạng thái</th><th></th></tr>' + hang + '</table>' : '<p>Chưa có đơn nào chờ cắt.</p>') +
    '<p class="nho">Bấm Excel/CSV để tải file rồi nhập vào phần mềm máy cắt (chế độ nhập dữ liệu). Trang tự làm mới mỗi 60 giây.</p><script>setTimeout(function(){location.reload()},60000)</script>', k);
}
const trangVao = (sai) => KHUNG('Đăng nhập', (sai ? '<p style="color:#b03a2e">Sai khoá.</p>' : '') + '<form method="get" action="/may"><p>Khoá xưởng:</p><input name="k" type="password" style="font-size:20px;padding:8px;width:260px"> <button class="nut">Vào</button></form>');

// ------------------------------------------------------------------ máy chủ
function guiJson(res, ma, o, them) { res.writeHead(ma, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, them || {})); res.end(JSON.stringify(o)); }
function cors(req) {
  const o = req.headers.origin;
  if (!o || NGUON.indexOf(o) < 0) return {};
  return { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Khoa', 'Access-Control-Max-Age': '600' };
}
function docThan(req) {
  return new Promise((ok, loi) => {
    let n = 0; const p = [];
    req.on('data', (c) => { n += c.length; if (n > TOI_DA) { loi(new Error('Đơn quá lớn.')); req.destroy(); } else p.push(c); });
    req.on('end', () => ok(Buffer.concat(p).toString('utf8')));
    req.on('error', loi);
  });
}

const may_chu = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;
  const ch = cors(req);
  const k = req.headers['x-khoa'] || u.searchParams.get('k') || '';
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, ch); return res.end(); }
    if (p === '/suc-khoe') return guiJson(res, 200, { ok: true, ban: '0.3.0' });

    // ---- API cho tiện ích + chương trình lấy file
    if (p.indexOf('/api/') === 0) {
      if (!dungKhoa(k, req.method === 'GET')) return guiJson(res, 401, { ok: false, loi: 'Sai khoá gửi — xem Cài đặt → Sản xuất trong tiện ích.' }, ch);
      if (p === '/api/don' && req.method === 'POST') {
        const d = lamSach(JSON.parse(await docThan(req)));
        const cat = M.dsCat(d.bo);
        d.ma = maMoi(); d.luc = new Date().toISOString(); d.trang_thai = 'moi';
        d.so_dong = cat.length; d.so_cay = M.toiUuCay(cat, d.may).length; d.lich_su = [{ luc: d.luc, viec: 'nhận từ ' + (d.nguon || 'tiện ích') }];
        ghiDon(d);
        return guiJson(res, 200, { ok: true, ma: d.ma, so_dong: d.so_dong, so_cay: d.so_cay }, ch);
      }
      if (p === '/api/don' && req.method === 'GET') {
        const moi = u.searchParams.get('moi') === '1';
        return guiJson(res, 200, { ok: true, don: dsDon().filter((d) => !moi || d.trang_thai === 'moi').map((d) => ({ ma: d.ma, don: d.don, cong_trinh: d.cong_trinh, luc: d.luc, trang_thai: d.trang_thai, so_bo: d.bo.length, so_dong: d.so_dong, so_cay: d.so_cay, tep: tenTep(d) })) }, ch);
      }
      const m = p.match(/^\/api\/don\/(C\d{6}-\d+)\/(da-lay|dang-cat|xong|huy)$/);
      if (m && req.method === 'POST') {
        const d = docDon(m[1]); if (!d) return guiJson(res, 404, { ok: false, loi: 'Không có đơn ' + m[1] }, ch);
        d.trang_thai = m[2].replace('-', '_'); d.lich_su.push({ luc: new Date().toISOString(), viec: TRANG_THAI[d.trang_thai] });
        ghiDon(d); return guiJson(res, 200, { ok: true, trang_thai: d.trang_thai }, ch);
      }
      return guiJson(res, 404, { ok: false, loi: 'Không có đường này.' }, ch);
    }

    // ---- trang cho máy cắt / xưởng (trình duyệt cũ trên Windows 7 cũng xem được)
    if (p === '/' || p === '/may') {
      if (!k) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(trangVao(false)); }
      if (!dungKhoa(k, true)) { res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(trangVao(true)); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(trangMay(k, u.searchParams.get('loc')));
    }
    let m = p.match(/^\/tai\/(C\d{6}-\d+)\.(xlsx|csv)$/);
    if (m) {
      if (!dungKhoa(k, true)) { res.writeHead(401); return res.end('Sai khoá'); }
      const d = docDon(m[1]); if (!d) { res.writeHead(404); return res.end('Không có đơn'); }
      const noi = m[2] === 'xlsx' ? Buffer.from(M.xlsxCat(d.bo, ttCat(d))) : Buffer.from(csvCat(d), 'utf8');
      if (d.trang_thai === 'moi') { d.trang_thai = 'da_lay'; d.lich_su.push({ luc: new Date().toISOString(), viec: 'tải ' + m[2] }); ghiDon(d); }
      res.writeHead(200, { 'Content-Type': m[2] === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + tenTep(d) + '.' + m[2] + '"', 'Content-Length': noi.length, 'Cache-Control': 'no-store' });
      return res.end(noi);
    }
    m = p.match(/^\/ban-ve\/(C\d{6}-\d+)$/);
    if (m) {
      if (!dungKhoa(k, true)) { res.writeHead(401); return res.end('Sai khoá'); }
      const d = docDon(m[1]); if (!d) { res.writeHead(404); return res.end('Không có đơn'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'" });
      return res.end(M.htmlBanVe(d.bo, Object.assign(ttCat(d), { cong_ty: 'MỘT NHÀ DESIGN & BUILD', don: d.don + ' · ' + d.ma })));
    }
    m = p.match(/^\/doi\/(C\d{6}-\d+)\/(xong|dang-cat|huy)$/);
    if (m && req.method === 'POST') {
      if (!dungKhoa(k, true)) { res.writeHead(401); return res.end('Sai khoá'); }
      const d = docDon(m[1]); if (d) { d.trang_thai = m[2].replace('-', '_'); d.lich_su.push({ luc: new Date().toISOString(), viec: TRANG_THAI[d.trang_thai] + ' (trang máy cắt)' }); ghiDon(d); }
      res.writeHead(303, { Location: '/may?k=' + encodeURIComponent(k) }); return res.end();
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Không có trang này');
  } catch (x) {
    guiJson(res, 400, { ok: false, loi: x && x.message ? x.message : String(x) }, ch);
  }
});

if (require.main === module) {
  if (!KHOA.length) { console.error('Thiếu biến KHOA (khoá gửi đơn). Ví dụ: KHOA=chuoi-bi-mat-dai node may-chu.js'); process.exit(1); }
  may_chu.listen(CONG, () => console.log('Máy chủ xưởng nhôm chạy ở cổng ' + CONG + ', dữ liệu: ' + DU_LIEU));
}
module.exports = { may_chu, maHopLe, lamSach, csvCat };
