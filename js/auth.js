// ==========================================================================
// USER AUTHENTICATION & ROLE MANAGEMENT MODULE
// Real Admin: letuananh18@gmail.com
// ==========================================================================

const DEMO_USERS = {
  ADMIN: {
    uid: "admin_letuananh18",
    name: "Lê Tuấn Anh",
    email: "letuananh18@gmail.com",
    role: "Admin / Quản trị hệ thống",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    department: "Ban Quản Trị Hệ Thống"
  }
};

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.usersList = [DEMO_USERS.ADMIN];
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

    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        firebase.auth().onAuthStateChanged(user => {
          if (user) {
            this.currentUser = {
              uid: user.uid,
              name: user.displayName || user.email.split('@')[0],
              email: user.email,
              role: user.email === 'letuananh18@gmail.com' ? "Admin / Quản trị hệ thống" : "Nhân viên / Client",
              avatar: user.photoURL || DEMO_USERS.ADMIN.avatar,
              department: "Phòng Kỹ thuật & Cấp nước"
            };
            
            // Add user to users list if not present
            if (!this.usersList.some(u => u.email === user.email)) {
              this.usersList.push(this.currentUser);
            }

            localStorage.setItem('thuduc_water_user', JSON.stringify(this.currentUser));
            this.notify();
          }
        });
      } catch (e) {}
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUsersList() {
    return this.usersList;
  }

  isAdmin() {
    return this.currentUser && (this.currentUser.email === 'letuananh18@gmail.com' || this.currentUser.role.includes("Admin"));
  }

  async login(email, password) {
    if (window.location.protocol !== 'file:' && typeof firebase !== 'undefined' && firebase.auth) {
      try {
        const res = await firebase.auth().signInWithEmailAndPassword(email, password);
        return res.user;
      } catch (err) {
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

    if (email === DEMO_USERS.ADMIN.email || email.includes('admin')) {
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
      if (!this.usersList.some(u => u.email === email)) {
        this.usersList.push(this.currentUser);
      }
    }
    localStorage.setItem('thuduc_water_user', JSON.stringify(this.currentUser));
    this.notify();
    return this.currentUser;
  }

  async signInWithGoogle() {
    if (window.location.protocol === 'file:') {
      this.switchPersona('ADMIN');
      return;
    }

    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        return result.user;
      } catch (err) {
        if (err.code === 'auth/operation-not-supported-in-this-environment') {
          this.switchPersona('ADMIN');
        } else {
          alert("⚠️ Google Sign-in Notice: " + err.message);
        }
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
