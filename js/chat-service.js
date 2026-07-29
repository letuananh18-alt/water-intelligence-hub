// ==========================================================================
// REAL-TIME TEAM CHAT SERVICE (CLEAN RESETTABLE CHAT HISTORY)
// ==========================================================================

const INITIAL_CHANNELS = [
  { id: "chan_general", name: "# Phòng Kỹ Thuật & Vận Hành", type: "channel", unread: 0 },
  { id: "chan_project_q2", name: "# Dự Án Cấp Nước Q2", type: "channel", unread: 0 },
  { id: "chan_safety", name: "# Quy Chuẩn An Toàn", type: "channel", unread: 0 }
];

const INITIAL_MESSAGES = {
  chan_general: []
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
    const savedMsg = localStorage.getItem('thuduc_water_chats');
    if (savedMsg) {
      try {
        this.messages = JSON.parse(savedMsg);
      } catch (e) {
        this.messages = INITIAL_MESSAGES;
      }
    }
  }

  saveLocal() {
    localStorage.setItem('thuduc_water_chats', JSON.stringify(this.messages));
  }

  getActiveMessages() {
    return this.messages[this.activeTargetId] || [];
  }

  setActiveTarget(targetId) {
    this.activeTargetId = targetId;
    const chan = this.channels.find(c => c.id === targetId);
    if (chan) chan.unread = 0;
    this.notify();
  }

  sendMessage(text, attachment = null) {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    if (!currentUser || (!text.trim() && !attachment)) return;

    const newMsg = {
      id: "msg_" + Date.now(),
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderUid: currentUser.uid,
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

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.getActiveMessages()));
  }
}

window.chatService = new ChatService();
