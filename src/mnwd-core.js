/* Một Nhà · Vẽ cửa — LÕI TÍNH TOÁN
 * Không phụ thuộc trình duyệt: chạy được trong Node (phép thử) và trong trang WindoorCraft.
 *
 * Quy ước toạ độ: gốc (0,0) ở góc TRÊN-TRÁI phủ bì khung, x sang phải, y xuống dưới, đơn vị mm.
 * Mọi số đo "ô trên / ô dưới / vách bên" tính tới TIM ĐỐ — trùng với số WindoorCraft ghi trên bản vẽ.
 */
(function (G) {
  'use strict';
  const M = G.MNWD = G.MNWD || {};
  M.PHIEN_BAN = '0.3.1';

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
