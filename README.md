# Family Finance

Ứng dụng quản lý tài chính gia đình: theo dõi quỹ, đầu tư, tiết kiệm, vàng, giao dịch và phân bổ ngân sách hàng tháng với gợi ý từ AI.

**Stack:** Next.js 14 (App Router) · Supabase · Tailwind CSS · Recharts · Capacitor (iOS)

## Yêu cầu

- Node.js 18+
- Tài khoản Supabase
- (Tuỳ chọn) Gemini API key để dùng tính năng gợi ý phân bổ AI

## Setup

```bash
npm install
cp .env.example .env.local   # rồi điền các giá trị thật
npm run dev
```

## Biến môi trường

Tạo file `.env.local` (không commit lên git) với các biến sau:

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | URL Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Anon public key (an toàn để lộ ra client) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Service role key — **CHỈ DÙNG SERVER-SIDE**, tuyệt đối không commit |
| `GEMINI_API_KEY` | tuỳ chọn | API key cho Gemini AI |

> **Lưu ý bảo mật:**
> - Đừng bao giờ thêm prefix `NEXT_PUBLIC_` cho service role key hay API key — Next.js sẽ nhúng chúng vào browser bundle.
> - Trên Vercel: thêm các biến này ở Settings → Environment Variables, không commit `.env.local`.

## Scripts

```bash
npm run dev      # chạy local
npm run build    # build production
npm run start    # chạy production build
```

## Deploy

Push lên `main` → Vercel tự động deploy.
