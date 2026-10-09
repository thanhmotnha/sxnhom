# Một Nhà · Lấy file cắt về máy cắt nhôm (Windows 7, PowerShell 2.0 trở lên)
# Cứ 30 giây hỏi máy chủ xưởng: có đơn mới thì tải file Excel (và CSV) vào thư mục nhập của phần mềm máy cắt.
# Sửa 3 dòng dưới cho đúng rồi chạy bằng file chay-lay-file.bat.
$MayChu  = "https://sxnhom.motnha.vn"     # địa chỉ máy chủ xưởng
$Khoa    = "DIEN-KHOA-XUONG"              # khoá do máy chủ cấp (biến KHOA)
$ThuMuc  = "D:\NhapCat"                   # thư mục phần mềm máy cắt nhập file (数据导入)
$LayCsv  = $true                          # tải thêm file CSV (nếu phần mềm máy cắt không đọc .xlsx)
$Nhip    = 30                             # giây

# Windows 7: bật TLS 1.2 (cần .NET Framework 4.5 trở lên; không có thì dùng http:// trong mạng nội bộ)
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType] 3072 } catch { Write-Host "Chua bat duoc TLS 1.2 - cai .NET 4.5+ hoac dung http noi bo" }
if (!(Test-Path $ThuMuc)) { New-Item -ItemType Directory -Path $ThuMuc | Out-Null }
$Nhat = Join-Path $ThuMuc "_nhat-ky-lay-file.txt"
function Ghi($s) { $d = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss") + "  " + $s; Write-Host $d; Add-Content -Path $Nhat -Value $d }
function Web() { $w = New-Object System.Net.WebClient; $w.Headers.Add("X-Khoa", $Khoa); $w.Encoding = [System.Text.Encoding]::UTF8; return $w }

Ghi "Bat dau lay file tu $MayChu vao $ThuMuc"
while ($true) {
  try {
    $json = (Web).DownloadString("$MayChu/api/don?moi=1")
    # PowerShell 2.0 không có ConvertFrom-Json: đọc mã đơn và tên tệp bằng biểu thức chính quy
    $ds = [regex]::Matches($json, '"ma":"(C\d{6}-\d+)".*?"tep":"([^"]+)"')
    foreach ($m in $ds) {
      $ma = $m.Groups[1].Value; $tep = $m.Groups[2].Value
      $dich = Join-Path $ThuMuc ($tep + ".xlsx")
      (Web).DownloadFile("$MayChu/tai/$ma.xlsx", $dich)
      if ($LayCsv) { (Web).DownloadFile("$MayChu/tai/$ma.csv", (Join-Path $ThuMuc ($tep + ".csv"))) }
      (Web).UploadString("$MayChu/api/don/$ma/da-lay", "POST", "") | Out-Null
      Ghi "Da lay $ma -> $dich"
    }
  } catch { Ghi ("Loi: " + $_.Exception.Message) }
  Start-Sleep -Seconds $Nhip
}
