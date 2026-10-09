/* Hình thái tự chia ô (cây) */
const M = require('../src/mnwd-core.js');
const { T, eq, ok, gan, chay } = require('./khung-thu.js');
const BD = { khung: 47.2, do: 37.4 };
// đố so như một tập hợp (2 đố ở 2 ô khác nhau vẽ trước sau đều ra cùng một hình); hướng bỏ qua với ô kính cố định
const gon = (kh) => ({ do: kh.do.map((d) => [d.huong, +d.tim.toFixed(2), +d.tam.x.toFixed(2), +d.tam.y.toFixed(2)].join(' ')).sort(), o: kh.o.map((o) => [o.kieu, +o.x0.toFixed(2), +o.y0.toFixed(2), +o.x1.toFixed(2), +o.y1.toFixed(2), o.kieu === 'fix' ? '' : o.huong || '', o.canh || 0, o.cua_di]), khung: kh.khung, loi: kh.loi });

T('Mọi mẫu: đổi sang tự chia ra đúng y đố và ô như cách theo vùng', () => {
  ['tim', 'lot_long'].forEach((deu) => {
    M.MAU.forEach((x) => {
      const m = M.apMau({}, x);
      const a = M.tinh(m, BD, { chia_deu: deu });
      const m2 = Object.assign({}, m, { tu_do: M.sangCay(m) });
      const b = M.tinh(M.chuanHoa(m2), BD, { chia_deu: deu });
      eq(gon(b), gon(a), x.ma + ' (' + deu + ')');
    });
  });
});

T('Chia, gộp, đổi kiểu một ô', () => {
  let c = M.chuanCay({ kieu: 'fix' });
  c = M.chiaO(c, [], 'dung', 3);
  eq([c.chia, c.phan.length, c.phan[1].n.kieu], ['dung', 3, 'fix'], 'chia đứng 3');
  c = M.chiaO(c, [1], 'ngang', 2);
  c = M.thayNut(c, [1, 1], { kieu: 'quay2' });
  c = M.thayNut(c, [0], { kieu: 'quay', huong: 'phai' });
  eq(M.laCay(c).map((x) => [x.duong.join('.'), x.n.kieu]), [['0', 'quay'], ['1.0', 'fix'], ['1.1', 'quay2'], ['2', 'fix']], 'thứ tự ô và đường dẫn');
  const m = M.chuanHoa({ loai: 'cua_di', rong: 3000, cao: 2700, tu_do: c });
  const kh = M.tinh(m, BD, {});
  eq(kh.loi, [], 'không lỗi');
  eq(kh.do.map((d) => [d.huong, d.tim]), [['dung', 1000], ['dung', 2000], ['ngang', 1350]], 'đố cha trước (chạy suốt), đố con sau');
  gan(kh.do[2].tam.x, 1500, 'đố ngang con nằm giữa ô giữa', 0.01);
  eq(kh.khung, '3_canh', 'cửa đi có cánh quay → khung 3 cạnh');
  ok(kh.o[0].cua_di && kh.o[2].cua_di && !kh.o[1].cua_di, 'cánh quay của cửa đi là cánh cửa đi; ô fix thì không');
  ok(kh.canh_bao.some((x) => /hàng dưới cùng có ô kính cố định/.test(x)), 'khung 3 cạnh mà đáy có ô fix → cảnh báo');
  const g = M.gopO(c, [1, 0]);
  eq(M.laCay(g).map((x) => x.n.kieu), ['quay', 'fix', 'fix'], 'gộp ô giữa lại thành 1 ô');
  ok(/tự chia 4 ô/.test(M.moTa(m)), 'mô tả');
});

T('Kích thước từng phần', () => {
  const c = M.chuanCay({ chia: 'dung', phan: [{ kt: 600, n: { kieu: 'fix' } }, { kt: 0, n: { kieu: 'quay2' } }, { kt: 600, n: { kieu: 'fix' } }] });
  const kh = M.tinh(M.chuanHoa({ loai: 'cua_di', rong: 2800, cao: 2400, tu_do: c, khung: '4_canh' }), BD, {});
  eq(kh.do.map((d) => d.tim), [600, 2200], 'phần nhập sẵn giữ đúng số, phần trống tự tính');
  const sai = M.tinh(M.chuanHoa({ rong: 1000, cao: 1000, tu_do: { chia: 'dung', phan: [{ kt: 400, n: {} }, { kt: 400, n: {} }] } }), BD, {});
  ok(sai.loi.some((x) => /cộng lại 800, khác bề rộng 1000/.test(x)), 'mọi phần nhập đủ mà không khớp → lỗi', sai.loi);
  const chat = M.tinh(M.chuanHoa({ rong: 1000, cao: 1000, tu_do: { chia: 'dung', phan: [{ kt: 900, n: {} }, { kt: 0, n: {} }] } }), BD, {});
  ok(chat.loi.some((x) => /không còn đủ chỗ/.test(x)), 'phần trống không đủ chỗ → lỗi');
  const nho = M.tinh(M.chuanHoa({ rong: 1000, cao: 1000, tu_do: { chia: 'dung', phan: [{ kt: 0, n: { chia: 'dung', phan: [{ kt: 0, n: {} }, { kt: 0, n: {} }, { kt: 0, n: {} }, { kt: 0, n: {} }] } }, { kt: 0, n: {} }] } }), BD, {});
  ok(nho.loi.some((x) => /không nằm lọt|không còn đủ chỗ/.test(x)), 'ô con quá hẹp → lỗi rõ ràng', nho.loi);
});

T('Chuẩn hoá cây bẩn / lưu qua JSON', () => {
  const c = M.chuanCay({ chia: 'dung', phan: [{ kt: '1.200', n: { kieu: 'lua', canh: 4 } }, { n: { kieu: 'abc' } }] });
  eq(c, { chia: 'dung', phan: [{ kt: 1200, n: { kieu: 'lua', canh: 4, lua_kieu: null } }, { kt: 0, n: { kieu: 'fix' } }] }, 'số kiểu VN, kiểu lạ → fix');
  eq(M.chuanCay({ chia: 'dung', phan: [{ n: {} }] }), { kieu: 'fix' }, 'chia 1 phần → coi như ô lá');
  const m = M.chuanHoa(JSON.parse(JSON.stringify(M.chuanHoa({ rong: 1, cao: 1, tu_do: c }))));
  eq(m.tu_do, c, 'qua JSON giữ nguyên');
  eq(M.apMau(m, M.timMau('S2L')).tu_do, null, 'chọn mẫu khác → bỏ tự chia');
});

chay('tự chia ô');
