const fs = require('fs');
const d = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, LevelFormat, BorderStyle, Footer, PageNumber } = d;
const F = 'Arial';
const p = (t, o) => new Paragraph({ spacing: { after: 100 }, ...(o || {}), children: (Array.isArray(t) ? t : [t]).map((x) => typeof x === 'string' ? new TextRun({ text: x, font: F, size: 22 }) : x) });
const b = (t) => new TextRun({ text: t, bold: true, font: F, size: 22 });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 }, children: [new TextRun({ text: t, font: F })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: t, font: F })] });
const li = (t, lv) => new Paragraph({ numbering: { reference: 'dau', level: lv || 0 }, spacing: { after: 60 }, children: (Array.isArray(t) ? t : [t]).map((x) => typeof x === 'string' ? new TextRun({ text: x, font: F, size: 22 }) : x) });
const W = 9026;
const bang = (cot, hang, rong) => {
  const ww = rong.map((r) => Math.round(r * W));
  ww[ww.length - 1] = W - ww.slice(0, -1).reduce((a, c) => a + c, 0);
  const o = (t, i, dau) => new TableCell({ width: { size: ww[i], type: WidthType.DXA }, shading: dau ? { type: ShadingType.CLEAR, fill: '17365D', color: 'auto' } : undefined, margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({ children: [new TextRun({ text: String(t), font: F, size: 19, bold: !!dau, color: dau ? 'FFFFFF' : '1C2733' })] })] });
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: ww, rows: [new TableRow({ tableHeader: true, children: cot.map((t, i) => o(t, i, true)) })].concat(hang.map((r) => new TableRow({ children: r.map((t, i) => o(t, i)) }))) });
};
const c = [];
c.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'ĐẶC TẢ CHỨC NĂNG', font: F, size: 36, bold: true, color: '17365D' })] }));
c.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Tiện ích "Một Nhà · Vẽ cửa" cho phần mềm WindoorCraft', font: F, size: 28, color: '17365D' })] }));
c.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '17365D', space: 4 } }, spacing: { after: 200 }, children: [new TextRun({ text: 'Phiên bản 0.1.0 · 09/10/2026 · Một Nhà Design & Build · Người duyệt: [điền tên]', font: F, size: 20, color: '56657A' })] }));

c.push(h1('1. Bối cảnh và mục tiêu'));
c.push(p('Xưởng nhôm kính đang dùng WindoorCraft (ln.windoorcraft.com) để vẽ cửa, bóc tách vật tư, báo giá, tối ưu cắt và in bản vẽ sản xuất. Việc tốn thời gian nhất là vẽ tay từng bộ cửa: mỗi bộ phải chọn hệ nhôm, kéo khung, chia đố, đặt cánh, chọn kính, gõ ký hiệu rồi lưu.'));
c.push(p([b('Mục tiêu: '), 'người làm chỉ điền danh sách cửa (ký hiệu, mẫu, rộng × cao, số lượng, kính) — tiện ích tự vẽ và lưu cả danh sách thành một đơn hàng trong WindoorCraft. Từ đơn đó, phần bóc tách, báo giá, tối ưu cắt, in của WindoorCraft dùng ngay, không phải làm lại.']));
c.push(h2('Nguyên tắc'));
[['Vẽ bằng lệnh gốc của WindoorCraft: ', 'cửa vẽ ra là đối tượng gốc, sửa tay được, bóc tách đúng như vẽ tay.'],
 ['Chỉ vẽ và bấm "Lưu lại" như người dùng: ', 'không xoá, không sửa đơn hàng cũ, không đụng tới danh mục hệ nhôm, công thức, giá.'],
 ['An toàn dữ liệu: ', 'mọi thao tác có thể làm mất bản vẽ chưa lưu đều hỏi trước; chạy hàng loạt gặp lỗi thì dừng ở dòng lỗi.'],
 ['Không đọc, không gửi mật khẩu; ', 'không gửi dữ liệu ra ngoài WindoorCraft. Cài đặt lưu trong trình duyệt máy dùng.']].forEach((x) => c.push(li([b(x[0]), x[1]])));

c.push(h1('2. Người dùng'));
c.push(bang(['Vai trò', 'Việc làm với tiện ích'], [
  ['Kỹ thuật / thiết kế cửa', 'Nhập danh sách cửa của công trình, vẽ và lưu đơn, chỉnh tay chi tiết đặc biệt trong WindoorCraft.'],
  ['Kinh doanh / báo giá', 'Vẽ nhanh 1–2 bộ khi tư vấn; in báo giá từ đơn vừa lưu.'],
  ['Quản lý xưởng', 'Gán hệ nhôm theo mẫu, khe hở ô chờ, giới hạn kích thước cánh; duyệt mẫu riêng của xưởng.'],
], [0.3, 0.7]));

c.push(h1('3. Luồng nghiệp vụ'));
['Đo hiện trạng → lập bảng cửa trong Excel (ký hiệu, mẫu, rộng, cao, SL, ô thoáng, vị trí, ghi chú, kính).',
 'Mở WindoorCraft → Thiết kế → bấm "Một Nhà · Vẽ cửa" → thẻ Danh sách → Dán từ Excel.',
 'Soát bảng: dòng chưa rõ mẫu chọn mẫu; dòng sai kích thước có cảnh báo.',
 'Bấm "Vẽ và lưu cả N dòng vào một đơn hàng" → xem tóm tắt (hệ nhôm, kính, đơn mới hay đơn đang mở) → Bắt đầu.',
 'Tiện ích vẽ, đối chiếu bản vẽ với yêu cầu, điền ký hiệu/SL/vị trí/ghi chú, bấm Lưu lại; lặp tới hết danh sách.',
 'Xong: Mở đơn hàng (bóc tách từng bộ) · In báo giá, bản vẽ sản xuất · Tối ưu cắt nhôm — các trang này là của WindoorCraft.'].forEach((x, i) => c.push(p([b((i + 1) + '. '), x])));

c.push(h1('4. Chức năng — phiên bản 0.1.0 (đã làm, đã thử trên tài khoản thật)'));
c.push(bang(['Mã', 'Chức năng', 'Mô tả / quy tắc'], [
  ['F1', 'Vẽ nhanh theo mẫu', '29 mẫu sẵn: vách kính (V1, V2, V3, V2T), cửa sổ quay/hất/lùa (S…), cửa đi quay/lùa/xếp trượt (D…). Chỉnh: rộng × cao, phủ bì/ô chờ, phần chính, ô thoáng, vách trái/phải, ô dưới, đố suốt, khung 3/4 cạnh, chiều mở, kiểu lùa. Có hình xem trước có kích thước.'],
  ['F2', 'Chọn hệ nhôm', 'Theo danh mục hệ nhôm của tài khoản (32 hệ). Đổi hệ trước khi vẽ để cỡ thanh, kiểu ghép góc đúng hệ.'],
  ['F3', 'Chọn kính', 'Theo danh mục kính của hệ đang chọn; gõ tên không phân biệt hoa thường/dấu. Để trống = loại mặc định của hệ. Sai tên: dừng trước khi vẽ, gợi ý tên gần giống.'],
  ['F4', 'Đối chiếu sau khi vẽ', 'Đọc lại bản vẽ: kích thước khung, số ô, số cánh từng loại, loại kính. Không khớp thì báo, chạy hàng loạt thì không lưu.'],
  ['F5', 'Hoàn tác', 'Cả lần vẽ là MỘT bước hoàn tác của WindoorCraft; nút "Hoàn tác lần vẽ này" trên bảng.'],
  ['F6', 'Danh sách công trình', 'Thêm từ form hoặc dán từ Excel (TAB, ; , |; có/không dòng tiêu đề; mẫu ghi mã hoặc mô tả "cửa đi 2 cánh mở quay"). Ký hiệu tự tăng D1→D2. Xuất CSV. Lưu qua lần tải lại trang.'],
  ['F7', 'Vẽ và lưu cả đơn', 'Lần lượt từng dòng vào cùng một đơn (đơn đang mở hoặc đơn mới). Dừng ở lỗi đầu tiên; bấm lại thì chỉ làm các dòng chưa lưu. Có nút Dừng.'],
  ['F8', 'Đi tiếp sau khi lưu', 'Mở đơn hàng · In báo giá/bản vẽ (trang In của WindoorCraft, thẻ mới) · Tối ưu cắt. Rời trang khi bản vẽ còn dở thì hỏi trước.'],
  ['F9', 'Cài đặt xưởng', 'Hệ nhôm theo mẫu (có gợi ý tự động), khe hở ô chờ, cách chia ô đều, làm tròn, giới hạn cảnh báo, mẫu riêng của xưởng, sao lưu/nạp cài đặt sang máy khác.'],
  ['F10', 'Bảo vệ thao tác', 'Hỏi trước khi xoá bản vẽ chưa lưu; đang mở bộ đã lưu thì hỏi "vẽ bộ mới / vẽ đè"; phím gõ trong bảng không lọt xuống phím tắt WindoorCraft; bản vẽ tự dời ra chỗ bảng không che.'],
], [0.07, 0.2, 0.73]));

c.push(h1('5. Quy tắc tính toán'));
['Mọi kích thước ô tính tới tim đố (giống cách WindoorCraft đo). Kích thước người gõ giữ nguyên; chỉ phần chia đều mới làm tròn (mặc định 1 mm).',
 'Ô chờ → phủ bì khung: trừ tổng khe hở theo loại (cửa đi 10/5, cửa sổ 10/10, vách 10/10 mm — xưởng chỉnh được).',
 'Chia đều theo cài đặt của WindoorCraft (tài khoản hiện tại: kích thước đều theo tim đố).',
 'Cửa đi: mặc định khung 3 cạnh (không bậu dưới). Có vách bên thì cả bộ dùng khung 3 cạnh.',
 'Giới hạn cánh chỉ cảnh báo, không chặn: quay sổ 350–800 × 400–1600; hất 350–1000 × 350–1200; quay đi 500–1000 × 1800–2600; lùa 450–1500 × 500–2800; xếp 450–900 × 1800–2800; kính fix ≤ 3 m²; thanh nhôm 5800.'].forEach((x) => c.push(li(x)));

c.push(h1('6. Kết quả thử thật'));
c.push(p('Ngày 08/10/2026 trên tài khoản xưởng: cả 29 mẫu vẽ đúng (đối chiếu khớp, mỗi bộ < 0,7 giây, đổi hệ nhôm ~2,6 giây). Dán 3 dòng → tiện ích tạo đơn nháp FG2026100811 (#282254) trong khoảng 15 giây; WindoorCraft tự bóc tách, tính giá 22.771.700 đ, ra bản vẽ sản xuất, danh sách cắt nhôm. Đơn này là đơn thử, xoá được.'));
c.push(p('Kiểm thử tự động: 596 phép kiểm (lõi tính toán, điều khiển, giao diện trên trình duyệt thật, nạp gói tiện ích) — đạt hết.'));

c.push(h1('7. Những gì đã tìm hiểu ở phần còn lại của WindoorCraft (chỉ xem)'));
c.push(bang(['Phần', 'WindoorCraft có gì', 'Tiện ích nối thế nào'], [
  ['Chi tiết đơn / bộ cửa', 'Bóc tách từng bộ: danh sách thanh nhôm (mã, dài, góc cắt), lỗ khoan, kính, phụ kiện, giá.', 'Nút "Mở đơn hàng". Tài khoản phụ không xem được trang chi tiết bộ (WindoorCraft chặn).'],
  ['In', '~80 mẫu in: báo giá, bảng dự toán, bản vẽ sản xuất, danh sách kính/nhôm/phụ kiện, tem, giá vốn; xuất PDF/Excel/Word.', 'Nút "In báo giá · bản vẽ" mở đúng trang In của đơn.'],
  ['Tối ưu cắt', 'Gom thanh theo mã, cây 5800/6000, hao hụt 10/12 mm; bấm Thực hiện → Lưu lại mới có Bảng tối ưu, Danh sách nhôm.', 'Nút "Tối ưu cắt". Bấm Thực hiện/Lưu lại để người dùng tự làm (có lượt dùng giới hạn).'],
  ['Đế cắm thiết bị', 'Mẫu in "device docking" xuất danh sách cắt (profile no; length; left/right angle…) cho máy cắt.', 'Đầu mối để nối máy cắt Haffner — cần xem định dạng file máy nhận.'],
], [0.18, 0.47, 0.35]));

c.push(h1('8. Việc xưởng cần xác nhận'));
['Khe hở ô chờ và giới hạn kích thước cánh (mục 5) có đúng thực tế xưởng không.',
 'Cửa đi có vách bên: khung 3 cạnh cả bộ có đúng cách xưởng làm không (WindoorCraft không cho bỏ bậu chỉ riêng dưới cánh).',
 'Bảng "Hệ nhôm theo mẫu": cửa sổ mở quay/hất đang gợi ý hệ "XINGFA-55 Vách kính cố định (cánh mở ra ngoài)" — xác nhận hoặc chọn hệ khác.',
 'Danh mục kính có nhiều tên gần trùng (KINH 6.38, 6.38TT, KINH 6.38TT…) — nên dọn trong WindoorCraft để cột Kính trong Excel ghi thống nhất.',
 'Tên/địa chỉ công ty trên mẫu in đang là "TÊN CÔNG TY / ĐỊA CHỈ / SDT" — cập nhật trong cài đặt công ty của WindoorCraft (tài khoản chính).'].forEach((x) => c.push(li(x)));

c.push(h1('9. Lộ trình đề xuất'));
c.push(bang(['Giai đoạn', 'Nội dung', 'Ghi chú'], [
  ['0.2', 'Điền khách hàng/địa chỉ cho đơn; màu nhôm, phụ kiện theo dòng; mẫu cửa riêng có ô lệch, vòm; nhập thẳng file Excel (.xlsx).', 'Làm tiếp ngay khi xưởng xác nhận mục 8.'],
  ['0.3', 'Lấy dữ liệu bóc tách sau khi lưu (thanh, kính, phụ kiện) về Excel tổng công trình; so giá giữa các hệ nhôm.', 'Đọc dữ liệu WindoorCraft đã tính, không tự tính lại.'],
  ['0.4', 'Nối máy cắt Haffner: xuất danh sách cắt theo định dạng máy nhận.', 'Cần file mẫu từ phần mềm máy cắt.'],
  ['0.5', 'Nối SX.motnha.vn / ERP: đo hiện trạng → danh sách cửa → đơn WindoorCraft.', 'Theo kế hoạch hệ thống chung.'],
], [0.12, 0.6, 0.28]));

const doc = new Document({
  styles: { default: { document: { run: { font: F, size: 22 } } }, paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: '17365D', font: F }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 0 } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, color: '33435A', font: F }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 1 } }] },
  numbering: { config: [{ reference: 'dau', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Một Nhà · Vẽ cửa — đặc tả v0.1.0 · trang ', font: F, size: 16, color: '8A96A8' }), new TextRun({ children: [PageNumber.CURRENT], font: F, size: 16, color: '8A96A8' })] })] }) },
    children: c }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync('/mnt/user-data/outputs/mn-windoor/Dac-ta-MN-Ve-cua-v0.1.0.docx', buf); console.log('ok'); });
