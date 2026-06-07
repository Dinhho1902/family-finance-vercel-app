# Tasks — Family Finance App

## Active

### Verify sau deploy Vercel
- [ ] Test đồng bộ giá vàng (SYNC_PRICE → vang.today)
- [ ] Test thêm / sửa / xóa tiết kiệm
- [ ] Test thêm / sửa / xóa quỹ
- [ ] Test tạo giao dịch (Income, Expense, Transfer) → kiểm tra số dư quỹ cập nhật đúng
- [ ] Test lưu phân bổ tháng
- [ ] Test gợi ý AI phân bổ (Gemini) — xem reason có context thực chất không

---

## Someday / Backlog

### Tính năng
- [ ] Nâng cấp AI phân tích đầu tư: P&L từng mã, so sánh với mục tiêu
- [ ] Thông báo khi quỹ sắp đến deadline (≤ 7 ngày)
- [ ] Export báo cáo tháng (PDF hoặc CSV)

---

## Hoàn thành ✅

- [x] Security audit: xóa NEXT_PUBLIC_ khỏi Google private key
- [x] Xóa Google Sheets dead code (699 dòng) — migrate hoàn toàn sang Supabase
- [x] Bảo vệ API routes bằng auth (middleware trả 401)
- [x] Fix bug allocation: gap/daysRemaining chưa được tính → tiền đổ vào surplus fund
- [x] Fix duplicate allocation history khi ghi đè cùng tháng
- [x] Tạo /api/allocation/save bị thiếu sau khi xóa interceptor
- [x] Tạo 4 API routes bị thiếu: /api/gold, /api/funds, /api/savings, /api/transactions
- [x] Nâng cấp AI prompt: context quỹ, % đạt mục tiêu, dự kiến tháng đạt mục tiêu
- [x] README + .env.example
- [x] Kết nối GitHub → Vercel auto-deploy
