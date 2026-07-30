// ==========================================================================
// REAL-TIME TEAM CHAT & CUSTOM GROUP CHANNELS WITH MEMBER SELECTION
// Dynamically Syncs Real Registered Users & Supports Private Group Channels
// ==========================================================================

const INITIAL_CHANNELS = [
  { id: "chan_general", name: "💬 # Trao đổi chung P.KDDVKH", type: "channel", desc: "Kênh thảo luận công việc chung Phòng Kinh doanh & DVKH", members: ["all"] },
  { id: "chan_contracts", name: "📝 # Hợp đồng & Khách hàng mới", type: "channel", desc: "Trao đổi tiến độ ký hợp đồng và hồ sơ khách hàng mới", members: ["all"] },
  { id: "chan_complaints", name: "⚠️ # Xử lý Khiếu nại & Sự cố", type: "channel", desc: "Phối hợp xử lý sự cố cấp nước & khiếu nại thủy kế", members: ["all"] },
  { id: "chan_rates", name: "💰 # Biểu giá & Thu tiền nước", type: "channel", desc: "Thảo luận biểu giá dịch vụ và theo dõi doanh thu", members: ["all"] }
];

const INITIAL_MESSAGES = {
  chan_general: [
    {
      id: "msg_init_1",
      senderName: "Hệ thống Water Hub",
      senderRole: "System",
      senderUid: "system",
      text: "Chào mừng bạn đến với Kênh Trò chuyện Nội bộ P.KDDVKH. Bạn có thể bấm nút '+ Tạo kênh nhóm' để tạo các nhóm làm việc chuyên đề và add riêng các cán bộ vào nhóm!",
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      attachment: null
    }
  ]
};

class ChatService {
  constructor() {
    this.channels = [...INITIAL_CHANNELS];
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

    const savedCustomChans = localStorage.getItem('thuduc_water_custom_channels');
    if (savedCustomChans) {
      try {
        const customChans = JSON.parse(savedCustomChans);
        customChans.forEach(c => {
          if (!this.channels.some(x => x.id === c.id)) {
            this.channels.push(c);
          }
        });
      } catch (e) {}
    }
  }

  saveLocal() {
    localStorage.setItem('thuduc_water_team_chats', JSON.stringify(this.messages));
    const customChans = this.channels.filter(c => c.id.startsWith('chan_custom_'));
    localStorage.setItem('thuduc_water_custom_channels', JSON.stringify(customChans));
  }

  // DYNAMICALLY FETCH REAL REGISTERED USERS FROM AUTH MANAGER / SUPABASE
  getRealDirectUsers() {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    const allUsers = window.authManager ? window.authManager.getUsersList() : [];

    const currentEmail = currentUser ? (currentUser.email || '').toLowerCase() : '';
    const otherUsers = allUsers.filter(u => u && u.email && u.email.toLowerCase() !== currentEmail);

    if (otherUsers.length === 0) {
      return [
        { id: "dm_admin_letuananh", name: "Lê Tuấn Anh", email: "letuananh18@gmail.com", role: "Admin / Quản trị hệ thống", status: "🟢 Trực tuyến", desc: "Trò chuyện riêng 1:1 với Lê Tuấn Anh" },
        { id: "dm_cskh_officer", name: "Cán bộ CSKH P.KDDVKH", email: "cskh@capnuocthuduc.vn", role: "Chuyên viên Khách hàng", status: "🟢 Trực tuyến", desc: "Trò chuyện riêng 1:1 với Cán bộ CSKH" }
      ];
    }

    return otherUsers.map(u => ({
      id: "dm_user_" + (u.uid || u.email.replace(/[@.]/g, '_')),
      name: u.name || u.email.split('@')[0],
      email: u.email,
      role: u.role || "Cán bộ P.KDDVKH",
      status: "🟢 Trực tuyến",
      desc: `Trò chuyện riêng 1:1 với ${u.name || u.email}`
    }));
  }

  // CREATE CUSTOM GROUP CHANNEL WITH SELECTED MEMBERS
  createCustomChannel(name, desc, memberEmails = []) {
    const channelId = "chan_custom_" + Date.now();
    const newChan = {
      id: channelId,
      name: `👥 # ${name.trim()}`,
      type: "custom_channel",
      desc: desc.trim() || `Kênh nhóm chuyên đề: ${name.trim()}`,
      members: memberEmails
    };

    this.channels.push(newChan);
    this.messages[channelId] = [
      {
        id: "msg_init_c_" + Date.now(),
        senderName: "Hệ thống Water Hub",
        senderRole: "System",
        senderUid: "system",
        text: `🎉 Kênh nhóm "${name.trim()}" đã được khởi tạo với ${memberEmails.length} thành viên tham gia!`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        attachment: null
      }
    ];

    this.saveLocal();
    this.setActiveTarget(channelId);
    return newChan;
  }

  getChannels() {
    return this.channels;
  }

  getActiveMessages() {
    return this.messages[this.activeTargetId] || [];
  }

  getActiveTargetInfo() {
    const chan = this.channels.find(c => c.id === this.activeTargetId);
    if (chan) return chan;

    const realUsers = this.getRealDirectUsers();
    const dm = realUsers.find(u => u.id === this.activeTargetId);
    if (dm) return { id: dm.id, name: `👤 ${dm.name} (${dm.email})`, desc: dm.desc };

    return this.channels[0];
  }

  setActiveTarget(targetId) {
    this.activeTargetId = targetId;
    this.notify();
  }

  sendMessage(text, attachment = null) {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    const senderName = currentUser ? (currentUser.name || currentUser.email.split('@')[0]) : "Cán bộ P.KDDVKH";
    const senderRole = currentUser ? (currentUser.role || "Cán bộ") : "Nhân viên";
    const senderUid = currentUser ? currentUser.uid : "user_guest";

    if (!text.trim() && !attachment) return;

    const newMsg = {
      id: "msg_" + Date.now(),
      senderName: senderName,
      senderRole: senderRole,
      senderUid: senderUid,
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
