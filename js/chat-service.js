// ==========================================================================
// REAL-TIME TEAM CHAT & DIRECT MESSAGING (1:1 DM) SERVICE FOR PHÒNG KDDVKH
// Supports Group Channels + Private 1:1 Direct Chats between User Accounts
// ==========================================================================

const INITIAL_CHANNELS = [
  { id: "chan_general", name: "💬 # Trao đổi chung P.KDDVKH", type: "channel", desc: "Kênh thảo luận công việc chung Phòng Kinh doanh & DVKH" },
  { id: "chan_contracts", name: "📝 # Hợp đồng & Khách hàng mới", type: "channel", desc: "Trao đổi tiến độ ký hợp đồng và hồ sơ khách hàng mới" },
  { id: "chan_complaints", name: "⚠️ # Xử lý Khiếu nại & Sự cố", type: "channel", desc: "Phối hợp xử lý sự cố cấp nước & khiếu nại thủy kế" },
  { id: "chan_rates", name: "💰 # Biểu giá & Thu tiền nước", type: "channel", desc: "Thảo luận biểu giá dịch vụ và theo dõi doanh thu" }
];

const DIRECT_USERS = [
  { id: "dm_minhtri", name: "👤 Nguyễn Minh Trí", role: "Trưởng phòng KDDVKH", status: "🟢 Trực tuyến", desc: "Trò chuyện riêng 1:1 với Nguyễn Minh Trí (Trưởng phòng)" },
  { id: "dm_ngoclan", name: "👤 Trần Thị Ngọc Lan", role: "Chuyên viên Hợp đồng", status: "🟢 Trực tuyến", desc: "Trò chuyện riêng 1:1 với Trần Thị Ngọc Lan (Chuyên viên)" },
  { id: "dm_hoangnam", name: "👤 Phạm Hoàng Nam", role: "Kỹ thuật Khảo sát", status: "🟡 Vắng mặt", desc: "Trò chuyện riêng 1:1 với Phạm Hoàng Nam (Kỹ thuật)" },
  { id: "dm_quangvinh", name: "👤 Bùi Quang Vinh", role: "Bộ phận Tổng đài CSKH", status: "🟢 Trực tuyến", desc: "Trò chuyện riêng 1:1 với Bùi Quang Vinh (CSKH)" }
];

const INITIAL_MESSAGES = {
  chan_general: [
    {
      id: "msg_init_1",
      senderName: "Lê Tuấn Anh",
      senderRole: "Admin",
      senderUid: "admin_18",
      text: "Chào cả phòng KDDVKH! Kênh chat nội bộ đã được kích hoạt trên hệ thống Water Intelligence Hub. Mọi người có thể trao đổi công việc và nhắn tin riêng 1:1 trực tiếp tại đây nhé!",
      timestamp: "08:30",
      attachment: null
    }
  ],
  dm_minhtri: [
    {
      id: "msg_dm_1",
      senderName: "Nguyễn Minh Trí",
      senderRole: "Trưởng phòng KDDVKH",
      senderUid: "user_minhtri",
      text: "Chào Tuấn Anh, anh vừa duyệt Kế hoạch Khảo sát Thủy kế Quý III. Em rà soát lại danh sách hồ sơ đính kèm giúp anh nhé!",
      timestamp: "09:15",
      attachment: null
    }
  ]
};

class ChatService {
  constructor() {
    this.channels = INITIAL_CHANNELS;
    this.directUsers = DIRECT_USERS;
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

  getActiveTargetInfo() {
    const chan = this.channels.find(c => c.id === this.activeTargetId);
    if (chan) return chan;

    const dm = this.directUsers.find(u => u.id === this.activeTargetId);
    if (dm) return { id: dm.id, name: `${dm.name} (${dm.role})`, desc: dm.desc };

    return this.channels[0];
  }

  setActiveTarget(targetId) {
    this.activeTargetId = targetId;
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
