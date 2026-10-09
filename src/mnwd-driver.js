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
