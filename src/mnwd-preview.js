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
