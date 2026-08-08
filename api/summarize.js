export default async function handler(req, res) {
  // Set CORS headers for browser compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { promptText, customKey } = body || {};

    if (!promptText) {
      return res.status(400).json({ ok: false, error: 'Thiếu thông tin văn bản cần tóm tắt (promptText).' });
    }

    const defaultEnc = 'c2stcHJvai0zSVhPUTJDYUlnQVY2X1hOUWlCWTE5blByX1hILXVFRE1Ja3lfWDJMTzVxQTRyM3RiV1BrWndrb2UxOFJRXzB3ZGZQMTU0c2dNMlQzQmxia0ZKUWhLN0YyYy1jNlg0c0hnNkJZdnJEamtKeVdpVm94eGNMRmhIYkJ5ejZGQWwwaGhYUkZlU1FMMjUtZlZ1OUlhVTBtdHJYV2EzNEE=';
    const defaultKey = Buffer.from(defaultEnc, 'base64').toString('utf-8');

    let key = (customKey || '').trim();
    if (!key || !key.startsWith('sk-')) {
      key = defaultKey;
    }

    const cleanPromptText = String(promptText)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
      .substring(0, 10000);

    const systemPrompt = `Bạn là Trợ lý AI Chuyên gia Phân tích Văn bản của CÔNG TY CỔ PHẦN CẤP NƯỚC THỦ ĐỨC (Thủ Đức Water). Nhiệm vụ của bạn là đọc kỹ toàn bộ tệp đính kèm và trình bày một bản phân tích tóm tắt nội dung đầy đủ, chính xác, mạch lạc và chuyên nghiệp nhất cho người dùng. Hãy trình bày rõ ràng từng phần theo định dạng danh sách dễ đọc.`;

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cleanPromptText }
        ],
        max_tokens: 2000
      })
    });

    const data = await openAiResponse.json();

    if (openAiResponse.ok && data?.choices?.[0]?.message?.content) {
      return res.status(200).json({ ok: true, answer: data.choices[0].message.content });
    } else {
      const errMsg = data?.error?.message || `HTTP ${openAiResponse.status}: Không thể gọi OpenAI API.`;
      return res.status(openAiResponse.status || 500).json({ ok: false, error: errMsg });
    }
  } catch (err) {
    console.error("Vercel Serverless OpenAI Error:", err);
    return res.status(500).json({ ok: false, error: `Lỗi kết nối Serverless Backend: ${err.message}` });
  }
}
