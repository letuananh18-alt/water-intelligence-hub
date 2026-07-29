// ==========================================================================
// USER AUTHENTICATION & ROLE MANAGEMENT MODULE (LIVE FIREBASE + MOCK)
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
    // Check saved session in localStorage
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

    // Subscribe to Live Firebase Authentication listener if SDK is loaded
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged(user => {
        if (user) {
          this.currentUser = {
            uid: user.uid,
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            role: "Nhân viên / Client (Live Cloud)",
            avatar: user.photoURL || DEMO_USERS.ADMIN.avatar,
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
    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        const res = await firebase.auth().signInWithEmailAndPassword(email, password);
        return res.user;
      } catch (err) {
        // If user not found, auto-create account on Live Firebase
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          try {
            const newUserRes = await firebase.auth().createUserWithEmailAndPassword(email, password);
            alert("✨ Đã tự động khởi tạo tài khoản mới thành công trên Firebase Cloud!");
            return newUserRes.user;
          } catch (createErr) {
            console.warn("Firebase auth create fallback:", createErr);
          }
        }
      }
    }

    // Local fallback login simulation
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

  async signInWithGoogle() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        return result.user;
      } catch (err) {
        alert("⚠️ Google Sign-in Notice: " + err.message);
      }
    } else {
      this.switchPersona('ADMIN');
    }
  }

  switchPersona(personaKey) {
    if (DEMO_USERS[personaKey]) {
      this.currentUser = DEMO_USERS[personaKey];
      localStorage.setItem('thuduc_water_user', JSON.stringify(this.currentUser));
      this.notify();
    }
  }

  async logout() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        await firebase.auth().signOut();
      } catch (e) {}
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

window.DEMO_USERS = DEMO_USERS;
window.authManager = new AuthManager();
