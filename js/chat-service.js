// ==========================================================================
// REAL-TIME TEAM CHAT SERVICE FOR PHÒNG KDDVKH (WITH FILE ATTACHMENTS & CHANNELS)
// ==========================================================================

const INITIAL_CHANNELS = [
  { id: "chan_general", name: "💬 # Trao đổi chung P.KDDVKH", type: "channel", unread: 0, desc: "Kênh thảo luận công việc chung Phòng Kinh doanh & DVKH" },
  { id: "chan_contracts", name: "📝 # Hợp đồng & Khách hàng mới", type: "channel", unread: 0, desc: "Trao đổi tiến độ ký hợp đồng và hồ sơ khách hàng mới" },
  { id: "chan_complaints", name: "⚠️ # Xử lý Khiếu nại & Sự cố", type: "channel", unread: 0, desc: "Phối hợp xử lý sự cố cấp nước & khiếu nại thủy kế" },
  { id: "chan_rates", name: "💰 # Biểu giá & Thu tiền nước", type: "channel", unread: 0, desc: "Thảo luận biểu giá dịch vụ và theo dõi doanh thu" }
];

const INITIAL_MESSAGES = {
  chan_general: [
    {
      id: "msg_init_1",
      senderName: "Lê Tuấn Anh",
      senderRole: "Admin",
      senderUid: "admin_18",
      text: "Chào cả phòng KDDVKH! Kênh chat nội bộ đã được kích hoạt trên hệ thống Water Intelligence Hub. Mọi người có thể trao đổi công việc và gửi tệp đính kèm trực tiếp tại đây nhé!",
      timestamp: "08:30",
      attachment: null
    }
  ]
};

class ChatService {
  constructor() {
    this.channels = INITIAL_CHANNELS;
    this.messages = INITIAL_MESSAGES;
    this.activeTargetId = "chan_general";
    this.listeners = [];
    this.init();
  }

  init() {
    const savedMsg = localStorage.getItem('thuduc_water_team_chats');
    if (savedMsg) {
      try {
        this.messages = JSON.parse(savedMsg);
      } catch (e) {
        this.messages = INITIAL_MESSAGES;
      }
    }
  }

  saveLocal() {
    localStorage.setItem('thuduc_water_team_chats', JSON.stringify(this.messages));
  }

  getActiveMessages() {
    return this.messages[this.activeTargetId] || [];
  }

  getActiveChannel() {
    return this.channels.find(c => c.id === this.activeTargetId) || this.channels[0];
  }

  setActiveTarget(targetId) {
    this.activeTargetId = targetId;
    const chan = this.channels.find(c => c.id === targetId);
    if (chan) chan.unread = 0;
    this.notify();
  }

  sendMessage(text, attachment = null) {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : { name: 'Lê Tuấn Anh', role: 'Admin', uid: 'admin_18' };
    if (!text.trim() && !attachment) return;

    const newMsg = {
      id: "msg_" + Date.now(),
      senderName: currentUser.name || "Lê Tuấn Anh",
      senderRole: currentUser.role || "Cán bộ KDDVKH",
      senderUid: currentUser.uid || "admin_18",
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      attachment: attachment
    };

    if (!this.messages[this.activeTargetId]) {
      this.messages[this.activeTargetId] = [];
    }

    this.messages[this.activeTargetId].push(newMsg);
    this.saveLocal();
    this.notify();
  }

  clearChannelMessages() {
    this.messages[this.activeTargetId] = [];
    this.saveLocal();
    this.notify();
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.getActiveMessages()));
  }
}

window.chatService = new ChatService();
