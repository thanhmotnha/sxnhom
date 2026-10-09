/* Một Nhà · Vẽ cửa — BỘ NẠP TỰ CẬP NHẬT (chạy trong trang ln.windoorcraft.com, world MAIN)
 * Chọn bản mới nhất trong 3 nguồn rồi chạy đúng một bản:
 *   1. bản gốc đi kèm tiện ích (goc.js)            — luôn có, dùng khi mất mạng lần đầu
 *   2. bản đã tải lần trước (lưu trong trình duyệt) — dùng khi mất mạng
 *   3. bản phát hành trên GitHub (thanhmotnha/sxnhom)
 * Bản tải về chỉ được chạy khi CHỮ KÝ khớp khoá công khai dưới đây (khoá riêng không nằm trên GitHub),
 * nên dù ai sửa được kho GitHub cũng không đẩy được mã lạ vào trang WindoorCraft.
 */
(function (G) {
  'use strict';
  if (G.__mnwd_nap) return;
  G.__mnwd_nap = true;
  try { if (G.top !== G) return; } catch (e) { return; }
  const KHOA_CONG = __KHOA_CONG__;
  const NGUON = __NGUON__;
  const TEP_HOP_LE = /^https:\/\/raw\.githubusercontent\.com\/thanhmotnha\/sxnhom\/[\w.-]+\/dist\/mn-windoor\.js$/;
  const KHO = 'mnwd.ban_tai';
  const goc = G.__mnwd_goc || { ban: '0.0.0', chay: function () {} };

  const so = (v) => String(v || '0').split('.').map((x) => parseInt(x, 10) || 0);
  const moiHon = (a, b) => { const x = so(a), y = so(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
  const b64 = (s) => Uint8Array.from(G.atob(String(s)), (c) => c.charCodeAt(0));
  let khoa = null;
  const dungChuKy = async (ma, ky) => {
    try {
      if (!G.crypto || !G.crypto.subtle || !ma || !ky) return false;
      khoa = khoa || await G.crypto.subtle.importKey('jwk', KHOA_CONG, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      return await G.crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, khoa, b64(ky), new TextEncoder().encode(ma));
    } catch (e) { return false; }
  };
  const docKho = () => { try { return JSON.parse(G.localStorage.getItem(KHO) || 'null'); } catch (e) { return null; } };
  const ghiKho = (o) => { try { G.localStorage.setItem(KHO, JSON.stringify(o)); } catch (e) { /* đầy bộ nhớ: lần sau tải lại */ } };
  const layMang = async (ms) => {
    const c = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const hen = G.setTimeout(() => { if (c) c.abort(); }, ms);
    try {
      const r = await G.fetch(NGUON + '?t=' + Math.floor(Date.now() / 60000), { cache: 'no-store', credentials: 'omit', signal: c ? c.signal : undefined });
      if (!r.ok) return null;
      const j = await r.json();
      if (!j || !j.ban || !j.chu_ky || !TEP_HOP_LE.test(String(j.tep || ''))) return null;
      const k = docKho(), co = k && k.ma && moiHon(k.ban, goc.ban) ? k.ban : goc.ban;
      if (!moiHon(j.ban, co)) return { ban: j.ban, cu: true }; // đã có bản này rồi
      const r2 = await G.fetch(j.tep, { cache: 'no-store', credentials: 'omit', signal: c ? c.signal : undefined });
      if (!r2.ok) return null;
      const ma = await r2.text();
      if (!(await dungChuKy(ma, j.chu_ky))) { G.console.warn('[Một Nhà · Vẽ cửa] bản ' + j.ban + ' trên GitHub sai chữ ký — bỏ qua'); return null; }
      const o = { ban: j.ban, ma: ma, chu_ky: j.chu_ky, ghi_chu: String(j.ghi_chu || ''), luc: Date.now() };
      ghiKho(o);
      return o;
    } catch (e) { return null; } finally { G.clearTimeout(hen); }
  };
  const chay = (ma, nguon, ban) => {
    try { (0, eval)(ma); G.__mnwd_nguon = { nguon: nguon, ban: ban }; return true; } catch (e) { G.console.warn('[Một Nhà · Vẽ cửa] lỗi chạy bản ' + ban, e); return false; }
  };

  (async () => {
    // bản đã tải lần trước (kiểm lại chữ ký mỗi lần)
    let tot = null;
    const kho = docKho();
    if (kho && kho.ma && moiHon(kho.ban, goc.ban) && await dungChuKy(kho.ma, kho.chu_ky)) tot = { ma: kho.ma, ban: kho.ban, nguon: 'bo_nho' };
    // hỏi GitHub, chờ tối đa 2,5 giây (WindoorCraft cũng đang tải), quá thì để lần sau
    let xong = false;
    const hoi = layMang(15000).then((o) => { xong = true; return o; });
    const kq = await Promise.race([hoi, new Promise((ok) => G.setTimeout(() => ok(undefined), 2500))]);
    if (kq && kq.ma && (!tot || moiHon(kq.ban, tot.ban))) tot = { ma: kq.ma, ban: kq.ban, nguon: 'github' };
    if (!xong) hoi.then((o) => { if (o && o.ma) G.__mnwd_ban_moi = o.ban; }); // tải xong muộn: lần mở sau dùng
    if (tot && chay(tot.ma, tot.nguon, tot.ban)) return;
    try { goc.chay(); G.__mnwd_nguon = { nguon: 'goc', ban: goc.ban }; } catch (e) { G.console.warn('[Một Nhà · Vẽ cửa] lỗi bản gốc', e); }
  })();
})(typeof globalThis !== 'undefined' ? globalThis : this);
