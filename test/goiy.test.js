/* Gợi ý hệ nhôm theo mẫu — thử với đúng danh mục 32 hệ của tài khoản xưởng (chụp ngày 08/10/2026). */
const M = require('../src/mnwd-core.js');
require('../src/mnwd-ui.js');
const { T, eq, ok, chay } = require('./khung-thu.js');

const HE = [
  [155849, 'XINGFA 55', 'XINGFA-55-Vách kính cố định (kết hợp khung đảo chiều-Cánh mở ra ngoài)'],
  [151076, 'XINGFA 55', 'XINGFA-55 Cửa đi mở quay - sử dụng đố chân cánh to 3304'],
  [152083, 'XINGFA 55', 'XINGFA-55Cửa đi mở quay - sử dụng 4 cánh giống nhau. cắt góc 45º'],
  [157051, 'XINGFA 55', 'XINGFA-55Cửa đi mở quay - sử dụng 4 cánh giống nhau. cắt góc 45º(dùng cánh lớn 145)'],
  [152612, 'XINGFA 55', 'XINGFA-55-CỬA SỔ LÙA 55(LÙA 3 CÂY)'],
  [72424, 'XINGFA 55', 'XF- CUA DI+ CS (K.DAO CHIEU)'],
  [155366, 'XINGFA 55', 'XF-CUA DI + CS (KB-CS)'],
  [156598, 'XINGFA 55', 'XINGFA-55Cửa đi mở quay+Cửa sổ mở hất'],
  [71881, 'XF-CỬA LÙA 93', 'XINGFA-93- Cửa lùa ray bằng,cánh đứng rộng 62'],
  [71883, 'XF-CỬA LÙA 93', 'XINGFA-93- Cửa lùa ray lệch, cánh đứng rộng 62'],
  [71884, 'XF-CỬA LÙA 93', 'XINGFA-93- Cửa lùa 3 ray, cánh đứng rộng 62'],
  [71885, 'XF-CỬA LÙA 93', 'XINGFA-93- Cửa lùa ray bằng,cánh đứng rộng 85'],
  [71886, 'XF-CỬA LÙA 93', 'XINGFA-93- Cửa lùa ray lệch, cánh đứng rộng 85'],
  [71887, 'XF-CỬA LÙA 93', 'XINGFA-93- Cửa lùa 3 ray, cánh đứng rộng 85'],
  [71888, 'XEP TRUOT 63', 'XINGFA-63-Hệ xếp trượt ( Đang cập nhật)'],
  [156246, 'XF CLASS A65', 'CLASS A65 - CỬA ĐI MỞ QUAY'],
  [151314, 'XF CLASS A65', 'CLASS-A65 - VÁCH KÍNH RỘNG 54.8- KẾT HỢP KHUNG ĐẢO CHIỀU'],
  [152427, 'XF CLASS A65', 'CLASS-A65 - CỬA SỔ MỞ'],
  [72452, 'XF CLASS A65', 'HC - CLASS A65 - CỬA ĐI MỞ QUAY'],
  [72049, 'XF-65-MẶT DỰNG', 'XF-65-Lộ Đố'],
  [72470, 'XF CLASS A72', 'XF-CLASS-A72 CỬA SỔ LÙA 2-4 CÁNH KHUNG ĐƠN'],
  [156249, 'XF CLASS A72', 'HC - XF-CLASS-A72 CỬA SỔ LÙA 2-4 CÁNH KHUNG ĐƠN'],
  [152475, 'XF CLASS A72', 'XF-CLASS-A72 CỬA SỔ LÙA 3 CÁNH NỐI KHUNG'],
  [156247, 'XF-CLASS A115', 'CLASS-A115 - CỬA LÙA 2 CÁNH- 4 CÁNH KHUNG ĐƠN'],
  [152432, 'XF-CLASS A115', 'HC - CLASS-A115 - CỬA LÙA 2 CÁNH- 4 CÁNH KHUNG ĐƠN'],
  [152443, 'XF-CLASS A115', 'CLASS-A115 - CỬA LÙA 3 CÁNH - NỐI KHUNG BAO'],
  [153294, 'CLASS A55', 'Vách kính cố định CLASS A55 (kết hợp khung đảo chiều-Cánh mở ra ngoài - Độ dày 1.4mm)'],
  [155746, 'CLASS A55', 'Cửa sổ mở quay hệ CLASS A55 ( Độ dày 1.4mm)(copy)'],
  [153295, 'CLASS A55', 'Cửa sổ mở quay hệ CLASS A55 ( Độ dày 1.4mm)'],
  [153296, 'CLASS A55', 'Cửa đi mở quay hệ CLASS A55 ( Độ dày 1.4mm)'],
  [153322, 'CLASS A55', 'Vách kính cố định CLASS A55 (kết hợp khung đảo chiều-Cánh mở ra ngoài - Độ dày 2.0mm)'],
  [153323, 'CLASS A55', 'Cửa sổ mở quay hệ CLASS A55 ( Độ dày 2.0mm)'],
].map((x) => ({ id: x[0], nhom: x[1], ten: x[2] }));
const gy = (ma, ds) => M.goiYHeNhom(M.timMau(ma), ds || HE);

T('Danh mục của xưởng: cả đơn cùng dòng XINGFA 55, lùa đi 93, xếp trượt 63', () => {
  eq(['V1', 'V2', 'V3', 'V2T'].map((m) => gy(m)), [155849, 155849, 155849, 155849], 'vách kính → hệ vách kính cố định');
  eq(['D1Q', 'D1QT', 'D2Q', 'D2QT', 'D2QF', 'D4Q', 'D4QT'].map((m) => gy(m)), [151076, 151076, 151076, 151076, 151076, 151076, 151076], 'cửa đi mở quay → hệ cửa đi (không lấy hệ "cửa đi + cửa sổ")');
  eq(['S1Q', 'S2Q', 'S2QT', 'S4Q', 'S1H', 'S2H', 'S1HD', 'SQFQ'].map((m) => gy(m)), [155849, 155849, 155849, 155849, 155849, 155849, 155849, 155849], 'cửa sổ mở quay / hất → hệ vách kính có cánh mở cùng dòng, không lấy hệ khung cửa đi');
  eq(['S2L', 'S3L', 'S4L', 'S2LT'].map((m) => gy(m)), [152612, 152612, 152612, 152612], 'cửa sổ lùa → lùa 55');
  eq(['D2L', 'D3L', 'D4L', 'D4LT'].map((m) => gy(m)), [71881, 71881, 71881, 71881], 'cửa đi lùa → lùa 93 (hệ đầu tiên của nhóm)');
  eq(['DX4', 'DX6'].map((m) => gy(m)), [71888, 71888], 'xếp trượt → hệ 63');
  ok(M.MAU.every((m) => gy(m.ma) !== null), 'mẫu nào cũng có gợi ý');
});

T('Xưởng dùng dòng khác làm chính: gợi ý đi theo nhóm đứng đầu danh mục', () => {
  const a55 = HE.filter((p) => p.nhom === 'CLASS A55').concat(HE.filter((p) => p.nhom !== 'CLASS A55'));
  eq([gy('V1', a55), gy('D2QT', a55), gy('S2Q', a55), gy('S1H', a55)], [153294, 153296, 155746, 155746], 'CLASS A55 đứng đầu → vách, cửa đi, cửa sổ đều lấy A55; cửa sổ có hệ riêng thì dùng hệ riêng');
  eq([gy('S2L', a55), gy('DX4', a55)], [152612, 71888], 'nhóm chính không có lùa / xếp → tìm ở nhóm khác');
});

T('Không đoán bừa', () => {
  eq([gy('D2QT', []), gy('S2L', [{ id: 1, nhom: 'A', ten: 'Mặt dựng' }]), gy('DX4', HE.filter((p) => !/xếp trượt/i.test(p.ten)))], [null, null, null], 'không có hệ hợp tên → để trống cho người dùng chọn');
});

chay('gợi ý hệ nhôm');
