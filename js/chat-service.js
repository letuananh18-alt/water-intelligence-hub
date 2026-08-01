// ==========================================================================
// UNSTOPPABLE HYBRID REALTIME PRESENCE & CHAT NOTIFICATION ENGINE
// Real-time Chat Sync, 8s Quad-Channel Presence Heartbeat & User Data Purge
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
    // 1. Load Local Storage Cache & Purge Accidental Test Messages from chan_general
    const savedMsg = localStorage.getItem('thuduc_water_team_chats');
    if (savedMsg) {
      try {
        this.messages = JSON.parse(savedMsg);
      } catch (e) {
        this.messages = INITIAL_MESSAGES;
      }
    }

    // Always keep chan_general clean of accidental test messages
    if (this.messages['chan_general'] && Array.isArray(this.messages['chan_general'])) {
      this.messages['chan_general'] = this.messages['chan_general'].filter(m => m.senderUid === 'system' || m.id === 'msg_init_1');
      if (this.messages['chan_general'].length === 0) {
        this.messages['chan_general'] = INITIAL_MESSAGES.chan_general;
      }
      this.saveLocal();
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

    // 3. Sync Cloud Custom Channels
    this.syncCustomChannelsWithCloud();

    // 4. Periodic Presence Heartbeat Ping (every 5s) for 100% bulletproof glowing online LEDs
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.updateUserPresence();
    this.heartbeatTimer = setInterval(() => {
      this.updateUserPresence();
    }, 5000);
  }

  async syncCustomChannelsWithCloud() {
    if (!window.supabaseClient) return;

    // Layer 1: Query custom_channels table
    try {
      const { data, error } = await window.supabaseClient.from('custom_channels').select('*');
      if (!error && data && data.length > 0) {
        let added = false;
        data.forEach(cData => {
          if (cData && cData.id && !this.channels.some(x => x.id === cData.id)) {
            this.channels.push({
              id: cData.id,
              name: cData.name,
              type: cData.type || 'custom_channel',
              desc: cData.desc,
              members: cData.members || ['all'],
              creatorEmail: cData.creator_email || cData.creatorEmail
            });
            added = true;
          }
        });
        if (added) {
          this.saveLocal();
          this.notify();
          if (window.appController) window.appController.renderTeamChatSidebar();
        }
      }
    } catch (e) {}

    // Layer 2: Query users table custom_channels payload
    try {
      const { data: userData, error: userErr } = await window.supabaseClient.from('users').select('custom_channels').not('custom_channels', 'is', null);
      if (!userErr && userData && userData.length > 0) {
        let added = false;
        userData.forEach(row => {
          if (row.custom_channels) {
            try {
              const parsed = typeof row.custom_channels === 'string' ? JSON.parse(row.custom_channels) : row.custom_channels;
              if (Array.isArray(parsed)) {
                parsed.forEach(c => {
                  if (c && c.id && !this.channels.some(x => x.id === c.id)) {
                    this.channels.push(c);
                    added = true;
                  }
                });
              }
            } catch (err) {}
          }
        });
        if (added) {
          this.saveLocal();
          this.notify();
          if (window.appController) window.appController.renderTeamChatSidebar();
        }
      }
    } catch (e) {}

    // Layer 3: Send Realtime Broadcast Channel Discovery Ping
    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'request_channel_sync',
          payload: { timestamp: Date.now() }
        });
      } catch (e) {}
    }
  }

  async persistChannelsToCloud() {
    if (!window.supabaseClient) return;

    const customChans = this.channels.filter(c => c.type === 'custom_channel' || c.id.startsWith('chan_custom_'));
    const customJson = JSON.stringify(customChans);

    // Persist to custom_channels table
    try {
      await window.supabaseClient.from('custom_channels').upsert(customChans);
    } catch (e) {}

    // Persist to users table custom_channels metadata column
    try {
      const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
      if (currentUser && currentUser.email) {
        await window.supabaseClient.from('users').update({
          custom_channels: customJson
        }).eq('email', currentUser.email);
      }
    } catch (e) {}
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
      if (!chan.members || chan.members.includes('all')) return true;
      if (Array.isArray(chan.members)) {
        return chan.members.some(m => (m || '').toLowerCase().trim() === cleanEmail || (m || '').toLowerCase().trim().replace(/[@.]/g, '_') === cleanEmailSlug);
      }
      return true;
    }

    return true;
  }

  // Bulletproof Hybrid Online Status Check (Socket Presence + Realtime Ping + Active Last Seen + Cloud DB Login)
  isUserOnline(email) {
    if (!email) return false;
    const clean = email.toLowerCase().trim();

    // Check if user is in deleted list
    const deletedEmails = window.authManager ? window.authManager.deletedEmails : new Set();
    if (deletedEmails.has(clean)) return false;

    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    
    // Current user is always online
    if (currentUser && currentUser.email && currentUser.email.toLowerCase().trim() === clean) {
      return true;
    }

    if (this.onlineUserEmails.has(clean)) return true;

    const lastSeen = this.lastSeenTimestamps[clean] || 0;
    // Considered online if ping received within last 5 minutes (300,000 ms)
    if (Date.now() - lastSeen < 300000) {
      return true;
    }

    // Check lastLogin from authManager usersList (synced with Supabase Cloud DB)
    if (window.authManager && window.authManager.usersList) {
      const u = window.authManager.usersList.find(x => x && x.email && x.email.toLowerCase().trim() === clean);
      if (u && u.lastLogin) {
        if (u.lastLogin.includes('Vừa xong')) return true;
        try {
          const parts = u.lastLogin.split(' ');
          if (parts.length >= 2) {
            const timeParts = parts[0].split(':');
            const dateParts = parts[1].split('/');
            if (timeParts.length === 2 && dateParts.length === 3) {
              const loginDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1]);
              const diffMs = Date.now() - loginDate.getTime();
              // If logged in within last 20 minutes and date matches today
              if (diffMs >= 0 && diffMs < 1200000) {
                return true;
              }
            }
          }
        } catch (e) {}
      }
    }

    return false;
  }

  setupSupabaseRealtime() {
    if (!window.supabaseClient) return;

    try {
      const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
      const cleanEmail = currentUser && currentUser.email ? currentUser.email.toLowerCase().trim() : 'guest_user';

      // Broadcast Channel for Instant Message Syncing & Realtime Presence Pings & Channel Management
      this.realtimeChannel = window.supabaseClient.channel('thuduc_realtime_chat_v12', {
        config: { broadcast: { self: true } }
      });

      this.realtimeChannel
        .on('broadcast', { event: 'new_message' }, (payload) => {
          if (payload && payload.payload) {
            const { targetId, message } = payload.payload;
            if (targetId && message) {
              if (message.senderEmail) {
                const senderClean = message.senderEmail.toLowerCase().trim();
                const deletedEmails = window.authManager ? window.authManager.deletedEmails : new Set();
                if (!deletedEmails.has(senderClean)) {
                  this.onlineUserEmails.add(senderClean);
                  this.lastSeenTimestamps[senderClean] = Date.now();
                }
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
                if (window.appController && typeof window.appController.renderTeamChatSidebar === 'function') {
                  window.appController.renderTeamChatSidebar();
                }
              }
            }
          }
        })
        .on('broadcast', { event: 'delete_message' }, (payload) => {
          if (payload && payload.payload) {
            const { targetId, messageId } = payload.payload;
            if (targetId && messageId && this.messages[targetId]) {
              this.messages[targetId] = this.messages[targetId].filter(m => m.id !== messageId);
              this.saveLocal();
              this.notify();
            }
          }
        })
        .on('broadcast', { event: 'user_presence_ping' }, (payload) => {
          if (payload && payload.payload && payload.payload.email) {
            const pingEmail = payload.payload.email.toLowerCase().trim();
            const deletedEmails = window.authManager ? window.authManager.deletedEmails : new Set();
            if (!deletedEmails.has(pingEmail)) {
              this.onlineUserEmails.add(pingEmail);
              this.lastSeenTimestamps[pingEmail] = Date.now();
              this.notify();
              if (window.appController && typeof window.appController.renderTeamChatSidebar === 'function') {
                window.appController.renderTeamChatSidebar();
              }
            }
          }
        })
        .on('broadcast', { event: 'new_channel' }, (payload) => {
          if (payload && payload.payload && payload.payload.channel) {
            const newChan = payload.payload.channel;
            const initMsg = payload.payload.initialMessage;

            if (!this.channels.some(c => c.id === newChan.id)) {
              this.channels.push(newChan);
              if (initMsg) {
                this.messages[newChan.id] = [initMsg];
              }
              this.saveLocal();
              this.notify();
              if (window.appController) {
                window.appController.renderTeamChat();
              }
            }
          }
        })
        .on('broadcast', { event: 'update_channel' }, (payload) => {
          if (payload && payload.payload) {
            const { channelId, name, desc } = payload.payload;
            const chan = this.channels.find(c => c.id === channelId);
            if (chan) {
              if (name) chan.name = name;
              if (desc) chan.desc = desc;
              this.saveLocal();
              this.notify();
              if (window.appController) window.appController.renderTeamChat();
            }
          }
        })
        .on('broadcast', { event: 'delete_channel' }, (payload) => {
          if (payload && payload.payload) {
            const { channelId } = payload.payload;
            this.channels = this.channels.filter(c => c.id !== channelId);
            delete this.messages[channelId];
            delete this.unreadCounts[channelId];
            if (this.activeTargetId === channelId) {
              this.activeTargetId = 'chan_general';
            }
            this.saveLocal();
            this.notify();
            if (window.appController) window.appController.renderTeamChat();
          }
        })
        .on('broadcast', { event: 'user_purged' }, (payload) => {
          if (payload && payload.payload && payload.payload.email) {
            this.purgeUserData(payload.payload.email);
          }
        })
        .on('broadcast', { event: 'request_channel_sync' }, () => {
          const isAdmin = window.authManager && window.authManager.isAdmin();
          if (isAdmin && this.realtimeChannel) {
            const customChans = this.channels.filter(c => c.type === 'custom_channel' || c.id.startsWith('chan_custom_'));
            if (customChans.length > 0) {
              this.realtimeChannel.send({
                type: 'broadcast',
                event: 'response_channel_sync',
                payload: { customChannels: customChans }
              });
            }
          }
        })
        .on('broadcast', { event: 'response_channel_sync' }, (payload) => {
          if (payload && payload.payload && Array.isArray(payload.payload.customChannels)) {
            let added = false;
            payload.payload.customChannels.forEach(c => {
              if (c && c.id && !this.channels.some(x => x.id === c.id)) {
                this.channels.push(c);
                added = true;
              }
            });
            if (added) {
              this.saveLocal();
              this.notify();
              if (window.appController) window.appController.renderTeamChatSidebar();
            }
          }
        })
        .subscribe();

      // Presence Channel for Tracking Real Online Accounts
      this.presenceChannel = window.supabaseClient.channel('thuduc_presence_v12', {
        config: { presence: { key: cleanEmail } }
      });

      this.presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = this.presenceChannel.presenceState();
          const activeEmails = new Set();
          const deletedEmails = window.authManager ? window.authManager.deletedEmails : new Set();
          
          Object.keys(state).forEach(key => {
            const presences = state[key];
            presences.forEach(p => {
              if (p && p.email) {
                const em = p.email.toLowerCase().trim();
                if (!deletedEmails.has(em)) {
                  activeEmails.add(em);
                  this.lastSeenTimestamps[em] = Date.now();
                }
              }
            });
          });

          // Always add current logged-in user to online list
          if (currentUser && currentUser.email && !deletedEmails.has(currentUser.email.toLowerCase().trim())) {
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

  purgeUserData(cleanEmail) {
    if (!cleanEmail) return;
    const clean = cleanEmail.toLowerCase().trim();
    const cleanSlug = clean.replace(/[@.]/g, '_');

    // 1. Remove from online presence & timestamps
    this.onlineUserEmails.delete(clean);
    delete this.lastSeenTimestamps[clean];

    // 2. Remove DM rooms involving this email
    Object.keys(this.messages).forEach(roomId => {
      if (roomId.startsWith('dm_') && roomId.includes(cleanSlug)) {
        delete this.messages[roomId];
        delete this.unreadCounts[roomId];
        if (this.activeTargetId === roomId) {
          this.activeTargetId = 'chan_general';
        }
      }
    });

    // 3. Remove user messages from channels
    Object.keys(this.messages).forEach(roomId => {
      if (Array.isArray(this.messages[roomId])) {
        this.messages[roomId] = this.messages[roomId].filter(m => {
          const sender = (m.senderEmail || '').toLowerCase().trim();
          return sender !== clean;
        });
      }
    });

    this.saveLocal();

    // 4. Broadcast purge event to all connected users
    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'user_purged',
          payload: { email: clean }
        });
      } catch (e) {}
    }

    this.notify();
    if (window.appController) {
      window.appController.renderTeamChat();
    }
  }

  updateUserPresence() {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    if (currentUser && currentUser.email) {
      const cleanEmail = currentUser.email.toLowerCase().trim();
      const deletedEmails = window.authManager ? window.authManager.deletedEmails : new Set();
      if (deletedEmails.has(cleanEmail)) return;

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
    const deletedEmails = window.authManager ? window.authManager.deletedEmails : new Set();

    // Standard known accounts (Admins only)
    const knownAccounts = [
      { name: "Lê Tuấn Anh", email: "letuananh18@gmail.com", role: "Admin / Quản trị hệ thống" },
      { name: "Tuấn Anh (Water Admin)", email: "waterain8n@gmail.com", role: "Admin Ban Quản Trị" }
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

    // CRITICAL ENHANCEMENT: Scan all DM rooms & unread counts in this.messages for any active DM senders!
    const allRoomKeys = new Set([...Object.keys(this.messages), ...Object.keys(this.unreadCounts)]);
    allRoomKeys.forEach(roomId => {
      if (roomId.startsWith('dm_')) {
        const msgs = this.messages[roomId] || [];
        msgs.forEach(m => {
          if (m && m.senderEmail) {
            const semail = m.senderEmail.toLowerCase().trim();
            if (semail && semail !== currentEmail && !knownAccounts.some(k => k.email.toLowerCase() === semail)) {
              knownAccounts.push({
                name: m.senderName || semail.split('@')[0],
                email: semail,
                role: m.senderRole || "Cán bộ P.KDDVKH"
              });
            }
          }
        });
      }
    });

    // Filter out current user's own email AND any deleted emails!
    const otherUsers = knownAccounts.filter(acc => {
      const e = acc.email.toLowerCase().trim();
      return e !== currentEmail && !deletedEmails.has(e);
    });

    return otherUsers.map(u => {
      const emailClean = u.email.toLowerCase().trim();
      const isOnline = this.isUserOnline(emailClean);
      const dmRoomId = currentEmail ? this.getCanonicalDmId(currentEmail, emailClean) : `dm_guest_${emailClean.replace(/[@.]/g, '_')}`;
      const displayName = u.name.includes('@') ? u.name : `${u.name} (${emailClean})`;

      return {
        id: dmRoomId,
        targetEmail: emailClean,
        name: displayName,
        email: emailClean,
        role: u.role,
        status: isOnline ? "🟢 Trực tuyến" : "⚪ Ngoại tuyến",
        isOnline: isOnline,
        desc: `Trò chuyện trực tiếp với ${displayName}`
      };
    });
  }

  async createCustomChannel(name, desc, memberEmails = []) {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    const creatorEmail = currentUser ? (currentUser.email || '').toLowerCase().trim() : '';

    // ALWAYS include creator in member list so creator never loses access to their created channel!
    const allMembers = [...memberEmails];
    if (creatorEmail && !allMembers.includes(creatorEmail)) {
      allMembers.push(creatorEmail);
    }

    const channelId = "chan_custom_" + Date.now();
    const newChan = {
      id: channelId,
      name: `👥 # ${name.trim()}`,
      type: "custom_channel",
      desc: desc.trim() || `Kênh nhóm chuyên đề: ${name.trim()}`,
      members: allMembers,
      creatorEmail: creatorEmail
    };

    const initMsg = {
      id: "msg_init_c_" + Date.now(),
      senderName: "Hệ thống Water Hub",
      senderRole: "System",
      senderUid: "system",
      text: `🎉 Kênh nhóm "${name.trim()}" đã được khởi tạo thành công với ${newChan.members.length} thành viên tham gia!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      attachment: null
    };

    this.channels.push(newChan);
    this.messages[channelId] = [initMsg];

    this.saveLocal();
    await this.persistChannelsToCloud();

    // Broadcast new channel to ALL connected users in Realtime
    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'new_channel',
          payload: {
            channel: newChan,
            initialMessage: initMsg
          }
        });
      } catch (e) {}
    }

    this.setActiveTarget(channelId);
    return newChan;
  }

  async renameChannel(channelId, newName, newDesc) {
    const chan = this.channels.find(c => c.id === channelId);
    if (!chan) return;

    let cleanName = newName.trim();
    if (!cleanName.startsWith('👥 # ') && !cleanName.startsWith('💬 # ') && !cleanName.startsWith('📝 # ') && !cleanName.startsWith('⚠️ # ') && !cleanName.startsWith('💰 # ')) {
      cleanName = `👥 # ${cleanName}`;
    }

    chan.name = cleanName;
    chan.desc = newDesc.trim() || chan.desc;

    this.saveLocal();
    await this.persistChannelsToCloud();

    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'update_channel',
          payload: { channelId, name: chan.name, desc: chan.desc }
        });
      } catch (e) {}
    }

    this.notify();
  }

  async deleteChannel(channelId) {
    this.channels = this.channels.filter(c => c.id !== channelId);
    delete this.messages[channelId];
    delete this.unreadCounts[channelId];

    this.saveLocal();
    await this.persistChannelsToCloud();

    if (this.activeTargetId === channelId) {
      this.activeTargetId = 'chan_general';
    }

    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'delete_channel',
          payload: { channelId }
        });
      } catch (e) {}
    }

    this.notify();
  }

  getChannels() {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    const currentEmail = currentUser ? (currentUser.email || '').toLowerCase().trim() : '';
    const isAdmin = window.authManager && window.authManager.isAdmin();

    // Filter channels visible to current user
    return this.channels.filter(c => {
      // 1. Default system channels: Always show
      if (c.id === 'chan_general' || c.id === 'chan_contracts' || c.id === 'chan_complaints' || c.id === 'chan_rates') return true;

      // 2. Admins ALWAYS see all custom channels!
      if (isAdmin) return true;

      // 3. Open channels (members includes 'all' or empty): Show
      if (!c.members || c.members.length === 0 || c.members.includes('all')) return true;

      // 4. Creator of channel or included member: Show
      if (c.creatorEmail && c.creatorEmail.toLowerCase().trim() === currentEmail) return true;
      return c.members.some(m => (m || '').toLowerCase().trim() === currentEmail || (m || '').toLowerCase().trim().replace(/[@.]/g, '_') === currentEmail.replace(/[@.]/g, '_'));
    });
  }

  getActiveMessages() {
    return this.messages[this.activeTargetId] || [];
  }

  getActiveTargetInfo() {
    const chan = this.channels.find(c => c.id === this.activeTargetId);
    if (chan) return chan;

    const realUsers = this.getRealDirectUsers();
    const dm = realUsers.find(u => u.id === this.activeTargetId);
    if (dm) return { id: dm.id, name: `👤 ${dm.name}`, desc: dm.desc };

    // Dynamic DM room info generator if activeTargetId is a DM room
    if (this.activeTargetId && this.activeTargetId.startsWith('dm_')) {
      const parts = this.activeTargetId.replace(/^dm_/, '').split('__');
      const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
      const currentEmailSlug = currentUser && currentUser.email ? currentUser.email.toLowerCase().trim().replace(/[@.]/g, '_') : '';
      
      const otherSlug = parts.find(p => p !== currentEmailSlug) || parts[0] || 'user';
      const prettyEmail = otherSlug.replace(/_gmail_com$/, '@gmail.com').replace(/_/g, '.');

      let userName = prettyEmail;
      if (window.authManager && window.authManager.usersList) {
        const u = window.authManager.usersList.find(x => x && x.email && x.email.toLowerCase().trim() === prettyEmail.toLowerCase());
        if (u && u.name) userName = u.name;
      }

      return {
        id: this.activeTargetId,
        name: `👤 ${userName}`,
        desc: `Trò chuyện trực tiếp với ${userName} (${prettyEmail})`
      };
    }

    return this.channels[0];
  }

  setActiveTarget(targetId) {
    this.activeTargetId = targetId;
    this.clearUnreadCount(targetId);
    this.notify();
    if (window.appController && typeof window.appController.renderTeamChat === 'function') {
      window.appController.renderTeamChat();
    }
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

  deleteSingleMessage(targetId, messageId) {
    if (this.messages[targetId]) {
      this.messages[targetId] = this.messages[targetId].filter(m => m.id !== messageId);
      this.saveLocal();
      if (this.realtimeChannel) {
        try {
          this.realtimeChannel.send({
            type: 'broadcast',
            event: 'delete_message',
            payload: { targetId, messageId }
          });
        } catch (e) {}
      }
      this.notify();
    }
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
