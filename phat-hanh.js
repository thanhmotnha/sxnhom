/* Phát hành bản mới cho mọi máy tự cập nhật:
 *   MNWD_KHOA=/đường/dẫn/khoa-ky-phat-hanh.pem node phat-hanh.js "ghi chú bản mới"
 * → dựng, ký dist/mn-windoor.js, ghi dist/phat-hanh.json. Sau đó:
 *   git add -A && git commit -m "vX.Y.Z" && git push origin main
 * Khoá riêng (.pem) KHÔNG đưa lên GitHub. Mất khoá → tạo khoá mới, cài lại tiện ích một lần trên mỗi máy.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const R = (...p) => path.join(__dirname, ...p);
const KHO_GITHUB = 'thanhmotnha/sxnhom';
const kp = process.env.MNWD_KHOA;
if (!kp || !fs.existsSync(kp)) { console.error('Thiếu khoá ký: đặt MNWD_KHOA=<đường dẫn khoa-ky-phat-hanh.pem>'); process.exit(1); }
cp.execFileSync(process.execPath, [R('build.js')], { stdio: 'inherit' });
const ma = fs.readFileSync(R('dist/mn-windoor.js'));
const V = (ma.toString('utf8').match(/M\.PHIEN_BAN = '([^']+)'/) || [])[1];
const khoa = crypto.createPrivateKey(fs.readFileSync(kp));
const ky = crypto.sign('sha256', ma, { key: khoa, dsaEncoding: 'ieee-p1363' }).toString('base64');
const cong = crypto.createPublicKey({ key: JSON.parse(fs.readFileSync(R('src/khoa-cong.json'), 'utf8')), format: 'jwk' });
if (!crypto.verify('sha256', ma, { key: cong, dsaEncoding: 'ieee-p1363' }, Buffer.from(ky, 'base64'))) { console.error('Khoá riêng không khớp khoá công khai trong src/khoa-cong.json'); process.exit(1); }
const ph = { ban: V, tep: 'https://raw.githubusercontent.com/' + KHO_GITHUB + '/main/dist/mn-windoor.js', sha256: crypto.createHash('sha256').update(ma).digest('hex'), chu_ky: ky, luc: new Date().toISOString(), ghi_chu: process.argv.slice(2).join(' ') };
fs.writeFileSync(R('dist/phat-hanh.json'), JSON.stringify(ph, null, 2) + '\n');
console.log('Đã ký v' + V + '. Tiếp: git add -A && git commit -m "v' + V + '"&& git push origin main');
