const M = require('../src/mnwd-core.js');
require('../src/mnwd-preview.js');
const { T, eq, ok, gan, co, chay } = require('./khung-thu.js');
const XF55 = { khung: 31.2, do: 30.4 };

T('Đọc số gõ kiểu Việt', () => {
  eq([M.so('1600'), M.so('1.600'), M.so('1600,5'), M.so(' 2 700 '), M.so('12.000'), M.so('805.5'), M.so('1.600,25')], [1600, 1600, 1600.5, 2700, 12000, 805.5, 1600.25], 'các kiểu gõ');
  eq([M.so('', 7), M.so(null, 7), M.so('abc', 7), M.so(undefined, 7)], [7, 7, 7, 7], 'rỗng / sai → mặc định');
  ok(isNaN(M.so('abc')), 'sai, không có mặc định → NaN');
  eq([M.ghi(1600), M.ghi(805.5), M.ghi(805.33333)], ['1600', '805,5', '805,3'], 'in số');
});

T('Chuẩn hoá cấu hình', () => {
  const m = M.chuanHoa({ rong: '1.400', cao: '2700', loai: 'cua_di', so_luong: '3', chinh: { kieu: 'quay2' }, tren: { cao: '500' }, mo: 'xyz', he_nhom: '151076' });
  eq([m.rong, m.cao, m.so_luong, m.chinh.kieu, m.tren.cao, m.tren.kieu, m.mo, m.he_nhom, m.khung, m.do_suot], [1400, 2700, 3, 'quay2', 500, 'fix', 'mac_dinh', 151076, 'tu_dong', 'ngang'], 'trường chính');
  eq([m.khe_rong, m.khe_cao, m.kieu_so], [10, 5, 'phu_bi'], 'khe mặc định cửa đi 10/5, số nhập là phủ bì');
  const r = M.chuanHoa({});
  eq([r.loai, r.rong, r.cao, r.chinh.kieu, r.chinh.so, r.so_luong], ['cua_so', 0, 0, 'fix', 1, 1], 'rỗng → mặc định an toàn');
  eq(M.chuanHoa({ chinh: { kieu: 'la' }, trai: { kieu: 'lua' }, tren: { kieu: 'quay' } }).trai.kieu, 'fix', 'kiểu lạ ở vách → fix');
  eq(M.chuanHoa({ he_nhom: '' }).he_nhom, null, 'hệ nhôm rỗng → null (giữ hệ đang chọn)');
});

T('Mọi mẫu dựng được, không lỗi', () => {
  for (const x of M.MAU) {
    const m = M.apMau({}, x);
    const k = M.tinh(m, XF55, { chia_deu: 'tim' });
    eq(k.loi, [], x.ma + ' không lỗi');
    ok(k.o.length >= 1 && k.rong === x.rong && k.cao === x.cao, x.ma + ' có ô, đúng kích thước');
    ok(k.o.length === k.do.length + 1, x.ma + ' số ô = số đố + 1', [k.o.length, k.do.length]);
    ok(M.veSvg(k).indexOf('<svg') === 0, x.ma + ' vẽ xem trước được');
  }
  const ma = M.MAU.map((x) => x.ma);
  eq(new Set(ma).size, ma.length, 'mã mẫu không trùng');
});

T('Cửa đi 2 cánh + ô thoáng: bố cục', () => {
  const m = M.apMau({}, M.timMau('d2qt'));
  m.rong = 1600; m.cao = 2700;
  const k = M.tinh(m, { khung: 47.2, do: 37.4 }, {});
  eq([k.khung, k.la_cua_di, k.do.length], ['3_canh', true, 1], 'khung 3 cạnh, 1 đố');
  eq([k.do[0].huong, k.do[0].tim, k.do[0].tam], ['ngang', 500, { x: 800, y: 500 }], 'đố ngang tại 500, điểm đặt giữa ô');
  const tren = k.o[0], chinh = k.o[1];
  eq([tren.vung, tren.kieu, chinh.vung, chinh.kieu, chinh.cua_di, tren.cua_di], ['tren', 'fix', 'chinh', 'quay2', true, false], 'ô trên fix, phần chính cánh đôi cửa đi');
  gan(chinh.ly1, 2700, 'khung 3 cạnh: ô chính chạm đáy'); gan(chinh.ly0, 500 + 18.7, 'ô chính bắt đầu sau nửa đố');
  gan(chinh.tam.y, (518.7 + 2700) / 2, 'tâm ô chính');
  eq(k.thong_ke, { so_o: 2, so_canh: 2, theo_kieu: { fix: 1, quay2: 1 }, do_ngang: 1, do_dung: 0 }, 'thống kê');
});

T('Thứ tự đố: ngang suốt / đứng suốt', () => {
  const m = M.apMau({}, M.timMau('D2QF'));
  let k = M.tinh(m, XF55, {});
  eq(k.do.map((d) => d.huong + d.tim), ['ngang500', 'dung500', 'dung1900'], 'ngang suốt: đố ngang trước');
  eq(k.o.map((o) => o.vung), ['tren', 'trai', 'chinh', 'phai'], '4 ô');
  gan(k.o[0].rong, 2400 - 62.4, 'ô trên rộng suốt');
  gan(k.do[1].tam.y, (515.2 + 2700) / 2, 'đố đứng đặt trong ô dưới');
  m.do_suot = 'dung';
  k = M.tinh(m, XF55, {});
  eq(k.do.map((d) => d.huong + d.tim), ['dung500', 'dung1900', 'ngang500'], 'đứng suốt: đố đứng trước');
  gan(k.o.filter((o) => o.vung === 'trai')[0].cao, 2700 - 31.2, 'vách trái cao suốt (khung 3 cạnh, đáy hở)');
  gan(k.o.filter((o) => o.vung === 'tren')[0].rong, 1400 - 30.4, 'ô trên chỉ rộng bằng phần giữa');
  gan(k.do[2].tam.x, 1200, 'đố ngang đặt trong cột giữa');
});

T('Chia đều: theo tim và theo lọt lòng', () => {
  const m = M.chuanHoa({ rong: 2400, cao: 1400, chinh: { kieu: 'fix', so: 3 } });
  let k = M.tinh(m, XF55, { chia_deu: 'tim' });
  eq(k.do.map((d) => d.tim), [800, 1600], 'tim đều');
  k = M.tinh(m, XF55, { chia_deu: 'lot_long', lam_tron: 0 });
  const r = k.o.map((o) => Math.round(o.rong * 1000) / 1000);
  ok(Math.abs(r[0] - r[1]) < 0.01 && Math.abs(r[1] - r[2]) < 0.01, 'lọt lòng 3 ô bằng nhau (sai số < 0,01 mm)', r);
  gan(r[0], (2400 - 62.4 - 60.8) / 3, 'đúng công thức');
  k = M.tinh(m, XF55, { chia_deu: 'lot_long', lam_tron: 1 });
  eq(k.do.map((d) => d.tim), [805, 1595], 'làm tròn 1 mm');
  eq(M.tinh(M.chuanHoa({ rong: 1500, cao: 1200, chinh: { kieu: 'fix', so: 2 } }), XF55, { chia_deu: 'lot_long' }).do[0].tim, 750, '2 ô: hai cách trùng nhau');
});

T('Ô trên chia theo đố dưới (so = 0)', () => {
  const m = M.chuanHoa({ rong: 3000, cao: 2700, loai: 'cua_di', chinh: { kieu: 'quay2' }, tren: { cao: 500, so: 0 }, trai: { rong: 600 }, phai: { rong: 700 } });
  const k = M.tinh(m, XF55, {});
  eq(k.do.map((d) => d.huong + d.tim), ['ngang500', 'dung600', 'dung2300', 'dung600', 'dung2300'], 'đố ô trên thẳng hàng đố dưới');
  eq(k.o.filter((o) => o.vung === 'tren').length, 3, 'ô trên 3 ô');
  ok(k.do[3].tam.y < 500 && k.do[1].tam.y > 500, 'điểm đặt nằm đúng băng');
});

T('Hướng bản lề', () => {
  eq([0, 1, 2, 3].map((i) => M.huongO(i, 4, 'doi_xung')), ['trai', 'phai', 'trai', 'phai'], 'đối xứng: từng cặp');
  eq([M.huongO(0, 1, 'doi_xung'), M.huongO(2, 3, 'phai'), M.huongO(1, 2, 'trai')], ['trai', 'phai', 'trai'], '1 ô / ép một phía');
  const k = M.tinh(M.apMau({}, M.timMau('SQFQ')), XF55, {});
  eq(k.o.map((o) => o.vung + ':' + o.kieu + ':' + (o.huong || '')), ['trai:quay:trai', 'chinh:fix:', 'phai:quay:phai'], 'vách bên mở quay: lề về phía khung');
  eq(M.tinh(M.apMau({}, M.timMau('S2H')), XF55, {}).o.map((o) => o.huong), ['tren', 'tren'], 'hất: lề trên');
});

T('Ô chờ → phủ bì khung', () => {
  const m = M.chuanHoa({ rong: 1610, cao: 2705, loai: 'cua_di', kieu_so: 'o_cho', chinh: { kieu: 'quay2' } });
  const k = M.tinh(m, XF55, {});
  eq([k.rong, k.cao], [1600, 2700], 'cửa đi trừ 10 / 5');
  const s = M.tinh(M.chuanHoa({ rong: 1210, cao: 1410, kieu_so: 'o_cho', khe_rong: 20, khe_cao: 15 }), XF55, {});
  eq([s.rong, s.cao], [1190, 1395], 'khe riêng của dòng');
});

T('Khung tự động / ép kiểu', () => {
  const kh = (ma, them) => M.tinh(Object.assign(M.apMau({}, M.timMau(ma)), them || {}), XF55, {}).khung;
  eq([kh('D2Q'), kh('D4Q'), kh('D2L'), kh('DX4'), kh('S2Q'), kh('V1')], ['3_canh', '3_canh', '4_canh', '4_canh', '4_canh', '4_canh'], 'tự động');
  eq([kh('D2Q', { khung: '4_canh' }), kh('S2Q', { khung: '3_canh' })], ['4_canh', '3_canh'], 'ép');
});

T('Lỗi nhập', () => {
  const l = (v) => M.tinh(M.chuanHoa(v), XF55, {}).loi;
  ok(co(l({}), /Chưa nhập chiều rộng/), 'thiếu rộng');
  ok(co(l({ rong: 1000 }), /Chưa nhập chiều cao/), 'thiếu cao');
  ok(co(l({ rong: 1000, cao: 2000, tren: { cao: 1990 } }), /không nằm lọt/), 'ô trên quá cao');
  ok(co(l({ rong: 1000, cao: 2000, tren: { cao: 900 }, duoi: { cao: 900 } }), /không còn chỗ cho phần chính/), 'trên + dưới chiếm hết');
  ok(co(l({ rong: 1000, cao: 2000, trai: { rong: 500 }, phai: { rong: 450 } }), /không còn chỗ cho phần chính/), 'trái + phải chiếm hết');
  ok(co(l({ rong: 300, cao: 1000, chinh: { kieu: 'fix', so: 6 } }), /không nằm lọt/), 'chia quá nhiều ô');
  ok(co(l({ rong: 150, cao: 100, kieu_so: 'o_cho' }), /quá nhỏ/), 'trừ khe còn quá nhỏ');
  eq(M.tinh(M.chuanHoa({ rong: 1000 }), XF55, {}).o, [], 'có lỗi → không có ô');
});

T('Cảnh báo kích thước', () => {
  const c = (v, gh) => M.tinh(M.chuanHoa(v), XF55, gh ? { gioi_han: gh } : {}).canh_bao;
  ok(co(c({ rong: 1000, cao: 1400, chinh: { kieu: 'quay' } }), /Cánh mở quay phần chính rộng khoảng 938 > 800/), 'cánh sổ quá rộng');
  ok(co(c({ rong: 2400, cao: 2200, loai: 'cua_di', chinh: { kieu: 'quay2' } }), /Cánh cửa đi phần chính rộng khoảng 1169 > 1000/), 'cánh cửa đi quá rộng');
  eq(c({ rong: 1400, cao: 2200, loai: 'cua_di', chinh: { kieu: 'quay2' } }), [], 'cửa đi 1400×2200 không cảnh báo');
  ok(co(c({ rong: 3000, cao: 2400 }), /Kính cố định phần chính khoảng 6,87 m²/), 'kính fix quá lớn');
  ok(co(c({ rong: 6200, cao: 2400, chinh: { kieu: 'fix', so: 4 } }), /vượt chiều dài cây nhôm 5800/), 'khung dài hơn cây nhôm');
  ok(co(c({ rong: 900, cao: 2200, chinh: { kieu: 'quay' } }), /nếu là cửa đi thì đổi Loại/), 'cửa sổ cao như cửa đi');
  ok(co(c({ rong: 2400, cao: 2700, loai: 'cua_di', chinh: { kieu: 'quay2' }, trai: { rong: 500 }, phai: { rong: 500 } }), /vách bên cũng không có thanh/), 'cửa đi 3 cạnh có vách bên');
  ok(co(c({ rong: 1400, cao: 1200, chinh: { kieu: 'lua', canh: 2, so: 3 } }), /chỉ vẽ 1 ô/), 'lùa bỏ qua số ô');
  ok(!co(c({ rong: 1000, cao: 1400, chinh: { kieu: 'quay' } }, { quay_so: { rong_max: 1000 } }), /rộng khoảng/), 'đổi giới hạn → hết cảnh báo');
  ok(co(c({ rong: 600, cao: 1000, chinh: { kieu: 'quay2' } }), /< 350 — khó lắp phụ kiện/), 'cánh quá hẹp');
});

T('Mô tả bằng chữ', () => {
  eq(M.moTa(M.apMau({}, M.timMau('D2QF'))), 'Cửa đi mở quay 2 cánh + ô thoáng 500 + vách trái 500 + vách phải 500', 'D2QF');
  eq(M.moTa(M.apMau({}, M.timMau('S4L'))), 'Cửa sổ lùa 4 cánh', 'S4L');
  eq(M.moTa(M.apMau({}, M.timMau('DX6'))), 'Cửa đi xếp trượt 3+3', 'DX6');
});

T('Áp mẫu giữ thông tin đơn', () => {
  const m = M.apMau({ ky_hieu: 'D1', so_luong: 2, vi_tri: 'P.khách', rong: 1550, cao: 2650, he_nhom: 151076 }, M.timMau('D2QT'), null, true);
  eq([m.ky_hieu, m.so_luong, m.vi_tri, m.rong, m.cao, m.he_nhom, m.ma_mau, m.loai, m.tren.cao], ['D1', 2, 'P.khách', 1550, 2650, 151076, 'D2QT', 'cua_di', 500], 'giữ ký hiệu, kích thước');
  const n = M.apMau({ rong: 1550, cao: 2650 }, M.timMau('S2L'));
  eq([n.rong, n.cao, n.tren.cao], [1400, 1200, 0], 'không giữ kích thước → lấy của mẫu, bỏ ô trên cũ');
  eq([M.apMau({ kinh: ' KINH  8.38TS ' }, M.timMau('S2L')).kinh, M.chuanHoa({}).kinh, M.tinh(M.apMau({ kinh: 'KINH 8.38TS' }, M.timMau('V1')), {}, {}).kinh], ['KINH 8.38TS', '', 'KINH 8.38TS'], 'loại kính đi theo cấu hình sang kế hoạch vẽ; đổi mẫu vẫn giữ');
});

T('Dán bảng từ Excel', () => {
  const r = M.docBang('Ký hiệu\tMẫu\tRộng\tCao\tSL\tÔ thoáng\tVị trí\tGhi chú\nD1\tD2QT\t1600\t2700\t1\t550\tPhòng khách\tmở trong\nS1\ts2l\t1.400\t1200\t4\t\tPhòng ngủ\t\nX\tD2Q\t\t2200\t1\n\nS2\tcửa sổ 2 cánh mở quay\t1200\t1400\t2');
  eq(r.dong.length, 3, '3 dòng hợp lệ');
  eq(r.bo_qua.map((b) => b.so_dong + ':' + b.ly_do), ['4:thiếu rộng hoặc cao'], '1 dòng bỏ qua, ghi lý do');
  eq([r.dong[0].ky_hieu, r.dong[0].ma_mau, r.dong[0].rong, r.dong[0].cao, r.dong[0].tren_cao, r.dong[0].vi_tri, r.dong[0].ghi_chu], ['D1', 'D2QT', 1600, 2700, 550, 'Phòng khách', 'mở trong'], 'dòng 1');
  eq([r.dong[1].ma_mau, r.dong[1].rong, r.dong[1].so_luong], ['S2L', 1400, 4], 'mã thường → hoa, 1.400 → 1400');
  eq([r.dong[2].ma_mau, !!r.dong[2].can_chon_mau], ['S2Q', false], 'đoán mẫu từ chữ mô tả');
  const k = M.docBang('D1;D2Q;1400;2200;2\nD2;???;900;2200;1');
  eq([k.dong.length, k.dong[0].so_luong, k.dong[1].can_chon_mau, k.dong[1].mau_goc], [2, 2, true, '???'], 'không tiêu đề, phân cách ; — mẫu lạ thì đánh dấu');
  const c = M.docBang('Rộng\tCao\tKý hiệu\n900\t2200\tD9');
  eq([c.dong[0].ky_hieu, c.dong[0].rong, c.dong[0].can_chon_mau], ['D9', 900, true], 'cột đảo thứ tự, thiếu cột mẫu');
  eq(M.docBang('').dong, [], 'rỗng');
  // cột Kính: theo tiêu đề, hoặc cột thứ 9 khi không có tiêu đề
  const g = M.docBang('Ký hiệu\tMẫu\tRộng\tCao\tKính\nD1\tD2Q\t1400\t2200\t kinh  8.38ts \nD2\tD2Q\t1400\t2200\t');
  eq([g.dong[0].kinh, g.dong[1].kinh], ['kinh 8.38ts', ''], 'đọc cột Kính, gọn khoảng trắng, để trống = mặc định của hệ');
  eq(M.docBang('S1;S2L;1400;1200;2;;P.ngủ;;KINH HOP 19MM').dong[0].kinh, 'KINH HOP 19MM', 'không tiêu đề → cột thứ 9');
});

T('Đoán mẫu từ chữ', () => {
  const d = (s) => { const m = M.doanMau(s); return m ? m.ma : null; };
  eq([d('Cửa đi 2 cánh mở quay'), d('cửa đi 4 cánh mở quay có ô thoáng'), d('cửa sổ lùa 4 cánh'), d('cua di lua 3 canh'), d('cửa sổ mở hất'), d('xếp trượt 6 cánh'), d('vách kính cố định'), d('cái gì đó')], ['D2Q', 'D4QT', 'S4L', 'D3L', 'S1H', 'DX6', 'V1', null], 'các câu thường gặp');
  eq(d('Cửa sổ lùa 2 cánh'), 'S2L', 'trùng tên mẫu');
});

T('Xuất CSV', () => {
  const s = M.xuatCsv([{ cau_hinh: M.chuanHoa({ ky_hieu: 'D1', ma_mau: 'D2QT', ten: 'Cửa đi; 2 cánh', rong: 1600, cao: 2700, so_luong: 2, tren: { cao: 500 }, ghi_chu: 'a "b"', kinh: 'KINH 8.38TS' }), trang_thai: 'da_luu' }]);
  ok(s.charCodeAt(0) === 0xfeff, 'có BOM');
  eq(s.split('\r\n')[0].slice(1), 'Ký hiệu;Mẫu;Tên mẫu;Rộng;Cao;SL;Ô thoáng;Vị trí;Ghi chú;Kính;Trạng thái;Diện tích (m²);Thành tiền;Giá vốn;Lãi', 'tiêu đề có cột Kính và giá');
  eq(s.split('\r\n')[1], 'D1;D2QT;"Cửa đi; 2 cánh";1600;2700;2;500;;"a ""b""";KINH 8.38TS;Đã lưu;;;;', 'dòng dữ liệu, thoát ký tự (chưa có giá → để trống)');
  const s2 = M.xuatCsv([{ cau_hinh: M.chuanHoa({ ky_hieu: 'S1', rong: 1400, cao: 1200 }), trang_thai: 'cho', gia: { tong: 6431800, dien_tich: 3.36 } }]);
  ok(/;3,36;6431800;;\r\n$/.test(s2), 'có giá → diện tích, thành tiền', s2);
});

T('Gộp cài đặt cũ với mặc định', () => {
  const c = M.gopCaiDat({ khe: { cua_di: { cao: 0 } }, lam_tron: 0, gioi_han: { quay_so: { rong_max: 900 } }, he_nhom_theo_mau: { D2Q: 151076 } });
  eq([c.khe.cua_di.cao, c.khe.cua_di.rong, c.khe.cua_so.rong, c.lam_tron, c.gioi_han.quay_so.rong_max, c.gioi_han.quay_so.cao_max, c.gioi_han.lua.rong_max, c.he_nhom_theo_mau.D2Q, c.chia_deu], [0, 10, 10, 0, 900, 1600, 1500, 151076, 'theo_pm'], 'giữ cái đã đổi, bù cái thiếu');
  eq(M.gopCaiDat(null).lam_tron, 1, 'null → mặc định');
  ok(M.gopCaiDat({}).gioi_han !== M.GIOI_HAN, 'là bản sao, không dùng chung');
});

T('Xem trước SVG', () => {
  const k = M.tinh(M.apMau({}, M.timMau('D2QF')), { khung: 47.2, do: 37.4 }, {});
  const s = M.veSvg(k, { rong: 360 });
  ok(/>2400</.test(s) && />2700</.test(s) && />500</.test(s) && />1400</.test(s) && />2200</.test(s), 'ghi đủ kích thước tổng và chuỗi');
  ok(s.indexOf('NaN') < 0 && s.indexOf('undefined') < 0, 'không có NaN / undefined');
  const nho = M.veSvg(k, { rong: 64, cao_max: 54, co_kt: false });
  ok(nho.indexOf('<text') < 0, 'hình nhỏ không có chữ');
  ok(/Nhập rộng × cao/.test(M.veSvg(M.tinh(M.chuanHoa({}), {}, {}))), 'chưa nhập → lời nhắc');
  const t = M.veSvg(M.tinh(Object.assign(M.apMau({}, M.timMau('S1Q')), { mo: 'trong' }), XF55, {}));
  ok(t.indexOf('stroke-dasharray="4 3"') < 0, 'mở trong → nét liền');
});

T('Báo giá', () => {
  eq([M.tien(9940300), M.tien(0), M.tien(1234.6), M.tien(-5000)], ['9.940.300', '0', '1.235', '-5.000'], 'định dạng tiền');
  const ds = [
    { cau_hinh: M.apMau({ ky_hieu: 'D1', so_luong: 1, vi_tri: 'P.khách' }, M.timMau('D2QT')), gia: { tong: 9940300, dien_tich: 4.32, so_luong: 1, he_nhom: 'XINGFA-55 Cửa đi', kinh: 'KINH 6.38TS' } },
    { cau_hinh: M.apMau({ ky_hieu: 'S1', so_luong: 2 }, M.timMau('S2L')), gia: { tong: 6431800, dien_tich: 3.36, so_luong: 2 } },
    { cau_hinh: M.apMau({ ky_hieu: 'V1' }, M.timMau('V1')) },
  ];
  const b = M.bangBaoGia(ds, { vat: 8 });
  eq([b.dong.length, b.tong, b.thieu, b.dien_tich, b.dong[0].don_gia_m2, b.vat, b.tong_vat], [2, 16372100, ['V1'], 7.68, 2300995, 1309768, 17681868], 'cộng, đơn giá/m², VAT, dòng chưa có giá');
  const html = M.htmlBaoGia(ds, { cong_ty: 'MỘT NHÀ <test>', vat: 0 }, { khach: 'Anh A', cong_trinh: 'Nhà phố' });
  ok(/BÁO GIÁ CỬA NHÔM KÍNH/.test(html) && /MỘT NHÀ &lt;test&gt;/.test(html) && /Anh A/.test(html) && /16\.372\.100/.test(html) && /chưa gồm VAT/.test(html) && /Chưa có giá: V1/.test(html), 'trang báo giá đủ thông tin, thoát ký tự');
  ok((html.match(/<svg/g) || []).length === 2, 'mỗi dòng có hình cửa');
});

T('Giá vốn và lãi theo bảng giá xưởng', () => {
  const gia = { tong: 6399600, von: [{ loai: 'profile', ma: 'XF-C3209', ten: 'KHUNG', sl: 4.812, gia_wc: 190000 }, { loai: 'profile', ma: 'XF-C3202', ten: 'CANH', sl: 8.0381, gia_wc: 190000 }, { loai: 'glass', ma: 'KINH 6.38TS', ten: 'KINH', sl: 1.3827, gia_wc: 210000 }, { loai: 'addon', ma: 'SX-LD', ten: 'SX', sl: 2.2, gia_wc: 200000 }] };
  const a = M.laiBo(gia, {});
  eq([a.von, a.lai, a.kg_nhom], [Math.round(12.8501 * 190000 + 1.3827 * 210000 + 2.2 * 200000), 6399600 - Math.round(12.8501 * 190000 + 1.3827 * 210000 + 2.2 * 200000), 12.85], 'chưa đặt giá → theo giá vốn WindoorCraft');
  const b = M.laiBo(gia, { nhom_kg: 120000, theo_ma: { 'XF-C3202': 125000, 'KINH 6.38TS': 180000 } });
  eq(b.von, Math.round(4.812 * 120000 + 8.0381 * 125000 + 1.3827 * 180000 + 2.2 * 200000), 'nhôm chung + giá riêng theo mã ghi đè');
  ok(b.lai > 0 && b.pt > 30, 'lãi dương, % theo giá bán', b);
  eq(M.laiBo({ tong: 1 }, {}), null, 'chưa có số bóc tách → null');
  const gv = M.ghiMaDaGap({}, gia.von);
  eq(Object.keys(gv.da_gap), ['XF-C3209', 'XF-C3202', 'KINH 6.38TS', 'SX-LD'], 'nhớ mã đã gặp');
  ok(/;6399600;\d+;-?\d+\r\n$/.test(M.xuatCsv([{ cau_hinh: M.chuanHoa({ ky_hieu: 'X', rong: 1, cao: 1 }), gia: Object.assign({ dien_tich: 2.16 }, gia) }], { nhom_kg: 120000 })), 'CSV có giá vốn, lãi');
});

chay('lõi');
