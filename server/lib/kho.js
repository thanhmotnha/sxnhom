/* Lưu trữ bằng file JSON (đủ cho một xưởng; sao lưu = chép thư mục du-lieu).
 * Ghi qua file tạm rồi đổi tên → không bao giờ để lại file ghi dở. */
'use strict';
const fs = require('fs');
const path = require('path');

function Kho(goc) {
  this.goc = path.resolve(goc);
  this.dir_don = path.join(this.goc, 'don');
  fs.mkdirSync(this.dir_don, { recursive: true });
  this._dem = 0;
}
Kho.prototype.tep = function (ten) { return path.join(this.goc, ten); };
/** Đọc file JSON. Chưa có file → mac_dinh. File có mà hỏng → báo lỗi (không âm thầm coi như trống, kẻo mất người dùng / phiên). */
Kho.prototype.doc = function (ten, mac_dinh) {
  let s;
  try { s = fs.readFileSync(this.tep(ten), 'utf8'); } catch (e) { if (e.code === 'ENOENT') return mac_dinh; throw e; }
  try { return JSON.parse(s); } catch (e) { throw new Error('File dữ liệu ' + ten + ' bị hỏng — khôi phục từ bản sao lưu.'); }
};
Kho.prototype.ghi = function (ten, o) {
  const f = this.tep(ten), tam = f + '.' + process.pid + '.' + (++this._dem) + '.tmp';
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(tam, JSON.stringify(o));
  fs.renameSync(tam, f);
};
Kho.MA_DON = /^C\d{6}-\d{3,}$/;
Kho.prototype.docDon = function (ma) {
  if (!Kho.MA_DON.test(String(ma))) return null;
  try { return this.doc('don/' + ma + '.json', null); } catch (e) { console.error('[kho] ' + e.message); return null; } // một đơn hỏng không làm sập cả danh sách
};
Kho.prototype.ghiDon = function (d) { if (!Kho.MA_DON.test(d.ma)) throw new Error('Mã đơn sai'); this.ghi('don/' + d.ma + '.json', d); };
Kho.prototype.dsDon = function () {
  return fs.readdirSync(this.dir_don).filter((f) => /^C\d{6}-\d+\.json$/.test(f)).map((f) => this.docDon(f.slice(0, -5))).filter(Boolean)
    .sort((a, b) => String(b.luc || '').localeCompare(String(a.luc || '')));
};
/** Mã đơn mới theo ngày giờ Việt Nam: C251009-001 */
Kho.prototype.maMoi = function (bay_gio) {
  const n = new Date((bay_gio || Date.now()) + 7 * 3600e3), ngay = n.toISOString().slice(2, 10).replace(/-/g, '');
  const co = fs.readdirSync(this.dir_don).filter((f) => f.indexOf('C' + ngay + '-') === 0).map((f) => Number(f.slice(8, -5)) || 0);
  return 'C' + ngay + '-' + String((co.length ? Math.max.apply(null, co) : 0) + 1).padStart(3, '0');
};

module.exports = Kho;
