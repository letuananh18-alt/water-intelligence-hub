// ==========================================================================
// USER AUTHENTICATION & ROLE MANAGEMENT MODULE
// Compatible with file:// protocol and http:// servers
// ==========================================================================

const DEMO_USERS = {
  ADMIN: {
    uid: "admin_tuan_001",
    name: "Nguyễn Văn Tuấn",
    email: "tuan.nguyen@thuducwater.vn",
    role: "Designer / Admin",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    department: "Ban Giám Đốc / Thiết Kế"
  },
  MEMBER: {
    uid: "member_anh_002",
    name: "Trần Minh Anh",
    email: "anh.tran@thuducwater.vn",
    role: "Nhân viên Kỹ thuật",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    department: "Phòng Vận Hành & Khảo Sát"
  }
};

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
    this.init();
  }

  init() {
    const saved = localStorage.getItem('thuduc_water_user');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch (e) {
        this.currentUser = DEMO_USERS.ADMIN;
      }
    } else {
      this.currentUser = DEMO_USERS.ADMIN;
      localStorage.setItem('thuduc_water_user', JSON.stringify(this.currentUser));
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAdmin() {
    return this.currentUser && (this.currentUser.role.includes("Admin") || this.currentUser.uid === "admin_tuan_001");
  }

  login(email, password) {
    if (email.includes('admin') || email === DEMO_USERS.ADMIN.email) {
      this.currentUser = DEMO_USERS.ADMIN;
    } else {
      this.currentUser = {
        uid: 'user_' + Date.now(),
        name: email.split('@')[0],
        email: email,
        role: 'Nhân viên / Client',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        department: 'Phòng Kỹ thuật'
      };
    }
    localStorage.setItem('thuduc_water_user', JSON.stringify(this.currentUser));
    this.notify();
    return this.currentUser;
  }

  switchPersona(personaKey) {
    if (DEMO_USERS[personaKey]) {
      this.currentUser = DEMO_USERS[personaKey];
      localStorage.setItem('thuduc_water_user', JSON.stringify(this.currentUser));
      this.notify();
    }
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('thuduc_water_user');
    this.notify();
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }
}

window.DEMO_USERS = DEMO_USERS;
window.authManager = new AuthManager();
