const M = require('../src/mnwd-core.js');
require('../src/mnwd-driver.js');
const MOCK = require('./mock-windoor.js');
const { T, eq, ok, gan, co, chay } = require('./khung-thu.js');

const dung = (tuy) => { const k = MOCK.tao(tuy); return Object.assign(k, { dr: new M.Driver(k.win) }); };
const keHoach = (dr, ma, them, tuy) => {
  const m = Object.assign(M.apMau({}, M.timMau(ma)), them || {});
  return M.tinh(m, dr.bienDang(m.he_nhom), Object.assign({ chia_deu: dr.chiaDeuTheoPm() }, tuy || {}));
};

T('Dò lớp hình học: không đụng bản vẽ, không đổi công cụ', () => {
  const k = dung();
  const L = k.dr.lop();
  ok(L.Pt === k.Pt && L.Vec === k.Vec && L.Line === k.Line, 'đúng 3 lớp');
  eq([k.sm.shapem.length, k.mm.so_cp, k.tm.curTool, k.nk.lenh], [0, 0, 'pan', []], 'không vẽ gì, không tạo bước hoàn tác');
  ok(!Object.prototype.hasOwnProperty.call(k.sm, 'addMullion') || typeof k.sm.addMullion === 'function', 'trả lại addMullion');
  ok(k.dr.lop() === L, 'lần sau lấy từ bộ nhớ');
});

T('Sẵn sàng / chưa sẵn sàng', () => {
  const k = dung();
  eq(k.dr.sanSang(), { ok: true }, 'trang vẽ đang mở');
  k.sm.readonly = true; ok(/chỉ xem/.test(k.dr.sanSang().ly_do), 'chỉ xem'); k.sm.readonly = false;
  k.draw.$route.name = 'orders'; ok(/không phải trang Thiết kế/.test(k.dr.sanSang().ly_do), 'trang khác'); k.draw.$route.name = 'draw';
  const r = new M.Driver({ document: { querySelector: () => null } });
  ok(/Chưa mở trang Thiết kế/.test(r.sanSang().ly_do), 'chưa có webcc');
});

T('Danh mục hệ nhôm, biên dạng, cách chia đều', () => {
  const k = dung();
  const ds = k.dr.dsHeNhom();
  eq([ds.length, ds[0].id, ds[0].nhom, ds[0].khung, ds[0].do, ds[3].nhom, ds[4].mo_ngoai], [5, 155849, 'XINGFA 55', 31.2, 30.4, 'XF-CỬA LÙA 93', false], 'đọc danh mục, bỏ dòng tiêu đề / gạch');
  eq(k.dr.bienDang(151076), { khung: 47.2, do: 37.4 }, 'theo mã');
  eq(k.dr.bienDang(null), { khung: 31.2, do: 30.4 }, 'theo hệ đang chọn');
  eq([k.dr.chiaDeuTheoPm(), dung({ chia_deu_pm: 1 }).dr.chiaDeuTheoPm()], ['tim', 'lot_long'], 'cách chia đều của tài khoản');
});

T('Chọn kiểu lùa theo số cánh', () => {
  const k = dung();
  eq([M.soCanhLua('A1-A0'), M.soCanhLua('A1A2-A0A3'), M.soCanhLua('A0-A1-S0'), M.soCanhLua('A0A2-A1|V'), M.soCanhLua('D0-D1')], [2, 4, -1, -1, -1], 'đếm cánh kính, loại lưới / lùa đứng');
  eq([k.dr.kieuLua(2), k.dr.kieuLua(3), k.dr.kieuLua(4), k.dr.kieuLua(6), k.dr.kieuLua(7)], [15, 20, 18, 42, null], 'mặc định hệ nhôm cho 2 cánh; 3, 4, 6 theo ưu tiên; 7 không có');
  eq([k.dr.kieuLua(4, 2), k.dr.kieuLua(4, 999)], [2, 18], 'chỉ định hợp lệ thì dùng, lạ thì bỏ qua');
  eq(k.dr.dsKieuLua(3).map((o) => o.serial), ['A0A2-A1', 'A1-A0A2', 'A0-A1-A2'], 'liệt kê kiểu 3 cánh');
});

T('Vẽ mọi mẫu: đối chiếu đúng, một bước hoàn tác', async () => {
  for (const x of M.MAU) {
    const k = dung();
    const kh = keHoach(k.dr, x.ma);
    const r = await k.dr.ve(kh);
    ok(r.doi_chieu.dung, x.ma + ' đối chiếu đúng', r.doi_chieu.muc.filter((m) => !m.ok));
    eq(r.canh_bao, [], x.ma + ' không cảnh báo khi vẽ');
    eq(k.mm.so_cp, 1, x.ma + ' đúng 1 bước hoàn tác');
    eq([k.sm.sashAsDoor, Object.prototype.hasOwnProperty.call(k.mm, 'checkPoint') && k.mm.checkPoint.toString().length < 20], [false, false], x.ma + ' trả lại sashAsDoor và checkPoint');
    eq(r.canh, kh.thong_ke.so_canh, x.ma + ' đủ số cánh');
    eq(k.sm.shapem.length, 1, x.ma + ' một khung');
  }
});

T('Cửa đi 2 cánh + ô thoáng: đúng lệnh, đúng thuộc tính', async () => {
  const k = dung();
  const kh = keHoach(k.dr, 'D2QT', { rong: 1600, cao: 2700, mo: 'trong', he_nhom: 151076 });
  eq([kh.bd.khung, kh.bd.do], [47.2, 37.4], 'kế hoạch tính theo biên dạng hệ sẽ chọn');
  const r = await k.dr.ve(kh);
  eq(k.nk.lenh, ['clear', 'khung door', 'do ngang 500', 'canh doi di'], 'thứ tự lệnh');
  eq([r.doi_he.doi, k.oi.order_info.product_id, k.sm.profileSize.frame], [true, 151076, 47.2], 'đổi hệ nhôm trước khi vẽ');
  const fr = k.sm.shapem[0], b = fr.polygon.box;
  eq([b.xmin, b.ymin, b.xmax, b.ymax, fr.polygon.type, fr.kh], [0, 0, 1600, 2700, 'door', 47.2], 'khung cửa đi 1600×2700 dựng theo biên dạng mới');
  const d = fr.sashManager.doubleSashes[0];
  eq([d.isDoor, d.openToward, d.sashes.map((s) => s.hardwareManager.openToward + s.hardwareManager.hinges.length)], [true, 'inward', ['inward3', 'inward3']], 'cánh đôi cửa đi, mở vào trong, 3 bản lề');
  eq(k.eb.da_phat, [], 'không phát sự kiện ra bảng bên phải');
  eq(k.webcc.eventsEmitted, [], 'không để lại cờ sự kiện');
  eq(k.mm.so_cp, 1, 'đổi hướng mở vẫn gói trong 1 bước hoàn tác');
});

T('Cửa sổ: hướng bản lề, mở hất, không phải cửa đi', async () => {
  const k = dung();
  let r = await k.dr.ve(keHoach(k.dr, 'SQFQ'));
  let ss = k.sm.shapem[0].sashManager.sashes;
  eq(ss.map((s) => s.hardwareManager.openDirection + ':' + s.isDoor + ':' + s.hardwareManager.openToward), ['left:false:outward', 'right:false:outward'], 'vách trái lề trái, vách phải lề phải');
  r = await k.dr.ve(keHoach(k.dr, 'S2H', { mo: 'ngoai' }));
  ss = k.sm.shapem[0].sashManager.sashes;
  eq(ss.map((s) => s.hardwareManager.openDirection), ['up', 'up'], 'hất: lề trên');
  eq(r.doi_chieu.muc.map((m) => m.ten + '=' + m.co), ['Rộng khung=1400', 'Cao khung=1000', 'Số ô=2', 'Cánh mở quay / hất=2'], 'đối chiếu chỉ nêu mục có liên quan');
  r = await k.dr.ve(keHoach(k.dr, 'S1Q', { chinh: { kieu: 'quay', so: 3, huong: 'doi_xung', canh: 2, xep_trai: 3, xep_phai: 0 }, rong: 2100 }));
  eq(k.sm.shapem[0].sashManager.sashes.map((s) => s.hardwareManager.openDirection), ['left', 'right', 'left'], '3 ô đối xứng: T P T');
});

T('Lùa, xếp trượt, 4 cánh mở quay', async () => {
  const k = dung();
  await k.dr.ve(keHoach(k.dr, 'D4L'));
  let g = k.sm.shapem[0].sashManager;
  eq([g.slides[0].appliedOptionIndex, g.slides[0].sashes.length, g.slides[0].isDoor, k.sm.shapem[0].polygon.type], [18, 4, true, 'polygon'], 'lùa 4 cánh kiểu A1A2-A0A3, cửa đi, khung 4 cạnh');
  await k.dr.ve(keHoach(k.dr, 'DX6'));
  g = k.sm.shapem[0].sashManager;
  eq([g.folds[0].leftCount, g.folds[0].rightCount, g.folds[0].sashes.length, g.folds[0].asPush], [3, 3, 6, false], 'xếp 3+3');
  await k.dr.ve(keHoach(k.dr, 'D4Q', { mo: 'trong' }));
  g = k.sm.shapem[0].sashManager;
  eq([g.folds[0].asPush, g.folds[0].sashes.length, g.folds[0].isDoor, g.folds[0].sashes.map((s) => s.hardwareManager.openToward).join()], [true, 4, true, 'inward,inward,inward,inward'], '4 cánh mở quay, đổi chiều mở từng lá');
  const k2 = dung({ khong_co_4_canh: true });
  const r = await k2.dr.ve(keHoach(k2.dr, 'D4Q'));
  ok(co(r.canh_bao, /4 cánh mở quay \(phiên bản WindoorCraft này không có\)/) && !r.doi_chieu.dung, 'thiếu công cụ → báo rõ, đối chiếu sai');
  const r7 = await k.dr.ve(keHoach(k.dr, 'S2L', { chinh: { kieu: 'lua', canh: 7, so: 1, huong: 'doi_xung', xep_trai: 3, xep_phai: 0 } }));
  ok(co(r7.canh_bao, /không có kiểu lùa đúng số cánh/), 'lùa 7 cánh không có → báo');
});

T('Vẽ mới trên bộ đã lưu: bỏ mã bộ cũ, giữ đơn', async () => {
  const k = dung();
  await k.dr.ve(keHoach(k.dr, 'S2Q'));
  k.dr.dienThongTin({ ky_hieu: 'S1', so_luong: 3, vi_tri: 'Bếp', ghi_chu: 'x' });
  const a = await k.dr.luu();
  eq([a.moi, k.da_luu.length, k.da_luu[0].ky_hieu, k.da_luu[0].so_luong, k.da_luu[0].vi_tri, k.oi.so_setArea], [true, 1, 'S1', 3, 'Bếp', 1], 'lưu bộ đầu → tạo đơn mới, gọi setArea khi đổi số lượng');
  eq(k.dr.trangThai().ma_bo, a.ma_bo, 'trạng thái: đang mở bộ đã lưu');
  await k.dr.ve(keHoach(k.dr, 'D2Q'));
  eq([k.draw.$route.query.order_id, k.draw.$route.query.contract_id], [undefined, a.ma_don], 'vẽ mới → bỏ mã bộ, giữ mã đơn');
  k.dr.dienThongTin({ ky_hieu: 'D1' });
  const b = await k.dr.luu();
  eq([b.moi, b.ma_don === a.ma_don, b.ma_bo !== a.ma_bo, k.da_luu.length, JSON.parse(k.da_luu[0].ban_ve).sm[0].fenes[0].type], [true, true, true, 2, 'DoubleSash'], 'bộ thứ hai vào cùng đơn, bộ đầu còn nguyên');
});

T('Vẽ đè: giữ mã bộ, hoàn tác trả bản cũ', async () => {
  const k = dung();
  await k.dr.ve(keHoach(k.dr, 'S2Q'));
  const a = await k.dr.luu();
  const cu = k.sm.serialize();
  const r = await k.dr.ve(keHoach(k.dr, 'S2L'), { che_do: 'de' });
  eq([r.che_do, k.draw.$route.query.order_id], ['de', a.ma_bo], 'giữ mã bộ');
  ok(k.sm.serialize() !== cu, 'bản vẽ đã đổi');
  ok(k.dr.hoanTac(), 'hoàn tác được');
  eq(k.sm.serialize(), cu, 'trả đúng bản vẽ cũ');
  ok(!k.dr.hoanTac(), 'hoàn tác lần hai: không còn gì');
  await k.dr.ve(keHoach(k.dr, 'V1'));
  ok(k.dr.hoanTac() && k.sm.isEmpty, 'vẽ mới rồi hoàn tác → trống');
});

T('Lưu: lỗi từ WindoorCraft, bản vẽ trống, im lặng', async () => {
  let k = dung({ loi_luu: true });
  await k.dr.ve(keHoach(k.dr, 'V1'));
  let e = null; try { await k.dr.luu(); } catch (x) { e = x; }
  ok(e && /WindoorCraft báo: Lưu thất bại/.test(e.message), 'nêu đúng câu WindoorCraft báo', e && e.message);
  eq(Object.keys(k.draw.$VMessage).length, 4, 'trả lại $VMessage');
  eq(k.nk.tb, [['loi', 'Lưu thất bại']], 'thông báo gốc vẫn hiện');
  k = dung();
  e = null; try { await k.dr.luu(); } catch (x) { e = x; }
  ok(e && /đang trống/.test(e.message), 'trống → không gọi lưu');
  k = dung({ im_lang_khi_luu: true });
  await k.dr.ve(keHoach(k.dr, 'V1'));
  const t0 = Date.now(); e = null; try { await k.dr.luu(); } catch (x) { e = x; }
  ok(e && /không nhận lệnh lưu/.test(e.message) && Date.now() - t0 < 12000, 'không phản hồi → dừng sau ~8 giây', e && e.message);
});

T('Đổi hệ nhôm: không đổi nếu trùng, lỗi nếu không có / treo', async () => {
  const k = dung();
  eq(await k.dr.chonHeNhom(155849), { doi: false }, 'trùng → không đổi');
  let e = null; try { await k.dr.chonHeNhom(42); } catch (x) { e = x; }
  ok(e && /không có hệ nhôm mã 42/.test(e.message), 'mã lạ');
  const r = await k.dr.chonHeNhom(71881);
  eq([r.doi, k.sm.profileSize.frame, k.oi.isChangeProduct], [true, 45, false], 'đổi xong mới trả về');
});

T('Lỗi kế hoạch / kích thước khung ra khác', async () => {
  const k = dung();
  let e = null; try { await k.dr.ve(M.tinh(M.chuanHoa({ rong: 1000 }), {}, {})); } catch (x) { e = x; }
  ok(e && /Chưa nhập chiều cao/.test(e.message), 'kế hoạch lỗi → không vẽ');
  eq(k.nk.lenh, [], 'chưa đụng bản vẽ');
  const kh = keHoach(k.dr, 'V2');
  kh.do[0].tam = { x: 99999, y: 5 }; // điểm ngoài khung
  const r = await k.dr.ve(kh);
  ok(co(r.canh_bao, /không vẽ được/) && !r.doi_chieu.dung, 'đố không vẽ được → báo, đối chiếu sai');
});

T('Trạng thái', async () => {
  const k = dung();
  eq(k.dr.trangThai(), { trong: true, so_khung: 0, ma_don: '', ma_bo: '', he_nhom: { id: 155849, ten: k.SP[1].name }, ky_hieu: 'C1', dang_luu: false, dang_tai: false }, 'trang mới mở');
  await k.dr.ve(keHoach(k.dr, 'V1'));
  eq([k.dr.trangThai().trong, k.dr.trangThai().so_khung], [false, 1], 'sau khi vẽ');
});

T('Lưu kèm thông tin: ký hiệu bị WindoorCraft đặt lại vẫn lưu đúng', async () => {
  const k = dung();
  await k.dr.ve(keHoach(k.dr, 'S2Q'));
  k.dr.dienThongTin({ ky_hieu: 'S7', so_luong: 2 });
  k.oi.order_info.window_no = 'C3'; // WindoorCraft tự đặt lại sau khi nạp danh sách bộ
  await k.dr.luu({ thong_tin: { ky_hieu: 'S7', so_luong: 2, vi_tri: 'Tầng 2', ghi_chu: '' } });
  eq([k.da_luu[0].ky_hieu, k.da_luu[0].so_luong, k.da_luu[0].vi_tri], ['S7', 2, 'Tầng 2'], 'lưu đúng ký hiệu của người dùng');
});

T('Đơn hàng mới: rời trang vẽ rồi vào lại, bộ kế tiếp không dính đơn cũ', async () => {
  const k = dung();
  eq(await k.dr.donMoi(), { vao_lai: false }, 'chưa có đơn → chỉ dọn bản vẽ');
  await k.dr.ve(keHoach(k.dr, 'S2Q'));
  const a = await k.dr.luu();
  const r = await k.dr.donMoi();
  eq([r.vao_lai, k.router.nk, k.draw.$route.query.contract_id, k.draw.$route.query.drawType], [true, ['home', '/draw'], undefined, '2'], 'về trang chủ rồi vào lại trang vẽ, hết mã đơn');
  ok(k.dr.cc() !== k.webcc && k.dr.sanSang().ok, 'nhận webcc mới');
  await k.dr.ve(keHoach(k.dr, 'D2Q'));
  const b = await k.dr.luu();
  ok(b.ma_don !== a.ma_don && k.da_luu.length === 2, 'bộ sau nằm ở đơn khác', [a, b]);
  ok(k.dr.moDon(b.ma_don) && k.router.nk[k.router.nk.length - 1] === 'orders.group-detail', 'mở trang chi tiết đơn');
});

T('Đã đăng nhập / mở trang Thiết kế', () => {
  const k = dung();
  ok(k.dr.daDangNhap(), 'đang ở trang vẽ → đã đăng nhập');
  k.goc.$route = { name: 'login', query: {} };
  ok(!k.dr.daDangNhap(), 'trang đăng nhập → chưa');
  ok(k.dr.moThietKe() && k.router.nk[0] === '/draw', 'mở trang Thiết kế qua router');
});

T('Kính: danh mục theo hệ nhôm, chọn theo tên, sai tên thì dừng trước khi vẽ', async () => {
  const k = dung();
  eq(k.dr.dsKinh(), [{ ten: 'KINH 6.38TS', day: 6.38, mac_dinh: true }, { ten: 'KINH 8.38TS', day: 8.38, mac_dinh: false }, { ten: 'KINH HOP 19MM', day: 19, mac_dinh: false }], 'đọc danh mục, bỏ tên trùng');
  eq(k.dr.kinhDangChon(), 'KINH 6.38TS', 'đang chọn loại mặc định');
  const cp0 = k.mm.so_cp;
  const r = await k.dr.ve(Object.assign(keHoach(k.dr, 'S2Q'), { kinh: '  kính  8.38ts ' }));
  eq([r.kinh, k.oi.order_info.guigelabel, k.sm.shapem[0].kinh, k.oi.spec_form_data[1].value1], [{ ten: 'KINH 8.38TS', doi: true }, 'KINH 8.38TS', 'KINH 8.38TS', '8.38'], 'tên gõ thường, có dấu, thừa khoảng trắng vẫn nhận; ô Kính, bản vẽ, bảng giá cùng đổi');
  eq(k.mm.so_cp - cp0, 1, 'đổi kính nằm chung một bước hoàn tác với lần vẽ');
  ok(r.doi_chieu.dung && r.doi_chieu.muc.some((m) => m.ten === 'Kính' && m.ok), 'đối chiếu có mục Kính');
  await k.dr.luu({ thong_tin: { ky_hieu: 'S1' } });
  // dòng sau không ghi kính, cùng hệ nhôm: WindoorCraft vẫn giữ 8.38 → tiện ích phải đưa về mặc định
  const r2 = await k.dr.ve(keHoach(k.dr, 'S2Q'));
  eq([r2.kinh, k.oi.order_info.guigelabel, k.sm.shapem[0].kinh], [{ ten: 'KINH 6.38TS', doi: true }, 'KINH 6.38TS', 'KINH 6.38TS'], 'vẽ bộ mới không ghi kính → về loại mặc định của hệ');
  await k.dr.luu({ thong_tin: { ky_hieu: 'S2' } });
  eq(k.da_luu.map((x) => [x.ky_hieu, x.kinh, x.kinh_ban_ve]), [['S1', 'KINH 8.38TS', 'KINH 8.38TS'], ['S2', 'KINH 6.38TS', 'KINH 6.38TS']], 'lưu đúng loại kính từng bộ');
  // sai tên: dừng trước khi vẽ, gợi ý tên gần giống
  const lenh0 = k.nk.lenh.length;
  let e = null; try { await k.dr.ve(Object.assign(keHoach(k.dr, 'S2Q'), { kinh: '8.38' })); } catch (x) { e = x; }
  ok(e && /không có loại kính "8\.38" — gần giống: KINH 8\.38TS/.test(e.message), 'báo sai tên kèm gợi ý', e && e.message);
  eq(k.nk.lenh.slice(lenh0).filter((l) => /^khung|^canh|^kinh/.test(l)), [], 'chưa vẽ gì khi tên kính sai');
  // đổi hệ nhôm: danh mục khác, mặc định khác
  const r3 = await k.dr.ve(Object.assign(keHoach(k.dr, 'S2L', { he_nhom: 152612 }), { kinh: 'KINH 6.38TS' }));
  eq([r3.doi_he.doi, r3.kinh, k.dr.dsKinh().map((x) => x.ten)], [true, { ten: 'KINH 6.38TS', doi: true }, ['KINH 5MM', 'KINH 6.38TS']], 'đổi hệ rồi mới soát và chọn kính theo danh mục của hệ mới');
  e = null; try { await k.dr.ve(Object.assign(keHoach(k.dr, 'D2L', { he_nhom: 71881 }), { kinh: 'KINH 8.38TS' })); } catch (x) { e = x; }
  ok(e && /chưa có danh mục kính/.test(e.message), 'hệ không có danh mục kính → nói rõ', e && e.message);
});

T('Kính: vẽ đè giữ kính của bộ đang mở; hệ không có mặc định thì giữ nguyên; bản không hỗ trợ thì báo', async () => {
  const k = dung();
  await k.dr.ve(Object.assign(keHoach(k.dr, 'S2Q'), { kinh: 'KINH HOP 19MM' }));
  await k.dr.luu();
  const r = await k.dr.ve(keHoach(k.dr, 'S1Q'), { che_do: 'de' });
  eq([r.kinh, k.oi.order_info.guigelabel, k.sm.shapem[0].kinh], [undefined, 'KINH HOP 19MM', 'KINH HOP 19MM'], 'vẽ đè, không ghi kính → không đụng tới kính của bộ đã lưu');
  const r2 = await k.dr.ve(Object.assign(keHoach(k.dr, 'S1Q'), { kinh: 'KINH 8.38TS' }), { che_do: 'de' });
  eq([r2.kinh.ten, k.sm.shapem[0].kinh], ['KINH 8.38TS', 'KINH 8.38TS'], 'vẽ đè có ghi kính → đổi');
  const r3 = await k.dr.ve(keHoach(k.dr, 'DX4', { he_nhom: 71888 }));
  eq([r3.kinh, k.oi.order_info.guigelabel], [{ ten: '', doi: false }, ''], 'hệ không đặt loại mặc định → để nguyên như WindoorCraft');
  const k2 = dung({ khong_chon_kinh: true });
  let e = null; try { await k2.dr.ve(Object.assign(keHoach(k2.dr, 'S2Q'), { kinh: 'KINH 8.38TS' })); } catch (x) { e = x; }
  ok(e && /không cho chọn kính tự động/.test(e.message), 'WindoorCraft đổi bản, mất lệnh chọn kính → báo, không lưu sai', e && e.message);
  const r4 = await k2.dr.ve(keHoach(k2.dr, 'S2Q'));
  ok(r4.doi_chieu.dung && r4.kinh.doi === false, 'không ghi kính thì vẫn vẽ bình thường');
});

T('Tự chia ô: vẽ mọi mẫu dạng cây và một bộ chia tự do — đối chiếu khớp', async () => {
  const k = dung();
  for (const x of M.MAU) {
    const m = M.apMau({}, x); m.tu_do = M.sangCay(m);
    const r = await k.dr.ve(M.tinh(M.chuanHoa(m), k.dr.bienDang(null), { chia_deu: k.dr.chiaDeuTheoPm() }));
    ok(r.doi_chieu.dung && !r.canh_bao.length, x.ma + ' dạng cây', r.doi_chieu.muc.filter((v) => !v.ok).concat(r.canh_bao));
  }
  let c = M.chiaO(M.chuanCay({ kieu: 'fix' }), [], 'dung', 3);
  c = M.chiaO(c, [1], 'ngang', 2);
  c = M.thayNut(c, [1, 1], { kieu: 'quay2' }); c = M.thayNut(c, [0], { kieu: 'hat' }); c = M.thayNut(c, [2], { kieu: 'lua', canh: 2 });
  const r = await k.dr.ve(M.tinh(M.chuanHoa({ loai: 'cua_so', rong: 3600, cao: 2000, tu_do: c }), k.dr.bienDang(null), {}));
  ok(r.doi_chieu.dung, 'bộ tự chia 4 ô: hất + fix + 2 cánh + lùa', r.doi_chieu.muc.filter((v) => !v.ok));
  eq(k.nk.lenh.slice(-7), ['khung4 3600x2000', 'do dung 1200', 'do dung 2400', 'do ngang 1000', 'canh so', 'canh doi so', 'lua A1-A0'], 'đố cha trước, đố con sau, rồi tới cánh');
});

T('Tính giá: hàm của WindoorCraft, không lưu, không đổi bản vẽ, không thêm bước hoàn tác', async () => {
  const k = dung();
  let e = null; try { await k.dr.tinhGia(); } catch (x) { e = x; } ok(e && /trống/.test(e.message), 'bản vẽ trống → báo');
  await k.dr.ve(keHoach(k.dr, 'S2Q')); // 1200 × 1400
  k.dr.dienThongTin({ so_luong: 2 });
  const ban = k.sm.serialize(), cp = k.mm.so_cp, q = JSON.stringify(k.draw.$route.query);
  const g = await k.dr.tinhGia();
  eq([g.tong, g.so_luong, g.dong.length, g.dong[0].ten, g.vat_tu.nhom], [Math.round(5.2 * 2 * 190000) + Math.round(1.68 * 2 * 210000) + Math.round(1.68 * 2 * 200000), 2, 3, 'KHUNG', 3], 'cộng đúng các dòng giá, theo số bộ');
  eq([k.sm.serialize() === ban, k.mm.so_cp, JSON.stringify(k.draw.$route.query), k.da_luu.length], [true, cp, q, 0], 'không đổi bản vẽ, không thêm bước hoàn tác, không lưu');
  eq(g.von.map((x) => [x.loai, x.ma, x.sl, x.gia_wc]), [['profile', 'XF-1', 8.32, 190000], ['glass', 'K638', 3.36, 210000], ['addon', 'SX', 3.36, 200000]], 'đọc số bóc tách giá vốn: số lượng × đơn giá');
  const k2 = dung({ loi_tinh_gia: true }); await k2.dr.ve(keHoach(k2.dr, 'V1'));
  const cp2 = k2.mm.so_cp, goc = k2.mm.checkPoint;
  e = null; try { await k2.dr.tinhGia(); } catch (x) { e = x; }
  ok(e && /lỗi công thức/.test(e.message) && k2.mm.so_cp === cp2 && k2.mm.checkPoint === goc, 'lỗi tính → báo, trả lại đúng checkPoint của WindoorCraft');
  const k3 = dung({ loi_nhuan: true }); await k3.dr.ve(keHoach(k3.dr, 'V1'));
  ok((await k3.dr.tinhGia()).chua_loi_nhuan, 'hệ có % lợi nhuận → đánh dấu để báo');
});

T('Góc nhìn: tìm vùng trống bên cạnh bảng tiện ích', async () => {
  const k = dung(); // khung vẽ 1600 × 900, bắt đầu ở (0, 40)
  const host = { ten: 'mnwd-host', contains: () => false };
  const bang = { left: 36, right: 472, top: 60, bottom: 860 };
  eq(k.dr.vungTrong([], host), null, 'bảng đóng → để nguyên cách canh của WindoorCraft');
  eq(k.dr.vungTrong([{ left: 36, right: 472, top: 60, bottom: 96 }], host), null, 'bảng thu gọn còn thanh tiêu đề → không tính là che');
  eq(k.dr.vungTrong([bang], host), { x: 482, y: 10, w: 1108, h: 880 }, 'không có bảng nào của WindoorCraft → lấy hết bên phải bảng');
  // thêm thanh công cụ trái (chỉ nửa trên) và bảng Đơn hàng bên phải của WindoorCraft
  k.lop_phu.push({ left: 0, right: 200, top: 40, bottom: 420, el: { ten: 'thanh trái' } });
  k.lop_phu.push({ left: 1370, right: 1600, top: 40, bottom: 940, el: { ten: 'bảng phải' } });
  const v = k.dr.vungTrong([bang], host);
  ok(v && v.x === 482 && v.x + v.w <= 1370 - 10 && v.x + v.w >= 1370 - 10 - 6, 'dừng trước bảng Đơn hàng', v);
  // bảng tiện ích nằm đè lên bảng phải: vẫn nhìn xuyên qua nó để thấy mép bảng phải
  k.lop_phu.unshift({ left: 1100, right: 1600, top: 60, bottom: 860, el: host });
  const v2 = k.dr.vungTrong([{ left: 1100, right: 1600, top: 60, bottom: 860 }], host);
  ok(v2 && v2.x >= 200 + 10 && v2.x <= 200 + 10 + 6 && Math.abs(v2.x + v2.w - (1100 - 10)) < 0.01, 'bảng ở bên phải → dùng khoảng bên trái, né thanh công cụ', v2);
  // bảng choán gần hết → không đủ chỗ thì thôi
  eq(k.dr.vungTrong([{ left: 150, right: 1300, top: 60, bottom: 860 }], host), null, 'không đủ chỗ → không đụng góc nhìn');
  eq(new M.Driver(MOCK.tao({ khong_co_stage: true }).win).vungTrong([bang], host), null, 'không có sân vẽ → bỏ qua');
});

T('Góc nhìn: đưa bản vẽ vào vùng trống — không đụng bản vẽ, không tạo bước hoàn tác', async () => {
  const k = dung();
  eq(k.dr.canhVaoVung({ x: 482, y: 10, w: 1108, h: 880 }), false, 'bản vẽ trống → không làm gì');
  await k.dr.ve(keHoach(k.dr, 'D2QT')); // 1400 × 2700 → hộp bao giả 2000 × 3300
  const g0 = Object.assign({}, k.goc_nhin), ban_ve = k.sm.serialize(), cp = k.mm.so_cp;
  eq([g0.w, g0.h], [1600, 900], 'vẽ xong WindoorCraft canh giữa cả khung vẽ');
  gan(g0.x + 700 * g0.s, 800, 'tâm cửa nằm giữa khung vẽ (dưới bảng)', 0.5);
  ok(k.dr.canhVaoVung({ x: 482, y: 10, w: 1108, h: 880 }), 'đưa vào vùng trống');
  const g = k.goc_nhin;
  eq([g.w, g.h], [1600, 900], 'trả cỡ sân vẽ về đúng cỡ khung');
  gan(g.s, 880 / 3300, 'thu phóng vừa chiều cao vùng trống', 0.0001);
  gan(g.x + 700 * g.s, 482 + 1108 / 2, 'tâm cửa nằm giữa vùng trống theo chiều ngang', 0.5);
  gan(g.y + 1350 * g.s, 10 + 880 / 2, 'và theo chiều dọc', 0.5);
  ok(g.x + (-300) * g.s >= 482 - 0.5 && g.x + 1700 * g.s <= 482 + 1108 + 0.5, 'cả hộp bao nằm gọn trong vùng trống');
  eq([k.sm.serialize() === ban_ve, k.mm.so_cp, g.ve >= 1], [true, cp, true], 'bản vẽ y nguyên, không thêm bước hoàn tác, có vẽ lại màn hình');
  eq(k.dr.canhVaoVung({ x: 0, y: 0, w: 80, h: 80 }), false, 'vùng quá nhỏ → bỏ qua');
});

T('Đi tiếp sau khi lưu: trang In, trang Tối ưu cắt, cảnh báo bản vẽ chưa lưu', async () => {
  const k = dung();
  eq([k.dr.dsBoCuaDon('1001'), k.dr.diaChiIn('1001'), k.dr.moIn('1001'), k.dr.chuaLuu()], [[], '', false, false], 'chưa có đơn → chưa có gì để in');
  await k.dr.ve(keHoach(k.dr, 'D2QT'));
  ok(k.dr.chuaLuu(), 'vẽ xong chưa lưu → có phần chưa lưu');
  const a = await k.dr.luu({ thong_tin: { ky_hieu: 'D1', so_luong: 1 } });
  ok(!k.dr.chuaLuu(), 'lưu xong → hết phần chưa lưu');
  await k.dr.ve(keHoach(k.dr, 'S2L'));
  const b = await k.dr.luu({ thong_tin: { ky_hieu: 'S1', so_luong: 3 } });
  eq(k.dr.dsBoCuaDon(a.ma_don), [{ id: Number(a.ma_bo), ky_hieu: 'D1', so_luong: 1 }, { id: Number(b.ma_bo), ky_hieu: 'S1', so_luong: 3 }], 'đọc các bộ của đơn từ dải Bản vẽ');
  eq(k.dr.dsBoCuaDon('999'), [], 'đơn khác đơn đang mở → không đoán');
  eq(k.dr.diaChiIn(a.ma_don), 'https://ln.windoorcraft.com/printer?contract_id=' + a.ma_don + '&order_id=' + a.ma_bo + ',' + b.ma_bo + '&company_id=31&lang=vi-VN&son_account_type=2&user_id=7001', 'địa chỉ trang In giống nút In của WindoorCraft');
  ok(k.dr.moIn(a.ma_don) && k.da_mo.length === 1 && k.da_mo[0][1] === '_blank', 'mở ở thẻ mới');
  ok(k.dr.moToiUu(a.ma_don), 'mở trang tối ưu');
  eq([k.router.nk[k.router.nk.length - 1], k.draw.$route.query], ['orders.cutOptimizer', { contract_ids: a.ma_don, count: 4 }], 'đúng trang, kèm mã đơn và tổng số bộ');
  const k2 = dung({ khong_nguoi_dung: true });
  await k2.dr.ve(keHoach(k2.dr, 'V1')); const c = await k2.dr.luu();
  eq([k2.dr.diaChiIn(c.ma_don), k2.dr.moIn(c.ma_don), k2.da_mo.length], ['', false, 0], 'thiếu thông tin tài khoản → không dựng địa chỉ bừa');
});

chay('điều khiển');
