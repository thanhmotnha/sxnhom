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
