// ==========================================================================
// USER AUTHENTICATION & REAL-TIME USER DIRECTORY SYNC
// Real Admin: letuananh18@gmail.com
// ==========================================================================

const DEMO_USERS = {
  ADMIN: {
    uid: "admin_letuananh18",
    name: "Lê Tuấn Anh",
    email: "letuananh18@gmail.com",
    role: "Admin / Quản trị hệ thống",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    department: "Phòng Kinh doanh & Dịch vụ Khách hàng"
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
        this.currentUser = null;
      }
    }

    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {});

        firebase.auth().onAuthStateChanged(user => {
          if (user) {
            this.currentUser = {
              uid: user.uid,
              name: user.displayName || user.email.split('@')[0],
              email: user.email,
              role: user.email === 'letuananh18@gmail.com' ? "Admin / Quản trị hệ thống" : "Nhân viên / Client",
              avatar: user.photoURL || DEMO_USERS.ADMIN.avatar,
              department: "Phòng Kinh doanh & Dịch vụ Khách hàng"
            };
            
            this.saveUserLocal(this.currentUser);
            this.syncUserToCloud(this.currentUser);
            this.notify();
          }
        });
      } catch (e) {}
    }

    // Sync cloud users collection to usersList in real-time
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        firebase.firestore().collection("users").onSnapshot(snapshot => {
          const list = [DEMO_USERS.ADMIN];
          snapshot.forEach(doc => {
            const uData = doc.data();
            if (uData && uData.email && !list.some(x => x.email === uData.email)) {
              list.push(uData);
            }
          });
          this.usersList = list;
          this.notify();
        }, err => console.warn("Firestore users notice:", err));
      } catch (e) {}
    }
  }

  saveUserLocal(userObj) {
    localStorage.setItem('thuduc_water_user', JSON.stringify(userObj));
    if (!this.usersList.some(u => u.email === userObj.email)) {
      this.usersList.push(userObj);
    }
  }

  async syncUserToCloud(userObj) {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const docId = userObj.uid || userObj.email.replace(/[^a-zA-Z0-9]/g, '_');
        await firebase.firestore().collection("users").doc(docId).set(userObj, { merge: true });
      } catch (e) {
        console.warn("User cloud sync notice:", e);
      }
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUsersList() {
    return this.usersList;
  }

  isAdmin() {
    return this.currentUser && (this.currentUser.email === 'letuananh18@gmail.com' || (this.currentUser.role && this.currentUser.role.includes("Admin")));
  }

  async login(email, password) {
    if (!email || !email.trim()) {
      alert("⚠️ Vui lòng nhập địa chỉ Email!");
      return null;
    }
    if (!password || password.length < 6) {
      alert("⚠️ Mật khẩu phải có ít nhất 6 ký tự!");
      return null;
    }

    if (window.location.protocol !== 'file:' && typeof firebase !== 'undefined' && firebase.auth) {
      try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const res = await firebase.auth().signInWithEmailAndPassword(email, password);
        return res.user;
      } catch (err) {
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          alert("❌ Mật khẩu không chính xác! Vui lòng kiểm tra lại.");
          return null;
        } else if (err.code === 'auth/user-not-found') {
          if (confirm(`Email ${email} chưa được đăng ký trên Firebase Cloud. Bạn có muốn tạo tài khoản mới ngay không?`)) {
            try {
              const newUserRes = await firebase.auth().createUserWithEmailAndPassword(email, password);
              const newUserObj = {
                uid: newUserRes.user.uid,
                name: email.split('@')[0],
                email: email,
                role: email === 'letuananh18@gmail.com' ? "Admin / Quản trị hệ thống" : "Nhân viên / Client",
                avatar: DEMO_USERS.ADMIN.avatar,
                department: "Phòng Kinh doanh & Dịch vụ Khách hàng"
              };
              await this.syncUserToCloud(newUserObj);
              alert("✨ Tạo và lưu tài khoản mới thành công vào Danh sách Người dùng!");
              return newUserRes.user;
            } catch (cErr) {
              alert("⚠️ Không thể tạo tài khoản: " + cErr.message);
              return null;
            }
          }
          return null;
        } else {
          alert("⚠️ Lỗi đăng nhập: " + err.message);
          return null;
        }
      }
    } else {
      if (password !== "123456" && password !== "12345678" && password !== "admin123") {
        alert("❌ Mật khẩu không chính xác! (Mật khẩu mặc định là: 123456)");
        return null;
      }

      this.currentUser = {
        uid: "user_" + Date.now(),
        name: email.split('@')[0],
        email: email,
        role: email === 'letuananh18@gmail.com' ? "Admin / Quản trị hệ thống" : "Nhân viên / Client",
        avatar: DEMO_USERS.ADMIN.avatar,
        department: "Phòng Kinh doanh & Dịch vụ Khách hàng"
      };

      this.saveUserLocal(this.currentUser);
      this.syncUserToCloud(this.currentUser);
      this.notify();
      return this.currentUser;
    }
  }

  async signInWithGoogle() {
    if (window.location.protocol === 'file:') {
      alert("ℹ️ Đang xem file cục bộ file://. Hãy sử dụng bản web live trên Vercel để sử dụng Google Sign-in chính thức!");
      return;
    }

    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        const result = await firebase.auth().signInWithPopup(provider);
        if (result.user) {
          const userObj = {
            uid: result.user.uid,
            name: result.user.displayName || result.user.email.split('@')[0],
            email: result.user.email,
            role: result.user.email === 'letuananh18@gmail.com' ? "Admin / Quản trị hệ thống" : "Nhân viên / Client",
            avatar: result.user.photoURL || DEMO_USERS.ADMIN.avatar,
            department: "Phòng Kinh doanh & Dịch vụ Khách hàng"
          };
          await this.syncUserToCloud(userObj);
        }
        return result.user;
      } catch (err) {
        if (err.message.includes('missing initial state') || err.code === 'auth/missing-initial-state' || err.code === 'auth/popup-blocked') {
          const userEmail = prompt("⚠️ Trình duyệt chặn Popup Google. Vui lòng nhập địa chỉ Email/Gmail của bạn để đăng nhập:");
          if (userEmail && userEmail.trim()) {
            return this.login(userEmail.trim(), "123456");
          }
        } else {
          alert("⚠️ Lỗi đăng nhập Google: " + err.message);
        }
      }
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
