/* nút In trên bản vẽ sản xuất (không dùng mã chèn trong trang) */
document.addEventListener('click', function (e) { if (e.target && e.target.classList && e.target.classList.contains('in')) window.print(); });
