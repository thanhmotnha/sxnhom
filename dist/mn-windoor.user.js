// ==UserScript==
// @name         Một Nhà · Vẽ cửa
// @namespace    motnha.vn
// @version      0.3.0
// @description  Vẽ cửa nhôm vào WindoorCraft từ kích thước và mẫu có sẵn
// @match        https://ln.windoorcraft.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
/* Một Nhà · Vẽ cửa v0.3.0 — tiện ích vẽ cửa nhôm trong WindoorCraft. */
// ===== src/mnwd-core.js =====
/* Một Nhà · Vẽ cửa — LÕI TÍNH TOÁN
 * Không phụ thuộc trình duyệt: chạy được trong Node (phép thử) và trong trang WindoorCraft.
 *
 * Quy ước toạ độ: gốc (0,0) ở góc TRÊN-TRÁI phủ bì khung, x sang phải, y xuống dưới, đơn vị mm.
 * Mọi số đo "ô trên / ô dưới / vách bên" tính tới TIM ĐỐ — trùng với số WindoorCraft ghi trên bản vẽ.
 */
(function (G) {
  'use strict';
  const M = G.MNWD = G.MNWD || {};
  M.PHIEN_BAN = '0.3.0';

  // ------------------------------------------------------------------ số
  /** Đọc số gõ kiểu Việt: "1600", "1.600", "1600,5", " 2 700 " */
  M.so = function (v, mac_dinh) {
    if (typeof v === 'number') return isFinite(v) ? v : (mac_dinh === undefined ? NaN : mac_dinh);
    if (v === null || v === undefined) return mac_dinh === undefined ? NaN : mac_dinh;
    let s = String(v).trim().replace(/\s|mm$/gi, '').replace(/mm$/i, '');
    if (s === '') return mac_dinh === undefined ? NaN : mac_dinh;
    if (s.indexOf(',') >= 0) {
      s = s.replace(/\./g, '').replace(',', '.'); // phẩy là thập phân, chấm là ngăn nghìn
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, ''); // 1.600 → 1600
    }
    const n = Number(s);
    return isFinite(n) ? n : (mac_dinh === undefined ? NaN : mac_dinh);
  };
  const so = M.so;
  const nguyen = (v, md, min, max) => {
    let n = Math.round(so(v, md));
    if (!isFinite(n)) n = md;
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    return n;
  };
  const duong = (v, md) => { const n = so(v, md); return isFinite(n) && n > 0 ? n : (md || 0); };
  const trong = (v, ds, md) => (ds.indexOf(v) >= 0 ? v : md);
  M.tron = function (v, buoc) {
    if (!buoc) return Math.round(v * 1000) / 1000;
    return Math.round(v / buoc) * buoc;
  };
  M.ghi = function (v) { // in số gọn: 1600 / 805.5
    const n = Math.round(v * 10) / 10;
    return (Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : String(n).replace('.', ','));
  };

  // ------------------------------------------------------------------ danh mục
  M.LOAI = { vach: 'Vách kính', cua_so: 'Cửa sổ', cua_di: 'Cửa đi' };
  M.KIEU = {
    fix: 'Kính cố định',
    quay: 'Mở quay 1 cánh',
    quay2: 'Mở quay 2 cánh',
    quay4: 'Mở quay 4 cánh (2 phụ + 2 chính)',
    hat: 'Mở hất',
    lua: 'Lùa',
    xep: 'Xếp trượt',
  };
  M.KIEU_CHINH = ['fix', 'quay', 'quay2', 'quay4', 'hat', 'lua', 'xep'];
  M.KIEU_PHU = ['fix', 'quay', 'hat'];
  M.KIEU_TREN = ['fix', 'hat'];

  /** Giới hạn cảnh báo — SỐ THAM KHẢO NGÀNH, xưởng chốt lại trong thẻ Cài đặt. */
  M.GIOI_HAN = {
    quay_so: { rong_min: 350, rong_max: 800, cao_min: 400, cao_max: 1600 },
    hat: { rong_min: 350, rong_max: 1000, cao_min: 350, cao_max: 1200 },
    quay_di: { rong_min: 500, rong_max: 1000, cao_min: 1800, cao_max: 2600 },
    lua: { rong_min: 450, rong_max: 1500, cao_min: 500, cao_max: 2800 },
    xep: { rong_min: 450, rong_max: 900, cao_min: 1800, cao_max: 2800 },
    fix: { dien_tich_max: 3.0 },
    khung: { dai_max: 5800 },
  };
  M.TEN_GIOI_HAN = {
    quay_so: 'Cánh cửa sổ mở quay', hat: 'Cánh mở hất', quay_di: 'Cánh cửa đi mở quay',
    lua: 'Cánh lùa', xep: 'Cánh xếp trượt', fix: 'Ô kính cố định', khung: 'Thanh khung',
  };

  M.CAI_DAT = {
    khe: { cua_so: { rong: 10, cao: 10 }, cua_di: { rong: 10, cao: 5 }, vach: { rong: 10, cao: 10 } },
    chia_deu: 'theo_pm', // 'theo_pm' | 'lot_long' | 'tim'
    // giá vốn của xưởng: nhom_kg > 0 → áp cho mọi thanh nhôm; theo_ma[mã] ghi đè; còn lại lấy giá vốn trong WindoorCraft
    gia_von: { nhom_kg: 0, theo_ma: {}, da_gap: {} },
    // chế độ nhân viên báo giá: khoá = ẩn giá vốn, lãi; ma = mã băm của PIN (khoá giao diện, không phải bảo mật thật)
    nhan_vien: { khoa: false, ma: '' },
    // sản xuất: cây nhôm, hao hụt; máy chủ nhận file cắt (máy cắt tự lấy về)
    san_xuat: { cay: 5800, hao_dau: 10, mach: 12, may_chu: 'https://sxnhom.motnha.vn', khoa_may: '' },
    bao_gia: { cong_ty: 'MỘT NHÀ DESIGN & BUILD', dia_chi: '105C Tô Hiệu, TP Sơn La', dien_thoai: '[điền số điện thoại]', vat: 0, ghi_chu: 'Đơn giá theo bảng giá hệ nhôm trong WindoorCraft, đã gồm nhôm, kính, phụ kiện, sản xuất và lắp đặt. Báo giá có hiệu lực 15 ngày.' },
    lam_tron: 1, // mm; 0 = không làm tròn
    gioi_han: M.GIOI_HAN,
    he_nhom_theo_mau: {}, // mã mẫu → id hệ nhôm đã dùng lần trước
    mau_rieng: [], // mẫu của xưởng
    kieu_so: 'phu_bi',
  };

  // ------------------------------------------------------------------ mẫu
  const mau = (ma, nhom, ten, rong, cao, ch) => ({ ma, nhom, ten, rong, cao, cau_hinh: ch || {} });
  M.MAU = [
    // --- Vách kính cố định
    mau('V1', 'vach', 'Vách kính 1 ô', 1200, 1400, { chinh: { kieu: 'fix', so: 1 } }),
    mau('V2', 'vach', 'Vách kính 2 ô', 2400, 1400, { chinh: { kieu: 'fix', so: 2 } }),
    mau('V3', 'vach', 'Vách kính 3 ô', 3600, 2400, { chinh: { kieu: 'fix', so: 3 } }),
    mau('V2T', 'vach', 'Vách kính 2 ô + ô trên', 2400, 2700, { chinh: { kieu: 'fix', so: 2 }, tren: { cao: 600, kieu: 'fix', so: 0 } }),
    // --- Cửa sổ mở quay
    mau('S1Q', 'cua_so', 'Cửa sổ 1 cánh mở quay', 700, 1400, { chinh: { kieu: 'quay', so: 1, huong: 'trai' } }),
    mau('S2Q', 'cua_so', 'Cửa sổ 2 cánh mở quay', 1200, 1400, { chinh: { kieu: 'quay2', so: 1 } }),
    mau('S2QT', 'cua_so', 'Cửa sổ 2 cánh mở quay + ô trên', 1200, 1800, { chinh: { kieu: 'quay2', so: 1 }, tren: { cao: 400, kieu: 'fix', so: 1 } }),
    mau('S4Q', 'cua_so', 'Cửa sổ 4 cánh mở quay (2 cặp)', 2400, 1400, { chinh: { kieu: 'quay2', so: 2 } }),
    mau('SQFQ', 'cua_so', 'Cửa sổ 2 cánh quay + fix giữa', 2000, 1400, { chinh: { kieu: 'fix', so: 1 }, trai: { rong: 600, kieu: 'quay' }, phai: { rong: 600, kieu: 'quay' } }),
    // --- Cửa sổ mở hất
    mau('S1H', 'cua_so', 'Cửa sổ 1 cánh mở hất', 700, 1000, { chinh: { kieu: 'hat', so: 1 } }),
    mau('S2H', 'cua_so', 'Cửa sổ 2 cánh mở hất', 1400, 1000, { chinh: { kieu: 'hat', so: 2 } }),
    mau('S1HD', 'cua_so', 'Cửa sổ mở hất + fix dưới', 700, 1600, { chinh: { kieu: 'hat', so: 1 }, duoi: { cao: 600, kieu: 'fix', so: 1 } }),
    // --- Cửa sổ lùa
    mau('S2L', 'cua_so', 'Cửa sổ lùa 2 cánh', 1400, 1200, { chinh: { kieu: 'lua', canh: 2 } }),
    mau('S3L', 'cua_so', 'Cửa sổ lùa 3 cánh', 2100, 1200, { chinh: { kieu: 'lua', canh: 3 } }),
    mau('S4L', 'cua_so', 'Cửa sổ lùa 4 cánh', 2800, 1400, { chinh: { kieu: 'lua', canh: 4 } }),
    mau('S2LT', 'cua_so', 'Cửa sổ lùa 2 cánh + ô trên', 1400, 1700, { chinh: { kieu: 'lua', canh: 2 }, tren: { cao: 400, kieu: 'fix', so: 1 } }),
    // --- Cửa đi mở quay
    mau('D1Q', 'cua_di', 'Cửa đi 1 cánh mở quay', 900, 2200, { chinh: { kieu: 'quay', so: 1, huong: 'trai' } }),
    mau('D1QT', 'cua_di', 'Cửa đi 1 cánh + ô thoáng', 900, 2700, { chinh: { kieu: 'quay', so: 1, huong: 'trai' }, tren: { cao: 500, kieu: 'fix', so: 1 } }),
    mau('D2Q', 'cua_di', 'Cửa đi 2 cánh mở quay', 1400, 2200, { chinh: { kieu: 'quay2', so: 1 } }),
    mau('D2QT', 'cua_di', 'Cửa đi 2 cánh + ô thoáng', 1400, 2700, { chinh: { kieu: 'quay2', so: 1 }, tren: { cao: 500, kieu: 'fix', so: 1 } }),
    mau('D2QF', 'cua_di', 'Cửa đi 2 cánh + 2 vách fix + ô thoáng', 2400, 2700, { chinh: { kieu: 'quay2', so: 1 }, tren: { cao: 500, kieu: 'fix', so: 1 }, trai: { rong: 500, kieu: 'fix' }, phai: { rong: 500, kieu: 'fix' } }),
    mau('D4Q', 'cua_di', 'Cửa đi 4 cánh mở quay', 2800, 2200, { chinh: { kieu: 'quay4', so: 1 } }),
    mau('D4QT', 'cua_di', 'Cửa đi 4 cánh mở quay + ô thoáng', 2800, 2700, { chinh: { kieu: 'quay4', so: 1 }, tren: { cao: 500, kieu: 'fix', so: 2 } }),
    // --- Cửa đi lùa
    mau('D2L', 'cua_di', 'Cửa đi lùa 2 cánh', 1800, 2200, { chinh: { kieu: 'lua', canh: 2 } }),
    mau('D3L', 'cua_di', 'Cửa đi lùa 3 cánh', 2700, 2200, { chinh: { kieu: 'lua', canh: 3 } }),
    mau('D4L', 'cua_di', 'Cửa đi lùa 4 cánh', 3200, 2400, { chinh: { kieu: 'lua', canh: 4 } }),
    mau('D4LT', 'cua_di', 'Cửa đi lùa 4 cánh + ô thoáng', 3200, 2800, { chinh: { kieu: 'lua', canh: 4 }, tren: { cao: 500, kieu: 'fix', so: 2 } }),
    // --- Xếp trượt
    mau('DX4', 'cua_di', 'Cửa xếp trượt 4 cánh (3+1)', 3200, 2400, { chinh: { kieu: 'xep', xep_trai: 3, xep_phai: 1 } }),
    mau('DX6', 'cua_di', 'Cửa xếp trượt 6 cánh (3+3)', 4800, 2400, { chinh: { kieu: 'xep', xep_trai: 3, xep_phai: 3 } }),
  ];
  M.NHOM_MAU = [
    { ma: 'cua_di', ten: 'Cửa đi' },
    { ma: 'cua_so', ten: 'Cửa sổ' },
    { ma: 'vach', ten: 'Vách kính' },
  ];
  /** Tìm mẫu theo mã (không phân biệt hoa thường), kể cả mẫu riêng của xưởng. */
  M.timMau = function (ma, mau_rieng) {
    if (!ma) return null;
    const k = String(ma).trim().toUpperCase();
    const ds = (mau_rieng || []).concat(M.MAU);
    for (let i = 0; i < ds.length; i++) if (String(ds[i].ma).toUpperCase() === k) return ds[i];
    return null;
  };

  // ------------------------------------------------------------------ chuẩn hoá cấu hình một bộ cửa
  const vung = (v, md) => {
    v = v || {};
    return {
      cao: Math.max(0, so(v.cao, md.cao || 0)) || 0,
      rong: Math.max(0, so(v.rong, md.rong || 0)) || 0,
      kieu: v.kieu || md.kieu || 'fix',
      so: nguyen(v.so, md.so === undefined ? 1 : md.so, 0, 12),
    };
  };
  /**
   * Chuẩn hoá cấu hình một bộ cửa. `v` có thể thiếu trường, số có thể là chữ gõ kiểu Việt.
   * `cai_dat` (tuỳ chọn) cấp khe hở mặc định cho ô chờ.
   */
  M.chuanHoa = function (v, cai_dat) {
    v = v || {};
    const cd = cai_dat || M.CAI_DAT;
    const loai = trong(v.loai, ['vach', 'cua_so', 'cua_di'], 'cua_so');
    const khe_md = (cd.khe && cd.khe[loai]) || { rong: 0, cao: 0 };
    const c = v.chinh || {};
    const m = {
      ky_hieu: String(v.ky_hieu === undefined || v.ky_hieu === null ? '' : v.ky_hieu).trim(),
      so_luong: nguyen(v.so_luong, 1, 1, 9999),
      vi_tri: String(v.vi_tri || '').trim(),
      ghi_chu: String(v.ghi_chu || '').trim(),
      ma_mau: String(v.ma_mau || '').trim(),
      ten: String(v.ten || '').trim(),
      loai: loai,
      rong: Math.max(0, so(v.rong, 0)) || 0,
      cao: Math.max(0, so(v.cao, 0)) || 0,
      kieu_so: trong(v.kieu_so, ['phu_bi', 'o_cho'], cd.kieu_so || 'phu_bi'),
      khe_rong: Math.max(0, so(v.khe_rong, khe_md.rong)) || 0,
      khe_cao: Math.max(0, so(v.khe_cao, khe_md.cao)) || 0,
      khung: trong(v.khung, ['tu_dong', '4_canh', '3_canh'], 'tu_dong'),
      tren: vung(v.tren, { cao: 0, kieu: 'fix', so: 1 }),
      duoi: vung(v.duoi, { cao: 0, kieu: 'fix', so: 1 }),
      trai: vung(v.trai, { rong: 0, kieu: 'fix', so: 1 }),
      phai: vung(v.phai, { rong: 0, kieu: 'fix', so: 1 }),
      chinh: {
        kieu: trong(c.kieu, M.KIEU_CHINH, 'fix'),
        so: nguyen(c.so, 1, 1, 12),
        huong: trong(c.huong, ['trai', 'phai', 'doi_xung'], 'doi_xung'),
        canh: nguyen(c.canh, 2, 1, 8),
        xep_trai: nguyen(c.xep_trai, 3, 0, 8),
        xep_phai: nguyen(c.xep_phai, 0, 0, 8),
        lua_kieu: (c.lua_kieu === null || c.lua_kieu === undefined || c.lua_kieu === '') ? null : nguyen(c.lua_kieu, 0, 0, 999),
      },
      mo: trong(v.mo, ['mac_dinh', 'ngoai', 'trong'], 'mac_dinh'),
      do_suot: trong(v.do_suot, ['ngang', 'dung'], 'ngang'),
      he_nhom: (v.he_nhom === null || v.he_nhom === undefined || v.he_nhom === '' || v.he_nhom === 0 || v.he_nhom === '0') ? null : (isFinite(Number(v.he_nhom)) ? Number(v.he_nhom) : null),
      he_nhom_ten: String(v.he_nhom_ten || ''),
      kinh: String(v.kinh === undefined || v.kinh === null ? '' : v.kinh).replace(/\s+/g, ' ').trim(), // tên loại kính trong WindoorCraft; rỗng = loại mặc định của hệ nhôm
      tu_do: v.tu_do ? M.chuanCay(v.tu_do) : null, // hình thái tự chia ô (cây); có thì dùng thay cho các vùng trên/dưới/trái/phải/chính
    };
    m.tren.kieu = trong(m.tren.kieu, M.KIEU_TREN, 'fix');
    m.duoi.kieu = 'fix';
    m.trai.kieu = trong(m.trai.kieu, M.KIEU_PHU, 'fix');
    m.phai.kieu = trong(m.phai.kieu, M.KIEU_PHU, 'fix');
    if (m.chinh.kieu === 'xep' && m.chinh.xep_trai + m.chinh.xep_phai < 2) { m.chinh.xep_trai = 3; m.chinh.xep_phai = 0; }
    return m;
  };

  /** Áp một mẫu vào cấu hình: giữ thông tin đơn (ký hiệu, SL…), thay cấu tạo. `giu_kt` = giữ rộng/cao đang nhập. */
  // ------------------------------------------------------------------ hình thái TỰ CHIA Ô (cây)
  /*
   * Một nút là MỘT trong hai dạng:
   *   ô lá  : {kieu:'fix'|'quay'|'quay2'|'quay4'|'hat'|'lua'|'xep', huong:'trai'|'phai', canh, lua_kieu, xep_trai, xep_phai}
   *   ô chia: {chia:'dung'|'ngang', phan:[{kt, n}, …]}  — kt = bề rộng (chia đứng) / bề cao (chia ngang) của phần, đo tới tim đố
   *           (phần sát khung đo tới mép ngoài khung); kt = 0 → chia đều phần còn lại.
   * Đố của ô cha vẽ trước nên chạy suốt; đố của ô con chỉ nằm trong ô con — đúng cách WindoorCraft chia ô.
   */
  M.KIEU_LA = ['fix', 'quay', 'quay2', 'quay4', 'hat', 'lua', 'xep'];
  M.chuanCay = function (n, sau) {
    sau = sau || 0;
    n = n || {};
    if (sau < 8 && (n.chia === 'dung' || n.chia === 'ngang') && Array.isArray(n.phan) && n.phan.length >= 2) {
      return { chia: n.chia, phan: n.phan.slice(0, 12).map((x) => ({ kt: Math.max(0, so((x || {}).kt, 0)) || 0, n: M.chuanCay((x || {}).n, sau + 1) })) };
    }
    const k = trong(n.kieu, M.KIEU_LA, 'fix');
    const la = { kieu: k };
    if (k === 'quay') la.huong = trong(n.huong, ['trai', 'phai'], 'trai');
    if (k === 'lua') { la.canh = nguyen(n.canh, 2, 1, 8); la.lua_kieu = (n.lua_kieu === null || n.lua_kieu === undefined || n.lua_kieu === '') ? null : nguyen(n.lua_kieu, 0, 0, 999); }
    if (k === 'xep') { la.xep_trai = nguyen(n.xep_trai, 3, 0, 8); la.xep_phai = nguyen(n.xep_phai, 0, 0, 8); }
    return la;
  };
  /** Lấy nút theo đường dẫn [i, j, …] (chỉ số phần ở mỗi tầng chia) */
  M.nutCay = function (cay, duong) {
    let n = cay;
    for (let i = 0; i < (duong || []).length; i++) { if (!n || !n.phan || !n.phan[duong[i]]) return null; n = n.phan[duong[i]].n; }
    return n;
  };
  /** Trả cây MỚI với nút tại `duong` thay bằng `moi` (cây cũ giữ nguyên) */
  M.thayNut = function (cay, duong, moi) {
    if (!duong || !duong.length) return M.chuanCay(moi);
    const c = JSON.parse(JSON.stringify(cay));
    let n = c;
    for (let i = 0; i < duong.length - 1; i++) n = n.phan[duong[i]].n;
    n.phan[duong[duong.length - 1]].n = moi;
    return M.chuanCay(c);
  };
  /** Chia ô lá tại `duong` thành k phần đều theo hướng `chia`; mỗi phần giữ kiểu của ô cũ */
  M.chiaO = function (cay, duong, chia, k) {
    const cu = M.nutCay(cay, duong) || { kieu: 'fix' };
    const la = cu.chia ? { kieu: 'fix' } : cu;
    const phan = [];
    for (let i = 0; i < Math.max(2, k); i++) phan.push({ kt: 0, n: JSON.parse(JSON.stringify(la)) });
    return M.thayNut(cay, duong, { chia: chia, phan: phan });
  };
  /** Gộp: ô cha của ô tại `duong` trở lại thành một ô lá (lấy kiểu của ô đang chọn) */
  M.gopO = function (cay, duong) {
    if (!duong || !duong.length) return M.chuanCay(cay);
    const la = M.nutCay(cay, duong);
    return M.thayNut(cay, duong.slice(0, -1), la && !la.chia ? la : { kieu: 'fix' });
  };
  /** Đổi hình thái theo vùng (mẫu) sang cây tự chia — giữ đúng bố cục đang có */
  M.sangCay = function (m) {
    const c = m.chinh;
    const la_chinh = (i, n) => {
      const la = { kieu: c.kieu };
      if (c.kieu === 'quay') la.huong = M.huongO(i, n, c.huong);
      if (c.kieu === 'lua') { la.canh = c.canh; la.lua_kieu = c.lua_kieu; }
      if (c.kieu === 'xep') { la.xep_trai = c.xep_trai; la.xep_phai = c.xep_phai; }
      return la;
    };
    const so_o = (c.kieu === 'lua' || c.kieu === 'xep' || c.kieu === 'quay4') ? 1 : c.so;
    const day = (n, taoLa) => { if (n <= 1) return taoLa(0, 1); const p = []; for (let i = 0; i < n; i++) p.push({ kt: 0, n: taoLa(i, n) }); return { chia: 'dung', phan: p }; };
    const laVung = (v, huong) => (i) => { const la = { kieu: v.kieu === 'quay' || v.kieu === 'hat' ? v.kieu : 'fix' }; if (la.kieu === 'quay') la.huong = huong; return la; };
    const ngang = (tren, giua, duoi) => {
      const p = [];
      if (tren) p.push({ kt: m.tren.cao, n: tren });
      p.push({ kt: 0, n: giua });
      if (duoi) p.push({ kt: m.duoi.cao, n: duoi });
      return p.length > 1 ? { chia: 'ngang', phan: p } : giua;
    };
    const dung = (trai, giua, phai) => {
      const p = [];
      if (trai) p.push({ kt: m.trai.rong, n: trai });
      p.push({ kt: 0, n: giua });
      if (phai) p.push({ kt: m.phai.rong, n: phai });
      return p.length > 1 ? { chia: 'dung', phan: p } : giua;
    };
    const trai = m.trai.rong > 0 ? laVung(m.trai, 'trai')(0) : null;
    const phai = m.phai.rong > 0 ? laVung(m.phai, 'phai')(0) : null;
    const chinh = day(so_o, la_chinh);
    let cay;
    if (m.do_suot === 'ngang') {
      // ô trên/dưới chia theo đố dưới (so = 0) → chia cùng các phần như hàng giữa để đố thẳng hàng
      const hang = (v) => {
        if (!(v.cao > 0 ? (v === m.tren ? m.tren.cao : m.duoi.cao) : 0)) return null;
        const la = { kieu: v.kieu === 'hat' ? 'hat' : 'fix' };
        if (v.so === 0) {
          const p = [];
          if (trai) p.push({ kt: m.trai.rong, n: { kieu: la.kieu } });
          for (let i = 0; i < so_o; i++) p.push({ kt: 0, n: { kieu: la.kieu } });
          if (phai) p.push({ kt: m.phai.rong, n: { kieu: la.kieu } });
          return p.length > 1 ? { chia: 'dung', phan: p } : la;
        }
        return day(v.so, () => ({ kieu: la.kieu }));
      };
      cay = ngang(hang(m.tren), dung(trai, chinh, phai), hang(m.duoi));
    } else {
      const giua = ngang(m.tren.cao > 0 ? day(m.tren.so || so_o, () => ({ kieu: m.tren.kieu === 'hat' ? 'hat' : 'fix' })) : null, chinh, m.duoi.cao > 0 ? day(m.duoi.so || so_o, () => ({ kieu: 'fix' })) : null);
      cay = dung(trai, giua, phai);
    }
    return M.chuanCay(cay);
  };
  /** Các ô lá theo thứ tự đọc (trái → phải, trên → dưới theo cây) kèm đường dẫn */
  M.laCay = function (cay) {
    const out = [];
    const di = (n, d) => { if (n.chia) n.phan.forEach((x, i) => di(x.n, d.concat([i]))); else out.push({ n: n, duong: d }); };
    if (cay) di(cay, []);
    return out;
  };

  M.apMau = function (hien_tai, mau_, cai_dat, giu_kt) {
    const h = hien_tai || {};
    const ch = JSON.parse(JSON.stringify(mau_.cau_hinh || {}));
    const v = {
      ky_hieu: h.ky_hieu, so_luong: h.so_luong, vi_tri: h.vi_tri, ghi_chu: h.ghi_chu,
      kieu_so: h.kieu_so, he_nhom: h.he_nhom, he_nhom_ten: h.he_nhom_ten, kinh: h.kinh,
      ma_mau: mau_.ma, ten: mau_.ten, loai: mau_.nhom,
      rong: giu_kt && h.rong ? h.rong : mau_.rong,
      cao: giu_kt && h.cao ? h.cao : mau_.cao,
      tren: ch.tren, duoi: ch.duoi, trai: ch.trai, phai: ch.phai, chinh: ch.chinh,
      mo: ch.mo, do_suot: ch.do_suot, khung: ch.khung, tu_do: ch.tu_do || null,
    };
    return M.chuanHoa(v, cai_dat);
  };

  // ------------------------------------------------------------------ tính bố cục
  /** Hướng bản lề của ô thứ i trong n ô mở quay. 'doi_xung' = từng cặp quay vào nhau: T P T P… */
  M.huongO = function (i, n, h) {
    if (h === 'trai' || h === 'phai') return h;
    if (n === 1) return 'trai';
    return i % 2 === 0 ? 'trai' : 'phai';
  };

  /**
   * Tính bố cục: khung, danh sách đố (theo đúng thứ tự phải vẽ) và danh sách ô.
   * `bd` = bề mặt biên dạng {khung, do} (mm) của hệ nhôm; thiếu thì coi như 0 (chia theo tim).
   * `tuy` = {chia_deu:'lot_long'|'tim', lam_tron:number, gioi_han}
   */
  M.tinh = function (m, bd, tuy) {
    const loi = [], canh_bao = [];
    bd = bd || {}; tuy = tuy || {};
    const kh = Math.max(0, so(bd.khung, 0)) || 0;
    const dn = Math.max(0, so(bd.do, 0)) || 0;
    const buoc = tuy.lam_tron === undefined ? 1 : Math.max(0, so(tuy.lam_tron, 1));
    const deu = tuy.chia_deu === 'lot_long' ? 'lot_long' : 'tim';
    const tron = (v) => M.tron(v, buoc);

    let W = m.rong, H = m.cao;
    if (m.kieu_so === 'o_cho') { W -= m.khe_rong; H -= m.khe_cao; }
    if (!(m.rong > 0)) loi.push('Chưa nhập chiều rộng.');
    if (!(m.cao > 0)) loi.push('Chưa nhập chiều cao.');
    if (m.rong > 0 && m.cao > 0 && !(W >= 200 && H >= 200)) loi.push('Kích thước khung sau khi trừ khe còn ' + M.ghi(W) + ' × ' + M.ghi(H) + ' — quá nhỏ.');

    const la_cay = m.tu_do ? M.laCay(m.tu_do) : null;
    const mo_quay = la_cay ? la_cay.some((x) => ['quay', 'quay2', 'quay4'].indexOf(x.n.kieu) >= 0) : ['quay', 'quay2', 'quay4'].indexOf(m.chinh.kieu) >= 0;
    const khung = m.khung === 'tu_dong' ? (m.loai === 'cua_di' && mo_quay ? '3_canh' : '4_canh') : m.khung;
    const ke_hoach = {
      rong: W, cao: H, khung: khung, loai: m.loai, la_cua_di: m.loai === 'cua_di',
      do: [], o: [], loi: loi, canh_bao: canh_bao, bd: { khung: kh, do: dn },
      chia_deu: deu, mo: m.mo, he_nhom: m.he_nhom, kinh: m.kinh || '',
    };
    if (loi.length) return ke_hoach;

    // nút = một ô chữ nhật giới hạn bởi cạnh khung ('k'), tim đố ('d') hoặc cạnh hở ('o' — đáy khung 3 cạnh)
    const lui = (b) => (b === 'k' ? kh : b === 'd' ? dn / 2 : 0);
    const nut = (x0, y0, x1, y1, b) => ({ x0: x0, y0: y0, x1: x1, y1: y1, b: b });
    const long = (n) => ({ x0: n.x0 + lui(n.b.l), y0: n.y0 + lui(n.b.t), x1: n.x1 - lui(n.b.r), y1: n.y1 - lui(n.b.d) });
    const TOI_THIEU = 60; // lọt lòng tối thiểu mỗi bên một đố
    const goc = nut(0, 0, W, H, { l: 'k', t: 'k', r: 'k', d: khung === '3_canh' ? 'o' : 'k' });

    const cat = (n, huong, tim, ten) => {
      const L = long(n);
      if (huong === 'ngang') {
        if (!(tim - dn / 2 - L.y0 >= TOI_THIEU && L.y1 - (tim + dn / 2) >= TOI_THIEU)) {
          loi.push((ten || 'Đố ngang') + ' ở ' + M.ghi(tim) + ' không nằm lọt trong ô cao ' + M.ghi(n.y1 - n.y0) + '.');
          return null;
        }
        ke_hoach.do.push({ huong: 'ngang', tim: tim, tam: { x: (L.x0 + L.x1) / 2, y: tim }, a0: L.x0, a1: L.x1, ten: ten || '' });
        return [nut(n.x0, n.y0, n.x1, tim, { l: n.b.l, t: n.b.t, r: n.b.r, d: 'd' }), nut(n.x0, tim, n.x1, n.y1, { l: n.b.l, t: 'd', r: n.b.r, d: n.b.d })];
      }
      if (!(tim - dn / 2 - L.x0 >= TOI_THIEU && L.x1 - (tim + dn / 2) >= TOI_THIEU)) {
        loi.push((ten || 'Đố đứng') + ' ở ' + M.ghi(tim) + ' không nằm lọt trong ô rộng ' + M.ghi(n.x1 - n.x0) + '.');
        return null;
      }
      ke_hoach.do.push({ huong: 'dung', tim: tim, tam: { x: tim, y: (L.y0 + L.y1) / 2 }, a0: L.y0, a1: L.y1, ten: ten || '' });
      return [nut(n.x0, n.y0, tim, n.y1, { l: n.b.l, t: n.b.t, r: 'd', d: n.b.d }), nut(tim, n.y0, n.x1, n.y1, { l: 'd', t: n.b.t, r: n.b.r, d: n.b.d })];
    };
    /** Các tim đố chia nút thành k ô đều nhau theo phương ngang */
    const timDeu = (n, k) => {
      const out = [];
      if (k <= 1) return out;
      if (deu === 'lot_long') {
        const L = long(n);
        const o = (L.x1 - L.x0 - (k - 1) * dn) / k;
        for (let i = 1; i < k; i++) out.push(tron(L.x0 + i * o + (i - 0.5) * dn));
      } else {
        for (let i = 1; i < k; i++) out.push(tron(n.x0 + (i * (n.x1 - n.x0)) / k));
      }
      return out;
    };
    /** Cắt nút bằng các đố đứng tại `ds_tim` (tăng dần) → mảng nút từ trái sang phải */
    const catNhieu = (n, ds_tim, ten) => {
      const out = [];
      let con = n;
      for (let i = 0; i < ds_tim.length; i++) {
        const r = cat(con, 'dung', ds_tim[i], ten);
        if (!r) return null;
        out.push(r[0]); con = r[1];
      }
      out.push(con);
      return out;
    };

    const la = [];
    const them = (n, ten_vung, chi_so, kieu, them_) => {
      const L = long(n);
      const o = {
        vung: ten_vung, chi_so: chi_so, kieu: kieu,
        x0: n.x0, y0: n.y0, x1: n.x1, y1: n.y1,
        lx0: L.x0, ly0: L.y0, lx1: L.x1, ly1: L.y1,
        rong: L.x1 - L.x0, cao: L.y1 - L.y0,
        tam: { x: (L.x0 + L.x1) / 2, y: (L.y0 + L.y1) / 2 },
        cua_di: false,
      };
      if (them_) for (const k in them_) o[k] = them_[k];
      la.push(o);
      return o;
    };

    if (m.tu_do) return M._tinhCay(m, ke_hoach, goc, { cat: cat, them: them, la: la, long: long, tron: tron, deu: deu, dn: dn, W: W, H: H, khung: khung, tuy: tuy });

    const co_tren = m.tren.cao > 0, co_duoi = m.duoi.cao > 0, co_trai = m.trai.rong > 0, co_phai = m.phai.rong > 0;
    if (co_tren && co_duoi && m.tren.cao + m.duoi.cao > H - 300) loi.push('Ô trên + ô dưới = ' + M.ghi(m.tren.cao + m.duoi.cao) + ', không còn chỗ cho phần chính (khung cao ' + M.ghi(H) + ').');
    if (co_trai && co_phai && m.trai.rong + m.phai.rong > W - 300) loi.push('Vách trái + vách phải = ' + M.ghi(m.trai.rong + m.phai.rong) + ', không còn chỗ cho phần chính (khung rộng ' + M.ghi(W) + ').');
    if (loi.length) return ke_hoach;

    let n_tren = null, n_duoi = null, n_trai = null, n_phai = null, n_chinh = null;
    if (m.do_suot === 'ngang') {
      let giua = goc;
      if (co_tren) { const r = cat(giua, 'ngang', m.tren.cao, 'Đố ngang ô trên'); if (r) { n_tren = r[0]; giua = r[1]; } }
      if (co_duoi && !loi.length) { const r = cat(giua, 'ngang', H - m.duoi.cao, 'Đố ngang ô dưới'); if (r) { giua = r[0]; n_duoi = r[1]; } }
      n_chinh = giua;
      if (co_trai && !loi.length) { const r = cat(n_chinh, 'dung', m.trai.rong, 'Đố đứng vách trái'); if (r) { n_trai = r[0]; n_chinh = r[1]; } }
      if (co_phai && !loi.length) { const r = cat(n_chinh, 'dung', W - m.phai.rong, 'Đố đứng vách phải'); if (r) { n_chinh = r[0]; n_phai = r[1]; } }
    } else {
      let giua = goc;
      if (co_trai) { const r = cat(giua, 'dung', m.trai.rong, 'Đố đứng vách trái'); if (r) { n_trai = r[0]; giua = r[1]; } }
      if (co_phai && !loi.length) { const r = cat(giua, 'dung', W - m.phai.rong, 'Đố đứng vách phải'); if (r) { giua = r[0]; n_phai = r[1]; } }
      n_chinh = giua;
      if (co_tren && !loi.length) { const r = cat(n_chinh, 'ngang', m.tren.cao, 'Đố ngang ô trên'); if (r) { n_tren = r[0]; n_chinh = r[1]; } }
      if (co_duoi && !loi.length) { const r = cat(n_chinh, 'ngang', H - m.duoi.cao, 'Đố ngang ô dưới'); if (r) { n_chinh = r[0]; n_duoi = r[1]; } }
    }
    if (loi.length) return ke_hoach;

    // phần chính: chia `so` ô đều
    const kieu_chinh = m.chinh.kieu;
    const so_o = (kieu_chinh === 'lua' || kieu_chinh === 'xep' || kieu_chinh === 'quay4') ? 1 : m.chinh.so;
    if (so_o !== m.chinh.so) canh_bao.push('Phần chính kiểu "' + M.KIEU[kieu_chinh] + '" chỉ vẽ 1 ô (bỏ qua số ô = ' + m.chinh.so + ').');
    const tim_chinh = timDeu(n_chinh, so_o);
    const o_chinh = catNhieu(n_chinh, tim_chinh, 'Đố đứng phần chính');
    if (!o_chinh) return ke_hoach;
    // ô trên / ô dưới: so = 0 → chia theo các đố đứng bên dưới (thẳng hàng)
    const chiaBang = (n, v, ten_vung, ten_do) => {
      if (!n) return;
      let ds;
      if (v.so === 0) {
        ds = [];
        if (m.do_suot === 'ngang') {
          if (co_trai) ds.push(m.trai.rong);
          for (let i = 0; i < tim_chinh.length; i++) ds.push(tim_chinh[i]);
          if (co_phai) ds.push(W - m.phai.rong);
        } else {
          for (let i = 0; i < tim_chinh.length; i++) ds.push(tim_chinh[i]);
        }
      } else {
        ds = timDeu(n, v.so);
      }
      const os = catNhieu(n, ds, ten_do);
      if (!os) return;
      for (let i = 0; i < os.length; i++) them(os[i], ten_vung, i, v.kieu, v.kieu === 'hat' ? { huong: 'tren' } : null);
    };

    // thứ tự ô: trên → trái → chính → phải → dưới (chỉ để đọc cho dễ; vẽ không phụ thuộc thứ tự)
    chiaBang(n_tren, m.tren, 'tren', 'Đố đứng ô trên');
    if (n_trai) them(n_trai, 'trai', 0, m.trai.kieu, { huong: m.trai.kieu === 'hat' ? 'tren' : 'trai', cua_di: m.loai === 'cua_di' && m.trai.kieu === 'quay' });
    for (let i = 0; i < o_chinh.length; i++) {
      const t = { cua_di: m.loai === 'cua_di' && kieu_chinh !== 'fix' && kieu_chinh !== 'hat' };
      if (kieu_chinh === 'quay') t.huong = M.huongO(i, o_chinh.length, m.chinh.huong);
      if (kieu_chinh === 'hat') t.huong = 'tren';
      if (kieu_chinh === 'lua') { t.canh = m.chinh.canh; t.lua_kieu = m.chinh.lua_kieu; }
      if (kieu_chinh === 'xep') { t.xep_trai = m.chinh.xep_trai; t.xep_phai = m.chinh.xep_phai; }
      them(o_chinh[i], 'chinh', i, kieu_chinh, t);
    }
    if (n_phai) them(n_phai, 'phai', 0, m.phai.kieu, { huong: m.phai.kieu === 'hat' ? 'tren' : 'phai', cua_di: m.loai === 'cua_di' && m.phai.kieu === 'quay' });
    chiaBang(n_duoi, m.duoi, 'duoi', 'Đố đứng ô dưới');
    if (loi.length) return ke_hoach;
    ke_hoach.o = la;

    // ---- thống kê
    let so_canh = 0;
    const dem = {};
    for (let i = 0; i < la.length; i++) {
      const o = la[i];
      dem[o.kieu] = (dem[o.kieu] || 0) + 1;
      so_canh += M.soCanh(o);
    }
    ke_hoach.thong_ke = {
      so_o: la.length, so_canh: so_canh, theo_kieu: dem,
      do_ngang: ke_hoach.do.filter((d) => d.huong === 'ngang').length,
      do_dung: ke_hoach.do.filter((d) => d.huong === 'dung').length,
    };

    // ---- cảnh báo nghiệp vụ
    if (khung === '3_canh' && co_duoi) canh_bao.push('Khung 3 cạnh (không có thanh dưới) nhưng lại có ô dưới — kiểm tra lại, thường phải dùng khung 4 cạnh.');
    if (m.loai === 'cua_di' && khung === '3_canh' && (co_trai || co_phai)) canh_bao.push('Khung 3 cạnh: vách bên cũng không có thanh khung dưới. Nếu vách ngồi trên thanh dưới thì chọn Khung = 4 cạnh.');
    if (m.loai !== 'cua_di' && mo_quay && !co_duoi) {
      const cao_canh = Math.max.apply(null, la.filter((o) => o.vung === 'chinh').map((o) => o.cao));
      if (cao_canh > 1900) canh_bao.push('Cánh mở quay cao khoảng ' + M.ghi(Math.round(cao_canh)) + ' mà Loại đang là "' + M.LOAI[m.loai] + '" — nếu là cửa đi thì đổi Loại = Cửa đi để có bản lề, tay nắm cửa đi.');
    }
    M.kiemTra(ke_hoach, tuy.gioi_han || M.GIOI_HAN);
    return ke_hoach;
  };

  /** Bố cục cho hình thái tự chia ô — dùng chung các hàm cắt / thêm ô của M.tinh */
  M._tinhCay = function (m, ke_hoach, goc, c) {
    const loi = ke_hoach.loi, canh_bao = ke_hoach.canh_bao;
    let stt = 0;
    const di = (n, nut, duong, ten) => {
      if (loi.length) return;
      if (!n.chia) {
        const t = { duong: duong, cua_di: m.loai === 'cua_di' && ['quay', 'quay2', 'quay4', 'lua', 'xep'].indexOf(n.kieu) >= 0 };
        if (n.kieu === 'quay') t.huong = n.huong || 'trai';
        if (n.kieu === 'hat') t.huong = 'tren';
        if (n.kieu === 'lua') { t.canh = n.canh || 2; t.lua_kieu = n.lua_kieu === undefined ? null : n.lua_kieu; }
        if (n.kieu === 'xep') { t.xep_trai = n.xep_trai; t.xep_phai = n.xep_phai; }
        c.them(nut, 'o', stt++, n.kieu, t);
        return;
      }
      const dung = n.chia === 'dung';
      const a = dung ? nut.x0 : nut.y0, b = dung ? nut.x1 : nut.y1, dai = b - a;
      const co_dinh = n.phan.reduce((s, x) => s + (x.kt > 0 ? x.kt : 0), 0);
      const so_tu_do = n.phan.filter((x) => !(x.kt > 0)).length;
      const ten_o = ten || 'ô';
      if (so_tu_do === 0 && Math.abs(co_dinh - dai) > 0.5) { loi.push('Các phần của ' + ten_o + ' cộng lại ' + M.ghi(co_dinh) + ', khác ' + (dung ? 'bề rộng ' : 'bề cao ') + M.ghi(dai) + ' — để trống một phần cho tự tính.'); return; }
      if (so_tu_do > 0 && dai - co_dinh < so_tu_do * 150) { loi.push('Các phần nhập sẵn của ' + ten_o + ' là ' + M.ghi(co_dinh) + ', không còn đủ chỗ cho ' + so_tu_do + ' phần chia đều trong ' + M.ghi(dai) + '.'); return; }
      const deu_ = so_tu_do > 0 ? (dai - co_dinh) / so_tu_do : 0;
      const tims = [];
      let x = a;
      for (let i = 0; i < n.phan.length - 1; i++) {
        x += n.phan[i].kt > 0 ? n.phan[i].kt : deu_;
        tims.push(n.phan[i].kt > 0 ? x : c.tron(x));
      }
      // chia đều kiểu lọt lòng: chỉ khi mọi phần đều tự chia
      if (c.deu === 'lot_long' && so_tu_do === n.phan.length) {
        const L = c.long(nut);
        const l0 = dung ? L.x0 : L.y0, l1 = dung ? L.x1 : L.y1, k = n.phan.length;
        const o = (l1 - l0 - (k - 1) * c.dn) / k;
        for (let i = 1; i < k; i++) tims[i - 1] = c.tron(l0 + i * o + (i - 0.5) * c.dn);
      }
      const con = [];
      let du = nut;
      for (let i = 0; i < tims.length; i++) {
        const r = c.cat(du, n.chia, tims[i], (dung ? 'Đố đứng' : 'Đố ngang') + ' trong ' + ten_o);
        if (!r) return;
        con.push(r[0]); du = r[1];
      }
      con.push(du);
      for (let i = 0; i < con.length; i++) di(n.phan[i].n, con[i], duong.concat([i]), (ten ? ten + ' › ' : '') + 'phần ' + (i + 1));
    };
    di(m.tu_do, goc, [], '');
    if (loi.length) return ke_hoach;
    ke_hoach.o = c.la;
    M._thongKe(ke_hoach);
    if (c.khung === '3_canh' && c.la.some((o) => o.y1 >= c.H - 0.5 && o.kieu === 'fix')) canh_bao.push('Khung 3 cạnh (không có thanh dưới) nhưng hàng dưới cùng có ô kính cố định — nếu ô đó ngồi trên thanh dưới thì chọn Khung = 4 cạnh.');
    M.kiemTra(ke_hoach, c.tuy.gioi_han || M.GIOI_HAN);
    return ke_hoach;
  };
  M._thongKe = function (ke_hoach) {
    let so_canh = 0;
    const dem = {};
    ke_hoach.o.forEach((o) => { dem[o.kieu] = (dem[o.kieu] || 0) + 1; so_canh += M.soCanh(o); });
    ke_hoach.thong_ke = { so_o: ke_hoach.o.length, so_canh: so_canh, theo_kieu: dem, do_ngang: ke_hoach.do.filter((d) => d.huong === 'ngang').length, do_dung: ke_hoach.do.filter((d) => d.huong === 'dung').length };
    return ke_hoach;
  };

  /** Số cánh chuyển động trong một ô */
  M.soCanh = function (o) {
    switch (o.kieu) {
      case 'quay': case 'hat': return 1;
      case 'quay2': return 2;
      case 'quay4': return 4;
      case 'lua': return o.canh || 2;
      case 'xep': return (o.xep_trai || 0) + (o.xep_phai || 0);
      default: return 0;
    }
  };

  /** Soát kích thước cánh / ô theo bảng giới hạn; thêm vào ke_hoach.canh_bao */
  M.kiemTra = function (kh, gh) {
    gh = gh || M.GIOI_HAN;
    const cb = kh.canh_bao;
    const ten_vung = { tren: 'ô trên', duoi: 'ô dưới', trai: 'vách trái', phai: 'vách phải', chinh: 'phần chính', o: 'ô' };
    const soat = (nhan, g, rong, cao) => {
      if (!g) return;
      if (g.rong_max && rong > g.rong_max + 0.5) cb.push(nhan + ' rộng khoảng ' + M.ghi(Math.round(rong)) + ' > ' + g.rong_max + ' (giới hạn đang đặt).');
      if (g.rong_min && rong < g.rong_min - 0.5) cb.push(nhan + ' rộng khoảng ' + M.ghi(Math.round(rong)) + ' < ' + g.rong_min + ' — khó lắp phụ kiện.');
      if (g.cao_max && cao > g.cao_max + 0.5) cb.push(nhan + ' cao khoảng ' + M.ghi(Math.round(cao)) + ' > ' + g.cao_max + ' (giới hạn đang đặt).');
      if (g.cao_min && cao < g.cao_min - 0.5) cb.push(nhan + ' cao khoảng ' + M.ghi(Math.round(cao)) + ' < ' + g.cao_min + '.');
    };
    if (gh.khung && gh.khung.dai_max) {
      if (kh.rong > gh.khung.dai_max) cb.push('Khung rộng ' + M.ghi(kh.rong) + ' vượt chiều dài cây nhôm ' + gh.khung.dai_max + ' — phải nối khung hoặc tách bộ.');
      if (kh.cao > gh.khung.dai_max) cb.push('Khung cao ' + M.ghi(kh.cao) + ' vượt chiều dài cây nhôm ' + gh.khung.dai_max + ' — phải nối khung hoặc tách bộ.');
    }
    for (let i = 0; i < kh.o.length; i++) {
      const o = kh.o[i];
      const cho = o.vung === 'o' ? 'ô ' + (o.chi_so + 1) : ten_vung[o.vung] + (kh.o.filter((x) => x.vung === o.vung).length > 1 ? ' ô ' + (o.chi_so + 1) : '');
      const n = M.soCanh(o);
      if (o.kieu === 'fix') {
        const dt = (o.rong * o.cao) / 1e6;
        if (gh.fix && gh.fix.dien_tich_max && dt > gh.fix.dien_tich_max + 1e-9) cb.push('Kính cố định ' + cho + ' khoảng ' + (Math.round(dt * 100) / 100).toString().replace('.', ',') + ' m² > ' + String(gh.fix.dien_tich_max).replace('.', ',') + ' m² — xem lại độ dày kính hoặc chia thêm ô.');
      } else if (o.kieu === 'hat') {
        soat('Cánh hất ' + cho, gh.hat, o.rong, o.cao);
      } else if (o.kieu === 'quay' || o.kieu === 'quay2' || o.kieu === 'quay4') {
        soat((o.cua_di ? 'Cánh cửa đi ' : 'Cánh mở quay ') + cho, o.cua_di ? gh.quay_di : gh.quay_so, o.rong / n, o.cao);
      } else if (o.kieu === 'lua') {
        soat('Cánh lùa ' + cho, gh.lua, o.rong / n, o.cao);
      } else if (o.kieu === 'xep') {
        soat('Cánh xếp trượt ' + cho, gh.xep, o.rong / n, o.cao);
      }
    }
    return kh;
  };

  // ------------------------------------------------------------------ mô tả bằng chữ
  M.moTa = function (m) {
    if (m.tu_do) {
      const ds = M.laCay(m.tu_do), dem = {};
      ds.forEach((x) => { const t = M.KIEU[x.n.kieu] || x.n.kieu; dem[t] = (dem[t] || 0) + 1; });
      return M.LOAI[m.loai] + ' tự chia ' + ds.length + ' ô (' + Object.keys(dem).map((k) => dem[k] + ' ' + k.toLowerCase()).join(', ') + ')';
    }
    const c = m.chinh;
    let s;
    switch (c.kieu) {
      case 'fix': s = c.so > 1 ? 'kính cố định ' + c.so + ' ô' : 'kính cố định'; break;
      case 'quay': s = c.so > 1 ? c.so + ' ô mở quay' : 'mở quay 1 cánh (lề ' + (M.huongO(0, 1, c.huong) === 'trai' ? 'trái' : 'phải') + ')'; break;
      case 'quay2': s = c.so > 1 ? c.so + ' cặp cánh mở quay' : 'mở quay 2 cánh'; break;
      case 'quay4': s = 'mở quay 4 cánh'; break;
      case 'hat': s = c.so > 1 ? c.so + ' cánh mở hất' : 'mở hất 1 cánh'; break;
      case 'lua': s = 'lùa ' + c.canh + ' cánh'; break;
      case 'xep': s = 'xếp trượt ' + c.xep_trai + '+' + c.xep_phai; break;
      default: s = c.kieu;
    }
    const p = [];
    if (m.tren.cao > 0) p.push((m.loai === 'cua_di' ? 'ô thoáng ' : 'ô trên ') + M.ghi(m.tren.cao) + (m.tren.kieu === 'hat' ? ' (hất)' : ''));
    if (m.duoi.cao > 0) p.push('ô dưới ' + M.ghi(m.duoi.cao));
    if (m.trai.rong > 0) p.push('vách trái ' + M.ghi(m.trai.rong) + (m.trai.kieu !== 'fix' ? ' (' + (m.trai.kieu === 'quay' ? 'quay' : 'hất') + ')' : ''));
    if (m.phai.rong > 0) p.push('vách phải ' + M.ghi(m.phai.rong) + (m.phai.kieu !== 'fix' ? ' (' + (m.phai.kieu === 'quay' ? 'quay' : 'hất') + ')' : ''));
    return M.LOAI[m.loai] + ' ' + s + (p.length ? ' + ' + p.join(' + ') : '');
  };

  // ------------------------------------------------------------------ đọc bảng dán từ Excel
  const bo_dau = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  M.boDau = bo_dau;
  const COT = [
    { k: 'ky_hieu', re: /^(ky hieu|kh|ma cua|ten cua|stt cua|so hieu|window|ky hieu cua)$/ },
    { k: 'ma_mau', re: /^(mau|ma mau|kieu|kieu cua|loai cua|loai)$/ },
    { k: 'rong', re: /^(rong|r|w|chieu rong|ngang|rong \(mm\)|width)$/ },
    { k: 'cao', re: /^(cao|c|h|chieu cao|cao \(mm\)|height)$/ },
    { k: 'so_luong', re: /^(sl|so luong|so bo|bo|qty|so luong \(bo\))$/ },
    { k: 'tren', re: /^(o thoang|o tren|thoang|fix tren|cao o thoang)$/ },
    { k: 'vi_tri', re: /^(vi tri|vi tri lap|phong|tang|khu vuc)$/ },
    { k: 'ghi_chu', re: /^(ghi chu|note|chu thich)$/ },
    { k: 'kinh', re: /^(kinh|loai kinh|kinh loai|glass)$/ },
  ];
  /**
   * Đọc chữ dán từ Excel / Google Sheets (cột cách nhau bằng TAB, hoặc ; hoặc ,).
   * Có dòng tiêu đề thì dò cột theo tên; không có thì hiểu theo thứ tự:
   * Ký hiệu | Mẫu | Rộng | Cao | SL | Ô thoáng | Vị trí | Ghi chú | Kính
   * Trả {dong:[{...}], bo_qua:[{so_dong, ly_do, chu}]}
   */
  M.docBang = function (chu, mau_rieng) {
    const out = { dong: [], bo_qua: [] };
    const ds = String(chu || '').replace(/\r/g, '').split('\n').map((d) => d.replace(/\s+$/, '')).filter((d) => d.trim() !== '');
    if (!ds.length) return out;
    const dau = ds[0].indexOf('\t') >= 0 ? '\t' : ds[0].indexOf(';') >= 0 ? ';' : ds[0].indexOf('|') >= 0 ? '|' : ',';
    const tach = (d) => d.split(dau).map((c) => c.trim());
    let thu_tu = ['ky_hieu', 'ma_mau', 'rong', 'cao', 'so_luong', 'tren', 'vi_tri', 'ghi_chu', 'kinh'];
    let bat_dau = 0;
    const o0 = tach(ds[0]).map(bo_dau);
    const khop = o0.map((t) => { for (let i = 0; i < COT.length; i++) if (COT[i].re.test(t)) return COT[i].k; return null; });
    if (khop.filter(Boolean).length >= 2) { thu_tu = khop; bat_dau = 1; }
    for (let i = bat_dau; i < ds.length; i++) {
      const o = tach(ds[i]);
      const r = {};
      for (let j = 0; j < thu_tu.length && j < o.length; j++) if (thu_tu[j]) r[thu_tu[j]] = o[j];
      const rong = so(r.rong), cao = so(r.cao);
      if (!(rong > 0 && cao > 0)) { out.bo_qua.push({ so_dong: i + 1, ly_do: 'thiếu rộng hoặc cao', chu: ds[i] }); continue; }
      const d = { ky_hieu: r.ky_hieu || '', rong: rong, cao: cao, so_luong: r.so_luong ? so(r.so_luong, 1) : 1, vi_tri: r.vi_tri || '', ghi_chu: r.ghi_chu || '', kinh: (r.kinh || '').replace(/\s+/g, ' ').trim(), ma_mau: (r.ma_mau || '').toUpperCase() };
      const mm = M.timMau(d.ma_mau, mau_rieng) || M.doanMau(r.ma_mau, mau_rieng);
      if (mm) { d.ma_mau = mm.ma; d.mau = mm; } else { d.can_chon_mau = true; d.mau_goc = r.ma_mau || ''; }
      const tr = so(r.tren);
      if (tr > 0) d.tren_cao = tr;
      out.dong.push(d);
    }
    return out;
  };
  /** Đoán mẫu từ chữ mô tả tự do: "cửa đi 2 cánh mở quay", "sổ lùa 4 cánh"… Không chắc thì trả null. */
  M.doanMau = function (chu, mau_rieng) {
    const t = bo_dau(chu);
    if (!t) return null;
    const ds = (mau_rieng || []).concat(M.MAU);
    for (let i = 0; i < ds.length; i++) if (bo_dau(ds[i].ten) === t) return ds[i];
    const di = /cua di|\bdi\b|^d\d/.test(t), so_ = /cua so|\bso\b|^s\d/.test(t), vach = /vach|fix|co dinh/.test(t);
    const n = (t.match(/(\d+)\s*canh/) || [])[1];
    const thoang = /thoang|o tren|fix tren/.test(t);
    let ma = null;
    if (/xep/.test(t)) ma = n === '6' ? 'DX6' : 'DX4';
    else if (/lua|truot/.test(t)) ma = di ? (n === '4' ? (thoang ? 'D4LT' : 'D4L') : n === '3' ? 'D3L' : 'D2L') : (n === '4' ? 'S4L' : n === '3' ? 'S3L' : (thoang ? 'S2LT' : 'S2L'));
    else if (/hat/.test(t)) ma = n === '2' ? 'S2H' : 'S1H';
    else if (/quay|mo/.test(t)) {
      if (di) ma = n === '4' ? (thoang ? 'D4QT' : 'D4Q') : n === '2' ? (thoang ? 'D2QT' : 'D2Q') : n === '1' ? (thoang ? 'D1QT' : 'D1Q') : null;
      else if (so_) ma = n === '4' ? 'S4Q' : n === '2' ? (thoang ? 'S2QT' : 'S2Q') : n === '1' ? 'S1Q' : null;
    } else if (vach && !di && !so_) ma = 'V1';
    return ma ? M.timMau(ma, mau_rieng) : null;
  };

  /** Xuất danh sách ra CSV (UTF-8 BOM, ; phân cách — Excel tiếng Việt mở thẳng được) */
  M.xuatCsv = function (ds, gv, an_von) {
    const cot = ['Ký hiệu', 'Mẫu', 'Tên mẫu', 'Rộng', 'Cao', 'SL', 'Ô thoáng', 'Vị trí', 'Ghi chú', 'Kính', 'Trạng thái', 'Diện tích (m²)', 'Thành tiền'].concat(an_von ? [] : ['Giá vốn', 'Lãi']);
    const q = (s) => { s = String(s === undefined || s === null ? '' : s); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const dong = [cot.join(';')];
    (ds || []).forEach((d) => {
      const m = d.cau_hinh || {};
      dong.push([m.ky_hieu, m.ma_mau, m.ten, m.rong, m.cao, m.so_luong, (m.tren && m.tren.cao) || '', m.vi_tri, m.ghi_chu, m.kinh || '', M.TEN_TRANG_THAI[d.trang_thai] || '', d.gia ? String(d.gia.dien_tich).replace('.', ',') : '', d.gia ? Math.round(d.gia.tong) : ''].concat(an_von ? [] : (() => { const l = M.laiBo(d.gia, gv); return l ? [l.von, l.lai] : ['', '']; })()).map(q).join(';'));
    });
    return '﻿' + dong.join('\r\n') + '\r\n';
  };
  /** Băm mã PIN (FNV-1a, có muối) — chỉ để so khớp khi mở khoá giao diện */
  M.bamPin = function (pin) {
    let h = 0x811c9dc5;
    const s = 'mnwd|' + String(pin || '').trim();
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  };
  /** Cài đặt + danh sách bỏ hết số giá vốn — dùng khi xuất sao lưu ở chế độ nhân viên */
  M.boGiaVon = function (cd, ds) {
    const c = JSON.parse(JSON.stringify(cd || {}));
    if (c.gia_von) { c.gia_von.nhom_kg = 0; c.gia_von.theo_ma = {}; Object.keys(c.gia_von.da_gap || {}).forEach((k) => { c.gia_von.da_gap[k].gia_wc = 0; }); }
    const d = JSON.parse(JSON.stringify(ds || []));
    d.forEach((x) => { if (x.gia) x.gia.von = []; });
    return { cai_dat: c, danh_sach: d };
  };
  M.TEN_TRANG_THAI = { cho: 'Chưa vẽ', da_ve: 'Đã vẽ', da_luu: 'Đã lưu', loi: 'Lỗi' };

  /** Gộp cài đặt đã lưu với mặc định (thêm trường mới khi nâng bản) */
  M.gopCaiDat = function (luu) {
    const md = JSON.parse(JSON.stringify(M.CAI_DAT));
    if (!luu || typeof luu !== 'object') return md;
    const gop = (a, b) => {
      for (const k in b) {
        if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) gop(a[k], b[k]);
        else if (b[k] !== undefined) a[k] = b[k];
      }
      return a;
    };
    return gop(md, luu);
  };

  // ------------------------------------------------------------------ BÁO GIÁ
  M.TEN_LOAI_VON = { profile: 'Nhôm', glass: 'Kính', addon: 'Phụ kiện / khác', hardware: 'Phụ kiện khoá', poly: 'Kính đa hình' };
  M.DVT_LOAI_VON = { profile: 'đ/kg', glass: 'đ/m²' };
  /** Đơn giá vốn của một dòng bóc tách theo bảng của xưởng */
  M.giaVonDong = function (x, gv) {
    gv = gv || {};
    const tm = gv.theo_ma || {};
    if (tm[x.ma] !== undefined && tm[x.ma] !== null && tm[x.ma] !== '' && Number(tm[x.ma]) >= 0) return { gia: Number(tm[x.ma]), nguon: 'mã' };
    if (x.loai === 'profile' && Number(gv.nhom_kg) > 0) return { gia: Number(gv.nhom_kg), nguon: 'nhôm chung' };
    return { gia: x.gia_wc, nguon: 'WindoorCraft' };
  };
  /** Giá vốn + lãi của một bộ (đã tính giá). Trả null nếu chưa có số bóc tách. */
  M.laiBo = function (gia, gv) {
    if (!gia || !Array.isArray(gia.von) || !gia.von.length) return null;
    let von = 0;
    const theo_loai = {};
    gia.von.forEach((x) => {
      const gd = M.giaVonDong(x, gv);
      const t = gd.nguon === 'WindoorCraft' && Number(x.tien_wc) > 0 ? Number(x.tien_wc) : x.sl * gd.gia; // giữ đúng tiền WindoorCraft tính khi không đổi giá
      von += t;
      theo_loai[x.loai] = (theo_loai[x.loai] || 0) + t;
    });
    von = Math.round(von);
    const lai = Math.round(gia.tong - von);
    return { ban: Math.round(gia.tong), von: von, lai: lai, pt: gia.tong > 0 ? Math.round((lai / gia.tong) * 1000) / 10 : 0, theo_loai: theo_loai, kg_nhom: Math.round(gia.von.filter((x) => x.loai === 'profile').reduce((a, x) => a + x.sl, 0) * 100) / 100 };
  };
  /** Ghi nhớ các mã vật tư đã gặp (để hiện trong bảng giá vốn) */
  M.ghiMaDaGap = function (gv, von) {
    gv.da_gap = gv.da_gap || {};
    (von || []).forEach((x) => { if (x.ma) gv.da_gap[x.ma] = { ten: x.ten, loai: x.loai, gia_wc: x.gia_wc }; });
    return gv;
  };

  /** 9940300 → "9.940.300" */
  M.tien = function (v) { const n = Math.round(Number(v) || 0); return (n < 0 ? '-' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  /**
   * Bảng số liệu báo giá từ danh sách (chỉ các dòng đã có giá).
   * Trả {dong:[{stt, ky_hieu, mo_ta, he_nhom, kinh, rong, cao, sl, dien_tich, don_gia_m2, thanh_tien, cau_hinh}], tong, vat, tong_vat, thieu:[ky_hieu…]}
   */
  M.bangBaoGia = function (ds, bg) {
    bg = bg || M.CAI_DAT.bao_gia;
    const out = { dong: [], tong: 0, thieu: [] };
    (ds || []).forEach((d) => {
      const c = d.cau_hinh || {};
      if (!d.gia || !(d.gia.tong > 0)) { out.thieu.push(c.ky_hieu || '?'); return; }
      const dt = Number(d.gia.dien_tich) || 0;
      out.dong.push({ stt: out.dong.length + 1, ky_hieu: c.ky_hieu || '', mo_ta: M.moTa(M.chuanHoa(c)), he_nhom: d.gia.he_nhom || c.he_nhom_ten || '', kinh: d.gia.kinh || c.kinh || '', vi_tri: c.vi_tri || '', rong: c.rong, cao: c.cao, sl: d.gia.so_luong || c.so_luong || 1, dien_tich: dt, don_gia_m2: dt > 0 ? Math.round(d.gia.tong / dt) : 0, thanh_tien: Math.round(d.gia.tong), cau_hinh: c });
      out.tong += Math.round(d.gia.tong);
    });
    const vat = Math.max(0, Number(bg.vat) || 0);
    out.vat_pt = vat;
    out.vat = Math.round((out.tong * vat) / 100);
    out.tong_vat = out.tong + out.vat;
    out.dien_tich = Math.round(out.dong.reduce((a, x) => a + x.dien_tich, 0) * 100) / 100;
    return out;
  };
  /** Trang HTML báo giá in được (A4 dọc), có hình từng bộ cửa. `tt` = {khach, cong_trinh, ngay} */
  M.htmlBaoGia = function (ds, bg, tt) {
    bg = Object.assign({}, M.CAI_DAT.bao_gia, bg || {});
    tt = tt || {};
    const b = M.bangBaoGia(ds, bg);
    const e = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const so2 = (v) => String(Math.round(v * 100) / 100).replace('.', ',');
    const hinh = (c) => { try { const m = M.chuanHoa(c); return M.veSvg ? M.veSvg(M.tinh(m, { khung: 45, do: 38 }, { chia_deu: 'tim' }), { rong: 110, cao_max: 96, co_kt: false }) : ''; } catch (x) { return ''; } };
    const hang = b.dong.map((x) => '<tr><td class="c">' + x.stt + '</td><td class="c"><b>' + e(x.ky_hieu) + '</b>' + (x.vi_tri ? '<div class="nho">' + e(x.vi_tri) + '</div>' : '') + '</td><td class="h">' + hinh(x.cau_hinh) + '</td><td>' + e(x.mo_ta) + '<div class="nho">' + e(x.he_nhom) + (x.kinh ? ' · ' + e(x.kinh) : '') + '</div></td><td class="c">' + M.ghi(x.rong) + ' × ' + M.ghi(x.cao) + '</td><td class="c">' + x.sl + '</td><td class="r">' + so2(x.dien_tich) + '</td><td class="r">' + M.tien(x.don_gia_m2) + '</td><td class="r"><b>' + M.tien(x.thanh_tien) + '</b></td></tr>').join('');
    const ngay = tt.ngay || new Date().toLocaleDateString('vi-VN');
    return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo giá ' + e(tt.cong_trinh || tt.khach || '') + '</title><style>' +
      '@page{size:A4;margin:12mm}body{font:12.5px/1.45 "Segoe UI",Arial,sans-serif;color:#1c2733;margin:0;padding:18px}h1{font-size:22px;margin:14px 0 2px;color:#17365d;text-align:center;letter-spacing:.5px}' +
      '.dau{display:flex;justify-content:space-between;border-bottom:2px solid #17365d;padding-bottom:8px}.dau b{font-size:15px;color:#17365d}.nho{font-size:11px;color:#5b6a80}.tt{margin:10px 0 12px;display:grid;grid-template-columns:1fr 1fr;gap:3px 20px}' +
      'table{border-collapse:collapse;width:100%}th{background:#17365d;color:#fff;font-weight:600;padding:6px 5px;font-size:11.5px}td{border-bottom:1px solid #d4dbe5;padding:5px;vertical-align:middle}td.c{text-align:center}td.r{text-align:right;white-space:nowrap}td.h{width:116px;text-align:center}td.h svg{display:block;margin:auto}' +
      'tr{page-break-inside:avoid}.tong td{border:0;padding:4px 5px}.tong .r{font-size:13px}.ky{display:flex;justify-content:space-around;margin-top:34px;text-align:center}.ghi{margin-top:14px;font-size:11.5px;color:#33435a}.in{position:fixed;right:16px;top:12px}@media print{.in{display:none}body{padding:0}}' +
      '</style></head><body><button class="in" onclick="print()">In / lưu PDF</button>' +
      '<div class="dau"><div><b>' + e(bg.cong_ty) + '</b><div class="nho">' + e(bg.dia_chi) + ' · ĐT: ' + e(bg.dien_thoai) + '</div></div><div class="nho" style="text-align:right">Ngày ' + e(ngay) + '</div></div>' +
      '<h1>BÁO GIÁ CỬA NHÔM KÍNH</h1>' +
      '<div class="tt"><div>Khách hàng: <b>' + e(tt.khach || '……………………………') + '</b></div><div>Công trình: <b>' + e(tt.cong_trinh || '……………………………') + '</b></div><div>Số bộ: <b>' + b.dong.reduce((a, x) => a + x.sl, 0) + '</b></div><div>Tổng diện tích: <b>' + so2(b.dien_tich) + ' m²</b></div></div>' +
      '<table><thead><tr><th>STT</th><th>Ký hiệu</th><th>Hình</th><th>Mô tả</th><th>Rộng × Cao (mm)</th><th>SL</th><th>m²</th><th>Đơn giá/m²</th><th>Thành tiền (đ)</th></tr></thead><tbody>' + hang + '</tbody></table>' +
      '<table class="tong"><tr><td></td><td class="r" style="width:220px">Cộng:</td><td class="r" style="width:130px"><b>' + M.tien(b.tong) + '</b></td></tr>' +
      (b.vat_pt > 0 ? '<tr><td></td><td class="r">VAT ' + b.vat_pt + '%:</td><td class="r">' + M.tien(b.vat) + '</td></tr><tr><td></td><td class="r"><b>Tổng thanh toán:</b></td><td class="r"><b style="font-size:15px;color:#17365d">' + M.tien(b.tong_vat) + '</b></td></tr>' : '<tr><td></td><td class="r"><b>Tổng (chưa gồm VAT):</b></td><td class="r"><b style="font-size:15px;color:#17365d">' + M.tien(b.tong) + '</b></td></tr>') +
      '</table>' + (b.thieu.length ? '<div class="ghi" style="color:#8a2219">Chưa có giá: ' + e(b.thieu.join(', ')) + '</div>' : '') +
      '<div class="ghi">' + e(bg.ghi_chu) + '</div><div class="ky"><div><b>Khách hàng</b><div class="nho">(ký, ghi rõ họ tên)</div></div><div><b>' + e(bg.cong_ty) + '</b><div class="nho">(ký, ghi rõ họ tên)</div></div></div></body></html>';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ===== src/mnwd-preview.js =====
/* Một Nhà · Vẽ cửa — HÌNH XEM TRƯỚC (SVG)
 * Chỉ sinh chuỗi SVG từ kế hoạch M.tinh(); không đụng DOM nên thử được trong Node.
 * Quy ước nét mở: nét đứt = mở ra ngoài / theo mặc định hệ nhôm, nét liền = mở vào trong (giống WindoorCraft).
 */
(function (G) {
  'use strict';
  const M = G.MNWD = G.MNWD || {};
  const f = (v) => (Math.round(v * 100) / 100).toString();

  /**
   * @param kh  kế hoạch từ M.tinh
   * @param tuy {rong:px, cao_max:px, co_kt:boolean, mau:{...}}
   */
  M.veSvg = function (kh, tuy) {
    tuy = tuy || {};
    const co_kt = tuy.co_kt !== false;
    const RONG = tuy.rong || 360;
    const CAO_MAX = tuy.cao_max || 300;
    const le_t = co_kt ? 26 : 3, le_l = co_kt ? 30 : 3, le_r = co_kt ? 30 : 3, le_d = co_kt ? 28 : 3;
    const W = kh.rong, H = kh.cao;
    if (!(W > 0 && H > 0)) return '<svg xmlns="http://www.w3.org/2000/svg" width="' + RONG + '" height="60" viewBox="0 0 ' + RONG + ' 60"><text x="' + RONG / 2 + '" y="34" text-anchor="middle" font-size="12" fill="#8a94a3">Nhập rộng × cao để xem trước</text></svg>';
    const s = Math.min((RONG - le_l - le_r) / W, (CAO_MAX - le_t - le_d) / H);
    const w = W * s, h = H * s;
    const ox = le_l + (RONG - le_l - le_r - w) / 2, oy = le_t;
    const CAO = Math.ceil(oy + h + le_d);
    const X = (x) => f(ox + x * s), Y = (y) => f(oy + y * s);
    const mau_ = Object.assign({ khung: '#3d5a80', do_: '#3d5a80', kinh: '#dff3f8', canh: '#6b86a8', net: '#1c2b3a', kt: '#1b3a6b', loi: '#c0392b' }, tuy.mau || {});
    const kv = kh.bd && kh.bd.khung ? kh.bd.khung : 45; // bề mặt khung để vẽ
    const dv = kh.bd && kh.bd.do ? kh.bd.do : 38;
    const net = co_kt ? 1 : 0.7;
    const p = [];
    p.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + RONG + '" height="' + CAO + '" viewBox="0 0 ' + RONG + ' ' + CAO + '" font-family="system-ui,Segoe UI,Arial,sans-serif">');
    // nền kính toàn khung
    p.push('<rect x="' + X(0) + '" y="' + Y(0) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + mau_.kinh + '"/>');

    // ô + ký hiệu mở
    const dut = kh.mo === 'trong' ? '' : ' stroke-dasharray="' + (co_kt ? '4 3' : '2 2') + '"';
    const line = (x1, y1, x2, y2, them) => '<line x1="' + X(x1) + '" y1="' + Y(y1) + '" x2="' + X(x2) + '" y2="' + Y(y2) + '" stroke="' + mau_.net + '" stroke-width="' + net + '"' + (them || '') + '/>';
    const la = (x0, y0, x1, y1) => { // một lá cánh: viền cánh
      const c = Math.min(55, (x1 - x0) * 0.16, (y1 - y0) * 0.16);
      return '<rect x="' + X(x0) + '" y="' + Y(y0) + '" width="' + f((x1 - x0) * s) + '" height="' + f((y1 - y0) * s) + '" fill="' + mau_.canh + '" fill-opacity="0.35" stroke="' + mau_.net + '" stroke-width="' + net + '"/>' +
        '<rect x="' + X(x0 + c) + '" y="' + Y(y0 + c) + '" width="' + f((x1 - x0 - 2 * c) * s) + '" height="' + f((y1 - y0 - 2 * c) * s) + '" fill="' + mau_.kinh + '" stroke="' + mau_.net + '" stroke-width="' + net * 0.6 + '"/>';
    };
    const quay = (x0, y0, x1, y1, huong) => {
      const ym = (y0 + y1) / 2, xm = (x0 + x1) / 2;
      if (huong === 'trai') return line(x1, y0, x0, ym, dut) + line(x1, y1, x0, ym, dut);
      if (huong === 'phai') return line(x0, y0, x1, ym, dut) + line(x0, y1, x1, ym, dut);
      return line(x0, y1, xm, y0, dut) + line(x1, y1, xm, y0, dut); // 'tren' = hất
    };
    const mui = (x0, y0, x1, y1, chieu) => { // mũi tên lùa
      const ym = (y0 + y1) / 2, a = x0 + (x1 - x0) * 0.28, b = x1 - (x1 - x0) * 0.28, d = Math.min((x1 - x0) * 0.12, (y1 - y0) * 0.08);
      let t = line(a, ym, b, ym);
      if (chieu >= 0) t += line(b, ym, b - d, ym - d) + line(b, ym, b - d, ym + d);
      if (chieu <= 0) t += line(a, ym, a + d, ym - d) + line(a, ym, a + d, ym + d);
      return t;
    };
    for (let i = 0; i < kh.o.length; i++) {
      const o = kh.o[i];
      const x0 = o.lx0, y0 = o.ly0, x1 = o.lx1, y1 = o.ly1;
      if (o.kieu === 'fix') continue;
      if (o.kieu === 'quay' || o.kieu === 'hat') {
        p.push(la(x0, y0, x1, y1) + quay(x0, y0, x1, y1, o.kieu === 'hat' ? 'tren' : o.huong));
      } else if (o.kieu === 'quay2') {
        const xm = (x0 + x1) / 2;
        p.push(la(x0, y0, xm, y1) + quay(x0, y0, xm, y1, 'trai') + la(xm, y0, x1, y1) + quay(xm, y0, x1, y1, 'phai'));
      } else if (o.kieu === 'quay4') {
        const r = x1 - x0, a = x0 + r * 0.2, b = x0 + r * 0.5, c = x1 - r * 0.2;
        p.push(la(x0, y0, a, y1) + quay(x0, y0, a, y1, 'trai') + la(a, y0, b, y1) + quay(a, y0, b, y1, 'trai') + la(b, y0, c, y1) + quay(b, y0, c, y1, 'phai') + la(c, y0, x1, y1) + quay(c, y0, x1, y1, 'phai'));
      } else if (o.kieu === 'lua') {
        const n = Math.max(1, o.canh || 2), r = (x1 - x0) / n;
        for (let k = 0; k < n; k++) {
          const chieu = n === 1 ? 0 : (k < n / 2 - 0.5 ? 1 : k > n / 2 - 0.5 ? -1 : 0);
          p.push(la(x0 + k * r, y0, x0 + (k + 1) * r, y1) + mui(x0 + k * r, y0, x0 + (k + 1) * r, y1, chieu));
        }
      } else if (o.kieu === 'xep') {
        const l = o.xep_trai || 0, rr = o.xep_phai || 0, n = Math.max(1, l + rr), r = (x1 - x0) / n;
        for (let k = 0; k < n; k++) {
          const a = x0 + k * r, b = a + r;
          const trai = k < l;
          const le = trai ? (k % 2 === 0) : ((n - 1 - k) % 2 !== 0);
          p.push(la(a, y0, b, y1) + quay(a, y0, b, y1, le ? 'trai' : 'phai'));
        }
      }
    }
    // đố
    for (let i = 0; i < kh.do.length; i++) {
      const d = kh.do[i];
      if (d.huong === 'ngang') p.push('<rect x="' + X(d.a0) + '" y="' + Y(d.tim - dv / 2) + '" width="' + f((d.a1 - d.a0) * s) + '" height="' + f(Math.max(dv * s, 1.2)) + '" fill="' + mau_.do_ + '"/>');
      else p.push('<rect x="' + X(d.tim - dv / 2) + '" y="' + Y(d.a0) + '" width="' + f(Math.max(dv * s, 1.2)) + '" height="' + f((d.a1 - d.a0) * s) + '" fill="' + mau_.do_ + '"/>');
    }
    // khung
    const k = Math.max(kv, 1.6 / s);
    if (kh.khung === '3_canh') {
      p.push('<path d="M' + X(0) + ' ' + Y(0) + ' L' + X(W) + ' ' + Y(0) + ' L' + X(W) + ' ' + Y(H) + ' L' + X(W - k) + ' ' + Y(H) + ' L' + X(W - k) + ' ' + Y(k) + ' L' + X(k) + ' ' + Y(k) + ' L' + X(k) + ' ' + Y(H) + ' L' + X(0) + ' ' + Y(H) + ' Z" fill="' + mau_.khung + '"/>');
      p.push('<line x1="' + X(0) + '" y1="' + Y(H) + '" x2="' + X(W) + '" y2="' + Y(H) + '" stroke="' + mau_.net + '" stroke-width="' + net * 0.8 + '" stroke-dasharray="1.5 2.5"/>');
    } else {
      p.push('<path fill-rule="evenodd" d="M' + X(0) + ' ' + Y(0) + ' H' + X(W) + ' V' + Y(H) + ' H' + X(0) + ' Z M' + X(k) + ' ' + Y(k) + ' V' + Y(H - k) + ' H' + X(W - k) + ' V' + Y(k) + ' Z" fill="' + mau_.khung + '"/>');
    }
    // ô bấm được (chế độ tự chia ô) + ô đang chọn
    if (tuy.bam) {
      for (let i = 0; i < kh.o.length; i++) {
        const o = kh.o[i];
        p.push('<rect data-o="' + i + '" x="' + X(o.lx0) + '" y="' + Y(o.ly0) + '" width="' + f((o.lx1 - o.lx0) * s) + '" height="' + f((o.ly1 - o.ly0) * s) + '" fill="#000" fill-opacity="0" style="cursor:pointer"><title>Ô ' + (i + 1) + ' — bấm để chọn</title></rect>');
      }
    }
    if (tuy.chon !== undefined && tuy.chon !== null && kh.o[tuy.chon]) {
      const o = kh.o[tuy.chon];
      p.push('<rect x="' + X(o.lx0) + '" y="' + Y(o.ly0) + '" width="' + f((o.lx1 - o.lx0) * s) + '" height="' + f((o.ly1 - o.ly0) * s) + '" fill="#e67e22" fill-opacity="0.12" stroke="#e67e22" stroke-width="2.2" pointer-events="none"/>');
      p.push('<text x="' + f(ox + ((o.lx0 + o.lx1) / 2) * s) + '" y="' + f(oy + ((o.ly0 + o.ly1) / 2) * s + 4) + '" font-size="12" font-weight="700" fill="#b8570f" text-anchor="middle" pointer-events="none">' + (tuy.chon + 1) + '</text>');
    }
    // kích thước
    if (co_kt) {
      const chu = (x, y, t, xoay) => '<text x="' + f(x) + '" y="' + f(y) + '" font-size="11" fill="' + mau_.kt + '" text-anchor="middle"' + (xoay ? ' transform="rotate(-90 ' + f(x) + ' ' + f(y) + ')"' : '') + '>' + t + '</text>';
      const kt_ngang = (xa, xb, y, t, dam) => '<line x1="' + X(xa) + '" y1="' + f(y) + '" x2="' + X(xb) + '" y2="' + f(y) + '" stroke="' + mau_.kt + '" stroke-width="0.8"/>' +
        '<line x1="' + X(xa) + '" y1="' + f(y - 3) + '" x2="' + X(xa) + '" y2="' + f(y + 3) + '" stroke="' + mau_.kt + '" stroke-width="0.8"/>' +
        '<line x1="' + X(xb) + '" y1="' + f(y - 3) + '" x2="' + X(xb) + '" y2="' + f(y + 3) + '" stroke="' + mau_.kt + '" stroke-width="0.8"/>' +
        chu(ox + ((xa + xb) / 2) * s, y - 3.5, t).replace('<text ', '<text ' + (dam ? 'font-weight="600" ' : ''));
      const kt_dung = (ya, yb, x, t, dam) => '<line x1="' + f(x) + '" y1="' + Y(ya) + '" x2="' + f(x) + '" y2="' + Y(yb) + '" stroke="' + mau_.kt + '" stroke-width="0.8"/>' +
        '<line x1="' + f(x - 3) + '" y1="' + Y(ya) + '" x2="' + f(x + 3) + '" y2="' + Y(ya) + '" stroke="' + mau_.kt + '" stroke-width="0.8"/>' +
        '<line x1="' + f(x - 3) + '" y1="' + Y(yb) + '" x2="' + f(x + 3) + '" y2="' + Y(yb) + '" stroke="' + mau_.kt + '" stroke-width="0.8"/>' +
        chu(x - 3.5, oy + ((ya + yb) / 2) * s, t, true).replace('<text ', '<text ' + (dam ? 'font-weight="600" ' : ''));
      p.push(kt_ngang(0, W, oy - 9, M.ghi(W), true));
      p.push(kt_dung(0, H, ox - 12, M.ghi(H), true));
      // chuỗi kích thước theo các ô hàng giữa (dưới) và cột chính (phải)
      const tu_do = kh.o.some((o) => o.vung === 'o');
      const giua = kh.o.filter((o) => tu_do || o.vung === 'chinh' || o.vung === 'trai' || o.vung === 'phai');
      const xs = Array.from(new Set(giua.reduce((a, o) => a.concat([o.x0, o.x1]), []).map((v) => Math.round(v * 10) / 10))).sort((a, b) => a - b);
      if (xs.length > 2) {
        if (xs[0] > 0.5) xs.unshift(0);
        if (xs[xs.length - 1] < W - 0.5) xs.push(W);
        for (let i = 0; i + 1 < xs.length; i++) p.push(kt_ngang(xs[i], xs[i + 1], oy + h + 16, M.ghi(xs[i + 1] - xs[i])));
      }
      const cot = kh.o.filter((o) => tu_do || o.vung === 'chinh' || o.vung === 'tren' || o.vung === 'duoi');
      const ys = Array.from(new Set(cot.reduce((a, o) => a.concat([o.y0, o.y1]), []).map((v) => Math.round(v * 10) / 10))).sort((a, b) => a - b);
      if (ys.length > 2) {
        for (let i = 0; i + 1 < ys.length; i++) p.push(kt_dung(ys[i], ys[i + 1], ox + w + 22, M.ghi(ys[i + 1] - ys[i])));
      }
    }
    p.push('</svg>');
    return p.join('');
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ===== src/mnwd-sanxuat.js =====
/* Một Nhà · Vẽ cửa — SẢN XUẤT: danh sách cắt nhôm, tối ưu cây, file Excel (.xlsx), bản vẽ sản xuất tiếng Việt.
 * Thuần logic, không đụng DOM — dùng chung cho tiện ích (trình duyệt) và máy chủ nhận file cắt (Node).
 */
(function (G) {
  'use strict';
  const M = G.MNWD = G.MNWD || {};

  // ------------------------------------------------------------------ tên tiếng Việt
  M.TEN_THANH = {
    frame: 'Khung', mullion: 'Đố', sash: 'Cánh', fixedBead: 'Nẹp kính ô fix', sashBead: 'Nẹp kính cánh', mullionOnDouble: 'Đố động (cánh đôi)',
    sashTurningFrame: 'Khung đảo chiều', upTrack: 'Ray trên', downTrack: 'Ray dưới', sideTrack: 'Ray đứng', screen: 'Cánh lưới', bead: 'Nẹp',
    sashMullion: 'Đố cánh', interlock: 'Thanh khoá giữa', sideLock: 'Thanh khoá biên', upSash: 'Cánh trên', downSash: 'Cánh dưới', connector: 'Thanh nối', cornerJoiner: 'Nối góc',
  };
  M.TEN_KINH = { fixedGlass: 'Kính ô fix', sashGlass: 'Kính cánh', screenGlass: 'Lưới' };
  const HUONG = { up: 'trên', down: 'dưới', left: 'trái', right: 'phải' };
  /** "bk1:up bk3:down" → "trên, dưới"; "zt1:0" → "giữa" */
  M.viTriVN = function (p) {
    const ds = String(p || '').split(/\s+/).filter(Boolean).map((x) => { const h = x.split(':')[1]; return HUONG[h] || (h === '0' || /^\d+$/.test(h || '') ? 'giữa' : ''); }).filter(Boolean);
    return Array.from(new Set(ds)).join(', ');
  };
  M.tenThanh = function (t) { return M.TEN_THANH[t] || t || ''; };

  // ------------------------------------------------------------------ đọc bóc tách của WindoorCraft
  /** Kết quả scriptCalculation → bóc tách gọn: {nhom:[…], kinh:[…], pk:[…]} */
  M.gonBocTach = function (r) {
    r = r || {};
    const so = (v) => (isFinite(Number(v)) ? Number(v) : 0);
    return {
      nhom: (r.order_bar || []).filter((b) => so(b.length) > 0).map((b) => ({ ma: String(b.code || ''), ten: String(b.name || ''), mau: String(b.color || ''), dai: so(b.length), sl: so(b.count), goc1: String(b.angle_one || ''), goc2: String(b.angle_two || ''), loai: String(b.type || ''), vi_tri: String(b.position || ''), kg_m: so(b.meter_weight), toi_uu: b.is_optimize === undefined ? 1 : so(b.is_optimize) })),
      kinh: (r.order_glass || []).map((g) => ({ ten: String(g.name || ''), loai: String(g.specs || ''), rong: so(g.width), cao: so(g.height), sl: so(g.count), ky: String(g.serial || ''), kieu: String(g.type || '') })),
      pk: (r.order_addon || []).map((a) => ({ ma: String(a.code || ''), ten: String(a.name || ''), sl: so(a.count), dai: a.length === '' ? '' : so(a.length) })),
    };
  };

  // ------------------------------------------------------------------ danh sách cắt + tối ưu cây
  /** Gộp các đoạn cắt của nhiều bộ: [{ma, ten, mau, dai, sl, goc1, goc2, ky_hieu, vi_tri, loai}] */
  M.dsCat = function (bo) {
    const out = [];
    (bo || []).forEach((b) => (b.boc_tach && b.boc_tach.nhom || []).forEach((t) => out.push({ ma: t.ma, ten: t.ten, mau: t.mau, dai: t.dai, sl: t.sl, goc1: t.goc1, goc2: t.goc2, ky_hieu: b.ky_hieu || '', vi_tri: M.viTriVN(t.vi_tri), loai: M.tenThanh(t.loai), kg_m: t.kg_m, toi_uu: t.toi_uu })));
    out.sort((a, b) => (a.ma + '|' + a.mau).localeCompare(b.ma + '|' + b.mau) || b.dai - a.dai);
    return out;
  };
  /**
   * Xếp các đoạn vào cây nhôm (lớn trước, vừa thì xếp — First Fit Decreasing), theo từng mã + màu.
   * tuy = {cay: 5800, hao_dau: 10 (cắt bỏ mỗi đầu cây), mach: 12 (bề dày lưỡi cưa)}
   * Trả [{ma, ten, mau, cay, so_cay, doan:[{dai, ky_hieu}], du, dung_pt}]
   */
  M.toiUuCay = function (cat, tuy) {
    tuy = Object.assign({ cay: 5800, hao_dau: 10, mach: 12 }, tuy || {});
    const nhom = {};
    (cat || []).forEach((c) => { if (c.toi_uu === 0) return; const k = c.ma + '|' + c.mau; (nhom[k] = nhom[k] || { ma: c.ma, ten: c.ten, mau: c.mau, doan: [] }); for (let i = 0; i < c.sl; i++) nhom[k].doan.push({ dai: c.dai, ky_hieu: c.ky_hieu, goc: c.goc1 + '-' + c.goc2 }); });
    const out = [];
    Object.keys(nhom).sort().forEach((k) => {
      const g = nhom[k];
      const dung = tuy.cay - 2 * tuy.hao_dau;
      const cay = [];
      g.doan.sort((a, b) => b.dai - a.dai).forEach((d) => {
        if (d.dai > dung) { cay.push({ doan: [d], con: dung - d.dai, qua_dai: true }); return; }
        let c = cay.find((x) => !x.qua_dai && x.con >= d.dai + (x.doan.length ? tuy.mach : 0));
        if (!c) { c = { doan: [], con: dung }; cay.push(c); }
        c.con -= d.dai + (c.doan.length ? tuy.mach : 0);
        c.doan.push(d);
      });
      cay.forEach((c, i) => out.push({ ma: g.ma, ten: g.ten, mau: g.mau, cay: tuy.cay, so_cay: i + 1, doan: c.doan, du: Math.round(c.con * 10) / 10, dung_pt: Math.round(((tuy.cay - c.con - 2 * tuy.hao_dau) / tuy.cay) * 1000) / 10, qua_dai: !!c.qua_dai }));
    });
    return out;
  };

  // ------------------------------------------------------------------ Excel .xlsx (không cần thư viện)
  const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t.push(c >>> 0); } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const utf8 = (s) => (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Uint8Array.from(Buffer.from(s, 'utf8')));
  /** Nén ZIP kiểu "stored" (không nén) — đủ cho Excel đọc */
  M.zip = function (tep) {
    const phan = [], muc = [];
    let vt = 0;
    const u16 = (v) => [v & 255, (v >>> 8) & 255], u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    tep.forEach((f) => {
      const ten = utf8(f.ten), dl = typeof f.noi_dung === 'string' ? utf8(f.noi_dung) : f.noi_dung, c = crc32(dl);
      const dau = Uint8Array.from([].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(c), u32(dl.length), u32(dl.length), u16(ten.length), u16(0)));
      phan.push(dau, ten, dl);
      muc.push({ ten: ten, c: c, n: dl.length, vt: vt });
      vt += dau.length + ten.length + dl.length;
    });
    const bd = vt;
    muc.forEach((m) => {
      const d = Uint8Array.from([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(m.c), u32(m.n), u32(m.n), u16(m.ten.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(m.vt)));
      phan.push(d, m.ten); vt += d.length + m.ten.length;
    });
    phan.push(Uint8Array.from([].concat(u32(0x06054b50), u16(0), u16(0), u16(muc.length), u16(muc.length), u32(vt - bd), u32(bd), u16(0))));
    const tong = phan.reduce((a, p) => a + p.length, 0), out = new Uint8Array(tong);
    let o = 0; phan.forEach((p) => { out.set(p, o); o += p.length; });
    return out;
  };
  const xml = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const cot = (i) => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  /**
   * Tạo file .xlsx. trang = [{ten, dong:[[ô…]…], rong:[độ rộng cột…], dau: số dòng tiêu đề in đậm}]
   * Ô là số → kiểu số (Excel/máy cắt đọc được), còn lại là chữ.
   */
  M.xlsx = function (trang) {
    const ten_trang = trang.map((t, i) => xml(String(t.ten || 'Trang ' + (i + 1)).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)));
    const tep = [
      { ten: '[Content_Types].xml', noi_dung: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + trang.map((t, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>' },
      { ten: '_rels/.rels', noi_dung: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { ten: 'xl/workbook.xml', noi_dung: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + trang.map((t, i) => '<sheet name="' + ten_trang[i] + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>' },
      { ten: 'xl/_rels/workbook.xml.rels', noi_dung: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + trang.map((t, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') + '<Relationship Id="rId' + (trang.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { ten: 'xl/styles.xml', noi_dung: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' },
    ];
    trang.forEach((t, i) => {
      const dau = t.dau === undefined ? 1 : t.dau;
      const hang = (t.dong || []).map((d, r) => '<row r="' + (r + 1) + '">' + d.map((v, c) => {
        const ref = cot(c) + (r + 1), st = r < dau ? ' s="1"' : '';
        if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>';
        if (v === undefined || v === null || v === '') return '';
        return '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + xml(v) + '</t></is></c>';
      }).join('') + '</row>').join('');
      const rong = (t.rong || []).length ? '<cols>' + t.rong.map((w, c) => '<col min="' + (c + 1) + '" max="' + (c + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>' : '';
      tep.push({ ten: 'xl/worksheets/sheet' + (i + 1) + '.xml', noi_dung: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + (dau ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + dau + '" topLeftCell="A' + (dau + 1) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '') + rong + '<sheetData>' + hang + '</sheetData></worksheet>' });
    });
    return M.zip(tep);
  };

  /**
   * File Excel cắt nhôm cho một đơn: trang "Cat nhom" (máy cắt nhập), "Toi uu cay", "Kinh", "Phu kien".
   * bo = [{ky_hieu, so_luong, boc_tach}] ; tt = {don, cong_trinh, cay, hao_dau, mach}
   */
  M.trangCat = function (bo, tt) {
    tt = tt || {};
    const cat = M.dsCat(bo);
    const t1 = [['STT', 'Mã thanh', 'Tên thanh', 'Màu', 'Chiều dài cắt (mm)', 'Số lượng', 'Góc trái', 'Góc phải', 'Ký hiệu cửa', 'Vị trí', 'Loại thanh', 'Đơn hàng']];
    cat.forEach((c, i) => t1.push([i + 1, c.ma, c.ten, c.mau, c.dai, c.sl, Number(c.goc1) || c.goc1, Number(c.goc2) || c.goc2, c.ky_hieu, c.vi_tri, c.loai, tt.don || '']));
    const tu = M.toiUuCay(cat, { cay: tt.cay || 5800, hao_dau: tt.hao_dau === undefined ? 10 : tt.hao_dau, mach: tt.mach === undefined ? 12 : tt.mach });
    const t2 = [['Mã thanh', 'Tên thanh', 'Màu', 'Cây số', 'Dài cây', 'Các đoạn cắt (mm — ký hiệu cửa)', 'Dư (mm)', 'Sử dụng %']];
    tu.forEach((c) => t2.push([c.ma, c.ten, c.mau, c.so_cay, c.cay, c.doan.map((d) => d.dai + ' (' + d.ky_hieu + ')').join(' + ') + (c.qua_dai ? '  ⚠ dài hơn cây' : ''), c.du, c.dung_pt]));
    const tong_cay = {};
    tu.forEach((c) => { tong_cay[c.ma + ' ' + c.ten] = (tong_cay[c.ma + ' ' + c.ten] || 0) + 1; });
    t2.push([]); t2.push(['Tổng số cây cần lấy']);
    Object.keys(tong_cay).forEach((k) => t2.push([k, '', '', tong_cay[k], tt.cay || 5800]));
    const t3 = [['Ký hiệu cửa', 'Tên kính', 'Loại kính', 'Rộng (mm)', 'Cao (mm)', 'Số tấm', 'Vị trí', 'm²']];
    (bo || []).forEach((b) => (b.boc_tach && b.boc_tach.kinh || []).forEach((k) => t3.push([b.ky_hieu || '', k.ten, k.loai, k.rong, k.cao, k.sl, M.TEN_KINH[k.kieu] || k.kieu, Math.round(k.rong * k.cao * k.sl / 1e4) / 100])));
    const t4 = [['Ký hiệu cửa', 'Mã', 'Tên phụ kiện / vật tư', 'Số lượng']];
    (bo || []).forEach((b) => (b.boc_tach && b.boc_tach.pk || []).forEach((p) => t4.push([b.ky_hieu || '', p.ma, p.ten, p.sl])));
    return [
      { ten: 'Cat nhom', dong: t1, rong: [6, 14, 26, 10, 18, 10, 10, 10, 14, 14, 18, 16] },
      { ten: 'Toi uu cay', dong: t2, rong: [14, 26, 10, 8, 10, 70, 10, 10] },
      { ten: 'Kinh', dong: t3, rong: [14, 26, 18, 11, 11, 8, 14, 8] },
      { ten: 'Phu kien', dong: t4, rong: [14, 14, 34, 10] },
    ];
  };
  M.xlsxCat = function (bo, tt) { return M.xlsx(M.trangCat(bo, tt)); };

  // ------------------------------------------------------------------ bản vẽ sản xuất (HTML in A4)
  /** bo = [{ky_hieu, so_luong, vi_tri, ghi_chu, mo_ta, he_nhom, kinh, rong, cao, anh (dataURL), boc_tach}] */
  M.htmlBanVe = function (bo, tt) {
    tt = tt || {};
    const e = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const so = (v) => (typeof v === 'number' ? String(Math.round(v * 10) / 10).replace('.', ',') : e(v));
    const trang = (bo || []).map((b, i) => {
      const bt = b.boc_tach || { nhom: [], kinh: [], pk: [] };
      const nhom = bt.nhom.map((t, j) => '<tr><td>' + (j + 1) + '</td><td><b>' + e(t.ma) + '</b></td><td>' + e(t.ten) + '</td><td>' + e(M.tenThanh(t.loai)) + '</td><td class="r"><b>' + so(t.dai) + '</b></td><td class="c">' + t.sl + '</td><td class="c">' + e(t.goc1) + '° / ' + e(t.goc2) + '°</td><td>' + e(M.viTriVN(t.vi_tri)) + '</td></tr>').join('');
      const kinh = bt.kinh.map((k) => '<tr><td>' + e(k.ten) + '</td><td>' + e(k.loai) + '</td><td class="r">' + so(k.rong) + ' × ' + so(k.cao) + '</td><td class="c">' + k.sl + '</td><td>' + e(M.TEN_KINH[k.kieu] || k.kieu) + '</td></tr>').join('');
      const pk = bt.pk.map((p) => '<tr><td>' + e(p.ma) + '</td><td>' + e(p.ten) + '</td><td class="c">' + so(p.sl) + '</td></tr>').join('');
      return '<section class="trang"><div class="dau"><div><b>' + e(tt.cong_ty || 'MỘT NHÀ DESIGN & BUILD') + '</b> — BẢN VẼ SẢN XUẤT</div><div>Đơn: <b>' + e(tt.don || '') + '</b>' + (tt.cong_trinh ? ' · ' + e(tt.cong_trinh) : '') + ' · Trang ' + (i + 1) + '/' + bo.length + '</div></div>' +
        '<div class="tt"><div class="ky">' + e(b.ky_hieu || '') + '</div><div><b>' + e(b.mo_ta || '') + '</b><br>Hệ nhôm: ' + e(b.he_nhom || '') + (b.kinh ? ' · Kính: ' + e(b.kinh) : '') + '<br>Kích thước phủ bì: <b>' + so(b.rong) + ' × ' + so(b.cao) + ' mm</b> · Số bộ: <b>' + (b.so_luong || 1) + '</b>' + (b.vi_tri ? ' · Vị trí: ' + e(b.vi_tri) : '') + (b.ghi_chu ? '<br>Ghi chú: ' + e(b.ghi_chu) : '') + '</div></div>' +
        '<div class="hinh">' + (b.anh ? '<img src="' + b.anh + '">' : (b.svg || '<i>(chưa có hình)</i>')) + '</div>' +
        '<h3>Thanh nhôm (cho ' + (b.so_luong || 1) + ' bộ)</h3><table><thead><tr><th>#</th><th>Mã</th><th>Tên thanh</th><th>Loại</th><th>Dài cắt (mm)</th><th>SL</th><th>Góc cắt</th><th>Vị trí</th></tr></thead><tbody>' + nhom + '</tbody></table>' +
        '<div class="hai"><div><h3>Kính</h3><table><thead><tr><th>Tên</th><th>Loại</th><th>Rộng × Cao</th><th>SL</th><th>Vị trí</th></tr></thead><tbody>' + kinh + '</tbody></table></div>' +
        '<div><h3>Phụ kiện / vật tư</h3><table><thead><tr><th>Mã</th><th>Tên</th><th>SL</th></tr></thead><tbody>' + pk + '</tbody></table></div></div>' +
        '<div class="ky-ten"><div>Người lập</div><div>Tổ cắt</div><div>Tổ lắp</div><div>KCS</div></div></section>';
    }).join('');
    return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Bản vẽ sản xuất ' + e(tt.don || '') + '</title><style>' +
      '@page{size:A4;margin:10mm}body{font:11.5px/1.4 "Segoe UI",Arial,sans-serif;color:#1c2733;margin:0;padding:14px}.trang{page-break-after:always;max-width:190mm;margin:0 auto 24px}.trang:last-child{page-break-after:auto}' +
      '.dau{display:flex;justify-content:space-between;border-bottom:2px solid #17365d;padding-bottom:5px;color:#17365d}.tt{display:flex;gap:12px;align-items:center;margin:8px 0}.tt .ky{font-size:26px;font-weight:700;color:#17365d;border:2px solid #17365d;border-radius:6px;padding:4px 12px;min-width:60px;text-align:center}' +
      '.hinh{text-align:center;border:1px solid #d4dbe5;border-radius:6px;padding:4px;margin:6px 0}.hinh img{max-width:100%;max-height:115mm}h3{margin:10px 0 4px;font-size:12.5px;color:#17365d}table{border-collapse:collapse;width:100%}th{background:#dce6f1;font-weight:600;padding:4px;text-align:left;font-size:11px}td{border-bottom:1px solid #e3e8ef;padding:3px 4px}td.r{text-align:right}td.c{text-align:center}' +
      '.hai{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ky-ten{display:flex;justify-content:space-around;margin-top:22px;font-weight:600;text-align:center}.ky-ten div{min-width:90px;padding-bottom:36px}.in{position:fixed;right:14px;top:10px}@media print{.in{display:none}body{padding:0}}' +
      '</style></head><body><button class="in" onclick="print()">In / lưu PDF</button>' + trang + '</body></html>';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ===== src/mnwd-driver.js =====
/* Một Nhà · Vẽ cửa — ĐIỀU KHIỂN WINDOORCRAFT
 * Vẽ bằng chính lệnh gốc của phần mềm (window.webcc) nên cửa vẽ ra là đối tượng gốc, sửa tay được như thường.
 *
 * Chỉ dùng tên thuộc tính công khai của WindoorCraft (shapeManager.addRectFrame, addMullion, addSash…).
 * Ba lớp hình học Pt / Vec / Line bị đổi tên khi họ đóng gói nên phải "dò" từ đối tượng đang sống — xem lop().
 */
(function (G) {
  'use strict';
  const M = G.MNWD = G.MNWD || {};
  const cho = (ms) => new Promise((r) => setTimeout(r, ms));
  const co_rieng = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  function Driver(win) {
    this.win = win || G;
    this._lop = null; this._lop_cua = null;
    this._draw = null;
    this._lan_ve = null; // thông tin lần vẽ gần nhất (để hoàn tác)
  }
  const D = Driver.prototype;

  // ------------------------------------------------------------------ tìm đối tượng của WindoorCraft
  D.cc = function () { return (this.win && this.win.webcc) || null; };
  /** Component Vue của trang Thiết kế (có saveOrder, doBarAction) */
  D.trangVe = function () {
    const doc = this.win && this.win.document;
    const app = doc && doc.querySelector && doc.querySelector('#app');
    const goc = app && app.__vue__;
    if (!goc) return null;
    const d0 = this._draw;
    if (d0 && !d0._isDestroyed && d0.$route && d0.$refs && d0.$refs.right_card) return d0;
    const hang = [goc];
    let dem = 0;
    while (hang.length && dem < 5000) {
      const vm = hang.shift(); dem++;
      const ms = vm.$options && vm.$options.methods;
      if (ms && ms.saveOrder && ms.doBarAction && ms.initActionBar) { this._draw = vm; return vm; }
      const con = vm.$children || [];
      for (let i = 0; i < con.length; i++) hang.push(con[i]);
    }
    this._draw = null;
    return null;
  };
  /** Component "Đơn hàng" ở bảng bên phải (hệ nhôm, ký hiệu, số lượng…) */
  D.thongTinDon = function () {
    const d = this.trangVe();
    const rc = d && d.$refs && d.$refs.right_card;
    return (rc && rc.$refs && rc.$refs.order_info) || null;
  };

  D.sanSang = function () {
    const cc = this.cc();
    if (!cc || !cc.shapeManager || !cc.toolManager) return { ok: false, ly_do: 'Chưa mở trang Thiết kế của WindoorCraft.' };
    const d = this.trangVe();
    if (!d) return { ok: false, ly_do: 'Không tìm thấy trang vẽ — mở mục Thiết kế rồi thử lại.' };
    const ten = d.$route && d.$route.name;
    if (ten && ten !== 'draw' && ten !== 'trial') return { ok: false, ly_do: 'Trang đang mở (' + ten + ') không phải trang Thiết kế.' };
    if (d.canvas && d.canvas !== cc) return { ok: false, ly_do: 'Trang vẽ vừa được tải lại — bấm lại lần nữa.' };
    if (cc.shapeManager.readonly) return { ok: false, ly_do: 'Bản vẽ đang ở chế độ chỉ xem.' };
    return { ok: true };
  };

  /** Dò 3 lớp hình học từ đối tượng đang sống. Không đổi công cụ đang chọn, không đụng bản vẽ. */
  D.lop = function () {
    const cc = this.cc();
    if (this._lop && this._lop_cua === cc) return this._lop;
    const tm = cc.toolManager, sm = cc.shapeManager, mm = cc.mometoManager;
    const Pt = tm.mousePosition && tm.mousePosition.constructor;
    const ct = tm.tools && typeof tm.tools.mullion_vertical === 'function' ? tm.tools.mullion_vertical() : null;
    const Vec = ct && ct.norm && ct.norm.constructor;
    if (!Pt || !Vec || typeof ct.mouseup !== 'function') throw new Error('Không nhận ra lớp hình học của WindoorCraft (phần mềm có thể đã đổi phiên bản).');
    let bat = null;
    const cu_am = co_rieng(sm, 'addMullion') ? sm.addMullion : undefined;
    const cu_cp = co_rieng(mm, 'checkPoint') ? mm.checkPoint : undefined;
    sm.addMullion = function (l) { bat = l; };
    mm.checkPoint = function () {};
    try { ct.curPt = new Pt(1, 1); ct.mouseup({}); } finally {
      if (cu_am) sm.addMullion = cu_am; else delete sm.addMullion;
      if (cu_cp) mm.checkPoint = cu_cp; else delete mm.checkPoint;
    }
    const Line = bat && bat.constructor;
    if (!Line) throw new Error('Không nhận ra lớp đường thẳng của WindoorCraft.');
    this._lop = { Pt: Pt, Vec: Vec, Line: Line };
    this._lop_cua = cc;
    return this._lop;
  };

  // ------------------------------------------------------------------ đọc trạng thái
  D.trangThai = function () {
    const cc = this.cc(), d = this.trangVe();
    if (!cc || !cc.shapeManager || !d) return null;
    const oi = this.thongTinDon();
    const q = (d.$route && d.$route.query) || {};
    const sm = cc.shapeManager;
    return {
      trong: !!sm.isEmpty,
      so_khung: (sm.shapem || []).length,
      ma_don: q.contract_id ? String(q.contract_id) : '',
      ma_bo: q.order_id ? String(q.order_id) : '',
      he_nhom: oi && oi.order_info ? { id: oi.order_info.product_id || null, ten: oi.order_info.product_name || this._tenHe(oi, oi.order_info.product_id) } : null,
      ky_hieu: oi && oi.order_info ? String(oi.order_info.window_no || '') : '',
      dang_luu: !!d.loading,
      dang_tai: !!(d.$store && d.$store.state && d.$store.state.global_loading),
    };
  };

  /** Tên hệ nhôm theo mã, tra trong danh mục (mở lại bộ đã lưu thì WindoorCraft để trống tên) */
  D._tenHe = function (oi, id) {
    if (!id) return '';
    const p = ((oi && oi.product_list) || []).filter((x) => x && x.id !== undefined && Number(x.id) === Number(id) && x.name)[0];
    return p ? String(p.name) : '';
  };
  D.dsHeNhom = function () {
    const oi = this.thongTinDon();
    const out = [];
    let nhom = '';
    ((oi && oi.product_list) || []).forEach((p) => {
      if (!p) return;
      if (p.header !== undefined) { nhom = String(p.header || '').replace(/^.*\//, '').trim(); return; }
      if (p.divider || p.id === undefined || !p.name) return;
      let ss = {}, ds = {};
      try { ss = typeof p.show_setting === 'string' ? JSON.parse(p.show_setting) : (p.show_setting || {}); } catch (e) { ss = {}; }
      try { ds = typeof p.draw_setting === 'string' ? JSON.parse(p.draw_setting) : (p.draw_setting || {}); } catch (e) { ds = {}; }
      out.push({ id: p.id, ten: String(p.name), nhom: nhom, khung: Number(ss.frame) || 0, do: Number(ss.frameMullion) || 0, mo_ngoai: ds.sashOutwardOpen === undefined ? null : !!Number(ds.sashOutwardOpen) });
    });
    return out;
  };
  /** Bề mặt thanh khung / đố của một hệ nhôm (mm); không có id thì lấy theo hệ đang chọn trên bản vẽ */
  D.bienDang = function (id) {
    if (id !== null && id !== undefined && id !== '') {
      const p = this.dsHeNhom().filter((x) => Number(x.id) === Number(id))[0];
      if (p && p.khung) return { khung: p.khung, do: p.do || p.khung };
    }
    const cc = this.cc();
    const ps = cc && cc.shapeManager && cc.shapeManager.profileSize;
    return { khung: (ps && Number(ps.frame)) || 0, do: (ps && Number(ps.frameMullion)) || 0 };
  };
  /** Cách chia đều đang đặt trong tài khoản WindoorCraft: 1 = kính đều (lọt lòng), 0 = kích thước đều (tim đố) */
  D.chiaDeuTheoPm = function () {
    const oi = this.thongTinDon();
    return oi && Number(oi.mullion_equally_divided_way) === 1 ? 'lot_long' : 'tim';
  };

  /** Các kiểu lùa của WindoorCraft có đúng `canh` cánh kính (không lưới) */
  D.dsKieuLua = function (canh) {
    const cc = this.cc();
    const ds = (cc && cc.shapeManager && cc.shapeManager.slideOptions) || [];
    return ds.filter((o) => M.soCanhLua(o.serial) === canh).map((o) => ({ index: o.index, serial: o.serial }));
  };
  D.kieuLua = function (canh, chi_dinh) {
    const sm = this.cc().shapeManager;
    const ds = sm.slideOptions || [];
    if (chi_dinh !== null && chi_dinh !== undefined && ds.some((o) => o.index === chi_dinh)) return chi_dinh;
    const md = sm.slideDefaultOption;
    const mdo = ds.filter((o) => o.index === md)[0];
    if (mdo && M.soCanhLua(mdo.serial) === canh) return md;
    const hop = ds.filter((o) => M.soCanhLua(o.serial) === canh);
    if (!hop.length) return null;
    const uu = M.LUA_UU_TIEN[canh] || [];
    for (let i = 0; i < uu.length; i++) { const f = hop.filter((o) => o.serial === uu[i])[0]; if (f) return f.index; }
    return hop[0].index;
  };
  /** Đếm số cánh kính trong mã kiểu lùa của WindoorCraft ("A1A2-A0A3" → 4). Có lưới (S), cố định (H), kiểu D hoặc lùa đứng (|V) → -1 */
  M.soCanhLua = function (serial) {
    const s = String(serial || '');
    if (/\|V$/.test(s) || /[SDH]/.test(s)) return -1;
    const m = s.match(/A\d+/g);
    return m ? m.length : -1;
  };
  M.LUA_UU_TIEN = { 1: ['A0'], 2: ['A1-A0', 'A0-A1'], 3: ['A0A2-A1', 'A1-A0A2', 'A0-A1-A2'], 4: ['A1A2-A0A3', 'A0A3-A1A2'], 5: ['A0-A1-A2-A3-A4'], 6: ['A2A3-A1A4-A0A5', 'A0A5-A1A4-A2A3'], 8: ['A0A2A5A7-A1A3A4A6'] };

  // ------------------------------------------------------------------ hệ nhôm
  D.chonHeNhom = async function (id) {
    const oi = this.thongTinDon();
    if (!oi || !oi.order_info) throw new Error('Không tìm thấy bảng Đơn hàng của WindoorCraft.');
    if (Number(oi.order_info.product_id) === Number(id)) return { doi: false };
    const p = ((oi.product_list) || []).filter((x) => x && x.name && Number(x.id) === Number(id))[0];
    if (!p) throw new Error('Tài khoản không có hệ nhôm mã ' + id + '.');
    if (typeof oi.selectProduct === 'function') oi.selectProduct();
    oi.order_info.product_id = p.id;
    const t0 = Date.now();
    await cho(150);
    while (Date.now() - t0 < 25000) {
      const dang = oi.isChangeProduct === true || !!(oi.$store && oi.$store.state && oi.$store.state.global_loading);
      if (!dang && Number(oi.order_info.product_id) === Number(id)) return { doi: true, ms: Date.now() - t0, ten: p.name };
      await cho(120);
    }
    throw new Error('Đổi sang hệ nhôm "' + p.name + '" quá 25 giây chưa xong — kiểm tra mạng rồi thử lại.');
  };

  // ------------------------------------------------------------------ vẽ
  const hop = (o) => (o && o.polygon && o.polygon.box) || null;
  const soO = (fr) => ((fr && (fr.avaiablePoly || fr.availablePoly)) || []).length;

  /** Đối tượng cài đặt cánh của WindoorCraft (đúng thứ bảng bên phải dùng) — lấy bằng cách chặn sự kiện, không mở bảng */
  D._caiDat = function (s) {
    const cc = this.cc(), L = this.lop();
    const eb = cc.eventBus;
    if (!eb || typeof s.emitSashSetting !== 'function') return null;
    const da = cc.eventsEmitted ? cc.eventsEmitted.slice() : null;
    if (da) cc.eventsEmitted.length = 0;
    const cu = co_rieng(eb, 'emit') ? eb.emit : undefined;
    let bat = null;
    eb.emit = function (ev) { bat = ev; };
    try { s.emitSashSetting(s, cc, new L.Pt(0, 0)); } catch (e) { bat = null; } finally {
      if (cu) eb.emit = cu; else delete eb.emit;
      if (da) { cc.eventsEmitted.length = 0; for (let i = 0; i < da.length; i++) cc.eventsEmitted.push(da[i]); }
    }
    return (bat && bat.payload) || null;
  };
  /** Đặt hướng bản lề ('left'|'right'|'up') và chiều mở ('inward'|'outward') cho một cánh mở quay / hất */
  D._datCanh = function (s, v) {
    const hm = s && s.hardwareManager;
    if (!hm) return;
    const cc = this.cc();
    const pl = this._caiDat(s);
    const dat = (k, gt) => {
      if (!gt || hm[k] === gt) return;
      let xong = false;
      if (pl) { try { pl[k] = gt; xong = hm[k] === gt; } catch (e) { xong = false; } }
      if (!xong) { hm[k] = gt; if (typeof s.updatePoly === 'function') s.updatePoly(); if (typeof s.draw === 'function') s.draw(cc); }
    };
    dat('openDirection', v.huong);
    dat('openToward', v.mo);
  };

  D._veO = function (fr, o, kh, ox, oy, nk) {
    const cc = this.cc(), sm = cc.shapeManager, tm = cc.toolManager, L = this.lop();
    const x = ox + o.tam.x, y = oy + o.tam.y;
    const pt = new L.Pt(x, y);
    const g = fr.sashManager;
    const tai = (ds) => (ds || []).filter((s) => { const b = hop(s); return b && x > b.xmin && x < b.xmax && y > b.ymin && y < b.ymax; })[0] || null;
    const ten_o = { tren: 'ô trên', duoi: 'ô dưới', trai: 'vách trái', phai: 'vách phải', chinh: 'phần chính', o: 'ô' }[o.vung] + ' ' + (o.chi_so + 1);
    const hong = (vi) => { nk.canh_bao.push('Không đặt được ' + vi + ' vào ' + ten_o + '.'); };
    const mo = kh.mo === 'ngoai' ? 'outward' : kh.mo === 'trong' ? 'inward' : null;
    sm.sashAsDoor = !!o.cua_di;
    switch (o.kieu) {
      case 'quay':
      case 'hat': {
        sm.addSash(pt, 'Sash');
        const s = tai(g.sashes);
        if (!s) return hong('cánh');
        this._datCanh(s, { huong: o.kieu === 'hat' ? 'up' : (o.huong === 'phai' ? 'right' : 'left'), mo: mo });
        nk.canh += 1;
        break;
      }
      case 'quay2': {
        sm.addDoubleSash(pt, 'DoubleSash');
        const d = tai(g.doubleSashes);
        if (!d) return hong('cánh đôi');
        if (mo) {
          (d.sashes || []).forEach((s) => this._datCanh(s, { mo: mo }));
          try { d.openToward = mo; } catch (e) { /* bản cũ không có */ }
        }
        nk.canh += 2;
        break;
      }
      case 'quay4': {
        const ct = tm.tools && typeof tm.tools.foldDouble === 'function' ? tm.tools.foldDouble() : null;
        if (!ct || typeof ct.addFenes !== 'function') return hong('bộ 4 cánh mở quay (phiên bản WindoorCraft này không có)');
        ct.addFenes(pt);
        const d = tai(g.folds);
        if (!d) return hong('bộ 4 cánh mở quay');
        if (mo) (d.sashes || []).forEach((s) => this._datCanh(s, { mo: mo }));
        nk.canh += 4;
        break;
      }
      case 'lua': {
        const k = this.kieuLua(o.canh || 2, o.lua_kieu);
        if (k === null || k === undefined) return hong('cửa lùa ' + o.canh + ' cánh (WindoorCraft không có kiểu lùa đúng số cánh này)');
        sm.addSlide(pt, k);
        const d = tai(g.slides);
        if (!d) return hong('cửa lùa');
        const n = (d.sashes || []).length;
        if (n && n !== (o.canh || 2)) nk.canh_bao.push('Cửa lùa ở ' + ten_o + ' ra ' + n + ' cánh thay vì ' + o.canh + '.');
        nk.canh += n || (o.canh || 2);
        break;
      }
      case 'xep': {
        sm.addFold(pt, 'FoldSash');
        const d = tai(g.folds);
        if (!d) return hong('cửa xếp trượt');
        if (d.leftCount !== o.xep_trai || d.rightCount !== o.xep_phai) {
          d.leftCount = o.xep_trai; d.rightCount = o.xep_phai;
          if (typeof d.updatePoly === 'function') d.updatePoly();
          if (typeof d.draw === 'function') d.draw(cc);
        }
        nk.canh += (d.sashes || []).length;
        break;
      }
      default:
        break;
    }
  };

  // ------------------------------------------------------------------ loại kính
  /** Các loại kính của hệ nhôm đang chọn (ô "Kính" ở bảng Đơn hàng): [{ten, day, mac_dinh}]. Tên trùng nhau chỉ giữ cái đầu. */
  D.dsKinh = function () {
    const oi = this.thongTinDon();
    const ds = (oi && oi.preinstallList && oi.preinstallList['1']) || [];
    const thay = {}, out = [];
    ds.forEach((x) => {
      if (!x || !x.value) return;
      const ten = String(x.value);
      if (thay[ten]) return;
      thay[ten] = 1;
      out.push({ ten: ten, day: Number(x.value1) || 0, mac_dinh: !!Number(x.is_default) });
    });
    return out;
  };
  /** Loại kính đang chọn cho bộ đang vẽ */
  D.kinhDangChon = function () {
    const oi = this.thongTinDon();
    return oi && oi.order_info ? String(oi.order_info.guigelabel || '') : '';
  };
  /**
   * Chọn loại kính cho bộ đang vẽ, đúng như chọn ở ô "Kính" của WindoorCraft (kính trên bản vẽ, đơn giá, độ dày đổi theo).
   * `ten` rỗng → về loại mặc định của hệ nhôm (hệ không đặt mặc định thì giữ nguyên).
   * So tên không phân biệt hoa thường, dấu, khoảng trắng thừa. Trả {ten, doi}; ném lỗi nếu hệ nhôm không có loại kính đó.
   */
  D.chonKinh = function (ten) {
    const oi = this.thongTinDon();
    if (!oi || !oi.order_info) throw new Error('Không đọc được bảng Đơn hàng của WindoorCraft.');
    const ds = ((oi.preinstallList && oi.preinstallList['1']) || []).filter((x) => x && x.value);
    const chuan = (t) => M.boDau(String(t === undefined || t === null ? '' : t)).replace(/\s+/g, ' ').trim();
    const can = chuan(ten);
    let it = null;
    if (can) {
      it = ds.filter((x) => chuan(x.value) === can)[0] || null;
      if (!it) {
        const gan = ds.filter((x) => chuan(x.value).indexOf(can) >= 0 || can.indexOf(chuan(x.value)) >= 0).map((x) => String(x.value)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
        throw new Error('Hệ nhôm đang chọn không có loại kính "' + String(ten).trim() + '"' + (gan.length ? ' — gần giống: ' + gan.join(', ') : ds.length ? '' : ' (hệ này chưa có danh mục kính)') + '.');
      }
    } else {
      it = ds.filter((x) => Number(x.is_default))[0] || null;
      if (!it) return { ten: this.kinhDangChon(), doi: false };
    }
    const truoc = this.kinhDangChon();
    if (truoc === String(it.value)) return { ten: truoc, doi: false }; // khung mới vẽ đã lấy đúng loại đang chọn
    if (typeof oi.updateComboxValue !== 'function') throw new Error('Phiên bản WindoorCraft này không cho chọn kính tự động — chọn ở ô Kính bên phải rồi lưu.');
    if (typeof oi.$set === 'function') oi.$set(oi.order_info, 'guigelabel', it.value); else oi.order_info.guigelabel = it.value;
    oi.updateComboxValue(it, 'guigelabel', '1');
    if (String(oi.order_info.guigelabel || '') !== String(it.value)) throw new Error('WindoorCraft không nhận loại kính "' + it.value + '".');
    return { ten: String(it.value), doi: true };
  };

  /**
   * Vẽ một bộ cửa theo kế hoạch của M.tinh().
   * tuy.che_do: 'moi' (mặc định) = xoá bản vẽ & bắt đầu bộ mới (như nút "Xóa Và Thêm Mới" — không đè lên bộ đã lưu);
   *             'de'  = vẽ đè lên bộ đang mở (lưu lại sẽ cập nhật chính bộ đó).
   */
  D.ve = async function (kh, tuy) {
    tuy = tuy || {};
    const ss = this.sanSang();
    if (!ss.ok) throw new Error(ss.ly_do);
    if (!kh || (kh.loi && kh.loi.length)) throw new Error((kh && kh.loi && kh.loi[0]) || 'Thiếu kế hoạch vẽ.');
    const cc = this.cc(), sm = cc.shapeManager, tm = cc.toolManager, mm = cc.mometoManager;
    const d = this.trangVe();
    const L = this.lop();
    const nk = { canh_bao: [], canh: 0, do: 0, doi_he: null, che_do: tuy.che_do === 'de' ? 'de' : 'moi' };
    const t0 = Date.now();

    // 1. dọn bản vẽ
    let truoc = '';
    if (nk.che_do === 'de') {
      try { truoc = sm.isEmpty ? '' : sm.serialize(); } catch (e) { truoc = ''; }
      sm.clear();
    } else {
      const co_bo = !!(d.$route && d.$route.query && d.$route.query.order_id);
      d.doBarAction({ action: 'clean' });
      if (co_bo) { // đợi WindoorCraft bỏ mã bộ cũ khỏi địa chỉ, kẻo lưu đè
        const t1 = Date.now();
        while (d.$route.query.order_id && Date.now() - t1 < 4000) await cho(60);
        if (d.$route.query.order_id) throw new Error('WindoorCraft chưa chuyển sang bộ cửa mới — bấm "Xóa Và Thêm Mới" rồi thử lại.');
        await cho(250);
      }
      if (!sm.isEmpty) sm.clear();
    }
    // 2. hệ nhôm (đổi trước rồi mới vẽ: cỡ thanh, kiểu ghép góc lấy theo hệ lúc tạo)
    if (kh.he_nhom) nk.doi_he = await this.chonHeNhom(kh.he_nhom);
    if (this.cc() !== cc) throw new Error('Trang vẽ vừa được tải lại — bấm vẽ lại lần nữa.');
    // loại kính: soát tên trước khi vẽ, để sai tên thì dừng ngay, không để lại bản vẽ dở
    if (kh.kinh) {
      const chuan = (t) => M.boDau(String(t || '')).replace(/\s+/g, ' ').trim();
      const ds_kinh = this.dsKinh();
      if (!ds_kinh.some((x) => chuan(x.ten) === chuan(kh.kinh))) {
        const gan = ds_kinh.filter((x) => chuan(x.ten).indexOf(chuan(kh.kinh)) >= 0 || chuan(kh.kinh).indexOf(chuan(x.ten)) >= 0).map((x) => x.ten).slice(0, 5);
        throw new Error('Hệ nhôm đang chọn không có loại kính "' + kh.kinh + '"' + (gan.length ? ' — gần giống: ' + gan.join(', ') : ds_kinh.length ? '' : ' (hệ này chưa có danh mục kính)') + '.');
      }
    }

    // 3. vẽ — gom toàn bộ thành MỘT bước hoàn tác của WindoorCraft
    const cu_cp = co_rieng(mm, 'checkPoint') ? mm.checkPoint : undefined;
    const cua_cu = sm.sashAsDoor;
    mm.checkPoint = function () {};
    let fr = null;
    try {
      if (kh.khung === '3_canh') {
        const ct = tm.tools && typeof tm.tools.door === 'function' ? tm.tools.door() : null;
        if (!ct) throw new Error('Phiên bản WindoorCraft này không có khung cửa đi 3 cạnh — chọn Khung = 4 cạnh.');
        ct.curPt = new L.Pt(kh.rong / 2, kh.cao / 2);
        fr = sm.add(ct.clickShape);
        fr = fr || sm.shapem[sm.shapem.length - 1];
        fr.resize({ width: kh.rong, height: kh.cao });
        if (typeof fr.updatePoly === 'function') fr.updatePoly();
        if (typeof fr.draw === 'function') fr.draw(cc);
      } else {
        fr = sm.addRectFrame(kh.rong, kh.cao);
        fr = fr || sm.shapem[sm.shapem.length - 1];
      }
      const b = hop(fr);
      if (!b) throw new Error('WindoorCraft không tạo được khung.');
      const ox = b.xmin, oy = b.ymin;
      if (Math.abs(b.xmax - b.xmin - kh.rong) > 0.6 || Math.abs(b.ymax - b.ymin - kh.cao) > 0.6) nk.canh_bao.push('Khung ra ' + M.ghi(b.xmax - b.xmin) + ' × ' + M.ghi(b.ymax - b.ymin) + ', khác số yêu cầu ' + M.ghi(kh.rong) + ' × ' + M.ghi(kh.cao) + '.');
      for (let i = 0; i < kh.do.length; i++) {
        const dd = kh.do[i];
        const n0 = soO(fr);
        sm.addMullion(new L.Line(new L.Pt(ox + dd.tam.x, oy + dd.tam.y), dd.huong === 'dung' ? new L.Vec(-1, 0) : new L.Vec(0, 1)));
        if (soO(fr) === n0 + 1) nk.do += 1;
        else nk.canh_bao.push((dd.ten || 'Đố') + ' ở ' + M.ghi(dd.tim) + ' không vẽ được.');
      }
      for (let i = 0; i < kh.o.length; i++) {
        if (kh.o[i].kieu === 'fix') continue;
        this._veO(fr, kh.o[i], kh, ox, oy, nk);
      }
      // kính: dòng có ghi loại kính → chọn loại đó; vẽ bộ mới mà không ghi → về loại mặc định của hệ
      // (WindoorCraft giữ loại kính của bộ trước, không tự trả về mặc định). Vẽ đè mà không ghi → giữ kính của bộ đang mở.
      if (kh.kinh || nk.che_do === 'moi') nk.kinh = this.chonKinh(kh.kinh || '');
    } finally {
      sm.sashAsDoor = cua_cu;
      if (cu_cp) mm.checkPoint = cu_cp; else delete mm.checkPoint;
    }
    if (typeof sm.moveShapeToCenter === 'function') sm.moveShapeToCenter();
    if (typeof cc.refresh === 'function') cc.refresh();
    mm.checkPoint();
    this._lan_ve = { che_do: nk.che_do, truoc: truoc, cua: cc };
    nk.doi_chieu = this.doiChieu(kh);
    nk.ms = Date.now() - t0;
    return nk;
  };

  /** Đọc lại bản vẽ vừa tạo và so với kế hoạch */
  D.doiChieu = function (kh) {
    const cc = this.cc(), sm = cc.shapeManager;
    const out = { dung: true, muc: [] };
    const fr = (sm.shapem || [])[sm.shapem.length - 1];
    const b = hop(fr);
    const them = (ten, can, co, sai_so) => {
      const ok = Math.abs(can - co) <= (sai_so || 0);
      out.muc.push({ ten: ten, can: can, co: co, ok: ok });
      if (!ok) out.dung = false;
    };
    if (!b) { out.dung = false; out.muc.push({ ten: 'Khung', can: 1, co: 0, ok: false }); return out; }
    them('Rộng khung', kh.rong, Math.round((b.xmax - b.xmin) * 10) / 10, 0.6);
    them('Cao khung', kh.cao, Math.round((b.ymax - b.ymin) * 10) / 10, 0.6);
    them('Số ô', kh.o.length, soO(fr));
    const g = fr.sashManager || {};
    const dem = (k) => kh.o.filter((o) => k.indexOf(o.kieu) >= 0).length;
    them('Cánh mở quay / hất', dem(['quay', 'hat']), (g.sashes || []).length);
    them('Cánh đôi', dem(['quay2']), (g.doubleSashes || []).length);
    them('Cửa lùa', dem(['lua']), (g.slides || []).length);
    them('Xếp trượt / 4 cánh', dem(['xep', 'quay4']), (g.folds || []).length);
    out.muc = out.muc.filter((m) => !(m.can === 0 && m.co === 0));
    if (kh.kinh) {
      const chuan = (t) => M.boDau(String(t || '')).replace(/\s+/g, ' ').trim();
      const co = this.kinhDangChon(), khop = chuan(co) === chuan(kh.kinh);
      out.muc.push({ ten: 'Kính', can: kh.kinh, co: co, ok: khop });
      if (!khop) out.dung = false;
    }
    return out;
  };

  /** Bỏ lần vẽ vừa rồi: vẽ mới → xoá trắng; vẽ đè → trả lại bản vẽ trước đó */
  D.hoanTac = function () {
    const cc = this.cc();
    const lv = this._lan_ve;
    if (!cc || !lv || lv.cua !== cc) return false;
    const sm = cc.shapeManager;
    if (lv.che_do === 'de' && lv.truoc) sm.openFile(lv.truoc, false, false);
    else { sm.clear(); if (cc.mometoManager && typeof cc.mometoManager.checkPoint === 'function') cc.mometoManager.checkPoint(); }
    this._lan_ve = null;
    return true;
  };

  // ------------------------------------------------------------------ giá (tính bằng chính hàm của WindoorCraft, không lưu)
  /**
   * Tính bóc tách + giá cho bộ cửa đang mở, đúng hàm WindoorCraft chạy khi bấm "Lưu lại" (đã đối chiếu 09/10/2026:
   * TEST-1 9.940.300 đ, TEST-2 (2 bộ) 6.431.800 đ — trùng số WindoorCraft lưu). Không lưu, không đổi bản vẽ, không thêm bước hoàn tác.
   * Trả {tong, so_luong, dien_tich, he_nhom, dong:[{ten, ma, don_gia, sl, dvt, thanh_tien}], vat_tu:{nhom, kinh, phu_kien}, chua_loi_nhuan, ms}.
   */
  D.tinhGia = async function () {
    const ss = this.sanSang();
    if (!ss.ok) throw new Error(ss.ly_do);
    const d = this.trangVe(), cc = this.cc(), sm = cc.shapeManager, mm = cc.mometoManager;
    if (sm.isEmpty) throw new Error('Bản vẽ đang trống, chưa có gì để tính giá.');
    const rc = d.$refs && d.$refs.right_card;
    if (!rc || typeof rc.buildSaveData !== 'function' || typeof d.getScriptList !== 'function' || typeof d.scriptCalculation !== 'function') throw new Error('Phiên bản WindoorCraft này không cho tính giá tự động — bấm Lưu lại rồi xem giá trong đơn hàng.');
    const t0 = Date.now();
    const cu_cp = co_rieng(mm, 'checkPoint') ? mm.checkPoint : undefined;
    const cu_dv = cc.lenUnit;
    mm.checkPoint = function () {};
    let i, kq;
    try {
      i = rc.buildSaveData();
      if (!i || !i.product_id) throw new Error('Chưa chọn hệ nhôm — WindoorCraft chỉ tính giá khi bộ cửa có hệ nhôm.');
      if (cc.globalUnit) cc.lenUnit = cc.globalUnit;
      const uid = (sm.shapem || []).filter((f) => !(f.attrs && f.attrs.product_id && Number(f.attrs.product_id) !== Number(i.product_id))).map((f) => f.uid);
      if (uid.length !== (sm.shapem || []).length) throw new Error('Bản vẽ có khung dùng hệ nhôm khác — tiện ích chưa tính giá loại này, bấm Lưu lại để WindoorCraft tính.');
      const l = await d.getScriptList(i.product_id);
      kq = await d.scriptCalculation(l, i, l && l.vars, false, true, []);
    } finally {
      cc.lenUnit = cu_dv;
      if (cu_cp) mm.checkPoint = cu_cp; else delete mm.checkPoint;
    }
    const r = (kq && kq.result) || {};
    const op = r.order_offer_price || [];
    const so_ = (v) => (isFinite(Number(v)) ? Number(v) : 0);
    const dong = op.map((x) => ({ ten: String(x.name || ''), ma: String(x.code || ''), don_gia: so_(x.price), sl: so_(x.count !== undefined ? x.count : x.quantity), dvt: String(x.unit || ''), thanh_tien: so_(x.money !== undefined && x.money !== null ? x.money : so_(x.price) * so_(x.count)) }));
    const cf = (i.attr_data && i.attr_data.custom_format) || {};
    return {
      tong: Math.round(dong.reduce((a, x) => a + x.thanh_tien, 0)),
      so_luong: Number(i.count) || 1, dien_tich: Number(i.area) || 0,
      he_nhom: String(i.product_name || ''), ky_hieu: String(i.window_no || ''),
      dong: dong,
      // giá vốn theo bảng của WindoorCraft: số lượng bóc tách (nhôm: kg, kính: m², phụ kiện: cái…) × đơn giá vốn
      von: (r.order_cost || []).map((x) => {
        const m = String(x.result || '').match(/^\s*(-?[\d.]+)\s*\*\s*(-?[\d.]+)/);
        const sl = m ? so_(m[1]) : so_(x.newQuantity !== undefined && x.newQuantity !== null ? x.newQuantity : x.count);
        const gia = m ? so_(m[2]) : so_(x.newPrice !== undefined && x.newPrice !== null ? x.newPrice : x.price);
        return { loai: String(x.type || ''), ma: String(x.code || x.name || ''), ten: String(x.name || ''), sl: sl, gia_wc: gia, tien_wc: so_(x.cost) };
      }),
      boc_tach: typeof M.gonBocTach === 'function' ? M.gonBocTach(r) : null,
      vat_tu: { nhom: (r.order_bar || []).length, kinh: (r.order_glass || []).length, phu_kien: (r.order_addon || []).length },
      chua_loi_nhuan: Number(cf.profit_percent) > 0,
      ms: Date.now() - t0,
    };
  };

  /** Ảnh PNG (dataURL) của bản vẽ đang mở — đúng hình WindoorCraft vẽ, có kích thước. Không thêm bước hoàn tác. null nếu không chụp được. */
  D.chupHinh = function () {
    try {
      const sm = this.cc().shapeManager;
      if (!sm || sm.isEmpty || typeof sm.toData !== 'function') return null;
      const u = sm.toData({ pixelRatio: 1 });
      return typeof u === 'string' && u.indexOf('data:image') === 0 ? u : null;
    } catch (e) { return null; }
  };

  // ------------------------------------------------------------------ góc nhìn (không đụng tới bản vẽ)
  /**
   * Tìm vùng trống rộng nhất của khung vẽ, tức chỗ không bị thanh công cụ / bảng bên phải của WindoorCraft
   * và bảng tiện ích (`che`: các hình chữ nhật toạ độ màn hình) đè lên.
   * `bo_qua` = phần tử gốc của tiện ích, để nhìn xuyên qua nó khi dò mép các bảng của WindoorCraft.
   * Trả {x, y, w, h} tính từ góc trên-trái khung vẽ, hoặc null khi không cần / không đủ chỗ.
   */
  D.vungTrong = function (che, bo_qua) {
    const cc = this.cc();
    const doc = this.win.document;
    if (!cc || !cc.stage || typeof cc.stage.container !== 'function' || !doc || typeof doc.elementsFromPoint !== 'function') return null;
    const el = cc.stage.container();
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    const R = el.getBoundingClientRect();
    if (!(R.width >= 320 && R.height >= 240)) return null;
    // chỉ tính những bảng che thật sự (bảng đã thu gọn còn mỗi thanh tiêu đề thì bỏ qua)
    const chan = (che || []).filter((c) => c && Math.min(c.bottom, R.bottom) - Math.max(c.top, R.top) > R.height * 0.25 && c.right > R.left && c.left < R.right);
    if (!chan.length) return null;
    const la_khung_ve = (x, y) => {
      const ds = doc.elementsFromPoint(x, y) || [];
      for (let i = 0; i < ds.length; i++) {
        if (bo_qua && (ds[i] === bo_qua || (typeof bo_qua.contains === 'function' && bo_qua.contains(ds[i])))) continue;
        return el === ds[i] || el.contains(ds[i]);
      }
      return false;
    };
    let trai = R.left, phai = R.right;
    [0.25, 0.5, 0.75].forEach((k) => {
      const y = R.top + R.height * k;
      let x = R.left + 2;
      const gh1 = R.left + R.width * 0.45;
      while (x < gh1 && !la_khung_ve(x, y)) x += 6;
      if (x > R.left + 2) trai = Math.max(trai, x);
      x = R.right - 2;
      const gh2 = R.right - R.width * 0.45;
      while (x > gh2 && !la_khung_ve(x, y)) x -= 6;
      if (x < R.right - 2) phai = Math.min(phai, x);
    });
    // cắt bỏ phần bị bảng tiện ích che, lấy khoảng rộng nhất còn lại
    let khoang = [[trai, phai]];
    chan.forEach((c) => {
      const moi = [];
      khoang.forEach((k) => {
        if (c.right <= k[0] || c.left >= k[1]) { moi.push(k); return; }
        if (c.left - k[0] > 0) moi.push([k[0], c.left]);
        if (k[1] - c.right > 0) moi.push([c.right, k[1]]);
      });
      khoang = moi;
    });
    khoang.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
    const le = 10;
    if (!khoang.length || khoang[0][1] - khoang[0][0] - 2 * le < 260) return null;
    return { x: khoang[0][0] + le - R.left, y: le, w: khoang[0][1] - khoang[0][0] - 2 * le, h: R.height - 2 * le };
  };
  /**
   * Thu phóng và đưa bản vẽ vào giữa vùng `v` của khung vẽ, bằng chính lệnh canh giữa của WindoorCraft.
   * Chỉ đổi góc nhìn (như lăn chuột, kéo màn hình) — không ghi gì vào bản vẽ, không tạo bước hoàn tác.
   */
  D.canhVaoVung = function (v) {
    const cc = this.cc();
    if (!cc || !cc.stage || !v || !(v.w >= 120 && v.h >= 120)) return false;
    const st = cc.stage, sm = cc.shapeManager;
    if (!sm || sm.isEmpty || typeof sm.moveShapeToCenter !== 'function') return false;
    if (typeof st.width !== 'function' || typeof st.x !== 'function') return false;
    const el = typeof st.container === 'function' ? st.container() : null;
    const W = (el && el.clientWidth) || st.width(), H = (el && el.clientHeight) || st.height();
    try { sm.moveShapeToCenter({ clientWidth: Math.round(v.w), clientHeight: Math.round(v.h) }); }
    finally { st.width(W); st.height(H); }
    st.x(st.x() + v.x); st.y(st.y() + v.y);
    if (typeof st.batchDraw === 'function') st.batchDraw();
    return true;
  };

  // ------------------------------------------------------------------ thông tin đơn, lưu
  /** Điền ký hiệu / số lượng / vị trí / ghi chú vào bảng Đơn hàng */
  D.dienThongTin = function (v) {
    const oi = this.thongTinDon();
    if (!oi || !oi.order_info) return false;
    const t = oi.order_info;
    if (v.ky_hieu) t.window_no = String(v.ky_hieu);
    if (v.so_luong) { t.count = Number(v.so_luong); if (typeof oi.setArea === 'function') { try { oi.setArea(); } catch (e) { /* bỏ qua */ } } }
    if (v.vi_tri !== undefined && v.vi_tri !== null) t.install_position = String(v.vi_tri);
    if (v.ghi_chu !== undefined && v.ghi_chu !== null) t.note = String(v.ghi_chu);
    return true;
  };

  D._batThongBao = function (d) {
    const VM = d && d.$VMessage;
    const r = { ok: [], loi: [], tin: [], tra: function () {} };
    if (!VM) return r;
    const goc = {};
    ['success', 'error', 'info', 'warning'].forEach((k) => {
      if (typeof VM[k] !== 'function') return;
      goc[k] = { co: co_rieng(VM, k), f: VM[k] };
      VM[k] = function (t) {
        (k === 'success' ? r.ok : k === 'error' ? r.loi : r.tin).push(String(t));
        return goc[k].f.apply(this, arguments);
      };
    });
    r.tra = function () { Object.keys(goc).forEach((k) => { if (goc[k].co) VM[k] = goc[k].f; else delete VM[k]; }); };
    return r;
  };

  /**
   * Bấm "Lưu lại" của WindoorCraft và đợi xong. Bộ chưa có mã → tạo bộ mới (trong đơn đang mở, hoặc mở đơn mới).
   * Trả {ma_bo, ma_don, moi}. Ném lỗi kèm đúng câu WindoorCraft báo.
   */
  D.luu = async function (tuy) {
    tuy = tuy || {};
    const ss = this.sanSang();
    if (!ss.ok) throw new Error(ss.ly_do);
    const d = this.trangVe(), cc = this.cc();
    if (cc.shapeManager.isEmpty) throw new Error('Bản vẽ đang trống, không có gì để lưu.');
    if (d.loading) throw new Error('WindoorCraft đang lưu dở, đợi xong rồi thử lại.');
    const bo0 = String((d.$route.query && d.$route.query.order_id) || '');
    // điền lại ngay sát lúc lưu: WindoorCraft tự đặt lại ký hiệu "C<n>" mỗi khi danh sách bộ cửa của đơn nạp xong
    if (tuy.thong_tin) this.dienThongTin(tuy.thong_tin);
    const tb = this._batThongBao(d);
    const t0 = Date.now();
    let da_chay = false;
    try {
      const p = d.saveOrder();
      if (p && typeof p.then === 'function') { try { await p; } catch (e) { /* lỗi sẽ hiện qua thông báo */ } }
      const toi_da = tuy.cho_toi_da || 120000;
      while (Date.now() - t0 < toi_da) {
        const q = d.$route.query || {};
        const bo = String(q.order_id || '');
        if (d.loading) da_chay = true;
        if (tb.loi.length) throw new Error('WindoorCraft báo: ' + tb.loi.join(' / '));
        if (!d.loading) {
          if (bo && (bo !== bo0 || tb.ok.length)) return { ma_bo: bo, ma_don: String(q.contract_id || ''), moi: bo !== bo0, ms: Date.now() - t0 };
          if (tb.tin.length && Date.now() - t0 > 1200) throw new Error('WindoorCraft báo: ' + tb.tin.join(' / '));
          if (!da_chay && Date.now() - t0 > 8000) throw new Error('WindoorCraft không nhận lệnh lưu (có thể đang hiện hộp thoại) — bấm "Lưu lại" bằng tay.');
          if (da_chay && Date.now() - t0 > 20000 && !tb.ok.length) throw new Error('WindoorCraft dừng lưu mà không báo gì — kiểm tra lại rồi bấm "Lưu lại" bằng tay.');
        }
        await cho(200);
      }
      throw new Error('Đợi lưu quá ' + Math.round(toi_da / 1000) + ' giây.');
    } finally { tb.tra(); }
  };

  /** Như nút "Xóa Và Thêm Mới": xoá bản vẽ, giữ đơn hàng đang mở, bộ kế tiếp sẽ là bộ mới */
  D.boMoi = function () {
    const d = this.trangVe();
    if (!d) return false;
    d.doBarAction({ action: 'clean' });
    return true;
  };

  /**
   * Bắt đầu một ĐƠN HÀNG MỚI: rời trang vẽ rồi vào lại (đúng như bấm Trang chủ → Thiết kế), để bộ kế tiếp không dính vào đơn đang mở.
   * Bản vẽ chưa lưu sẽ mất — người gọi phải hỏi trước.
   */
  D.donMoi = async function () {
    const d = this.trangVe();
    if (!d || !d.$router) throw new Error('Chưa mở trang Thiết kế.');
    const q = (d.$route && d.$route.query) || {};
    if (!q.contract_id && !q.order_id) { d.doBarAction({ action: 'clean' }); return { vao_lai: false }; }
    const cu = this.cc(), r = d.$router, kieu = q.drawType || '2';
    const di = (loc) => { try { const p = r.replace(loc); return p && typeof p.catch === 'function' ? p.catch(() => {}) : Promise.resolve(); } catch (e) { return Promise.resolve(); } };
    await di({ name: 'home' });
    await cho(200);
    this._draw = null; this._lop = null;
    await di({ path: '/draw', query: { drawType: kieu } });
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      await cho(200);
      const cc = this.cc();
      if (!cc || cc === cu) continue;
      if (!this.sanSang().ok) continue;
      const tt = this.trangThai();
      if (tt && !tt.dang_tai && !tt.ma_don && this.dsHeNhom().length) { await cho(300); return { vao_lai: true, ms: Date.now() - t0 }; }
    }
    throw new Error('Mở đơn hàng mới quá 25 giây chưa xong — vào Trang chủ → Thiết kế bằng tay rồi thử lại.');
  };
  /** Mở trang chi tiết đơn hàng trong WindoorCraft */
  D.moDon = function (ma_don) {
    const d = this.trangVe();
    const goc = this.win.document && this.win.document.querySelector('#app');
    const r = (d && d.$router) || (goc && goc.__vue__ && goc.__vue__.$router);
    if (!r || !ma_don) return false;
    try { const p = r.push({ name: 'orders.group-detail', params: { id: ma_don } }); if (p && typeof p.catch === 'function') p.catch(() => {}); } catch (e) { return false; }
    return true;
  };
  // ------------------------------------------------------------------ đi tiếp sau khi đơn đã lưu (chỉ mở trang của WindoorCraft, không ghi gì)
  /** Các bộ cửa của đơn đang mở, đọc từ dải "Bản vẽ" của WindoorCraft: [{id, ky_hieu, so_luong}] — rỗng nếu đơn khác hoặc chưa nạp */
  D.dsBoCuaDon = function (ma_don) {
    const d = this.trangVe();
    const q = (d && d.$route && d.$route.query) || {};
    if (!d || !q.contract_id || (ma_don && String(q.contract_id) !== String(ma_don))) return [];
    const rc = d.$refs && d.$refs.right_card;
    const pl = rc && rc.$refs && rc.$refs.paper_list;
    return ((pl && pl.list) || []).filter((x) => x && x.id).map((x) => ({ id: x.id, ky_hieu: String(x.window_no || ''), so_luong: Number(x.count) || 1 }));
  };
  /** Bản vẽ đang mở có phần chưa lưu không */
  D.chuaLuu = function () {
    const cc = this.cc();
    const sm = cc && cc.shapeManager;
    return !!(sm && !sm.isEmpty && sm.isDirty);
  };
  /**
   * Địa chỉ trang In của WindoorCraft cho một đơn (báo giá, bản vẽ sản xuất, danh sách kính, phụ kiện…),
   * dựng đúng như nút "In" ở trang đơn hàng của họ (xem 08/10/2026). Trả '' nếu chưa đủ thông tin.
   */
  D.diaChiIn = function (ma_don) {
    const doc = this.win.document;
    const app = doc && doc.querySelector && doc.querySelector('#app');
    const vm = app && app.__vue__;
    const nd = vm && vm.$store && vm.$store.state && vm.$store.state.userinfo;
    const bo = this.dsBoCuaDon(ma_don);
    if (!ma_don || !nd || !nd.id || !nd.company_id || !bo.length) return '';
    const e = encodeURIComponent;
    const goc = (this.win.location && this.win.location.origin) || '';
    return goc + '/printer?contract_id=' + e(ma_don) + '&order_id=' + bo.map((b) => e(b.id)).join(',') + '&company_id=' + e(nd.company_id) + '&lang=' + e((vm.$i18n && vm.$i18n.locale) || 'vi-VN') + '&son_account_type=' + e(nd.son_account_type === undefined || nd.son_account_type === null ? '' : nd.son_account_type) + '&user_id=' + e(nd.id);
  };
  /** Mở trang In ở thẻ mới. Trả false nếu chưa dựng được địa chỉ — khi đó mở trang đơn hàng rồi bấm In ở đó. */
  D.moIn = function (ma_don) {
    const dc = this.diaChiIn(ma_don);
    if (!dc || typeof this.win.open !== 'function') return false;
    this.win.open(dc, '_blank');
    return true;
  };
  /** Mở trang Tối ưu cắt nhôm của WindoorCraft cho một đơn (như nút "Tối ưu" ở trang đơn hàng) */
  D.moToiUu = function (ma_don) {
    const d = this.trangVe();
    const app = this.win.document && this.win.document.querySelector('#app');
    const r = (d && d.$router) || (app && app.__vue__ && app.__vue__.$router);
    if (!r || !ma_don) return false;
    const q = { contract_ids: String(ma_don) };
    const bo = this.dsBoCuaDon(ma_don);
    if (bo.length) q.count = bo.reduce((a, b) => a + b.so_luong, 0);
    try { const p = r.push({ name: 'orders.cutOptimizer', query: q }); if (p && typeof p.catch === 'function') p.catch(() => {}); } catch (e) { return false; }
    return true;
  };
  /** Mở trang Thiết kế (khi đang ở trang khác của WindoorCraft) */
  D.moThietKe = function () {
    const goc = this.win.document && this.win.document.querySelector('#app');
    const r = goc && goc.__vue__ && goc.__vue__.$router;
    if (!r) return false;
    try { const p = r.push({ path: '/draw', query: { drawType: '2' } }); if (p && typeof p.catch === 'function') p.catch(() => {}); } catch (e) { return false; }
    return true;
  };
  /** Đã đăng nhập WindoorCraft chưa (có ứng dụng Vue và không ở trang đăng nhập) */
  D.daDangNhap = function () {
    const goc = this.win.document && this.win.document.querySelector('#app');
    const vm = goc && goc.__vue__;
    const ten = vm && vm.$route && vm.$route.name;
    return !!vm && !!ten && ['login', 'register', 'messagelogin', 'messagelogin-code', 'forgot-password', 'loading', 'device-login'].indexOf(ten) < 0;
  };

  M.Driver = Driver;
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ===== src/mnwd-ui.js =====
/* Một Nhà · Vẽ cửa — BẢNG ĐIỀU KHIỂN (chạy trong trang WindoorCraft)
 * Một bảng nổi, 3 thẻ: Vẽ nhanh · Danh sách · Cài đặt. Viết bằng DOM thuần trong Shadow DOM để CSS hai bên không lẫn nhau.
 */
(function (G) {
  'use strict';
  const M = G.MNWD = G.MNWD || {};
  const KHO = { cd: 'mnwd.caidat', ds: 'mnwd.danhsach', f: 'mnwd.form', vt: 'mnwd.vitri' };

  const CSS = `
:host{all:initial}
*{box-sizing:border-box}
.goc{font:13px/1.4 "Segoe UI",system-ui,-apple-system,Arial,sans-serif;color:#1c2733;pointer-events:none;position:fixed;inset:0;z-index:150}
.mo,.bang{pointer-events:auto}
.mo{position:fixed;left:150px;top:7px;height:28px;padding:0 12px 0 9px;border:0;border-radius:14px;background:#17365d;color:#fff;font:600 12.5px/28px "Segoe UI",system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 6px rgba(16,36,64,.3);display:flex;align-items:center;gap:6px;white-space:nowrap}
.mo:hover{background:#1f4a7c}
.mo svg{display:block}
.bang{position:fixed;left:212px;top:52px;width:436px;max-height:calc(100vh - 64px);background:#fff;border:1px solid #c5cedb;border-radius:10px;box-shadow:0 10px 34px rgba(16,36,64,.28);display:flex;flex-direction:column;overflow:hidden}
.bang.an{display:none}
.bang.haicot{width:880px}
.bang.haicot .hai{display:grid;grid-template-columns:412px minmax(0,1fr);gap:18px;align-items:start}
.bang.haicot .cot-phai{position:sticky;top:0}
.bang.haicot .cot-phai .xem{margin-top:0}
.bang.haicot section[data-s=cd]{max-width:640px}
.dau{background:#17365d;color:#fff;padding:7px 8px 7px 12px;display:flex;align-items:center;gap:8px;cursor:move;user-select:none}
.dau b{font-size:13px;font-weight:600;letter-spacing:.1px}
.dau .pb{font-size:11px;opacity:.7}
.dau .gian{flex:1}
.dau button{width:26px;height:24px;border:0;border-radius:5px;background:transparent;color:#fff;font-size:15px;line-height:1;cursor:pointer}
.dau button:hover{background:rgba(255,255,255,.18)}
.the{display:flex;border-bottom:1px solid #dde3ec;background:#f5f7fa}
.the button{flex:1;height:32px;border:0;background:transparent;font:inherit;color:#4a5a70;cursor:pointer;border-bottom:2px solid transparent}
.the button.chon{color:#17365d;font-weight:600;border-bottom-color:#17365d;background:#fff}
.than{overflow:auto;padding:10px 12px 12px;flex:1;min-height:120px}
.than.gon{display:none}
.chan{border-top:1px solid #dde3ec;background:#f5f7fa;padding:5px 12px;font-size:11.5px;color:#56657a;display:flex;gap:8px;align-items:center;min-height:26px}
.chan .cham{width:8px;height:8px;border-radius:50%;background:#9aa7b8;flex:none}
.chan .cham.tot{background:#2e9e5b}.chan .cham.xau{background:#d0832a}
.chan .chu{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
section{display:none}section.hien{display:block}
h4{margin:12px 0 6px;font-size:11px;font-weight:700;color:#5b6a80;text-transform:uppercase;letter-spacing:.5px}
h4:first-child{margin-top:0}
label{font-size:12px;color:#4a5a70;white-space:nowrap}
input[type=text],select,textarea{height:28px;border:1px solid #b8c2cf;border-radius:5px;padding:0 7px;font:inherit;color:#1c2733;background:#fff;min-width:0;width:100%}
textarea{height:auto;padding:6px 7px;resize:vertical;font-family:Consolas,"Courier New",monospace;font-size:12px}
input[type=text]:focus,select:focus,textarea:focus{outline:2px solid rgba(23,54,93,.25);border-color:#17365d}
input.so{text-align:right}
input.sai{border-color:#c0392b;background:#fdf1ef}
.hang{display:flex;gap:6px;align-items:center;margin-bottom:6px}
.hang>label{flex:none;width:74px}
.hang .o{flex:1;min-width:0}
.hang .hep{flex:none;width:64px}
.hang .vua{flex:none;width:84px}
.hang .nhan{flex:none;font-size:12px;color:#5b6a80}
.khoa{display:inline-flex;border:1px solid #b8c2cf;border-radius:5px;overflow:hidden;height:28px}
.khoa button{border:0;background:#fff;font:inherit;padding:0 9px;color:#4a5a70;cursor:pointer;border-right:1px solid #d4dbe5;white-space:nowrap}
.khoa button:last-child{border-right:0}
.khoa button.chon{background:#17365d;color:#fff}
.nut{height:30px;padding:0 12px;border:1px solid #b8c2cf;border-radius:6px;background:#fff;font:inherit;color:#1c2733;cursor:pointer;white-space:nowrap}
.nut:hover{background:#f0f3f7}
.nut.chinh{background:#17365d;border-color:#17365d;color:#fff;font-weight:600}
.nut.chinh:hover{background:#1f4a7c}
.nut.nho{height:24px;padding:0 8px;font-size:12px}
.nut.nguy{color:#b03a2e;border-color:#e0b4ae}
.nut[disabled]{opacity:.5;cursor:default}
.nhom{display:flex;gap:5px;margin-bottom:7px;flex-wrap:wrap}
.nhom button{height:24px;padding:0 10px;border:1px solid #c5cedb;border-radius:12px;background:#fff;font:inherit;font-size:12px;color:#4a5a70;cursor:pointer}
.nhom button.chon{background:#e6edf6;border-color:#17365d;color:#17365d;font-weight:600}
.luoi{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;max-height:172px;overflow:auto;padding:1px;margin-bottom:8px}
.mau{border:1px solid #d4dbe5;border-radius:6px;background:#fff;padding:4px 2px 3px;cursor:pointer;text-align:center;font:inherit;color:#1c2733;min-width:0}
.mau:hover{border-color:#8fa3bd;background:#f7f9fc}
.mau.chon{border-color:#17365d;box-shadow:0 0 0 1px #17365d inset;background:#eef3f9}
.mau .h{height:46px;display:flex;align-items:center;justify-content:center}
.mau .t{font-size:10.5px;line-height:1.2;color:#4a5a70;height:25px;overflow:hidden;margin-top:2px}
.mau .t b{color:#17365d}
.xem{border:1px solid #dde3ec;border-radius:8px;background:#fbfcfe;padding:6px 6px 4px;margin:8px 0 6px;text-align:center}
.xem .mt{font-size:12px;color:#33435a;margin-top:2px}
.xem .mt b{color:#17365d}
.tb{border-radius:6px;padding:6px 9px;margin:6px 0;font-size:12px;line-height:1.45}
.tb.cb{background:#fff6e5;border:1px solid #efd193;color:#6f4a00}
.tb.loi{background:#fdecea;border:1px solid #eeb4ad;color:#8a2219}
.tb.tot{background:#e9f6ee;border:1px solid #a9d8b9;color:#1d5c37}
.tb.hoi{background:#eef3f9;border:1px solid #b9c9de;color:#17365d}
.tb ul{margin:0;padding-left:16px}
.tb .nuts{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
.viec{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.viec .nut.chinh{flex:1}
details{border:1px solid #dde3ec;border-radius:7px;margin:6px 0;background:#fbfcfe}
summary{cursor:pointer;padding:6px 9px;font-size:12px;color:#33435a;font-weight:600;user-select:none}
details .trong{padding:2px 9px 6px}
.nho2{font-size:11.5px;color:#6a788c;line-height:1.4}
table{border-collapse:collapse;width:100%;font-size:12px}
th{font-weight:600;color:#5b6a80;text-align:left;padding:4px 5px;border-bottom:1px solid #d4dbe5;white-space:nowrap;font-size:11px;text-transform:uppercase;letter-spacing:.3px}
td{padding:4px 5px;border-bottom:1px solid #ebeff4;vertical-align:middle}
td.s,th.s{text-align:right;white-space:nowrap}
tr.dang td{background:#eef3f9}
.tt{display:inline-block;padding:1px 7px;border-radius:9px;font-size:11px;white-space:nowrap}
.tt.cho{background:#eef1f5;color:#56657a}.tt.da_ve{background:#e6edf6;color:#17365d}.tt.da_luu{background:#e3f4ea;color:#1d5c37}.tt.loi{background:#fdecea;color:#8a2219}
.lien{border:0;background:none;color:#17365d;font:inherit;font-size:12px;cursor:pointer;padding:0 3px;text-decoration:underline}
.lien.xoa{color:#b03a2e}
.chua-co{color:#7b8799;text-align:center;padding:18px 8px;font-size:12.5px;line-height:1.5}
.tien{height:6px;border-radius:3px;background:#e2e8f0;overflow:hidden;margin:6px 0}
.tien i{display:block;height:100%;background:#17365d;width:0}
.cd-luoi{display:grid;grid-template-columns:1fr 70px 70px;gap:5px 6px;align-items:center}
.cd-luoi.b4{grid-template-columns:1fr 58px 58px 58px 58px}
.cd-luoi .tieu{font-size:11px;color:#6a788c;text-align:right}
.cd-luoi .tieu:first-child{text-align:left}
.tudo{border:1px solid #f0c9a4;background:#fffaf4;border-radius:7px;padding:7px 9px;margin:4px 0 8px}
.tudo .nuts{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}
.tudo b.cam{color:#b8570f}
.xem svg rect[data-o]:hover{fill-opacity:.08}
.gia{margin-top:6px;padding-top:6px;border-top:1px dashed #a9d8b9;width:100%}
.ct-gia{margin:5px 0 0;background:#fff}.ct-gia table{font-size:11.5px}.ct-gia td{padding:2px 5px}
.tong-gia{margin:8px 0 0;padding:7px 9px;border-radius:6px;background:#eef3f9;border:1px solid #b9c9de;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.tong-gia.sx{background:#f3f7f1;border-color:#c5d8bd}
.dau button.khoa.dang{background:#f6e3b4;border-radius:4px}
.tong-gia b.lon{font-size:15px;color:#17365d}
`;

  const h = (the, tt, con) => {
    const e = document.createElement(the);
    if (tt) for (const k in tt) {
      if (k === 'class') e.className = tt[k];
      else if (k === 'html') e.innerHTML = tt[k];
      else if (k === 'text') e.textContent = tt[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), tt[k]);
      else if (tt[k] !== undefined && tt[k] !== null && tt[k] !== false) e.setAttribute(k, tt[k] === true ? '' : tt[k]);
    }
    (con || []).forEach((c) => { if (c !== null && c !== undefined && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  };
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const doc = (k, md) => { try { const v = G.localStorage.getItem(k); return v ? JSON.parse(v) : md; } catch (e) { return md; } };
  const ghi = (k, v) => { try { G.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* đầy bộ nhớ / chế độ ẩn danh */ } };
  const cho = (ms) => new Promise((r) => setTimeout(r, ms));
  /** D1 → D2, S09 → S10, "Cửa A" → "Cửa A" */
  M.kyHieuKe = function (s) {
    const m = String(s || '').match(/^(.*?)(\d+)(\D*)$/);
    if (!m) return String(s || '');
    const n = String(Number(m[2]) + 1);
    return m[1] + (m[2].length > n.length ? '0'.repeat(m[2].length - n.length) + n : n) + m[3];
  };
  /**
   * Gợi ý hệ nhôm cho một mẫu theo tên hệ trong tài khoản; không chắc thì null. Chỉ là gợi ý — người dùng phải xác nhận.
   * Ưu tiên hệ cùng nhóm với hệ đứng đầu danh mục (nhóm xưởng dùng nhiều nhất) để cả đơn hàng cùng một dòng nhôm.
   */
  M.goiYHeNhom = function (mau, ds) {
    ds = ds || [];
    const c = (mau.cau_hinh && mau.cau_hinh.chinh) || {};
    const k = c.kieu || 'fix';
    const ten = (p) => M.boDau(p.ten);
    const nhom_chinh = ds.length ? ds[0].nhom : '';
    const loc = (d, re, khong) => d.filter((p) => re.test(ten(p)) && !(khong && khong.test(ten(p))))[0] || null;
    const tim = (re, khong) => loc(ds.filter((p) => p.nhom === nhom_chinh), re, khong) || loc(ds, re, khong);
    let p = null;
    if (k === 'xep') p = tim(/xep truot/);
    else if (k === 'lua') p = mau.nhom === 'cua_di' ? tim(/cua lua/, /cua so/) : tim(/cua so lua/);
    else if (mau.nhom === 'cua_di') p = tim(/cua di mo quay/, /cua so/);
    else if (k === 'fix' || mau.nhom === 'vach') p = tim(/vach kinh/);
    else { // cửa sổ mở quay / mở hất: hệ cửa sổ riêng → hệ vách kính có cánh mở → hệ có chữ "cửa sổ mở"
      const cs = /cua so mo|cua so.*(quay|hat)/;
      p = loc(ds.filter((x) => x.nhom === nhom_chinh), cs, /cua di/) || loc(ds.filter((x) => x.nhom === nhom_chinh), /vach kinh.*canh mo/) || loc(ds, cs, /cua di/) || loc(ds, /vach kinh.*canh mo/) || loc(ds, cs);
    }
    return p ? p.id : null;
  };

  function UI(dr) {
    this.dr = dr;
    this.cd = M.gopCaiDat(doc(KHO.cd, null));
    this.ds = doc(KHO.ds, []) || [];
    this.f = M.chuanHoa(doc(KHO.f, null) || M.apMau({}, M.timMau('D2QT')), this.cd);
    this.the = 've';
    this.nhom = this.f.loai || 'cua_di';
    this.mo = false; this.gon = false;
    this.ban = null;            // việc đang chạy
    this.kq = null;             // kết quả lần vẽ gần nhất {loai,html}
    this.hoi = null;            // câu hỏi xác nhận đang chờ
    this.dang_mo = null;        // id dòng danh sách đang nằm trên bản vẽ
    this.ban_ve_cua_toi = '';   // dấu bản vẽ do bảng này vừa vẽ
    this.anh = {};               // ảnh WindoorCraft của từng dòng (chỉ giữ trong phiên, không ghi vào trình duyệt)
    this.lo = null;             // tiến độ vẽ & lưu hàng loạt
    this.sua = null;            // id dòng đang sửa trong form
    this.e = {};
    this._id = 0;
  }
  const U = UI.prototype;

  // ------------------------------------------------------------------ dựng khung
  U.gan = function () {
    if (this.host && this.host.isConnected) return;
    const host = this.host = document.createElement('div');
    host.id = 'mnwd-host';
    const sh = this.sh = host.attachShadow({ mode: 'open' });
    sh.appendChild(h('style', { text: CSS }));
    const goc = this.goc = h('div', { class: 'goc' });
    sh.appendChild(goc);
    const self = this;
    this.e.nut_mo = h('button', { class: 'mo', title: 'Mở bảng Vẽ cửa', onclick: () => self.batTat(true), html: '<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1.5" y="1.5" width="13" height="13" fill="none" stroke="#fff" stroke-width="1.6"/><line x1="8" y1="1.5" x2="8" y2="14.5" stroke="#fff" stroke-width="1.3"/><line x1="1.5" y1="5.5" x2="14.5" y2="5.5" stroke="#fff" stroke-width="1.3"/></svg><span>Một Nhà · Vẽ cửa</span>' });
    goc.appendChild(this.e.nut_mo);
    const bang = this.e.bang = h('div', { class: 'bang an' });
    this.e.dau = h('div', { class: 'dau' }, [
      h('b', { text: 'Một Nhà · Vẽ cửa' }), h('span', { class: 'pb', text: 'v' + M.PHIEN_BAN }), h('span', { class: 'gian' }),
      (this.e.nut_khoa = h('button', { class: 'khoa', title: '', text: '🔓', onclick: () => self.bamKhoa() })),
      h('button', { title: 'Đổi bảng 1 cột / 2 cột', text: '◫', onclick: () => { self.datRong(!self.rong_bang, true); } }),
      h('button', { title: 'Thu gọn / mở rộng', text: '–', onclick: () => { self.gon = !self.gon; self.e.than.classList.toggle('gon', self.gon); self.e.the.style.display = self.gon ? 'none' : ''; } }),
      h('button', { title: 'Đóng bảng', text: '×', onclick: () => self.batTat(false) }),
    ]);
    this.e.the = h('div', { class: 'the' });
    [['ve', 'Vẽ nhanh'], ['ds', 'Danh sách'], ['cd', 'Cài đặt']].forEach((t) => {
      self.e.the.appendChild(h('button', { 'data-the': t[0], text: t[1], onclick: () => self.doiThe(t[0]) }));
    });
    this.e.than = h('div', { class: 'than' });
    this.e.s = { ve: h('section', { 'data-s': 've' }), ds: h('section', { 'data-s': 'ds' }), cd: h('section', { 'data-s': 'cd' }) };
    this.e.than.appendChild(this.e.s.ve); this.e.than.appendChild(this.e.s.ds); this.e.than.appendChild(this.e.s.cd);
    this.e.mo_tk = h('button', { class: 'nut nho', style: 'display:none', text: 'Mở Thiết kế', onclick: () => self.dr.moThietKe() });
    this.e.chan = h('div', { class: 'chan' }, [h('span', { class: 'cham' }), h('span', { class: 'chu' }), this.e.mo_tk]);
    bang.appendChild(this.e.dau); bang.appendChild(this.e.the); bang.appendChild(this.e.than); bang.appendChild(this.e.chan);
    goc.appendChild(bang);
    document.body.appendChild(host);
    this._keo();
    // Phím gõ trong bảng không được lọt xuống phím tắt của WindoorCraft (F, V, S, D… đổi công cụ vẽ)
    this._chan_phim = function (ev) { const p = ev.composedPath ? ev.composedPath() : []; if (p.indexOf(host) >= 0) ev.stopPropagation(); };
    ['keydown', 'keyup', 'keypress'].forEach((k) => G.addEventListener(k, self._chan_phim, true));
    // đổi cỡ cửa sổ → WindoorCraft tự canh bản vẽ về giữa màn hình (dưới bảng này) → đợi nó xong rồi đưa ra chỗ trống lại
    this._khi_doi_co = function () { G.clearTimeout(self._hen_co); self._hen_co = G.setTimeout(() => { if (self.host && !self.ban && !self.lo) self.duaRaChoTrong(); }, 300); };
    G.addEventListener('resize', this._khi_doi_co);
    const vt = doc(KHO.vt, null);
    this.datRong(vt && typeof vt.rong === 'boolean' ? vt.rong : (G.innerWidth || 0) >= 1560, false);
    if (vt && typeof vt.x === 'number') this._datViTri(vt.x, vt.y);
    this.dungVe(); this.dungDs(); this.dungCd(); this.veKhoa();
    this.doiThe(this.the);
    this._nhip = G.setInterval(() => self.nhip(), 1200);
    this.nhip();
  };
  U.thao = function () {
    if (this._nhip) G.clearInterval(this._nhip);
    const self = this;
    ['keydown', 'keyup', 'keypress'].forEach((k) => G.removeEventListener(k, self._chan_phim, true));
    G.removeEventListener('resize', this._khi_doi_co); G.clearTimeout(this._hen_co);
    if (this.host && this.host.parentNode) this.host.parentNode.removeChild(this.host);
    this.host = null;
  };
  U.batTat = function (mo) {
    this.mo = mo;
    this.e.bang.classList.toggle('an', !mo);
    this._hienNutMo();
    if (mo) { this.napHeNhom(); this.capNhatXem(); this.nhip(); }
  };
  /** Nút mở bảng nằm trên thanh trên cùng, chỉ hiện ở trang Thiết kế (trang In, trang đơn hàng… không cần, kẻo che nút của WindoorCraft) */
  U._hienNutMo = function () {
    let o_trang_ve = false;
    try { const d = this.dr.trangVe(); const ten = d && d.$route && d.$route.name; o_trang_ve = !!this.dr.cc() && (ten === 'draw' || ten === 'trial'); } catch (e) { o_trang_ve = false; }
    this.e.nut_mo.style.display = !this.mo && o_trang_ve ? '' : 'none';
  };
  U.doiThe = function (t) {
    this.the = t;
    Array.prototype.forEach.call(this.e.the.children, (b) => b.classList.toggle('chon', b.getAttribute('data-the') === t));
    for (const k in this.e.s) this.e.s[k].classList.toggle('hien', k === t);
    if (t === 'ds') this.veDs();
    if (t === 'cd') this.dungCd();
    if (t === 've') { this.napHeNhom(); this.capNhatXem(); }
  };
  U.datRong = function (rong, nho) {
    this.rong_bang = !!rong;
    this.e.bang.classList.toggle('haicot', this.rong_bang);
    if (nho) { const r = this.e.bang.getBoundingClientRect(); ghi(KHO.vt, { x: r.left, y: r.top, rong: this.rong_bang }); }
    if (this.e.xem) this.capNhatXem();
  };
  U._datViTri = function (x, y) {
    const b = this.e.bang;
    const W = G.innerWidth || 1200, H = G.innerHeight || 800;
    x = Math.max(0, Math.min(x, W - 120)); y = Math.max(0, Math.min(y, H - 40));
    b.style.left = x + 'px'; b.style.top = y + 'px';
  };
  U._keo = function () {
    const self = this, d = this.e.dau;
    let bd = null;
    d.addEventListener('mousedown', (ev) => {
      if (ev.target.tagName === 'BUTTON') return;
      const r = self.e.bang.getBoundingClientRect();
      bd = { dx: ev.clientX - r.left, dy: ev.clientY - r.top };
      ev.preventDefault();
    });
    G.addEventListener('mousemove', (ev) => { if (bd) self._datViTri(ev.clientX - bd.dx, ev.clientY - bd.dy); });
    G.addEventListener('mouseup', () => { if (bd) { const r = self.e.bang.getBoundingClientRect(); ghi(KHO.vt, { x: r.left, y: r.top, rong: self.rong_bang }); bd = null; } });
  };

  // ------------------------------------------------------------------ thanh trạng thái (đọc WindoorCraft mỗi 1,2 giây)
  U.nhip = function () {
    if (!this.host || !this.host.isConnected) return;
    this._hienNutMo();
    let tt = null;
    try { tt = this.dr.sanSang().ok ? this.dr.trangThai() : null; } catch (e) { tt = null; }
    this.tt = tt;
    const cham = this.e.chan.children[0], chu = this.e.chan.children[1];
    this.e.mo_tk.style.display = tt ? 'none' : '';
    if (!tt) {
      cham.className = 'cham xau';
      let ly = 'Chưa mở trang Thiết kế của WindoorCraft';
      try { ly = this.dr.sanSang().ly_do || ly; } catch (e) { /* giữ câu mặc định */ }
      chu.textContent = ly;
    } else {
      cham.className = 'cham tot';
      const p = [];
      p.push(tt.he_nhom && tt.he_nhom.ten ? tt.he_nhom.ten : 'Chưa chọn hệ nhôm');
      if (tt.ma_don) p.push('Đơn #' + tt.ma_don);
      p.push(tt.trong ? 'bản vẽ trống' : (tt.ma_bo ? 'bộ ' + (tt.ky_hieu || '') + ' đã lưu' : 'bộ ' + (tt.ky_hieu || '') + ' chưa lưu'));
      chu.textContent = p.join(' · ');
      chu.title = chu.textContent;
      // người dùng tự bấm "Lưu lại" → đánh dấu dòng danh sách đang mở là đã lưu
      if (this.dang_mo && !this.lo && tt.ma_bo && !this.ban) {
        const d = this.timDong(this.dang_mo);
        if (d && d.trang_thai === 'da_ve') { d.trang_thai = 'da_luu'; d.ma_bo = tt.ma_bo; d.ma_don = tt.ma_don; this.luuDs(); if (this.the === 'ds') this.veDs(); this.demDs(); }
        this.dang_mo = null;
      }
      // lưu xong WindoorCraft tự canh bản vẽ về giữa màn hình (dưới bảng này) → đưa ra chỗ trống lần nữa
      const cu = this._tt_cu;
      if (cu && !this.lo && !this.ban && !tt.trong && !tt.dang_luu && (cu.dang_luu || (tt.ma_bo && tt.ma_bo !== cu.ma_bo))) this.duaRaChoTrong();
      this._tt_cu = { dang_luu: !!tt.dang_luu, ma_bo: tt.ma_bo };
    }
    if (this.mo && this.the === 've' && !this._da_nap_he && tt) this.napHeNhom();
    if (this.mo && this.the === 've' && tt && !tt.dang_tai) { const truoc = this._dau_kinh; this.napKinh(); if (truoc !== this._dau_kinh && this.f.kinh) this.capNhatXem(); }
  };

  // ------------------------------------------------------------------ THẺ VẼ NHANH
  U.dungVe = function () {
    const self = this, e = this.e;
    let s = this.e.s.ve;
    s.textContent = '';
    const cot_trai = h('div', { class: 'cot-trai' }), cot_phai = h('div', { class: 'cot-phai' });
    const goc_s = s;
    goc_s.appendChild(h('div', { class: 'hai' }, [cot_trai, cot_phai]));
    s = cot_trai; // các ô nhập nằm cột trái; hình xem trước + nút nằm cột phải
    const o = (id, tt) => { const i = h('input', Object.assign({ type: 'text', autocomplete: 'off', spellcheck: 'false' }, tt || {})); e[id] = i; i.addEventListener('input', () => self.docForm()); return i; };
    const chon = (id, ds, tt) => { const c = h('select', tt || {}, ds.map((x) => h('option', { value: x[0], text: x[1] }))); e[id] = c; c.addEventListener('change', () => self.docForm(true)); return c; };
    const khoa = (id, ds) => { const k = h('span', { class: 'khoa' }, ds.map((x) => h('button', { type: 'button', 'data-v': x[0], text: x[1], onclick: () => { self._datKhoa(id, x[0]); self.docForm(true); } }))); e[id] = k; return k; };

    // mẫu
    e.nhom = h('div', { class: 'nhom' });
    e.luoi = h('div', { class: 'luoi' });
    s.appendChild(h('h4', { text: 'Mẫu cửa' }));
    s.appendChild(e.nhom); s.appendChild(e.luoi);

    // kích thước
    s.appendChild(h('h4', { text: 'Kích thước (mm)' }));
    s.appendChild(h('div', { class: 'hang' }, [
      h('label', { text: 'Rộng × Cao' }), h('span', { class: 'vua' }, [o('rong', { class: 'so', inputmode: 'decimal', placeholder: 'rộng' })]), h('span', { class: 'nhan', text: '×' }),
      h('span', { class: 'vua' }, [o('cao', { class: 'so', inputmode: 'decimal', placeholder: 'cao' })]), h('span', { class: 'gian' }), khoa('kieu_so', [['phu_bi', 'Phủ bì'], ['o_cho', 'Ô chờ']]),
    ]));
    e.khe = h('div', { class: 'nho2', style: 'margin:-2px 0 6px 80px' });
    s.appendChild(e.khe);

    // cấu tạo
    s.appendChild(h('h4', { text: 'Cấu tạo' }));
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'Loại' }), khoa('loai', [['cua_di', 'Cửa đi'], ['cua_so', 'Cửa sổ'], ['vach', 'Vách kính']])]));
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'Hình thái' }), khoa('hinh_thai', [['mau', 'Theo mẫu'], ['tu_do', 'Tự chia ô']])]));
    e.tudo = h('div', { class: 'tudo', style: 'display:none' });
    s.appendChild(e.tudo);
    const vung_s = e.vung_mau = h('div');
    s.appendChild(vung_s);
    const s_goc = s;
    s = vung_s;
    e.h_chinh = h('div', { class: 'hang' }, [
      h('label', { text: 'Phần chính' }),
      h('span', { class: 'o' }, [chon('c_kieu', M.KIEU_CHINH.map((k) => [k, M.KIEU[k]]))]),
      e.b_so = h('span', { class: 'hang', style: 'margin:0;flex:none' }, [h('span', { class: 'nhan', text: 'số ô' }), h('span', { class: 'hep', style: 'width:42px' }, [o('c_so', { class: 'so', inputmode: 'numeric' })])]),
      e.b_huong = h('span', { style: 'flex:none;width:96px' }, [chon('c_huong', [['doi_xung', 'Lề đối xứng'], ['trai', 'Lề trái'], ['phai', 'Lề phải']])]),
      e.b_canh = h('span', { class: 'hang', style: 'margin:0;flex:none' }, [h('span', { class: 'nhan', text: 'số cánh' }), h('span', { class: 'hep', style: 'width:42px' }, [o('c_canh', { class: 'so', inputmode: 'numeric' })])]),
      e.b_xep = h('span', { class: 'hang', style: 'margin:0;flex:none' }, [h('span', { class: 'nhan', text: 'trái' }), h('span', { style: 'width:36px' }, [o('c_xt', { class: 'so', inputmode: 'numeric' })]), h('span', { class: 'nhan', text: '+ phải' }), h('span', { style: 'width:36px' }, [o('c_xp', { class: 'so', inputmode: 'numeric' })])]),
    ]);
    s.appendChild(e.h_chinh);
    s.appendChild(h('div', { class: 'hang' }, [
      e.l_tren = h('label', { text: 'Ô thoáng' }), h('span', { class: 'hep' }, [o('t_cao', { class: 'so', inputmode: 'decimal', placeholder: 'cao' })]),
      h('span', { style: 'flex:none;width:70px' }, [chon('t_kieu', [['fix', 'Fix'], ['hat', 'Hất']])]),
      h('span', { class: 'nhan', text: 'số ô' }), h('span', { style: 'flex:none;width:42px' }, [o('t_so', { class: 'so', inputmode: 'numeric', title: '0 = chia theo các đố đứng bên dưới' })]),
      e.t_goi = h('span', { class: 'nho2 o' }),
    ]));
    s.appendChild(h('div', { class: 'hang' }, [
      h('label', { text: 'Vách trái' }), h('span', { class: 'hep' }, [o('l_rong', { class: 'so', inputmode: 'decimal', placeholder: 'rộng' })]),
      h('span', { style: 'flex:none;width:70px' }, [chon('l_kieu', [['fix', 'Fix'], ['quay', 'Quay'], ['hat', 'Hất']])]),
      h('span', { class: 'nhan', text: 'phải' }), h('span', { class: 'hep' }, [o('r_rong', { class: 'so', inputmode: 'decimal', placeholder: 'rộng' })]),
      h('span', { style: 'flex:none;width:70px' }, [chon('r_kieu', [['fix', 'Fix'], ['quay', 'Quay'], ['hat', 'Hất']])]),
    ]));
    s.appendChild(h('div', { class: 'hang' }, [
      h('label', { text: 'Ô dưới' }), h('span', { class: 'hep' }, [o('d_cao', { class: 'so', inputmode: 'decimal', placeholder: 'cao' })]),
      h('span', { class: 'nhan', text: 'số ô' }), h('span', { style: 'flex:none;width:42px' }, [o('d_so', { class: 'so', inputmode: 'numeric', title: '0 = chia theo các đố đứng bên trên' })]),
      h('span', { class: 'nho2 o', text: 'Các số đo tính tới tim đố' }),
    ]));
    s = s_goc;
    e.nang_cao = h('details', null, [
      h('summary', { text: 'Tuỳ chọn thêm: đố suốt, khung, chiều mở, kiểu lùa' }),
      h('div', { class: 'trong' }, [
        h('div', { class: 'hang' }, [h('label', { text: 'Đố suốt' }), khoa('do_suot', [['ngang', 'Đố ngang suốt'], ['dung', 'Đố đứng suốt']])]),
        h('div', { class: 'hang' }, [h('label', { text: 'Khung' }), khoa('khung', [['tu_dong', 'Tự động'], ['4_canh', '4 cạnh'], ['3_canh', '3 cạnh (không thanh dưới)']])]),
        h('div', { class: 'hang' }, [h('label', { text: 'Chiều mở' }), khoa('mo', [['mac_dinh', 'Theo hệ nhôm'], ['ngoai', 'Ra ngoài'], ['trong', 'Vào trong']])]),
        e.h_lua = h('div', { class: 'hang' }, [h('label', { text: 'Kiểu lùa' }), h('span', { class: 'o' }, [chon('lua_kieu', [['', 'Tự chọn theo số cánh']])])]),
      ]),
    ]);
    s.appendChild(e.nang_cao);

    // hệ nhôm + thông tin đơn
    s.appendChild(h('h4', { text: 'Hệ nhôm và thông tin bộ cửa' }));
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'Hệ nhôm' }), h('span', { class: 'o' }, [chon('he_nhom', [['', 'Giữ hệ đang chọn trong WindoorCraft']])])]));
    e.he_goi = h('div', { class: 'nho2', style: 'margin:-2px 0 6px 80px' });
    s.appendChild(e.he_goi);
    s.appendChild(h('div', { class: 'hang' }, [
      h('label', { text: 'Ký hiệu' }), h('span', { class: 'hep' }, [o('ky_hieu', { placeholder: 'D1' })]),
      h('span', { class: 'nhan', text: 'SL' }), h('span', { style: 'flex:none;width:42px' }, [o('so_luong', { class: 'so', inputmode: 'numeric' })]),
      h('span', { class: 'nhan', text: 'Vị trí' }), h('span', { class: 'o' }, [o('vi_tri', { placeholder: 'Phòng khách…' })]),
    ]));
    e.ds_kinh = h('datalist', { id: 'mnwd-ds-kinh' });
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'Kính' }), h('span', { class: 'o' }, [o('kinh', { placeholder: 'để trống = loại mặc định của hệ nhôm', list: 'mnwd-ds-kinh', title: 'Tên loại kính đúng như ô Kính của WindoorCraft (gõ vài chữ để chọn trong danh mục của hệ đang mở)' })]), e.ds_kinh]));
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'Ghi chú' }), h('span', { class: 'o' }, [o('ghi_chu')])]));

    // xem trước + thông báo + nút
    e.xem = h('div', { class: 'xem' });
    e.xem.addEventListener('click', (ev) => {
      const r = ev.target && ev.target.closest ? ev.target.closest('[data-o]') : null;
      if (!r || !self.f.tu_do || !self.kh) return;
      const o = self.kh.o[Number(r.getAttribute('data-o'))];
      if (o && o.duong) { self.chon_o = o.duong.slice(); self.capNhatXem(); }
    });
    e.tb = h('div');
    e.viec = h('div', { class: 'viec' });
    e.kq = h('div');
    cot_phai.appendChild(e.xem); cot_phai.appendChild(e.tb); cot_phai.appendChild(e.viec); cot_phai.appendChild(e.kq);

    this.veNhomMau();
    this.dienForm();
    this.veNut();
  };
  U._datKhoa = function (id, v) { Array.prototype.forEach.call(this.e[id].children, (b) => b.classList.toggle('chon', b.getAttribute('data-v') === v)); this.e[id].setAttribute('data-v', v); };
  U._layKhoa = function (id) { return this.e[id].getAttribute('data-v'); };

  U.dsMau = function () { return (this.cd.mau_rieng || []).concat(M.MAU); };
  U.veNhomMau = function () {
    const self = this, e = this.e;
    e.nhom.textContent = '';
    const nh = M.NHOM_MAU.slice();
    if ((this.cd.mau_rieng || []).length) nh.unshift({ ma: 'rieng', ten: 'Mẫu của xưởng' });
    if (!nh.some((n) => n.ma === this.nhom)) this.nhom = nh[0].ma;
    nh.forEach((n) => e.nhom.appendChild(h('button', { type: 'button', class: n.ma === self.nhom ? 'chon' : '', text: n.ten, onclick: () => { self.nhom = n.ma; self.veNhomMau(); } })));
    e.luoi.textContent = '';
    const ds = this.nhom === 'rieng' ? (this.cd.mau_rieng || []) : M.MAU.filter((x) => x.nhom === this.nhom);
    ds.forEach((x) => {
      const k = M.tinh(M.apMau({}, x, self.cd), { khung: 45, do: 38 }, { chia_deu: 'tim' });
      const b = h('button', { type: 'button', class: 'mau' + (self.f.ma_mau === x.ma ? ' chon' : ''), title: x.ma + ' — ' + x.ten, 'data-ma': x.ma, onclick: () => self.chonMau(x) }, [
        h('div', { class: 'h', html: M.veSvg(k, { rong: 84, cao_max: 46, co_kt: false }) }),
        h('div', { class: 't', html: '<b>' + esc(x.ma) + '</b> ' + esc(x.ten.replace(/^Cửa (đi|sổ) /, '').replace(/^Vách kính /, '')) }),
      ]);
      e.luoi.appendChild(b);
    });
  };
  U.chonMau = function (x) {
    const giu = !!(this.f.rong && this.f.cao && this._da_go_kt);
    const cu = this.f;
    this.f = M.apMau(cu, x, this.cd, giu);
    this.f.kieu_so = cu.kieu_so;
    const nho = this.cd.he_nhom_theo_mau[x.ma];
    this.f.he_nhom = nho || null;
    this.sua = this.sua; // vẫn đang sửa dòng (nếu có)
    this.kq = null; this.hoi = null;
    this.dienForm();
    Array.prototype.forEach.call(this.e.luoi.children, (b) => b.classList.toggle('chon', b.getAttribute('data-ma') === x.ma));
  };

  /** Đổ this.f lên các ô nhập */
  U.dienForm = function () {
    const e = this.e, f = this.f, so = (v) => (v ? M.ghi(v) : '');
    e.rong.value = so(f.rong); e.cao.value = so(f.cao);
    this._datKhoa('kieu_so', f.kieu_so); this._datKhoa('loai', f.loai);
    e.c_kieu.value = f.chinh.kieu; e.c_so.value = f.chinh.so; e.c_huong.value = f.chinh.huong; e.c_canh.value = f.chinh.canh; e.c_xt.value = f.chinh.xep_trai; e.c_xp.value = f.chinh.xep_phai;
    e.t_cao.value = so(f.tren.cao); e.t_kieu.value = f.tren.kieu; e.t_so.value = f.tren.so;
    e.l_rong.value = so(f.trai.rong); e.l_kieu.value = f.trai.kieu; e.r_rong.value = so(f.phai.rong); e.r_kieu.value = f.phai.kieu;
    e.d_cao.value = so(f.duoi.cao); e.d_so.value = f.duoi.so;
    this._datKhoa('do_suot', f.do_suot); this._datKhoa('khung', f.khung); this._datKhoa('mo', f.mo);
    this._datKhoa('hinh_thai', f.tu_do ? 'tu_do' : 'mau');
    e.ky_hieu.value = f.ky_hieu; e.so_luong.value = f.so_luong; e.vi_tri.value = f.vi_tri; e.ghi_chu.value = f.ghi_chu; e.kinh.value = f.kinh || '';
    this.napHeNhom(); this.napKieuLua(); this.napKinh();
    e.he_nhom.value = f.he_nhom ? String(f.he_nhom) : '';
    if (f.he_nhom && e.he_nhom.value !== String(f.he_nhom)) e.he_nhom.value = '';
    e.lua_kieu.value = f.chinh.lua_kieu === null ? '' : String(f.chinh.lua_kieu);
    this.capNhatXem();
  };
  /** Đọc các ô nhập về this.f; `cau_truc` = vừa đổi một lựa chọn làm thay đổi ô nào hiện / ẩn */
  U.docForm = function (cau_truc) {
    const e = this.e, cu = this.f;
    if (document.activeElement === this.host && this.sh.activeElement && (this.sh.activeElement === e.rong || this.sh.activeElement === e.cao)) this._da_go_kt = true;
    const v = {
      ky_hieu: e.ky_hieu.value, so_luong: e.so_luong.value, vi_tri: e.vi_tri.value, ghi_chu: e.ghi_chu.value, kinh: e.kinh.value,
      ma_mau: cu.ma_mau, ten: cu.ten, loai: this._layKhoa('loai'),
      rong: e.rong.value, cao: e.cao.value, kieu_so: this._layKhoa('kieu_so'),
      khung: this._layKhoa('khung'), mo: this._layKhoa('mo'), do_suot: this._layKhoa('do_suot'),
      tren: { cao: e.t_cao.value, kieu: e.t_kieu.value, so: e.t_so.value === '' ? 1 : e.t_so.value },
      duoi: { cao: e.d_cao.value, kieu: 'fix', so: e.d_so.value === '' ? 1 : e.d_so.value },
      trai: { rong: e.l_rong.value, kieu: e.l_kieu.value }, phai: { rong: e.r_rong.value, kieu: e.r_kieu.value },
      chinh: { kieu: e.c_kieu.value, so: e.c_so.value, huong: e.c_huong.value, canh: e.c_canh.value, xep_trai: e.c_xt.value, xep_phai: e.c_xp.value, lua_kieu: e.lua_kieu.value },
      he_nhom: e.he_nhom.value, he_nhom_ten: e.he_nhom.value ? (e.he_nhom.options[e.he_nhom.selectedIndex] || {}).text : '',
      // tự chia ô: giữ cây đang sửa; vừa bật thì đổi bố cục theo mẫu đang có sang cây (không mất hình đang làm)
      tu_do: this._layKhoa('hinh_thai') === 'tu_do' ? (cu.tu_do || M.sangCay(cu)) : null,
    };
    // khe hở theo loại (đổi loại → lấy lại khe mặc định của loại đó)
    const khe = (this.cd.khe && this.cd.khe[v.loai]) || { rong: 0, cao: 0 };
    v.khe_rong = khe.rong; v.khe_cao = khe.cao;
    this.f = M.chuanHoa(v, this.cd);
    if (cau_truc && cu.chinh.canh !== this.f.chinh.canh) this.f.chinh.lua_kieu = null;
    ghi(KHO.f, this.f);
    if (cau_truc) { this.napKieuLua(); this.kq = null; this.hoi = null; }
    this.capNhatXem();
  };

  /**
   * Bảng "Hệ nhôm theo mẫu" vừa đổi → ô Hệ nhôm của form (đang mở đúng mẫu đó) lấy theo, để Vẽ nhanh và Danh sách dùng cùng một hệ.
   * `de` = false: chỉ điền khi form đang để "giữ hệ đang chọn" (không đè lựa chọn người dùng đã bấm).
   */
  U.apHeTheoMau = function (ma, de) {
    const f = this.f, e = this.e;
    if (!f || !f.ma_mau || this.sua || (ma && f.ma_mau !== ma)) return;
    const he = this.cd.he_nhom_theo_mau[f.ma_mau] || null;
    if (!de && (f.he_nhom || !he)) return;
    f.he_nhom = he;
    ghi(KHO.f, f);
    if (e.he_nhom) { e.he_nhom.value = he ? String(he) : ''; if (e.he_nhom.selectedIndex < 0) e.he_nhom.value = ''; }
    this.capNhatXem();
  };
  U.napHeNhom = function () {
    const e = this.e;
    if (!e.he_nhom) return;
    let ds = [];
    try { ds = this.dr.dsHeNhom(); } catch (x) { ds = []; }
    this.he = ds;
    const dau = ds.map((p) => p.id).join(',');
    if (this._dau_he === dau && e.he_nhom.options.length > 1) return;
    this._dau_he = dau; this._da_nap_he = ds.length > 0;
    const giu = e.he_nhom.value;
    e.he_nhom.textContent = '';
    e.he_nhom.appendChild(h('option', { value: '', text: 'Giữ hệ đang chọn trong WindoorCraft' }));
    let nhom = null, og = null;
    ds.forEach((p) => {
      if (p.nhom !== nhom) { nhom = p.nhom; og = h('optgroup', { label: nhom || 'Khác' }); e.he_nhom.appendChild(og); }
      og.appendChild(h('option', { value: String(p.id), text: p.ten }));
    });
    e.he_nhom.value = giu || (this.f.he_nhom ? String(this.f.he_nhom) : '');
    if (e.he_nhom.selectedIndex < 0) e.he_nhom.value = '';
  };
  /** Gợi ý tên kính lấy theo danh mục của hệ nhôm đang mở trong WindoorCraft */
  U.napKinh = function () {
    const e = this.e;
    if (!e.ds_kinh) return;
    let ds = [];
    try { ds = this.dr.dsKinh(); } catch (x) { ds = []; }
    this.kinh_he = ds;
    const dau = ds.map((k) => k.ten).join('|');
    if (this._dau_kinh === dau) return;
    this._dau_kinh = dau;
    e.ds_kinh.textContent = '';
    ds.forEach((k) => e.ds_kinh.appendChild(h('option', { value: k.ten, label: k.mac_dinh ? 'mặc định của hệ' : '' })));
  };
  U.napKieuLua = function () {
    const e = this.e;
    if (!e.lua_kieu) return;
    let ds = [];
    try { ds = this.dr.sanSang().ok ? this.dr.dsKieuLua(this.f.chinh.canh) : []; } catch (x) { ds = []; }
    const giu = this.f.chinh.lua_kieu === null ? '' : String(this.f.chinh.lua_kieu);
    e.lua_kieu.textContent = '';
    e.lua_kieu.appendChild(h('option', { value: '', text: 'Tự chọn theo số cánh' }));
    ds.forEach((o) => e.lua_kieu.appendChild(h('option', { value: String(o.index), text: o.serial + '  (kiểu ' + o.index + ')' })));
    e.lua_kieu.value = giu;
    if (e.lua_kieu.selectedIndex < 0) e.lua_kieu.value = '';
  };

  /** Biên dạng + cách chia đều dùng để tính: theo hệ nhôm sẽ vẽ */
  U.thamSo = function (f) {
    let bd = { khung: 0, do: 0 }, deu = 'tim';
    try { bd = this.dr.bienDang(f.he_nhom); } catch (x) { /* chưa mở trang vẽ */ }
    try { deu = this.cd.chia_deu === 'theo_pm' ? this.dr.chiaDeuTheoPm() : this.cd.chia_deu; } catch (x) { deu = this.cd.chia_deu === 'lot_long' ? 'lot_long' : 'tim'; }
    return { bd: bd, tuy: { chia_deu: deu, lam_tron: this.cd.lam_tron, gioi_han: this.cd.gioi_han } };
  };
  U.keHoach = function (f) { const t = this.thamSo(f); return M.tinh(f, t.bd, t.tuy); };

  U.capNhatXem = function () {
    const e = this.e, f = this.f;
    if (!e.xem) return;
    e.vung_mau.style.display = f.tu_do ? 'none' : '';
    e.tudo.style.display = f.tu_do ? '' : 'none';
    const k = f.chinh.kieu;
    e.b_so.style.display = (k === 'fix' || k === 'quay' || k === 'quay2' || k === 'hat') ? '' : 'none';
    e.b_huong.style.display = k === 'quay' ? '' : 'none';
    e.b_canh.style.display = k === 'lua' ? '' : 'none';
    e.b_xep.style.display = k === 'xep' ? '' : 'none';
    e.h_lua.style.display = k === 'lua' ? '' : 'none';
    e.l_tren.textContent = f.loai === 'cua_di' ? 'Ô thoáng' : 'Ô trên';
    e.t_goi.textContent = f.tren.cao > 0 && f.tren.so === 0 ? 'chia theo đố dưới' : '';
    const kh = this.kh = this.keHoach(f);
    e.khe.textContent = f.kieu_so === 'o_cho' ? 'Ô chờ trừ khe ' + M.ghi(f.khe_rong) + ' (rộng), ' + M.ghi(f.khe_cao) + ' (cao) → khung ' + M.ghi(Math.max(0, f.rong - f.khe_rong)) + ' × ' + M.ghi(Math.max(0, f.cao - f.khe_cao)) : '';
    e.khe.style.display = f.kieu_so === 'o_cho' ? '' : 'none';
    ['rong', 'cao'].forEach((id) => e[id].classList.toggle('sai', e[id].value.trim() !== '' && !(M.so(e[id].value) > 0)));
    // gợi ý hệ nhôm
    let goi = '';
    if (!f.he_nhom && this.tt && this.tt.he_nhom && this.tt.he_nhom.ten) goi = 'Sẽ vẽ bằng hệ đang chọn: ' + this.tt.he_nhom.ten;
    else if (f.he_nhom && this.cd.he_nhom_theo_mau[f.ma_mau] === f.he_nhom) goi = 'Đã nhớ hệ này cho mẫu ' + f.ma_mau;
    e.he_goi.textContent = goi; e.he_goi.style.display = goi ? '' : 'none';
    // hình
    const tk = kh.thong_ke;
    let chon = null;
    if (f.tu_do && !kh.loi.length) {
      const ds = kh.o.map((o) => (o.duong || []).join('.'));
      chon = this.chon_o ? ds.indexOf(this.chon_o.join('.')) : -1;
      if (chon < 0) { chon = 0; this.chon_o = (kh.o[0] && kh.o[0].duong) || []; }
    }
    if (f.tu_do) this.veTuDo(kh, chon);
    e.xem.innerHTML = M.veSvg(kh, { rong: 396, cao_max: this.rong_bang ? 330 : 250, bam: !!f.tu_do, chon: chon }) + (kh.loi.length ? '' : '<div class="mt"><b>' + esc(M.moTa(f)) + '</b><br>Khung ' + M.ghi(kh.rong) + ' × ' + M.ghi(kh.cao) + (kh.khung === '3_canh' ? ' · 3 cạnh' : '') + (tk ? ' · ' + tk.so_o + ' ô · ' + tk.so_canh + ' cánh' : '') + '</div>');
    let t = '';
    if (kh.loi.length) t += '<div class="tb loi"><ul>' + kh.loi.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
    // loại kính: soát sớm theo danh mục của hệ đang mở (dòng dùng hệ khác thì tới lúc vẽ, đổi hệ xong mới soát được)
    const cb = kh.canh_bao.slice();
    if (f.kinh && this.tt && this.kinh_he && this.kinh_he.length && (!f.he_nhom || (this.tt.he_nhom && Number(this.tt.he_nhom.id) === Number(f.he_nhom)))) {
      const chuan = (x) => M.boDau(x).replace(/\s+/g, ' ').trim();
      if (!this.kinh_he.some((k) => chuan(k.ten) === chuan(f.kinh))) cb.push('Hệ nhôm đang mở không có loại kính "' + f.kinh + '" — chọn theo gợi ý ở ô Kính, hoặc để trống để dùng loại mặc định.');
    }
    if (cb.length) t += '<div class="tb cb"><ul>' + cb.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
    e.tb.innerHTML = t;
    this.veNut();
  };

  // ------------------------------------------------------------------ TỰ CHIA Ô
  const LA_TU_DO = [['fix', 'Kính cố định'], ['quay:trai', 'Mở quay 1 cánh — lề trái'], ['quay:phai', 'Mở quay 1 cánh — lề phải'], ['quay2', 'Mở quay 2 cánh'], ['quay4', 'Mở quay 4 cánh'], ['hat', 'Mở hất'],
    ['lua:2', 'Lùa 2 cánh'], ['lua:3', 'Lùa 3 cánh'], ['lua:4', 'Lùa 4 cánh'], ['xep:2:2', 'Xếp trượt 2+2'], ['xep:3:1', 'Xếp trượt 3+1'], ['xep:3:3', 'Xếp trượt 3+3']];
  const maLa = (n) => n.kieu === 'quay' ? 'quay:' + (n.huong || 'trai') : n.kieu === 'lua' ? 'lua:' + (n.canh || 2) : n.kieu === 'xep' ? 'xep:' + n.xep_trai + ':' + n.xep_phai : n.kieu;
  const laTuMa = (v) => { const p = v.split(':'); if (p[0] === 'quay') return { kieu: 'quay', huong: p[1] }; if (p[0] === 'lua') return { kieu: 'lua', canh: Number(p[1]) }; if (p[0] === 'xep') return { kieu: 'xep', xep_trai: Number(p[1]), xep_phai: Number(p[2]) }; return { kieu: p[0] }; };
  /** Đổi cây tự chia rồi vẽ lại hình + lưu form */
  U.doiCay = function (cay, chon) {
    this.f.tu_do = M.chuanCay(cay);
    if (chon) this.chon_o = chon;
    ghi(KHO.f, this.f);
    this.kq = null; this.hoi = null;
    this.capNhatXem();
  };
  U.veTuDo = function (kh, chon) {
    const self = this, e = this.e, cay = this.f.tu_do;
    e.tudo.textContent = '';
    if (kh.loi.length || chon === null || chon < 0) {
      e.tudo.appendChild(h('div', { class: 'nho2', text: 'Sửa lỗi kích thước (bên phải) để chọn ô.' }));
      e.tudo.appendChild(h('div', { class: 'nuts' }, [h('button', { class: 'nut nho', text: 'Về 1 ô', onclick: () => self.doiCay({ kieu: 'fix' }, []) })]));
      return;
    }
    const duong = this.chon_o || [];
    const la = M.nutCay(cay, duong) || { kieu: 'fix' };
    const o = kh.o[chon];
    const cha = duong.length ? M.nutCay(cay, duong.slice(0, -1)) : null;
    const phan = cha ? cha.phan[duong[duong.length - 1]] : null;
    e.tudo.appendChild(h('div', { html: 'Bấm vào ô trên hình bên phải để chọn. Đang chọn <b class="cam">ô ' + (chon + 1) + '</b> — lọt lòng khoảng ' + M.ghi(Math.round(o.rong)) + ' × ' + M.ghi(Math.round(o.cao)) + '.' }));
    const kieu = h('select', { style: 'height:26px' }, LA_TU_DO.map((x) => h('option', { value: x[0], text: x[1] })));
    kieu.value = maLa(la);
    if (kieu.selectedIndex < 0) kieu.value = 'fix';
    kieu.addEventListener('change', () => self.doiCay(M.thayNut(cay, duong, laTuMa(kieu.value)), duong));
    e.tudo.appendChild(h('div', { class: 'hang', style: 'margin:6px 0 0' }, [h('label', { text: 'Kiểu ô' }), h('span', { class: 'o' }, [kieu])]));
    if (phan) {
      const dung = cha.chia === 'dung';
      const kt = h('input', { type: 'text', class: 'so', inputmode: 'decimal', placeholder: 'chia đều', value: phan.kt > 0 ? M.ghi(phan.kt) : '' });
      kt.addEventListener('change', () => {
        const c = JSON.parse(JSON.stringify(cay));
        const n = M.nutCay(c, duong.slice(0, -1));
        const v = M.so(kt.value);
        n.phan[duong[duong.length - 1]].kt = v > 0 ? v : 0;
        self.doiCay(c, duong);
      });
      e.tudo.appendChild(h('div', { class: 'hang' }, [h('label', { text: dung ? 'Rộng phần' : 'Cao phần' }), h('span', { class: 'vua' }, [kt]), h('span', { class: 'nho2 o', text: 'tính tới tim đố; để trống = chia đều phần còn lại' })]));
    }
    const nut = (t, f, tt) => h('button', Object.assign({ class: 'nut nho', text: t, onclick: f }, tt || {}));
    e.tudo.appendChild(h('div', { class: 'nuts' }, [
      nut('Chia đứng 2', () => self.doiCay(M.chiaO(cay, duong, 'dung', 2), duong.concat([0]))),
      nut('Chia đứng 3', () => self.doiCay(M.chiaO(cay, duong, 'dung', 3), duong.concat([0]))),
      nut('Chia ngang 2', () => self.doiCay(M.chiaO(cay, duong, 'ngang', 2), duong.concat([0]))),
      nut('Chia ngang 3', () => self.doiCay(M.chiaO(cay, duong, 'ngang', 3), duong.concat([0]))),
      nut('Gộp ô', () => self.doiCay(M.gopO(cay, duong), duong.slice(0, -1)), { disabled: !duong.length, title: 'Gộp các ô cùng tầng với ô đang chọn lại thành một ô' }),
    ]));
  };

  U.veNut = function () {
    const self = this, e = this.e;
    if (!e.viec) return;
    e.viec.textContent = '';
    const ban = !!this.ban;
    const loi = !this.kh || this.kh.loi.length > 0;
    if (this.sua) {
      const d = this.timDong(this.sua);
      e.viec.appendChild(h('button', { class: 'nut chinh', disabled: loi || ban, text: 'Cập nhật dòng ' + ((d && d.cau_hinh.ky_hieu) || '') + ' trong danh sách', onclick: () => self.capNhatDong() }));
      e.viec.appendChild(h('button', { class: 'nut', text: 'Thôi sửa', onclick: () => { self.sua = null; self.veNut(); } }));
    } else {
      e.viec.appendChild(h('button', { class: 'nut chinh', disabled: loi || ban, text: ban && this.ban.viec === 've' ? 'Đang vẽ…' : 'Vẽ vào WindoorCraft', onclick: () => self.bamVe() }));
      e.viec.appendChild(h('button', { class: 'nut', disabled: loi || ban, title: 'Thêm bộ cửa này vào danh sách công trình', text: '+ Danh sách', onclick: () => self.themVaoDs() }));
      e.viec.appendChild(h('button', { class: 'nut', disabled: loi || ban, title: 'Lưu cấu tạo đang nhập thành mẫu riêng của xưởng', text: 'Lưu mẫu', onclick: () => self.hoiLuuMau() }));
    }
    e.kq.textContent = '';
    if (this.hoi) e.kq.appendChild(this.veHoi(this.hoi));
    else if (this.kq) e.kq.appendChild(h('div', { class: 'tb ' + this.kq.loai, html: this.kq.html }, this.kq.nut ? [h('div', { class: 'nuts' }, this.kq.nut)] : []));
  };
  U.veHoi = function (q) {
    const self = this;
    return h('div', { class: 'tb hoi' }, [
      h('div', { html: q.html }), q.o || null,
      h('div', { class: 'nuts' }, q.nut.map((n) => h('button', { class: 'nut nho' + (n.chinh ? ' chinh' : ''), text: n.ten, onclick: () => { self.hoi = null; n.lam(); self.veNut(); if (self.the === 'ds') self.veDs(); } }))),
    ]);
  };

  // ------------------------------------------------------------------ vẽ một bộ
  /** Vẽ xong thì đưa bản vẽ ra chỗ bảng này không che (chỉ đổi góc nhìn của WindoorCraft) */
  U.duaRaChoTrong = function () {
    if (!this.mo || !this.host || !this.e.bang) return false;
    try {
      const r = this.e.bang.getBoundingClientRect();
      const v = this.dr.vungTrong([{ left: r.left, right: r.right, top: r.top, bottom: r.bottom }], this.host);
      return v ? this.dr.canhVaoVung(v) : false;
    } catch (e) { return false; } // chỉ là góc nhìn — lỗi thì thôi, bản vẽ không ảnh hưởng
  };
  U.bamVe = function () {
    const self = this;
    const ss = this.dr.sanSang();
    if (!ss.ok) { this.kq = { loai: 'loi', html: esc(ss.ly_do) }; return this.veNut(); }
    const tt = this.dr.trangThai();
    let cua_toi = false;
    try { cua_toi = !!this.ban_ve_cua_toi && this.dr.cc().shapeManager.serialize() === this.ban_ve_cua_toi; } catch (e) { cua_toi = false; }
    if (tt.ma_bo) {
      this.hoi = { html: 'Đang mở bộ <b>' + esc(tt.ky_hieu || '') + '</b> đã lưu trong đơn #' + esc(tt.ma_don) + '. Anh muốn vẽ thế nào?', nut: [
        { ten: 'Vẽ bộ mới, thêm vào đơn này', chinh: true, lam: () => self.ve(self.f, 'moi') },
        { ten: 'Vẽ đè lên bộ đang mở', lam: () => self.ve(self.f, 'de') },
        { ten: 'Thôi', lam: () => {} },
      ] };
      return this.veNut();
    }
    if (!tt.trong && !cua_toi) {
      this.hoi = { html: 'Bản vẽ đang mở <b>chưa lưu</b> sẽ bị xoá.', nut: [{ ten: 'Xoá và vẽ', chinh: true, lam: () => self.ve(self.f, 'moi') }, { ten: 'Thôi', lam: () => {} }] };
      return this.veNut();
    }
    return this.ve(this.f, 'moi');
  };
  /** Vẽ cấu hình `f`. Trả về kết quả của driver hoặc null nếu lỗi (đã hiện lỗi). */
  U.ve = async function (f, che_do, im) {
    const self = this;
    const kh = this.keHoach(f);
    if (kh.loi.length) { this.kq = { loai: 'loi', html: esc(kh.loi[0]) }; this.veNut(); return null; }
    this.ban = { viec: 've' }; this.kq = null; this.hoi = null; this.veNut();
    let r = null;
    try {
      r = await this.dr.ve(kh, { che_do: che_do });
      this.duaRaChoTrong();
      this.dr.dienThongTin({ ky_hieu: f.ky_hieu, so_luong: f.so_luong, vi_tri: f.vi_tri, ghi_chu: f.ghi_chu });
      try { this.ban_ve_cua_toi = this.dr.cc().shapeManager.serialize(); } catch (e) { this.ban_ve_cua_toi = ''; }
      if (f.he_nhom && f.ma_mau) { this.cd.he_nhom_theo_mau[f.ma_mau] = f.he_nhom; ghi(KHO.cd, this.cd); }
      const dc = r.doi_chieu;
      const gt = (v) => (typeof v === 'number' ? M.ghi(v) : esc(v === undefined || v === null || v === '' ? '(trống)' : v));
      const sai = dc.muc.filter((m) => !m.ok).map((m) => esc(m.ten) + ': cần ' + gt(m.can) + ', vẽ ra ' + gt(m.co));
      const cb = r.canh_bao.map(esc);
      let html = (dc.dung && !cb.length ? '✓ ' : '') + 'Đã vẽ <b>' + esc(f.ky_hieu || M.moTa(f)) + '</b> ' + M.ghi(kh.rong) + ' × ' + M.ghi(kh.cao) + ' — ' + r.do + ' đố, ' + r.canh + ' cánh' + (r.doi_he && r.doi_he.doi ? ', đã đổi hệ nhôm' : '') + (r.kinh && r.kinh.ten ? ', kính ' + esc(r.kinh.ten) : '') + '.';
      html += dc.dung ? ' Đối chiếu với bản vẽ: khớp.' : '<br><b>Đối chiếu không khớp:</b> ' + sai.join('; ') + '.';
      if (cb.length) html += '<ul><li>' + cb.join('</li><li>') + '</li></ul>';
      if (!im) this.kq = { loai: dc.dung && !cb.length ? 'tot' : 'cb', html: html, nut: [h('button', { class: 'nut nho', text: 'Hoàn tác lần vẽ này', onclick: () => { self.dr.hoanTac(); self.ban_ve_cua_toi = ''; self.kq = { loai: 'hoi', html: 'Đã bỏ lần vẽ vừa rồi.' }; self.veNut(); } })] };
    } catch (e) {
      r = null;
      this.kq = { loai: 'loi', html: '<b>Không vẽ được:</b> ' + esc(e && e.message ? e.message : e) };
      this.loi_cuoi = e && e.message ? e.message : String(e);
    }
    this.ban = null;
    this.nhip();
    if (r && !im) this.capNhatXem(); else this.veNut(); // vẽ xong: làm mới dòng "đã nhớ hệ nhôm", hệ đang chọn…
    if (r && !im) this.giaSauVe();
    return r;
  };
  /** Vẽ một bộ xong → hỏi WindoorCraft giá của bộ đó (không lưu) rồi hiện dưới kết quả vẽ */
  U.giaSauVe = async function () {
    const kq = this.kq;
    if (!kq) return;
    const self = this;
    const o = h('div', { class: 'gia', html: 'Đang tính giá theo bảng giá WindoorCraft…' });
    kq.nut = (kq.nut || []).concat([o]);
    this.veNut();
    try {
      const g = await this.dr.tinhGia();
      if (this.kq !== kq) return; // người dùng đã làm việc khác
      this.gia_ve = g;
      M.ghiMaDaGap(this.cd.gia_von, g.von); ghi(KHO.cd, this.cd);
      const lai = this.chuLai({ tong: g.tong, von: g.von });
      o.innerHTML = 'Giá theo WindoorCraft: <b>' + M.tien(g.tong) + ' đ</b> · ' + g.so_luong + ' bộ · ' + String(g.dien_tich).replace('.', ',') + ' m²' + (g.dien_tich > 0 ? ' · ' + M.tien(g.tong / g.dien_tich) + ' đ/m²' : '') + (lai ? '<br>' + lai : '') + (g.chua_loi_nhuan ? '<br><span style="color:#8a2219">Hệ nhôm có đặt % lợi nhuận — số trên chưa cộng phần đó.</span>' : '');
      const ct = h('details', { class: 'ct-gia' }, [h('summary', { text: 'Chi tiết ' + g.dong.length + ' dòng giá' }), h('table', null, [h('tbody', null, g.dong.map((x) => h('tr', null, [h('td', { text: x.ten }), h('td', { class: 's', text: M.tien(x.don_gia) + ' × ' + String(x.sl).replace('.', ',') }), h('td', { class: 's', text: M.tien(x.thanh_tien) })])))])]);
      o.appendChild(ct);
    } catch (e) {
      if (this.kq !== kq) return;
      o.textContent = 'Chưa tính được giá: ' + (e && e.message ? e.message : e);
    }
  };

  // ------------------------------------------------------------------ mẫu riêng của xưởng
  U.hoiLuuMau = function () {
    const self = this, f = this.f;
    const ma = h('input', { type: 'text', placeholder: 'Mã, vd X1', style: 'width:90px', value: '' });
    const ten = h('input', { type: 'text', placeholder: 'Tên mẫu', value: M.moTa(f) });
    this.hoi = { html: 'Lưu cấu tạo đang nhập thành <b>mẫu của xưởng</b> (kèm kích thước ' + M.ghi(f.rong) + ' × ' + M.ghi(f.cao) + ' làm mặc định):', o: h('div', { class: 'hang', style: 'margin:6px 0 0' }, [ma, ten]), nut: [
      { ten: 'Lưu mẫu', chinh: true, lam: () => {
        const m = ma.value.trim().toUpperCase().replace(/\s+/g, '');
        if (!m) { self.kq = { loai: 'loi', html: 'Chưa nhập mã mẫu.' }; return; }
        if (M.MAU.some((x) => x.ma === m)) { self.kq = { loai: 'loi', html: 'Mã ' + esc(m) + ' trùng mẫu có sẵn — chọn mã khác.' }; return; }
        const x = { ma: m, nhom: f.loai, rieng: true, ten: ten.value.trim() || M.moTa(f), rong: f.rong, cao: f.cao, cau_hinh: { chinh: f.chinh, tren: f.tren, duoi: f.duoi, trai: f.trai, phai: f.phai, mo: f.mo, do_suot: f.do_suot, khung: f.khung, tu_do: f.tu_do || null } };
        self.cd.mau_rieng = (self.cd.mau_rieng || []).filter((y) => y.ma !== m).concat([x]);
        if (f.he_nhom) self.cd.he_nhom_theo_mau[m] = f.he_nhom;
        ghi(KHO.cd, self.cd);
        self.f.ma_mau = m; self.f.ten = x.ten; self.nhom = 'rieng'; self.veNhomMau();
        self.kq = { loai: 'tot', html: 'Đã lưu mẫu <b>' + esc(m) + '</b> — nằm trong nhóm "Mẫu của xưởng".' };
      } }, { ten: 'Thôi', lam: () => {} }] };
    this.veNut();
  };

  // ------------------------------------------------------------------ THẺ DANH SÁCH
  U.luuDs = function () { ghi(KHO.ds, this.ds); };
  U.timDong = function (id) { return this.ds.filter((d) => d.id === id)[0] || null; };
  U.demDs = function () {
    const b = this.e.the.children[1];
    const con = this.ds.filter((d) => d.trang_thai !== 'da_luu').length;
    b.textContent = 'Danh sách' + (this.ds.length ? ' · ' + (con ? con + '/' : '') + this.ds.length : '');
  };
  U._idMoi = function () { this._id += 1; return 'd' + Date.now().toString(36) + this._id; };
  U.themVaoDs = function () {
    const f = JSON.parse(JSON.stringify(this.f));
    this.ds.push({ id: this._idMoi(), cau_hinh: f, trang_thai: 'cho' });
    this.luuDs(); this.demDs();
    const ke = M.kyHieuKe(f.ky_hieu);
    this.kq = { loai: 'tot', html: 'Đã thêm <b>' + esc(f.ky_hieu || M.moTa(f)) + '</b> vào danh sách (' + this.ds.length + ' bộ).' };
    if (ke && ke !== f.ky_hieu) { this.f.ky_hieu = ke; this.e.ky_hieu.value = ke; ghi(KHO.f, this.f); }
    this.veNut();
  };
  U.capNhatDong = function () {
    const d = this.timDong(this.sua);
    if (d) { d.cau_hinh = JSON.parse(JSON.stringify(this.f)); if (d.trang_thai !== 'da_luu') d.trang_thai = 'cho'; d.loi = ''; delete d.can_chon_mau; delete d.gia; delete this.anh[d.id]; this.luuDs(); }
    this.sua = null;
    this.kq = { loai: 'tot', html: 'Đã cập nhật dòng trong danh sách.' };
    this.doiThe('ds');
  };
  /** Hệ nhôm sẽ dùng cho một dòng: gán riêng → nhớ theo mẫu → null (hệ đang chọn) */
  U.heCuaDong = function (d) { return d.cau_hinh.he_nhom || this.cd.he_nhom_theo_mau[d.cau_hinh.ma_mau] || null; };
  U.tenHe = function (id) { const p = (this.he || []).filter((x) => Number(x.id) === Number(id))[0]; return p ? p.ten : ''; };

  U.dungDs = function () { this.demDs(); };
  U.veDs = function () {
    const self = this, s = this.e.s.ds;
    try { this.he = this.dr.dsHeNhom(); } catch (e) { this.he = this.he || []; }
    s.textContent = '';
    const ban = !!this.ban || !!this.lo;
    const an_von = this.anVon();
    s.appendChild(h('div', { class: 'viec', style: 'margin:0 0 8px' }, [
      h('button', { class: 'nut nho', disabled: ban, text: 'Dán từ Excel', onclick: () => self.moDan() }),
      h('button', { class: 'nut nho', disabled: !this.ds.length, text: 'Xuất CSV', onclick: () => self.xuatCsv() }),
      h('span', { style: 'flex:1' }),
      h('button', { class: 'nut nho nguy', disabled: ban || !this.ds.length, text: 'Xoá hết', onclick: () => { self.hoi = { html: 'Xoá cả <b>' + self.ds.length + '</b> dòng trong danh sách? (Không đụng tới đơn đã lưu trong WindoorCraft.)', nut: [{ ten: 'Xoá hết', chinh: true, lam: () => { self.ds = []; self.dang_mo = null; self.luuDs(); self.demDs(); } }, { ten: 'Thôi', lam: () => {} }] }; self.veDs(); } }),
    ]));
    if (this._dan) s.appendChild(this._dan);
    if (this.hoi) s.appendChild(this.veHoi(this.hoi));
    if (!this.ds.length) {
      s.appendChild(h('div', { class: 'chua-co', html: 'Chưa có bộ cửa nào.<br>Điền ở thẻ <b>Vẽ nhanh</b> rồi bấm <b>+ Danh sách</b>, hoặc bấm <b>Dán từ Excel</b> để nhập cả bảng.' }));
      return;
    }
    const tb = h('table');
    tb.appendChild(h('thead', null, [h('tr', null, [h('th', { text: 'Ký hiệu' }), h('th', { text: 'Mẫu' }), h('th', { class: 's', text: 'Rộng × Cao' }), h('th', { class: 's', text: 'SL' }), h('th', { class: 's', text: 'Thành tiền' }), an_von ? null : h('th', { class: 's', text: 'Lãi' }), h('th', { text: 'Trạng thái' }), h('th')])]));
    const th = h('tbody');
    this.ds.forEach((d) => {
      const c = d.cau_hinh;
      const he = self.heCuaDong(d);
      const o_mau = d.can_chon_mau
        ? h('select', { style: 'height:24px;font-size:12px', onchange: (ev) => { const x = M.timMau(ev.target.value, self.cd.mau_rieng); if (x) { d.cau_hinh = M.apMau(c, x, self.cd, true); if (d.tren_cao) d.cau_hinh.tren.cao = d.tren_cao; delete d.can_chon_mau; self.luuDs(); self.veDs(); } } }, [h('option', { value: '', text: 'Chọn mẫu…' + (d.mau_goc ? ' (' + d.mau_goc + ')' : '') })].concat(self.dsMau().map((x) => h('option', { value: x.ma, text: x.ma + ' — ' + x.ten }))))
        : h('span', { title: M.moTa(c) + (he ? '\nHệ nhôm: ' + self.tenHe(he) : '\nHệ nhôm: theo hệ đang chọn'), html: '<b>' + esc(c.ma_mau || '—') + '</b>' + (c.tren.cao > 0 ? ' <span class="nho2">+' + M.ghi(c.tren.cao) + '</span>' : '') + (he ? '' : ' <span class="nho2" title="Chưa gán hệ nhôm — sẽ dùng hệ đang chọn">⚠</span>') });
      const tt = h('span', { class: 'tt ' + d.trang_thai, title: d.loi || (d.ma_bo ? 'Mã bộ ' + d.ma_bo + ' · đơn #' + d.ma_don : ''), text: M.TEN_TRANG_THAI[d.trang_thai] || d.trang_thai });
      th.appendChild(h('tr', { class: self.dang_mo === d.id ? 'dang' : '' }, [
        h('td', null, [h('b', { text: c.ky_hieu || '—' }), c.vi_tri ? h('div', { class: 'nho2', text: c.vi_tri }) : null, c.kinh ? h('div', { class: 'nho2', title: 'Loại kính ghi cho dòng này', text: c.kinh }) : null]),
        h('td', null, [o_mau]),
        h('td', { class: 's', text: M.ghi(c.rong) + ' × ' + M.ghi(c.cao) + (c.kieu_so === 'o_cho' ? ' (ô chờ)' : '') }),
        h('td', { class: 's', text: String(c.so_luong) }),
        h('td', { class: 's', title: d.gia ? String(d.gia.dien_tich).replace('.', ',') + ' m² · ' + M.tien(d.gia.dien_tich > 0 ? d.gia.tong / d.gia.dien_tich : 0) + ' đ/m²' : 'Chưa tính giá', text: d.gia ? M.tien(d.gia.tong) : '—' }),
        an_von ? null : (() => { const l = M.laiBo(d.gia, self.cd.gia_von); return h('td', { class: 's', style: l && l.lai < 0 ? 'color:#b03a2e' : '', title: l ? 'Giá vốn ' + M.tien(l.von) + ' đ · ' + String(l.kg_nhom).replace('.', ',') + ' kg nhôm' : 'Chưa có số bóc tách', text: l ? M.tien(l.lai) + ' · ' + String(l.pt).replace('.', ',') + '%' : '—' }); })(),
        h('td', null, [tt, d.trang_thai === 'loi' && d.loi ? h('div', { class: 'nho2', style: 'color:#8a2219;max-width:120px', text: d.loi }) : null]),
        h('td', { style: 'white-space:nowrap;text-align:right' }, [
          h('button', { class: 'lien', disabled: ban || !!d.can_chon_mau, text: 'Vẽ', onclick: () => self.veDong(d.id) }),
          h('button', { class: 'lien', disabled: ban, text: 'Sửa', onclick: () => { self.sua = d.id; self.f = M.chuanHoa(d.cau_hinh, self.cd); self.kq = null; self.hoi = null; self.nhom = self.f.loai; self.veNhomMau(); self.dienForm(); self.doiThe('ve'); } }),
          h('button', { class: 'lien xoa', disabled: ban, text: 'Xoá', onclick: () => { self.ds = self.ds.filter((x) => x.id !== d.id); if (self.dang_mo === d.id) self.dang_mo = null; self.luuDs(); self.demDs(); self.veDs(); } }),
        ]),
      ]));
    });
    tb.appendChild(th);
    s.appendChild(tb);

    const con = this.ds.filter((d) => d.trang_thai !== 'da_luu' && !d.can_chon_mau);
    const thieu = this.ds.filter((d) => d.can_chon_mau).length;
    const tong_bo = this.ds.reduce((a, d) => a + (d.cau_hinh.so_luong || 1), 0);
    s.appendChild(h('div', { class: 'nho2', style: 'margin:6px 0 0', text: this.ds.length + ' dòng · ' + tong_bo + ' bộ · còn ' + con.length + ' dòng chưa lưu' + (thieu ? ' · ' + thieu + ' dòng chưa chọn mẫu' : '') }));
    const bgia = M.bangBaoGia(this.ds, this.cd.bao_gia);
    const chua_gia = this.ds.filter((d) => !d.gia && !d.can_chon_mau);
    s.appendChild(h('div', { class: 'tong-gia' }, [
      h('span', { html: bgia.dong.length ? 'Tổng ' + bgia.dong.length + ' dòng có giá: <b class="lon">' + M.tien(bgia.tong) + ' đ</b> · ' + String(bgia.dien_tich).replace('.', ',') + ' m²' + (() => {
        let ban = 0, von = 0, kg = 0, du = true;
        self.ds.forEach((d) => { if (!d.gia) return; const l = M.laiBo(d.gia, self.cd.gia_von); if (!l) { du = false; return; } ban += l.ban; von += l.von; kg += l.kg_nhom; });
        if (!von || an_von) return '';
        const lai = ban - von;
        return '<br>Giá vốn ' + M.tien(von) + ' đ (' + String(Math.round(kg * 10) / 10).replace('.', ',') + ' kg nhôm) · lãi <b style="color:' + (lai < 0 ? '#b03a2e' : '#1d5c37') + '">' + M.tien(lai) + ' đ (' + String(Math.round((lai / ban) * 1000) / 10).replace('.', ',') + '%)</b>' + (du ? '' : ' · có dòng chưa đủ số bóc tách');
      })() + (chua_gia.length ? ' · <b>' + chua_gia.length + '</b> dòng chưa có giá' : '') : 'Chưa có giá. Bấm <b>Tính giá</b> — tiện ích vẽ từng dòng và hỏi giá WindoorCraft, <b>không lưu</b> gì.' }),
      h('span', { style: 'flex:1' }),
      h('button', { class: 'nut nho', disabled: ban || !chua_gia.length, title: 'Vẽ lần lượt từng dòng chưa có giá và hỏi giá WindoorCraft. Không lưu đơn hàng.', text: 'Tính giá' + (chua_gia.length ? ' ' + chua_gia.length + ' dòng' : ''), onclick: () => self.hoiTinhGia() }),
      h('button', { class: 'nut nho chinh', disabled: ban || !bgia.dong.length, title: 'Mở trang báo giá in được (có hình từng bộ) — in hoặc lưu PDF gửi khách', text: 'Báo giá', onclick: () => self.moBaoGia() }),
    ]));
    const co_sx = this.ds.some((d) => !d.can_chon_mau);
    const sx = this.cd.san_xuat || {};
    s.appendChild(h('div', { class: 'tong-gia sx' }, [
      h('span', { html: '<b>Sản xuất</b> <span class="nho2">số bóc tách của WindoorCraft</span>' }),
      h('span', { style: 'flex:1' }),
      h('button', { class: 'nut nho', disabled: ban || !co_sx, title: 'Bản vẽ sản xuất tiếng Việt: mỗi bộ một trang A4 — hình, thanh nhôm (dài cắt, góc, vị trí), kính, phụ kiện', text: 'Bản vẽ SX', onclick: () => self.sanXuat('ban_ve') }),
      h('button', { class: 'nut nho', disabled: ban || !co_sx, title: 'File Excel cắt nhôm: danh sách cắt (nhập máy cắt), tối ưu cây, kính, phụ kiện', text: 'File cắt Excel', onclick: () => self.sanXuat('excel') }),
      h('button', { class: 'nut nho chinh', disabled: ban || !co_sx || !sx.may_chu, title: sx.may_chu ? 'Gửi danh sách cắt lên ' + sx.may_chu + ' — máy cắt vào đó lấy file về là cắt' : 'Chưa đặt máy chủ (Cài đặt → Sản xuất)', text: 'Gửi máy cắt', onclick: () => self.sanXuat('gui') }),
    ]));
    if (this.lo) {
      s.appendChild(h('div', { class: 'tb hoi' }, [
        h('div', { html: (this.lo.viec === 'gia' ? 'Đang tính giá ' : 'Đang vẽ và lưu ') + '<b>' + (this.lo.i + 1) + ' / ' + this.lo.tong + '</b>: ' + esc(this.lo.ten || '') + '…' }),
        h('div', { class: 'tien' }, [h('i', { style: 'width:' + Math.round((this.lo.i / Math.max(1, this.lo.tong)) * 100) + '%' })]),
        h('div', { class: 'nuts' }, [h('button', { class: 'nut nho', disabled: this.lo.dung, text: this.lo.dung ? 'Sẽ dừng sau bộ này…' : 'Dừng', onclick: () => { self.lo.dung = true; self.veDs(); } })]),
      ]));
    } else {
      if (this.kq_lo) s.appendChild(h('div', { class: 'tb ' + this.kq_lo.loai, html: this.kq_lo.html }, this.kq_lo.nut ? [h('div', { class: 'nuts' }, this.kq_lo.nut)] : []));
      s.appendChild(h('div', { class: 'viec' }, [
        h('button', { class: 'nut chinh', disabled: ban || !con.length, text: 'Vẽ và lưu cả ' + con.length + ' dòng vào một đơn hàng', onclick: () => self.hoiLo() }),
        h('button', { class: 'nut', disabled: ban || !con.length, title: 'Vẽ dòng chưa vẽ kế tiếp, anh tự xem rồi bấm Lưu lại trong WindoorCraft', text: 'Vẽ dòng kế', onclick: () => { const d = self.ds.filter((x) => x.trang_thai === 'cho' && !x.can_chon_mau)[0] || con[0]; if (d) self.veDong(d.id); } }),
      ]));
    }
  };

  /** Cấu hình thực sự đem vẽ của một dòng (đã gán hệ nhôm theo mẫu nếu dòng chưa có) */
  U.cauHinhDong = function (d) { const f = M.chuanHoa(d.cau_hinh, this.cd); f.khe_rong = d.cau_hinh.khe_rong; f.khe_cao = d.cau_hinh.khe_cao; f.he_nhom = this.heCuaDong(d); return f; };
  U.veDong = async function (id) {
    const d = this.timDong(id);
    if (!d) return;
    const tt = this.dr.sanSang().ok ? this.dr.trangThai() : null;
    if (!tt) { this.kq_lo = { loai: 'loi', html: esc(this.dr.sanSang().ly_do || 'Chưa mở trang Thiết kế.') }; return this.veDs(); }
    let cua_toi = false;
    try { cua_toi = !!this.ban_ve_cua_toi && this.dr.cc().shapeManager.serialize() === this.ban_ve_cua_toi; } catch (e) { cua_toi = false; }
    if (!tt.trong && !tt.ma_bo && !cua_toi && !this._bo_qua_hoi) {
      const self = this;
      this.hoi = { html: 'Bản vẽ đang mở <b>chưa lưu</b> sẽ bị xoá để vẽ ' + esc(d.cau_hinh.ky_hieu || 'dòng này') + '.', nut: [{ ten: 'Xoá và vẽ', chinh: true, lam: () => { self._bo_qua_hoi = true; self.veDong(id).then(() => { self._bo_qua_hoi = false; }); } }, { ten: 'Thôi', lam: () => {} }] };
      return this.veDs();
    }
    this.kq_lo = null;
    const r = await this.ve(this.cauHinhDong(d), 'moi', true);
    if (r) { d.trang_thai = 'da_ve'; d.loi = ''; d.ma_bo = ''; this.dang_mo = d.id; this.kq_lo = { loai: r.doi_chieu.dung && !r.canh_bao.length ? 'tot' : 'cb', html: 'Đã vẽ <b>' + esc(d.cau_hinh.ky_hieu || '') + '</b>' + (r.doi_chieu.dung ? '' : ' — đối chiếu KHÔNG khớp, xem lại') + (r.canh_bao.length ? ': ' + r.canh_bao.map(esc).join('; ') : '') + '. Xem trên WindoorCraft rồi bấm <b>Lưu lại</b>; dòng sẽ tự chuyển sang "Đã lưu".' }; }
    else { d.trang_thai = 'loi'; d.loi = this.loi_cuoi || 'Không vẽ được'; this.kq_lo = { loai: 'loi', html: '<b>' + esc(d.cau_hinh.ky_hieu || 'Dòng') + ':</b> ' + esc(d.loi) }; }
    this.luuDs(); this.demDs(); this.veDs();
  };

  U.hoiLo = function () {
    const self = this;
    const ss = this.dr.sanSang();
    if (!ss.ok) { this.kq_lo = { loai: 'loi', html: esc(ss.ly_do) }; return this.veDs(); }
    const tt = this.dr.trangThai();
    const con = this.ds.filter((d) => d.trang_thai !== 'da_luu' && !d.can_chon_mau);
    const chua_he = con.filter((d) => !self.heCuaDong(d));
    const he = {};
    con.forEach((d) => { const i = self.heCuaDong(d); const t = i ? self.tenHe(i) || ('mã ' + i) : 'hệ đang chọn: ' + ((tt.he_nhom && tt.he_nhom.ten) || '?'); he[t] = (he[t] || 0) + 1; });
    const loi = con.map((d) => ({ d: d, k: self.keHoach(self.cauHinhDong(d)) })).filter((x) => x.k.loi.length);
    let html = 'Sẽ vẽ và lưu <b>' + con.length + ' dòng</b> lần lượt vào WindoorCraft, mỗi dòng mất vài giây. Hệ nhôm:<ul>' + Object.keys(he).map((t) => '<li>' + he[t] + ' dòng — ' + esc(t) + '</li>').join('') + '</ul>';
    if (chua_he.length) html += '<b>' + chua_he.length + ' dòng chưa gán hệ nhôm</b> sẽ dùng hệ đang chọn — bóc tách sai nếu hệ không đúng loại cửa. Gán ở thẻ Cài đặt → "Hệ nhôm theo mẫu".<br>';
    const co_kinh = con.filter((d) => d.cau_hinh.kinh).length;
    html += 'Kính: ' + (co_kinh ? '<b>' + co_kinh + ' dòng</b> ghi loại kính riêng, ' + (con.length - co_kinh ? (con.length - co_kinh) + ' dòng còn lại' : 'không dòng nào') + ' dùng loại mặc định của hệ nhôm.' : 'cả ' + con.length + ' dòng dùng loại mặc định của hệ nhôm.') + '<br>';
    if (loi.length) html += '<b>' + loi.length + ' dòng đang lỗi kích thước</b> sẽ bị bỏ qua: ' + loi.map((x) => esc(x.d.cau_hinh.ky_hieu || '?')).join(', ') + '.<br>';
    if (!tt.trong && !tt.ma_bo) html += '<b>Bản vẽ đang mở chưa lưu sẽ bị xoá.</b><br>';
    const nut = [];
    if (tt.ma_don) {
      html += 'Đang mở đơn hàng <b>#' + esc(tt.ma_don) + '</b>.';
      nut.push({ ten: 'Thêm vào đơn #' + tt.ma_don, chinh: true, lam: () => self.chayLo(false) });
      nut.push({ ten: 'Tạo đơn hàng mới', lam: () => self.chayLo(true) });
    } else {
      html += 'Bộ đầu tiên sẽ mở một <b>đơn hàng mới</b>, các bộ sau vào cùng đơn đó.';
      nut.push({ ten: 'Bắt đầu', chinh: true, lam: () => self.chayLo(false) });
    }
    nut.push({ ten: 'Thôi', lam: () => {} });
    this.hoi = { html: html, nut: nut };
    this.veDs();
  };
  U.chayLo = async function (don_moi) {
    const self = this;
    const con = this.ds.filter((d) => d.trang_thai !== 'da_luu' && !d.can_chon_mau);
    this.lo = { i: 0, tong: con.length, dung: false, ten: '' };
    this.kq_lo = null; this.hoi = null;
    let xong = 0, ma_don = '';
    const hong = [];
    try {
      if (don_moi) await this.dr.donMoi();
      for (let i = 0; i < con.length; i++) {
        const d = con[i];
        if (this.lo.dung) break;
        this.lo.i = i; this.lo.ten = d.cau_hinh.ky_hieu || M.moTa(d.cau_hinh);
        this.dang_mo = null; this.veDs();
        const f = this.cauHinhDong(d);
        const kh = this.keHoach(f);
        if (kh.loi.length) { d.trang_thai = 'loi'; d.loi = kh.loi[0]; hong.push(d); this.luuDs(); continue; }
        try {
          const r = await this.dr.ve(kh, { che_do: 'moi' });
          this.duaRaChoTrong();
          if (!r.doi_chieu.dung) throw new Error('Vẽ ra không khớp yêu cầu (' + r.doi_chieu.muc.filter((m) => !m.ok).map((m) => m.ten).join(', ') + ') — chưa lưu.');
          const tt_ = { ky_hieu: f.ky_hieu, so_luong: f.so_luong, vi_tri: f.vi_tri, ghi_chu: f.ghi_chu };
          this.dr.dienThongTin(tt_);
          try { d.gia = this._goiGia(await this.dr.tinhGia(), r); } catch (e) { delete d.gia; } // giá chỉ để xem; lỗi tính giá không chặn việc lưu
          this.anh[d.id] = this.dr.chupHinh();
          await cho(120);
          const l = await this.dr.luu({ thong_tin: tt_ });
          this.duaRaChoTrong();
          d.trang_thai = 'da_luu'; d.ma_bo = l.ma_bo; d.ma_don = l.ma_don; d.loi = r.canh_bao.join('; ');
          ma_don = l.ma_don; xong += 1;
          try { this.ban_ve_cua_toi = this.dr.cc().shapeManager.serialize(); } catch (e) { this.ban_ve_cua_toi = ''; }
        } catch (e) {
          d.trang_thai = 'loi'; d.loi = e && e.message ? e.message : String(e); hong.push(d);
          this.luuDs();
          break; // dừng ở lỗi đầu tiên để người dùng xem, không lưu tiếp bừa
        }
        this.luuDs(); this.demDs();
      }
    } catch (e) {
      hong.push({ cau_hinh: { ky_hieu: '' }, loi: e && e.message ? e.message : String(e) });
    }
    const dung_giua = this.lo.dung;
    this.lo = null;
    let html = 'Đã vẽ và lưu <b>' + xong + ' / ' + con.length + '</b> dòng' + (ma_don ? ' vào đơn hàng <b>#' + esc(ma_don) + '</b>' : '') + '.';
    if (hong.length) html += '<br><b>Dừng ở ' + esc(hong[0].cau_hinh.ky_hieu || 'một dòng') + ':</b> ' + esc(hong[0].loi || '') + '<br>Sửa xong bấm lại nút vẽ và lưu — các dòng đã lưu không bị làm lại.';
    else if (dung_giua) html += ' Đã dừng theo yêu cầu.';
    if (ma_don && !hong.length && !dung_giua) html += '<br>Bóc tách, báo giá, bản vẽ sản xuất của đơn đã có sẵn trong WindoorCraft:';
    this.kq_lo = { loai: hong.length ? 'loi' : 'tot', html: html, nut: ma_don ? this.nutSauLuu(ma_don) : null };
    this.luuDs(); this.demDs(); this.veDs(); this.nhip();
  };

  /** Các nút đi tiếp khi đơn đã lưu: mở đơn hàng, trang In, trang Tối ưu cắt (chỉ mở trang của WindoorCraft) */
  U.nutSauLuu = function (ma_don) {
    const self = this;
    // rời trang Thiết kế khi bản vẽ còn dở thì hỏi trước
    const roi = (lam) => () => {
      if (!self.dr.chuaLuu()) return lam();
      self.hoi = { html: 'Bản vẽ đang mở <b>chưa lưu</b> sẽ mất khi rời trang Thiết kế.', nut: [{ ten: 'Vẫn mở', chinh: true, lam: lam }, { ten: 'Thôi', lam: () => {} }] };
      self.veDs();
      return undefined;
    };
    const mo_don = roi(() => self.dr.moDon(ma_don));
    return [
      h('button', { class: 'nut nho', title: 'Trang đơn hàng của WindoorCraft: xem bóc tách từng bộ, điền khách hàng, xác nhận đơn', text: 'Mở đơn hàng #' + ma_don, onclick: mo_don }),
      h('button', { class: 'nut nho', title: 'Mở trang In của WindoorCraft ở thẻ mới: báo giá, bản vẽ sản xuất, danh sách kính, phụ kiện…', text: 'In báo giá · bản vẽ', onclick: () => { if (!self.dr.moIn(ma_don)) mo_don(); } }),
      h('button', { class: 'nut nho', title: 'Trang Tối ưu cắt nhôm của WindoorCraft cho đơn này (bấm Thực hiện → Lưu lại ở đó để có Danh sách nhôm, Bảng tối ưu)', text: 'Tối ưu cắt', onclick: roi(() => self.dr.moToiUu(ma_don)) }),
    ];
  };

  U._goiGia = function (g, r) {
    M.ghiMaDaGap(this.cd.gia_von, g.von); ghi(KHO.cd, this.cd);
    return { tong: g.tong, dien_tich: g.dien_tich, so_luong: g.so_luong, he_nhom: g.he_nhom, kinh: (r && r.kinh && r.kinh.ten) || '', von: g.von || [], boc_tach: g.boc_tach || null, luc: Date.now() };
  };
  /** Chữ "vốn … · lãi … (…%)" cho một bộ */
  U.chuLai = function (gia) {
    if (this.anVon()) return '';
    const l = M.laiBo(gia, this.cd.gia_von);
    if (!l) return '';
    return 'Giá vốn <b>' + M.tien(l.von) + '</b> · lãi <b style="color:' + (l.lai < 0 ? '#b03a2e' : '#1d5c37') + '">' + M.tien(l.lai) + ' đ (' + String(l.pt).replace('.', ',') + '%)</b>' + (this.coGiaVonRieng() ? '' : ' <span class="nho2">— đang dùng giá vốn trong WindoorCraft; đặt giá của xưởng ở Cài đặt → Giá vốn</span>');
  };
  U.coGiaVonRieng = function () { const gv = this.cd.gia_von || {}; return Number(gv.nhom_kg) > 0 || Object.keys(gv.theo_ma || {}).length > 0; };
  U.hoiTinhGia = function () {
    const self = this;
    const ss = this.dr.sanSang();
    if (!ss.ok) { this.kq_lo = { loai: 'loi', html: esc(ss.ly_do) }; return this.veDs(); }
    const tt = this.dr.trangThai();
    const n = this.ds.filter((d) => !d.gia && !d.can_chon_mau).length;
    let html = 'Tiện ích sẽ vẽ lần lượt <b>' + n + ' dòng</b> và hỏi giá WindoorCraft, mỗi dòng vài giây. <b>Không lưu</b> gì vào đơn hàng.';
    if (!tt.trong && !tt.ma_bo) html += '<br><b>Bản vẽ đang mở chưa lưu sẽ bị xoá.</b>';
    if (tt.ma_bo) html += '<br>Bộ đang mở (đã lưu) không bị đổi — tiện ích vẽ trên bản vẽ mới.';
    this.hoi = { html: html, nut: [{ ten: 'Tính giá', chinh: true, lam: () => self.chayTinhGia() }, { ten: 'Thôi', lam: () => {} }] };
    this.veDs();
  };
  U.chayTinhGia = async function (ds_lam, sau) {
    const self = this;
    const con = ds_lam || this.ds.filter((d) => !d.gia && !d.can_chon_mau);
    this.lo = { i: 0, tong: con.length, dung: false, ten: '', viec: 'gia' };
    this.kq_lo = null; this.hoi = null;
    let xong = 0;
    const hong = [];
    for (let i = 0; i < con.length; i++) {
      const d = con[i];
      if (this.lo.dung) break;
      this.lo.i = i; this.lo.ten = d.cau_hinh.ky_hieu || M.moTa(d.cau_hinh);
      this.dang_mo = null; this.veDs();
      const f = this.cauHinhDong(d);
      const kh = this.keHoach(f);
      if (kh.loi.length) { hong.push({ d: d, loi: kh.loi[0] }); continue; }
      try {
        const r = await this.dr.ve(kh, { che_do: 'moi' });
        this.duaRaChoTrong();
        this.dr.dienThongTin({ ky_hieu: f.ky_hieu, so_luong: f.so_luong, vi_tri: f.vi_tri, ghi_chu: f.ghi_chu });
        d.gia = this._goiGia(await this.dr.tinhGia(), r);
        this.anh[d.id] = this.dr.chupHinh();
        if (d.trang_thai === 'loi') { d.trang_thai = 'cho'; d.loi = ''; }
        xong += 1;
        try { this.ban_ve_cua_toi = this.dr.cc().shapeManager.serialize(); } catch (e) { this.ban_ve_cua_toi = ''; }
      } catch (e) { hong.push({ d: d, loi: e && e.message ? e.message : String(e) }); }
      this.luuDs();
    }
    this.lo = null;
    const b = M.bangBaoGia(this.ds, this.cd.bao_gia);
    let html = 'Đã tính giá <b>' + xong + ' / ' + con.length + '</b> dòng. Tổng có giá: <b>' + M.tien(b.tong) + ' đ</b>.';
    if (hong.length) html += '<br>Chưa tính được: ' + hong.map((x) => '<b>' + esc(x.d.cau_hinh.ky_hieu || '?') + '</b> (' + esc(x.loi) + ')').join('; ');
    this.kq_lo = { loai: hong.length ? 'cb' : 'tot', html: html, nut: b.dong.length ? [h('button', { class: 'nut nho chinh', text: 'Mở báo giá', onclick: () => self.moBaoGia() })] : null };
    this.luuDs(); this.demDs(); this.veDs(); this.nhip();
    if (sau && !hong.length && xong === con.length) return sau();
    return undefined;
  };
  /** Trang báo giá in được, mở ở thẻ mới */
  U.moBaoGia = function () {
    const tt = { khach: (this.cd.bao_gia_khach || ''), cong_trinh: (this.cd.bao_gia_cong_trinh || '') };
    const html = M.htmlBaoGia(this.ds, this.cd.bao_gia, tt);
    // mở dạng file tạm: xem, in, Ctrl+S lưu được như một trang bình thường
    let w = null;
    try { w = G.open(URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })), '_blank'); } catch (e) { w = null; }
    if (w) return true;
    this.taiVe('bao-gia-' + new Date().toISOString().slice(0, 10) + '.html', html, 'text/html;charset=utf-8'); // trình duyệt chặn cửa sổ mới → tải file về
    return false;
  };

  // ------------------------------------------------------------------ chế độ nhân viên (ẩn giá vốn, lãi)
  U.anVon = function () { return !!(this.cd.nhan_vien && this.cd.nhan_vien.khoa); };
  U.veKhoa = function () {
    const k = this.e.nut_khoa;
    if (!k) return;
    const an = this.anVon();
    k.textContent = an ? '🔒' : '🔓';
    k.title = an ? 'Chế độ nhân viên: đang ẩn giá vốn, lãi — bấm để mở khoá bằng mã PIN' : (this.cd.nhan_vien && this.cd.nhan_vien.ma ? 'Bấm để ẩn giá vốn, lãi (chế độ nhân viên)' : 'Ẩn giá vốn, lãi cho nhân viên báo giá — đặt mã PIN trước');
    k.classList.toggle('dang', an);
  };
  U.lamMoiHet = function () { this.veKhoa(); this.veNut(); this.veDs(); this.dungCd(); };
  U.bamKhoa = function () {
    const nv = this.cd.nhan_vien = Object.assign({ khoa: false, ma: '' }, this.cd.nhan_vien || {});
    if (!nv.khoa && nv.ma) { nv.khoa = true; ghi(KHO.cd, this.cd); this.lamMoiHet(); return; }
    this.doiThe('cd'); this.dungCd();
    const o = this.e.s.cd.querySelector('input[data-pin]');
    if (o) o.focus();
  };
  U.khoaNv = function (pin) {
    const p = String(pin || '').trim();
    if (!/^\d{4,8}$/.test(p)) return 'Mã PIN gồm 4–8 chữ số.';
    this.cd.nhan_vien = { khoa: true, ma: M.bamPin(p) }; ghi(KHO.cd, this.cd); this.lamMoiHet();
    return '';
  };
  U.moKhoaNv = function (pin) {
    const nv = this.cd.nhan_vien || {};
    if (!nv.ma || M.bamPin(pin) !== nv.ma) return 'Sai mã PIN.';
    nv.khoa = false; ghi(KHO.cd, this.cd); this.lamMoiHet();
    return '';
  };

  // ------------------------------------------------------------------ sản xuất: bản vẽ SX, file cắt, gửi máy cắt
  U.boSanXuat = function () {
    const self = this;
    return this.ds.filter((d) => !d.can_chon_mau).map((d) => {
      const c = d.cau_hinh, f = self.cauHinhDong(d);
      let kh = null; try { kh = self.keHoach(f); } catch (e) { kh = null; }
      let svg = ''; try { svg = kh && M.veSvg ? M.veSvg(kh, { rong: 420, cao_max: 380, co_kt: true }) : ''; } catch (e) { svg = ''; }
      return { id: d.id, ky_hieu: c.ky_hieu || '', so_luong: c.so_luong || 1, vi_tri: c.vi_tri || '', ghi_chu: c.ghi_chu || '', mo_ta: M.moTa(c), he_nhom: (d.gia && d.gia.he_nhom) || self.tenHe(self.heCuaDong(d)), kinh: c.kinh || (d.gia && d.gia.kinh) || '', rong: kh ? kh.rong : c.rong, cao: kh ? kh.cao : c.cao, anh: self.anh[d.id] || '', svg: svg, ma_don: d.ma_don || '', boc_tach: (d.gia && d.gia.boc_tach) || null };
    });
  };
  U.tenDonSx = function (bo) {
    const don = Array.from(new Set(bo.map((b) => b.ma_don).filter(Boolean)));
    if (don.length === 1) return 'HĐ ' + don[0];
    return this.cd.bao_gia_cong_trinh || ('DS ' + new Date().toISOString().slice(0, 10));
  };
  U.sanXuat = function (viec) {
    const self = this;
    const ss = this.dr.sanSang();
    const thieu = this.ds.filter((d) => !d.can_chon_mau && !(d.gia && d.gia.boc_tach));
    if (thieu.length) {
      if (!ss.ok) { this.kq_lo = { loai: 'loi', html: esc(ss.ly_do) }; return this.veDs(); }
      const tt = this.dr.trangThai();
      let html = '<b>' + thieu.length + ' dòng</b> chưa có số bóc tách. Tiện ích sẽ vẽ lần lượt từng dòng để WindoorCraft bóc tách (như Tính giá), <b>không lưu</b> gì, rồi ' + ({ ban_ve: 'mở bản vẽ sản xuất', excel: 'tải file cắt Excel', gui: 'gửi lên máy cắt' }[viec]) + '.';
      if (tt && !tt.trong && !tt.ma_bo) html += '<br><b>Bản vẽ đang mở chưa lưu sẽ bị xoá.</b>';
      this.hoi = { html: html, nut: [{ ten: 'Làm', chinh: true, lam: () => self.chayTinhGia(thieu, () => self.sanXuat(viec)) }, { ten: 'Thôi', lam: () => {} }] };
      return this.veDs();
    }
    const bo = this.boSanXuat();
    const don = this.tenDonSx(bo);
    const sx = this.cd.san_xuat || {};
    const tt = { don: don, cong_trinh: this.cd.bao_gia_cong_trinh || '', cong_ty: (this.cd.bao_gia || {}).cong_ty, cay: sx.cay, hao_dau: sx.hao_dau, mach: sx.mach };
    const ten_tep = don.replace(/[^\w\u00C0-\u1EF9 -]+/g, '').trim().replace(/\s+/g, '-');
    if (viec === 'ban_ve') return this.moTrang(M.htmlBanVe(bo, tt), 'ban-ve-san-xuat-' + ten_tep + '.html');
    if (viec === 'excel') { this.taiVe('cat-nhom-' + ten_tep + '.xlsx', M.xlsxCat(bo, tt), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); this.kq_lo = { loai: 'tot', html: 'Đã tải <b>cat-nhom-' + esc(ten_tep) + '.xlsx</b> — ' + M.dsCat(bo).length + ' dòng cắt, ' + M.toiUuCay(M.dsCat(bo), tt).length + ' cây nhôm.' }; return this.veDs(); }
    return this.guiMayCat(bo, tt);
  };
  /** Gửi đơn cắt lên máy chủ xưởng (sxnhom…). Ảnh không gửi; máy chủ tự tạo file Excel từ số bóc tách. */
  U.guiMayCat = async function (bo, tt) {
    const sx = this.cd.san_xuat || {};
    const url = String(sx.may_chu || '').replace(/\/+$/, '') + '/api/don';
    this.kq_lo = { loai: 'hoi', html: 'Đang gửi lên ' + esc(sx.may_chu) + '…' }; this.veDs();
    try {
      const than = { nguon: 'mn-windoor ' + M.PHIEN_BAN, don: tt.don, cong_trinh: tt.cong_trinh, khach: this.cd.bao_gia_khach || '', may: { cay: tt.cay, hao_dau: tt.hao_dau, mach: tt.mach }, bo: bo.map((b) => ({ ky_hieu: b.ky_hieu, so_luong: b.so_luong, vi_tri: b.vi_tri, ghi_chu: b.ghi_chu, mo_ta: b.mo_ta, he_nhom: b.he_nhom, kinh: b.kinh, rong: b.rong, cao: b.cao, ma_don: b.ma_don, svg: b.svg, boc_tach: b.boc_tach })) };
      const r = await G.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Khoa': sx.khoa_may || '' }, body: JSON.stringify(than) });
      let j = null; try { j = await r.json(); } catch (e) { j = null; }
      if (!r.ok || !j || !j.ok) throw new Error((j && j.loi) || ('máy chủ trả mã ' + r.status));
      this.kq_lo = { loai: 'tot', html: 'Đã gửi <b>' + esc(tt.don) + '</b> lên máy cắt (mã <b>' + esc(j.ma) + '</b>, ' + j.so_dong + ' dòng cắt). Trên máy cắt: mở ' + esc(sx.may_chu) + '/may hoặc để chương trình tự lấy về thư mục nhập.' };
    } catch (e) {
      this.kq_lo = { loai: 'loi', html: 'Chưa gửi được: ' + esc(e && e.message ? e.message : e) + '. Kiểm tra mạng, địa chỉ máy chủ và khoá ở Cài đặt → Sản xuất; vẫn tải được File cắt Excel để chép USB.' };
    }
    this.veDs();
  };
  U.moTrang = function (html, ten) {
    let w = null;
    try { w = G.open(URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })), '_blank'); } catch (e) { w = null; }
    if (w) return true;
    this.taiVe(ten, html, 'text/html;charset=utf-8');
    return false;
  };

  U.moDan = function () {
    const self = this;
    const ta = h('textarea', { rows: '7', placeholder: 'Ký hiệu\tMẫu\tRộng\tCao\tSL\tÔ thoáng\tVị trí\tGhi chú\tKính\nD1\tD2QT\t1600\t2700\t1\t500\tPhòng khách\t\tKINH 8.38TS\nS1\tS2L\t1400\t1200\t4\t\tPhòng ngủ' });
    const kq = h('div', { class: 'nho2', style: 'margin:4px 0' });
    let doc_ = null;
    const soat = () => {
      doc_ = M.docBang(ta.value, self.cd.mau_rieng);
      if (!ta.value.trim()) { kq.textContent = ''; return; }
      const thieu = doc_.dong.filter((d) => d.can_chon_mau).length;
      kq.innerHTML = 'Nhận <b>' + doc_.dong.length + '</b> dòng' + (thieu ? ', <b>' + thieu + '</b> dòng chưa rõ mẫu (chọn sau trong bảng)' : '') + (doc_.bo_qua.length ? '. Bỏ qua ' + doc_.bo_qua.length + ' dòng: ' + doc_.bo_qua.map((b) => 'dòng ' + b.so_dong + ' (' + esc(b.ly_do) + ')').join(', ') : '') + '.';
    };
    ta.addEventListener('input', soat);
    this._dan = h('div', { class: 'tb hoi' }, [
      h('div', { html: 'Chép các ô trong Excel rồi dán vào đây. Cột theo thứ tự: <b>Ký hiệu · Mẫu · Rộng · Cao · SL · Ô thoáng · Vị trí · Ghi chú · Kính</b> (có dòng tiêu đề thì cột xếp thế nào cũng được). Cột Mẫu ghi mã (D2QT, S2L…) hoặc mô tả ("cửa đi 2 cánh mở quay"). Cột Kính ghi đúng tên trong WindoorCraft, để trống = loại mặc định của hệ nhôm.' }),
      h('div', { style: 'margin-top:6px' }, [ta]), kq,
      h('div', { class: 'nuts' }, [
        h('button', { class: 'nut nho chinh', text: 'Thêm vào danh sách', onclick: () => {
          soat();
          if (!doc_ || !doc_.dong.length) { kq.textContent = 'Chưa có dòng nào hợp lệ.'; return; }
          doc_.dong.forEach((r) => {
            const goc = { ky_hieu: r.ky_hieu, so_luong: r.so_luong, vi_tri: r.vi_tri, ghi_chu: r.ghi_chu, kinh: r.kinh, rong: r.rong, cao: r.cao, kieu_so: self.cd.kieu_so };
            const c = r.mau ? M.apMau(goc, r.mau, self.cd, true) : M.chuanHoa(Object.assign({ ma_mau: '', ten: r.mau_goc || '' }, goc), self.cd);
            if (r.tren_cao) c.tren.cao = r.tren_cao;
            const d = { id: self._idMoi(), cau_hinh: c, trang_thai: 'cho' };
            if (r.can_chon_mau) { d.can_chon_mau = true; d.mau_goc = r.mau_goc; if (r.tren_cao) d.tren_cao = r.tren_cao; }
            self.ds.push(d);
          });
          self._dan = null; self.luuDs(); self.demDs(); self.veDs();
        } }),
        h('button', { class: 'nut nho', text: 'Đóng', onclick: () => { self._dan = null; self.veDs(); } }),
      ]),
    ]);
    this.veDs();
    ta.focus();
  };
  U.taiVe = function (ten, noi_dung, kieu) {
    const a = h('a', { href: URL.createObjectURL(new Blob([noi_dung], { type: kieu })), download: ten });
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  U.xuatCsv = function () { this.taiVe('danh-sach-cua-' + new Date().toISOString().slice(0, 10) + '.csv', M.xuatCsv(this.ds, this.cd.gia_von, this.anVon()), 'text/csv;charset=utf-8'); };

  // ------------------------------------------------------------------ THẺ CÀI ĐẶT
  U.dungCd = function () {
    const self = this, s = this.e.s.cd, cd = this.cd;
    try { this.he = this.dr.dsHeNhom(); } catch (e) { this.he = this.he || []; }
    s.textContent = '';
    const luu = () => { ghi(KHO.cd, cd); };
    const oSo = (lay, dat, tt) => { const i = h('input', Object.assign({ type: 'text', class: 'so', inputmode: 'decimal', value: String(lay()).replace('.', ',') }, tt || {})); i.addEventListener('change', () => { const n = M.so(i.value); if (isFinite(n) && n >= 0) { dat(n); luu(); } i.value = String(lay()).replace('.', ','); i.classList.remove('sai'); }); return i; };

    // 0. chế độ nhân viên
    const nv = cd.nhan_vien = Object.assign({ khoa: false, ma: '' }, cd.nhan_vien || {});
    const an_von = this.anVon();
    {
      const pin = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'off', 'data-pin': '1', placeholder: 'mã PIN 4–8 số', style: 'width:130px' });
      const bao = h('span', { class: 'nho2', style: 'color:#8a2219' });
      const lam = (fn) => () => { const l = fn(pin.value); pin.value = ''; if (l) bao.textContent = l; };
      pin.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') (an_von ? lam((v) => self.moKhoaNv(v)) : lam((v) => self.khoaNv(v)))(); });
      s.appendChild(h('h4', { text: an_von ? '🔒 Chế độ nhân viên báo giá' : 'Chế độ nhân viên báo giá' }));
      if (an_von) {
        s.appendChild(h('div', { class: 'nho2', style: 'margin-bottom:6px', text: 'Đang ẩn giá vốn, lãi và bảng giá vốn. Báo giá, bản vẽ, file cắt vẫn dùng bình thường.' }));
        s.appendChild(h('div', { class: 'hang' }, [pin, h('button', { class: 'nut nho chinh', text: 'Mở khoá', onclick: lam((v) => self.moKhoaNv(v)) }), bao]));
      } else {
        s.appendChild(h('div', { class: 'nho2', style: 'margin-bottom:6px', text: 'Máy của nhân viên báo giá: đặt mã PIN rồi khoá — giá vốn, lãi, bảng giá vốn bị ẩn; muốn xem lại phải nhập PIN. Nút 🔓/🔒 trên đầu bảng khoá nhanh.' }));
        s.appendChild(h('div', { class: 'hang' }, [pin, h('button', { class: 'nut nho chinh', text: nv.ma ? 'Đổi mã và khoá' : 'Đặt mã và khoá', onclick: lam((v) => self.khoaNv(v)) }), nv.ma ? h('button', { class: 'nut nho', text: 'Khoá ngay (mã cũ)', onclick: () => self.bamKhoa() }) : null, bao]));
      }
    }

    // 1. hệ nhôm theo mẫu
    s.appendChild(h('h4', { text: 'Hệ nhôm theo mẫu' }));
    s.appendChild(h('div', { class: 'nho2', style: 'margin-bottom:6px', text: 'Gán một lần: mẫu nào vẽ bằng hệ nhôm nào. Dòng trong danh sách không ghi hệ riêng sẽ theo bảng này. Để trống = dùng hệ đang chọn lúc vẽ.' }));
    if (!this.he.length) s.appendChild(h('div', { class: 'tb cb', text: 'Chưa đọc được danh mục hệ nhôm — mở trang Thiết kế của WindoorCraft rồi quay lại thẻ này.' }));
    else {
      const bang = h('div', { style: 'max-height:210px;overflow:auto;border:1px solid #dde3ec;border-radius:6px;padding:4px 6px' });
      this.dsMau().forEach((x) => {
        const c = h('select', { style: 'height:24px;font-size:12px' }, [h('option', { value: '', text: '— hệ đang chọn —' })].concat(self.he.map((p) => h('option', { value: String(p.id), text: p.ten }))));
        c.value = cd.he_nhom_theo_mau[x.ma] ? String(cd.he_nhom_theo_mau[x.ma]) : '';
        if (c.selectedIndex < 0) c.value = '';
        c.addEventListener('change', () => { if (c.value) cd.he_nhom_theo_mau[x.ma] = Number(c.value); else delete cd.he_nhom_theo_mau[x.ma]; luu(); self.apHeTheoMau(x.ma, true); });
        bang.appendChild(h('div', { class: 'hang', style: 'margin-bottom:3px' }, [h('span', { style: 'flex:none;width:150px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap', title: x.ten, html: '<b>' + esc(x.ma) + '</b> ' + esc(x.ten) }), h('span', { class: 'o' }, [c])]));
      });
      s.appendChild(bang);
      s.appendChild(h('div', { class: 'viec', style: 'margin-top:6px' }, [
        h('button', { class: 'nut nho', text: 'Điền gợi ý cho mẫu còn trống', title: 'Đoán theo tên hệ nhôm trong tài khoản — anh xem lại từng dòng', onclick: () => { let n = 0; self.dsMau().forEach((x) => { if (!cd.he_nhom_theo_mau[x.ma]) { const g = M.goiYHeNhom(x, self.he); if (g) { cd.he_nhom_theo_mau[x.ma] = g; n += 1; } } }); luu(); self.apHeTheoMau(null, false); self.dungCd(); self.e.s.cd.insertBefore(h('div', { class: 'tb cb', text: 'Đã điền gợi ý cho ' + n + ' mẫu theo tên hệ nhôm. Đây là phỏng đoán — anh soát lại từng dòng trước khi vẽ hàng loạt.' }), self.e.s.cd.children[2]); } }),
      ]));
    }

    // 2. ô chờ
    s.appendChild(h('h4', { text: 'Ô chờ → phủ bì khung' }));
    const lk = h('div', { class: 'cd-luoi' }, [h('span', { class: 'tieu', text: 'Trừ tổng khe hở (mm)' }), h('span', { class: 'tieu', text: 'Rộng' }), h('span', { class: 'tieu', text: 'Cao' })]);
    [['cua_di', 'Cửa đi'], ['cua_so', 'Cửa sổ'], ['vach', 'Vách kính']].forEach((l) => {
      lk.appendChild(h('span', { text: l[1] }));
      lk.appendChild(oSo(() => cd.khe[l[0]].rong, (n) => { cd.khe[l[0]].rong = n; }));
      lk.appendChild(oSo(() => cd.khe[l[0]].cao, (n) => { cd.khe[l[0]].cao = n; }));
    });
    s.appendChild(lk);

    // 3. chia đều
    s.appendChild(h('h4', { text: 'Chia ô đều' }));
    let pm = '';
    try { pm = this.dr.chiaDeuTheoPm() === 'lot_long' ? 'kính đều' : 'kích thước đều (tim đố)'; } catch (e) { pm = ''; }
    const c1 = h('select', null, [h('option', { value: 'theo_pm', text: 'Theo cài đặt của WindoorCraft' + (pm ? ' (đang: ' + pm + ')' : '') }), h('option', { value: 'tim', text: 'Tim đố cách đều' }), h('option', { value: 'lot_long', text: 'Lọt lòng ô bằng nhau (cánh bằng nhau)' })]);
    c1.value = cd.chia_deu; c1.addEventListener('change', () => { cd.chia_deu = c1.value; luu(); });
    const c2 = h('select', null, [h('option', { value: '1', text: 'Làm tròn tim đố tới 1 mm' }), h('option', { value: '0.5', text: 'Làm tròn tới 0,5 mm' }), h('option', { value: '0', text: 'Không làm tròn' })]);
    c2.value = String(cd.lam_tron); c2.addEventListener('change', () => { cd.lam_tron = Number(c2.value); luu(); });
    s.appendChild(h('div', { class: 'hang' }, [h('span', { class: 'o' }, [c1])]));
    s.appendChild(h('div', { class: 'hang' }, [h('span', { class: 'o' }, [c2])]));

    // 4. giới hạn cảnh báo
    s.appendChild(h('h4', { text: 'Giới hạn cảnh báo (mm)' }));
    s.appendChild(h('div', { class: 'nho2', style: 'margin-bottom:6px', text: 'Số ban đầu là số tham khảo chung của ngành — xưởng chỉnh theo hệ nhôm và phụ kiện đang dùng. Vượt giới hạn chỉ cảnh báo, vẫn vẽ được.' }));
    const gh = h('div', { class: 'cd-luoi b4' }, [h('span', { class: 'tieu', text: 'Một cánh' }), h('span', { class: 'tieu', text: 'Rộng ≥' }), h('span', { class: 'tieu', text: 'Rộng ≤' }), h('span', { class: 'tieu', text: 'Cao ≥' }), h('span', { class: 'tieu', text: 'Cao ≤' })]);
    ['quay_so', 'hat', 'quay_di', 'lua', 'xep'].forEach((k) => {
      gh.appendChild(h('span', { text: M.TEN_GIOI_HAN[k], style: 'font-size:12px' }));
      ['rong_min', 'rong_max', 'cao_min', 'cao_max'].forEach((t) => gh.appendChild(oSo(() => cd.gioi_han[k][t], (n) => { cd.gioi_han[k][t] = n; })));
    });
    s.appendChild(gh);
    s.appendChild(h('div', { class: 'hang', style: 'margin-top:6px' }, [h('span', { class: 'o', text: 'Một tấm kính cố định tối đa (m²)', style: 'font-size:12px' }), h('span', { class: 'hep' }, [oSo(() => cd.gioi_han.fix.dien_tich_max, (n) => { cd.gioi_han.fix.dien_tich_max = n; })])]));
    s.appendChild(h('div', { class: 'hang' }, [h('span', { class: 'o', text: 'Chiều dài cây nhôm (mm)', style: 'font-size:12px' }), h('span', { class: 'hep' }, [oSo(() => cd.gioi_han.khung.dai_max, (n) => { cd.gioi_han.khung.dai_max = n; })])]));

    // 5. mẫu riêng
    if ((cd.mau_rieng || []).length) {
      s.appendChild(h('h4', { text: 'Mẫu của xưởng' }));
      cd.mau_rieng.forEach((x) => s.appendChild(h('div', { class: 'hang' }, [h('span', { class: 'o', html: '<b>' + esc(x.ma) + '</b> ' + esc(x.ten) + ' <span class="nho2">' + M.ghi(x.rong) + ' × ' + M.ghi(x.cao) + '</span>' }), h('button', { class: 'lien xoa', text: 'Xoá', onclick: () => { cd.mau_rieng = cd.mau_rieng.filter((y) => y.ma !== x.ma); delete cd.he_nhom_theo_mau[x.ma]; luu(); self.veNhomMau(); self.dungCd(); } })])));
    }

    // 5a. giá vốn của xưởng (ẩn ở chế độ nhân viên)
    if (!an_von) {
    s.appendChild(h('h4', { text: 'Giá vốn (tính lãi — không in lên báo giá)' }));
    const gv = cd.gia_von = Object.assign({ nhom_kg: 0, theo_ma: {}, da_gap: {} }, cd.gia_von || {});
    s.appendChild(h('div', { class: 'nho2', style: 'margin-bottom:6px', text: 'Tiện ích lấy số bóc tách của WindoorCraft (kg nhôm từng mã thanh, m² kính, số phụ kiện) nhân với giá dưới đây. Ô để trống = dùng giá vốn đang đặt trong WindoorCraft.' }));
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'Nhôm chung' }), h('span', { class: 'vua' }, [oSo(() => gv.nhom_kg || '', (n) => { gv.nhom_kg = n; })]), h('span', { class: 'nho2 o', text: 'đ/kg, áp cho mọi thanh nhôm (0 = không dùng). Mã nào cần giá riêng thì ghi ở bảng dưới.' })]));
    const ma = Object.keys(gv.da_gap || {});
    if (!ma.length) s.appendChild(h('div', { class: 'tb cb', text: 'Chưa có mã vật tư nào — vẽ một bộ (hoặc bấm Tính giá ở thẻ Danh sách) để tiện ích biết các mã nhôm, kính, phụ kiện của xưởng.' }));
    else {
      const bang = h('div', { style: 'max-height:260px;overflow:auto;border:1px solid #dde3ec;border-radius:6px;padding:4px 6px' });
      ['profile', 'glass', 'hardware', 'addon', 'poly'].forEach((loai) => {
        const cua = ma.filter((m) => (gv.da_gap[m].loai || 'addon') === loai).sort();
        if (!cua.length) return;
        bang.appendChild(h('div', { class: 'nho2', style: 'margin:6px 0 2px;font-weight:600', text: (M.TEN_LOAI_VON[loai] || loai) + (M.DVT_LOAI_VON[loai] ? ' (' + M.DVT_LOAI_VON[loai] + ')' : '') }));
        cua.forEach((m) => {
          const x = gv.da_gap[m];
          const i = h('input', { type: 'text', class: 'so', inputmode: 'decimal', placeholder: M.tien(x.gia_wc), value: gv.theo_ma[m] !== undefined ? M.tien(gv.theo_ma[m]) : '' });
          i.addEventListener('change', () => { const v = i.value.trim(); if (v === '') delete gv.theo_ma[m]; else { const n = M.so(v.replace(/\./g, '')); if (isFinite(n) && n >= 0) gv.theo_ma[m] = n; } i.value = gv.theo_ma[m] !== undefined ? M.tien(gv.theo_ma[m]) : ''; luu(); });
          bang.appendChild(h('div', { class: 'hang', style: 'margin-bottom:3px' }, [h('span', { class: 'o', style: 'font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap', title: m + ' — ' + x.ten, html: '<b>' + esc(m) + '</b> ' + esc(x.ten) }), h('span', { class: 'vua' }, [i])]));
        });
      });
      s.appendChild(bang);
      s.appendChild(h('div', { class: 'nho2', style: 'margin-top:4px', text: 'Số mờ trong ô = giá vốn đang đặt trong WindoorCraft. Đổi giá xong, lãi trong Danh sách tự tính lại, không cần vẽ lại.' }));
    }
    }

    // 5c. sản xuất
    s.appendChild(h('h4', { text: 'Sản xuất · máy cắt' }));
    const sx = cd.san_xuat = Object.assign({}, M.CAI_DAT.san_xuat, cd.san_xuat || {});
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'Cây nhôm' }), h('span', { class: 'vua' }, [oSo(() => sx.cay, (n) => { if (n >= 1000) sx.cay = n; })]), h('label', { text: 'Hao đầu' }), h('span', { class: 'hep' }, [oSo(() => sx.hao_dau, (n) => { sx.hao_dau = n; })]), h('label', { text: 'Mạch cưa' }), h('span', { class: 'hep' }, [oSo(() => sx.mach, (n) => { sx.mach = n; })])]));
    const oMc = h('input', { type: 'text', value: sx.may_chu || '', placeholder: 'https://sxnhom.motnha.vn' });
    oMc.addEventListener('change', () => { const v = oMc.value.trim().replace(/\/+$/, ''); if (!v || /^https?:\/\/[\w.-]+(:\d+)?(\/[\w./-]*)?$/.test(v)) { sx.may_chu = v; luu(); } oMc.value = sx.may_chu; });
    const oK = h('input', { type: 'password', autocomplete: 'off', value: sx.khoa_may || '', placeholder: 'khoá do máy chủ cấp' });
    oK.addEventListener('change', () => { sx.khoa_may = oK.value.trim(); luu(); });
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'Máy chủ' }), h('span', { class: 'o' }, [oMc])]));
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'Khoá gửi' }), h('span', { class: 'o' }, [oK])]));
    s.appendChild(h('div', { class: 'nho2', text: 'Đơn vị mm. Cây, hao đầu, mạch cưa dùng cho bảng tối ưu cây trong file Excel. "Gửi máy cắt" đẩy danh sách cắt lên máy chủ; máy cắt mở trang /may của máy chủ (hoặc chạy chương trình tự lấy) để nhận file.' }));

    // 5b. thông tin trên báo giá
    s.appendChild(h('h4', { text: 'Báo giá' }));
    const bg = cd.bao_gia = Object.assign({}, M.CAI_DAT.bao_gia, cd.bao_gia || {});
    const oChu = (lay, dat, tt) => { const i = h('input', Object.assign({ type: 'text', value: lay() }, tt || {})); i.addEventListener('change', () => { dat(i.value.trim()); luu(); }); return i; };
    [['cong_ty', 'Công ty'], ['dia_chi', 'Địa chỉ'], ['dien_thoai', 'Điện thoại']].forEach((x) => s.appendChild(h('div', { class: 'hang' }, [h('label', { text: x[1] }), h('span', { class: 'o' }, [oChu(() => bg[x[0]], (v) => { bg[x[0]] = v; })])])));
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'Khách hàng' }), h('span', { class: 'o' }, [oChu(() => cd.bao_gia_khach || '', (v) => { cd.bao_gia_khach = v; }, { placeholder: 'tên khách cho báo giá đang làm' })])]));
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'Công trình' }), h('span', { class: 'o' }, [oChu(() => cd.bao_gia_cong_trinh || '', (v) => { cd.bao_gia_cong_trinh = v; }, { placeholder: 'địa chỉ / tên công trình' })])]));
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'VAT (%)' }), h('span', { class: 'hep' }, [oSo(() => bg.vat, (n) => { bg.vat = n; })]), h('span', { class: 'nho2 o', text: '0 = ghi "chưa gồm VAT"' })]));
    const gc = h('textarea', { rows: '2', style: 'font-family:inherit;font-size:12px' }); gc.value = bg.ghi_chu || '';
    gc.addEventListener('change', () => { bg.ghi_chu = gc.value.trim(); luu(); });
    s.appendChild(h('div', { class: 'hang' }, [h('label', { text: 'Ghi chú cuối' }), h('span', { class: 'o' }, [gc])]));

    // 6. sao lưu
    s.appendChild(h('h4', { text: 'Sao lưu / chuyển sang máy khác' }));
    const tep = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    tep.addEventListener('change', () => {
      const f = tep.files && tep.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const j = JSON.parse(String(r.result));
          if (!j || j.loai !== 'mn-windoor') throw new Error('Không phải file sao lưu của tiện ích này.');
          const giu_nv = self.anVon() ? { nhan_vien: self.cd.nhan_vien, gia_von: self.cd.gia_von } : null; // máy nhân viên: nạp file không mở được khoá, không đổi giá vốn
          self.cd = M.gopCaiDat(j.cai_dat); if (giu_nv) Object.assign(self.cd, giu_nv); ghi(KHO.cd, self.cd);
          if (Array.isArray(j.danh_sach)) { self.ds = j.danh_sach; self.luuDs(); }
          self.veNhomMau(); self.dienForm(); self.demDs(); self.dungCd(); self.veKhoa();
          self.e.s.cd.insertBefore(h('div', { class: 'tb tot', text: 'Đã nạp cài đặt' + (Array.isArray(j.danh_sach) ? ' và danh sách ' + j.danh_sach.length + ' dòng' : '') + '.' }), self.e.s.cd.firstChild);
        } catch (e) { self.e.s.cd.insertBefore(h('div', { class: 'tb loi', text: 'Không nạp được: ' + (e.message || e) }), self.e.s.cd.firstChild); }
        tep.value = '';
      };
      r.readAsText(f);
    });
    s.appendChild(h('div', { class: 'viec', style: 'margin-top:0' }, [
      h('button', { class: 'nut nho', text: 'Xuất cài đặt + danh sách', onclick: () => self.taiVe('mn-windoor-sao-luu-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ loai: 'mn-windoor', phien_ban: M.PHIEN_BAN, luc: new Date().toISOString(), cai_dat: an_von ? M.boGiaVon(cd, self.ds).cai_dat : cd, danh_sach: an_von ? M.boGiaVon(cd, self.ds).danh_sach : self.ds }, null, 1), 'application/json') }),
      h('button', { class: 'nut nho', text: 'Nạp từ file…', onclick: () => tep.click() }), tep,
      h('span', { style: 'flex:1' }),
      h('button', { class: 'nut nho nguy', text: 'Đặt lại mặc định', onclick: () => { const giu = { he_nhom_theo_mau: cd.he_nhom_theo_mau, mau_rieng: cd.mau_rieng, nhan_vien: cd.nhan_vien, gia_von: cd.gia_von, san_xuat: cd.san_xuat }; self.cd = M.gopCaiDat(giu); ghi(KHO.cd, self.cd); self.dungCd(); self.capNhatXem(); } }),
    ]));
    s.appendChild(h('div', { class: 'nho2', style: 'margin-top:10px', html: 'Một Nhà · Vẽ cửa v' + M.PHIEN_BAN + (G.__mnwd_nguon && G.__mnwd_nguon.nguon !== 'goc' ? ' (tự cập nhật)' : '') + (G.__mnwd_ban_moi ? ' · <b>đã tải bản ' + esc(G.__mnwd_ban_moi) + ', F5 để dùng</b>' : '') + '. Cài đặt và danh sách lưu trong trình duyệt của máy này. Tiện ích chỉ vẽ và bấm <b>Lưu lại</b> giúp; không xoá, không sửa đơn hàng cũ.' }));
  };

  M.UI = UI;
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ===== src/mnwd-main.js =====
/* Một Nhà · Vẽ cửa — KHỞI ĐỘNG trong trang WindoorCraft */
(function (G) {
  'use strict';
  const M = G.MNWD;
  if (!M || !G.document || !M.UI || !M.Driver) return; // đang chạy trong Node (phép thử)
  try { if (G.top !== G) return; } catch (e) { return; } // không chạy trong khung con
  if (G.__mnwd_dang_chay) { try { G.__mnwd_dang_chay.dung(); } catch (e) { /* bản cũ */ } } // nạp đè bản mới không cần F5

  const dr = new M.Driver(G);
  const ui = new M.UI(dr);
  M.dr = dr; M.ui = ui;
  let nhip = null;
  const thu = function () {
    if (!G.document.body) return;
    let vao = false;
    try { vao = dr.daDangNhap(); } catch (e) { vao = false; }
    if (vao) ui.gan(); else if (ui.host) ui.thao();
  };
  G.__mnwd_dang_chay = { dung: function () { if (nhip) G.clearInterval(nhip); ui.thao(); }, ui: ui, dr: dr };
  thu();
  nhip = G.setInterval(thu, 1500);
})(typeof globalThis !== 'undefined' ? globalThis : this);
