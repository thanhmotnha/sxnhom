/* Người dùng, vai trò, đăng nhập bằng SĐT + mã PIN, phiên đăng nhập (cookie). */
'use strict';
const crypto = require('crypto');

const VAI = {
  chu: 'Chủ / Giám đốc',
  kinh_doanh: 'Kinh doanh / báo giá',
  dieu_phoi: 'Kỹ thuật / điều phối',
  to_cat: 'Tổ cắt',
  to_lap: 'Tổ gia công, lắp ráp',
  kcs: 'KCS',
  kho: 'Kho',
  lap_dat: 'Đội lắp đặt',
};
const PHIEN_NGAY = 30;
// chống dò PIN: theo (máy + SĐT) 5 lần sai → khoá 10 phút; theo máy 20 lần → 30 phút; theo SĐT (mọi máy) 30 lần → 30 phút
const GIOI_HAN = [{ loai: 'cap', toi_da: 5, phut: 10 }, { loai: 'ip', toi_da: 20, phut: 30 }, { loai: 'sdt', toi_da: 30, phut: 30 }];

const bamPin = (pin, muoi) => crypto.scryptSync(String(pin), Buffer.from(muoi, 'hex'), 32).toString('hex');
const bang = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const chuanSdt = (s) => String(s || '').replace(/[^\d]/g, '').replace(/^84/, '0');
const pinHopLe = (p, chu) => (chu ? /^\d{6,8}$/ : /^\d{4,8}$/).test(String(p || ''));
const MUOI_GIA = crypto.randomBytes(16).toString('hex');

function XacThuc(kho) {
  this.kho = kho;
  this.sai = {}; // khoá đếm → {n, den, cuoi}
}
XacThuc.VAI = VAI;
XacThuc.chuanSdt = chuanSdt;

XacThuc.prototype.dsNguoi = function () { return this.kho.doc('nguoi-dung.json', []); };
XacThuc.prototype.ghiNguoi = function (ds) { this.kho.ghi('nguoi-dung.json', ds); };
XacThuc.prototype.coAi = function () { return this.dsNguoi().length > 0; };
XacThuc.prototype.congKhai = function (n) { return n ? { id: n.id, ten: n.ten, sdt: n.sdt, vai: n.vai.slice(), khoa: !!n.khoa } : null; };
XacThuc.prototype.tim = function (id) { return this.dsNguoi().filter((n) => n.id === id)[0] || null; };

/** Thêm / sửa người dùng. o = {id?, ten, sdt, vai:[...], pin?, khoa?} */
XacThuc.prototype.luuNguoi = function (o) {
  const ds = this.dsNguoi();
  const sdt = chuanSdt(o.sdt);
  if (!/^0\d{9,10}$/.test(sdt)) throw new Error('Số điện thoại không hợp lệ.');
  const ten = String(o.ten || '').trim().slice(0, 60);
  if (!ten) throw new Error('Thiếu tên.');
  const vai = (Array.isArray(o.vai) ? o.vai : []).filter((v) => VAI[v]);
  if (!vai.length) throw new Error('Chọn ít nhất một vai trò.');
  if (ds.some((n) => n.sdt === sdt && n.id !== o.id)) throw new Error('Số điện thoại này đã có người dùng.');
  let n = o.id ? ds.filter((x) => x.id === o.id)[0] : null;
  if (o.id && !n) throw new Error('Không có người dùng này.');
  const la_chu = vai.indexOf('chu') >= 0;
  if (!n) {
    if (!pinHopLe(o.pin, la_chu)) throw new Error(la_chu ? 'Tài khoản Chủ cần mã PIN 6–8 chữ số.' : 'Mã PIN gồm 4–8 chữ số.');
    n = { id: 'u' + crypto.randomBytes(5).toString('hex'), tao: new Date().toISOString() };
    ds.push(n);
  }
  n.ten = ten; n.sdt = sdt; n.vai = vai; n.khoa = !!o.khoa;
  if (o.pin !== undefined && o.pin !== '') {
    if (!pinHopLe(o.pin, la_chu)) throw new Error(la_chu ? 'Tài khoản Chủ cần mã PIN 6–8 chữ số.' : 'Mã PIN gồm 4–8 chữ số.');
    n.muoi = crypto.randomBytes(16).toString('hex'); n.pin = bamPin(o.pin, n.muoi);
  }
  // luôn còn ít nhất một chủ đang hoạt động
  if (!ds.some((x) => !x.khoa && x.vai.indexOf('chu') >= 0)) throw new Error('Phải còn ít nhất một tài khoản Chủ đang hoạt động.');
  this.ghiNguoi(ds);
  return this.congKhai(n);
};

/** Đăng nhập → token phiên hoặc ném lỗi */
XacThuc.prototype.dangNhap = function (sdt, pin, ip) {
  sdt = chuanSdt(sdt); ip = String(ip || '?');
  const bay = Date.now();
  const khoa = { cap: 'c|' + ip + '|' + sdt, ip: 'i|' + ip, sdt: 's|' + sdt };
  GIOI_HAN.forEach((g) => { const s = this.sai[khoa[g.loai]]; if (s && s.den > bay) throw new Error('Sai quá nhiều lần — thử lại sau ' + Math.ceil((s.den - bay) / 60000) + ' phút.'); });
  const n = this.dsNguoi().filter((x) => x.sdt === sdt)[0];
  const bam = bamPin(String(pin || ''), n ? n.muoi : MUOI_GIA); // SĐT không có cũng tính băm: không đoán được SĐT nào có tài khoản qua thời gian trả lời
  const dung = !!n && !n.khoa && bang(bam, n.pin);
  if (!dung) {
    GIOI_HAN.forEach((g) => {
      const k = khoa[g.loai], s = this.sai[k];
      const m = this.sai[k] = { n: (s && (!s.den || s.den > bay) && bay - s.cuoi < g.phut * 60000 ? s.n : 0) + 1, den: 0, cuoi: bay };
      if (m.n >= g.toi_da) m.den = bay + g.phut * 60000;
    });
    const ds = Object.keys(this.sai);
    if (ds.length > 5000) ds.forEach((k) => { const s = this.sai[k]; if (s.den < bay && bay - s.cuoi > 3600e3) delete this.sai[k]; });
    throw new Error(n && n.khoa ? 'Tài khoản đã bị khoá.' : 'Sai số điện thoại hoặc mã PIN.');
  }
  delete this.sai[khoa.cap];
  const token = crypto.randomBytes(32).toString('base64url');
  const ph = this.kho.doc('phien.json', {});
  Object.keys(ph).forEach((k) => { if (ph[k].het < bay) delete ph[k]; });
  ph[crypto.createHash('sha256').update(token).digest('hex')] = { uid: n.id, het: bay + PHIEN_NGAY * 864e5 };
  this.kho.ghi('phien.json', ph);
  return { token: token, nguoi: this.congKhai(n), het_giay: PHIEN_NGAY * 86400 };
};
XacThuc.prototype.nguoiTuToken = function (token) {
  if (!token) return null;
  const ph = this.kho.doc('phien.json', {});
  const p = ph[crypto.createHash('sha256').update(String(token)).digest('hex')];
  if (!p || p.het < Date.now()) return null;
  const n = this.tim(p.uid);
  return n && !n.khoa ? this.congKhai(n) : null;
};
XacThuc.prototype.dangXuat = function (token) {
  const ph = this.kho.doc('phien.json', {});
  delete ph[crypto.createHash('sha256').update(String(token || '')).digest('hex')];
  this.kho.ghi('phien.json', ph);
};
/** Đăng xuất mọi máy của một người (khi khoá / đổi PIN) */
XacThuc.prototype.huyPhienCua = function (uid) {
  const ph = this.kho.doc('phien.json', {});
  Object.keys(ph).forEach((k) => { if (ph[k].uid === uid) delete ph[k]; });
  this.kho.ghi('phien.json', ph);
};

module.exports = XacThuc;
