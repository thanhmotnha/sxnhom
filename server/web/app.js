/* Một Nhà · Xưởng nhôm — phần mềm web (một trang, không thư viện) */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const S = { nguoi: null, vai: {}, buoc: [], cai_dat: {} };
  const MAU = { cho_cat: 'var(--c-cho_cat)', da_cat: 'var(--c-da_cat)', lap_rap: 'var(--c-lap_rap)', cho_kcs: 'var(--c-cho_kcs)', cho_giao: 'var(--c-cho_giao)', da_lap: 'var(--c-da_lap)' };

  // ------------------------------------------------------------------ tiện ích
  function h(tag, tt, con) {
    const el = document.createElement(tag);
    if (tt) Object.keys(tt).forEach((k) => {
      const v = tt[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    [].concat(con || []).forEach((c) => { if (c !== null && c !== undefined && c !== false) el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
    return el;
  }
  const tien = (n) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('vi-VN'));
  const soVN = (n, d) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('vi-VN', { maximumFractionDigits: d === undefined ? 2 : d }));
  const ngay = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '');
  const gio = (iso) => { const d = new Date(iso); return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); };
  const co = (v) => !!S.nguoi && S.nguoi.vai.some((x) => [].concat(v).indexOf(x) >= 0);
  function bao(chu, loi) {
    const b = h('div', { class: 'bao' + (loi ? ' loi' : ''), text: chu });
    document.body.appendChild(b);
    setTimeout(() => b.remove(), loi ? 5000 : 2600);
  }
  async function goi(duong, than) {
    const r = await fetch(duong, than === undefined ? { credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-MN': '1' }, body: JSON.stringify(than) });
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    if (r.status === 401 && duong.indexOf('/api/w/') === 0) { S.nguoi = null; veVao(); throw new Error((j && j.loi) || 'Hết phiên'); }
    if (!r.ok || !j || !j.ok) throw new Error((j && j.loi) || 'Lỗi máy chủ (' + r.status + ')');
    return j;
  }
  function hoi(tieu_de, noi, nut, can_nhap) {
    return new Promise((xong) => {
      const o = can_nhap ? h('textarea', { rows: '3', placeholder: can_nhap }) : null;
      const dong = (v) => { p.remove(); xong(v); };
      const p = h('div', { class: 'phu', onclick: (e) => { if (e.target === p) dong(null); } }, [h('div', { class: 'hop' }, [
        h('h3', { text: tieu_de }), noi ? h('div', { class: 'mo', text: noi }) : null, o,
        h('div', { class: 'nuts' }, [h('button', { class: 'nut', text: 'Thôi', onclick: () => dong(null) }), h('button', { class: 'nut chinh', text: nut || 'Đồng ý', onclick: () => { if (o && !o.value.trim()) { o.focus(); return; } dong(o ? o.value.trim() : true); } })]),
      ])]);
      document.body.appendChild(p);
      if (o) o.focus();
    });
  }
  const thanhTD = (td, tong) => h('div', { class: 'thanh-td', title: S.buoc.map((b) => b.ten + ': ' + (td[b.ma] || 0)).join(' · ') }, S.buoc.filter((b) => td[b.ma]).map((b) => h('i', { style: 'width:' + ((td[b.ma] / Math.max(1, tong)) * 100) + '%;background:' + MAU[b.ma] })));
  const chuTD = () => h('div', { class: 'chu-td' }, S.buoc.map((b) => h('span', { style: '--m:' + MAU[b.ma], text: b.ten })));
  const ttDon = (t) => h('span', { class: 'tt ' + t.trang_thai, text: t.ten_trang_thai });

  // ------------------------------------------------------------------ đường dẫn
  function di(duong, thay) { if (thay) history.replaceState(null, '', duong); else history.pushState(null, '', duong); ve(); }
  window.addEventListener('popstate', () => ve());
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-di]');
    if (a && !e.ctrlKey && !e.metaKey) { e.preventDefault(); di(a.getAttribute('href')); }
  });
  const lien = (duong, chu, lop) => h('a', { href: duong, 'data-di': '1', class: lop, text: chu });

  function khung(trang, noi) {
    const muc = [['/', 'Việc', true], ['/don', 'Đơn hàng', true], ['/bao-cao', 'Báo cáo', co(['chu', 'dieu_phoi'])], ['/nguoi', 'Người dùng', co('chu')], ['/cai-dat', 'Cài đặt', co('chu')]].filter((x) => x[2]);
    const dang = (d) => (d === '/' ? location.pathname === '/' : location.pathname.indexOf(d) === 0);
    app.textContent = '';
    app.appendChild(h('header', { class: 'dau' }, [
      h('a', { class: 'logo', href: '/', 'data-di': '1' }, ['MỘT NHÀ ', h('span', { text: '· Xưởng nhôm' })]),
      h('nav', null, muc.map((m) => lien(m[0], m[1], dang(m[0]) ? 'chon' : ''))),
      h('div', { class: 'toi' }, [h('span', { text: S.nguoi.ten }), h('button', { text: 'Thoát', onclick: async () => { await goi('/api/dang-xuat', {}).catch(() => {}); S.nguoi = null; veVao(); } })]),
    ]));
    const m = h('main', null, [noi]);
    app.appendChild(m);
    app.appendChild(h('nav', { class: 'chan-nav' }, muc.slice(0, 4).map((x) => lien(x[0], x[1], dang(x[0]) ? 'chon' : ''))));
    document.title = trang + ' · Xưởng nhôm';
    return m;
  }

  // ------------------------------------------------------------------ đăng nhập / cài đặt đầu
  function veVao(lan_dau) {
    app.textContent = '';
    const sdt = h('input', { type: 'tel', inputmode: 'numeric', autocomplete: 'username', placeholder: '09xx xxx xxx' });
    const pin = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'current-password', placeholder: '4–8 số' });
    const loi = h('div', { class: 'do nho', style: 'margin-top:10px' });
    const ten = lan_dau ? h('input', { type: 'text', placeholder: 'Họ tên' }) : null;
    const khoa = lan_dau ? h('input', { type: 'password', placeholder: 'KHOA đặt khi cài máy chủ' }) : null;
    const lam = async (e) => {
      e.preventDefault(); loi.textContent = '';
      try {
        const r = lan_dau ? await goi('/api/cai-dat-dau', { khoa: khoa.value, ten: ten.value, sdt: sdt.value, pin: pin.value }) : await goi('/api/dang-nhap', { sdt: sdt.value, pin: pin.value });
        S.nguoi = r.nguoi; await napToi(); ve();
      } catch (x) { loi.textContent = x.message; }
    };
    app.appendChild(h('div', { class: 'vao' }, [h('form', { class: 'the', onsubmit: lam }, [
      h('h1', { text: 'Xưởng nhôm · Một Nhà' }),
      lan_dau ? h('div', { class: 'mo nho', text: 'Lần đầu: tạo tài khoản Chủ. Cần KHOA của máy chủ.' }) : null,
      lan_dau ? h('label', { text: 'Khoá máy chủ' }) : null, khoa,
      lan_dau ? h('label', { text: 'Họ tên' }) : null, ten,
      h('label', { text: 'Số điện thoại' }), sdt, h('label', { text: 'Mã PIN' }), pin, loi,
      h('button', { class: 'nut chinh to', type: 'submit', text: lan_dau ? 'Tạo tài khoản Chủ' : 'Đăng nhập' }),
    ])]));
    (lan_dau ? khoa : sdt).focus();
  }
  async function napToi() { const r = await goi('/api/w/toi'); S.nguoi = r.nguoi; S.vai = r.vai; S.buoc = r.buoc; S.cai_dat = r.cai_dat; S.ban = r.phien_ban; }

  // ------------------------------------------------------------------ bảng việc
  async function veViec() {
    const noi = h('div', null, [h('h1', { text: 'Chào ' + S.nguoi.ten })]);
    const quan_ly = co(['chu', 'dieu_phoi', 'kinh_doanh']);
    const m = khung('Việc', noi);
    let r;
    try { r = await goi('/api/w/bang-viec'); } catch (e) { noi.appendChild(h('div', { class: 'the do', text: e.message })); return; }
    const o = (duong, so, chu, canh) => h('a', { href: duong, 'data-di': '1', class: canh && so ? 'canh' : '' }, [h('b', { text: String(so) }), h('span', { text: chu })]);
    const o_so = h('div', { class: 'o-so' }, [
      o('/don?tt=cho_duyet', r.dem.cho_duyet, 'Chờ duyệt', true), o('/don?tt=san_xuat', r.dem.san_xuat, 'Đang sản xuất'), o('/don?tt=tre', r.dem.tre, 'Trễ hẹn', true),
      o('/don?tt=san_xuat', r.dem.canh_bao, 'Cảnh báo thiết kế đổi', true), o('/don?tt=san_xuat', r.dem.cho_may, 'Đơn chờ máy cắt lấy'),
    ]);
    if (quan_ly) noi.appendChild(o_so);
    noi.appendChild(h('h2', { text: 'Việc của tôi' + (r.viec.length ? ' (' + r.viec.length + ' bộ)' : '') }));
    if (!r.viec.length) noi.appendChild(h('div', { class: 'the mo', text: co(['chu', 'dieu_phoi', 'kinh_doanh']) ? 'Không có bộ nào chờ vai trò của anh/chị. Xem tiến độ ở Đơn hàng.' : 'Chưa có việc — khi bộ cửa tới bước của tổ mình sẽ hiện ở đây.' }));
    r.viec.forEach((v) => {
      noi.appendChild(h('div', { class: 'viec' }, [
        h('div', { class: 'ky', text: v.ky_hieu || '—' }),
        h('div', { class: 'noi' }, [h('div', null, [lien('/don/' + v.ma, v.ten), h('span', { class: 'mo', text: ' · ' + v.so_luong + ' bộ' })]), h('div', { class: 'mo nho', text: v.mo_ta }), v.ngay_hen ? h('div', { class: 'nho', text: 'Hẹn ' + ngay(v.ngay_hen) }) : null, v.loi_kcs ? h('div', { class: 'loi-kcs', text: 'KCS: ' + v.loi_kcs }) : null]),
        h('span', { class: 'tt b-' + v.tt, text: v.ten_tt }),
        h('div', { class: 'hang' }, v.nut.map((n) => h('button', { class: 'nut to ' + (n.ly_do ? 'nguy' : 'xanh'), text: n.ten, onclick: () => buocBo(v.ma, [v.bo_id], n).then((ok) => { if (ok) veViec(); }) }))),
      ]));
    });
    const bangNho = (tieu_de, ds) => {
      if (!ds.length) return;
      noi.appendChild(h('h2', { text: tieu_de }));
      noi.appendChild(bangDon(ds));
    };
    if (!quan_ly) return m;
    bangNho('Chờ duyệt', r.cho_duyet);
    bangNho('Trễ hẹn', r.tre);
    bangNho('Có cảnh báo', r.canh_bao);
    bangNho('Hẹn trong 7 ngày', r.hen_tuan);
    return m;
  }
  async function buocBo(ma, ids, n) {
    let ly_do = '';
    if (n.ly_do) { ly_do = await hoi(n.ten, 'Ghi lỗi để tổ lắp ráp sửa.', 'Gửi lại tổ lắp ráp', 'Lỗi gì?'); if (!ly_do) return false; }
    try { await goi('/api/w/don/' + ma + '/bo', { ids: ids, toi: n.toi, ly_do: ly_do }); bao('Đã chuyển: ' + n.ten); return true; } catch (e) { bao(e.message, true); return false; }
  }

  // ------------------------------------------------------------------ danh sách đơn
  function bangDon(ds) {
    const xg = co('chu');
    return h('div', { class: 'bang-cuon' }, [h('table', null, [
      h('thead', null, [h('tr', null, [h('th', { text: 'Đơn' }), h('th', { class: 'an-dt', text: 'Khách / công trình' }), h('th', { text: 'Hẹn' }), h('th', { text: 'Tiến độ' }), h('th', { class: 's an-dt', text: 'Bộ · m²' }), xg ? h('th', { class: 's an-dt', text: 'Doanh thu · lãi' }) : null, h('th', { text: 'Trạng thái' })])]),
      h('tbody', null, ds.map((d) => h('tr', { class: 'dong-don', onclick: () => di('/don/' + d.ma) }, [
        h('td', null, [h('div', { class: 'dam', text: d.ten }), h('div', { class: 'mo nho', text: d.ma + (d.phien_ban > 1 ? ' · bản ' + d.phien_ban : '') + (d.canh_bao ? ' · ⚠ ' + d.canh_bao : '') })]),
        h('td', { class: 'an-dt' }, [h('div', { text: d.khach || '' }), h('div', { class: 'mo nho', text: d.cong_trinh || '' })]),
        h('td', null, d.ngay_hen ? h('span', { class: d.tre ? 'tt tre' : '', text: ngay(d.ngay_hen) }) : h('span', { class: 'mo', text: '—' })),
        h('td', null, [thanhTD(d.tien_do, d.so_bo), h('div', { class: 'mo nho', text: (d.tien_do.da_lap || 0) + '/' + d.so_bo + ' đã lắp · máy: ' + ({ cho: 'chờ lấy', da_lay: 'đã lấy', xong: 'cắt xong' }[d.cat.tt]) })]),
        h('td', { class: 's an-dt', text: d.so_bo + ' · ' + soVN(d.m2) }),
        xg ? h('td', { class: 's an-dt' }, d.gia ? [h('div', { text: tien(d.gia.tong) }), h('div', { class: 'nho ' + (d.gia.lai < 0 ? 'do' : 'la'), text: d.gia.lai === null ? 'chưa đủ giá vốn' : 'lãi ' + tien(d.gia.lai) })] : h('span', { class: 'mo', text: '—' })) : null,
        h('td', null, [ttDon(d)]),
      ]))),
    ])]);
  }
  async function veDsDon() {
    const q = new URLSearchParams(location.search);
    const tt = q.get('tt') || '';
    const tim = h('input', { type: 'search', placeholder: 'Tìm mã, tên đơn, khách, công trình…', value: q.get('q') || '' });
    const vung = h('div', null, [h('div', { class: 'tai', text: 'Đang tải…' })]);
    const loc = [['', 'Đang chạy'], ['cho_duyet', 'Chờ duyệt'], ['san_xuat', 'Đang sản xuất'], ['tre', 'Trễ hẹn'], ['xong', 'Hoàn thành'], ['huy', 'Huỷ']];
    const noi = h('div', null, [h('h1', { text: 'Đơn hàng' }), h('div', { class: 'loc' }, loc.map((l) => h('button', { class: l[0] === tt ? 'chon' : '', text: l[1], onclick: () => di('/don' + (l[0] ? '?tt=' + l[0] : ''), true) }))), h('div', { style: 'margin-bottom:12px' }, [tim]), vung]);
    khung('Đơn hàng', noi);
    const tai = async () => {
      try {
        const r = await goi('/api/w/don?tt=' + encodeURIComponent(tt) + '&q=' + encodeURIComponent(tim.value));
        vung.textContent = '';
        if (!r.don.length) { vung.appendChild(h('div', { class: 'the mo', text: 'Không có đơn nào. Đơn mới vào từ tiện ích "Một Nhà · Vẽ cửa" trong WindoorCraft → nút "Gửi máy cắt".' })); return; }
        vung.appendChild(bangDon(r.don)); vung.appendChild(chuTD());
      } catch (e) { vung.textContent = e.message; }
    };
    let hen = null;
    tim.addEventListener('input', () => { clearTimeout(hen); hen = setTimeout(tai, 250); });
    tai();
  }

  // ------------------------------------------------------------------ chi tiết đơn
  async function veDon(ma, tab) {
    const noi = h('div', null, [h('div', { class: 'tai', text: 'Đang tải…' })]);
    khung(ma, noi);
    let d;
    try { d = await goi('/api/w/don/' + ma); } catch (e) { noi.textContent = e.message; return; }
    const ve_lai = (moi, t) => { d = moi; dung(t || tab_dang); };
    let tab_dang = tab || 'bo';
    const lam = async (viec, than, t) => { try { ve_lai(await goi('/api/w/don/' + ma + '/' + viec, than || {}), t); return true; } catch (e) { bao(e.message, true); return false; } };
    function dung(t) {
      tab_dang = t;
      noi.textContent = '';
      const nut = [];
      if (d.quyen.duyet) nut.push(h('button', { class: 'nut chinh', text: 'Duyệt vào sản xuất', onclick: () => lam('duyet').then((ok) => ok && bao('Đã duyệt — máy cắt nhận được đơn')) }));
      if (d.ma_hd) nut.push(h('a', { class: 'nut', href: 'https://ln.windoorcraft.com/draw?contract_id=' + encodeURIComponent(d.ma_hd), target: '_blank', rel: 'noopener', text: 'Mở đơn gốc WindoorCraft' }));
      nut.push(h('a', { class: 'nut', href: '/ban-ve/' + d.ma, target: '_blank', text: 'Bản vẽ SX' }));
      if (d.quyen.huy) nut.push(h('button', { class: 'nut nguy', text: 'Huỷ đơn', onclick: async () => { const l = await hoi('Huỷ đơn ' + d.ma + '?', 'Đơn huỷ không hiện ở máy cắt nữa. Mở lại được.', 'Huỷ đơn', 'Lý do huỷ'); if (l) lam('huy', { ly_do: l }); } }));
      if (d.quyen.mo_lai) nut.push(h('button', { class: 'nut', text: 'Mở lại đơn', onclick: () => lam('mo-lai') }));
      noi.appendChild(h('div', { class: 'the-dau' }, [
        h('div', { class: 'gian' }, [h('div', { class: 'mo nho' }, [lien('/don', '← Đơn hàng'), ' · ' + d.ma + (d.ma_hd ? ' · HĐ WindoorCraft ' + d.ma_hd : '') + ' · nhận ' + gio(d.luc) + (d.phien_ban > 1 ? ' · phiên bản ' + d.phien_ban : '')]), h('h1', { text: d.ten }), h('div', { class: 'hang', style: 'margin-top:6px' }, [ttDon(d), d.tre ? h('span', { class: 'tt tre', text: 'Trễ hẹn' }) : null, h('span', { class: 'mo nho', text: d.so_bo + ' bộ · ' + soVN(d.m2) + ' m² · ' + d.so_dong + ' dòng cắt · ' + d.so_cay + ' cây' })])]),
        h('div', { class: 'hang' }, nut),
      ]));
      if (d.gia) noi.appendChild(h('div', { class: 'the hang' }, [h('span', null, ['Doanh thu ', h('b', { text: tien(d.gia.tong) + ' đ' })]), h('span', null, ['Giá vốn ', h('b', { text: d.gia.von === null ? '—' : tien(d.gia.von) + ' đ' })]), h('span', null, ['Lãi ', h('b', { class: d.gia.lai < 0 ? 'do' : 'la', text: d.gia.lai === null ? '—' : tien(d.gia.lai) + ' đ' + (d.gia.tong ? ' (' + soVN((d.gia.lai / d.gia.tong) * 100, 1) + '%)' : '') })]), d.gia.du ? null : h('span', { class: 'mo nho', text: 'Một số bộ chưa có giá (gửi từ máy nhân viên).' })]));
      const cb = d.canh_bao_ds.filter((c) => !c.xong);
      if (cb.length) noi.appendChild(h('div', { class: 'canh-bao' }, [h('b', { text: '⚠ Thiết kế thay đổi sau khi đã sản xuất' })].concat(cb.map((c) => h('div', null, [h('span', { class: 'gian', text: c.noi_dung }), d.quyen.quan_ly ? h('button', { class: 'nut nho', text: 'Đã xử lý', onclick: () => lam('canh-bao', { i: c.i }) }) : null])))));
      // thông tin
      const tt = h('div', { class: 'the' });
      const o = {};
      const truong = (k, nhan, kieu) => { o[k] = h('input', { type: kieu || 'text', value: d[k] || '', disabled: !d.quyen.sua }); return h('div', null, [h('label', { text: nhan }), o[k]]); };
      const pt = h('select', { disabled: !d.quyen.sua }, [h('option', { value: '', text: '— chưa giao —' })]);
      goi('/api/w/nguoi-gon').then((r) => { r.nguoi.forEach((n) => pt.appendChild(h('option', { value: n.id, text: n.ten }))); pt.value = d.phu_trach || ''; }).catch(() => {});
      o.ghi_chu = h('input', { type: 'text', value: d.ghi_chu || '', disabled: !d.quyen.sua });
      tt.appendChild(h('div', { class: 'luoi2' }, [truong('ngay_hen', 'Ngày hẹn giao', 'date'), truong('khach', 'Khách hàng'), truong('cong_trinh', 'Công trình'), h('div', null, [h('label', { text: 'Người phụ trách' }), pt]), h('div', { style: 'grid-column:1/-1' }, [h('label', { text: 'Ghi chú' }), o.ghi_chu])]));
      if (d.quyen.sua) tt.appendChild(h('div', { class: 'hang', style: 'margin-top:10px' }, [h('span', { class: 'gian' }), h('button', { class: 'nut chinh', text: 'Lưu thông tin', onclick: () => lam('thong-tin', { ngay_hen: o.ngay_hen.value, khach: o.khach.value, cong_trinh: o.cong_trinh.value, ghi_chu: o.ghi_chu.value, phu_trach: pt.value }).then((ok) => ok && bao('Đã lưu')) })]));
      noi.appendChild(tt);
      // tiến độ
      noi.appendChild(h('div', { class: 'the' }, [h('div', { class: 'hang' }, [h('b', { text: 'Tiến độ' }), h('span', { class: 'mo nho', text: (d.tien_do.da_lap || 0) + '/' + d.so_bo + ' bộ đã lắp' })]), h('div', { style: 'margin:8px 0 2px' }, [thanhTD(d.tien_do, d.so_bo)]), h('div', { class: 'chu-td' }, S.buoc.map((b) => h('span', { style: '--m:' + MAU[b.ma], text: b.ten + ' ' + (d.tien_do[b.ma] || 0) })))]));
      // thẻ
      const TAB = [['bo', 'Bộ cửa (' + d.bo.length + ')'], ['cat', 'Cắt nhôm'], ['kinh', 'Kính (' + d.kinh.length + ')'], ['pk', 'Phụ kiện'], ['ls', 'Lịch sử']];
      noi.appendChild(h('div', { class: 'the-tab' }, TAB.map((x) => h('button', { class: x[0] === t ? 'chon' : '', text: x[1], onclick: () => dung(x[0]) }))));
      noi.appendChild({ bo: tabBo, cat: tabCat, kinh: tabKinh, pk: tabPk, ls: tabLs }[t]());
    }
    function tabBo() {
      const vung = h('div');
      const chon = new Set();
      if (d.quyen.quan_ly && d.trang_thai === 'san_xuat') {
        const sel = h('select', { style: 'width:auto' }, S.buoc.map((b) => h('option', { value: b.ma, text: b.ten })));
        vung.appendChild(h('div', { class: 'the hang' }, [h('span', { class: 'mo nho', text: 'Điều phối: chọn bộ rồi chuyển hàng loạt sang' }), sel, h('button', { class: 'nut', text: 'Chuyển', onclick: async () => { if (!chon.size) { bao('Chưa chọn bộ nào', true); return; } await lam('bo', { ids: Array.from(chon), toi: sel.value, ly_do: sel.value === 'lap_rap' ? 'Điều phối chuyển lại' : '' }); } }), h('button', { class: 'nut nho', text: 'Chọn tất cả', onclick: () => { vung.querySelectorAll('input[data-bo]').forEach((c) => { c.checked = true; chon.add(c.getAttribute('data-bo')); }); } })]));
      }
      vung.appendChild(h('div', { class: 'ds-bo' }, d.bo.map((b) => h('div', { class: 'bo' + (b.doi ? ' doi' : '') }, [
        h('div', { class: 'hang' }, [d.quyen.quan_ly && d.trang_thai === 'san_xuat' ? h('input', { type: 'checkbox', 'data-bo': b.id, style: 'width:auto;min-height:0', onchange: (e) => { if (e.target.checked) chon.add(b.id); else chon.delete(b.id); } }) : null, h('span', { class: 'ky', text: b.ky_hieu || '—' }), h('span', { class: 'mo', text: '× ' + b.so_luong }), h('span', { class: 'gian' }), h('span', { class: 'tt b-' + b.tt, text: b.ten_tt })]),
        h('div', { class: 'hinh' }, [/^<svg[\s>]/.test(b.svg || '') ? h('img', { alt: 'Hình bộ ' + (b.ky_hieu || ''), src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(b.svg.indexOf('xmlns=') < 0 ? b.svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"') : b.svg) }) : h('span', { class: 'mo nho', text: 'chưa có hình' })]),
        h('div', null, [h('div', { class: 'dam', text: b.mo_ta }), h('div', { class: 'mo nho', text: soVN(b.rong, 1) + ' × ' + soVN(b.cao, 1) + ' mm · ' + b.he_nhom + (b.kinh ? ' · ' + b.kinh : '') }), b.vi_tri ? h('div', { class: 'nho', text: 'Vị trí: ' + b.vi_tri }) : null, b.ghi_chu ? h('div', { class: 'nho', text: 'Ghi chú: ' + b.ghi_chu }) : null, b.gia ? h('div', { class: 'nho', text: 'Giá ' + tien(b.gia.tong) + (b.gia.von !== null ? ' · lãi ' + tien(b.gia.tong - b.gia.von) : '') }) : null]),
        b.doi ? h('div', { class: 'nho', style: 'color:var(--cam)', text: 'Mới / đổi ở phiên bản ' + d.phien_ban }) : null,
        b.loi_kcs ? h('div', { class: 'loi-kcs', text: 'KCS: ' + b.loi_kcs }) : null,
        h('div', { class: 'nuts' }, b.nut.map((n) => h('button', { class: 'nut ' + (n.ly_do ? 'nguy' : 'xanh'), text: n.ten, onclick: async () => { if (await buocBo(d.ma, [b.id], n)) ve_lai(await goi('/api/w/don/' + d.ma), 'bo'); } })).concat([h('a', { class: 'nut nho', href: '/ban-ve/' + d.ma + '?bo=' + encodeURIComponent(b.id), target: '_blank', text: 'Bản vẽ' })])),
      ]))));
      return vung;
    }
    function tabCat() {
      const vung = h('div');
      const tt_may = { cho: 'Chờ máy cắt lấy file', da_lay: 'Máy cắt đã lấy file', xong: 'Đã cắt xong' }[d.cat.tt];
      const quyen = co(['chu', 'dieu_phoi', 'to_cat']);
      vung.appendChild(h('div', { class: 'the hang' }, [h('b', { text: tt_may }), h('span', { class: 'mo nho', text: gio(d.cat.luc) }), h('span', { class: 'gian' }),
        h('a', { class: 'nut', href: '/tai/' + d.ma + '.xlsx', text: 'Tải Excel' }), h('a', { class: 'nut', href: '/tai/' + d.ma + '.csv', text: 'Tải CSV' }),
        quyen && d.trang_thai === 'san_xuat' && d.cat.tt !== 'xong' ? h('button', { class: 'nut xanh', text: 'Đánh dấu cắt xong', onclick: async () => { if (await hoi('Cắt xong cả đơn?', 'Mọi bộ đang "Chờ cắt" chuyển sang "Đã cắt".', 'Cắt xong')) lam('cat', { tt: 'xong' }, 'cat'); } }) : null,
        quyen && d.cat.tt !== 'cho' ? h('button', { class: 'nut nho', text: 'Gửi lại máy cắt', onclick: () => lam('cat', { tt: 'cho' }, 'cat') }) : null]));
      vung.appendChild(h('h3', { text: 'Tối ưu cây (' + d.cay.length + ' cây ' + d.may.cay + ' mm, hao đầu ' + d.may.hao_dau + ', mạch ' + d.may.mach + ')' }));
      vung.appendChild(h('div', { class: 'bang-cuon' }, [h('table', null, [h('thead', null, [h('tr', null, ['Mã', 'Tên', 'Cây', 'Các đoạn (mm · ký hiệu)', 'Dư', 'Dùng %'].map((x, i) => h('th', { class: i >= 4 ? 's' : '', text: x })))]), h('tbody', null, d.cay.map((c) => h('tr', null, [h('td', { class: 'dam', text: c.ma }), h('td', { text: c.ten }), h('td', { text: c.so_cay }), h('td', { class: 'nho', text: c.doan.map((x) => x.dai + ' (' + x.ky_hieu + ')').join(' + ') + (c.qua_dai ? ' ⚠ dài hơn cây' : '') }), h('td', { class: 's', text: soVN(c.du, 1) }), h('td', { class: 's', text: soVN(c.dung_pt, 1) })])))])]));
      vung.appendChild(h('h3', { text: 'Danh sách cắt (' + d.cat_ds.length + ' dòng)' }));
      vung.appendChild(h('div', { class: 'bang-cuon' }, [h('table', null, [h('thead', null, [h('tr', null, ['Mã', 'Tên thanh', 'Dài (mm)', 'SL', 'Góc', 'Ký hiệu', 'Vị trí', 'Loại'].map((x, i) => h('th', { class: i === 2 || i === 3 ? 's' : '', text: x })))]), h('tbody', null, d.cat_ds.map((c) => h('tr', null, [h('td', { class: 'dam', text: c.ma }), h('td', { text: c.ten }), h('td', { class: 's dam', text: soVN(c.dai, 1) }), h('td', { class: 's', text: c.sl }), h('td', { text: c.goc1 + '° / ' + c.goc2 + '°' }), h('td', { text: c.ky_hieu }), h('td', { text: c.vi_tri }), h('td', { class: 'mo', text: c.loai })])))])]));
      return vung;
    }
    function tabKinh() {
      const vung = h('div');
      const chon = new Set();
      const ten_tt = { chua_dat: 'Chưa đặt', da_dat: 'Đã đặt', da_ve: 'Đã về' };
      const dem = d.kinh.reduce((a, k) => { a[k.tt] = (a[k.tt] || 0) + k.sl; return a; }, {});
      const m2 = d.kinh.reduce((a, k) => a + (k.rong * k.cao * k.sl) / 1e6, 0);
      vung.appendChild(h('div', { class: 'the hang' }, [h('span', { text: d.kinh.reduce((a, k) => a + k.sl, 0) + ' tấm · ' + soVN(m2) + ' m²' }), h('span', { class: 'mo nho', text: Object.keys(ten_tt).map((k) => ten_tt[k] + ' ' + (dem[k] || 0)).join(' · ') }), h('span', { class: 'gian' }), h('a', { class: 'nut', href: '/tai/' + d.ma + '-kinh.xlsx', text: 'Phiếu đặt kính (Excel)' })]
        .concat(d.quyen.kinh ? Object.keys(ten_tt).map((k) => h('button', { class: 'nut nho', text: '→ ' + ten_tt[k], onclick: () => { if (!chon.size) { bao('Chọn tấm kính trước', true); return; } lam('kinh', { khoa: Array.from(chon), tt: k }, 'kinh'); } })) : [])));
      vung.appendChild(h('div', { class: 'bang-cuon' }, [h('table', null, [h('thead', null, [h('tr', null, [d.quyen.kinh ? h('th', null, [h('input', { type: 'checkbox', style: 'width:auto;min-height:0', onchange: (e) => vung.querySelectorAll('input[data-k]').forEach((c) => { c.checked = e.target.checked; if (e.target.checked) chon.add(c.getAttribute('data-k')); else chon.delete(c.getAttribute('data-k')); }) })]) : null].concat(['Bộ', 'Loại kính', 'Rộng × Cao (mm)', 'SL', 'Vị trí', 'Trạng thái'].map((x, i) => h('th', { class: i === 3 ? 's' : '', text: x }))))]),
        h('tbody', null, d.kinh.map((k) => h('tr', null, [d.quyen.kinh ? h('td', null, [h('input', { type: 'checkbox', 'data-k': k.khoa, style: 'width:auto;min-height:0', onchange: (e) => { if (e.target.checked) chon.add(k.khoa); else chon.delete(k.khoa); } })]) : null, h('td', { class: 'dam', text: k.ky_hieu }), h('td', { text: k.loai || k.ten }), h('td', { text: soVN(k.rong, 1) + ' × ' + soVN(k.cao, 1) }), h('td', { class: 's', text: k.sl }), h('td', { class: 'mo', text: { fixedGlass: 'Ô fix', sashGlass: 'Cánh' }[k.kieu] || k.kieu }), h('td', null, [h('span', { class: 'tt' + (k.tt === 'da_ve' ? ' xong' : k.tt === 'da_dat' ? ' san_xuat' : ''), text: ten_tt[k.tt] })])])))])]));
      return vung;
    }
    function tabPk() {
      const gom = {};
      d.bo.forEach((b) => b.boc_tach.pk.forEach((p) => { const k = p.ma + '|' + p.ten; gom[k] = gom[k] || { ma: p.ma, ten: p.ten, sl: 0, bo: [] }; gom[k].sl += p.sl; gom[k].bo.push(b.ky_hieu); }));
      const ds = Object.keys(gom).map((k) => gom[k]).sort((a, b) => a.ma.localeCompare(b.ma));
      return h('div', { class: 'bang-cuon' }, [h('table', null, [h('thead', null, [h('tr', null, [h('th', { text: 'Mã' }), h('th', { text: 'Phụ kiện / vật tư' }), h('th', { class: 's', text: 'Tổng SL' }), h('th', { text: 'Bộ' })])]), h('tbody', null, ds.map((p) => h('tr', null, [h('td', { class: 'dam', text: p.ma }), h('td', { text: p.ten }), h('td', { class: 's', text: soVN(p.sl) }), h('td', { class: 'mo nho', text: Array.from(new Set(p.bo)).join(', ') })])))])]);
    }
    function tabLs() {
      return h('div', null, [
        d.lich_ban.length ? h('div', { class: 'the' }, [h('b', { text: 'Phiên bản' }), h('div', { class: 'mo nho', text: d.lich_ban.map((x) => 'Bản ' + x.ban + ': ' + gio(x.luc) + ' (' + x.so_bo + ' bộ)').join(' · ') + ' · Bản ' + d.phien_ban + ' (đang dùng)' })]) : null,
        d.duyet ? h('div', { class: 'the nho', text: 'Duyệt bởi ' + d.duyet.ai + ' lúc ' + gio(d.duyet.luc) }) : null,
        h('div', { class: 'bang-cuon' }, [h('table', null, [h('tbody', null, d.nhat_ky.map((x) => h('tr', null, [h('td', { class: 'mo nho', style: 'white-space:nowrap', text: gio(x.luc) }), h('td', { class: 'dam nho', text: x.ai }), h('td', { text: x.viec })])))])]),
      ]);
    }
    dung(tab_dang);
  }

  // ------------------------------------------------------------------ báo cáo
  async function veBaoCao() {
    const q = new URLSearchParams(location.search);
    const bay = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 7);
    const thang = h('input', { type: 'month', value: q.get('thang') || bay, style: 'width:auto' });
    const vung = h('div', null, [h('div', { class: 'tai', text: 'Đang tải…' })]);
    khung('Báo cáo', h('div', null, [h('div', { class: 'hang' }, [h('h1', { class: 'gian', text: 'Báo cáo tháng' }), thang]), vung]));
    thang.addEventListener('change', () => di('/bao-cao?thang=' + thang.value, true));
    let r;
    try { r = await goi('/api/w/bao-cao?thang=' + encodeURIComponent(thang.value)); } catch (e) { vung.textContent = e.message; return; }
    vung.textContent = '';
    const o = (so, chu, lop) => h('div', { class: lop || '' }, [h('b', { class: String(so).length > 8 ? 'tien' : '', text: so }), h('span', { text: chu })]);
    vung.appendChild(h('div', { class: 'o-so' }, [o(r.so_don, 'đơn'), o(r.so_bo, 'bộ cửa'), o(soVN(r.m2, 1), 'm² cửa'), o(soVN(r.kg_tp, 0), 'kg nhôm thành phẩm'), o(soVN(r.kg_cay, 0), 'kg nhôm cây xuất'), o(r.hao_hut === null ? '—' : soVN(r.hao_hut, 1) + '%', 'hao hụt nhôm', r.hao_hut > 12 ? 'canh' : '')]
      .concat(r.doanh_thu !== undefined ? [o(tien(r.doanh_thu), 'doanh thu (đ)'), o(tien(r.von), 'giá vốn (đ)'), o(tien(r.lai), 'lãi (đ)' + (r.doanh_thu ? ' · ' + soVN((r.lai / r.doanh_thu) * 100, 1) + '%' : ''), r.lai < 0 ? 'canh' : '')] : [])));
    if (r.thieu_gia) vung.appendChild(h('div', { class: 'mo nho', style: 'margin:-6px 0 12px', text: r.thieu_gia + ' đơn chưa đủ giá vốn (gửi từ máy đang khoá nhân viên, hoặc gửi trước bản 0.3.1) — không tính vào giá vốn, lãi.' }));
    const tong = S.buoc.reduce((a, b) => a + (r.tien_do[b.ma] || 0), 0);
    vung.appendChild(h('div', { class: 'the' }, [h('b', { text: 'Bộ cửa theo bước' }), h('div', { style: 'margin:8px 0' }, [thanhTD(r.tien_do, tong)]), h('div', { class: 'chu-td' }, S.buoc.map((b) => h('span', { style: '--m:' + MAU[b.ma], text: b.ten + ' ' + (r.tien_do[b.ma] || 0) })))]));
    if (!r.don.length) { vung.appendChild(h('div', { class: 'the mo', text: 'Tháng này chưa có đơn.' })); return; }
    const xg = r.doanh_thu !== undefined;
    vung.appendChild(h('div', { class: 'bang-cuon' }, [h('table', null, [h('thead', null, [h('tr', null, [h('th', { text: 'Đơn' }), h('th', { text: 'Trạng thái' }), h('th', { class: 's', text: 'Bộ' }), h('th', { class: 's', text: 'm²' }), h('th', { class: 's', text: 'kg TP / cây' }), h('th', { class: 's', text: 'Hao hụt' })].concat(xg ? [h('th', { class: 's', text: 'Doanh thu' }), h('th', { class: 's', text: 'Lãi' })] : []))]),
      h('tbody', null, r.don.map((x) => h('tr', { class: 'dong-don', onclick: () => di('/don/' + x.ma) }, [h('td', null, [h('div', { class: 'dam', text: x.ten }), h('div', { class: 'mo nho', text: x.ma })]), h('td', { text: x.trang_thai + (x.tre ? ' · trễ' : '') }), h('td', { class: 's', text: x.so_bo }), h('td', { class: 's', text: soVN(x.m2) }), h('td', { class: 's', text: soVN(x.kg_tp, 1) + ' / ' + soVN(x.kg_cay, 1) }), h('td', { class: 's', text: x.hao_hut === null ? '—' : soVN(x.hao_hut, 1) + '%' })]
        .concat(xg ? [h('td', { class: 's', text: x.gia ? tien(x.gia.tong) : '—' }), h('td', { class: 's ' + (x.gia && x.gia.lai < 0 ? 'do' : ''), text: x.gia && x.gia.lai !== null ? tien(x.gia.lai) : '—' })] : []))))])]));
    vung.appendChild(h('div', { class: 'mo nho', style: 'margin-top:8px', text: 'kg thành phẩm = tổng (dài cắt × số lượng × kg/m) theo bóc tách WindoorCraft; kg cây = số cây theo tối ưu × dài cây × kg/m. Hao hụt = phần cây không thành sản phẩm (đầu thừa, mạch cưa).' }));
  }

  // ------------------------------------------------------------------ người dùng
  async function veNguoi() {
    const vung = h('div');
    khung('Người dùng', h('div', null, [h('div', { class: 'hang' }, [h('h1', { class: 'gian', text: 'Người dùng' }), h('button', { class: 'nut chinh', text: '+ Thêm người', onclick: () => sua(null) })]), vung]));
    let r;
    const tai = async () => {
      r = await goi('/api/w/nguoi');
      vung.textContent = '';
      vung.appendChild(h('div', { class: 'bang-cuon' }, [h('table', null, [h('thead', null, [h('tr', null, [h('th', { text: 'Tên' }), h('th', { text: 'Điện thoại' }), h('th', { text: 'Vai trò' }), h('th', { text: '' })])]), h('tbody', null, r.nguoi.map((n) => h('tr', null, [h('td', { class: 'dam', text: n.ten + (n.khoa ? ' (đã khoá)' : '') }), h('td', { text: n.sdt }), h('td', { class: 'nho', text: n.vai.map((v) => r.vai[v]).join(', ') }), h('td', { class: 's' }, [h('button', { class: 'nut nho', text: 'Sửa', onclick: () => sua(n) })])])))])]));
    };
    const sua = (n) => {
      const ten = h('input', { type: 'text', value: n ? n.ten : '' }), sdt = h('input', { type: 'tel', value: n ? n.sdt : '' }), pin = h('input', { type: 'password', inputmode: 'numeric', placeholder: n ? 'để trống = giữ PIN cũ' : '4–8 số' });
      const khoa = h('input', { type: 'checkbox', style: 'width:auto;min-height:0' }); khoa.checked = !!(n && n.khoa);
      const vai = Object.keys(r.vai).map((v) => { const c = h('input', { type: 'checkbox', value: v }); c.checked = !!(n && n.vai.indexOf(v) >= 0); return h('label', null, [c, r.vai[v]]); });
      const loi = h('div', { class: 'do nho' });
      const p = h('div', { class: 'phu' }, [h('div', { class: 'hop' }, [h('h3', { text: n ? 'Sửa ' + n.ten : 'Thêm người dùng' }), h('label', { class: 'mo nho', text: 'Họ tên' }), ten, h('label', { class: 'mo nho', text: 'Số điện thoại (đăng nhập)' }), sdt, h('label', { class: 'mo nho', text: 'Mã PIN' }), pin,
        h('div', { class: 'mo nho', style: 'margin:10px 0 4px', text: 'Vai trò' }), h('div', { class: 'vai-chon' }, vai), n ? h('label', { class: 'hang nho', style: 'margin-top:10px' }, [khoa, 'Khoá tài khoản (nghỉ việc)']) : null, loi,
        h('div', { class: 'nuts' }, [h('button', { class: 'nut', text: 'Thôi', onclick: () => p.remove() }), h('button', { class: 'nut chinh', text: 'Lưu', onclick: async () => {
          try { await goi('/api/w/nguoi', { id: n ? n.id : '', ten: ten.value, sdt: sdt.value, pin: pin.value, khoa: khoa.checked, vai: vai.map((l) => l.firstChild).filter((c) => c.checked).map((c) => c.value) }); p.remove(); bao('Đã lưu'); tai(); } catch (e) { loi.textContent = e.message; }
        } })])])]);
      document.body.appendChild(p); ten.focus();
    };
    try { await tai(); } catch (e) { vung.textContent = e.message; }
  }

  // ------------------------------------------------------------------ cài đặt
  function veCaiDat() {
    const c = S.cai_dat;
    const duyet = h('input', { type: 'checkbox', style: 'width:auto;min-height:0' }); duyet.checked = !!c.can_duyet;
    const cty = h('input', { type: 'text', value: c.cong_ty || '' });
    khung('Cài đặt', h('div', null, [h('h1', { text: 'Cài đặt' }),
      h('div', { class: 'the' }, [h('label', { class: 'hang' }, [duyet, h('span', null, [h('b', { text: 'Đơn mới phải chờ Chủ duyệt' }), h('div', { class: 'mo nho', text: 'Bật: đơn gửi từ tiện ích nằm ở "Chờ duyệt", máy cắt chưa thấy. Tắt: máy cắt nhận ngay.' })])]),
        h('div', { style: 'margin-top:14px' }, [h('label', { class: 'mo nho', text: 'Tên công ty (in trên bản vẽ sản xuất)' }), cty]),
        h('div', { class: 'hang', style: 'margin-top:14px' }, [h('span', { class: 'gian' }), h('button', { class: 'nut chinh', text: 'Lưu', onclick: async () => { try { const r = await goi('/api/w/cai-dat', { can_duyet: duyet.checked, cong_ty: cty.value }); S.cai_dat = r.cai_dat; bao('Đã lưu'); } catch (e) { bao(e.message, true); } } })])]),
      h('div', { class: 'the nho' }, [h('b', { text: 'Kết nối' }),
        h('div', { text: '• Tiện ích Vẽ cửa (WindoorCraft): Cài đặt → Sản xuất · máy cắt → Máy chủ = ' + location.origin + ', Khoá gửi = KHOA của máy chủ.' }),
        h('div', { text: '• Máy cắt: mở ' + location.origin + '/may (nhập khoá) hoặc chạy chương trình tự lấy file.' }),
        h('div', { class: 'mo', text: 'Phần mềm v' + (S.ban || '') })]),
    ]));
  }

  // ------------------------------------------------------------------ điều hướng
  async function ve() {
    if (!S.nguoi) return veVao();
    const p = location.pathname;
    let m;
    if ((m = p.match(/^\/don\/(C\d{6}-\d+)$/))) return veDon(m[1]);
    if (p === '/don') return veDsDon();
    if (p === '/bao-cao') return veBaoCao();
    if (p === '/nguoi') return veNguoi();
    if (p === '/cai-dat') return veCaiDat();
    return veViec();
  }
  (async () => {
    try {
      const r = await goi('/api/trang-thai');
      if (!r.co_nguoi) return veVao(true);
      if (!r.nguoi) return veVao();
      S.nguoi = r.nguoi; await napToi(); ve();
    } catch (e) { app.textContent = 'Không kết nối được máy chủ: ' + e.message; }
  })();
})();
