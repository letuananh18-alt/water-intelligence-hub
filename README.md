# 🌊 Water Intelligence Hub (Thủ Đức Water Client Portal)

Hệ thống lưu trữ và quản lý dữ liệu thông minh, tích hợp **Firebase Backend** (Auth, Cloud Firestore, Storage), phân quyền lưu trữ **Kho cá nhân & Kho nội bộ phòng ban**, **Trò chuyện trực tiếp (Live Team Chat)** và **Trợ lý AI phân tích tài liệu**.

---

## 🌟 Tính năng nổi bật (Features)

1. **Giao diện chuẩn Doanh nghiệp (Enterprise UI)**:
   - Được thiết kế dựa theo đúng mẫu giao diện Thủ Đức Water với tông màu xanh Blue/Navy hiện đại, hiệu ứng Glassmorphism đăng nhập và hệ thống icon Lucide sắc nét.
2. **Xử lý Đăng nhập & Phân quyền (Auth & RBAC)**:
   - Hỗ trợ Firebase Authentication (Email/Password & Google Sign-in).
   - Tích hợp tính năng chuyển đổi tài khoản mẫu **Admin (Nguyễn Văn Tuấn)** và **Member (Trần Minh Anh)** ngay tại trang Đăng nhập để dùng thử nhanh.
3. **Phân chia Lưu trữ 2 Lớp (Dual Storage Vault)**:
   - 📁 **Kho cá nhân (Personal Storage)**: Mỗi user tự do tải lên, quản lý và xóa tệp của riêng mình.
   - 🏢 **Kho nội bộ phòng ban (Department Vault)**: Nơi Admin đăng tải văn bản, sơ đồ kỹ thuật, quy trình dùng chung cho toàn bộ nhân viên trong phòng xem & tải về.
4. **Kéo & Thả Tệp Thực tế (Drag & Drop File Upload)**:
   - Tải lên tệp thực tế (PDF, DOCX, XLSX, AI, JPG...) từ máy tính với dung lượng tự động tính toán, xem trước file và xóa file.
5. **Hệ thống Trò chuyện Đồng nghiệp (Real-time Team Chat)**:
   - Chat nhóm theo kênh (`# Phòng Kỹ Thuật & Vận Hành`, `# Dự Án Cấp Nước Q2`).
   - Chat 1-1 trực tiếp giữa các nhân viên và đính kèm file trong tin nhắn.
6. **Trợ lý AI Document Assistant**:
   - Tự động phân tích và tóm tắt quy trình xử lý nước sạch 6 bước (Lọc thô -> Keo tụ -> Lắng -> Lọc nhanh -> Khử trùng -> Lưu trữ), trả lời thắc mắc kỹ thuật theo thời gian thực.

---

## 🚀 Hướng dẫn Chạy ứng dụng trên Máy tính (Local Setup)

Ứng dụng được thiết kế theo dạng **Zero-Dependency Modern Web Application (HTML5 + CSS3 + ES Modules + Firebase SDK v10)**, không đòi hỏi cài đặt môi trường `npm` phức tạp.

1. **Mở trực tiếp trên trình duyệt**:
   - Double-click vào file `index.html` trong thư mục `water-intelligence-hub`.
2. **Hoặc chạy qua extension Live Server (VS Code / Antigravity IDE)**.

---

## ⚙️ Cấu hình Live Firebase Backend

Để kết nối trực tiếp với dự án Firebase của bạn trên Cloud:
1. Truy cập [Firebase Console](https://console.firebase.google.com/) và tạo một project mới.
2. Bật dịch vụ **Authentication** (Email/Password & Google), **Cloud Firestore Database**, và **Cloud Storage**.
3. Mở file [js/firebase-config.js](file:///C:/Users/letua/.gemini/antigravity/scratch/water-intelligence-hub/js/firebase-config.js) và thay thế `firebaseConfig` bằng API Keys từ Firebase Console của bạn.

---

## 🌐 Hướng dẫn Đẩy mã nguồn lên GitHub & Chạy Live trên Internet

### Bước 1: Đẩy mã nguồn lên GitHub
Mở Terminal tại thư mục dự án và thực hiện các lệnh sau:

```bash
# 1. Khởi tạo kho chứa Git
git init

# 2. Thêm toàn bộ mã nguồn
git add .

# 3. Commit mã nguồn
git commit -m "Initial commit - Water Intelligence Hub (Thủ Đức Water)"

# 4. Liên kết với Repository trên GitHub của bạn
git remote add origin https://github.com/USERNAME/water-intelligence-hub.git
git branch -M main

# 5. Đẩy mã nguồn lên GitHub
git push -u origin main
```

### Bước 2: Đưa ứng dụng lên Internet (Deploy)
* **Cách 1: Sử dụng GitHub Pages (Miễn phí & Nhanh nhất)**:
  1. Vào repository trên GitHub -> Chọn **Settings** -> **Pages**.
  2. Tại phần **Source**, chọn nhánh `main` và thư mục `/ (root)` -> Bấm **Save**.
  3. Sau 1 phút, trang web của bạn sẽ chạy trực tuyến tại địa chỉ: `https://USERNAME.github.io/water-intelligence-hub/`.

* **Cách 2: Triển khai bằng Vercel hoặc Netlify**:
  1. Đăng nhập vào [Vercel.com](https://vercel.com).
  2. Bấm **Add New Project** -> Chọn Repository GitHub `water-intelligence-hub`.
  3. Bấm **Deploy**. Vercel sẽ tự động cấp tên miền `.vercel.app` cho ứng dụng của bạn.

* **Cách 3: Deploy lên Firebase Hosting**:
  1. Chạy lệnh `npx firebase-tools init hosting`.
  2. Chạy lệnh `npx firebase-tools deploy --only hosting`.
