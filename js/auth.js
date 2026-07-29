// ==========================================================================
// USER AUTHENTICATION & ROLE MANAGEMENT MODULE
// ==========================================================================

import { auth, isFirebaseLive } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// Pre-defined demo user accounts for immediate evaluation
export const DEMO_USERS = {
  ADMIN: {
    uid: "admin_tuan_001",
    name: "Nguyễn Văn Tuấn",
    email: "tuan.nguyen@thuducwater.vn",
    role: "Admin / Quản lý",
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
    // Check saved session in localStorage
    const saved = localStorage.getItem('thuduc_water_user');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch (e) {
        this.currentUser = DEMO_USERS.ADMIN;
      }
    } else {
      // Default initial logged in user
      this.currentUser = DEMO_USERS.ADMIN;
      localStorage.setItem('thuduc_water_user', JSON.stringify(this.currentUser));
    }

    if (isFirebaseLive && auth) {
      onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          this.currentUser = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            email: firebaseUser.email,
            role: "Nhân viên / Client",
            avatar: firebaseUser.photoURL || DEMO_USERS.ADMIN.avatar,
            department: "Kỹ thuật Cấp nước"
          };
          localStorage.setItem('thuduc_water_user', JSON.stringify(this.currentUser));
          this.notify();
        }
      });
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAdmin() {
    return this.currentUser && (this.currentUser.role.includes("Admin") || this.currentUser.uid === "admin_tuan_001");
  }

  async login(email, password) {
    if (isFirebaseLive && auth) {
      const res = await signInWithEmailAndPassword(auth, email, password);
      return res.user;
    } else {
      // Local login simulation
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
  }

  async switchPersona(personaKey) {
    if (DEMO_USERS[personaKey]) {
      this.currentUser = DEMO_USERS[personaKey];
      localStorage.setItem('thuduc_water_user', JSON.stringify(this.currentUser));
      this.notify();
    }
  }

  async logout() {
    if (isFirebaseLive && auth) {
      await signOut(auth);
    }
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

export const authManager = new AuthManager();
