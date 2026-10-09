/* Dựng bộ cài: node build.js
 *  dist/mn-windoor.js            — toàn bộ mã gộp một file (nạp thẳng vào trang để thử)
 *  dist/extension/               — tiện ích Chrome (Load unpacked)
 *  dist/mn-windoor.user.js       — bản Tampermonkey
 */
const fs = require('fs');
const path = require('path');
const R = (...p) => path.join(__dirname, ...p);
const doc = (f) => fs.readFileSync(R(f), 'utf8');
const THU_TU = ['src/mnwd-core.js', 'src/mnwd-preview.js', 'src/mnwd-sanxuat.js', 'src/mnwd-driver.js', 'src/mnwd-ui.js', 'src/mnwd-main.js'].filter((f) => fs.existsSync(R(f)));
const core = doc('src/mnwd-core.js');
const V = (core.match(/M\.PHIEN_BAN = '([^']+)'/) || [])[1];
if (!V) throw new Error('Không đọc được phiên bản trong mnwd-core.js');
const than = THU_TU.map((f) => '// ===== ' + f + ' =====\n' + doc(f)).join('\n');
const dau = '/* Một Nhà · Vẽ cửa v' + V + ' — tiện ích vẽ cửa nhôm trong WindoorCraft. */\n';
fs.mkdirSync(R('dist/extension'), { recursive: true });
fs.writeFileSync(R('dist/mn-windoor.js'), dau + than);
// tiện ích = bản gốc (goc.js, bọc trong hàm, chưa chạy) + bộ nạp tự cập nhật (nap.js) chọn bản mới nhất có chữ ký đúng
const KHO_GITHUB = 'thanhmotnha/sxnhom';
if (fs.existsSync(R('dist/extension/mn-windoor.js'))) fs.unlinkSync(R('dist/extension/mn-windoor.js'));
fs.writeFileSync(R('dist/extension/goc.js'), dau + 'window.__mnwd_goc = { ban: ' + JSON.stringify(V) + ', chay: function () {\n' + than + '\n} };\n');
fs.writeFileSync(R('dist/extension/nap.js'), doc('src/nap.js').replace('__KHOA_CONG__', JSON.stringify(JSON.parse(doc('src/khoa-cong.json')))).replace('__NGUON__', JSON.stringify('https://raw.githubusercontent.com/' + KHO_GITHUB + '/main/dist/phat-hanh.json')));
// Chỉ chạy ở máy chủ xưởng đang dùng và đã thử (ln). Dùng máy chủ khác của WindoorCraft thì thêm địa chỉ vào đây rồi dựng lại.
const TRANG = ['https://ln.windoorcraft.com/*'];
fs.writeFileSync(R('dist/extension/manifest.json'), JSON.stringify({
  manifest_version: 3,
  name: 'Một Nhà · Vẽ cửa',
  short_name: 'MN Vẽ cửa',
  version: V,
  description: 'Vẽ cửa nhôm vào WindoorCraft, báo giá, bản vẽ sản xuất, file cắt nhôm. Tự cập nhật (có kiểm chữ ký).',
  icons: { 16: 'icon16.png', 48: 'icon48.png', 128: 'icon128.png' },
  content_scripts: [{ matches: TRANG, js: ['goc.js', 'nap.js'], run_at: 'document_idle', world: 'MAIN' }],
}, null, 2) + '\n');
fs.writeFileSync(R('dist/mn-windoor.user.js'), [
  '// ==UserScript==', '// @name         Một Nhà · Vẽ cửa', '// @namespace    motnha.vn', '// @version      ' + V,
  '// @description  Vẽ cửa nhôm vào WindoorCraft từ kích thước và mẫu có sẵn', ...TRANG.map((t) => '// @match        ' + t),
  '// @run-at       document-idle', '// @grant        none', '// ==/UserScript==', '',
].join('\n') + dau + than);
for (const c of [16, 48, 128]) { const f = R('assets/icon' + c + '.png'); if (fs.existsSync(f)) fs.copyFileSync(f, R('dist/extension/icon' + c + '.png')); }
// máy chủ xưởng dùng chung logic sản xuất
fs.mkdirSync(R('server/lib'), { recursive: true });
fs.copyFileSync(R('src/mnwd-sanxuat.js'), R('server/lib/mnwd-sanxuat.js'));
console.log('Đã dựng v' + V + ': ' + THU_TU.length + ' file nguồn, ' + (dau + than).length + ' ký tự');
