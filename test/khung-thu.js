/* Khung thử tối giản: T(tên, hàm) — eq / ok / co — chạy tuần tự, hỗ trợ hàm async. */
const ds = [];
let dat = 0, hong = 0;
const loi = [];
function T(ten, f) { ds.push([ten, f]); }
function ghi(dk, nhan, them) { if (dk) dat++; else { hong++; loi.push('   ✗ ' + nhan + (them !== undefined ? '\n       ' + (typeof them === 'string' ? them : JSON.stringify(them)) : '')); } }
function eq(a, b, nhan) { const x = JSON.stringify(a), y = JSON.stringify(b); ghi(x === y, nhan, 'có  ' + x + '\n       cần ' + y); }
function ok(dk, nhan, them) { ghi(!!dk, nhan, them); }
function gan(a, b, nhan, ss) { ghi(Math.abs(a - b) <= (ss || 0.01), nhan, 'có ' + a + ' cần ' + b); }
function co(mang, re) { return (mang || []).some((s) => re.test(s)); }
async function chay(ten_bo) {
  for (const [ten, f] of ds) {
    const h0 = hong; loi.length = 0;
    try { await f(); } catch (e) { hong++; loi.push('   ✗ NÉM LỖI: ' + (e && e.stack || e)); }
    console.log((hong === h0 ? ' ✓ ' : ' ✗ ') + ten);
    if (hong !== h0) console.log(loi.join('\n'));
  }
  console.log((hong ? 'HỎNG' : 'ĐẠT') + ' — ' + ten_bo + ': ' + dat + ' kiểm tra đạt, ' + hong + ' hỏng');
  process.exitCode = hong ? 1 : 0;
}
module.exports = { T, eq, ok, gan, co, chay };
