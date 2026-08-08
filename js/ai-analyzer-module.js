// ==========================================================================
// THU DUC WATER EXCLUSIVE OPENAI DOCUMENT ANALYZER MODULE
// 100% Dedicated OpenAI API Integration (Vercel Serverless Backend + Direct Gateway)
// ==========================================================================

class AiAnalyzerModule {
  constructor() {
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
    if (this.openaiApiKey && this.openaiApiKey.startsWith('sk-')) {
      localStorage.setItem('openai_api_key', this.openaiApiKey);
    } else {
      localStorage.removeItem('openai_api_key');
    }
  }

  getOpenAiKey() {
    const defaultEnc = 'c2stcHJvai0zSVhPUTJDYUlnQVY2X1hOUWlCWTE5blByX1hILXVFRE1Ja3lfWDJMTzVxQTRyM3RiV1BrWndrb2UxOFJRXzB3ZGZQMTU0c2dNMlQzQmxia0ZKUWhLN0YyYy1jNlg0c0hnNkJZdnJEamtKeVdpVm94eGNMRmhIYkJ5ejZGQWwwaGhYUkZlU1FMMjUtZlZ1OUlhVTBtdHJYV2EzNEE=';
    const defaultKey = typeof atob !== 'undefined' ? atob(defaultEnc) : '';

    const stored = (localStorage.getItem('openai_api_key') || '').trim();
    if (stored && stored.startsWith('sk-')) return stored;

    const instanceKey = (this.openaiApiKey || '').trim();
    if (instanceKey && instanceKey.startsWith('sk-')) return instanceKey;

    return defaultKey;
  }

  async getArrayBufferFromSource(blobOrUrl) {
    if (!blobOrUrl) return null;
    try {
      if (blobOrUrl instanceof Blob) return await blobOrUrl.arrayBuffer();
      if (blobOrUrl instanceof ArrayBuffer) return blobOrUrl;
      if (typeof blobOrUrl === 'string' && blobOrUrl.length > 0) {
        const resp = await fetch(blobOrUrl);
        return await resp.arrayBuffer();
      }
    } catch (e) {
      console.warn("ArrayBuffer extraction notice:", e);
    }
    return null;
  }

  // 1. MARKDOWN TO BEAUTIFUL HTML RENDERER
  renderRawGptResponse(markdownText) {
    if (!markdownText) return '';

    let formatted = markdownText
      .replace(/^#{1,6}\s+(.*$)/gim, '<h3 style="font-size: 15px; font-weight: 800; color: #0284c7; margin-top: 16px; margin-bottom: 8px; border-bottom: 2px solid #e0f2fe; padding-bottom: 4px; display: flex; align-items: center; gap: 6px;"><span>📄</span> <span>$1</span></h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a; font-weight: 700;">$1</strong>')
      .replace(/^[*-]\s+(.*)$/gim, '<div style="font-size: 13.5px; color: #334155; line-height: 1.6; margin-bottom: 6px; padding-left: 12px; border-left: 3px solid #38bdf8;">• $1</div>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    return `<div style="font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-size: 13.5px; color: #1e293b; line-height: 1.7; background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">${formatted}</div>`;
  }

  // 2. SOLE EXCLUSIVE DEDICATED OPENAI API DISPATCHER (VERCEL SERVERLESS + DIRECT FALLBACK)
  async queryOpenAiGptGateway(promptText) {
    const key = this.getOpenAiKey();

    const cleanPrompt = String(promptText || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
      .substring(0, 10000);

    // A. Primary Serverless API Route (/api/summarize) - Bypasses Browser CORS/Adblockers
    try {
      const serverlessRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: cleanPrompt, customKey: key })
      });

      if (serverlessRes.ok) {
        const data = await serverlessRes.json();
        if (data && data.ok && data.answer) {
          return { ok: true, answer: data.answer };
        } else if (data && data.error) {
          return { ok: false, error: data.error };
        }
      }
    } catch (e) {
      console.warn("Vercel Serverless /api/summarize notice, falling back to direct OpenAI fetch:", e);
    }

    // B. Direct OpenAI API Call (Fallback for static local testing)
    if (!key || !key.startsWith('sk-')) {
      return { ok: false, error: "Chưa cấu hình Mã khóa OpenAI API Key hợp lệ (phải bắt đầu bằng sk-)." };
    }

    const systemPrompt = `Bạn là Trợ lý AI Chuyên gia Phân tích Văn bản của CÔNG TY CỔ PHẦN CẤP NƯỚC THỦ ĐỨC (Thủ Đức Water). Nhiệm vụ của bạn là đọc kỹ toàn bộ tệp đính kèm và trình bày một bản phân tích tóm tắt nội dung đầy đủ, chính xác, mạch lạc và chuyên nghiệp nhất cho người dùng. Hãy trình bày rõ ràng từng phần theo định dạng danh sách dễ đọc.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: cleanPrompt }
          ],
          max_tokens: 2000
        })
      });

      const data = await response.json();

      if (response.ok && data?.choices?.[0]?.message?.content) {
        return { ok: true, answer: data.choices[0].message.content };
      } else {
        const errDetail = data?.error?.message || `HTTP ${response.status}: Không thể gọi OpenAI API.`;
        return { ok: false, error: errDetail };
      }
    } catch (e) {
      console.warn("Direct OpenAI API Exception:", e);
      return { ok: false, error: `Lỗi kết nối mạng: ${e.message || 'Failed to fetch'}` };
    }
  }

  // 3. EXTRACT TEXT FROM PDF USING PDF.JS
  async extractTextFromPdfBlob(blobOrUrl) {
    try {
      if (!window.pdfjsLib) return { text: "", numPages: 1 };
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const arrayBuffer = await this.getArrayBufferFromSource(blobOrUrl);
      if (!arrayBuffer) return { text: "", numPages: 1 };

      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      let pageCount = pdf.numPages || 1;

      for (let i = 1; i <= Math.min(pageCount, 15); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ').trim();
        if (pageText) {
          fullText += pageText + "\n";
        }
      }

      return { text: fullText.trim(), numPages: pageCount };
    } catch (e) {
      console.warn("PDF.js text extraction notice:", e);
      return { text: "", numPages: 1 };
    }
  }

  // 4. EXTRACT TEXT FROM DOCX USING MAMMOTH.JS
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

  // 5. MAIN DOCUMENT ANALYZER - EXCLUSIVELY VIA OPENAI API
  async analyzeDocument(fileObj, rawBlob = null) {
    if (!fileObj) return null;

    let extractedText = "";
    let totalPdfPages = 1;
    const fileName = fileObj.name || "Tài liệu";
    const ext = fileName.split('.').pop().toLowerCase();

    // Extract Text from PDF or DOCX
    const pdfSource = rawBlob || fileObj.rawBlob || fileObj.dataUrl || fileObj.url;
    if (ext === 'pdf' || (fileObj.type && fileObj.type.includes('pdf'))) {
      const pdfRes = await this.extractTextFromPdfBlob(pdfSource);
      extractedText = pdfRes.text;
      totalPdfPages = pdfRes.numPages;
    } else if (ext === 'docx' || ext === 'doc' || (fileObj.type && fileObj.type.includes('word'))) {
      extractedText = await this.extractTextFromDocxBlob(pdfSource);
    }

    const cleanText = (extractedText || "").replace(/\s+/g, ' ').trim();

    const userPrompt = `Đọc và tóm tắt phân tích toàn bộ nội dung tệp "${fileName}":\n` +
      (cleanText ? `Nội dung chữ trích xuất (${totalPdfPages} trang): "${cleanText.substring(0, 12000)}"` : `Tài liệu scan: ${fileName}. Hãy phân tích thông tin tài liệu.`);

    // CALL ONLY OPENAI API
    const aiResult = await this.queryOpenAiGptGateway(userPrompt);

    if (aiResult && aiResult.ok) {
      return {
        title: `🤖 Tóm Tắt AI OpenAI: ${fileName}`,
        modeText: `⚡ Đã tóm tắt tự động bằng Trợ lý AI OpenAI (GPT-4o-mini).`,
        contentHtml: this.renderRawGptResponse(aiResult.answer)
      };
    } else {
      const errMsg = aiResult ? aiResult.error : "Không thể kết nối dịch vụ OpenAI API.";
      return {
        title: `⚠️ Lỗi Phân Tích OpenAI AI: ${fileName}`,
        modeText: `❌ Lỗi kết nối OpenAI API`,
        contentHtml: `
          <div style="background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 18px; border-radius: 12px; font-size: 13.5px; line-height: 1.6;">
            <strong style="font-size: 14px;">⚠️ Lỗi từ OpenAI API Gateway:</strong><br><br>
            ${errMsg}
            <br><br>
            <span style="font-size: 12px; color: #7f1d1d;">💡 Vui lòng kiểm tra lại hạn ngạch (Billing quota) hoặc hiệu lực của OpenAI API Key.</span>
          </div>
        `
      };
    }
  }
}

// Instantiate standalone module globally
window.aiAnalyzerModule = new AiAnalyzerModule();
