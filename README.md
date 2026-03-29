# ⚡ GwouthFit - Hệ Thống Quản Lý & Theo Dõi Tập Luyện Chuyên Nghiệp

![GwouthFit Hero](https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop)

**GwouthFit** là một ứng dụng Web hiện đại giúp người dùng tối ưu hóa hành trình rèn luyện sức khỏe. Từ việc lên lịch tập luyện, theo dõi chỉ số cơ thể, đến phân tích chuyên sâu bằng biểu đồ, GwouthFit cung cấp một giải pháp toàn diện để bạn đạt được mục tiêu thể hình của mình.

---

## ✨ Tính năng nổi bật

### 📊 1. Thống kê Chuyên sâu (Advanced Analytics)
- Theo dõi biến động cân nặng qua biểu đồ diện tích (Area Chart).
- So sánh Calo nạp vào vs Calo tiêu thụ hàng ngày.
- Phân tích tỷ lệ dinh dưỡng (Protein, Carbs, Fat) qua biểu đồ tròn.
- Tự động nhận diện tiến độ (Progress) dựa trên khối lượng tạ (Volume) và BMI.

### 📅 2. Lịch Tập luyện Thông minh
- Quản lý buổi tập theo thời gian thực.
- Đánh dấu hoàn thành bài tập ngay trên giao diện Dashboard.
- Hỗ trợ xem lịch trình quá khứ và kế hoạch tương lai với màu sắc trực quan.

### 📸 3. Nhật ký Hình ảnh (Body Photo Diary)
- Chụp ảnh Body Check trực tiếp từ Web/Mobile.
- Chế độ chụp liên tiếp (Burst Mode) tùy chỉnh số lượng (x3, x5, x10).
- Lưu trữ an toàn trên **Supabase Cloud Storage**.
- Xem lại ảnh và theo dõi sự thay đổi vóc dáng qua thời gian.

### 🌡️ 4. Quản lý Chỉ số Sức khỏe
- Cập nhật Cân nặng, Chiều cao, Nhịp tim nhanh chóng.
- Ghi nhận hoạt động thể chất (Chạy bộ, Bơi lội...) và tính toán năng lượng tiêu hao tự động.
- Chế độ Sáng/Tối (Light/Dark Mode) tinh tế, bảo vệ mắt.

---

## 🛠️ Công nghệ sử dụng

### Frontend (`g-fe`)
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS, Shadcn/UI
- **Data Viz**: Recharts (Biểu đồ trực quan)
- **State Management**: React Hooks (useMemo, useCallback)
- **Icons**: Lucide React
- **Notifications**: Sonner

### Backend (`g-be`)
- **Framework**: NestJS
- **Database**: PostgreSQL với TypeORM
- **Cloud Service**: Supabase (Storage & RLS Policy)
- **API Architecture**: RESTful Services

---

## 🚀 Hướng dẫn Cài đặt

### 1. Yêu cầu hệ thống
- Node.js (v18 trở lên)
- PostgreSQL
- Tài khoản Supabase (để dùng Storage)

### 2. Cài đặt Backend
```bash
cd g-be
npm install
# Tạo file .env và điền các thông tin:
# DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY...
npm run start:dev
```

### 3. Cài đặt Frontend
```bash
cd g-fe
npm install
npm run dev
```

---

## 🏗️ Cấu trúc dự án

```text
GYM/
├── g-be/                # Backend (NestJS)
│   ├── src/
│   │   ├── health/      # Module quản lý sức khỏe
│   │   ├── workouts/    # Module quản lý bài tập
│   │   └── photos/      # Module quản lý hình ảnh
├── g-fe/                # Frontend (Next.js)
│   ├── app/             # App Router (Pages & Layout)
│   ├── components/      # Shared Components
│   └── lib/             # API Config & Utils
└── README.md
```

---

## 🛡️ Bảo mật
Dự án tích hợp **Row Level Security (RLS)** trên Supabase, đảm bảo việc tải lên và lưu trữ hình ảnh được quản lý an toàn theo từng bucket riêng biệt.

---

## 🤝 Liên hệ
Nếu bạn có bất kỳ thắc mắc nào, hãy liên hệ với chúng tôi qua email: `support@gwouthfit.com` hoặc mở một Issue trên GitHub.

> [!TIP]
> **Mẹo**: Hãy kết nối Camera của bạn và thực hiện Body Check mỗi sáng để thấy sự thay đổi rõ rệt nhất!

---
*Created with ❤️ by the GwouthFit Team*
