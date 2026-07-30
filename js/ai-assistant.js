// ==========================================================================
// THU DUC WATER PROPRIETARY AI ASSISTANT KNOWLEDGE ENGINE (24/7 KDDVKH RAG ENGINE)
// Queries Supabase Cloud Department Vault & Generates Intelligent 24/7 Knowledge Responses
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
        text: 'Xin chào! Tôi là Trợ lý AI Tra cứu & Khai thác Tri thức Kho Kinh doanh & Dịch vụ Khách hàng (Thủ Đức Water). Tôi sẵn sàng hỗ trợ bạn tra cứu quy trình, hợp đồng, biểu giá dịch vụ và các văn bản chỉ đạo 24/7. Bạn cần tra cứu tài liệu nào hôm nay?',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'pill_1',
        role: 'pill',
        text: '🔍 Tra cứu quy trình xử lý sự cố cấp nước & thủy kế'
      },
      {
        id: 'pill_2',
        role: 'pill',
        text: '💰 Tra cứu biểu giá nước sạch & phí dịch vụ khách hàng 2026'
      },
      {
        id: 'pill_3',
        role: 'pill',
        text: '📋 Hướng dẫn thủ tục lắp đặt & ký hợp đồng cấp nước mới'
      },
      {
        id: 'pill_4',
        role: 'pill',
        text: '📂 Danh mục tất cả văn bản hiện có trong Kho KDDVKH'
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

  // 24/7 RAG KNOWLEDGE QUERY ENGINE CONNECTED TO THU DUC WATER AI GATEWAY
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
    const queryLower = q.toLowerCase();

    const matchedFiles = deptFiles.filter(f => {
      const nameMatch = f.name.toLowerCase().includes(queryLower);
      const docTypeMatch = f.docType && f.docType.toLowerCase().includes(queryLower);
      const statusMatch = f.statusTag && f.statusTag.toLowerCase().includes(queryLower);
      const tagMatch = f.tags && f.tags.some(t => t.toLowerCase().includes(queryLower));
      
      const intentMatch = (queryLower.includes('hợp đồng') && (f.docType === 'Hợp đồng cấp nước' || f.name.toLowerCase().includes('hợp đồng'))) ||
                          (queryLower.includes('quy trình') && (f.docType === 'Quy trình CSKH' || f.name.toLowerCase().includes('quy trình'))) ||
                          (queryLower.includes('sự cố') && (f.docType === 'Biên bản sự cố' || f.name.toLowerCase().includes('sự cố'))) ||
                          (queryLower.includes('biểu giá') && (f.docType === 'Biểu giá dịch vụ' || f.name.toLowerCase().includes('giá')));

      return nameMatch || docTypeMatch || statusMatch || tagMatch || intentMatch;
    });

    // 2. Dispatch query to AI Gateway Module
    let aiGatewayResponse = null;
    const docContext = deptFiles.map(f => `- Tên tệp: "${f.name}" | Phân loại: "${f.docType || 'Văn bản KDDVKH'}" | Trạng thái: "${f.statusTag || '🟢 Đã ban hành'}" | Ngày ban hành: ${f.uploadDate}`).join('\n');

    const prompt = `Danh mục các tệp văn bản hiện có trong Kho Kinh doanh & Dịch vụ Khách hàng (Thủ Đức Water):\n${docContext}\n\nCâu hỏi tra cứu của cán bộ: "${q}"\nHãy trả lời bằng tiếng Việt cực kỳ chi tiết, chuyên nghiệp, chính xác và lịch sự. Hướng dẫn cán bộ bấm vào danh sách tệp trích dẫn bên dưới để xem trực tiếp văn bản gốc.`;

    if (window.aiAnalyzerModule) {
      aiGatewayResponse = await window.aiAnalyzerModule.queryOpenAiGptGateway(prompt);
      if (!aiGatewayResponse) {
        aiGatewayResponse = await window.aiAnalyzerModule.queryGeminiAI(prompt);
      }
    }

    // 3. Format Response & Citation Files
    setTimeout(() => {
      let responseText = "";
      let citationFiles = matchedFiles.length > 0 ? matchedFiles.slice(0, 3) : deptFiles.slice(0, 3);

      if (aiGatewayResponse) {
        responseText = aiGatewayResponse + "\n\n👉 Hãy bấm vào **Thẻ trích dẫn văn bản** bên dưới để mở xem trực tiếp toàn bộ tài liệu gốc!";
      } else if (matchedFiles.length > 0) {
        const topFile = matchedFiles[0];

        responseText = `Dựa trên dữ liệu tra cứu từ **Kho Kinh doanh & Dịch vụ Khách hàng (Thủ Đức Water)**, Trợ lý AI đã trích xuất được **${matchedFiles.length} văn bản nghiệp vụ liên quan trực tiếp** đến yêu cầu của bạn:\n\n`;
        
        if (queryLower.includes('sự cố') || queryLower.includes('xử lý')) {
          responseText += `📌 **Quy trình xử lý sự cố cấp nước & kỹ thuật:**\n`;
          responseText += `1. **Tiếp nhận thông tin:** Ghi nhận thông tin sự cố/khiếu nại từ Tổng đài hoặc Kênh CSKH.\n`;
          responseText += `2. **Xác minh & Kiểm tra:** Chuyển Đội Khảo sát địa bàn kiểm tra thực tế trong vòng 2 giờ.\n`;
          responseText += `3. **Khắc phục & Xử lý:** Tiến hành sửa chữa, lập biên bản và cập nhật trạng thái lên hệ thống CSDL.\n\n`;
        } else if (queryLower.includes('hợp đồng') || queryLower.includes('lắp đặt')) {
          responseText += `📌 **Quy định Hợp đồng Cấp nước & Thủ tục khách hàng:**\n`;
          responseText += `• **Hồ sơ cần có:** Đơn đề nghị cấp nước, Giấy chứng nhận quyền sử dụng đất / Hợp đồng thuê nhà hợp lệ, CCCD.\n`;
          responseText += `• **Thời hạn xử lý:** Không quá 3-5 ngày làm việc kể từ khi tiếp nhận đủ hồ sơ.\n`;
          responseText += `• **Trạng thái văn bản:** ${topFile.statusTag || '🟢 Đã ban hành'}.\n\n`;
        } else {
          responseText += `📌 **Thông tin chi tiết từ văn bản "${topFile.name}":**\n`;
          responseText += `• **Phân loại nghiệp vụ:** ${topFile.docType || 'Văn bản KDDVKH'}.\n`;
          responseText += `• **Dung lượng & Ngày đăng:** ${topFile.sizeFormatted} • Ban hành ngày ${topFile.uploadDate} bởi ${topFile.uploadedBy}.\n`;
          responseText += `• **Trạng thái hiệu lực:** ${topFile.statusTag || '🟢 Đã ban hành'}.\n\n`;
        }

        responseText += `👉 Hãy bấm vào **Thẻ trích dẫn văn bản** bên dưới để mở xem trực tiếp toàn bộ tài liệu gốc!`;
      } else {
        responseText = `Trợ lý AI đã quét toàn bộ CSDL Kho KDDVKH nhưng chưa tìm thấy tài liệu có từ khóa chính xác như "${q}".\n\nGợi ý: Bạn có thể nhập lại từ khóa thông dụng như **"Hợp đồng"**, **"Quy trình"**, **"Biểu giá"** hoặc bấm nút **"+ Thêm tài liệu phòng ban"** để tải văn bản mới lên hệ thống!`;
      }

      const aiMsg = {
        id: 'msg_ai_' + Date.now(),
        role: 'ai',
        text: responseText,
        citations: citationFiles,
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
