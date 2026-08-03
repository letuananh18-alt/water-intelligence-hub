# 🌊 Water Intelligence Hub — Thủ Đức Water Client Portal

Water Intelligence Hub là ứng dụng web client thuần (HTML5 + CSS3 + ES Modules) dùng Supabase làm backend để quản lý người dùng, lưu trữ tài liệu và giao tiếp nội bộ cho nhân viên Thủ Đức Water. Ứng dụng giữ phong cách "zero-dependency" — có thể mở trực tiếp bằng trình duyệt hoặc chạy qua Live Server; mọi xác thực, lưu trữ và realtime được xử lý bằng Supabase (Auth, Postgres, Realtime, Storage).

---

## 🌟 Tính năng chính (Hiện trạng)
- Giao diện doanh nghiệp (Enterprise UI)
  - Theme Blue/Navy, hiệu ứng Glassmorphism và hệ thống icon (Lucide).
- Xác thực & phân quyền (Auth & RBAC)
  - Sử dụng Supabase Auth (Email/Password, Google và các provider khác).
  - Phân quyền cơ bản theo role (Admin / Member) lưu trong bảng users; truy cập được kiểm soát bằng Row Level Security (RLS) và policies.
- Lưu trữ 2 lớp (Dual Storage Vault)
  - 📁 Kho cá nhân (Personal Storage): mỗi user tải lên, xem trước và xóa file của riêng mình.
  - 🏢 Kho phòng ban (Department Vault): Admin quản lý tài liệu dùng chung (văn bản, sơ đồ, quy trình).
  - Tệp lưu trong Supabase Storage (bucket); metadata lưu trong Postgres.
- Tải tệp kéo & thả (Drag & Drop File Upload)
  - Hỗ trợ upload các định dạng phổ biến (PDF, DOCX, XLSX, JPG, AI...), hiển thị kích thước, preview và xóa.
- Chat nội bộ thời gian thực
  - Chat nhóm theo kênh (ví dụ: #Phòng Kỹ Thuật), chat 1-1; dùng Supabase Realtime (logical replication / channels) hoặc lắng nghe thay đổi bảng messages.
- Trợ lý tài liệu AI (Document Assistant)
  - Tích hợp công cụ tóm tắt / truy vấn nội dung tài liệu đã upload; dữ liệu nguồn lấy từ file metadata / text đã lưu trong Postgres hoặc vector store tùy cấu hình.
- Triển khai & vận hành
  - Ứng dụng chạy thuần client; cấu hình kết nối tới Supabase qua file js/supabase-config.js (không lưu service_role key ở client).
  - Hỗ trợ triển khai lên GitHub Pages, Vercel/Netlify hoặc bất kỳ static hosting nào.

---

## ⚙️ Cấu hình Live Supabase Backend (tóm tắt)
1. Tạo project mới tại https://app.supabase.com và ghi lại:
   - Project URL (ví dụ: https://xyzabc.supabase.co)
   - Public anon key (ANON KEY) — dùng trên client
   - Service role key — KHÔNG dùng trên client (chỉ server-side)
2. Bật Authentication: Email/Password và provider (Google) nếu cần.
3. Tạo các bảng Postgres chính (ví dụ: users, departments, files, messages, ...).
4. Bật Supabase Storage và tạo bucket cho file uploads.
5. Kích hoạt Row Level Security (RLS) cho bảng nhạy cảm và viết policies để đảm bảo:
   - Người dùng chỉ truy cập metadata/files của chính họ trừ khi có role Admin.
   - Bucket policies cho phép public/private theo nhu cầu.
6. Cập nhật client:
   - Tạo file js/supabase-config.js chứa SUPABASE_URL và SUPABASE_ANON_KEY (dùng placeholder; KHÔNG commit key nhạy cảm).
   - Thay các call Firebase trước đây bằng supabase-js: auth, from('table').select(), storage.from('bucket').upload(), realtime subscription...
7. Kiểm tra realtime: sử dụng Realtime (subscription) hoặc realtime replication trên bảng messages để sync chat.

Lưu ý bảo mật: Supabase anon key có thể xuất hiện trên client — bắt buộc phải dùng RLS + policies để bảo vệ dữ liệu; service_role key phải giữ an toàn trên server.

---

## 🚀 Chạy local & Deploy (tóm tắt)
- Local: mở trực tiếp `index.html` hoặc dùng Live Server của VS Code.
- Deploy: GitHub Pages / Vercel / Netlify (ứng dụng tĩnh) hoặc Firebase Hosting nếu bạn vẫn muốn (lưu ý chỉ hosting frontend).

---

## 📝 Ghi chú chuyển đổi từ Firebase -> Supabase
- Firestore (NoSQL) → chuyển sang Postgres (quan hệ): cần thiết kế lại schema (collections → tables, documents → rows).
- Firebase Storage → Supabase Storage: di chuyển file & cập nhật link/metadata.
- Các rule/permission Firebase → RLS policies trên Supabase.
- Realtime: Firestore listeners → Supabase Realtime (Postgres replication / real-time subscriptions).

---

Nếu bạn muốn, mình có thể:
- a) Chuẩn bị bản README đầy đủ (toàn bộ file) để bạn copy-paste, hoặc
- b) Thêm mẫu file `js/supabase-config.js` và ví dụ code thay thế chỗ dùng Firebase.

Bạn muốn mình tiếp tục theo lựa chọn nào?