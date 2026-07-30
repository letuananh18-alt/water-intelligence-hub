// ==========================================================================
// THU DUC WATER INTERACTIVE AI ASSISTANT CHATBOT ENGINE
// Conversational AI Assistant - Direct Natural Chat without Cluttered File Dumping
// 100% Isolated Module - Zero impact on Uploads, Storage, or Database Logic
// ==========================================================================

class AiAssistant {
  constructor() {
    this.messages = [];
    this.listeners = [];
    this.init();
  }

  init() {
    this.messages = [
      {
        id: 'msg_welcome',
        role: 'ai',
        text: 'Kính chào anh/chị! Em là Trợ lý hỗ trợ anh/chị tra cứu thông tin các dữ liệu nội bộ. Anh/chị cần hỗ trợ tra cứu hay giải đáp thông tin gì hôm nay ạ?',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'pill_1',
        role: 'pill',
        text: '🔍 Quy trình xử lý sự cố cấp nước'
      },
      {
        id: 'pill_2',
        role: 'pill',
        text: '💰 Biểu giá nước sạch & phí dịch vụ 2026'
      },
      {
        id: 'pill_3',
        role: 'pill',
        text: '📋 Thủ tục ký hợp đồng cấp nước mới'
      }
    ];
  }

  getActiveMessages() {
    return this.messages;
  }

  clearHistory() {
    this.init();
    this.notify();
  }

  // INTERACTIVE CHATBOT QUERY ENGINE (NO FILE DUMPING OR CLUTTERED CITATIONS)
  async askQuestion(questionText) {
    const q = questionText.trim();
    if (!q) return;

    // Push User Question
    const userMsg = {
      id: 'msg_u_' + Date.now(),
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    this.messages.push(userMsg);
    this.notify();

    // 1. Gather Context from Department Storage Files
    const deptFiles = window.storageService ? window.storageService.getFiles('department') : [];
    const docContext = deptFiles.map(f => `- Tên tệp: "${f.name}" | Loại: "${f.docType || 'Văn bản KDDVKH'}"`).join('\n');

    // 2. Friendly Interactive System Prompt
    const systemPrompt = `Bạn là Trợ lý AI hỗ trợ anh/chị tra cứu thông tin các dữ liệu nội bộ của Công ty Cổ phần Cấp nước Thủ Đức (Thủ Đức Water).
Nhiệm vụ của bạn là tương tác, hỏi đáp và giải đáp thắc mắc cho anh/chị một cách cực kỳ thân thiện, lịch sự, tự nhiên, ngắn gọn và tập trung đúng trọng tâm câu hỏi.

QUY TẮC BẮT BUỘC:
- Xưng "Em" và gọi người dùng là "Anh/Chị".
- Tuyệt đối KHÔNG liệt kê danh sách tệp tin thô, KHÔNG xả danh mục file dư thừa.
- Nếu dữ liệu không có thông tin chính xác về câu hỏi, hãy trả lời lịch sự và gợi ý anh/chị cung cấp thêm chi tiết hoặc liên hệ bộ phận liên quan.`;

    const userPrompt = `Danh mục văn bản tham khảo nội bộ:\n${docContext}\n\nCâu hỏi của anh/chị: "${q}"`;

    let aiResponse = null;
    if (window.aiAnalyzerModule) {
      aiResponse = await window.aiAnalyzerModule.queryOpenAiGptGateway(userPrompt);
      if (!aiResponse) {
        aiResponse = await window.aiAnalyzerModule.queryGeminiAI(userPrompt);
      }
    }

    // 3. Render Clean Conversational Response
    setTimeout(() => {
      let responseText = "";

      if (aiResponse) {
        // Strip any residual markdown file dumps if generated
        responseText = aiResponse
          .replace(/Danh sách các tệp[^:]*:/gi, '')
          .replace(/Các tệp văn bản hiện có[^:]*:/gi, '');
      } else {
        const queryLower = q.toLowerCase();
        if (queryLower.includes('sự cố') || queryLower.includes('xử lý')) {
          responseText = `Dạ kính chào anh/chị! Về quy trình xử lý sự cố cấp nước, em xin hỗ trợ anh/chị các bước chính như sau ạ:\n\n1. **Tiếp nhận thông tin:** Ghi nhận sự cố từ Tổng đài hoặc Kênh tiếp nhận CSKH.\n2. **Xác minh thực địa:** Chuyển Đội kiểm tra địa bàn khảo sát trực tiếp trong vòng 2 giờ.\n3. **Khắc phục sự cố:** Tiến hành sửa chữa, lập biên bản và cập nhật trạng thái lên hệ thống.`;
        } else if (queryLower.includes('hợp đồng') || queryLower.includes('lắp đặt')) {
          responseText = `Dạ kính chào anh/chị! Về thủ tục ký hợp đồng cấp nước mới, anh/chị cần chuẩn bị các giấy tờ bao gồm:\n\n• Đơn đề nghị cấp nước theo mẫu.\n• Giấy chứng nhận quyền sử dụng đất hoặc Hợp đồng thuê nhà hợp lệ.\n• Bản sao CCCD của chủ hộ.\n\nThời gian xử lý hồ sơ thông thường từ 3 đến 5 ngày làm việc ạ!`;
        } else {
          responseText = `Dạ em đã ghi nhận thông tin hỏi đáp của anh/chị về "${q}". Hiện tại trong CSDL nội bộ chưa có thông tin chi tiết về nội dung này. Anh/chị có thể cho em xin thêm từ khóa cụ thể hoặc liên hệ Ban Quản trị phòng KDDVKH để được hỗ trợ trực tiếp ạ!`;
        }
      }

      const aiMsg = {
        id: 'msg_ai_' + Date.now(),
        role: 'ai',
        text: responseText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      this.messages.push(aiMsg);
      this.notify();
    }, 300);
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.messages));
  }
}

// Instantiate standalone module globally
window.aiAssistant = new AiAssistant();
