// ==========================================================================
// SUPABASE REALTIME TEAM CHAT & ONLINE PRESENCE MONITORING ENGINE
// Cross-Device Real-time Chat Sync & Real Online Status Tracking via Supabase
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
      text: "Chào mừng bạn đến với Kênh Trò chuyện Nội bộ P.KDDVKH. Đã kích hoạt Supabase Realtime Broadcast & Presence Tracking!",
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
    this.onlineUserEmails = new Set();
    this.listeners = [];
    this.realtimeChannel = null;
    this.presenceChannel = null;
    this.init();
  }

  init() {
    // 1. Load Local Storage Cache
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

    // 2. Connect Supabase Realtime Chat Broadcast & Presence Tracking
    this.setupSupabaseRealtime();
  }

  setupSupabaseRealtime() {
    if (!window.supabaseClient) return;

    try {
      // Broadcast Channel for Instant Message Syncing between devices
      this.realtimeChannel = window.supabaseClient.channel('thuduc_realtime_chat_v2', {
        config: { broadcast: { self: false } }
      });

      this.realtimeChannel
        .on('broadcast', { event: 'new_message' }, (payload) => {
          if (payload && payload.payload) {
            const { targetId, message } = payload.payload;
            if (targetId && message) {
              if (!this.messages[targetId]) this.messages[targetId] = [];
              // Prevent duplicate messages
              if (!this.messages[targetId].some(m => m.id === message.id)) {
                this.messages[targetId].push(message);
                this.saveLocal();
                this.notify();
              }
            }
          }
        })
        .subscribe();

      // Presence Channel for Tracking Real Online Accounts
      this.presenceChannel = window.supabaseClient.channel('thuduc_presence_v2');

      this.presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = this.presenceChannel.presenceState();
          const activeEmails = new Set();
          
          Object.keys(state).forEach(key => {
            const presences = state[key];
            presences.forEach(p => {
              if (p && p.email) {
                activeEmails.add(p.email.toLowerCase().trim());
              }
            });
          });

          this.onlineUserEmails = activeEmails;
          this.notify();
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
            if (currentUser && currentUser.email) {
              await this.presenceChannel.track({
                uid: currentUser.uid,
                email: currentUser.email.toLowerCase().trim(),
                name: currentUser.name,
                online_at: new Date().toISOString()
              });
            }
          }
        });

    } catch (err) {
      console.warn("Supabase Realtime chat setup notice:", err);
    }
  }

  // Re-track presence when user logs in or switches account
  updateUserPresence() {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    if (this.presenceChannel && currentUser && currentUser.email) {
      try {
        this.presenceChannel.track({
          uid: currentUser.uid,
          email: currentUser.email.toLowerCase().trim(),
          name: currentUser.name,
          online_at: new Date().toISOString()
        });
      } catch (e) {}
    }
  }

  saveLocal() {
    localStorage.setItem('thuduc_water_team_chats', JSON.stringify(this.messages));
    const customChans = this.channels.filter(c => c.id.startsWith('chan_custom_'));
    localStorage.setItem('thuduc_water_custom_channels', JSON.stringify(customChans));
  }

  // DYNAMICALLY FETCH REAL REGISTERED USERS WITH REAL-TIME ONLINE STATUS
  getRealDirectUsers() {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    const allUsers = window.authManager ? window.authManager.getUsersList() : [];

    const currentEmail = currentUser ? (currentUser.email || '').toLowerCase().trim() : '';
    const otherUsers = allUsers.filter(u => u && u.email && u.email.toLowerCase().trim() !== currentEmail);

    if (otherUsers.length === 0) {
      // Default fallback real accounts if only 1 user exists in local session
      return [
        { 
          id: "dm_admin_letuananh", 
          name: "Lê Tuấn Anh", 
          email: "letuananh18@gmail.com", 
          role: "Admin / Quản trị hệ thống", 
          status: this.onlineUserEmails.has("letuananh18@gmail.com") ? "🟢 Trực tuyến" : "⚪ Ngoại tuyến", 
          isOnline: this.onlineUserEmails.has("letuananh18@gmail.com"),
          desc: "Trò chuyện riêng 1:1 với Lê Tuấn Anh" 
        },
        { 
          id: "dm_admin_waterain8n", 
          name: "Tuấn Anh (Water Admin)", 
          email: "waterain8n@gmail.com", 
          role: "Admin Ban Quản Trị", 
          status: this.onlineUserEmails.has("waterain8n@gmail.com") ? "🟢 Trực tuyến" : "⚪ Ngoại tuyến", 
          isOnline: this.onlineUserEmails.has("waterain8n@gmail.com"),
          desc: "Trò chuyện riêng 1:1 với Water Admin" 
        }
      ];
    }

    return otherUsers.map(u => {
      const emailClean = (u.email || '').toLowerCase().trim();
      const isOnline = this.onlineUserEmails.has(emailClean);
      
      return {
        id: "dm_user_" + (u.uid || emailClean.replace(/[@.]/g, '_')),
        name: u.name || emailClean.split('@')[0],
        email: emailClean,
        role: u.role || "Cán bộ P.KDDVKH",
        status: isOnline ? "🟢 Trực tuyến" : "⚪ Ngoại tuyến",
        isOnline: isOnline,
        desc: `Trò chuyện riêng 1:1 với ${u.name || emailClean}`
      };
    });
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

    // Broadcast message over Supabase Realtime Channel to all other connected logged in users
    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: {
            targetId: this.activeTargetId,
            message: newMsg
          }
        });
      } catch (e) {}
    }

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
