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

  setApiKey(key) {
    if (key && key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }

  getApiKey() {
    return localStorage.getItem('gemini_api_key') || '';
  }

  getActiveMessages() {
    return this.messages;
  }

  clearHistory() {
    this.init();
    this.notify();
  }

  // INTERACTIVE CHATBOT QUERY ENGINE (RAG KNOWLEDGE ENGINE + SMART INTENT RECOGNITION)
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

    const qLower = q.toLowerCase();

    // 1. Direct Intent Recognition for Greeting & Bot Capabilities
    if (/^(chào|chao|hi|hello|xin chào|chào bạn|bạn là ai|giới thiệu)/i.test(qLower)) {
      setTimeout(() => {
        const welcomeReply = `Dạ em kính chào Anh/Chị! Em là **Trợ lý AI Cấp nước Thủ Đức (Thủ Đức Water)**.\n\nEm được kết nối trực tiếp với **Kho Dữ liệu Nội bộ Phòng Kinh doanh & Dịch vụ Khách hàng** trên CSDL Supabase Cloud. Em có thể hỗ trợ Anh/Chị tra cứu nhanh:\n\n• Quy trình xử lý sự cố cấp nước & tiếp nhận CSKH.\n• Thủ tục ký hợp đồng, lắp đặt đồng hồ nước mới.\n• Biểu giá nước sạch & các khoản phí dịch vụ 2026.\n• Tra cứu thông tin nhiệm vụ, quy định & văn bản nội bộ phòng ban.\n\nAnh/Chị cần em hỗ trợ tra cứu thông tin gì hôm nay ạ?`;
        this.messages.push({
          id: 'msg_ai_' + Date.now(),
          role: 'ai',
          text: welcomeReply,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        });
        this.notify();
      }, 300);
      return;
    }

    if (qLower.includes('lấy cs dữ liệu') || qLower.includes('lấy dữ liệu ở đâu') || qLower.includes('nguồn dữ liệu') || qLower.includes('csdl từ đâu')) {
      setTimeout(() => {
        const sourceReply = `Dạ em đang tra cứu trực tiếp và trích xuất dữ liệu từ **Kho Văn bản Nội bộ Phòng Kinh doanh & Dịch vụ Khách hàng (Thủ Đức Water)** được lưu trữ, đồng bộ và bảo mật trên hệ thống **Supabase PostgreSQL Cloud Database** ạ!\n\nTất cả các hợp đồng, quy trình, biểu giá và tài liệu do Ban Quản trị Admin đăng lên sẽ được em đối chiếu realtime để trả lời chính xác cho Anh/Chị ạ.`;
        this.messages.push({
          id: 'msg_ai_' + Date.now(),
          role: 'ai',
          text: sourceReply,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        });
        this.notify();
      }, 300);
      return;
    }

    // 2. Gather Rich Context from Department & Personal Storage Files
    const deptFiles = window.storageService ? window.storageService.getFiles('department') : [];
    const personalFiles = window.storageService ? window.storageService.getFiles('personal') : [];
    const allFiles = [...deptFiles, ...personalFiles];

    let docContext = "";
    if (allFiles.length > 0) {
      docContext = allFiles.map((f, idx) => {
        let details = `[Tệp ${idx + 1}] Tên: "${f.name}" | Phân loại: "${f.docType || 'Văn bản nội bộ'}" | Trạng thái: "${f.statusTag || 'Đã ban hành'}" | Ngày đăng: ${f.uploadDate || ''}`;
        if (f.text || f.content) {
          details += `\n   Nội dung trích xuất: "${(f.text || f.content).substring(0, 1500).replace(/\s+/g, ' ')}"`;
        }
        return details;
      }).join('\n\n');
    }

    // 3. Construct System Prompt & Prompt for AI Engine
    const systemPrompt = `Bạn là Trợ lý AI hỗ trợ tra cứu thông tin các dữ liệu nội bộ của CÔNG TY CỔ PHẦN CẤP NƯỚC THỦ ĐỨC (Thủ Đức Water).
Nhiệm vụ của bạn là đọc kỹ danh mục và nội dung văn bản nội bộ bên dưới để giải đáp thắc mắc cho cán bộ một cách đầy đủ, chính xác, lịch sự và chuyên nghiệp.

QUY TẮC PHẢN HỒI:
- Xưng "Em" và gọi người dùng là "Anh/Chị".
- Trả lời đúng trọng tâm câu hỏi, sử dụng gạch đầu dòng rõ ràng, mạch lạc.
- Nếu câu hỏi liên quan đến chức năng, nhiệm vụ, hợp đồng hay quy trình, hãy trích dẫn căn cứ từ văn bản nội bộ hoặc trả lời đầy đủ theo nghiệp vụ ngành cấp nước.`;

    const userPrompt = `${systemPrompt}\n\nDỮ LIỆU VĂN BẢN NỘI BỘ THỦ ĐỨC WATER:\n${docContext || 'Chưa có tệp văn bản đính kèm.'}\n\nCÂU HỎI CỦA ANH/CHỊ: "${q}"`;

    let aiResponse = null;
    const currentUserEmail = window.authManager && window.authManager.currentUser ? window.authManager.currentUser.email : '';
    const currentUserName = window.authManager && window.authManager.currentUser ? (window.authManager.currentUser.user_metadata?.display_name || window.authManager.currentUser.email) : '';

    if (window.aiAnalyzerModule) {
      aiResponse = await window.aiAnalyzerModule.querySupabaseRealtimeAi(q, currentUserEmail, currentUserName);
      if (!aiResponse) {
        aiResponse = await window.aiAnalyzerModule.queryOpenAiGptGateway(userPrompt);
      }
      if (!aiResponse) {
        aiResponse = await window.aiAnalyzerModule.queryGeminiAI(userPrompt);
      }
    }

    // 4. Response Resolution
    let responseText = "";
    if (aiResponse && aiResponse.trim()) {
      responseText = aiResponse
        .replace(/Danh sách các tệp[^:]*:/gi, '')
        .replace(/Các tệp văn bản hiện có[^:]*:/gi, '');
    } else {
      responseText = `Dạ kính chào Anh/Chị! Em đã tiếp nhận câu hỏi **"${q}"**. Vui lòng kiểm tra mục **Cài đặt** để đảm bảo Cổng kết nối AI Engine hoặc Supabase Realtime đã được mở nhé ạ!`;
    }

    const aiMsg = {
      id: 'msg_ai_' + Date.now(),
      role: 'ai',
      text: responseText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    this.messages.push(aiMsg);
    this.notify();
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
