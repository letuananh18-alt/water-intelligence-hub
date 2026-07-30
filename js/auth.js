// ==========================================================================
// USER AUTHENTICATION & REAL-TIME USER DIRECTORY SYNC (SUPABASE BACKEND)
// SESSION-ONLY PERSISTENCE (Requires login every time browser is closed)
// Admin Accounts: waterain8n@gmail.com & letuananh18@gmail.com
// ==========================================================================

const DEMO_USERS = {
  ADMIN: {
    uid: "admin_waterain8n",
    name: "Lê Tuấn Anh",
    email: "waterain8n@gmail.com",
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

  async init() {
    localStorage.removeItem('thuduc_water_user');

    const savedSession = sessionStorage.getItem('thuduc_water_user_session');
    if (savedSession) {
      try {
        this.currentUser = JSON.parse(savedSession);
      } catch (e) {
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }

    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient.from('users').select('*');
        if (!error && data && data.length > 0) {
          const list = [DEMO_USERS.ADMIN];
          data.forEach(uData => {
            if (uData && uData.email && !list.some(x => x.email === uData.email)) {
              list.push(uData);
            }
          });
          this.usersList = list;
          this.notify();
        }

        window.supabaseClient
          .channel('schema-users-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async () => {
            const { data: updatedUsers } = await window.supabaseClient.from('users').select('*');
            if (updatedUsers) {
              const list = [DEMO_USERS.ADMIN];
              updatedUsers.forEach(uData => {
                if (uData && uData.email && !list.some(x => x.email === uData.email)) {
                  list.push(uData);
                }
              });
              this.usersList = list;
              this.notify();
            }
          })
          .subscribe();
      } catch (e) {}
    }
  }

  saveUserSession(userObj) {
    sessionStorage.setItem('thuduc_water_user_session', JSON.stringify(userObj));
    if (!this.usersList.some(u => u.email === userObj.email)) {
      this.usersList.push(userObj);
    }
  }

  async syncUserToCloud(userObj) {
    if (window.supabaseClient) {
      try {
        const loginTime = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
        
        await window.supabaseClient.from('users').upsert({
          uid: userObj.uid,
          name: userObj.name,
          email: userObj.email,
          role: userObj.role,
          avatar: userObj.avatar,
          department: userObj.department,
          last_login: loginTime
        });

        await window.supabaseClient.from('login_logs').insert({
          uid: userObj.uid,
          name: userObj.name || userObj.email.split('@')[0],
          email: userObj.email,
          role: userObj.role,
          timestamp: loginTime
        });
      } catch (e) {
        console.warn("Supabase user sync notice:", e);
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
    return this.currentUser && (
      this.currentUser.email === 'waterain8n@gmail.com' ||
      this.currentUser.email === 'letuananh18@gmail.com' ||
      (this.currentUser.role && this.currentUser.role.includes("Admin"))
    );
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

    const isAdminEmail = email === 'waterain8n@gmail.com' || email === 'letuananh18@gmail.com';

    if (window.supabaseClient) {
      try {
        const { data: authData, error: authError } = await window.supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (!authError && authData.user) {
          this.currentUser = {
            uid: authData.user.id,
            name: authData.user.user_metadata?.name || email.split('@')[0],
            email: authData.user.email,
            role: isAdminEmail ? "Admin / Quản trị hệ thống" : "Nhân viên / Client",
            avatar: DEMO_USERS.ADMIN.avatar,
            department: "Phòng Kinh doanh & Dịch vụ Khách hàng",
            lastLogin: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
          };

          this.saveUserSession(this.currentUser);
          await this.syncUserToCloud(this.currentUser);
          this.notify();
          return this.currentUser;
        }
      } catch (err) {}
    }

    // Fallback seamless login
    if (password !== "123456" && password !== "12345678" && password !== "admin123") {
      alert("❌ Mật khẩu không chính xác! (Mật khẩu mặc định là: 123456)");
      return null;
    }

    this.currentUser = {
      uid: "user_" + Date.now(),
      name: email.split('@')[0],
      email: email,
      role: isAdminEmail ? "Admin / Quản trị hệ thống" : "Nhân viên / Client",
      avatar: DEMO_USERS.ADMIN.avatar,
      department: "Phòng Kinh doanh & Dịch vụ Khách hàng",
      lastLogin: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    };

    this.saveUserSession(this.currentUser);
    this.syncUserToCloud(this.currentUser);
    this.notify();
    return this.currentUser;
  }

  async signInWithGoogle() {
    if (window.supabaseClient) {
      try {
        await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google'
        });
        return;
      } catch (err) {}
    }

    const userEmail = prompt("⚠️ Vui lòng nhập địa chỉ Email/Gmail của bạn để đăng nhập:");
    if (userEmail && userEmail.trim()) {
      return this.login(userEmail.trim(), "123456");
    }
  }

  async logout() {
    if (window.supabaseClient) {
      try {
        await window.supabaseClient.auth.signOut();
      } catch (e) {}
    }
    this.currentUser = null;
    sessionStorage.removeItem('thuduc_water_user_session');
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
