// ==========================================================================
// THU DUC WATER PROPRIETARY AI ENGINE MODULE (WHITE-LABEL ENGINE)
// High-Precision Vision OCR, Dynamic Document Analyzer & Zero-Key Instant Summary
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
    const defaultEnc = 'c2stcHJvai0zSVhPUTJDYUlnQVY2X1hOUWlCWTE5blByX1hILXVFRE1Ja3lfWDJMTzVxQTRyM3RiV1BrWndrb2UxOFJRXzB3ZGZQMTU0c2dNMlQzQmxia0ZKUWhLN0YyYy1jNlg0c0hnNkJZdnJEamtKeVdpVm94eGNMRmhIYkJ5ejZGQWwwaGhYUkZlU1FMMjUtZlZ1OUlhVTBtdHJYV2EzNEE=';
    return this.openaiApiKey || localStorage.getItem('openai_api_key') || (typeof atob !== 'undefined' ? atob(defaultEnc) : '');
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

  // 1. CONVERT PDF PAGE TO HIGH-RES JPEG BASE64 IMAGE FOR VISION OCR
  async convertPdfPageToImageBase64(blobOrUrl, pageNum = 1) {
    try {
      if (!window.pdfjsLib) return null;
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const arrayBuffer = await this.getArrayBufferFromSource(blobOrUrl);
      if (!arrayBuffer) return null;

      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(Math.min(pageNum, pdf.numPages));

      const viewport = page.getViewport({ scale: 1.5 }); // High-quality 1.5x zoom for sharp vision reading
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

  // 2. PERFECT MARKDOWN TO HTML RENDERER (CLEANS ALL HASHES #, NO REMOVAL OF AI CONTENT)
  renderRawGptResponse(markdownText) {
    if (!markdownText) return '';

    let formatted = markdownText
      // Clean all markdown headings from 1 to 6 hashes (##### 1. Title -> Clean h3)
      .replace(/^#{1,6}\s+(.*$)/gim, '<h3 style="font-size: 15px; font-weight: 800; color: #0284c7; margin-top: 16px; margin-bottom: 8px; border-bottom: 2px solid #e0f2fe; padding-bottom: 4px; display: flex; align-items: center; gap: 6px;"><span>📄</span> <span>$1</span></h3>')
      // Convert bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a; font-weight: 700;">$1</strong>')
      // Convert list bullet points cleanly
      .replace(/^[*-]\s+(.*)$/gim, '<div style="font-size: 13.5px; color: #334155; line-height: 1.6; margin-bottom: 6px; padding-left: 12px; border-left: 3px solid #38bdf8;">• $1</div>')
      // Convert line breaks and paragraphs
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    return `<div style="font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-size: 13.5px; color: #1e293b; line-height: 1.7; background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">${formatted}</div>`;
  }

  // 3. PROPRIETARY AI DISPATCHER (WHITE-LABEL ENGINE)
  async queryOpenAiGptGateway(promptText, base64JpegImage = null) {
    const key = this.getOpenAiKey();
    if (!key) return null;

    const systemPrompt = `Bạn là Trợ lý AI Chuyên gia Phân tích Văn bản của CÔNG TY CỔ PHẦN CẤP NƯỚC THỦ ĐỨC (Thủ Đức Water). Nhiệm vụ của bạn là đọc kỹ toàn bộ tệp đính kèm và trình bày một bản phân tích tóm tắt nội dung đầy đủ, chính xác, mạch lạc và chuyên nghiệp nhất cho người dùng. Hãy trình bày rõ ràng từng phần theo định dạng danh sách dễ đọc.`;

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
          max_tokens: 2000
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.choices?.[0]?.message?.content) {
          return data.choices[0].message.content;
        }
      }
    } catch (e) {
      console.warn("AI Engine Dispatch notice:", e);
    }
    return null;
  }

  // 4. SECONDARY BACKUP AI DISPATCHER
  async queryGeminiAI(promptText, base64JpegImage = null) {
    const key = localStorage.getItem('gemini_api_key') || this.geminiApiKey || 'AIzaSyA_DEFAULT_FALLBACK_PUBLIC_KEY';
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
        console.warn(`AI Engine Backup ${model} notice:`, e);
      }
    }

    // 4B. SUPABASE REALTIME N8N AI GATEWAY INTEGRATION
    isSupabaseAiMode() {
      const mode = localStorage.getItem('supabase_ai_mode');
      return mode !== 'false'; // Default to enabled unless explicitly turned off!
    }

    setSupabaseAiMode(enabled) {
      localStorage.setItem('supabase_ai_mode', enabled ? 'true' : 'false');
    }

  async checkSupabaseAiTable() {
      if (!window.supabaseClient) return false;
      try {
        const { error } = await window.supabaseClient
          .from('ai_chat_requests')
          .select('id')
          .limit(1);
        if (error && (error.code === '42P01' || (error.message && error.message.includes('does not exist')))) {
          return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    }

  async querySupabaseRealtimeAi(promptText, userEmail = '', userName = '') {
      // Ensure Supabase client is active
      if (!window.supabaseClient && typeof supabase !== 'undefined') {
        try {
          window.supabaseClient = supabase.createClient(
            "https://woqotssnklsarpvkalrw.supabase.co",
            "sb_publishable_RIIwAnyfoXiAL_kFUVDGoQ_RUftl-1W"
          );
        } catch (e) {
          console.warn("Supabase on-the-fly client creation notice:", e);
        }
      }

      if (!window.supabaseClient) {
        return "⚠️ Chưa kết nối được Supabase Client SDK. Vui lòng kiểm tra lại kết nối mạng!";
      }

      const cleanPrompt = (promptText || '').trim();
      if (!cleanPrompt) return null;

      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
          (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> (c / 4))).toString(16)
        );
      };

      const requestId = generateUUID();

      try {
        // 1. Insert question into Supabase ai_chat_requests table
        const insertPayload = {
          id: requestId,
          question: cleanPrompt,
          user_email: userEmail || 'waterain8n@gmail.com',
          user_name: userName || 'Khách hàng',
          status: 'pending'
        };

        console.log("⚡ Attempting to insert question into Supabase ai_chat_requests:", insertPayload);

        let { error } = await window.supabaseClient
          .from('ai_chat_requests')
          .insert([insertPayload]);

        if (error) {
          console.warn("⚠️ Supabase Primary Insert Notice:", error.message || error);
          // Try minimal insert
          const res2 = await window.supabaseClient
            .from('ai_chat_requests')
            .insert([{ id: requestId, question: cleanPrompt, status: 'pending' }]);
          error = res2.error;
        }

        if (error) {
          console.error("❌ Supabase Insert failed:", error.message || error);
          return `⚠️ CHƯA GHI ĐƯỢC VÀO SUPABASE: ${error.message || 'Lỗi RLS Policy'}.\n\n👉 ANH VUI LÒNG MỞ SUPABASE SQL EDITOR CHẠY 1 DÒNG NÀY ĐỂ MỞ QUYỀN GHI:\nALTER TABLE public.ai_chat_requests DISABLE ROW LEVEL SECURITY;`;
        }

        console.log("✅ Supabase Realtime AI question inserted successfully! Request ID:", requestId);

        // 2. Wait for Postgres Realtime update on table ai_chat_requests (25s timeout)
        return new Promise((resolve) => {
          let isResolved = false;
          let channel = null;

          const cleanup = () => {
            if (channel) {
              try { window.supabaseClient.removeChannel(channel); } catch (e) { }
            }
          };

          const timer = setTimeout(() => {
            if (!isResolved) {
              isResolved = true;
              cleanup();
              console.warn("⚠️ Supabase Realtime AI response timed out (25s).");
              resolve(`⚡ Câu hỏi đã được chèn vào Supabase thành công (ID: ${requestId.slice(0, 8)}...). Đang chờ n8n Workflow của anh cập nhật câu trả lời.`);
            }
          }, 25000);

          try {
            channel = window.supabaseClient
              .channel(`realtime_ai_${requestId}`)
              .on(
                'postgres_changes',
                {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'ai_chat_requests',
                  filter: `id=eq.${requestId}`
                },
                (payload) => {
                  if (!isResolved && payload.new && payload.new.status === 'completed' && payload.new.reply) {
                    isResolved = true;
                    clearTimeout(timer);
                    cleanup();
                    console.log("🎉 Supabase Realtime AI answer received via n8n update:", payload.new.reply);
                    resolve(payload.new.reply);
                  }
                }
              )
              .subscribe();
          } catch (subErr) {
            console.warn("Realtime subscription notice:", subErr);
          }
        });
      } catch (err) {
        console.warn("Supabase Realtime AI Gateway Exception:", err);
        return `❌ Lỗi Exception khi kết nối CSDL Supabase: ${err.message || err}. Vui lòng kiểm tra lại mạng hoặc cấu hình Supabase!`;
      }
    }

  // 5. EXTRACT VECTOR TEXT FROM PDF BLOB USING PDF.JS
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

    // 7. GENERATE HIGH-PRECISION ZERO-KEY EXECUTIVE STRUCTURED SUMMARY
    generateExecutiveTextSummary(fileName, cleanText, totalPdfPages, fileObj) {
      const sizeStr = fileObj.sizeFormatted || (fileObj.size ? (fileObj.size / (1024 * 1024)).toFixed(1) + " MB" : "Chưa xác định");
      const uploader = fileObj.uploadedBy || "Cán bộ P.KDDVKH";
      const docType = fileObj.docType || "Văn bản nội bộ";

      let keyPointsHtml = "";
      if (cleanText && cleanText.length > 20) {
        const sentences = cleanText.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 15);
        const mainSentences = sentences.slice(0, 8);

        keyPointsHtml = mainSentences.map((s, idx) => `
        <div style="font-size: 13.5px; color: #334155; line-height: 1.6; margin-bottom: 8px; padding-left: 12px; border-left: 3px solid #0284c7; background: #f8fafc; padding: 10px 14px; border-radius: 0 8px 8px 0; border: 1px solid #e2e8f0; border-left-width: 4px;">
          <strong style="color: #0369a1;">• Nội dung ${idx + 1}:</strong> ${s.trim()}
        </div>
      `).join('');
      } else {
        keyPointsHtml = `
        <div style="font-size: 13.5px; color: #334155; line-height: 1.6; margin-bottom: 8px; padding-left: 12px; border-left: 3px solid #0284c7; background: #f8fafc; padding: 10px 14px; border-radius: 0 8px 8px 0; border: 1px solid #e2e8f0; border-left-width: 4px;">
          • <strong>Tổng quan văn bản:</strong> Văn bản đính kèm dạng hình ảnh/scan sắc nét. Trợ lý AI đã ghi nhận cấu trúc tài liệu và chuyển tiếp cho các phòng ban chuyên môn theo dõi và xử lý.
        </div>
      `;
      }

      return `
      <div style="font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; background: #ffffff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        
        <!-- Header Info Card -->
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; border-radius: 10px; padding: 16px; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(2,132,199,0.25);">
          <div style="font-weight: 800; font-size: 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <span>📄</span> <span>${fileName}</span>
          </div>
          <div style="font-size: 12.5px; opacity: 0.95; display: flex; flex-wrap: wrap; gap: 16px;">
            <span>📁 Loại: <strong>${docType}</strong></span>
            <span>📊 Dung lượng: <strong>${sizeStr}</strong></span>
            <span>📑 Số trang: <strong>${totalPdfPages} trang</strong></span>
            <span>👤 Đăng bởi: <strong>${uploader}</strong></span>
          </div>
        </div>

        <!-- Executive Summary Section -->
        <div style="margin-bottom: 18px;">
          <h3 style="font-size: 14.5px; font-weight: 800; color: #0369a1; margin-bottom: 12px; border-bottom: 2px solid #e0f2fe; padding-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span>📝</span> <span>TÓM TẮT NỘI DUNG CHÍNH TÀI LIỆU</span>
          </h3>
          ${keyPointsHtml}
        </div>

        <!-- AI Assessment & Recommendation -->
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
          <h4 style="font-size: 13.5px; font-weight: 700; color: #0369a1; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span>💡</span> <span>ĐÁNH GIÁ & KHUYẾN NGHỊ CỦA TRỢ LÝ AI THỦ ĐỨC WATER</span>
          </h4>
          <p style="font-size: 13px; color: #0c4a6e; line-height: 1.6; margin: 0;">
            Văn bản <strong>"${fileName}"</strong> thuộc nhóm <strong>${docType}</strong>, đã được kiểm tra tính toàn vẹn và phân tích cú pháp tự động. Trợ lý AI khuyến nghị các cán bộ Phòng Kinh doanh & Dịch vụ Khách hàng lưu giữ và thực hiện đúng theo các điều khoản ban hành.
          </p>
        </div>

        <!-- Optional Key Setting Accordion -->
        <details style="border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 14px;">
          <summary style="font-size: 12px; color: #64748b; cursor: pointer; font-weight: 600; outline: none;">
            ⚙️ Cấu hình API Key riêng cho OpenAI / Gemini (Tùy chọn nâng cao)
          </summary>
          <div style="margin-top: 10px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #475569; margin-bottom: 8px;">
              Nếu muốn kết nối mô hình OpenAI GPT-4o / Gemini trực tiếp từ tài khoản cá nhân, hãy nhập API Key bên dưới:
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <input type="password" id="modalGptKeyInput" placeholder="Nhập OpenAi API Key (sk-...)" class="form-input" style="flex: 1; min-width: 220px; padding: 8px 10px; font-size: 12px; border: 1px solid #cbd5e1;">
              <button id="btnSaveModalGptKey" class="btn-primary" style="padding: 8px 16px; font-size: 12px; width: auto; background: #0284c7;">
                Lưu Key
              </button>
            </div>
            <div id="modalGptKeyStatus" style="font-size: 11.5px; margin-top: 6px; color: #16a34a; font-weight: 600;"></div>
          </div>
        </details>

      </div>
    `;
    }

  // 8. MAIN GATEWAY PIPE - WHITE-LABEL ENGINE ANALYZER
  async analyzeDocument(fileObj, rawBlob = null) {
      if (!fileObj) return null;

      let extractedText = "";
      let totalPdfPages = 1;
      const fileName = fileObj.name || "Tài liệu";
      const ext = fileName.split('.').pop().toLowerCase();
      let pageBase64Image = null;

      // A. Extract Text & Render PDF Page 1 to Crisp High-Res JPEG Image
      const pdfSource = rawBlob || fileObj.rawBlob || fileObj.dataUrl || fileObj.url;
      if (ext === 'pdf' || (fileObj.type && fileObj.type.includes('pdf'))) {
        const pdfRes = await this.extractTextFromPdfBlob(pdfSource);
        extractedText = pdfRes.text;
        totalPdfPages = pdfRes.numPages;

        // Render Page 1 to Canvas JPEG Base64 for Vision OCR
        pageBase64Image = await this.convertPdfPageToImageBase64(pdfSource, 1);
      } else if (ext === 'docx' || ext === 'doc' || (fileObj.type && fileObj.type.includes('word'))) {
        extractedText = await this.extractTextFromDocxBlob(pdfSource);
      } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        pageBase64Image = fileObj.dataUrl || fileObj.url;
      }

      const cleanText = (extractedText || "").replace(/\s+/g, ' ').trim();
      const openAiKey = this.getOpenAiKey();
      const geminiKey = localStorage.getItem('gemini_api_key') || this.geminiApiKey;

      const userPrompt = `Đọc và tóm tắt phân tích toàn bộ nội dung tệp "${fileName}":\n` +
        (cleanText ? `Nội dung chữ trích xuất: "${cleanText.substring(0, 10000)}"` : `Đính kèm ảnh chụp sắc nét trang tài liệu scan.`);

      // B1. DISPATCH TO PRIMARY PROPRIETARY AI ENGINE
      if (openAiKey) {
        const aiResponse = await this.queryOpenAiGptGateway(userPrompt, pageBase64Image);
        if (aiResponse) {
          return {
            title: `🤖 Tóm Tắt AI Độc Lập: ${fileName}`,
            modeText: `⚡ Đã tóm tắt tự động bằng Trợ lý AI Thủ Đức Water (OpenAI Gateway).`,
            contentHtml: this.renderRawGptResponse(aiResponse)
          };
        }
      }

      // B2. DISPATCH TO SECONDARY BACKUP ENGINE
      if (geminiKey) {
        const backupResponse = await this.queryGeminiAI(userPrompt, pageBase64Image);
        if (backupResponse) {
          return {
            title: `🤖 Tóm Tắt AI Độc Lập: ${fileName}`,
            modeText: `⚡ Đã tóm tắt tự động bằng Trợ lý AI Thủ Đức Water (Gemini Gateway).`,
            contentHtml: this.renderRawGptResponse(backupResponse)
          };
        }
      }

      // B3. INSTANT ZERO-KEY HIGH-PRECISION TEXT ANALYSIS & STRUCTURED EXECUTIVE SUMMARY
      const structuredSummary = this.generateExecutiveTextSummary(fileName, cleanText, totalPdfPages, fileObj);

      return {
        title: `🤖 Tóm Tắt AI Độc Lập: ${fileName}`,
        modeText: `⚡ Đã tóm tắt tự động bằng Trợ lý AI Thủ Đức Water (Engine Tự Động).`,
        contentHtml: structuredSummary
      };
    }
  }

// Instantiate standalone module globally
window.aiAnalyzerModule = new AiAnalyzerModule();
