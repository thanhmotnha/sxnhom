/* Sản xuất: bóc tách, tối ưu cây, xlsx, bản vẽ SX */
const M = require('../src/mnwd-sanxuat.js');
const { T, eq, ok, chay } = require('./khung-thu.js');
const fs = require('fs'), path = require('path'), cp = require('child_process');

const R = { order_bar: [
  { code: 'XF55-01', name: 'Khung bao', color: 'Ghi', type: 'frame', length: 1200, count: 2, angle_one: '45', angle_two: '45', position: 'bk1:up bk3:down', meter_weight: 0.98 },
  { code: 'XF55-01', name: 'Khung bao', color: 'Ghi', type: 'frame', length: 1500, count: 2, angle_one: '45', angle_two: '45', position: 'bk2:left bk4:right', meter_weight: 0.98, is_optimize: 1 },
  { code: 'XF55-03', name: 'Đố', color: 'Ghi', type: 'mullion', length: 1405.6, count: 1, angle_one: '90', angle_two: '90', position: 'zt1:0', meter_weight: 0.7 },
  { code: 'XF55-09', name: 'Không dùng', color: 'Ghi', type: 'frame', length: 0, count: 1 },
], order_glass: [{ name: 'Kính 6.38', specs: 'K638', width: 1100, height: 1400, count: 2, serial: 'G1', type: 'fixedGlass' }],
order_addon: [{ code: 'GK', name: 'Gioăng <kính>', count: 12.5, length: '' }] };

T('Bóc tách gọn + tên tiếng Việt', () => {
  const b = M.gonBocTach(R);
  eq(b.nhom.length, 3, 'bỏ thanh dài 0');
  eq([b.nhom[0].ma, b.nhom[0].dai, b.nhom[0].sl, b.nhom[0].toi_uu], ['XF55-01', 1200, 2, 1]);
  eq(M.viTriVN('bk1:up bk3:down'), 'trên, dưới');
  eq(M.viTriVN('zt1:0'), 'giữa');
  eq(M.tenThanh('mullion'), 'Đố');
  eq(b.kinh[0].rong, 1100); eq(b.pk[0].sl, 12.5);
  eq(M.gonBocTach(null), { nhom: [], kinh: [], pk: [] });
});

T('Tối ưu cây: đủ đoạn, không vượt cây, đoạn quá dài báo riêng', () => {
  const cat = [{ ma: 'A', ten: 'a', mau: 'x', dai: 2800, sl: 5, ky_hieu: 'D1', goc1: '45', goc2: '45' }, { ma: 'A', ten: 'a', mau: 'x', dai: 900, sl: 3, ky_hieu: 'D2', goc1: '90', goc2: '90' }, { ma: 'B', ten: 'b', mau: 'x', dai: 6000, sl: 1, ky_hieu: 'D3' }];
  const tu = M.toiUuCay(cat, { cay: 5800, hao_dau: 10, mach: 12 });
  const a = tu.filter((c) => c.ma === 'A');
  eq(a.reduce((s, c) => s + c.doan.length, 0), 8, 'đủ 8 đoạn');
  a.forEach((c) => { const dung = c.doan.reduce((s, d) => s + d.dai, 0) + 12 * (c.doan.length - 1); ok(dung <= 5780, 'cây ' + c.so_cay + ' không vượt'); eq(Math.round(c.du), 5780 - dung); });
  eq(a.length, 3, '2800×5 + 900×3 → 3 cây');
  const b = tu.filter((c) => c.ma === 'B'); eq([b.length, b[0].qua_dai], [1, true]);
  eq(M.toiUuCay([{ ma: 'C', dai: 100, sl: 2, toi_uu: 0 }]).length, 0, 'thanh không tối ưu bỏ qua');
});

T('File Excel mở được bằng openpyxl, đúng cột + số là kiểu số', () => {
  const bo = [{ ky_hieu: 'D1', so_luong: 1, boc_tach: M.gonBocTach(R) }, { ky_hieu: 'S&2', so_luong: 1, boc_tach: M.gonBocTach(R) }];
  const u8 = M.xlsxCat(bo, { don: 'FG001' });
  const f = path.join(require('os').tmpdir(), 'mnwd-thu.xlsx');
  fs.writeFileSync(f, Buffer.from(u8));
  const py = "import openpyxl,json,sys\nwb=openpyxl.load_workbook(sys.argv[1])\nout={n:[[c for c in r] for r in wb[n].iter_rows(values_only=True)] for n in wb.sheetnames}\nprint(json.dumps(out,ensure_ascii=False,default=str))";
  const kq = JSON.parse(cp.execFileSync('python3', ['-c', py, f]).toString());
  eq(Object.keys(kq), ['Cat nhom', 'Toi uu cay', 'Kinh', 'Phu kien']);
  const c = kq['Cat nhom'];
  eq(c[0].slice(0, 6), ['STT', 'Mã thanh', 'Tên thanh', 'Màu', 'Chiều dài cắt (mm)', 'Số lượng']);
  eq(c.length, 7, 'tiêu đề + 6 dòng');
  eq(typeof c[1][4], 'number'); eq(c[1][4], 1500, 'dài nhất trước trong cùng mã');
  ok(c.some((r) => r[8] === 'S&2'), 'ký tự đặc biệt giữ nguyên');
  eq(kq['Phu kien'][1][2], 'Gioăng <kính>');
  eq(kq['Kinh'][1][7], 3.08);
  fs.unlinkSync(f);
});

T('ZIP có CRC đúng (python zipfile testzip)', () => {
  const u8 = M.zip([{ ten: 'a.txt', noi_dung: 'xin chào' }, { ten: 'b/c.txt', noi_dung: 'ok' }]);
  const f = path.join(require('os').tmpdir(), 'mnwd-thu.zip'); fs.writeFileSync(f, Buffer.from(u8));
  const r = cp.execFileSync('python3', ['-c', "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip(),z.read('a.txt').decode())", f]).toString().trim();
  eq(r, 'None xin chào'); fs.unlinkSync(f);
});

T('Bản vẽ SX: mỗi bộ một trang, tiếng Việt, thoát ký tự', () => {
  const h = M.htmlBanVe([{ ky_hieu: 'D1', mo_ta: 'Cửa đi 2 cánh', rong: 1200, cao: 2200, so_luong: 2, anh: 'data:image/png;base64,AA', boc_tach: M.gonBocTach(R) }, { ky_hieu: '<S2>', boc_tach: null }], { don: 'FG001' });
  eq((h.match(/class="trang"/g) || []).length, 2);
  ok(h.includes('BẢN VẼ SẢN XUẤT') && h.includes('Khung') && h.includes('trên, dưới') && h.includes('Trang 2/2'));
  ok(h.includes('&lt;S2&gt;') && !h.includes('<S2>'));
  ok(h.includes('<img src="data:image/png'));
});

chay('Sản xuất');
