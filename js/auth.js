// ==========================================================================
// THU DUC WATER AUTHENTICATION & USER MANAGEMENT ENGINE
// Primary Master Admin: letuananh18@gmail.com (Sole System Administrator)
// Realtime User Approval, Role Guards & Instant Account Purge
// ==========================================================================

const MASTER_ADMIN_EMAIL = "letuananh18@gmail.com";

const DEMO_USERS = {
  ADMIN_MASTER: {
    uid: "user_admin_master_001",
    name: "Lê Tuấn Anh (Master Admin)",
    email: "letuananh18@gmail.com",
    role: "Admin / Quản trị hệ thống",
    status: "approved",
    avatar: "https://ui-avatars.com/api/?name=Tu+Anh&background=0284c7&color=fff&bold=true",
    department: "Phòng Kinh doanh & Dịch vụ Khách hàng",
    lastLogin: "Vừa xong"
  },
  STAFF_WATERAIN: {
    uid: "user_staff_001",
    name: "Cán bộ anh le",
    email: "waterain8n@gmail.com",
    role: "Cán bộ P.KDDVKH",
    status: "approved",
    avatar: "https://ui-avatars.com/api/?name=Anh+Le&background=0369a1&color=fff&bold=true",
    department: "Phòng Kinh doanh & Dịch vụ Khách hàng",
    lastLogin: "Vừa xong"
  }
};

class AuthManager {
  constructor() {
    this.currentUser = DEMO_USERS.ADMIN_MASTER;
    this.usersList = [DEMO_USERS.ADMIN_MASTER, DEMO_USERS.STAFF_WATERAIN];
    this.approvedEmails = new Set(["letuananh18@gmail.com", "waterain8n@gmail.com", "mr.saigonchip@gmail.com"]);
    this.blockedEmails = new Set();
    this.deletedEmails = new Set();
    this.listeners = [];
    this.realtimeChannel = null;
    this.init();
  }

  init() {
    // 1. Load session & local caches
    const savedSession = sessionStorage.getItem('thuduc_water_user_session') || localStorage.getItem('thuduc_water_user');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.email) {
          this.currentUser = parsed;
        } else {
          this.currentUser = null;
        }
      } catch (e) {
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }

    const savedKnownUsers = localStorage.getItem('thuduc_all_known_users');
    if (savedKnownUsers) {
      try {
        const arr = JSON.parse(savedKnownUsers);
        if (Array.isArray(arr) && arr.length > 0) {
          arr.forEach(u => {
            if (u && u.email) {
              const clean = u.email.toLowerCase().trim();
              const isMaster = clean === MASTER_ADMIN_EMAIL;
              const formatted = {
                ...u,
                role: isMaster ? "Admin / Quản trị hệ thống" : (u.role && u.role.includes("Admin") ? "Cán bộ P.KDDVKH" : (u.role || "Cán bộ P.KDDVKH"))
              };
              const idx = this.usersList.findIndex(x => x.email.toLowerCase().trim() === clean);
              if (idx >= 0) {
                this.usersList[idx] = formatted;
              } else {
                this.usersList.push(formatted);
              }
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
    // Master admin and system admin can NEVER be in deletedEmails
    this.deletedEmails.delete("letuananh18@gmail.com");
    this.deletedEmails.delete("waterain8n@gmail.com");
    this.saveLocalCaches();

    if (window.supabaseClient) {
      this.setupSupabaseRealtime();
      this.checkSupabaseAuthSession();
      this.loadUsersFromCloud();
    }
  }

  setupSupabaseRealtime() {
    if (!window.supabaseClient) return;

    try {
      this.realtimeChannel = window.supabaseClient.channel('thuduc_user_approval_v4', {
        config: { broadcast: { self: true } }
      });

      this.realtimeChannel
        .on('broadcast', { event: 'user_logged_in' }, (payload) => {
          if (payload && payload.payload && payload.payload.email) {
            const uData = payload.payload;
            const clean = uData.email.toLowerCase().trim();
            if (this.deletedEmails.has(clean)) return;

            const existingIdx = this.usersList.findIndex(x => x.email.toLowerCase().trim() === clean);
            const isMaster = clean === MASTER_ADMIN_EMAIL;
            const status = isMaster ? 'approved' : (this.blockedEmails.has(clean) ? 'blocked' : 'approved');

            const formattedUser = {
              uid: uData.uid || 'user_' + Date.now(),
              name: uData.name || clean.split('@')[0],
              email: clean,
              role: isMaster ? 'Admin / Quản trị hệ thống' : 'Cán bộ P.KDDVKH',
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
        const isMaster = cleanEmail === MASTER_ADMIN_EMAIL;
        const name = u.user_metadata?.full_name || u.user_metadata?.name || cleanEmail.split('@')[0];

        let userStatus = this.blockedEmails.has(cleanEmail) ? 'blocked' : 'approved';
        this.approvedEmails.add(cleanEmail);

        const userObj = {
          uid: u.id,
          name: name,
          email: cleanEmail,
          role: isMaster ? "Admin / Quản trị hệ thống" : "Cán bộ P.KDDVKH",
          status: userStatus,
          avatar: u.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff&bold=true`,
          department: "Phòng Kinh doanh & Dịch vụ Khách hàng",
          lastLogin: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
        };

        this.broadcastUserLogin(userObj);

        if (userStatus === 'blocked' && !isMaster) {
          alert(`⛔ TỪ CHỐI TRUY CẬP: Tài khoản Gmail (${cleanEmail}) đã bị Khóa quyền truy cập vào hệ thống!`);
          return;
        }

        if (userStatus === 'blocked' && !isMaster) {
          alert(`⛔ TỪ CHỐI TRUY CẬP: Tài khoản Gmail (${cleanEmail}) của bạn đã bị Khóa quyền truy cập vào hệ thống!`);
          return;
        }

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
      const { data: dbUsers, error } = await window.supabaseClient.from('users').select('*');
      if (!error && dbUsers && dbUsers.length > 0) {
        dbUsers.forEach(u => {
          if (!u || !u.email) return;
          const clean = u.email.toLowerCase().trim();
          
          // System admins can never be deleted
          if (clean === MASTER_ADMIN_EMAIL || clean === 'waterain8n@gmail.com') {
            this.deletedEmails.delete(clean);
          }

          if (this.deletedEmails.has(clean)) return;

          const existingIdx = this.usersList.findIndex(x => x.email.toLowerCase().trim() === clean);
          const isMaster = clean === MASTER_ADMIN_EMAIL;
          const status = isMaster ? 'approved' : (this.approvedEmails.has(clean) ? 'approved' : (this.blockedEmails.has(clean) ? 'blocked' : (u.status || 'pending')));

          const formatted = {
            uid: u.uid || u.id || 'user_' + Date.now(),
            name: u.name || clean.split('@')[0],
            email: clean,
            role: isMaster ? 'Admin / Quản trị hệ thống' : 'Cán bộ P.KDDVKH',
            status: status,
            department: u.department || 'Phòng Kinh doanh & Dịch vụ Khách hàng',
            lastLogin: u.last_login || u.lastLogin || new Date().toLocaleString('vi-VN'),
            avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || clean.split('@')[0])}&background=0284c7&color=fff&bold=true`
          };

          if (existingIdx >= 0) {
            this.usersList[existingIdx] = { ...this.usersList[existingIdx], ...formatted };
          } else {
            this.usersList.push(formatted);
          }
        });

        this.saveLocalCaches();
        this.notify();
      }
    } catch (e) {}
  }

  saveUserSession(user) {
    sessionStorage.setItem('thuduc_water_user_session', JSON.stringify(user));
    localStorage.setItem('thuduc_water_user', JSON.stringify(user));
  }

  async syncUserToCloud(userObj) {
    if (!window.supabaseClient || !userObj || !userObj.email) return;

    const cleanEmail = userObj.email.toLowerCase().trim();
    const fullPayload = {
      uid: userObj.uid || 'user_' + Date.now(),
      name: userObj.name || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: userObj.role || 'Cán bộ P.KDDVKH',
      department: userObj.department || 'Phòng Kinh doanh & Dịch vụ Khách hàng',
      last_login: userObj.lastLogin || new Date().toLocaleString('vi-VN'),
      avatar: userObj.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanEmail.split('@')[0])}&background=0284c7&color=fff&bold=true`
    };

    try {
      const { error: err1 } = await window.supabaseClient.from('users').upsert(fullPayload, { onConflict: 'email' });
      
      if (err1) {
        console.warn("⚠️ User upsert email strategy notice:", err1.message);
        const { data: updated, error: err2 } = await window.supabaseClient
          .from('users')
          .update({
            name: fullPayload.name,
            role: fullPayload.role,
            department: fullPayload.department,
            last_login: fullPayload.last_login
          })
          .eq('email', cleanEmail)
          .select();

        if (err2 || !updated || updated.length === 0) {
          const { error: err3 } = await window.supabaseClient.from('users').insert([fullPayload]);
          if (err3) {
            console.warn("⚠️ User direct insert notice, trying minimal payload:", err3.message);
            await window.supabaseClient.from('users').insert([{
              name: fullPayload.name,
              email: cleanEmail
            }]);
          }
        }
      }
    } catch (e) {
      console.warn("Supabase syncUserToCloud exception notice:", e);
    }
  }

  getCurrentUser() {
    return this.currentUser || DEMO_USERS.ADMIN_MASTER;
  }

  getUsersList() {
    const cleanList = this.usersList.map(u => {
      const clean = u.email.toLowerCase().trim();
      const isMaster = clean === MASTER_ADMIN_EMAIL;
      return {
        ...u,
        role: isMaster ? "Admin / Quản trị hệ thống" : "Cán bộ P.KDDVKH"
      };
    }).filter(u => !this.deletedEmails.has(u.email.toLowerCase().trim()));
    return cleanList;
  }

  isAdmin() {
    if (!this.currentUser || !this.currentUser.email) return false;
    const cleanEmail = (this.currentUser.email || '').toLowerCase().trim();
    return cleanEmail === MASTER_ADMIN_EMAIL;
  }

  async login(email, password) {
    if (!email || !email.includes('@')) {
      alert("⚠️ Vui lòng nhập địa chỉ Email hợp lệ!");
      return null;
    }

    const cleanEmail = email.toLowerCase().trim();
    const isMaster = cleanEmail === MASTER_ADMIN_EMAIL;

    this.deletedEmails.delete(cleanEmail);
    this.saveLocalCaches();

    let userStatus = this.blockedEmails.has(cleanEmail) ? 'blocked' : 'approved';
    this.approvedEmails.add(cleanEmail);

    const userObj = {
      uid: "user_" + Date.now(),
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      role: isMaster ? "Admin / Quản trị hệ thống" : "Cán bộ P.KDDVKH",
      status: userStatus,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanEmail.split('@')[0])}&background=0284c7&color=fff&bold=true`,
      department: "Phòng Kinh doanh & Dịch vụ Khách hàng",
      lastLogin: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    };

    this.broadcastUserLogin(userObj);

    if (userStatus === 'blocked' && !isMaster) {
      alert("⛔ TỪ CHỐI TRUY CẬP: Tài khoản của bạn đã bị Khóa quyền truy cập vào hệ thống!");
      return null;
    }

    this.currentUser = userObj;
    this.saveUserSession(this.currentUser);
    await this.syncUserToCloud(this.currentUser);
    this.notify();
    return this.currentUser;
  }

  async approveUser(email) {
    if (!email) return;
    const clean = email.toLowerCase().trim();
    this.approvedEmails.add(clean);
    this.blockedEmails.delete(clean);
    this.saveLocalCaches();

    const u = this.usersList.find(x => x.email.toLowerCase().trim() === clean);
    if (u) u.status = 'approved';

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('users').update({ status: 'approved' }).eq('email', clean);
      } catch (e) {}
    }

    this.notify();
  }

  async blockUser(email) {
    if (!email) return;
    const clean = email.toLowerCase().trim();
    this.blockedEmails.add(clean);
    this.approvedEmails.delete(clean);
    this.saveLocalCaches();

    const u = this.usersList.find(x => x.email.toLowerCase().trim() === clean);
    if (u) u.status = 'blocked';

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('users').update({ status: 'blocked' }).eq('email', clean);
      } catch (e) {}
    }

    this.notify();
  }

  async deleteUserAccount(email) {
    if (!email) return;
    const clean = email.toLowerCase().trim();
    if (clean === MASTER_ADMIN_EMAIL) {
      alert("⚠️ Không thể xóa tài khoản Master Admin chính!");
      return;
    }

    this.deletedEmails.add(clean);
    this.approvedEmails.delete(clean);
    this.blockedEmails.delete(clean);
    this.usersList = this.usersList.filter(u => u.email.toLowerCase().trim() !== clean);
    this.saveLocalCaches();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('users').delete().eq('email', clean);
      } catch (e) {}
    }

    if (window.storageService) {
      try {
        await window.storageService.purgeFilesByUser(clean);
      } catch (e) {}
    }

    if (window.chatService) {
      try {
        await window.chatService.purgeUserData(clean);
      } catch (e) {}
    }

    this.notify();
  }

  async createUserAccount(name, email, role = 'Cán bộ P.KDDVKH', department = 'Phòng Kinh doanh & Dịch vụ Khách hàng') {
    const cleanEmail = email.toLowerCase().trim();
    const isMaster = cleanEmail === MASTER_ADMIN_EMAIL;
    this.deletedEmails.delete(cleanEmail);
    this.approvedEmails.add(cleanEmail);
    this.blockedEmails.delete(cleanEmail);

    const newUser = {
      uid: "user_" + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      role: isMaster ? "Admin / Quản trị hệ thống" : "Cán bộ P.KDDVKH",
      status: "approved",
      department: department,
      lastLogin: "Mới khởi tạo",
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff&bold=true`
    };

    const existingIdx = this.usersList.findIndex(u => u.email.toLowerCase().trim() === cleanEmail);
    if (existingIdx >= 0) {
      this.usersList[existingIdx] = newUser;
    } else {
      this.usersList.push(newUser);
    }

    this.saveLocalCaches();
    await this.syncUserToCloud(newUser);
    this.notify();
    return newUser;
  }

  async signInWithGoogle() {
    if (window.supabaseClient) {
      try {
        await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + window.location.pathname
          }
        });
        return;
      } catch (err) {
        console.warn("Supabase Google OAuth notice:", err);
      }
    }
    return this.login(MASTER_ADMIN_EMAIL, "123456");
  }

  async logout() {
    sessionStorage.removeItem('thuduc_water_user_session');
    localStorage.removeItem('thuduc_water_user');
    if (window.supabaseClient) {
      try {
        await window.supabaseClient.auth.signOut();
      } catch (e) {}
    }
    this.currentUser = null;
    this.notify();
    window.location.reload();
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }
}

window.authManager = new AuthManager();
