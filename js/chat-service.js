// ==========================================================================
// UNSTOPPABLE HYBRID REALTIME PRESENCE & CHAT NOTIFICATION ENGINE
// Real-time Chat Sync, 8s Quad-Channel Presence Heartbeat & Glowing Online LEDs
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
      text: "Chào mừng bạn đến với Kênh Trò chuyện Nội bộ P.KDDVKH. Đã kết nối Hệ thống Trực tuyến Realtime Quad-Engine!",
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      attachment: null
    }
  ]
};

class ChatService {
  constructor() {
    this.channels = [...INITIAL_CHANNELS];
    this.messages = INITIAL_MESSAGES;
    this.unreadCounts = {};
    this.activeTargetId = "chan_general";
    this.onlineUserEmails = new Set();
    this.lastSeenTimestamps = {};
    this.listeners = [];
    this.realtimeChannel = null;
    this.presenceChannel = null;
    this.heartbeatTimer = null;
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

    const savedUnread = localStorage.getItem('thuduc_water_unread_counts');
    if (savedUnread) {
      try {
        this.unreadCounts = JSON.parse(savedUnread);
      } catch (e) {}
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

    // 2. Connect Supabase Realtime Chat Broadcast & Quad-Presence Tracking
    this.setupSupabaseRealtime();

    // 3. Periodic Presence Heartbeat Ping (every 8s) for 100% bulletproof glowing online LEDs
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.updateUserPresence();
    }, 8000);
  }

  // Check if incoming room targetId is targeted for the current logged-in user
  isMessageForCurrentUser(targetId, currentUser) {
    if (!currentUser || !currentUser.email) return false;
    const cleanEmail = currentUser.email.toLowerCase().trim();
    const cleanEmailSlug = cleanEmail.replace(/[@.]/g, '_');

    // 1. For 1:1 Direct Messages (dm_email1__email2): Target room ID MUST contain current user's email slug!
    if (targetId.startsWith('dm_')) {
      return targetId.includes(cleanEmailSlug);
    }

    // 2. For Group Channels (chan_...): Check if user is a member of the channel
    if (targetId.startsWith('chan_')) {
      const chan = this.channels.find(c => c.id === targetId);
      if (!chan) return true;
      if (chan.members && chan.members.includes('all')) return true;
      if (chan.members && Array.isArray(chan.members)) {
        return chan.members.some(m => m.toLowerCase().trim() === cleanEmail || m.toLowerCase().trim().replace(/[@.]/g, '_') === cleanEmailSlug);
      }
      return true;
    }

    return true;
  }

  // Bulletproof Hybrid Online Status Check (Socket Presence + Realtime Ping + Message Activity)
  isUserOnline(email) {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    
    // Current user is always online
    if (currentUser && currentUser.email && currentUser.email.toLowerCase().trim() === clean) {
      return true;
    }

    if (this.onlineUserEmails.has(clean)) return true;

    const lastSeen = this.lastSeenTimestamps[clean] || 0;
    // Considered online if active within last 2.5 minutes (150,000 ms)
    if (Date.now() - lastSeen < 150000) {
      return true;
    }

    return false;
  }

  setupSupabaseRealtime() {
    if (!window.supabaseClient) return;

    try {
      const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
      const cleanEmail = currentUser && currentUser.email ? currentUser.email.toLowerCase().trim() : 'guest_user';

      // Broadcast Channel for Instant Message Syncing & Realtime Presence Pings
      this.realtimeChannel = window.supabaseClient.channel('thuduc_realtime_chat_v7', {
        config: { broadcast: { self: true } }
      });

      this.realtimeChannel
        .on('broadcast', { event: 'new_message' }, (payload) => {
          if (payload && payload.payload) {
            const { targetId, message } = payload.payload;
            if (targetId && message) {
              if (message.senderEmail) {
                const senderClean = message.senderEmail.toLowerCase().trim();
                this.onlineUserEmails.add(senderClean);
                this.lastSeenTimestamps[senderClean] = Date.now();
              }

              if (!this.messages[targetId]) this.messages[targetId] = [];
              
              // Prevent duplicate messages
              if (!this.messages[targetId].some(m => m.id === message.id)) {
                this.messages[targetId].push(message);

                const cUser = window.authManager ? window.authManager.getCurrentUser() : null;
                const cEmail = cUser ? (cUser.email || '').toLowerCase().trim() : '';

                const isForMe = this.isMessageForCurrentUser(targetId, cUser);
                const isFromOther = message.senderEmail !== cEmail && message.senderUid !== (cUser ? cUser.uid : '');

                // Strictly ONLY increment unread count & trigger toast notification if the message is FOR ME and FROM ANOTHER USER
                if (isForMe && isFromOther) {
                  const isChatViewActive = window.appController && window.appController.currentView === 'team-chat';
                  const isRoomActive = targetId === this.activeTargetId;

                  if (!isChatViewActive || !isRoomActive) {
                    this.unreadCounts[targetId] = (this.unreadCounts[targetId] || 0) + 1;
                    this.notifyNotification(message, targetId);
                  }
                }

                this.saveLocal();
                this.notify();
              }
            }
          }
        })
        .on('broadcast', { event: 'user_presence_ping' }, (payload) => {
          if (payload && payload.payload && payload.payload.email) {
            const pingEmail = payload.payload.email.toLowerCase().trim();
            this.onlineUserEmails.add(pingEmail);
            this.lastSeenTimestamps[pingEmail] = Date.now();
            this.notify();
          }
        })
        .subscribe();

      // Presence Channel for Tracking Real Online Accounts
      this.presenceChannel = window.supabaseClient.channel('thuduc_presence_v7', {
        config: { presence: { key: cleanEmail } }
      });

      this.presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = this.presenceChannel.presenceState();
          const activeEmails = new Set();
          
          Object.keys(state).forEach(key => {
            const presences = state[key];
            presences.forEach(p => {
              if (p && p.email) {
                const em = p.email.toLowerCase().trim();
                activeEmails.add(em);
                this.lastSeenTimestamps[em] = Date.now();
              }
            });
          });

          // Always add current logged-in user to online list
          if (currentUser && currentUser.email) {
            activeEmails.add(currentUser.email.toLowerCase().trim());
          }

          this.onlineUserEmails = activeEmails;
          this.notify();
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            this.updateUserPresence();
          }
        });

    } catch (err) {
      console.warn("Supabase Realtime chat setup notice:", err);
    }
  }

  updateUserPresence() {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    if (currentUser && currentUser.email) {
      const cleanEmail = currentUser.email.toLowerCase().trim();
      this.onlineUserEmails.add(cleanEmail);
      this.lastSeenTimestamps[cleanEmail] = Date.now();

      if (this.realtimeChannel) {
        try {
          this.realtimeChannel.send({
            type: 'broadcast',
            event: 'user_presence_ping',
            payload: {
              email: cleanEmail,
              name: currentUser.name || cleanEmail,
              timestamp: Date.now()
            }
          });
        } catch (e) {}
      }

      if (this.presenceChannel) {
        try {
          this.presenceChannel.track({
            uid: currentUser.uid,
            email: cleanEmail,
            name: currentUser.name || cleanEmail,
            online_at: new Date().toISOString()
          });
        } catch (e) {}
      }
    }
  }

  saveLocal() {
    localStorage.setItem('thuduc_water_team_chats', JSON.stringify(this.messages));
    localStorage.setItem('thuduc_water_unread_counts', JSON.stringify(this.unreadCounts));
    const customChans = this.channels.filter(c => c.id.startsWith('chan_custom_'));
    localStorage.setItem('thuduc_water_custom_channels', JSON.stringify(customChans));
  }

  getCanonicalDmId(email1, email2) {
    const sorted = [email1.toLowerCase().trim(), email2.toLowerCase().trim()].sort();
    return `dm_${sorted[0].replace(/[@.]/g, '_')}__${sorted[1].replace(/[@.]/g, '_')}`;
  }

  getUnreadCount(targetId) {
    return this.unreadCounts[targetId] || 0;
  }

  getTotalUnreadCount() {
    let total = 0;
    Object.keys(this.unreadCounts).forEach(k => {
      total += (this.unreadCounts[k] || 0);
    });
    return total;
  }

  clearUnreadCount(targetId) {
    if (this.unreadCounts[targetId]) {
      this.unreadCounts[targetId] = 0;
      this.saveLocal();
      this.notify();
    }
  }

  getRealDirectUsers() {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    const currentEmail = currentUser ? (currentUser.email || '').toLowerCase().trim() : '';

    // Standard known accounts
    const knownAccounts = [
      { name: "Lê Tuấn Anh", email: "letuananh18@gmail.com", role: "Admin / Quản trị hệ thống" },
      { name: "Tuấn Anh (Water Admin)", email: "waterain8n@gmail.com", role: "Admin Ban Quản Trị" },
      { name: "Vy Phan", email: "vy.pnt1612@gmail.com", role: "Cán bộ P.KDDVKH" }
    ];

    // Merge with registered accounts from authManager
    const registeredUsers = window.authManager ? window.authManager.getUsersList() : [];
    registeredUsers.forEach(u => {
      if (u && u.email && !knownAccounts.some(k => k.email.toLowerCase() === u.email.toLowerCase())) {
        knownAccounts.push({
          name: u.name || u.email.split('@')[0],
          email: u.email.toLowerCase().trim(),
          role: u.role || "Cán bộ P.KDDVKH"
        });
      }
    });

    // Filter out current user's own email from 1:1 DM list
    const otherUsers = knownAccounts.filter(acc => acc.email.toLowerCase() !== currentEmail);

    return otherUsers.map(u => {
      const emailClean = u.email.toLowerCase().trim();
      const isOnline = this.isUserOnline(emailClean);
      const dmRoomId = currentEmail ? this.getCanonicalDmId(currentEmail, emailClean) : `dm_guest_${emailClean.replace(/[@.]/g, '_')}`;

      return {
        id: dmRoomId,
        targetEmail: emailClean,
        name: u.name,
        email: emailClean,
        role: u.role,
        status: isOnline ? "🟢 Trực tuyến" : "⚪ Ngoại tuyến",
        isOnline: isOnline,
        desc: `Trò chuyện riêng 1:1 với ${u.name} (${emailClean})`
      };
    });
  }

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
    this.clearUnreadCount(targetId);
    this.notify();
  }

  sendMessage(text, attachment = null) {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    const senderName = currentUser ? (currentUser.name || currentUser.email.split('@')[0]) : "Cán bộ P.KDDVKH";
    const senderRole = currentUser ? (currentUser.role || "Cán bộ") : "Nhân viên";
    const senderEmail = currentUser ? currentUser.email.toLowerCase().trim() : "guest@capnuocthuduc.vn";
    const senderUid = currentUser ? currentUser.uid : "user_guest";

    if (!text.trim() && !attachment) return;

    const newMsg = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      senderName: senderName,
      senderRole: senderRole,
      senderEmail: senderEmail,
      senderUid: senderUid,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      attachment: attachment
    };

    if (!this.messages[this.activeTargetId]) {
      this.messages[this.activeTargetId] = [];
    }

    if (!this.messages[this.activeTargetId].some(m => m.id === newMsg.id)) {
      this.messages[this.activeTargetId].push(newMsg);
      this.saveLocal();
    }

    // Refresh sender presence timestamp
    this.lastSeenTimestamps[senderEmail] = Date.now();
    this.onlineUserEmails.add(senderEmail);

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
    this.unreadCounts[this.activeTargetId] = 0;
    this.saveLocal();
    this.notify();
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.getActiveMessages()));
  }

  notifyNotification(message, targetId) {
    if (window.appController && typeof window.appController.handleIncomingMessageNotif === 'function') {
      window.appController.handleIncomingMessageNotif(message, targetId);
    }
  }
}

window.chatService = new ChatService();
