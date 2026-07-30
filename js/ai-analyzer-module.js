// ==========================================================================
// CHATGPT & GEMINI DUAL AI GATEWAY MODULE (WITH PDF.JS CANVAS IMAGE OCR VISION)
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
      
      const viewport = page.getViewport({ scale: 1.5 }); // High-quality 1.5x zoom for sharp OCR
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

  // 2. DIRECT CHATGPT OPENAI VISION API GATEWAY DISPATCHER (GPT-4o Vision Engine)
  async queryOpenAiGptGateway(promptText, base64JpegImage = null) {
    const key = this.getOpenAiKey();
    if (!key) return null;

    try {
      const messages = [
        {
          role: "system",
          content: "Bạn là Trợ lý AI ChatGPT Engine tích hợp trên Cổng Web App Thư viện Điện tử - Công ty Cổ phần Cấp nước Thủ Đức (Thủ Đức Water). Bạn được cung cấp ảnh chụp thực tế của tài liệu. Hãy dùng mắt thần Vision OCR đọc kỹ tất cả nét chữ, con số, tiêu đề, ngày tháng, tên các bên trên ảnh scan tài liệu và trả về bản tóm tắt tiếng Việt cực kỳ chi tiết, chuyên nghiệp, chính xác."
        }
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
          max_tokens: 1500
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.choices?.[0]?.message?.content) {
          return data.choices[0].message.content;
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn("OpenAI ChatGPT Gateway notice:", errJson);
      }
    } catch (e) {
      console.warn("OpenAI ChatGPT Gateway error:", e);
    }
    return null;
  }

  // 3. GOOGLE GEMINI VISION API GATEWAY DISPATCHER
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

  // 4. EXTRACT VECTOR TEXT FROM PDF BLOB USING PDF.JS
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

  // 5. EXTRACT TEXT FROM WORD (.DOCX) USING MAMMOTH.JS
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

  // 6. MAIN GATEWAY ANALYZER - RENDERS PDF PAGES TO HIGH-RES JPEG IMAGES & SENDS TO CHATGPT VISION
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

    const prompt = `Đây là dữ liệu tài liệu "${fileName}" từ Cổng Web App Thư viện Điện tử KDDVKH (Công ty Cổ phần Cấp nước Thủ Đức).\n` +
      (pageBase64Image ? `Tôi gửi kèm ẢNH CHỤP SẮC NÉT TRỰC TIẾP của trang văn bản. Hãy dùng mắt thần Vision OCR đọc kỹ tất cả nét chữ, con số, bảng biểu, tên các bên, tiêu đề, ngày tháng trên ảnh scan này.` : `Nội dung chữ trích xuất: "${cleanText.substring(0, 8000)}"`) +
      `\n\nHãy tổng hợp bản tóm tắt tiếng Việt cực kỳ chi tiết bao gồm:\n1. TỔNG QUAN VĂN BẢN (Tên văn bản, cơ quan/đơn vị ban hành, số hiệu, ngày tháng, các bên liên quan).\n2. CÁC NỘI DUNG & ĐIỀU KHOẢN CỐT LÕI (Liệt kê chi tiết 3-4 điểm chính đọc được từ ảnh scan).\n3. KẾT LUẬN & HÀNH ĐỘNG THỰC HIỆN.`;

    // B1. DISPATCH TO OPENAI CHATGPT VISION API GATEWAY IF OPENAI KEY IS SET
    if (openAiKey) {
      const gptResponse = await this.queryOpenAiGptGateway(prompt, pageBase64Image);
      if (gptResponse) {
        return {
          title: `🤖 Báo cáo Vision OCR OpenAI ChatGPT Gateway: ${fileName}`,
          isRealOcr: true,
          modeText: pageBase64Image ? `⚡ ChatGPT Vision OCR đã quét trực tiếp ảnh sắc nét của trang tệp scan.` : `⚡ ChatGPT AI đã phân tích văn bản thực tế.`,
          contentHtml: gptResponse.replace(/\n/g, '<br>')
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
          contentHtml: geminiResponse.replace(/\n/g, '<br>')
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

      <div style="font-weight: 700; color: #0284c7; margin-bottom: 10px; font-size: 14px;">📌 Tổng quan tài liệu nhận diện từ Cổng Gateway:</div>
      <p style="margin-bottom: 14px; font-size: 13px; color: var(--slate-700); line-height: 1.6;">${overviewText}</p>
      
      <div style="font-weight: 700; color: #0284c7; margin-bottom: 8px; font-size: 14px;">📌 Thông tin chỉ mục nghiệp vụ:</div>
      <ul style="margin-bottom: 16px; padding-left: 20px; font-size: 13px; color: var(--slate-700); line-height: 1.6;">
        <li style="margin-bottom: 6px;">Phân loại: ${fileObj.docType || 'Hợp đồng & Quy trình CSKH'}.</li>
        <li style="margin-bottom: 6px;">Định dạng: ${ext.toUpperCase()} • Dung lượng ${fileObj.sizeFormatted}.</li>
        <li style="margin-bottom: 6px;">Ban hành: Ngày ${fileObj.uploadDate} bởi ${fileObj.uploadedBy || 'Lê Tuấn Anh (Admin)'}.</li>
      </ul>
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
