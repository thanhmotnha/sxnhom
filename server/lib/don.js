/* Nghiệp vụ đơn xưởng: nhận đơn từ tiện ích (có phiên bản), duyệt, tiến độ từng bộ, kính, máy cắt, báo cáo. */
'use strict';
const M = require('./mnwd-sanxuat.js');

const BUOC = [
  { ma: 'cho_cat', ten: 'Chờ cắt' },
  { ma: 'da_cat', ten: 'Đã cắt' },
  { ma: 'lap_rap', ten: 'Đang lắp ráp' },
  { ma: 'cho_kcs', ten: 'Chờ KCS' },
  { ma: 'cho_giao', ten: 'Chờ giao' },
  { ma: 'da_lap', ten: 'Đã lắp' },
];
const TEN_BUOC = BUOC.reduce((a, b) => { a[b.ma] = b.ten; return a; }, {});
/** Bước tiếp theo mỗi tổ được bấm: [từ, tới, vai, nút, cần lý do] */
const CHUYEN = [
  ['cho_cat', 'da_cat', 'to_cat', 'Cắt xong'],
  ['da_cat', 'lap_rap', 'to_lap', 'Nhận gia công'],
  ['lap_rap', 'cho_kcs', 'to_lap', 'Lắp ráp xong'],
  ['cho_kcs', 'cho_giao', 'kcs', 'KCS đạt'],
  ['cho_kcs', 'lap_rap', 'kcs', 'KCS không đạt', true],
  ['cho_giao', 'da_lap', 'lap_dat', 'Đã lắp đặt'],
];
const TT_DON = { cho_duyet: 'Chờ duyệt', san_xuat: 'Đang sản xuất', xong: 'Hoàn thành', huy: 'Huỷ' };
const TT_CAT = { cho: 'Chờ máy lấy', da_lay: 'Máy đã lấy', xong: 'Cắt xong' };
const TT_KINH = { chua_dat: 'Chưa đặt', da_dat: 'Đã đặt', da_ve: 'Đã về' };
const QUAN_LY = ['chu', 'dieu_phoi'];

const co = (nguoi, vai) => !!nguoi && nguoi.vai.some((v) => (Array.isArray(vai) ? vai : [vai]).indexOf(v) >= 0);
const laQuanLy = (nguoi) => co(nguoi, QUAN_LY);
const xemGia = (nguoi) => co(nguoi, 'chu');
const bayGio = () => new Date().toISOString();
const ngayVN = (iso) => new Date(new Date(iso || Date.now()).getTime() + 7 * 3600e3).toISOString().slice(0, 10);
const chu = (v, n) => String(v === undefined || v === null ? '' : v).slice(0, n || 200);
const so = (v) => (isFinite(Number(v)) ? Number(v) : 0);
const ghiNK = (d, ai, viec) => { (d.nhat_ky = d.nhat_ky || []).push({ luc: bayGio(), ai: ai, viec: viec }); if (d.nhat_ky.length > 500) d.nhat_ky.splice(0, d.nhat_ky.length - 500); };
const tenAi = (nguoi) => (nguoi && nguoi.ten) || 'Hệ thống';

/** Kiểm tra + làm sạch đơn tiện ích gửi lên */
function lamSach(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.bo) || !b.bo.length) throw new Error('Đơn không có bộ cửa nào.');
  if (b.bo.length > 500) throw new Error('Quá 500 bộ trong một đơn.');
  const bo = b.bo.map((x) => {
    const bt = x.boc_tach || {};
    if (!Array.isArray(bt.nhom) || !bt.nhom.length) throw new Error('Bộ ' + chu(x.ky_hieu, 20) + ' chưa có số bóc tách nhôm.');
    return {
      ky_hieu: chu(x.ky_hieu, 40), so_luong: so(x.so_luong) || 1, vi_tri: chu(x.vi_tri), ghi_chu: chu(x.ghi_chu, 500), mo_ta: chu(x.mo_ta, 300), he_nhom: chu(x.he_nhom), kinh: chu(x.kinh), rong: so(x.rong), cao: so(x.cao), ma_don: chu(x.ma_don, 40),
      svg: /^<svg[\s>]/.test(String(x.svg || '')) && !/<script|<foreignObject|on\w+\s*=|javascript:|href\s*=\s*["']?\s*(?!#)/i.test(String(x.svg)) ? String(x.svg).slice(0, 200000) : '',
      boc_tach: {
        nhom: bt.nhom.slice(0, 2000).map((t) => ({ ma: chu(t.ma, 60), ten: chu(t.ten), mau: chu(t.mau, 60), dai: so(t.dai), sl: so(t.sl), goc1: chu(t.goc1, 10), goc2: chu(t.goc2, 10), loai: chu(t.loai, 40), vi_tri: chu(t.vi_tri, 80), kg_m: so(t.kg_m), toi_uu: t.toi_uu === 0 ? 0 : 1 })).filter((t) => t.dai > 0 && t.sl > 0),
        kinh: (bt.kinh || []).slice(0, 500).map((k) => ({ ten: chu(k.ten), loai: chu(k.loai), rong: so(k.rong), cao: so(k.cao), sl: so(k.sl), ky: chu(k.ky, 40), kieu: chu(k.kieu, 40) })),
        pk: (bt.pk || []).slice(0, 1000).map((p) => ({ ma: chu(p.ma, 60), ten: chu(p.ten), sl: so(p.sl), dai: p.dai === '' ? '' : so(p.dai) })),
      },
      gia: x.gia && isFinite(Number(x.gia.tong)) && Number(x.gia.tong) > 0 ? { tong: so(x.gia.tong), von: x.gia.von === null || x.gia.von === undefined || x.gia.von === '' ? null : so(x.gia.von) } : null,
    };
  });
  const may = b.may || {};
  return {
    ma_hd: /^\d{1,12}$/.test(String(b.ma_hd || '')) ? String(b.ma_hd) : (Array.from(new Set(bo.map((x) => x.ma_don).filter((v) => /^\d{1,12}$/.test(v)))).length === 1 ? bo.filter((x) => x.ma_don)[0].ma_don : ''),
    ten: chu(b.don, 80) || 'Đơn', cong_trinh: chu(b.cong_trinh), khach: chu(b.khach), nguon: chu(b.nguon, 60),
    may: { cay: so(may.cay) >= 1000 ? so(may.cay) : 5800, hao_dau: so(may.hao_dau) >= 0 ? so(may.hao_dau) : 10, mach: so(may.mach) >= 0 ? so(may.mach) : 12 },
    bo: bo,
  };
}

/** Dấu thiết kế của một bộ: đổi kích thước / bóc tách → khác dấu */
const dauBo = (b) => JSON.stringify([b.rong, b.cao, b.so_luong, b.boc_tach.nhom.map((t) => [t.ma, t.dai, t.sl, t.goc1, t.goc2]), b.boc_tach.kinh.map((k) => [k.rong, k.cao, k.sl, k.loai])]);
const tinhCat = (d) => { const cat = M.dsCat(d.bo); d.so_dong = cat.length; d.so_cay = M.toiUuCay(cat, d.may).length; };

/** Đơn cũ (máy chủ 0.3.0) → dạng mới */
function chuanDon(d) {
  if (!d) return d;
  if (!d.ten) d.ten = d.don || 'Đơn';
  if (!TT_DON[d.trang_thai]) {
    const cu = d.trang_thai;
    d.trang_thai = cu === 'huy' ? 'huy' : 'san_xuat';
    d.cat = { tt: cu === 'xong' ? 'xong' : cu === 'da_lay' || cu === 'dang_cat' ? 'da_lay' : 'cho', luc: d.luc };
  }
  d.cat = d.cat || { tt: 'cho', luc: d.luc };
  d.phien_ban = d.phien_ban || 1;
  d.kinh_tt = d.kinh_tt || {};
  d.canh_bao = d.canh_bao || [];
  d.nhat_ky = d.nhat_ky || (d.lich_su || []).map((x) => ({ luc: x.luc, ai: 'Hệ thống', viec: x.viec }));
  d.lich_ban = d.lich_ban || [];
  let i = 0;
  d.bo.forEach((b) => { if (!b.id) b.id = 'b' + (++i) + '_' + Math.random().toString(36).slice(2, 6); if (!TEN_BUOC[b.tt]) b.tt = d.cat.tt === 'xong' ? 'da_cat' : 'cho_cat'; });
  delete d.lich_su;
  return d;
}

/**
 * Nhận đơn từ tiện ích. Cùng mã hợp đồng WindoorCraft với một đơn đang chạy → phiên bản mới của đơn đó:
 * bộ không đổi giữ nguyên tiến độ; bộ đổi thiết kế quay về Chờ cắt và cảnh báo nếu đã cắt rồi.
 */
function nhanDon(kho, than, cai_dat, ai) {
  const x = lamSach(than);
  const cu = x.ma_hd ? kho.dsDon().map(chuanDon).filter((d) => d.ma_hd === x.ma_hd && d.trang_thai !== 'huy')[0] : null;
  const ten_ai = ai || 'Tiện ích';
  if (!cu) {
    const d = { ma: kho.maMoi(), ma_hd: x.ma_hd, ten: x.ten, cong_trinh: x.cong_trinh, khach: x.khach, nguon: x.nguon, luc: bayGio(), ngay_hen: '', phu_trach: '', ghi_chu: '',
      trang_thai: cai_dat.can_duyet ? 'cho_duyet' : 'san_xuat', may: x.may, cat: { tt: 'cho', luc: bayGio() }, phien_ban: 1, lich_ban: [], kinh_tt: {}, canh_bao: [], nhat_ky: [],
      bo: x.bo.map((b, i) => Object.assign({ id: 'b' + (i + 1), tt: 'cho_cat', doi: false }, b)) };
    tinhCat(d);
    ghiNK(d, ten_ai, 'Nhận đơn ' + d.bo.length + ' bộ' + (d.ma_hd ? ' (HĐ WindoorCraft ' + d.ma_hd + ')' : '') + (d.trang_thai === 'cho_duyet' ? ' — chờ duyệt' : ''));
    kho.ghiDon(d);
    return { don: d, moi: true, canh_bao: [] };
  }
  const d = cu;
  const theo_ky = {};
  d.bo.forEach((b) => { theo_ky[String(b.ky_hieu).toLowerCase()] = b; });
  const canh = [], doi = [], them = [];
  let stt = d.bo.reduce((a, b) => Math.max(a, Number(String(b.id).replace(/\D.*$/, '').replace(/^b/, '')) || 0), 0);
  const bo_moi = x.bo.map((b) => {
    const o = theo_ky[String(b.ky_hieu).toLowerCase()];
    if (o) delete theo_ky[String(b.ky_hieu).toLowerCase()];
    if (o && dauBo(o) === dauBo(b)) return Object.assign({}, b, { id: o.id, tt: o.tt, doi: false, loi_kcs: o.loi_kcs || '' });
    stt += 1;
    if (o) { doi.push(b.ky_hieu); if (o.tt !== 'cho_cat') canh.push('Bộ ' + (b.ky_hieu || '?') + ' đã ở bước "' + TEN_BUOC[o.tt] + '" nhưng thiết kế đổi — cần cắt lại.'); }
    else them.push(b.ky_hieu);
    return Object.assign({ id: o ? o.id : 'b' + stt, tt: 'cho_cat', doi: true }, b);
  });
  const bo = Object.keys(theo_ky).map((k) => theo_ky[k]);
  bo.forEach((b) => { if (b.tt !== 'cho_cat') canh.push('Bộ ' + (b.ky_hieu || '?') + ' bị bỏ khỏi đơn nhưng đã ở bước "' + TEN_BUOC[b.tt] + '".'); });
  d.lich_ban.push({ ban: d.phien_ban, luc: d.luc_ban || d.luc, so_bo: d.bo.length });
  d.phien_ban += 1; d.luc_ban = bayGio();
  d.bo = bo_moi; d.ten = x.ten; d.cong_trinh = x.cong_trinh || d.cong_trinh; d.khach = x.khach || d.khach; d.may = x.may;
  if (doi.length || them.length) d.cat = { tt: 'cho', luc: bayGio() };
  if (d.trang_thai === 'xong' && d.bo.some((b) => b.tt !== 'da_lap')) d.trang_thai = 'san_xuat';
  tinhCat(d);
  canh.forEach((c) => d.canh_bao.push({ luc: bayGio(), noi_dung: c, xong: false }));
  ghiNK(d, ten_ai, 'Phiên bản ' + d.phien_ban + ': ' + [doi.length ? 'đổi ' + doi.join(', ') : '', them.length ? 'thêm ' + them.join(', ') : '', bo.length ? 'bỏ ' + bo.map((b) => b.ky_hieu).join(', ') : ''].filter(Boolean).join('; ') || 'không đổi thiết kế');
  kho.ghiDon(d);
  return { don: d, moi: false, canh_bao: canh, doi: doi, them: them, bo: bo.map((b) => b.ky_hieu) };
}

/** Các nút người này bấm được trên một bộ */
function nutBo(d, b, nguoi) {
  if (d.trang_thai !== 'san_xuat') return [];
  return CHUYEN.filter((c) => c[0] === b.tt && (co(nguoi, c[2]) || laQuanLy(nguoi))).map((c) => ({ toi: c[1], ten: c[3], ly_do: !!c[4] }));
}
function capNhatTrangThaiDon(d) {
  if (d.trang_thai === 'huy' || d.trang_thai === 'cho_duyet') return;
  d.trang_thai = d.bo.length && d.bo.every((b) => b.tt === 'da_lap') ? 'xong' : 'san_xuat';
}
/** Đổi bước của các bộ. ids = [] → mọi bộ đang ở bước "tu" (bấm cả đơn). */
function doiBo(d, ids, toi, nguoi, ly_do) {
  if (!TEN_BUOC[toi]) throw new Error('Bước không hợp lệ.');
  if (d.trang_thai !== 'san_xuat' && !(laQuanLy(nguoi) && d.trang_thai === 'xong')) throw new Error('Đơn đang "' + TT_DON[d.trang_thai] + '" — chưa đổi tiến độ được.');
  const chon = d.bo.filter((b) => ids.indexOf(b.id) >= 0);
  if (!chon.length) throw new Error('Chưa chọn bộ nào.');
  chon.forEach((b) => {
    const c = CHUYEN.filter((x) => x[0] === b.tt && x[1] === toi)[0];
    const duoc = laQuanLy(nguoi) || (c && co(nguoi, c[2]));
    if (!duoc) throw new Error('Bộ ' + b.ky_hieu + ' đang "' + TEN_BUOC[b.tt] + '" — anh/chị không có quyền chuyển sang "' + TEN_BUOC[toi] + '".');
    if (c && c[4] && !String(ly_do || '').trim()) throw new Error('Ghi lý do KCS không đạt.');
  });
  chon.forEach((b) => {
    const tu = b.tt;
    b.tt = toi; b.doi = false;
    if (tu === 'cho_kcs' && toi === 'lap_rap') b.loi_kcs = chu(ly_do, 300); else if (toi === 'cho_giao') b.loi_kcs = '';
  });
  ghiNK(d, tenAi(nguoi), chon.map((b) => b.ky_hieu).join(', ') + ' → ' + TEN_BUOC[toi] + (ly_do ? ' (' + chu(ly_do, 300) + ')' : ''));
  capNhatTrangThaiDon(d);
}
/** Máy cắt báo đã lấy file / cắt xong */
function doiCat(d, tt, ai) {
  if (!TT_CAT[tt]) throw new Error('Trạng thái máy cắt sai.');
  d.cat = { tt: tt, luc: bayGio() };
  if (tt === 'xong') d.bo.forEach((b) => { if (b.tt === 'cho_cat') { b.tt = 'da_cat'; b.doi = false; } });
  ghiNK(d, ai || 'Máy cắt', TT_CAT[tt]);
  capNhatTrangThaiDon(d);
}
function duyet(d, nguoi) {
  if (!co(nguoi, 'chu')) throw new Error('Chỉ Chủ duyệt đơn.');
  if (d.trang_thai !== 'cho_duyet') throw new Error('Đơn không ở trạng thái chờ duyệt.');
  d.trang_thai = 'san_xuat'; d.duyet = { ai: nguoi.ten, luc: bayGio() };
  ghiNK(d, nguoi.ten, 'Duyệt vào sản xuất');
}
function huy(d, nguoi, ly_do) {
  if (!co(nguoi, 'chu')) throw new Error('Chỉ Chủ huỷ đơn.');
  if (!String(ly_do || '').trim()) throw new Error('Ghi lý do huỷ.');
  d.trang_thai = 'huy';
  ghiNK(d, nguoi.ten, 'Huỷ đơn: ' + chu(ly_do, 300));
}
function moLai(d, nguoi) {
  if (!co(nguoi, 'chu') || d.trang_thai !== 'huy') throw new Error('Không mở lại được.');
  d.trang_thai = 'san_xuat'; capNhatTrangThaiDon(d);
  ghiNK(d, nguoi.ten, 'Mở lại đơn');
}
function doiThongTin(d, o, nguoi) {
  if (!co(nguoi, ['chu', 'dieu_phoi', 'kinh_doanh'])) throw new Error('Không có quyền sửa thông tin đơn.');
  const doi = [];
  if (o.ngay_hen !== undefined) { if (o.ngay_hen && !/^\d{4}-\d{2}-\d{2}$/.test(o.ngay_hen)) throw new Error('Ngày hẹn sai.'); if (o.ngay_hen !== d.ngay_hen) doi.push('ngày hẹn ' + (o.ngay_hen || 'bỏ trống')); d.ngay_hen = o.ngay_hen; }
  ['khach', 'cong_trinh', 'ghi_chu'].forEach((k) => { if (o[k] !== undefined && chu(o[k], 500) !== d[k]) { d[k] = chu(o[k], 500); doi.push(k.replace('_', ' ')); } });
  if (o.phu_trach !== undefined) { d.phu_trach = chu(o.phu_trach, 20); doi.push('người phụ trách'); }
  if (doi.length) ghiNK(d, nguoi.ten, 'Sửa ' + doi.join(', '));
}
function doiKinh(d, khoa, tt, nguoi) {
  if (!co(nguoi, ['chu', 'dieu_phoi', 'kho'])) throw new Error('Không có quyền cập nhật kính.');
  if (!TT_KINH[tt]) throw new Error('Trạng thái kính sai.');
  const ds = [].concat(khoa);
  ds.forEach((k) => { const m = String(k).match(/^(.+):(\d+)$/); const b = m && d.bo.filter((x) => x.id === m[1])[0]; if (!b || !b.boc_tach.kinh[Number(m[2])]) throw new Error('Không có tấm kính ' + k); d.kinh_tt[k] = tt; });
  ghiNK(d, nguoi.ten, ds.length + ' tấm kính → ' + TT_KINH[tt]);
}
function xongCanhBao(d, i, nguoi) {
  if (!laQuanLy(nguoi)) throw new Error('Chỉ điều phối / chủ xử lý cảnh báo.');
  const c = d.canh_bao[i]; if (!c) throw new Error('Không có cảnh báo này.');
  c.xong = true; c.ai = nguoi.ten;
  ghiNK(d, nguoi.ten, 'Đã xử lý: ' + c.noi_dung);
}

// ------------------------------------------------------------------ đọc ra cho từng người
const m2Bo = (b) => (b.rong * b.cao * (b.so_luong || 1)) / 1e6;
function tienDo(d) {
  const dem = {}; BUOC.forEach((x) => { dem[x.ma] = 0; });
  d.bo.forEach((b) => { dem[b.tt] = (dem[b.tt] || 0) + (b.so_luong || 1); });
  return dem;
}
function giaDon(d) {
  const ds = d.bo.filter((b) => b.gia);
  if (!ds.length) return null;
  const tong = ds.reduce((a, b) => a + b.gia.tong, 0);
  const von_ds = ds.filter((b) => b.gia.von !== null);
  const von = von_ds.length === ds.length ? von_ds.reduce((a, b) => a + b.gia.von, 0) : null;
  return { tong: Math.round(tong), von: von === null ? null : Math.round(von), lai: von === null ? null : Math.round(tong - von), du: ds.length === d.bo.length };
}
function tomTat(d, nguoi) {
  const hom_nay = ngayVN();
  const o = {
    ma: d.ma, ma_hd: d.ma_hd, ten: d.ten, cong_trinh: d.cong_trinh, khach: d.khach, luc: d.luc, ngay_hen: d.ngay_hen, phu_trach: d.phu_trach,
    trang_thai: d.trang_thai, ten_trang_thai: TT_DON[d.trang_thai], phien_ban: d.phien_ban, cat: d.cat, so_bo: d.bo.reduce((a, b) => a + (b.so_luong || 1), 0), so_dong_bo: d.bo.length,
    m2: Math.round(d.bo.reduce((a, b) => a + m2Bo(b), 0) * 100) / 100, so_dong: d.so_dong, so_cay: d.so_cay, tien_do: tienDo(d),
    tre: !!d.ngay_hen && d.ngay_hen < hom_nay && (d.trang_thai === 'san_xuat' || d.trang_thai === 'cho_duyet'),
    canh_bao: d.canh_bao.filter((c) => !c.xong).length,
  };
  if (xemGia(nguoi)) o.gia = giaDon(d);
  return o;
}
function chiTiet(d, nguoi) {
  const o = tomTat(d, nguoi);
  o.may = d.may; o.ghi_chu = d.ghi_chu; o.duyet = d.duyet || null; o.lich_ban = d.lich_ban; o.nhat_ky = d.nhat_ky.slice(-200).reverse();
  o.canh_bao_ds = d.canh_bao.map((c, i) => Object.assign({ i: i }, c));
  o.bo = d.bo.map((b) => {
    const x = { id: b.id, ky_hieu: b.ky_hieu, so_luong: b.so_luong, vi_tri: b.vi_tri, ghi_chu: b.ghi_chu, mo_ta: b.mo_ta, he_nhom: b.he_nhom, kinh: b.kinh, rong: b.rong, cao: b.cao, ma_don: b.ma_don, svg: b.svg,
      tt: b.tt, ten_tt: TEN_BUOC[b.tt], doi: !!b.doi, loi_kcs: b.loi_kcs || '', nut: nutBo(d, b, nguoi), boc_tach: b.boc_tach };
    if (xemGia(nguoi) && b.gia) x.gia = b.gia;
    return x;
  });
  o.kinh = [];
  d.bo.forEach((b) => b.boc_tach.kinh.forEach((k, i) => o.kinh.push(Object.assign({ khoa: b.id + ':' + i, ky_hieu: b.ky_hieu, tt: d.kinh_tt[b.id + ':' + i] || 'chua_dat' }, k))));
  const cat = M.dsCat(d.bo);
  o.cat_ds = cat;
  o.cay = M.toiUuCay(cat, d.may);
  o.quyen = { sua: co(nguoi, ['chu', 'dieu_phoi', 'kinh_doanh']), duyet: co(nguoi, 'chu') && d.trang_thai === 'cho_duyet', huy: co(nguoi, 'chu') && d.trang_thai !== 'huy', mo_lai: co(nguoi, 'chu') && d.trang_thai === 'huy', kinh: co(nguoi, ['chu', 'dieu_phoi', 'kho']), quan_ly: laQuanLy(nguoi), xem_gia: xemGia(nguoi) };
  return o;
}

/** Khối lượng nhôm: kg thành phẩm (đoạn cắt) và kg cây xuất ra (theo tối ưu) */
function kgNhom(d) {
  const cat = M.dsCat(d.bo);
  const kgm = {};
  cat.forEach((c) => { kgm[c.ma + '|' + c.mau] = c.kg_m || kgm[c.ma + '|' + c.mau] || 0; });
  const tp = cat.reduce((a, c) => a + (c.dai * c.sl * (c.kg_m || 0)) / 1000, 0);
  const cay = M.toiUuCay(cat, d.may).reduce((a, c) => a + (c.cay * (kgm[c.ma + '|' + c.mau] || 0)) / 1000, 0);
  return { tp: tp, cay: cay };
}
/** Báo cáo theo tháng (YYYY-MM, giờ VN theo ngày nhận đơn) */
function baoCao(ds, thang, nguoi) {
  const trong = ds.filter((d) => d.trang_thai !== 'huy' && ngayVN(d.luc).slice(0, 7) === thang);
  const r = { thang: thang, so_don: trong.length, so_bo: 0, m2: 0, kg_tp: 0, kg_cay: 0, tien_do: {}, don: [] };
  BUOC.forEach((b) => { r.tien_do[b.ma] = 0; });
  const xg = xemGia(nguoi);
  if (xg) { r.doanh_thu = 0; r.von = 0; r.lai = 0; r.thieu_gia = 0; }
  trong.forEach((d) => {
    const t = tomTat(d, nguoi), kg = kgNhom(d);
    r.so_bo += t.so_bo; r.m2 += t.m2; r.kg_tp += kg.tp; r.kg_cay += kg.cay;
    Object.keys(t.tien_do).forEach((k) => { r.tien_do[k] += t.tien_do[k]; });
    const dong = { ma: d.ma, ten: d.ten, trang_thai: t.ten_trang_thai, so_bo: t.so_bo, m2: t.m2, kg_tp: Math.round(kg.tp * 10) / 10, kg_cay: Math.round(kg.cay * 10) / 10, hao_hut: kg.cay ? Math.round((1 - kg.tp / kg.cay) * 1000) / 10 : null, tre: t.tre };
    if (xg) { const g = t.gia; dong.gia = g; if (g) { r.doanh_thu += g.tong; if (g.von !== null) { r.von += g.von; r.lai += g.lai; } } if (!g || !g.du || g.von === null) r.thieu_gia += 1; }
    r.don.push(dong);
  });
  r.m2 = Math.round(r.m2 * 100) / 100; r.kg_tp = Math.round(r.kg_tp * 10) / 10; r.kg_cay = Math.round(r.kg_cay * 10) / 10;
  r.hao_hut = r.kg_cay ? Math.round((1 - r.kg_tp / r.kg_cay) * 1000) / 10 : null;
  return r;
}
/** Việc của người này hôm nay: các bộ đang chờ đúng tổ của họ */
function viecCua(ds, nguoi) {
  const out = [];
  ds.forEach((d) => {
    if (d.trang_thai !== 'san_xuat') return;
    d.bo.forEach((b) => {
      const n = CHUYEN.filter((c) => c[0] === b.tt && co(nguoi, c[2]));
      if (n.length) out.push({ ma: d.ma, ten: d.ten, ngay_hen: d.ngay_hen, bo_id: b.id, ky_hieu: b.ky_hieu, so_luong: b.so_luong, mo_ta: b.mo_ta, tt: b.tt, ten_tt: TEN_BUOC[b.tt], nut: n.map((c) => ({ toi: c[1], ten: c[3], ly_do: !!c[4] })), loi_kcs: b.loi_kcs || '' });
    });
  });
  return out.sort((a, b) => (a.ngay_hen || '9999').localeCompare(b.ngay_hen || '9999'));
}

module.exports = { BUOC, TEN_BUOC, CHUYEN, TT_DON, TT_CAT, TT_KINH, lamSach, chuanDon, nhanDon, nutBo, doiBo, doiCat, duyet, huy, moLai, doiThongTin, doiKinh, xongCanhBao, tomTat, chiTiet, baoCao, viecCua, giaDon, kgNhom, ngayVN, co };
