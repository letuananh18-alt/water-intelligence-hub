// ==========================================================================
// CHATGPT & GEMINI DUAL AI GATEWAY MODULE (WITH VISION OCR & EXECUTIVE REPORT PARSER)
// Converts PDF Scanned Pages & Images into High-Res JPEG Base64 for ChatGPT GPT-4o Vision
// 100% Isolated Module - Zero impact on Uploads, Storage, or Database Logic
// ==========================================================================

class AiAnalyzerModule {
  constructor() {
    this.geminiApiKey = localStorage.getItem('gemini_api_key') || '';
    this.openaiApiKey = localStorage.getItem('openai_api_key') || '';
    this.pdfjsLoaded = false;
    this.initPdfJs();
  }

  initPdfJs() {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      this.pdfjsLoaded = true;
    }
  }

  setOpenAiKey(key) {
    this.openaiApiKey = (key || '').trim();
    if (this.openaiApiKey) {
      localStorage.setItem('openai_api_key', this.openaiApiKey);
    } else {
      localStorage.removeItem('openai_api_key');
    }
  }

  getOpenAiKey() {
    return this.openaiApiKey || localStorage.getItem('openai_api_key') || '';
  }

  // 1. CONVERT PDF PAGE TO HIGH-RES JPEG BASE64 IMAGE FOR VISION OCR
  async convertPdfPageToImageBase64(blobOrUrl, pageNum = 1) {
    try {
      if (!window.pdfjsLib) return null;
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      let arrayBuffer;
      if (typeof blobOrUrl === 'string' && blobOrUrl.startsWith('http')) {
        const resp = await fetch(blobOrUrl);
        arrayBuffer = await resp.arrayBuffer();
      } else if (blobOrUrl instanceof Blob) {
        arrayBuffer = await blobOrUrl.arrayBuffer();
      } else {
        return null;
      }

      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(Math.min(pageNum, pdf.numPages));
      
      const viewport = page.getViewport({ scale: 1.5 }); // High quality 1.5x zoom for sharp OCR
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      console.warn("PDF page to image conversion notice:", e);
      return null;
    }
  }

  // 2. PARSE MARKDOWN TEXT INTO EXECUTIVE HTML CARDS & BADGES (ELIMINATES RAW HASHES & ROUGH TEXT)
  parseAiMarkdownToHtml(markdownText) {
    if (!markdownText) return '';

    // Strip raw markdown hashes and bold stars safely
    let clean = markdownText
      .replace(/^###\s+/gm, '### ')
      .replace(/^##\s+/gm, '## ')
      .replace(/^#\s+/gm, '# ');

    const sections = clean.split(/(?=### |## |# )/g);
    let formattedHtml = `<div class="ai-report-container">`;

    sections.forEach(sec => {
      const trimmed = sec.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('#')) {
        const firstLineEnd = trimmed.indexOf('\n');
        const titleLine = (firstLineEnd > -1 ? trimmed.substring(0, firstLineEnd) : trimmed).replace(/^[#\s]+/, '').trim();
        const contentLines = firstLineEnd > -1 ? trimmed.substring(firstLineEnd + 1).trim() : '';

        const isOverview = titleLine.toLowerCase().includes('tổng quan');
        const isClauses = titleLine.toLowerCase().includes('điều khoản') || titleLine.toLowerCase().includes('nội dung');
        const isAction = titleLine.toLowerCase().includes('kết luận') || titleLine.toLowerCase().includes('hành động');

        let parsedContent = contentLines
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^[*-]\s+(.*)$/gm, '<div class="ai-report-clause-item">• $1</div>')
          .replace(/\n\n/g, '<br>');

        if (isOverview) {
          formattedHtml += `
            <div class="ai-report-overview-box">
              <div class="ai-report-overview-title">📌 ${titleLine}</div>
              <div class="ai-report-overview-text">${parsedContent}</div>
            </div>
          `;
        } else if (isClauses) {
          formattedHtml += `
            <div class="ai-report-clauses-box">
              <div class="ai-report-clauses-title">📋 ${titleLine}</div>
              <div>${parsedContent}</div>
            </div>
          `;
        } else if (isAction) {
          formattedHtml += `
            <div class="ai-report-action-box">
              <div class="ai-report-action-title">⚡ ${titleLine}</div>
              <div class="ai-report-action-text">${parsedContent}</div>
            </div>
          `;
        } else {
          formattedHtml += `
            <div class="ai-report-clauses-box">
              <div class="ai-report-clauses-title">📄 ${titleLine}</div>
              <div style="font-size: 13px; color: #334155; line-height: 1.6;">${parsedContent}</div>
            </div>
          `;
        }
      } else {
        const parsed = trimmed
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^[*-]\s+(.*)$/gm, '<div class="ai-report-clause-item">• $1</div>')
          .replace(/\n/g, '<br>');
        formattedHtml += `<div class="ai-report-overview-box"><div class="ai-report-overview-text">${parsed}</div></div>`;
      }
    });

    formattedHtml += `</div>`;
    return formattedHtml;
  }

  // 3. DIRECT CHATGPT OPENAI VISION API GATEWAY DISPATCHER WITH ENTERPRISE SYSTEM PROMPT
  async queryOpenAiGptGateway(promptText, base64JpegImage = null) {
    const key = this.getOpenAiKey();
    if (!key) return null;

    const systemPrompt = `
Bạn là Trợ lý AI Chuyên gia Phân tích Văn bản Nghiệp vụ cấp cao của CÔNG TY CỔ PHẦN CẤP NƯỚC THỦ ĐỨC (Thủ Đức Water).
Nhiệm vụ của bạn là soi kỹ từng nét chữ, con số, tiêu đề, số hợp đồng, ngày tháng, tên các bên, con dấu đỏ và điều khoản trong tài liệu (dù là ảnh scan chụp từ giấy hay file văn bản gõ máy).

BẮT BUỘC TRẢ VỀ BẢN BÁO CÁO TÓM TẮT ĐƯỢC CHIA THÀNH CHÍNH XÁC 4 PHẦN SAU DÀNH CHO PHÒNG KINH DOANH & DỊCH VỤ KHÁCH HÀNG:

### 1. THÔNG TIN & CHỈ MỤC VĂN BẢN
- Tên tài liệu / Số hiệu hợp đồng / Biên bản: [Số hiệu chính xác]
- Đơn vị ban hành & Các bên ký kết: [Tên chính xác]
- Ngày ban hành / Ngày ký: [Ngày tháng]
- Phân loại KDDVKH: [Hợp đồng cấp nước / Biểu giá / Quy trình CSKH / Biên bản sự cố]

### 2. TỔNG QUAN NỘI DUNG VĂN BẢN
- [Viết 2-3 câu mô tả mục đích chính, địa điểm, thời gian, đối tượng phục vụ và bối cảnh áp dụng]

### 3. CÁC ĐIỀU KHOẢN & CHI TIẾT CỐT LÕI
- Điều khoản 1: [Trích xuất chi tiết nội dung, con số hoặc chỉ số tiêu thụ/giá nước nếu có]
- Điều khoản 2: [Trích xuất quyền hạn và nghĩa vụ của Đơn vị Cấp nước / Khách hàng]
- Điều khoản 3: [Trích xuất thời hạn thanh toán, xử lý sự cố hoặc nghiệm thu kỹ thuật]
- Điều khoản 4: [Các quy định bảo vệ thủy kế / bảo mật thông tin khác]

### 4. KẾT LUẬN & CHỈ ĐẠO THỰC HIỆN
- [Cán bộ Phòng KDDVKH cần thực hiện những bước gì tiếp theo đối với tệp này]
- [Trách nhiệm theo dõi tiến độ và lưu trữ CSDL Supabase]
`;

    try {
      const messages = [
        { role: "system", content: systemPrompt }
      ];

      if (base64JpegImage && base64JpegImage.length > 100) {
        const imageUrl = base64JpegImage.startsWith('data:') ? base64JpegImage : `data:image/jpeg;base64,${base64JpegImage}`;
        messages.push({
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
          ]
        });
      } else {
        messages.push({ role: "user", content: promptText });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          max_tokens: 1800
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.choices?.[0]?.message?.content) {
          return data.choices[0].message.content;
        }
      }
    } catch (e) {
      console.warn("OpenAI ChatGPT Gateway error:", e);
    }
    return null;
  }

  // 4. GOOGLE GEMINI VISION API GATEWAY DISPATCHER
  async queryGeminiAI(promptText, base64JpegImage = null) {
    const key = localStorage.getItem('gemini_api_key') || this.geminiApiKey;
    if (!key) return null;

    const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    for (const model of models) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        
        const parts = [{ text: promptText }];
        if (base64JpegImage && base64JpegImage.length > 50) {
          const cleanBase64 = base64JpegImage.includes('base64,') ? base64JpegImage.split('base64,')[1] : base64JpegImage;
          parts.push({
            inline_data: {
              mime_type: 'image/jpeg',
              data: cleanBase64.replace(/\s+/g, '')
            }
          });
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] })
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.candidates?.[0]?.content?.parts) {
            const resultText = data.candidates[0].content.parts.map(p => p.text).join('\n');
            if (resultText && resultText.trim()) return resultText;
          }
        }
      } catch (e) {
        console.warn(`Gemini Model ${model} notice:`, e);
      }
    }
    return null;
  }

  // 5. EXTRACT VECTOR TEXT FROM PDF BLOB USING PDF.JS
  async extractTextFromPdfBlob(blobOrUrl) {
    try {
      if (!window.pdfjsLib) return { text: "", numPages: 1 };
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      let arrayBuffer;
      if (typeof blobOrUrl === 'string' && blobOrUrl.startsWith('http')) {
        const resp = await fetch(blobOrUrl);
        arrayBuffer = await resp.arrayBuffer();
      } else if (blobOrUrl instanceof Blob) {
        arrayBuffer = await blobOrUrl.arrayBuffer();
      } else {
        return { text: "", numPages: 1 };
      }

      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      let pageCount = pdf.numPages || 1;

      for (let i = 1; i <= Math.min(pageCount, 15); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ').trim();
        if (pageText) {
          fullText += pageText + " ";
        }
      }

      return { text: fullText.trim(), numPages: pageCount };
    } catch (e) {
      console.warn("PDF.js text extraction notice:", e);
      return { text: "", numPages: 1 };
    }
  }

  // 6. EXTRACT TEXT FROM WORD (.DOCX) USING MAMMOTH.JS
  async extractTextFromDocxBlob(blobOrArrayBuffer) {
    try {
      if (!window.mammoth) return "";
      let arrayBuffer;
      if (blobOrArrayBuffer instanceof Blob) {
        arrayBuffer = await blobOrArrayBuffer.arrayBuffer();
      } else {
        arrayBuffer = blobOrArrayBuffer;
      }
      const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
      return result ? result.value : "";
    } catch (e) {
      console.warn("Mammoth DOCX text extraction notice:", e);
      return "";
    }
  }

  // 7. MAIN GATEWAY ANALYZER - DISPATCHES TO CHATGPT VISION & RE-FORMATS HTML
  async analyzeDocument(fileObj, rawBlob = null) {
    if (!fileObj) return null;

    let extractedText = "";
    let totalPdfPages = 1;
    const fileName = fileObj.name || "Tài liệu";
    const ext = fileName.split('.').pop().toLowerCase();
    let pageBase64Image = null;

    // A. Extract Text & Render PDF Page 1 to Crisp High-Res JPEG Image
    if (ext === 'pdf') {
      const pdfRes = await this.extractTextFromPdfBlob(rawBlob || fileObj.url);
      extractedText = pdfRes.text;
      totalPdfPages = pdfRes.numPages;

      // Render Page 1 to Canvas JPEG Base64 for ChatGPT Vision OCR
      pageBase64Image = await this.convertPdfPageToImageBase64(rawBlob || fileObj.url, 1);
    } else if (ext === 'docx' || ext === 'doc') {
      extractedText = await this.extractTextFromDocxBlob(rawBlob);
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      pageBase64Image = fileObj.dataUrl || fileObj.url;
    }

    const cleanText = (extractedText || "").replace(/\s+/g, ' ').trim();
    const pureTextLength = cleanText.length;
    const isScannedPdf = (ext === 'pdf' && pureTextLength < 30);

    const openAiKey = this.getOpenAiKey();
    const geminiKey = localStorage.getItem('gemini_api_key') || this.geminiApiKey;

    const prompt = `Phân tích tệp "${fileName}" (Tệp thuộc Kho Kinh doanh & Dịch vụ Khách hàng - Thủ Đức Water).\n` +
      (pageBase64Image ? `Đã đính kèm ảnh chụp trang tài liệu sắc nét. Hãy dùng mắt thần Vision OCR đọc kỹ tất cả nét chữ, con số, tiêu đề, số hợp đồng và chi tiết trên ảnh scan này.` : `Nội dung chữ: "${cleanText.substring(0, 8000)}"`);

    // B1. DISPATCH TO OPENAI CHATGPT VISION API GATEWAY IF OPENAI KEY IS SET
    if (openAiKey) {
      const gptResponse = await this.queryOpenAiGptGateway(prompt, pageBase64Image);
      if (gptResponse) {
        return {
          title: `🤖 Báo cáo Vision OCR OpenAI ChatGPT Gateway: ${fileName}`,
          isRealOcr: true,
          modeText: pageBase64Image ? `⚡ ChatGPT Vision OCR đã đọc trực tiếp ảnh trang scan tệp.` : `⚡ ChatGPT AI đã phân tích văn bản thực tế.`,
          contentHtml: this.parseAiMarkdownToHtml(gptResponse)
        };
      }
    }

    // B2. DISPATCH TO GOOGLE GEMINI VISION API GATEWAY IF GEMINI KEY IS SET
    if (geminiKey) {
      const geminiResponse = await this.queryGeminiAI(prompt, pageBase64Image);
      if (geminiResponse) {
        return {
          title: `🤖 Báo cáo Vision OCR Google Gemini AI Gateway: ${fileName}`,
          isRealOcr: true,
          modeText: pageBase64Image ? `⚡ Gemini Vision OCR đã đọc trực tiếp ảnh trang scan.` : `⚡ Gemini AI đã phân tích văn bản.`,
          contentHtml: this.parseAiMarkdownToHtml(geminiResponse)
        };
      }
    }

    // B3. IF NO API KEY IS SET - PROVIDE INTERACTIVE KEY SETTING GATEWAY BOX IN MODAL
    let summaryTitle = `🌐 Cổng Kết Nối AI Gateway: ${fileName}`;
    let overviewText = `Tệp **"${fileName}"** (${isScannedPdf ? `${totalPdfPages} trang ảnh scan` : `${pureTextLength} ký tự văn bản`}) đã được chuyển thành **ảnh chụp sắc nét** sẵn sàng gửi cho ChatGPT Vision OCR đọc chữ.`;
    
    const formattedHtml = `
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 18px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <div style="font-weight: 800; font-size: 15px; color: #38bdf8; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <span>🔑 CỔNG KẾT NỐI CHATGPT & GEMINI AI VISION GATEWAY</span>
        </div>
        <p style="font-size: 12.5px; color: #94a3b8; margin-bottom: 12px; line-height: 1.5;">
          Hệ thống vừa tự động chuyển đổi trang PDF scan sang dạng **Ảnh chụp sắc nét**. Hãy dán mã **OpenAI ChatGPT API Key (sk-...)** hoặc **Google Gemini API Key (AIzaSy...)** bên dưới để Mắt thần ChatGPT Vision đọc chữ trực tiếp trên ảnh và trả kết quả về giao diện Web App:
        </p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <input type="password" id="modalGptKeyInput" placeholder="Nhập OpenAI Key (sk-...) hoặc Gemini Key..." class="form-input" style="flex: 1; min-width: 260px; padding: 9px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; font-size: 13px;">
          <button id="btnSaveModalGptKey" class="btn-primary" style="padding: 9px 18px; font-size: 13px; width: auto; background: #0284c7;">
            ⚡ Lưu Key & Gửi ChatGPT Vision
          </button>
        </div>
        <div id="modalGptKeyStatus" style="font-size: 12px; margin-top: 8px; font-weight: 600; color: #4ade80;"></div>
      </div>

      <div class="ai-report-overview-box">
        <div class="ai-report-overview-title">📌 Tổng quan tài liệu nhận diện từ Cổng Gateway:</div>
        <div class="ai-report-overview-text">${overviewText}</div>
      </div>

      <div class="ai-report-clauses-box" style="margin-top: 14px;">
        <div class="ai-report-clauses-title">📋 Thông tin chỉ mục nghiệp vụ KDDVKH:</div>
        <div class="ai-report-clause-item">• Phân loại: ${fileObj.docType || 'Hợp đồng & Quy trình CSKH'}.</div>
        <div class="ai-report-clause-item">• Định dạng: ${ext.toUpperCase()} • Dung lượng ${fileObj.sizeFormatted}.</div>
        <div class="ai-report-clause-item">• Ban hành: Ngày ${fileObj.uploadDate} bởi ${fileObj.uploadedBy || 'Lê Tuấn Anh (Admin)'}.</div>
      </div>
    `;

    return {
      title: summaryTitle,
      isRealOcr: false,
      modeText: `🌐 Cổng Gateway Web App: Sẵn sàng gửi ảnh trang scan cho ChatGPT / Gemini Vision OCR.`,
      contentHtml: formattedHtml
    };
  }
}

// Instantiate standalone module globally
window.aiAnalyzerModule = new AiAnalyzerModule();
