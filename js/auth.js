// ==========================================================================
// UNSTOPPABLE HYBRID AUTHENTICATION & USER APPROVAL MANAGEMENT ENGINE
// Dual OAuth Google & Password Auth with Quad-Tier Realtime User Sync
// ==========================================================================

const DEMO_USERS = {
  ADMIN: {
    uid: "user_admin_001",
    name: "Lê Tuấn Anh",
    email: "waterain8n@gmail.com",
    role: "Admin / Quản trị hệ thống",
    status: "approved",
    avatar: "https://ui-avatars.com/api/?name=Le+Tuan+Anh&background=0284c7&color=fff&bold=true",
    department: "Phòng Kinh doanh & Dịch vụ Khách hàng",
    lastLogin: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
  },
  ADMIN_ALT: {
    uid: "user_admin_002",
    name: "Lê Tuấn Anh (Admin)",
    email: "letuananh18@gmail.com",
    role: "Admin / Quản trị hệ thống",
    status: "approved",
    avatar: "https://ui-avatars.com/api/?name=Tu+Anh&background=0369a1&color=fff&bold=true",
    department: "Phòng Kinh doanh & Dịch vụ Khách hàng",
    lastLogin: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
  }
};

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.usersList = [DEMO_USERS.ADMIN, DEMO_USERS.ADMIN_ALT];
    this.approvedEmails = new Set(["waterain8n@gmail.com", "letuananh18@gmail.com", "mr.saigonchip@gmail.com"]);
    this.blockedEmails = new Set();
    this.deletedEmails = new Set();
    this.listeners = [];
    this.realtimeChannel = null;
    this.init();
  }

  init() {
    // 1. Load session & local caches
    const savedSession = sessionStorage.getItem('thuduc_water_user_session');
    if (savedSession) {
      try {
        this.currentUser = JSON.parse(savedSession);
      } catch (e) {
        this.currentUser = null;
      }
    }

    const savedKnownUsers = localStorage.getItem('thuduc_all_known_users');
    if (savedKnownUsers) {
      try {
        const arr = JSON.parse(savedKnownUsers);
        if (Array.isArray(arr) && arr.length > 0) {
          arr.forEach(u => {
            if (u && u.email && !this.usersList.some(x => x.email.toLowerCase().trim() === u.email.toLowerCase().trim())) {
              this.usersList.push(u);
            }
          });
        }
      } catch (e) {}
    }

    const savedApproved = localStorage.getItem('thuduc_approved_users');
    if (savedApproved) {
      try {
        const arr = JSON.parse(savedApproved);
        if (Array.isArray(arr)) {
          arr.forEach(x => this.approvedEmails.add(x.toLowerCase().trim()));
        }
      } catch (e) {}
    }

    const savedBlocked = localStorage.getItem('thuduc_blocked_users');
    if (savedBlocked) {
      try {
        const arr = JSON.parse(savedBlocked);
        if (Array.isArray(arr)) {
          arr.forEach(x => this.blockedEmails.add(x.toLowerCase().trim()));
        }
      } catch (e) {}
    }

    const savedDeleted = localStorage.getItem('thuduc_deleted_users');
    if (savedDeleted) {
      try {
        const arr = JSON.parse(savedDeleted);
        if (Array.isArray(arr)) {
          this.deletedEmails = new Set(arr.map(x => x.toLowerCase().trim()));
        }
      } catch (e) {}
    }

    if (window.supabaseClient) {
      this.setupSupabaseRealtime();
      this.checkSupabaseAuthSession();
      this.loadUsersFromCloud();
    }
  }

  setupSupabaseRealtime() {
    if (!window.supabaseClient) return;

    try {
      this.realtimeChannel = window.supabaseClient.channel('thuduc_user_approval_v3', {
        config: { broadcast: { self: true } }
      });

      this.realtimeChannel
        .on('broadcast', { event: 'user_logged_in' }, (payload) => {
          if (payload && payload.payload && payload.payload.email) {
            const uData = payload.payload;
            const clean = uData.email.toLowerCase().trim();

            if (this.deletedEmails.has(clean)) return;

            const existingIdx = this.usersList.findIndex(x => x.email.toLowerCase().trim() === clean);
            const isAdmin = clean === 'waterain8n@gmail.com' || clean === 'letuananh18@gmail.com';
            const status = isAdmin ? 'approved' : (this.approvedEmails.has(clean) ? 'approved' : (this.blockedEmails.has(clean) ? 'blocked' : (uData.status || 'pending')));

            const formattedUser = {
              uid: uData.uid || 'user_' + Date.now(),
              name: uData.name || clean.split('@')[0],
              email: clean,
              role: uData.role || (isAdmin ? 'Admin / Quản trị hệ thống' : 'Cán bộ P.KDDVKH'),
              status: status,
              department: uData.department || 'Phòng Kinh doanh & Dịch vụ Khách hàng',
              lastLogin: uData.lastLogin || new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
              avatar: uData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(uData.name || clean.split('@')[0])}&background=0284c7&color=fff&bold=true`
            };

            if (existingIdx >= 0) {
              this.usersList[existingIdx] = { ...this.usersList[existingIdx], ...formattedUser };
            } else {
              this.usersList.push(formattedUser);
            }

            this.saveLocalCaches();
            this.notify();
            if (window.appController) window.appController.renderUsersTable();
          }
        })
        .on('broadcast', { event: 'user_approved' }, (payload) => {
          if (payload && payload.payload && payload.payload.email) {
            const clean = payload.payload.email.toLowerCase().trim();
            this.approvedEmails.add(clean);
            this.blockedEmails.delete(clean);
            this.saveLocalCaches();
            const u = this.usersList.find(x => x.email.toLowerCase().trim() === clean);
            if (u) u.status = 'approved';
            this.notify();
            if (window.appController) window.appController.renderUsersTable();
          }
        })
        .on('broadcast', { event: 'user_blocked' }, (payload) => {
          if (payload && payload.payload && payload.payload.email) {
            const clean = payload.payload.email.toLowerCase().trim();
            this.blockedEmails.add(clean);
            this.approvedEmails.delete(clean);
            this.saveLocalCaches();
            const u = this.usersList.find(x => x.email.toLowerCase().trim() === clean);
            if (u) u.status = 'blocked';
            this.notify();
            if (window.appController) window.appController.renderUsersTable();
          }
        })
        .subscribe();
    } catch (e) {}
  }

  saveLocalCaches() {
    localStorage.setItem('thuduc_approved_users', JSON.stringify(Array.from(this.approvedEmails)));
    localStorage.setItem('thuduc_blocked_users', JSON.stringify(Array.from(this.blockedEmails)));
    localStorage.setItem('thuduc_deleted_users', JSON.stringify(Array.from(this.deletedEmails)));
    const cleanList = this.usersList.filter(u => !this.deletedEmails.has(u.email.toLowerCase().trim()));
    localStorage.setItem('thuduc_all_known_users', JSON.stringify(cleanList));
  }

  async checkSupabaseAuthSession() {
    if (!window.supabaseClient) return;

    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session && session.user) {
        const u = session.user;
        const cleanEmail = u.email ? u.email.toLowerCase().trim() : '';
        const isAdminEmail = cleanEmail === 'waterain8n@gmail.com' || cleanEmail === 'letuananh18@gmail.com';
        const name = u.user_metadata?.full_name || u.user_metadata?.name || cleanEmail.split('@')[0];

        // Determine approval status cleanly
        let userStatus = 'pending';
        if (isAdminEmail || this.approvedEmails.has(cleanEmail)) {
          userStatus = 'approved';
        } else if (this.blockedEmails.has(cleanEmail)) {
          userStatus = 'blocked';
        } else {
          // Query database
          try {
            const { data: dbUser } = await window.supabaseClient.from('users').select('status').eq('email', cleanEmail).maybeSingle();
            if (dbUser && dbUser.status) {
              userStatus = dbUser.status;
              if (userStatus === 'approved') this.approvedEmails.add(cleanEmail);
            }
          } catch (e) {}
        }

        // Admin accounts are ALWAYS approved
        if (isAdminEmail) {
          userStatus = 'approved';
          this.approvedEmails.add(cleanEmail);
        }

        const userObj = {
          uid: u.id,
          name: name,
          email: cleanEmail,
          role: isAdminEmail ? "Admin / Quản trị hệ thống" : "Nhân viên / Client",
          status: userStatus,
          avatar: u.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff&bold=true`,
          department: "Phòng Kinh doanh & Dịch vụ Khách hàng",
          lastLogin: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
        };

        // Broadcast to Realtime Channel so Admin sees new user login instantly
        this.broadcastUserLogin(userObj);

        // Enforce Approval Check for Gmail / Google OAuth
        if (userStatus === 'pending' && !isAdminEmail) {
          await this.syncUserToCloud(userObj);
          alert(`⏳ ĐANG CHỜ PHÊ DUYỆT: Tài khoản Gmail (${cleanEmail}) của bạn đã được ghi nhận vào hệ thống và đang CHỜ BAN QUẢN TRỊ ADMIN PHÊ DUYỆT!\n\nVui lòng báo Admin (waterain8n@gmail.com) bấm [✅ Duyệt] ở mục "Người dùng & Giám sát".`);
          await this.logout();
          return;
        }

        if (userStatus === 'blocked' && !isAdminEmail) {
          alert(`⛔ TỪ CHỐI TRUY CẬP: Tài khoản Gmail (${cleanEmail}) của bạn đã bị Ban Quản trị Admin KHÓA QUYỀN TRUY CẬP vào hệ thống!`);
          await this.logout();
          return;
        }

        // User is approved: Proceed with login
        this.currentUser = userObj;
        this.saveUserSession(this.currentUser);
        await this.syncUserToCloud(this.currentUser);
        this.notify();
      }
    } catch (err) {
      console.warn("Supabase auth session notice:", err);
    }
  }

  broadcastUserLogin(userObj) {
    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'user_logged_in',
          payload: userObj
        });
      } catch (e) {}
    }
  }

  async loadUsersFromCloud() {
    if (!window.supabaseClient) return;

    try {
      const list = [...this.usersList];

      // 1. Fetch users from users table
      const { data: usersData, error: userErr } = await window.supabaseClient.from('users').select('*');
      if (!userErr && usersData && usersData.length > 0) {
        usersData.forEach(uData => {
          if (uData && uData.email) {
            const clean = uData.email.toLowerCase().trim();
            if (this.deletedEmails.has(clean)) return; // Exclude deleted accounts

            const isAdminEmail = clean === 'waterain8n@gmail.com' || clean === 'letuananh18@gmail.com';
            
            let status = uData.status;
            if (isAdminEmail || this.approvedEmails.has(clean)) {
              status = 'approved';
              this.approvedEmails.add(clean);
            } else if (this.blockedEmails.has(clean)) {
              status = 'blocked';
            } else if (!status) {
              status = 'pending';
            }

            const formattedUser = {
              uid: uData.uid || uData.id,
              name: uData.name || clean.split('@')[0],
              email: clean,
              role: uData.role || (isAdminEmail ? 'Admin / Quản trị hệ thống' : 'Cán bộ P.KDDVKH'),
              status: status,
              department: uData.department || 'Phòng Kinh doanh & Dịch vụ Khách hàng',
              lastLogin: uData.last_login || uData.lastLogin || uData.last_seen || new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
              avatar: uData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(uData.name || clean.split('@')[0])}&background=0284c7&color=fff&bold=true`
            };

            const existingIdx = list.findIndex(x => x.email.toLowerCase().trim() === clean);
            if (existingIdx >= 0) {
              list[existingIdx] = { ...list[existingIdx], ...formattedUser };
            } else {
              list.push(formattedUser);
            }
          }
        });
      }

      // 2. Fetch users from login_logs table to ensure NO user is missed
      try {
        const { data: logsData } = await window.supabaseClient.from('login_logs').select('*');
        if (logsData && logsData.length > 0) {
          logsData.forEach(log => {
            if (log && log.email) {
              const clean = log.email.toLowerCase().trim();
              if (this.deletedEmails.has(clean)) return;

              const isAdminEmail = clean === 'waterain8n@gmail.com' || clean === 'letuananh18@gmail.com';
              let status = 'pending';
              if (isAdminEmail || this.approvedEmails.has(clean)) {
                status = 'approved';
              } else if (this.blockedEmails.has(clean)) {
                status = 'blocked';
              }

              if (!list.some(x => x.email.toLowerCase().trim() === clean)) {
                list.push({
                  uid: log.uid || 'log_' + Date.now(),
                  name: log.name || clean.split('@')[0],
                  email: clean,
                  role: log.role || (isAdminEmail ? 'Admin / Quản trị hệ thống' : 'Cán bộ P.KDDVKH'),
                  status: status,
                  department: 'Phòng Kinh doanh & Dịch vụ Khách hàng',
                  lastLogin: log.timestamp || 'Vừa truy cập',
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(log.name || clean.split('@')[0])}&background=0284c7&color=fff&bold=true`
                });
              }
            }
          });
        }
      } catch (e) {}

      // Filter out deleted emails
      this.usersList = list.filter(u => !this.deletedEmails.has(u.email.toLowerCase().trim()));
      this.saveLocalCaches();
      this.notify();

      // Realtime listener on users table
      window.supabaseClient
        .channel('schema-users-changes-v7')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async () => {
          this.loadUsersFromCloud();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'login_logs' }, async () => {
          this.loadUsersFromCloud();
        })
        .subscribe();
    } catch (e) {}
  }

  saveUserSession(userObj) {
    sessionStorage.setItem('thuduc_water_user_session', JSON.stringify(userObj));
    const idx = this.usersList.findIndex(u => u.email.toLowerCase().trim() === userObj.email.toLowerCase().trim());
    if (idx >= 0) {
      this.usersList[idx] = { ...this.usersList[idx], ...userObj };
    } else {
      this.usersList.push(userObj);
    }
    this.saveLocalCaches();
  }

  async syncUserToCloud(userObj) {
    if (window.supabaseClient) {
      try {
        const loginTime = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
        const clean = userObj.email.toLowerCase().trim();
        const isAdmin = clean === 'waterain8n@gmail.com' || clean === 'letuananh18@gmail.com';
        
        const finalStatus = isAdmin ? 'approved' : (userObj.status || (this.approvedEmails.has(clean) ? 'approved' : 'pending'));

        await window.supabaseClient.from('users').upsert({
          uid: userObj.uid,
          name: userObj.name,
          email: clean,
          role: userObj.role,
          status: finalStatus,
          avatar: userObj.avatar,
          department: userObj.department,
          last_login: loginTime
        });

        await window.supabaseClient.from('login_logs').insert({
          uid: userObj.uid,
          name: userObj.name || clean.split('@')[0],
          email: clean,
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
    return this.usersList.filter(u => !this.deletedEmails.has(u.email.toLowerCase().trim()));
  }

  isAdmin() {
    if (!this.currentUser || !this.currentUser.email) return false;
    const email = (this.currentUser.email || '').toLowerCase().trim();
    return email === 'waterain8n@gmail.com' ||
           email === 'letuananh18@gmail.com' ||
           (this.currentUser.role && this.currentUser.role.toLowerCase().includes("admin"));
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

    const cleanEmail = email.toLowerCase().trim();
    const isAdminEmail = cleanEmail === 'waterain8n@gmail.com' || cleanEmail === 'letuananh18@gmail.com';

    this.deletedEmails.delete(cleanEmail);
    this.saveLocalCaches();

    // Determine status
    let userStatus = 'pending';
    if (isAdminEmail || this.approvedEmails.has(cleanEmail)) {
      userStatus = 'approved';
    } else if (this.blockedEmails.has(cleanEmail)) {
      userStatus = 'blocked';
    }

    const userObj = {
      uid: "user_" + Date.now(),
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      role: isAdminEmail ? "Admin / Quản trị hệ thống" : "Nhân viên / Client",
      status: userStatus,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanEmail.split('@')[0])}&background=0284c7&color=fff&bold=true`,
      department: "Phòng Kinh doanh & Dịch vụ Khách hàng",
      lastLogin: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    };

    this.broadcastUserLogin(userObj);

    if (userStatus === 'blocked' && !isAdminEmail) {
      alert("⛔ TỪ CHỐI TRUY CẬP: Tài khoản của bạn đã bị Ban Quản trị Admin KHÓA QUYỀN TRUY CẬP vào hệ thống!");
      return null;
    }

    if (userStatus === 'pending' && !isAdminEmail) {
      await this.syncUserToCloud(userObj);
      alert(`⏳ ĐANG CHỜ PHÊ DUYỆT: Tài khoản (${cleanEmail}) của bạn đã được ghi nhận trên hệ thống và đang CHỜ BAN QUẢN TRỊ ADMIN PHÊ DUYỆT!\n\nVui lòng báo Admin (waterain8n@gmail.com) bấm [✅ Duyệt] ở mục "Người dùng & Giám sát".`);
      return null;
    }

    if (window.supabaseClient) {
      try {
        const { data: authData, error: authError } = await window.supabaseClient.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (!authError && authData.user) {
          this.currentUser = {
            uid: authData.user.id,
            name: authData.user.user_metadata?.name || cleanEmail.split('@')[0],
            email: cleanEmail,
            role: isAdminEmail ? "Admin / Quản trị hệ thống" : "Nhân viên / Client",
            status: "approved",
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanEmail.split('@')[0])}&background=0284c7&color=fff&bold=true`,
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

    // Fallback password validation
    if (password !== "123456" && password !== "12345678" && password !== "admin123") {
      alert("❌ Mật khẩu không chính xác! (Mật khẩu mặc định là: 123456)");
      return null;
    }

    this.currentUser = userObj;
    this.saveUserSession(this.currentUser);
    await this.syncUserToCloud(this.currentUser);
    this.notify();
    return this.currentUser;
  }

  async approveUser(email) {
    const clean = email.toLowerCase().trim();
    this.approvedEmails.add(clean);
    this.blockedEmails.delete(clean);
    this.deletedEmails.delete(clean);
    this.saveLocalCaches();

    const u = this.usersList.find(x => x.email.toLowerCase().trim() === clean);
    if (u) {
      u.status = 'approved';
    }

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('users').update({ status: 'approved' }).eq('email', clean);
      } catch (e) {}
    }

    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'user_approved',
          payload: { email: clean }
        });
      } catch (e) {}
    }

    this.notify();
    if (window.appController) window.appController.renderUsersTable();
  }

  async blockUser(email) {
    const clean = email.toLowerCase().trim();
    this.blockedEmails.add(clean);
    this.approvedEmails.delete(clean);
    this.saveLocalCaches();

    const u = this.usersList.find(x => x.email.toLowerCase().trim() === clean);
    if (u) {
      u.status = 'blocked';
    }

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('users').update({ status: 'blocked' }).eq('email', clean);
      } catch (e) {}
    }

    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'user_blocked',
          payload: { email: clean }
        });
      } catch (e) {}
    }

    this.notify();
    if (window.appController) window.appController.renderUsersTable();
  }

  async deleteUserAccount(email) {
    const clean = email.toLowerCase().trim();
    this.deletedEmails.add(clean);
    this.approvedEmails.delete(clean);
    this.blockedEmails.delete(clean);
    this.saveLocalCaches();

    this.usersList = this.usersList.filter(x => x.email.toLowerCase().trim() !== clean);

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('users').delete().eq('email', clean);
        await window.supabaseClient.from('login_logs').delete().eq('email', clean);
      } catch (e) {}
    }

    // PURGE ALL ASSOCIATED USER DATA (Files, Chat Messages, DMs, Presence)
    if (window.storageService && typeof window.storageService.purgeFilesByUser === 'function') {
      await window.storageService.purgeFilesByUser(clean);
    }
    if (window.chatService && typeof window.chatService.purgeUserData === 'function') {
      window.chatService.purgeUserData(clean);
    }

    this.notify();
    if (window.appController) {
      window.appController.renderUsersTable();
      window.appController.renderCurrentView();
    }
  }

  async createUserAccount(name, email, role, department) {
    const cleanEmail = email.toLowerCase().trim();
    this.approvedEmails.add(cleanEmail);
    this.blockedEmails.delete(cleanEmail);
    this.deletedEmails.delete(cleanEmail);
    this.saveLocalCaches();

    const newUser = {
      uid: "user_" + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      role: role || "Nhân viên / Client",
      status: "approved",
      department: department || "Phòng Kinh doanh & Dịch vụ Khách hàng",
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff&bold=true`,
      lastLogin: "Chưa đăng nhập"
    };

    this.usersList.push(newUser);
    await this.syncUserToCloud(newUser);
    this.notify();
    if (window.appController) window.appController.renderUsersTable();
    return newUser;
  }

  async signInWithGoogle() {
    const currentOrigin = window.location.origin + window.location.pathname;

    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: currentOrigin,
            queryParams: {
              prompt: 'select_account'
            }
          }
        });
        if (error) throw error;
        return;
      } catch (err) {
        console.warn("Supabase Google OAuth notice:", err);
      }
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

window.authManager = new AuthManager();
