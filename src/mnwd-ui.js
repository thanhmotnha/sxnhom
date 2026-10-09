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
      h('button', { class: 'nut nho chinh', disabled: ban || !co_sx || !sx.may_chu, title: sx.may_chu ? 'Gửi đơn lên phần mềm xưởng ' + sx.may_chu + ' — xưởng theo dõi tiến độ, máy cắt lấy file về là cắt. Gửi lại cùng hợp đồng = cập nhật phiên bản mới.' : 'Chưa đặt máy chủ (Cài đặt → Sản xuất)', text: 'Gửi xưởng', onclick: () => self.sanXuat('gui') }),
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
      return { id: d.id, ky_hieu: c.ky_hieu || '', so_luong: c.so_luong || 1, vi_tri: c.vi_tri || '', ghi_chu: c.ghi_chu || '', mo_ta: M.moTa(c), he_nhom: (d.gia && d.gia.he_nhom) || self.tenHe(self.heCuaDong(d)), kinh: c.kinh || (d.gia && d.gia.kinh) || '', rong: kh ? kh.rong : c.rong, cao: kh ? kh.cao : c.cao, anh: self.anh[d.id] || '', svg: svg, ma_don: d.ma_don || '', boc_tach: (d.gia && d.gia.boc_tach) || null, gia: d.gia ? { tong: d.gia.tong, von: (() => { const l = M.laiBo(d.gia, self.cd.gia_von); return l ? l.von : null; })() } : null };
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
      let html = '<b>' + thieu.length + ' dòng</b> chưa có số bóc tách. Tiện ích sẽ vẽ lần lượt từng dòng để WindoorCraft bóc tách (như Tính giá), <b>không lưu</b> gì, rồi ' + ({ ban_ve: 'mở bản vẽ sản xuất', excel: 'tải file cắt Excel', gui: 'gửi lên xưởng' }[viec]) + '.';
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
      const an = this.anVon();
      let ma_hd = Array.from(new Set(bo.map((b) => b.ma_don).filter(Boolean)));
      if (ma_hd.length !== 1) { let t = null; try { t = this.dr.trangThai(); } catch (e) { t = null; } ma_hd = t && t.ma_don ? [t.ma_don] : []; }
      const than = { nguon: 'mn-windoor ' + M.PHIEN_BAN, ma_hd: ma_hd.length === 1 ? ma_hd[0] : '', don: tt.don, cong_trinh: tt.cong_trinh, khach: this.cd.bao_gia_khach || '', may: { cay: tt.cay, hao_dau: tt.hao_dau, mach: tt.mach }, bo: bo.map((b) => ({ ky_hieu: b.ky_hieu, so_luong: b.so_luong, vi_tri: b.vi_tri, ghi_chu: b.ghi_chu, mo_ta: b.mo_ta, he_nhom: b.he_nhom, kinh: b.kinh, rong: b.rong, cao: b.cao, ma_don: b.ma_don, svg: b.svg, boc_tach: b.boc_tach, gia: an ? null : b.gia })) };
      const r = await G.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Khoa': sx.khoa_may || '' }, body: JSON.stringify(than) });
      let j = null; try { j = await r.json(); } catch (e) { j = null; }
      if (!r.ok || !j || !j.ok) throw new Error((j && j.loi) || ('máy chủ trả mã ' + r.status));
      const cb = (j.canh_bao || []).map((c) => '<br>⚠ ' + esc(c)).join('');
      this.kq_lo = { loai: cb ? 'cb' : 'tot', html: (j.moi === false ? 'Đã cập nhật đơn xưởng <b>' + esc(j.ma) + '</b> — phiên bản ' + j.phien_ban : 'Đã gửi <b>' + esc(tt.don) + '</b> lên xưởng (mã <b>' + esc(j.ma) + '</b>') + ', ' + j.so_dong + ' dòng cắt). ' + (j.trang_thai === 'cho_duyet' ? 'Đơn đang <b>chờ Chủ duyệt</b> trên ' + esc(sx.may_chu) + ' rồi máy cắt mới nhận.' : 'Máy cắt nhận được ngay.') + cb };
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
    s.appendChild(h('div', { class: 'nho2', text: 'Đơn vị mm. Cây, hao đầu, mạch cưa dùng cho bảng tối ưu cây trong file Excel. "Gửi xưởng" đẩy đơn lên phần mềm xưởng; máy cắt mở trang /may của máy chủ (hoặc chạy chương trình tự lấy) để nhận file.' }));

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
