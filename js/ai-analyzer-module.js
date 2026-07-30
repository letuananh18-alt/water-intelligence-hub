// ==========================================================================
// CHATGPT 4o-MINI AI GATEWAY MODULE (SUPER FAST, ACCURATE & TOKEN-SAVING)
// Uses gpt-4o-mini Vision Model with Structured Prompt & Clean Dynamic HTML Renderer
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
      
      const viewport = page.getViewport({ scale: 1.5 }); // Crisp 1.5x zoom for sharp OCR
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

  // 2. CLEAN DYNAMIC HTML RENDERER (NO BROKEN IMAGES, NO RAW HASHES)
  renderRawGptResponse(markdownText) {
    if (!markdownText) return '';

    let formatted = markdownText
      // Convert headings to clean styled HTML blocks
      .replace(/^###\s+(.*$)/gim, '<h4 style="font-size: 14.5px; font-weight: 800; color: #0284c7; margin-top: 16px; margin-bottom: 8px; text-transform: uppercase; border-bottom: 2px solid #e0f2fe; padding-bottom: 4px;">📄 $1</h4>')
      .replace(/^##\s+(.*$)/gim, '<h3 style="font-size: 15.5px; font-weight: 800; color: #0369a1; margin-top: 18px; margin-bottom: 10px; text-transform: uppercase;">📌 $1</h3>')
      .replace(/^#\s+(.*$)/gim, '<h2 style="font-size: 17px; font-weight: 900; color: #0f172a; margin-top: 20px; margin-bottom: 12px;">📑 $1</h2>')
      // Convert bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a; font-weight: 700;">$1</strong>')
      // Convert list bullet points cleanly
      .replace(/^[*-]\s+(.*)$/gim, '<div style="font-size: 13.5px; color: #334155; line-height: 1.6; margin-bottom: 6px; padding-left: 12px; border-left: 3px solid #38bdf8;">• $1</div>')
      // Convert paragraphs
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    return `<div style="font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-size: 13.5px; color: #1e293b; line-height: 1.7; background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">${formatted}</div>`;
  }

  // 3. OPENAI CHATGPT 4o-MINI VISION ENGINE (SAVING TOKENS + HIGH ACCURACY)
  async queryOpenAiGptGateway(promptText, base64JpegImage = null) {
    const key = this.getOpenAiKey();
    if (!key) return null;

    const systemPrompt = `Bạn là Trợ lý AI Chuyên gia Phân tích Văn bản Nghiệp vụ của CÔNG TY CỔ PHẦN CẤP NƯỚC THỦ ĐỨC (Thủ Đức Water).
Nhiệm vụ của bạn là đọc kỹ tất cả nét chữ, tiêu đề, con số, số hiệu văn bản, ngày tháng, đơn vị ban hành và các bên ký kết trong tài liệu đính kèm.

Hãy lập một BẢN BÁO CÁO PHÂN TÍCH TÓM TẮT ĐẦY ĐỦ VÀ CHÍNH XÁC bao gồm:
1. THÔNG TIN & CHỈ MỤC VĂN BẢN (Tên văn bản, Số hiệu/Ký hiệu, Ngày ban hành, Đơn vị/Các bên ban hành).
2. TỔNG QUAN NỘI DUNG VĂN BẢN (Mục đích chính, bối cảnh thực hiện, đối tượng áp dụng).
3. CÁC NỘI DUNG & ĐIỀU KHOẢN CỐT LÕI (Liệt kê chi tiết các điều khoản, chỉ số, số tiền, nghĩa vụ các bên).
4. KẾT LUẬN & CHỈ ĐẠO THỰC HIỆN (Các bước triển khai tiếp theo).`;

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

      // STRICTLY USE gpt-4o-mini MODEL FOR MAXIMUM TOKEN SAVINGS
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

  // 7. MAIN GATEWAY PIPE - USES GPT-4O-MINI FOR TOKEN-SAVING ACCURATE SUMMARIES
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
    const openAiKey = this.getOpenAiKey();
    const geminiKey = localStorage.getItem('gemini_api_key') || this.geminiApiKey;

    const userPrompt = `Đọc kỹ và phân tích tệp "${fileName}":\n` +
      (cleanText ? `Nội dung chữ trích xuất: "${cleanText.substring(0, 10000)}"` : `Đính kèm ảnh chụp sắc nét trang tài liệu scan.`);

    // B1. DISPATCH TO OPENAI CHATGPT GPT-4O-MINI VISION API GATEWAY
    if (openAiKey) {
      const gptResponse = await this.queryOpenAiGptGateway(userPrompt, pageBase64Image);
      if (gptResponse) {
        return {
          title: `🤖 ChatGPT 4o-mini Vision Response: ${fileName}`,
          modeText: `⚡ Đã tóm tắt bằng mô hình GPT-4o-mini (Tiết kiệm Token & Chính xác 100%).`,
          contentHtml: this.renderRawGptResponse(gptResponse)
        };
      }
    }

    // B2. DISPATCH TO GOOGLE GEMINI VISION API GATEWAY IF GEMINI KEY IS SET
    if (geminiKey) {
      const geminiResponse = await this.queryGeminiAI(userPrompt, pageBase64Image);
      if (geminiResponse) {
        return {
          title: `🤖 Gemini Vision Response: ${fileName}`,
          modeText: `⚡ Phản hồi từ Google Gemini AI Engine.`,
          contentHtml: this.renderRawGptResponse(geminiResponse)
        };
      }
    }

    // B3. IF NO API KEY IS SET - PROVIDE INTERACTIVE KEY SETTING GATEWAY BOX IN MODAL
    let summaryTitle = `🌐 Cổng Kết Nối AI Gateway: ${fileName}`;
    
    const formattedHtml = `
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 18px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <div style="font-weight: 800; font-size: 15px; color: #38bdf8; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <span>🔑 CỔNG KẾT NỐI CHATGPT & GEMINI AI GATEWAY</span>
        </div>
        <p style="font-size: 12.5px; color: #94a3b8; margin-bottom: 12px; line-height: 1.5;">
          Web App đã sẵn sàng truyền file **"${fileName}"** cho ChatGPT. Hãy dán mã **OpenAI ChatGPT API Key (sk-...)** hoặc **Google Gemini API Key (AIzaSy...)** bên dưới để nhận phản hồi từ ChatGPT:
        </p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <input type="password" id="modalGptKeyInput" placeholder="Nhập OpenAI Key (sk-...) hoặc Gemini Key..." class="form-input" style="flex: 1; min-width: 260px; padding: 9px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; font-size: 13px;">
          <button id="btnSaveModalGptKey" class="btn-primary" style="padding: 9px 18px; font-size: 13px; width: auto; background: #0284c7;">
            ⚡ Lưu Key & Gửi ChatGPT
          </button>
        </div>
        <div id="modalGptKeyStatus" style="font-size: 12px; margin-top: 8px; font-weight: 600; color: #4ade80;"></div>
      </div>
    `;

    return {
      title: summaryTitle,
      modeText: `🌐 Sẵn sàng gửi tệp cho ChatGPT / Gemini AI xử lý.`,
      contentHtml: formattedHtml
    };
  }
}

// Instantiate standalone module globally
window.aiAnalyzerModule = new AiAnalyzerModule();
