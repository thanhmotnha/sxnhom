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
