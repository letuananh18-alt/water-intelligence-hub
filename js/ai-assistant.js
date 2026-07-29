// ==========================================================================
// AI DOCUMENT ASSISTANT MODULE (SMART SUMMARIES & TECHNICAL Q&A)
// Compatible with file:// protocol and http:// servers
// ==========================================================================

const INITIAL_AI_THREADS = [
  { id: "thread_water_process", title: "Quy trình xử lý nước sạch", active: true },
  { id: "thread_q2_report", title: "Báo cáo Q2 - Dự án cấp nước", active: false },
  { id: "thread_ops_data", title: "Phân tích dữ liệu vận hành", active: false },
  { id: "thread_safety", title: "Hướng dẫn an toàn lao động", active: false }
];

const INITIAL_AI_MESSAGES = {
  thread_water_process: [
    {
      role: "pill",
      text: "Tóm tắt nội dung chính của tài liệu quy trình xử lý nước sạch"
    },
    {
      role: "assistant",
      text: `Dưới đây là tóm tắt nội dung chính của tài liệu **"Quy trình xử lý nước sạch"**:

📋 **Mục tiêu**: Đảm bảo chất lượng nước đạt tiêu chuẩn QCVN 01-1:2018/BYT.

💧 **Quy trình xử lý gồm 6 bước chiến lược**:
1. **Lọc thô** (Loại bỏ rác thải, cặn bẩn kích thước lớn)
2. **Keo tụ & Tạo bông** (Thêm hóa chất PAC để gom hạt mịn)
3. **Lắng** (Lắng đọng các bông cặn xuống đáy bể)
4. **Lọc nhanh** (Lọc qua lớp cát thạch anh & than hoạt tính)
5. **Khử trùng** (Châm Clo đảm bảo vi sinh)
6. **Lưu trữ & Phân phối** (Đưa vào bể chứa nước sạch)

⚙️ **Các chỉ tiêu kiểm soát chính**: Độ đục (NTU), pH, Clo dư, Vi sinh, Độ màu.

🛡️ **Yêu cầu vận hành**: Kiểm tra định kỳ, ghi chép dữ liệu vận hành hàng giờ, bảo trì thiết bị nghiêm ngặt.

*Bạn có muốn tôi phân tích chi tiết hơn về một phân đoạn cụ thể không?*`
    }
  ]
};

class AIAssistant {
  constructor() {
    this.threads = INITIAL_AI_THREADS;
    this.messages = INITIAL_AI_MESSAGES;
    this.activeThreadId = "thread_water_process";
    this.listeners = [];
  }

  getActiveMessages() {
    return this.messages[this.activeThreadId] || [];
  }

  setActiveThread(threadId) {
    this.activeThreadId = threadId;
    this.threads.forEach(t => t.active = (t.id === threadId));
    this.notify();
  }

  askQuestion(userPrompt) {
    if (!userPrompt.trim()) return;

    if (!this.messages[this.activeThreadId]) {
      this.messages[this.activeThreadId] = [];
    }

    this.messages[this.activeThreadId].push({
      role: "user",
      text: userPrompt
    });

    this.notify();

    setTimeout(() => {
      let aiReply = "";
      const lower = userPrompt.toLowerCase();

      if (lower.includes("chỉ tiêu") || lower.includes("độ đục") || lower.includes("clo")) {
        aiReply = `Chỉ tiêu độ đục yêu cầu **< 2 NTU**, độ pH duy trì trong khoảng **6.5 - 8.5**, và hàm lượng Clo dư đầu nguồn đạt **0.2 - 0.5 mg/L** theo chuẩn QCVN.`;
      } else if (lower.includes("bảo trì") || lower.includes("lỗi") || lower.includes("sự cố")) {
        aiReply = `Quy trình ứng phó sự cố:
1. Tắt máy bơm cấp hóa chất tương ứng.
2. Chuyển sang hệ thống lọc dự phòng B2.
3. Gửi cảnh báo về trung tâm điều khiển SCADA.`;
      } else {
        aiReply = `Tôi đã ghi nhận câu hỏi của bạn: *"${userPrompt}"*. Dựa trên tài liệu hệ thống Thủ Đức Water, dữ liệu đang được phân tích từ sơ đồ mạng lưới cấp nước khu vực. Cần hỗ trợ trích xuất số liệu cụ thể nào không?`;
      }

      this.messages[this.activeThreadId].push({
        role: "assistant",
        text: aiReply
      });
      this.notify();
    }, 600);
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.getActiveMessages()));
  }
}

window.aiAssistant = new AIAssistant();
