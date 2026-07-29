// ==========================================================================
// REAL-TIME TEAM CHAT SERVICE (1-ON-1 & GROUP CHANNELS)
// ==========================================================================

import { authManager, DEMO_USERS } from './auth.js';

const INITIAL_CHANNELS = [
  { id: "chan_general", name: "# Phòng Kỹ Thuật & Vận Hành", type: "channel", unread: 2 },
  { id: "chan_project_q2", name: "# Dự Án Cấp Nước Q2", type: "channel", unread: 0 },
  { id: "chan_safety", name: "# Quy Chuẩn An Toàn", type: "channel", unread: 0 }
];

const INITIAL_MESSAGES = {
  chan_general: [
    {
      id: "m1",
      senderName: "Trần Minh Anh",
      senderAvatar: DEMO_USERS.MEMBER.avatar,
      senderUid: "member_anh_002",
      text: "Chào mọi người, bản vẽ sơ đồ cấp nước tuyến đường Lê Văn Việt đã hoàn thành rà soát.",
      timestamp: "10:15 AM",
      attachment: null
    },
    {
      id: "m2",
      senderName: "Nguyễn Văn Tuấn",
      senderAvatar: DEMO_USERS.ADMIN.avatar,
      senderUid: "admin_tuan_001",
      text: "Cảm ơn Minh Anh. Mình vừa cập nhật Quy trình thiết kế hệ thống mới lên Kho nội bộ phòng ban.",
      timestamp: "10:20 AM",
      attachment: { name: "Quy trình thiết kế hệ thống.pdf", size: "4.2 MB", type: "PDF" }
    },
    {
      id: "m3",
      senderName: "Trần Minh Anh",
      senderAvatar: DEMO_USERS.MEMBER.avatar,
      senderUid: "member_anh_002",
      text: "Vâng anh Tuấn, để em tải về xem xét ngay!",
      timestamp: "10:22 AM",
      attachment: null
    }
  ],
  dm_admin_tuan_001: [
    {
      id: "dm1",
      senderName: "Nguyễn Văn Tuấn",
      senderAvatar: DEMO_USERS.ADMIN.avatar,
      senderUid: "admin_tuan_001",
      text: "Chào bạn, hãy cho tôi biết nếu bạn cần cấp thêm quyền duyệt tài liệu dự án nhé.",
      timestamp: "Yesterday",
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
    const currentUser = authManager.getCurrentUser();
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

    // Trigger simulated automated response from peer if testing
    if (this.activeTargetId === 'chan_general') {
      setTimeout(() => {
        this.receiveAutomatedReply();
      }, 1500);
    }
  }

  receiveAutomatedReply() {
    const replies = [
      "Đã nhận được thông tin, phòng Kỹ thuật đang tiến hành xử lý.",
      "Tài liệu đã được ghi nhận vào kho hệ thống chung.",
      "Tuyệt vời! Hãy thông báo nếu có biến động về chỉ số lưu lượng nước nhé."
    ];
    const randomReply = replies[Math.floor(Math.random() * replies.length)];

    const botMsg = {
      id: "msg_reply_" + Date.now(),
      senderName: "Lê Hoàng Nam",
      senderAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      senderUid: "member_nam_003",
      text: randomReply,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      attachment: null
    };

    this.messages['chan_general'].push(botMsg);
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

export const chatService = new ChatService();
