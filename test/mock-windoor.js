/* TRANG GIẢ LẬP WINDOORCRAFT — chỉ dùng để thử tự động.
 * Bắt chước đúng những gì đã đo trên phần mềm thật (ln.windoorcraft.com, 08/10/2026):
 *  - window.webcc = {shapeManager, toolManager, mometoManager, eventBus, eventsEmitted}
 *  - 3 lớp hình học không có tên công khai → phải dò qua toolManager.mousePosition / tools.mullion_vertical()
 *  - khung 4 cạnh addRectFrame(w,h) gốc (0,0); khung cửa đi = tools.door().clickShape rồi resize, đáy hở
 *  - đố chỉ cắt ô chứa điểm của đường thẳng; avaiablePoly (đúng chính tả của họ) = danh sách ô
 *  - cánh: sashAsDoor lúc tạo quyết định isDoor (3 bản lề); đổi hướng qua đối tượng cài đặt phát theo sự kiện sash_settings
 *  - trang vẽ Vue: doBarAction({action:'clean'}), saveOrder(), $route.query.contract_id / order_id, $VMessage
 */
(function (G) {
  'use strict';

  const SP = [ // một phần danh mục hệ nhôm thật của tài khoản
    { header: 'XINGFA*/XINGFA 55', id: '1261s' },
    { id: 155849, name: 'XINGFA-55-Vách kính cố định (kết hợp khung đảo chiều-Cánh mở ra ngoài)', show_setting: '{"frame": 31.2, "frameMullion": 30.4, "sash": 57.2}', draw_setting: '{"sashOutwardOpen": 1, "slideDefaultOption": 15}' },
    { id: 151076, name: 'XINGFA-55 Cửa đi mở quay - sử dụng đố chân cánh to 3304', show_setting: '{"frame": 47.2, "frameMullion": 37.4, "sash": 68.2}', draw_setting: '{"sashOutwardOpen": 1, "slideDefaultOption": 15}' },
    { id: 152612, name: 'XINGFA-55-CỬA SỔ LÙA 55(LÙA 3 CÂY)', show_setting: '{"frame": 40, "frameMullion": 30}', draw_setting: '{"sashOutwardOpen": 1, "slideDefaultOption": 15}' },
    { divider: true },
    { header: 'XINGFA*/XF-CỬA LÙA 93', id: '3000s' },
    { id: 71881, name: 'XINGFA-93- Cửa lùa ray bằng,cánh đứng rộng 62', show_setting: '{"frame": 45, "frameMullion": 62}', draw_setting: '{"sashOutwardOpen": 1, "slideDefaultOption": 15}' },
    { header: 'XINGFA*/XEP TRUOT 63', id: '3001s' },
    { id: 71888, name: 'XINGFA-63-Hệ xếp trượt ( Đang cập nhật)', show_setting: '{"frame": 50, "frameMullion": 40}', draw_setting: '{"sashOutwardOpen": 0}' },
  ];
  // danh mục kính theo hệ nhôm (tên, mặc định, độ dày) — hệ 155849 cố ý có một tên trùng như danh mục thật
  const KINH = {
    155849: [['KINH 6.38TS', 1, '6.38'], ['KINH 8.38TS', 0, '8.38'], ['KINH HOP 19MM', 0, '19'], ['KINH 8.38TS', 0, '8.38']],
    151076: [['KINH 6.38TS', 1, '6.38'], ['KINH 8.38TS', 0, '8.38']],
    152612: [['KINH 5MM', 1, '5'], ['KINH 6.38TS', 0, '6.38']],
    71881: [],
    71888: [['KINH 10MM', 0, '10'], ['KINH 12MM', 0, '12']], // hệ không đặt loại mặc định
  };
  const LUA = [[0, 'A0-A1'], [1, 'A0-A1-S0'], [2, 'A0A3-A1A2'], [4, 'A0A2-A1|V'], [11, 'A0'], [15, 'A1-A0'], [18, 'A1A2-A0A3'], [20, 'A0A2-A1'], [21, 'A1-A0A2'], [22, 'A0-A1-A2'], [26, 'D0-D1'], [41, 'A0A5-A1A4-A2A3'], [42, 'A2A3-A1A4-A0A5'], [78, 'A0-A1-A2-A3-A4']];

  function taoMock(tuy) {
    tuy = tuy || {};
    function Pt(x, y) { this.x = x || 0; this.y = y || 0; }
    function Vec(x, y) { this.x = x || 0; this.y = y || 0; }
    function Line(pt, norm) { this.pt = pt; this.norm = norm; }

    const nk = { tb: [], lenh: [], canh_giua: [] };
    const da_luu = []; // các bộ cửa đã "lưu lên máy chủ"
    let ma = 1000;
    const store = { state: { global_loading: false, userinfo: tuy.khong_nguoi_dung ? {} : { id: 7001, company_id: 31, son_account_type: 2 } } };

    const mm = { so_cp: 0, checkPoint: function () { this.so_cp += 1; }, clean: function () { this.so_cp = 0; }, undo: function () {} };
    const eb = { da_phat: [], emit: function (ev) { this.da_phat.push(ev); } };
    const cc = { shapeManager: null, toolManager: null, mometoManager: mm, eventBus: eb, eventsEmitted: [], lenUnit: 'Millimeters', refresh: function () {} };

    function CaiDat(hm, view) { this.manager = hm; this.view = view; }
    ['openDirection', 'openToward'].forEach(function (k) {
      Object.defineProperty(CaiDat.prototype, k, {
        get: function () { return this.manager[k]; },
        set: function (v) { if (this.manager[k] === v) return; this.manager[k] = v; this.view.mometoManager.checkPoint(); },
      });
    });

    function Poly(x0, y0, x1, y1, type) { this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1; this.type = type || 'polygon'; }
    Object.defineProperty(Poly.prototype, 'box', { get: function () { return { xmin: this.x0, ymin: this.y0, xmax: this.x1, ymax: this.y1 }; } });
    Poly.prototype.toJSON = function () { return { type: this.type }; };

    function phatCaiDat(t, view) {
      if (view.eventsEmitted.some(function (x) { return x === 'sash_settings'; })) return;
      view.eventBus.emit({ type: 'sash_settings', payload: new CaiDat(t.hardwareManager, view) });
      view.eventsEmitted.push('sash_settings');
    }
    function taoLa(hop, dir, toward, la_cua) {
      return {
        type: 'Sash', polygon: { box: hop }, isDoor: !!la_cua,
        hardwareManager: { openDirection: dir, openToward: toward, hinges: la_cua ? [1, 2, 3] : [], handleType: la_cua ? 'Handle2' : 'Handle' },
        emitSashSetting: phatCaiDat, updatePoly: function () {}, draw: function () {},
      };
    }

    let dang_kinh = '';
    function Khung(poly) {
      this.type = 'Frame'; this.polygon = poly; this.uid = ++ma;
      this.kh = sm.profileSize.frame; this.dn = sm.profileSize.frameMullion;
      this.do_ = []; this._o = []; this._fenes = [];
      this.kinh = dang_kinh; // khung mới lấy loại kính đang chọn (như WindoorCraft)
      const self = this;
      this.sashManager = {
        get _ifenes() { return self._fenes; },
        get sashes() { return self._fenes.filter(function (f) { return f.type === 'Sash'; }); },
        get doubleSashes() { return self._fenes.filter(function (f) { return f.type === 'DoubleSash'; }); },
        get slides() { return self._fenes.filter(function (f) { return f.type === 'Slide'; }); },
        get folds() { return self._fenes.filter(function (f) { return f.type === 'FoldSash'; }); },
        get allSashes() { return self._fenes.reduce(function (a, f) { return a.concat(f.sashes || [f]); }, []); },
      };
      this._tinh();
    }
    Khung.prototype._lui = function (b) { return b === 'k' ? this.kh : b === 'd' ? this.dn / 2 : 0; };
    Khung.prototype._long = function (c) { return { xmin: c.x0 + this._lui(c.b.l), ymin: c.y0 + this._lui(c.b.t), xmax: c.x1 - this._lui(c.b.r), ymax: c.y1 - this._lui(c.b.d) }; };
    Khung.prototype._tinh = function () {
      const p = this.polygon;
      let o = [{ x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1, b: { l: 'k', t: 'k', r: 'k', d: p.type === 'door' ? 'o' : 'k' } }];
      for (let i = 0; i < this.do_.length; i++) {
        const r = this._cat(o, this.do_[i]);
        if (r) o = r;
      }
      this._o = o;
    };
    Khung.prototype._cat = function (o, l) {
      const self = this;
      for (let i = 0; i < o.length; i++) {
        const c = o[i], L = self._long(c);
        if (!(l.pt.x > L.xmin && l.pt.x < L.xmax && l.pt.y > L.ymin && l.pt.y < L.ymax)) continue;
        let a, b;
        if (l.norm.x !== 0) { // đố đứng
          a = { x0: c.x0, y0: c.y0, x1: l.pt.x, y1: c.y1, b: { l: c.b.l, t: c.b.t, r: 'd', d: c.b.d } };
          b = { x0: l.pt.x, y0: c.y0, x1: c.x1, y1: c.y1, b: { l: 'd', t: c.b.t, r: c.b.r, d: c.b.d } };
        } else {
          a = { x0: c.x0, y0: c.y0, x1: c.x1, y1: l.pt.y, b: { l: c.b.l, t: c.b.t, r: c.b.r, d: 'd' } };
          b = { x0: c.x0, y0: l.pt.y, x1: c.x1, y1: c.y1, b: { l: c.b.l, t: 'd', r: c.b.r, d: c.b.d } };
        }
        return o.slice(0, i).concat([a, b], o.slice(i + 1));
      }
      return null;
    };
    Object.defineProperty(Khung.prototype, 'avaiablePoly', { get: function () { const s = this; return this._o.map(function (c) { return { polygon: { box: s._long(c) } }; }); } });
    Khung.prototype.addMullion = function (l) {
      if (!this._cat(this._o, l)) return false;
      this.do_.push(l); this._tinh();
      return true;
    };
    Khung.prototype._oTai = function (pt) {
      for (let i = 0; i < this._o.length; i++) {
        const L = this._long(this._o[i]);
        if (pt.x > L.xmin && pt.x < L.xmax && pt.y > L.ymin && pt.y < L.ymax) {
          const ban = this._fenes.some(function (f) { const b = f.polygon.box; return pt.x > b.xmin && pt.x < b.xmax && pt.y > b.ymin && pt.y < b.ymax; });
          return ban ? null : L;
        }
      }
      return null;
    };
    Khung.prototype.resize = function (kt) {
      const p = this.polygon, cx = (p.x0 + p.x1) / 2, cy = (p.y0 + p.y1) / 2;
      if (kt.width) { p.x0 = cx - kt.width / 2; p.x1 = cx + kt.width / 2; }
      if (kt.height) { p.y0 = cy - kt.height / 2; p.y1 = cy + kt.height / 2; }
      this._tinh();
    };
    Khung.prototype.updatePoly = function () {}; Khung.prototype.draw = function () {};
    Khung.prototype.xuat = function () {
      const p = this.polygon;
      return {
        x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1, type: p.type, kh: this.kh, dn: this.dn,
        do_: this.do_.map(function (l) { return { x: l.pt.x, y: l.pt.y, nx: l.norm.x, ny: l.norm.y }; }),
        fenes: this._fenes.map(function (f) {
          const b = f.polygon.box;
          return { type: f.type, cx: (b.xmin + b.xmax) / 2, cy: (b.ymin + b.ymax) / 2, isDoor: f.isDoor, dir: f.hardwareManager && f.hardwareManager.openDirection, toward: f.hardwareManager ? f.hardwareManager.openToward : f.openToward, opt: f.appliedOptionIndex, l: f.leftCount, r: f.rightCount, asPush: f.asPush, n: (f.sashes || []).length, la: (f.sashes || []).map(function (s) { return s.hardwareManager.openToward; }) };
        }),
      };
    };

    function dungXep(f) {
      const b = f.polygon.box, n = f._l + f._r, w = (b.xmax - b.xmin) / Math.max(1, n);
      f.sashes = [];
      for (let i = 0; i < n; i++) f.sashes.push(taoLa({ xmin: b.xmin + i * w, ymin: b.ymin, xmax: b.xmin + (i + 1) * w, ymax: b.ymax }, i < f._l ? 'left' : 'right', f.openToward, f.isDoor));
    }
    function taoXep(L, l, r, as_push) {
      const f = { type: 'FoldSash', polygon: { box: L }, isDoor: sm.sashAsDoor, openToward: as_push ? 'outward' : 'inward', asPush: !!as_push, _l: l, _r: r, foldWayChanged: false, sashes: [], updatePoly: function () { if (this.foldWayChanged) { dungXep(this); this.foldWayChanged = false; } }, draw: function () {} };
      Object.defineProperty(f, 'leftCount', { get: function () { return this._l; }, set: function (v) { this._l = v; this.foldWayChanged = true; }, enumerable: true });
      Object.defineProperty(f, 'rightCount', { get: function () { return this._r; }, set: function (v) { this._r = v; this.foldWayChanged = true; }, enumerable: true });
      dungXep(f);
      return f;
    }

    const sm = {
      shapem: [], sashAsDoor: false, sashOutwardOpen: true, readonly: false, title: '',
      profileSize: { frame: 31.2, frameMullion: 30.4 },
      slideOptions: LUA.map(function (x) { return { index: x[0], serial: x[1] }; }), slideDefaultOption: 15,
      _ban: false,
      get isEmpty() { return this.shapem.length === 0; },
      toData: function () { return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; },
      get glassSpec() { return { spec: this.shapem.length ? this.shapem[0].kinh : '' }; },
      set glassSpec(v) { dang_kinh = (v && v.spec) || ''; this.shapem.forEach(function (f) { f.kinh = dang_kinh; }); this._ban = true; mm.checkPoint(); },
      get isDirty() { return this._ban; },
      clear: function () { this.shapem = []; this._ban = false; nk.lenh.push('clear'); },
      addRectFrame: function (w, h) { const f = new Khung(new Poly(0, 0, w, h, 'polygon')); this.shapem.push(f); this._ban = true; nk.lenh.push('khung4 ' + w + 'x' + h); return f; },
      add: function (poly) { const f = new Khung(poly); this.shapem.push(f); this._ban = true; nk.lenh.push('khung ' + poly.type); return f; },
      setFrameSize: function (w, h) { if (this.shapem.length === 1) { this.shapem[0].resize({ width: w, height: h }); mm.checkPoint(); } },
      addMullion: function (l) { for (let i = 0; i < this.shapem.length; i++) if (this.shapem[i].addMullion(l)) { nk.lenh.push((l.norm.x !== 0 ? 'do dung ' + l.pt.x : 'do ngang ' + l.pt.y)); break; } },
      _dat: function (pt, tao) {
        for (let i = 0; i < this.shapem.length; i++) {
          const L = this.shapem[i]._oTai(pt);
          if (L) { const f = tao(L); this.shapem[i]._fenes.push(f); return f; }
        }
        return null;
      },
      addSash: function (pt, type) {
        const s = this;
        return this._dat(pt, function (L) { nk.lenh.push('canh ' + (s.sashAsDoor ? 'di' : 'so')); return taoLa(L, 'left', s.sashOutwardOpen ? 'outward' : 'inward', s.sashAsDoor); });
      },
      addDoubleSash: function (pt) {
        const s = this;
        return this._dat(pt, function (L) {
          const xm = (L.xmin + L.xmax) / 2, tw = s.sashOutwardOpen ? 'outward' : 'inward';
          nk.lenh.push('canh doi ' + (s.sashAsDoor ? 'di' : 'so'));
          return { type: 'DoubleSash', polygon: { box: L }, isDoor: s.sashAsDoor, openToward: tw, sashes: [taoLa({ xmin: L.xmin, ymin: L.ymin, xmax: xm, ymax: L.ymax }, 'left', tw, s.sashAsDoor), taoLa({ xmin: xm, ymin: L.ymin, xmax: L.xmax, ymax: L.ymax }, 'right', tw, s.sashAsDoor)], updatePoly: function () {}, draw: function () {} };
        });
      },
      addSlide: function (pt, k) {
        const s = this;
        return this._dat(pt, function (L) {
          if (k === undefined || k === null) k = s.slideDefaultOption;
          const o = s.slideOptions.filter(function (x) { return x.index === k; })[0] || s.slideOptions[0];
          const n = (o.serial.match(/[A-Z]\d+/g) || []).length, w = (L.xmax - L.xmin) / n, la = [];
          for (let i = 0; i < n; i++) la.push(taoLa({ xmin: L.xmin + i * w, ymin: L.ymin, xmax: L.xmin + (i + 1) * w, ymax: L.ymax }, 'left', 'outward', false));
          nk.lenh.push('lua ' + o.serial);
          return { type: 'Slide', polygon: { box: L }, isDoor: s.sashAsDoor, appliedOptionIndex: o.index, sashes: la, updatePoly: function () {}, draw: function () {} };
        });
      },
      addFold: function (pt) { return this._dat(pt, function (L) { nk.lenh.push('xep'); return taoXep(L, 3, 1, false); }); },
      // giống WindoorCraft thật: nhận phần tử (clientWidth/clientHeight), đặt lại cỡ sân vẽ rồi thu phóng vừa khít hộp bao
      moveShapeToCenter: function (t) {
        const st = cc.stage;
        if (!st) return;
        t = t || st.container();
        const e = t.clientWidth ? t.clientWidth : 400, c = t.clientHeight ? t.clientHeight : 400;
        st.width(e); st.height(c);
        nk.canh_giua.push([e, c]);
        if (!this.shapem.length) return;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        this.shapem.forEach(function (f) { const b = f.polygon.box; x0 = Math.min(x0, b.xmin); y0 = Math.min(y0, b.ymin); x1 = Math.max(x1, b.xmax); y1 = Math.max(y1, b.ymax); });
        x0 -= 300; y0 -= 300; x1 += 300; y1 += 300; // chừa chỗ cho đường kích thước
        const w = x1 - x0, h = y1 - y0, a = e / c < w / h ? e / w : c / h;
        st.x(-(x0 + x1) / 2 * a + e / 2); st.y(-(y0 + y1) / 2 * a + c / 2); st.scaleX(a); st.scaleY(a);
      },
      serialize: function () { return this.shapem.length ? JSON.stringify({ sm: this.shapem.map(function (f) { return f.xuat(); }) }) : ''; },
      openFile: function (chu) {
        this.shapem = [];
        const j = chu ? JSON.parse(chu) : { sm: [] };
        const s = this;
        j.sm.forEach(function (x) {
          const cu = s.profileSize; s.profileSize = { frame: x.kh, frameMullion: x.dn };
          const f = new Khung(new Poly(x.x0, x.y0, x.x1, x.y1, x.type)); s.profileSize = cu;
          s.shapem.push(f);
          x.do_.forEach(function (d) { f.addMullion(new Line(new Pt(d.x, d.y), new Vec(d.nx, d.ny))); });
          const door = s.sashAsDoor;
          x.fenes.forEach(function (e) {
            s.sashAsDoor = !!e.isDoor;
            const pt = new Pt(e.cx, e.cy);
            let n = null;
            if (e.type === 'Sash') { n = s.addSash(pt); n.hardwareManager.openDirection = e.dir; n.hardwareManager.openToward = e.toward; }
            else if (e.type === 'DoubleSash') { n = s.addDoubleSash(pt); n.openToward = e.toward; n.sashes.forEach(function (la, i) { la.hardwareManager.openToward = e.la[i]; }); }
            else if (e.type === 'Slide') n = s.addSlide(pt, e.opt);
            else if (e.type === 'FoldSash') { n = s._dat(pt, function (L) { return taoXep(L, e.l, e.r, e.asPush); }); }
          });
          s.sashAsDoor = door;
        });
        mm.checkPoint();
      },
    };
    const tm = {
      curTool: 'pan', mousePosition: new Pt(0, 0),
      takeTool: function (t) { this.curTool = t; },
      tools: {
        mullion_vertical: function () { return { name: 'mullion_vertical', norm: new Vec(-1, 0), curPt: null, mouseup: function () { cc.shapeManager.addMullion(new Line(this.curPt, this.norm)); cc.mometoManager.checkPoint(); } }; },
        door: function () { const t = { name: 'door', curPt: new Pt(0, 0) }; Object.defineProperty(t, 'clickShape', { get: function () { return new Poly(this.curPt.x - 1050, this.curPt.y - 1050, this.curPt.x + 1050, this.curPt.y + 1050, 'door'); } }); return t; },
        foldDouble: function () { return { name: 'foldDouble', addFenes: function (pt) { sm._dat(pt, function (L) { nk.lenh.push('4 canh quay'); return taoXep(L, 2, 2, true); }); } }; },
      },
    };
    if (tuy.khong_co_4_canh) delete tm.tools.foldDouble;
    cc.shapeManager = sm; cc.toolManager = tm;

    // ---- sân vẽ giả (Konva) + bố cục màn hình, đủ để thử phần "đưa bản vẽ ra chỗ trống"
    const bc = Object.assign({ left: 0, top: 40, width: 1600, height: 900 }, tuy.khung_ve || {});
    const o_ve = { _trong_khung: true };
    const khung_el = {
      id: 'webcc', clientWidth: bc.width, clientHeight: bc.height,
      getBoundingClientRect: function () { return { left: bc.left, top: bc.top, right: bc.left + bc.width, bottom: bc.top + bc.height, width: bc.width, height: bc.height }; },
      contains: function (e) { return e === this || e === o_ve; },
    };
    const gn = { x: 0, y: 0, s: 1, w: bc.width, h: bc.height, ve: 0 };
    const gs = function (k) { return function (v) { if (v === undefined) return gn[k]; gn[k] = v; return this; }; };
    if (!tuy.khong_co_stage) cc.stage = { _gn: gn, x: gs('x'), y: gs('y'), scaleX: gs('s'), scaleY: gs('s'), width: gs('w'), height: gs('h'), container: function () { return khung_el; }, batchDraw: function () { gn.ve += 1; } };
    const lop_phu = []; // các bảng nổi đè lên khung vẽ, trên cùng đứng trước: {left, right, top, bottom, el}
    const tuDiem = function (x, y) {
      const out = [];
      lop_phu.forEach(function (c) { if (x >= c.left && x < c.right && y >= c.top && y < c.bottom) out.push(c.el); });
      if (x >= bc.left && x < bc.left + bc.width && y >= bc.top && y < bc.top + bc.height) out.push(o_ve);
      return out;
    };

    // ---- Vue giả
    let pid = 155849;
    const oi = {
      order_info: { window_no: 'C1', count: 1, product_name: SP[1].name, install_position: '', note: '', width: 0, height: 0, guigelabel: '' },
      preinstallList: { 1: [], 2: [] }, spec_form_data: { 1: { price: 0, value1: '', value2: '' } },
      $set: function (o, k, v) { o[k] = v; },
      // như WindoorCraft: không tự ghi order_info (ô nhập làm việc đó), chỉ đẩy xuống bản vẽ và bảng giá
      updateComboxValue: function (e, key, type) {
        const n = typeof e !== 'string' && e ? e : { value: e || '' };
        this.spec_form_data[type].price = n.price || 0; this.spec_form_data[type].value1 = n.value1 || '';
        if (String(type) === '1') { sm.glassSpec = { spec: n.value || '', thickness: +n.value1 || 0 }; nk.lenh.push('kinh ' + (n.value || '')); }
      },
      product_list: SP, isChangeProduct: false, mullion_equally_divided_way: tuy.chia_deu_pm === undefined ? 0 : tuy.chia_deu_pm, $store: store, so_setArea: 0,
      selectProduct: function () { this.isChangeProduct = true; },
      setArea: function () { this.so_setArea += 1; },
    };
    const napKinh = function (id) { // đổi hệ: nạp danh mục kính của hệ, chọn loại mặc định (không tạo bước hoàn tác)
      let stt = 5000;
      oi.preinstallList[1] = (KINH[id] || []).map(function (x) { return { id: ++stt, type: 1, value: x[0], is_default: x[1], value1: x[2], value2: '', price: '210000.00', product_id: id }; });
      const md = oi.preinstallList[1].filter(function (x) { return x.is_default; })[0];
      oi.order_info.guigelabel = md ? md.value : '';
      dang_kinh = md ? md.value : '';
      if (tuy.khong_chon_kinh) delete oi.updateComboxValue;
    };
    napKinh(pid);
    Object.defineProperty(oi.order_info, 'product_id', {
      enumerable: true,
      get: function () { return pid; },
      set: function (v) {
        if (v === pid) return;
        pid = v; store.state.global_loading = true;
        setTimeout(function () {
          const p = SP.filter(function (x) { return x.id === v; })[0];
          if (tuy.loi_he_nhom) { store.state.global_loading = false; return; }
          const ss = JSON.parse(p.show_setting), ds = JSON.parse(p.draw_setting);
          sm.profileSize = { frame: ss.frame, frameMullion: ss.frameMullion };
          sm.sashOutwardOpen = !!ds.sashOutwardOpen;
          oi.order_info.product_name = p.name; sm.title = p.name;
          napKinh(v);
          oi.isChangeProduct = false; store.state.global_loading = false; mm.clean();
        }, tuy.tre_he_nhom === undefined ? 40 : tuy.tre_he_nhom);
      },
    });
    const pl = { list: [] }; // dải "Bản vẽ": các bộ cửa của đơn đang mở
    const napDsBo = function (ma_don) { pl.list = da_luu.filter(function (x) { return x.ma_don === String(ma_don || ''); }).map(function (x) { return { id: Number(x.ma_bo), window_no: x.ky_hieu, count: x.so_luong, type: 0 }; }); };
    const draw = {
      $options: { methods: { saveOrder: 1, doBarAction: 1, initActionBar: 1 } },
      $refs: { right_card: { $refs: { order_info: oi, paper_list: pl }, buildSaveData: function () {
        const f = sm.shapem[0], b = f ? f.polygon.box : { xmin: 0, xmax: 0, ymin: 0, ymax: 0 };
        const dt = ((b.xmax - b.xmin) * (b.ymax - b.ymin)) / 1e6 * oi.order_info.count;
        return { product_id: pid, product_name: oi.order_info.product_name, window_no: oi.order_info.window_no, count: oi.order_info.count, area: Math.round(dt * 100) / 100, _rong: b.xmax - b.xmin, _cao: b.ymax - b.ymin, attr_data: { custom_format: tuy.loi_nhuan ? { profit_percent: 10 } : {} } };
      } } },
      // giá giả: nhôm 190.000/m dài theo chu vi, kính 210.000/m², SX-LĐ 200.000/m² — nhân số bộ; mỗi lần tính gọi checkPoint như bản thật
      getScriptList: function (id) { nk.lenh.push('script ' + id); return Promise.resolve({ vars: [], id: id }); },
      scriptCalculation: function (l, i) {
        mm.checkPoint(); mm.checkPoint();
        if (tuy.loi_tinh_gia) return Promise.reject(new Error('lỗi công thức'));
        const n = i.count, cv = 2 * (i._rong + i._cao) / 1000, dt = i._rong * i._cao / 1e6;
        const op = [
          { name: 'KHUNG', code: 'XF-1', price: 190000, count: Math.round(cv * n * 100) / 100, money: (Math.round(cv * n * 190000 / 100) * 100).toFixed(2) },
          { name: 'KINH', code: 'K', price: 210000, count: Math.round(dt * n * 100) / 100, money: (Math.round(dt * n * 210000 / 100) * 100).toFixed(2) },
          { name: 'SAN XUAT-LAP DAT', code: 'SX', price: 200000, count: Math.round(dt * n * 100) / 100, money: (Math.round(dt * n * 200000 / 100) * 100).toFixed(2) },
        ];
        return new Promise(function (ok) { setTimeout(function () { ok({ result: { order_offer_price: op, order_bar: [
          { code: 'XF55-01', name: 'Khung bao', color: 'Ghi', type: 'frame', length: i._rong, count: 2 * n, angle_one: '45', angle_two: '45', position: 'bk1:up bk3:down', meter_weight: 0.98, is_optimize: 1 },
          { code: 'XF55-01', name: 'Khung bao', color: 'Ghi', type: 'frame', length: i._cao, count: 2 * n, angle_one: '45', angle_two: '45', position: 'bk2:left bk4:right', meter_weight: 0.98, is_optimize: 1 },
          { code: 'XF55-05', name: 'Nẹp', color: 'Ghi', type: 'fixedBead', length: i._rong - 90, count: 2 * n, angle_one: '90', angle_two: '90', position: 'zt1:0', meter_weight: 0.2, is_optimize: 1 },
        ], order_glass: [{ name: 'Kính 6.38', specs: 'K638', width: i._rong - 90, height: i._cao - 90, count: n, serial: 'G1', type: 'fixedGlass' }], order_addon: [{ code: 'GK', name: 'Gioăng kính', count: 2 * n, length: '' }, { code: 'VIT', name: 'Vít', count: 8 * n, length: '' }], order_cost: [
          { type: 'profile', code: 'XF-1', name: 'KHUNG', result: (Math.round(cv * n * 0.8 * 1000) / 1000) + ' * 190000 = 0', cost: 0 },
          { type: 'glass', code: 'K638', name: 'KINH', result: (Math.round(dt * n * 1000) / 1000) + ' * 210000 = 0', cost: 0 },
          { type: 'addon', code: 'SX', name: 'SAN XUAT', result: (Math.round(dt * n * 1000) / 1000) + ' * 200000 = 0', cost: 0 },
        ] }, summary: {} }); }, 30); });
      },
      $route: { name: 'draw', query: {} }, $store: store, loading: false, canvas: cc, $children: [], _isDestroyed: false,
      $VMessage: {
        success: function (t) { nk.tb.push(['ok', String(t)]); }, error: function (t) { nk.tb.push(['loi', String(t)]); },
        info: function (t) { nk.tb.push(['tin', String(t)]); }, warning: function (t) { nk.tb.push(['tin', String(t)]); },
      },
      doBarAction: function (e) {
        if (e.action !== 'clean') return;
        sm.clear();
        const self = this, q = this.$route.query;
        if (q.order_id) setTimeout(function () { self.$route = { name: 'draw', query: { contract_id: q.contract_id } }; }, 25);
        const so = da_luu.filter(function (x) { return x.ma_don === String(q.contract_id || ''); }).length;
        oi.order_info.count = 1; oi.order_info.window_no = 'C' + (so + 1); oi.order_info.install_position = ''; oi.order_info.note = '';
      },
      saveOrder: function () {
        const self = this;
        if (sm.isEmpty) { this.$VMessage.info('Vui lòng vẽ trước'); return Promise.resolve(); }
        if (tuy.im_lang_khi_luu) return Promise.resolve();
        this.loading = true;
        setTimeout(function () {
          if (tuy.loi_luu) { self.loading = false; self.$VMessage.error('Lưu thất bại'); return; }
          const q = self.$route.query;
          const ma_don = String(q.contract_id || ++ma), ma_bo = String(q.order_id || ++ma);
          const cu = da_luu.filter(function (x) { return x.ma_bo === ma_bo; })[0];
          const ban = { ma_don: ma_don, ma_bo: ma_bo, ky_hieu: oi.order_info.window_no, so_luong: oi.order_info.count, vi_tri: oi.order_info.install_position, ghi_chu: oi.order_info.note, he_nhom: pid, kinh: oi.order_info.guigelabel, kinh_ban_ve: sm.shapem.map(function (f) { return f.kinh; }).join(','), ban_ve: sm.serialize() };
          if (cu) Object.assign(cu, ban); else da_luu.push(ban);
          sm._ban = false;
          self.loading = false; self.$VMessage.success('Đã lưu');
          self.$route = { name: 'draw', query: { contract_id: ma_don, order_id: ma_bo } };
          napDsBo(ma_don);
        }, tuy.tre_luu === undefined ? 40 : tuy.tre_luu);
        return Promise.resolve();
      },
    };
    const router = {
      nk: [],
      replace: function (loc) { return this.push(loc); },
      push: function (loc) {
        this.nk.push(loc.name || loc.path);
        if (loc.name === 'home') { draw.$route = { name: 'home', query: {} }; goc.$route = draw.$route; }
        else if (loc.path === '/draw') { // vào lại trang vẽ: WindoorCraft dựng webcc mới
          sm.clear(); pl.list = [];
          oi.order_info.window_no = 'C1'; oi.order_info.count = 1;
          const moi = Object.assign({}, cc);
          cc_hien = moi; win.webcc = moi; draw.canvas = moi;
          draw.$route = { name: 'draw', query: Object.assign({}, loc.query || {}) }; goc.$route = draw.$route;
        } else { draw.$route = { name: loc.name, query: Object.assign({}, loc.query || {}), params: loc.params || {} }; goc.$route = draw.$route; }
        return Promise.resolve();
      },
    };
    draw.$router = router;
    let cc_hien = cc;
    const goc = { $options: {}, $router: router, $store: store, $i18n: { locale: 'vi-VN' }, $route: draw.$route, $children: [{ $options: { name: 'action-bar' }, $children: [] }, { $options: {}, $children: [draw] }] };
    const doc = { querySelector: function (s) { return s === '#app' ? { __vue__: goc } : null; }, elementsFromPoint: tuDiem };
    const da_mo = []; // các địa chỉ đã mở ở thẻ mới
    const win = tuy.win || { webcc: cc, document: doc, location: { origin: 'https://ln.windoorcraft.com' }, open: function (dc, dich) { da_mo.push([dc, dich]); return {}; } };
    if (tuy.win) { win.webcc = cc; win.document.querySelector('#app').__vue__ = goc; } // chạy trong trình duyệt (trang giả lập)
    return { da_mo: da_mo, pl: pl, lop_phu: lop_phu, khung_el: khung_el, goc_nhin: gn, win: win, router: router, webcc: cc, sm: sm, tm: tm, mm: mm, eb: eb, draw: draw, oi: oi, goc: goc, nk: nk, da_luu: da_luu, Pt: Pt, Vec: Vec, Line: Line, SP: SP };
  }

  G.MNWD_MOCK = { tao: taoMock };
  if (typeof module !== 'undefined' && module.exports) module.exports = G.MNWD_MOCK;
})(typeof globalThis !== 'undefined' ? globalThis : this);
