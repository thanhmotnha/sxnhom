/* Thử bảng điều khiển trên trang giả lập bằng trình duyệt thật (Playwright + Chromium). */
const path = require('path');
const { chromium } = require('playwright');
const { T, eq, ok, co, chay } = require('./khung-thu.js');
const TRANG = 'file://' + path.resolve(__dirname, '../tools/trang-gia-lap.html');
let br;
const mo = async (tuy) => {
  tuy = tuy || {};
  const cx = await br.newContext({ viewport: { width: tuy.rong || 1900, height: tuy.cao || 1000 } });
  const pg = await cx.newPage();
  pg.loi = [];
  pg.on('pageerror', (e) => pg.loi.push(e.message));
  await pg.goto(TRANG + (tuy.q || ''));
  await pg.waitForTimeout(250);
  const h = pg.locator('#mnwd-host');
  if (!tuy.dong) { await h.locator('button.mo').click(); await pg.waitForTimeout(150); }
  pg.h = h;
  pg.go = async (sel, v) => { await h.locator(sel).fill(String(v)); };
  pg.bam = async (ten, trong) => { await (trong ? h.locator(trong) : h).getByRole('button', { name: ten, exact: true }).first().click(); };
  pg.the = async (t) => { await h.locator('.the button[data-the="' + t + '"]').click(); await pg.waitForTimeout(80); };
  pg.K = (f) => pg.evaluate(f);
  pg.o = (i) => h.locator('.cot-trai input[type=text]').nth(i); // 0 rộng, 1 cao
  return pg;
};
const O = { rong: 0, cao: 1 };

T('Mở bảng, vẽ mẫu mặc định, đối chiếu khớp', async () => {
  const pg = await mo();
  ok(await pg.h.locator('.bang').isVisible(), 'bảng hiện');
  ok(!(await pg.h.locator('button.mo').isVisible()), 'nút mở ẩn khi bảng đang mở');
  await pg.o(O.rong).fill('1.600'); await pg.o(O.cao).fill('2700');
  ok(/Khung 1600 × 2700 · 3 cạnh · 2 ô · 2 cánh/.test(await pg.h.locator('.xem .mt').innerText()), 'xem trước cập nhật theo số gõ kiểu Việt', await pg.h.locator('.xem .mt').innerText());
  await pg.bam('Vẽ vào WindoorCraft');
  await pg.waitForTimeout(250);
  const kq = await pg.h.locator('.cot-phai .tb.tot').innerText();
  ok(/Đã vẽ .* 1600 × 2700 — 1 đố, 2 cánh, kính KINH 6\.38TS\. Đối chiếu với bản vẽ: khớp\./.test(kq), 'báo kết quả, nêu loại kính sẽ lưu', kq);
  eq(await pg.K(() => K.nk.lenh.filter((l) => !/^script/.test(l))), ['clear', 'khung door', 'do ngang 500', 'canh doi di'], 'lệnh xuống WindoorCraft');
  await pg.bam('Hoàn tác lần vẽ này');
  ok(await pg.K(() => webcc.shapeManager.isEmpty), 'hoàn tác → trống');
  eq(pg.loi, [], 'không lỗi script');
  await pg.context().close();
});

T('Gõ trong bảng không lọt xuống phím tắt của WindoorCraft', async () => {
  const pg = await mo();
  await pg.K(() => { window.__phim = []; document.addEventListener('keydown', (e) => window.__phim.push(e.key), true); });
  await pg.h.locator('input[placeholder="D1"]').click();
  await pg.keyboard.type('DS1F');
  eq(await pg.K(() => window.__phim), [], 'phím trong bảng bị chặn');
  eq(await pg.h.locator('input[placeholder="D1"]').inputValue(), 'DS1F', 'chữ vẫn vào ô');
  await pg.mouse.click(1500, 600);
  await pg.keyboard.press('f');
  eq(await pg.K(() => window.__phim), ['f'], 'phím ngoài bảng vẫn tới WindoorCraft');
  await pg.context().close();
});

T('Hỏi lại khi bản vẽ chưa lưu không phải do bảng vẽ', async () => {
  const pg = await mo();
  await pg.bam('Vẽ vào WindoorCraft'); await pg.waitForTimeout(200);
  await pg.bam('Vẽ vào WindoorCraft'); await pg.waitForTimeout(200);
  eq(await pg.h.locator('.cot-phai .tb.hoi').count(), 0, 'vẽ lại ngay trên bản vẽ của chính bảng → không hỏi');
  await pg.K(() => { webcc.shapeManager.addMullion(new K.Line(new K.Pt(700, 1500), new K.Vec(0, 1))); }); // người dùng sửa tay
  await pg.bam('Vẽ vào WindoorCraft');
  ok(/chưa lưu.*sẽ bị xoá/.test(await pg.h.locator('.cot-phai .tb.hoi').innerText()), 'bản vẽ đã bị sửa tay → hỏi');
  const truoc = await pg.K(() => webcc.shapeManager.serialize());
  await pg.bam('Thôi');
  eq(await pg.K(() => webcc.shapeManager.serialize()), truoc, 'Thôi → giữ nguyên');
  await pg.bam('Vẽ vào WindoorCraft'); await pg.bam('Xoá và vẽ'); await pg.waitForTimeout(200);
  ok((await pg.K(() => webcc.shapeManager.serialize())) !== truoc, 'Xoá và vẽ → vẽ lại');
  await pg.context().close();
});

T('Đang mở bộ đã lưu: vẽ bộ mới hoặc vẽ đè', async () => {
  const pg = await mo();
  await pg.bam('Vẽ vào WindoorCraft'); await pg.waitForTimeout(200);
  await pg.locator('#nut-luu').click(); await pg.waitForTimeout(1500); // thanh trạng thái đọc lại mỗi 1,2 giây
  const q1 = await pg.K(() => K.draw.$route.query);
  ok(q1.order_id && q1.contract_id, 'đã lưu, có mã bộ');
  ok(/đã lưu/.test(await pg.h.locator('.chan .chu').innerText()), 'thanh trạng thái báo đã lưu', await pg.h.locator('.chan .chu').innerText());
  await pg.bam('Vẽ vào WindoorCraft');
  ok(/đã lưu trong đơn #/.test(await pg.h.locator('.cot-phai .tb.hoi').innerText()), 'hỏi 3 lựa chọn');
  await pg.bam('Vẽ đè lên bộ đang mở'); await pg.waitForTimeout(250);
  eq((await pg.K(() => K.draw.$route.query)).order_id, q1.order_id, 'vẽ đè giữ mã bộ');
  await pg.bam('Vẽ vào WindoorCraft'); await pg.bam('Vẽ bộ mới, thêm vào đơn này'); await pg.waitForTimeout(300);
  const q2 = await pg.K(() => K.draw.$route.query);
  eq([q2.order_id, q2.contract_id], [undefined, q1.contract_id], 'vẽ bộ mới: bỏ mã bộ, giữ đơn');
  await pg.context().close();
});

T('Chọn mẫu, đổi cấu tạo, ô chờ, cảnh báo', async () => {
  const pg = await mo();
  await pg.bam('Cửa sổ', '.nhom');
  await pg.h.locator('.mau[data-ma="S2L"]').click();
  ok(/Cửa sổ lùa 2 cánh/.test(await pg.h.locator('.xem .mt').innerText()), 'mẫu S2L');
  eq([await pg.o(O.rong).inputValue(), await pg.o(O.cao).inputValue()], ['1400', '1200'], 'kích thước mặc định của mẫu');
  ok(await pg.h.locator('.cot-trai .hang:has(> label:text-is("Phần chính")) input').nth(1).isVisible(), 'ô số cánh hiện với kiểu lùa');
  await pg.o(O.rong).fill('3400');
  ok(/Cánh lùa phần chính rộng khoảng \d+ > 1500/.test(await pg.h.locator('.cot-phai .tb.cb').innerText()), 'cảnh báo cánh quá rộng');
  await pg.bam('Ô chờ');
  ok(/trừ khe 10 \(rộng\), 10 \(cao\) → khung 3390 × 1190/.test(await pg.h.locator('.cot-trai .nho2').first().innerText()), 'ô chờ trừ khe', await pg.h.locator('.cot-trai .nho2').first().innerText());
  await pg.o(O.cao).fill('');
  ok(/Chưa nhập chiều cao/.test(await pg.h.locator('.cot-phai .tb.loi').innerText()), 'thiếu cao → lỗi');
  ok(await pg.h.getByRole('button', { name: 'Vẽ vào WindoorCraft' }).isDisabled(), 'nút vẽ khoá khi lỗi');
  await pg.context().close();
});

T('Danh sách: thêm từ form, ký hiệu tự tăng, lưu qua lần tải lại', async () => {
  const pg = await mo();
  await pg.h.locator('input[placeholder="D1"]').fill('D01');
  await pg.bam('+ Danh sách'); await pg.bam('+ Danh sách');
  eq(await pg.h.locator('input[placeholder="D1"]').inputValue(), 'D03', 'ký hiệu tự tăng D01 → D02 → D03');
  eq(await pg.h.locator('.the button[data-the="ds"]').innerText(), 'Danh sách · 2/2', 'đếm trên thẻ');
  await pg.reload(); await pg.waitForTimeout(300);
  await pg.h.locator('button.mo').click(); await pg.the('ds');
  eq(await pg.h.locator('section[data-s="ds"] tbody tr').count(), 2, 'tải lại trang vẫn còn 2 dòng');
  eq(await pg.h.locator('section[data-s="ds"] tbody tr td:first-child b').allInnerTexts(), ['D01', 'D02'], 'đúng ký hiệu');
  await pg.context().close();
});

T('Dán từ Excel → vẽ và lưu cả danh sách vào một đơn', async () => {
  const pg = await mo();
  await pg.the('cd');
  await pg.h.locator('section[data-s="cd"] .hang:has(b:text-is("D2QT")) select').selectOption('151076');
  await pg.the('ds');
  await pg.bam('Dán từ Excel');
  await pg.h.locator('section[data-s="ds"] textarea').fill('Ký hiệu\tMẫu\tRộng\tCao\tSL\tÔ thoáng\tVị trí\nD1\tD2QT\t1600\t2700\t2\t550\tPhòng khách\nS1\tS2L\t1400\t1200\t4\t\tPhòng ngủ\nS2\tkiểu lạ\t800\t1000\t1\nX\tV1\t\t500');
  ok(/Nhận 3 dòng, 1 dòng chưa rõ mẫu.*Bỏ qua 1 dòng: dòng 5 \(thiếu rộng hoặc cao\)/.test(await pg.h.locator('.tb.hoi .nho2').innerText()), 'báo kết quả đọc', await pg.h.locator('.tb.hoi .nho2').innerText());
  await pg.bam('Thêm vào danh sách');
  eq(await pg.h.locator('section[data-s="ds"] tbody tr').count(), 3, '3 dòng');
  ok(await pg.h.getByRole('button', { name: 'Vẽ và lưu cả 2 dòng vào một đơn hàng' }).isVisible(), 'dòng chưa chọn mẫu không tính');
  await pg.h.locator('section[data-s="ds"] tbody select').selectOption('S1H');
  await pg.bam('Vẽ và lưu cả 3 dòng vào một đơn hàng');
  const hoi = await pg.h.locator('section[data-s="ds"] .tb.hoi').innerText();
  ok(/1 dòng — XINGFA-55 Cửa đi mở quay/.test(hoi) && /2 dòng chưa gán hệ nhôm/.test(hoi) && /đơn hàng mới/.test(hoi), 'tóm tắt trước khi chạy: hệ nhôm, dòng chưa gán, đơn mới', hoi);
  await pg.bam('Bắt đầu');
  await pg.h.locator('section[data-s="ds"] .tb.tot').waitFor({ timeout: 15000 });
  const luu = await pg.K(() => K.da_luu.map((x) => [x.ma_don, x.ky_hieu, x.so_luong, x.vi_tri, x.he_nhom, JSON.parse(x.ban_ve).sm[0].fenes.map((f) => f.type).join()]));
  eq(luu.map((x) => x.slice(1)), [['D1', 2, 'Phòng khách', 151076, 'DoubleSash'], ['S1', 4, 'Phòng ngủ', 151076, 'Slide'], ['S2', 1, '', 151076, 'Sash']], '3 bộ đã lưu đúng ký hiệu, số lượng, vị trí');
  ok(luu[0][0] === luu[1][0] && luu[1][0] === luu[2][0], 'cùng một đơn hàng');
  eq(await pg.K(() => JSON.parse(K.da_luu[0].ban_ve).sm[0].do_[0].y), 550, 'ô thoáng lấy theo cột Ô thoáng');
  eq(await pg.h.locator('section[data-s="ds"] .tt').allInnerTexts(), ['Đã lưu', 'Đã lưu', 'Đã lưu'], 'trạng thái từng dòng');
  ok(/Đã vẽ và lưu 3 \/ 3 dòng vào đơn hàng #\d+/.test(await pg.h.locator('section[data-s="ds"] .tb.tot').innerText()), 'tổng kết');
  // đi tiếp sau khi lưu: trang In (thẻ mới), Tối ưu cắt, trang đơn hàng
  await pg.K(() => { window.__mo = []; window.open = (dc, dich) => { window.__mo.push([dc, dich]); return null; }; });
  await pg.bam('In báo giá · bản vẽ');
  const mo_ = await pg.K(() => window.__mo);
  const bo = await pg.K(() => K.da_luu.map((x) => x.ma_bo));
  ok(mo_.length === 1 && mo_[0][1] === '_blank' && mo_[0][0].indexOf('/printer?contract_id=' + luu[0][0] + '&order_id=' + bo.join(',') + '&company_id=31&lang=vi-VN&son_account_type=2&user_id=7001') >= 0, 'In: mở trang In của WindoorCraft ở thẻ mới, đủ 3 bộ', mo_);
  eq(await pg.K(() => K.draw.$route.name), 'draw', 'In không rời trang Thiết kế');
  await pg.bam('Tối ưu cắt');
  eq(await pg.K(() => [K.draw.$route.name, K.draw.$route.query]), ['orders.cutOptimizer', { contract_ids: luu[0][0], count: 7 }], 'Tối ưu cắt: đúng trang, đúng đơn, tổng 7 bộ');
  await pg.bam('Mở đơn hàng #' + luu[0][0]);
  eq(await pg.K(() => K.router.nk[K.router.nk.length - 1]), 'orders.group-detail', 'mở trang đơn hàng');
  eq(pg.loi, [], 'không lỗi script');
  await pg.context().close();
});

T('Kính: gõ ở form có gợi ý theo hệ đang mở, sai tên thì cảnh báo; dán cột Kính rồi lưu đúng từng bộ', async () => {
  const pg = await mo();
  await pg.K(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.h.locator('button.mo').click();
  const o_kinh = pg.h.locator('input[list="mnwd-ds-kinh"]');
  eq(await pg.h.locator('#mnwd-ds-kinh option').evaluateAll((ds) => ds.map((o) => o.value)), ['KINH 6.38TS', 'KINH 8.38TS', 'KINH HOP 19MM'], 'gợi ý lấy theo danh mục kính của hệ đang mở');
  await o_kinh.fill('kinh la');
  ok(/không có loại kính "kinh la"/.test(await pg.h.locator('.cot-phai .tb.cb').innerText()), 'tên không có trong danh mục → cảnh báo ngay');
  await o_kinh.fill('kinh 8.38ts');
  eq(await pg.h.locator('.cot-phai .tb.cb').count(), 0, 'gõ thường vẫn nhận, hết cảnh báo');
  await pg.bam('Vẽ vào WindoorCraft'); await pg.waitForTimeout(250);
  ok(/kính KINH 8\.38TS\. Đối chiếu với bản vẽ: khớp/.test(await pg.h.locator('.cot-phai .tb.tot').innerText()), 'vẽ xong báo đúng loại kính', await pg.h.locator('.cot-phai .tb').first().innerText());
  eq(await pg.K(() => [K.oi.order_info.guigelabel, webcc.shapeManager.shapem[0].kinh]), ['KINH 8.38TS', 'KINH 8.38TS'], 'ô Kính của WindoorCraft và bản vẽ cùng đổi');
  await pg.the('ds');
  await pg.bam('Dán từ Excel');
  await pg.h.locator('section[data-s="ds"] textarea').fill('Ký hiệu;Mẫu;Rộng;Cao;SL;Kính\nS1;S2Q;1200;1400;1;KINH HOP 19MM\nS2;S2Q;1200;1400;1;\nS3;S2Q;1200;1400;1;kính tự chế');
  await pg.bam('Thêm vào danh sách');
  ok(/KINH HOP 19MM/.test(await pg.h.locator('section[data-s="ds"] tbody tr').first().innerText()), 'dòng có ghi kính hiện tên kính');
  await pg.bam('Vẽ và lưu cả 3 dòng vào một đơn hàng');
  ok(/Kính: 2 dòng ghi loại kính riêng, 1 dòng còn lại dùng loại mặc định/.test(await pg.h.locator('section[data-s="ds"] .tb.hoi').innerText()), 'tóm tắt nêu kính', await pg.h.locator('section[data-s="ds"] .tb.hoi').innerText());
  await pg.bam('Xoá và vẽ').catch(() => {});
  await pg.bam('Bắt đầu');
  await pg.h.locator('section[data-s="ds"] .tb.loi').waitFor({ timeout: 15000 });
  eq(await pg.K(() => K.da_luu.map((x) => [x.ky_hieu, x.kinh, x.kinh_ban_ve])), [['S1', 'KINH HOP 19MM', 'KINH HOP 19MM'], ['S2', 'KINH 6.38TS', 'KINH 6.38TS']], 'S1 kính hộp, S2 không ghi → về mặc định (không dính kính của S1)');
  ok(/Dừng ở S3[\s\S]*không có loại kính "kính tự chế"/.test(await pg.h.locator('section[data-s="ds"] .tb.loi').innerText()), 'S3 sai tên kính → dừng, chưa lưu', await pg.h.locator('section[data-s="ds"] .tb.loi').innerText());
  eq(await pg.h.locator('section[data-s="ds"] .tt').allInnerTexts(), ['Đã lưu', 'Đã lưu', 'Lỗi'], 'trạng thái từng dòng');
  eq(pg.loi, [], 'không lỗi script');
  await pg.context().close();
});

T('Bảng hệ nhôm theo mẫu đổi → ô Hệ nhôm của form lấy theo', async () => {
  const pg = await mo();
  await pg.K(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.h.locator('button.mo').click();
  const o_he = pg.h.locator('.cot-trai .hang:has(> label:text-is("Hệ nhôm")) select');
  eq(await o_he.inputValue(), '', 'lúc đầu: giữ hệ đang chọn');
  await pg.the('cd');
  await pg.bam('Điền gợi ý cho mẫu còn trống');
  await pg.the('ve');
  eq(await o_he.inputValue(), '151076', 'điền gợi ý xong, form đang ở mẫu D2QT → lấy hệ cửa đi');
  await pg.the('cd');
  await pg.h.locator('section[data-s="cd"] .hang:has(b:text-is("D2QT")) select').selectOption('155849');
  await pg.the('ve');
  eq(await o_he.inputValue(), '155849', 'đổi tay trong bảng → form theo');
  await o_he.selectOption('71881'); // người dùng tự chọn hệ khác ngay trên form
  await pg.the('cd');
  await pg.bam('Điền gợi ý cho mẫu còn trống');
  await pg.the('ve');
  eq(await o_he.inputValue(), '71881', 'điền gợi ý lần nữa không đè lựa chọn trên form');
  eq(pg.loi, [], 'không lỗi script');
  await pg.context().close();
});

T('Tự chia ô: bật từ mẫu đang có, bấm ô trên hình, chia, đổi kiểu, nhập kích thước, vẽ, lưu thành mẫu xưởng', async () => {
  const pg = await mo();
  await pg.K(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.h.locator('button.mo').click();
  await pg.bam('Tự chia ô');
  eq(await pg.h.locator('.xem svg rect[data-o]').count(), 2, 'mẫu D2QT đổi sang tự chia: giữ đủ 2 ô (ô thoáng + ô 2 cánh)');
  ok(!(await pg.h.locator('.cot-trai .hang:has(> label:text-is("Phần chính"))').isVisible()), 'ẩn các ô nhập theo vùng');
  await pg.h.locator('.xem svg rect[data-o="0"]').click({ force: true });
  ok(/Đang chọn ô 1/.test(await pg.h.locator('.tudo').innerText()), 'bấm ô trên hình → chọn ô 1');
  await pg.bam('Chia đứng 3', '.tudo');
  eq(await pg.h.locator('.xem svg rect[data-o]').count(), 4, 'ô thoáng chia 3 → 4 ô');
  await pg.h.locator('.tudo select').selectOption('hat');
  await pg.h.locator('.xem svg rect[data-o="2"]').click({ force: true });
  await pg.h.locator('.tudo select').selectOption('fix');
  await pg.h.locator('.xem svg rect[data-o="0"]').click({ force: true });
  await pg.h.locator('.tudo input.so').fill('400'); await pg.h.locator('.tudo input.so').press('Enter');
  await pg.h.locator('.tudo input.so').blur();
  await pg.waitForTimeout(100);
  const cay = await pg.K(() => JSON.parse(localStorage.getItem('mnwd.form')).tu_do);
  eq([cay.chia, cay.phan[0].n.chia, cay.phan[0].n.phan[0].kt, cay.phan[0].n.phan[0].n.kieu, cay.phan[0].n.phan[2].n.kieu], ['ngang', 'dung', 400, 'hat', 'fix'], 'cây lưu đúng: ô thoáng chia 3, ô đầu rộng 400 kiểu hất, ô thứ 3 đổi lại fix', cay);
  await pg.bam('Vẽ vào WindoorCraft'); await pg.waitForTimeout(300);
  ok(/Đối chiếu với bản vẽ: khớp/.test(await pg.h.locator('.cot-phai .tb').first().innerText()), 'vẽ được, đối chiếu khớp', await pg.h.locator('.cot-phai .tb').first().innerText());
  ok((await pg.K(() => K.nk.lenh)).filter((l) => /^do /.test(l)).length === 3, '3 đố: 1 ngang + 2 đứng trong ô thoáng');
  await pg.bam('Lưu mẫu');
  await pg.h.locator('.cot-phai .tb.hoi input').first().fill('TX1');
  await pg.bam('Lưu mẫu', '.tb.hoi');
  await pg.bam('Cửa đi', '.nhom'); await pg.h.locator('.mau[data-ma="D2Q"]').click();
  ok(!(await pg.h.locator('.tudo').isVisible()), 'chọn mẫu sẵn → về Theo mẫu');
  await pg.bam('Mẫu của xưởng', '.nhom'); await pg.h.locator('.mau[data-ma="TX1"]').click();
  eq(await pg.h.locator('.xem svg rect[data-o]').count(), 4, 'mẫu xưởng TX1 giữ nguyên hình thái tự chia');
  eq(pg.loi, [], 'không lỗi script');
  await pg.screenshot({ path: '/tmp/claude-0/-home-claude/f67750d6-7096-54a7-9c14-4d44a6ad1bfa/scratchpad/tudo.png' });
  await pg.context().close();
});

T('Giá: vẽ xong hiện giá; tính giá cả danh sách không lưu; mở báo giá', async () => {
  const pg = await mo();
  await pg.K(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.h.locator('button.mo').click();
  await pg.bam('Vẽ vào WindoorCraft');
  await pg.h.locator('.gia b').first().waitFor({ timeout: 5000 });
  ok(/Giá theo WindoorCraft: [\d.]+ đ · 1 bộ · 3,78 m²/.test(await pg.h.locator('.gia').innerText()), 'giá hiện ngay dưới kết quả vẽ', await pg.h.locator('.gia').innerText());
  await pg.h.locator('input[placeholder="D1"]').fill('D1');
  await pg.bam('+ Danh sách');
  await pg.bam('Cửa sổ', '.nhom'); await pg.h.locator('.mau[data-ma="S2L"]').click();
  await pg.h.locator('.cot-trai input.so').nth(2).fill('2').catch(() => {});
  await pg.bam('+ Danh sách');
  await pg.the('ds');
  await pg.bam('Tính giá 2 dòng');
  ok(/Không lưu/.test(await pg.h.locator('section[data-s="ds"] .tb.hoi').innerText()), 'nói rõ không lưu');
  await pg.bam('Tính giá', 'section[data-s="ds"] .tb.hoi');
  await pg.h.locator('section[data-s="ds"] .tb.tot').waitFor({ timeout: 15000 });
  const cot = await pg.h.locator('section[data-s="ds"] tbody tr td:nth-child(5)').allInnerTexts();
  ok(cot.length === 2 && cot.every((x) => /^\d{1,3}(\.\d{3})+$/.test(x)), 'cột Thành tiền có số', cot);
  eq(await pg.K(() => K.da_luu.length), 0, 'không lưu gì vào WindoorCraft');
  eq(await pg.h.locator('section[data-s="ds"] .tt').allInnerTexts(), ['Chưa vẽ', 'Chưa vẽ'], 'trạng thái vẫn chưa lưu');
  ok(/Tổng 2 dòng có giá: [\d.]+ đ/.test(await pg.h.locator('.tong-gia:not(.sx)').innerText()), 'tổng cộng');
  ok(/Giá vốn [\d.]+ đ \([\d,]+ kg nhôm\) · lãi -?[\d.]+ đ \(-?[\d,]+%\)/.test(await pg.h.locator('.tong-gia:not(.sx)').innerText()), 'tổng có giá vốn, kg nhôm, lãi', await pg.h.locator('.tong-gia:not(.sx)').innerText());
  const lai0 = await pg.h.locator('section[data-s="ds"] tbody tr td:nth-child(6)').first().innerText();
  await pg.the('cd');
  const o_nhom = pg.h.locator('section[data-s="cd"] .hang:has(> label:text-is("Nhôm chung")) input');
  await o_nhom.fill('100000'); await o_nhom.press('Tab');
  ok(await pg.h.locator('section[data-s="cd"] b:text-is("XF-1")').count() === 1, 'bảng giá vốn hiện mã nhôm đã gặp');
  await pg.the('ds');
  const lai1 = await pg.h.locator('section[data-s="ds"] tbody tr td:nth-child(6)').first().innerText();
  ok(lai0 !== lai1 && /^[\d.]+ · [\d,]+%$/.test(lai1), 'đặt giá nhôm 100.000 đ/kg → lãi tự tính lại, không cần vẽ lại', [lai0, lai1]);
  await pg.K(() => { window.__bg = null; window.open = (u) => { window.__bg = u; return {}; }; });
  await pg.bam('Báo giá', '.tong-gia');
  const html = await pg.K(async () => (await fetch(window.__bg)).text());
  ok(html && /BÁO GIÁ CỬA NHÔM KÍNH/.test(html) && (html.match(/<svg/g) || []).length === 2 && /MỘT NHÀ DESIGN/.test(html), 'trang báo giá có 2 dòng kèm hình');
  eq(pg.loi, [], 'không lỗi script');
  await pg.setContent(html); await pg.waitForTimeout(200);
  await pg.screenshot({ path: '/tmp/claude-0/-home-claude/f67750d6-7096-54a7-9c14-4d44a6ad1bfa/scratchpad/baogia.png', fullPage: true });
  await pg.context().close();
});

T('Rời trang Thiết kế khi bản vẽ còn dở: hỏi trước', async () => {
  const pg = await mo();
  await pg.K(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.h.locator('button.mo').click();
  await pg.bam('+ Danh sách'); await pg.the('ds');
  await pg.bam('Vẽ và lưu cả 1 dòng vào một đơn hàng'); await pg.bam('Bắt đầu');
  await pg.h.locator('section[data-s="ds"] .tb.tot').waitFor({ timeout: 15000 });
  await pg.K(() => { webcc.shapeManager.addMullion(new K.Line(new K.Pt(700, 1500), new K.Vec(0, 1))); webcc.shapeManager._ban = true; }); // người dùng sửa tay sau khi lưu
  await pg.bam('Tối ưu cắt');
  ok(/chưa lưu.*sẽ mất khi rời trang Thiết kế/.test(await pg.h.locator('section[data-s="ds"] .tb.hoi').innerText()), 'hỏi trước khi rời trang');
  eq(await pg.K(() => K.draw.$route.name), 'draw', 'chưa rời trang');
  await pg.bam('Thôi');
  eq(await pg.K(() => K.draw.$route.name), 'draw', 'Thôi → ở lại');
  await pg.bam('Tối ưu cắt'); await pg.bam('Vẫn mở');
  eq(await pg.K(() => K.draw.$route.name), 'orders.cutOptimizer', 'Vẫn mở → sang trang tối ưu');
  eq(pg.loi, [], 'không lỗi script');
  await pg.context().close();
});

T('Hàng loạt gặp lỗi lưu: dừng ở dòng lỗi, không lưu bừa', async () => {
  const pg = await mo({ q: '?loi_luu=1' });
  await pg.K(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.h.locator('button.mo').click();
  await pg.bam('+ Danh sách'); await pg.bam('+ Danh sách');
  await pg.the('ds');
  await pg.bam('Vẽ và lưu cả 2 dòng vào một đơn hàng'); await pg.bam('Bắt đầu');
  await pg.h.locator('section[data-s="ds"] .tb.loi').waitFor({ timeout: 15000 });
  ok(/Đã vẽ và lưu 0 \/ 2 dòng[\s\S]*WindoorCraft báo: Lưu thất bại/.test(await pg.h.locator('section[data-s="ds"] .tb.loi').innerText()), 'nêu lỗi của WindoorCraft', await pg.h.locator('section[data-s="ds"] .tb.loi').innerText());
  eq(await pg.h.locator('section[data-s="ds"] .tt').allInnerTexts(), ['Lỗi', 'Chưa vẽ'], 'dòng 1 lỗi, dòng 2 chưa đụng tới');
  eq(await pg.K(() => K.da_luu.length), 0, 'không có gì được lưu');
  await pg.context().close();
});

T('Vẽ từng dòng, tự bấm Lưu lại → dòng chuyển Đã lưu', async () => {
  const pg = await mo();
  await pg.K(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.h.locator('button.mo').click();
  await pg.bam('+ Danh sách'); await pg.the('ds');
  await pg.bam('Vẽ dòng kế'); await pg.waitForTimeout(300);
  eq(await pg.h.locator('section[data-s="ds"] .tt').allInnerTexts(), ['Đã vẽ'], 'đã vẽ');
  await pg.locator('#nut-luu').click();
  await pg.h.locator('section[data-s="ds"] .tt.da_luu').waitFor({ timeout: 5000 });
  eq(await pg.h.locator('section[data-s="ds"] .tt').allInnerTexts(), ['Đã lưu'], 'tự nhận biết đã lưu');
  await pg.context().close();
});

T('Mẫu của xưởng, sửa dòng, hệ nhôm nhớ theo mẫu, gợi ý', async () => {
  const pg = await mo();
  await pg.K(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.h.locator('button.mo').click();
  await pg.h.locator('.cot-trai .hang:has(> label:text-is("Hệ nhôm")) select').selectOption('151076');
  await pg.bam('Vẽ vào WindoorCraft'); await pg.waitForTimeout(400);
  eq(await pg.K(() => K.oi.order_info.product_id), 151076, 'vẽ bằng hệ đã chọn');
  ok(/Đã nhớ hệ này cho mẫu D2QT/.test(await pg.h.locator('.cot-trai').innerText()), 'nhớ hệ nhôm theo mẫu sau khi vẽ');
  await pg.bam('Lưu mẫu');
  await pg.h.locator('.cot-phai .tb.hoi input').first().fill('x1');
  await pg.bam('Lưu mẫu', '.tb.hoi');
  ok(/Đã lưu mẫu X1/.test(await pg.h.locator('.cot-phai .tb.tot').innerText()), 'lưu mẫu riêng');
  eq(await pg.h.locator('.nhom button').first().innerText(), 'Mẫu của xưởng', 'có nhóm Mẫu của xưởng');
  await pg.bam('+ Danh sách'); await pg.the('ds');
  await pg.bam('Sửa');
  await pg.o(O.rong).fill('1500');
  await pg.h.getByRole('button', { name: /Cập nhật dòng/ }).click();
  ok(/1500 × 2700/.test(await pg.h.locator('section[data-s="ds"] tbody tr').first().innerText()), 'sửa dòng rồi cập nhật');
  await pg.the('cd');
  await pg.bam('Điền gợi ý cho mẫu còn trống');
  const g = await pg.K(() => JSON.parse(localStorage.getItem('mnwd.caidat')).he_nhom_theo_mau);
  eq([g.D2QT, g.X1, g.D2Q, g.S2L, g.D2L, g.DX4, g.V1], [151076, 151076, 151076, 152612, 71881, 71888, 155849], 'gợi ý theo tên hệ nhôm, giữ cái đã gán');
  ok(/phỏng đoán/.test(await pg.h.locator('section[data-s="cd"] .tb.cb').innerText()), 'nói rõ là phỏng đoán');
  eq(pg.loi, [], 'không lỗi script');
  await pg.context().close();
});

T('Màn hình hẹp: một cột, vẫn vẽ được; chưa mở trang vẽ thì báo', async () => {
  const pg = await mo({ rong: 1366, cao: 768 });
  ok(!(await pg.h.locator('.bang').getAttribute('class')).includes('haicot'), 'một cột ở 1366');
  const r = await pg.h.locator('.bang').boundingBox();
  ok(r.x + r.width <= 1366 && r.y + r.height <= 768, 'bảng nằm trong màn hình', r);
  await pg.bam('Vẽ vào WindoorCraft'); await pg.waitForTimeout(250);
  ok(!(await pg.K(() => webcc.shapeManager.isEmpty)), 'vẽ được');
  await pg.K(() => { K.draw.$route.name = 'home'; });
  await pg.waitForTimeout(1400);
  ok(/không phải trang Thiết kế/.test(await pg.h.locator('.chan .chu').innerText()), 'thanh trạng thái báo chưa ở trang vẽ', await pg.h.locator('.chan .chu').innerText());
  ok(await pg.h.getByRole('button', { name: 'Mở Thiết kế' }).isVisible(), 'có nút Mở Thiết kế');
  // nút mở bảng: chỉ hiện ở trang Thiết kế, nằm trên thanh trên cùng
  await pg.bam('×'); await pg.waitForTimeout(1400);
  ok(!(await pg.h.locator('button.mo').isVisible()), 'đang ở trang khác (trang chủ, đơn hàng, trang In…) → không hiện nút mở');
  await pg.K(() => { K.draw.$route.name = 'draw'; });
  await pg.waitForTimeout(1400);
  ok(await pg.h.locator('button.mo').isVisible(), 'về trang Thiết kế → nút mở hiện lại');
  const b = await pg.h.locator('button.mo').boundingBox();
  ok(b.y < 40 && b.x > 130 && b.x + b.width < 330, 'nút nằm trên thanh trên cùng, cạnh logo', b);
  await pg.context().close();
});

T('Mở lại bộ đã lưu: thanh trạng thái vẫn ghi tên hệ nhôm', async () => {
  const pg = await mo();
  await pg.K(() => { K.oi.order_info.product_name = ''; }); // WindoorCraft để trống tên khi mở bộ đã lưu
  await pg.waitForTimeout(1400);
  ok(/XINGFA-55-Vách kính cố định/.test(await pg.h.locator('.chan .chu').innerText()), 'tra tên theo mã trong danh mục', await pg.h.locator('.chan .chu').innerText());
  await pg.context().close();
});

T('Nhân viên: khoá PIN ẩn giá vốn, lãi; mở lại bằng PIN', async () => {
  const pg = await mo();
  await pg.K(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.h.locator('button.mo').click();
  await pg.bam('Vẽ vào WindoorCraft');
  await pg.h.locator('.gia b').first().waitFor({ timeout: 5000 });
  ok(/Giá vốn/.test(await pg.h.locator('.gia').innerText()), 'chủ: thấy giá vốn');
  await pg.bam('+ Danh sách');
  await pg.h.locator('.dau button.khoa').click(); // chưa có PIN → sang Cài đặt
  ok(await pg.h.locator('section[data-s="cd"]').isVisible(), 'chưa có PIN → mở Cài đặt');
  await pg.h.locator('input[data-pin]').fill('12');
  await pg.bam('Đặt mã và khoá');
  ok(/4–8 chữ số/.test(await pg.h.locator('section[data-s="cd"]').innerText()), 'PIN ngắn bị từ chối');
  await pg.h.locator('input[data-pin]').fill('2468');
  await pg.bam('Đặt mã và khoá');
  eq(await pg.h.locator('.dau button.khoa').innerText(), '🔒');
  const cd = await pg.h.locator('section[data-s="cd"]').innerText();
  ok(!/Giá vốn \(tính lãi/i.test(cd) && /Mở khoá/.test(cd), 'ẩn bảng giá vốn, hiện ô mở khoá');
  ok(!/2468/.test(await pg.K(() => JSON.stringify(localStorage))), 'không lưu PIN dạng chữ');
  await pg.the('ds');
  const ths = await pg.h.locator('section[data-s="ds"] thead th').allInnerTexts();
  ok(ths.indexOf('Lãi') < 0, 'ẩn cột Lãi', ths);
  await pg.the('ve'); await pg.bam('Vẽ vào WindoorCraft');
  await pg.waitForTimeout(150);
  await pg.bam('Vẽ đè', '.cot-phai').catch(() => {});
  await pg.h.locator('.gia b').first().waitFor({ timeout: 5000 });
  ok(!/Giá vốn|lãi/.test(await pg.h.locator('.gia').innerText()), 'giá sau vẽ không có giá vốn', await pg.h.locator('.gia').innerText());
  await pg.h.locator('.dau button.khoa').click();
  await pg.h.locator('input[data-pin]').fill('1111'); await pg.bam('Mở khoá');
  ok(/Sai mã PIN/.test(await pg.h.locator('section[data-s="cd"]').innerText()), 'sai PIN');
  await pg.h.locator('input[data-pin]').fill('2468'); await pg.bam('Mở khoá');
  eq(await pg.h.locator('.dau button.khoa').innerText(), '🔓');
  ok(/Giá vốn \(tính lãi/i.test(await pg.h.locator('section[data-s="cd"]').innerText()), 'mở khoá → hiện lại');
  await pg.h.locator('.dau button.khoa').click(); // đã có PIN → khoá ngay
  eq(await pg.h.locator('.dau button.khoa').innerText(), '🔒', 'khoá nhanh bằng nút');
  eq(pg.loi, [], 'không lỗi script');
  await pg.context().close();
});

T('Sản xuất: bản vẽ SX tiếng Việt, file cắt Excel, gửi máy cắt — không lưu đơn', async () => {
  const pg = await mo();
  await pg.K(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.h.locator('button.mo').click();
  await pg.h.locator('input[placeholder="D1"]').fill('D1');
  await pg.bam('+ Danh sách');
  await pg.bam('Cửa sổ', '.nhom'); await pg.h.locator('.mau[data-ma="S2L"]').click();
  await pg.bam('+ Danh sách');
  await pg.the('ds');
  await pg.bam('File cắt Excel');
  ok(/2 dòng.*chưa có số bóc tách.*không lưu/is.test(await pg.h.locator('section[data-s="ds"] .tb.hoi').innerText()), 'hỏi trước khi vẽ để bóc tách');
  const [tai] = await Promise.all([pg.waitForEvent('download', { timeout: 20000 }), pg.bam('Làm', 'section[data-s="ds"] .tb.hoi')]);
  ok(/^cat-nhom-.*\.xlsx$/.test(tai.suggestedFilename()), 'tên file', tai.suggestedFilename());
  const f = '/tmp/claude-0/-home-claude/f67750d6-7096-54a7-9c14-4d44a6ad1bfa/scratchpad/cat-thu.xlsx';
  await tai.saveAs(f);
  const r = require('child_process').execFileSync('python3', ['-c', "import openpyxl,sys;wb=openpyxl.load_workbook(sys.argv[1]);ws=wb['Cat nhom'];print(ws.max_row, ws['B2'].value, type(ws['E2'].value).__name__)", f]).toString().trim();
  ok(/^7 XF55-0\d (int|float)$/.test(r), 'Excel: 6 dòng cắt, chiều dài là số', r);
  eq(await pg.K(() => K.da_luu.length), 0, 'không lưu gì vào WindoorCraft');
  // bản vẽ SX: đã có bóc tách → mở ngay, có ảnh WindoorCraft
  await pg.K(() => { window.__bv = null; window.open = (u) => { window.__bv = u; return {}; }; });
  await pg.bam('Bản vẽ SX');
  const html = await pg.K(async () => (await fetch(window.__bv)).text());
  ok(/BẢN VẼ SẢN XUẤT/.test(html) && (html.match(/class="trang"/g) || []).length === 2 && (html.match(/<img src="data:image\/png/g) || []).length === 2 && /Khung bao/.test(html), 'bản vẽ 2 trang có hình + thanh nhôm');
  // gửi máy cắt
  let nhan = null;
  await pg.route('https://sxnhom.motnha.vn/api/don', async (rt) => { nhan = { h: rt.request().headers(), b: JSON.parse(rt.request().postData()) }; await rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, ma: 'C0001', moi: true, so_dong: 6, trang_thai: 'san_xuat', canh_bao: [] }) }); });
  await pg.bam('Gửi xưởng');
  await pg.h.locator('section[data-s="ds"] .tb.tot:has-text("Đã gửi")').waitFor({ timeout: 5000 });
  ok(nhan && nhan.b.bo.length === 2 && nhan.b.bo[0].boc_tach.nhom.length === 3 && !('anh' in nhan.b.bo[0]) && nhan.b.bo[0].gia && nhan.b.bo[0].gia.tong > 0, 'gửi số bóc tách + giá, không gửi ảnh');
  await pg.unroute('https://sxnhom.motnha.vn/api/don');
  await pg.route('https://sxnhom.motnha.vn/api/don', (rt) => rt.fulfill({ status: 401, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"ok":false,"loi":"Sai khoá"}' }));
  await pg.bam('Gửi xưởng');
  await pg.h.locator('section[data-s="ds"] .tb.loi').waitFor({ timeout: 5000 });
  ok(/Sai khoá/.test(await pg.h.locator('section[data-s="ds"] .tb.loi').innerText()), 'báo lỗi máy chủ');
  eq(pg.loi, [], 'không lỗi script');
  await pg.context().close();
});

(async () => { br = await chromium.launch(); await chay('bảng điều khiển'); await br.close(); })();
