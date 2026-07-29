// ==========================================================================
// MAIN APPLICATION CONTROLLER (REAL ADMIN: letuananh18@gmail.com)
// ==========================================================================

class AppController {
  constructor() {
    this.currentView = 'dashboard';
    this.init();
  }

  init() {
    window.addEventListener('DOMContentLoaded', () => {
      this.refreshLucideIcons();
      this.bindAuthEvents();
      this.bindNavigationEvents();
      this.bindFileUploadEvents();
      this.bindTableActions();
      this.bindChatEvents();
      this.bindAiEvents();

      // Remove fake old cache
      localStorage.removeItem('thuduc_water_files');
      localStorage.removeItem('thuduc_water_chats');

      if (window.authManager) {
        window.authManager.onChange(user => this.onUserChanged(user));
      }
      if (window.storageService) {
        window.storageService.onChange(() => this.renderCurrentView());
      }
      if (window.chatService) {
        window.chatService.onChange(() => this.renderTeamChat());
      }
      if (window.aiAssistant) {
        window.aiAssistant.onChange(() => this.renderAiChat());
      }

      this.onUserChanged(window.authManager ? window.authManager.getCurrentUser() : null);
    });
  }

  refreshLucideIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  onUserChanged(user) {
    const authContainer = document.getElementById('authContainer');
    const appShell = document.getElementById('appShell');

    if (!user) {
      if (authContainer) authContainer.style.display = 'flex';
      if (appShell) appShell.style.display = 'none';
    } else {
      if (authContainer) authContainer.style.display = 'none';
      if (appShell) appShell.style.display = 'flex';

      const userNameTxt = document.getElementById('userNameTxt');
      const userRoleTxt = document.getElementById('userRoleTxt');
      const dashGreetingName = document.getElementById('dashGreetingName');

      if (userNameTxt) userNameTxt.textContent = user.name || "Lê Tuấn Anh";
      if (userRoleTxt) userRoleTxt.textContent = user.role || "Admin / Quản trị hệ thống";
      if (dashGreetingName) dashGreetingName.textContent = (user.name ? user.name.split(' ').pop() : "Tuấn Anh");

      this.renderCurrentView();
    }
  }

  bindAuthEvents() {
    const authForm = document.getElementById('authForm');
    if (authForm) {
      authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const pass = document.getElementById('authPassword').value;
        window.authManager.login(email, pass);
      });
    }

    document.getElementById('btnGoogleSignIn')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.authManager.signInWithGoogle();
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      window.authManager.logout();
    });

    document.getElementById('demoAdminBtn')?.addEventListener('click', () => {
      window.authManager.switchPersona('ADMIN');
    });

    document.getElementById('toggleSignupLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      const email = prompt("ĐĂNG KÝ TÀI KHOẢN MỚI\nNhập địa chỉ Email của bạn:");
      if (email && email.trim()) {
        window.authManager.login(email, "123456");
        alert("✨ Đã đăng ký và đăng nhập tài khoản mới thành công!");
      }
    });
  }

  bindNavigationEvents() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const viewName = item.getAttribute('data-view');
        if (viewName) {
          navItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          this.switchView(viewName);
        }
      });
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    const views = document.querySelectorAll('.view-panel');
    views.forEach(v => v.style.display = 'none');

    const targetMap = {
      'dashboard': 'viewDashboard',
      'personal-docs': 'viewPersonalDocs',
      'dept-docs': 'viewDeptDocs',
      'team-chat': 'viewTeamChat',
      'ai-assistant': 'viewAiAssistant',
      'folders': 'viewFolders',
      'users': 'viewUsers',
      'settings': 'viewSettings'
    };

    const targetId = targetMap[viewName];
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) el.style.display = 'block';
    }

    this.renderCurrentView();
  }

  renderCurrentView() {
    this.renderDashboardStats();
    this.renderDashboardTable();
    this.renderRecentActivity();
    this.renderPersonalTable();
    this.renderDeptTable();
    this.renderUsersTable();
    this.renderTeamChat();
    this.renderAiChat();
    this.refreshLucideIcons();
  }

  renderDashboardStats() {
    if (!window.storageService) return;
    const stats = window.storageService.getStorageStats();
    
    const elTotal = document.getElementById('statTotalFiles');
    if (elTotal) elTotal.textContent = stats.totalFiles.toLocaleString();

    const elUsed = document.querySelector('.stat-card:nth-child(2) .stat-value');
    if (elUsed) {
      elUsed.innerHTML = `${stats.usedFormatted} <span style="font-size: 14px; font-weight: 500; color: var(--slate-400);">/ 500 GB</span>`;
    }

    const elProgress = document.querySelector('.progress-bar-fill');
    if (elProgress) {
      elProgress.style.width = `${stats.percentage}%`;
    }

    const elProgressSub = document.querySelector('.stat-card:nth-child(2) .stat-subtext');
    if (elProgressSub) {
      elProgressSub.textContent = `${stats.percentage}% đã sử dụng`;
    }

    const elShared = document.querySelector('.stat-card:nth-child(3) .stat-value');
    if (elShared) {
      elShared.textContent = stats.sharedFiles.toString();
    }
  }

  renderDashboardTable() {
    const tbody = document.getElementById('dashFilesTableBody');
    if (!tbody || !window.storageService) return;

    const files = window.storageService.getFiles('all').slice(0, 5);
    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 35px; color: var(--slate-400); font-weight: 500;">
            📂 Chưa có tài liệu nào. Kéo & thả tệp vào ô trên để bắt đầu tải lên!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = files.map(file => `
      <tr>
        <td>
          <div class="file-name-cell">
            <span class="file-type-icon type-${file.type.toLowerCase()}">${file.type}</span>
            <span>${file.name}</span>
          </div>
        </td>
        <td>${file.sizeFormatted}</td>
        <td>${file.uploadDate}</td>
        <td>${file.uploadedBy}</td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="table-btn preview-btn" data-id="${file.id}">Xem</button>
            <button class="table-btn table-btn-delete delete-btn" data-id="${file.id}">Xóa</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderRecentActivity() {
    const listEl = document.getElementById('recentActivityList');
    if (!listEl || !window.storageService) return;

    const files = window.storageService.getFiles('all').slice(0, 4);
    if (files.length === 0) {
      listEl.innerHTML = `<div style="font-size: 13px; color: var(--slate-400); text-align: center; padding: 25px;">Chưa có hoạt động mới nào.</div>`;
      return;
    }

    listEl.innerHTML = files.map(f => `
      <div class="activity-item">
        <div class="file-type-icon type-${f.type.toLowerCase()}">${f.type}</div>
        <div class="activity-details">
          <div class="activity-filename">${f.name}</div>
          <div class="activity-meta">${f.uploadedBy} đã tải lên • ${f.uploadDate}</div>
        </div>
      </div>
    `).join('');
  }

  renderPersonalTable() {
    const tbody = document.getElementById('personalFilesTableBody');
    if (!tbody || !window.storageService) return;

    const files = window.storageService.getFiles('personal');
    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 35px; color: var(--slate-400); font-weight: 500;">
            📄 Chưa có tài liệu cá nhân nào. Hãy bấm "Tải lên" để lưu tệp riêng của bạn!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = files.map(file => `
      <tr>
        <td><input type="checkbox"></td>
        <td>
          <div class="file-name-cell">
            <span class="file-type-icon type-${file.type.toLowerCase()}">${file.type}</span>
            <span>${file.name}</span>
          </div>
        </td>
        <td><span class="badge-tag type-${file.type.toLowerCase()}">${file.type}</span></td>
        <td>${file.sizeFormatted}</td>
        <td>${file.uploadDate}</td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="table-btn preview-btn" data-id="${file.id}">Xem</button>
            <button class="table-btn table-btn-delete delete-btn" data-id="${file.id}">Xóa</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderDeptTable() {
    const tbody = document.getElementById('deptFilesTableBody');
    if (!tbody || !window.storageService) return;

    const files = window.storageService.getFiles('department');
    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 35px; color: var(--slate-400); font-weight: 500;">
            🏢 Kho nội bộ chưa có văn bản nào. Admin có quyền tải thêm tài liệu chung cho phòng ban!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = files.map(file => `
      <tr>
        <td>
          <div class="file-name-cell">
            <span class="file-type-icon type-${file.type.toLowerCase()}">${file.type}</span>
            <span>${file.name}</span>
          </div>
        </td>
        <td><span class="badge-tag type-${file.type.toLowerCase()}">${file.type}</span></td>
        <td>${file.sizeFormatted}</td>
        <td>${file.uploadedBy}</td>
        <td>${file.uploadDate}</td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="table-btn preview-btn" data-id="${file.id}">Xem</button>
            ${(window.authManager && window.authManager.isAdmin()) ? `<button class="table-btn table-btn-delete delete-btn" data-id="${file.id}">Xóa</button>` : `<span style="font-size: 11px; color: var(--slate-400);">Quyền xem</span>`}
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody || !window.authManager) return;

    const users = window.authManager.getUsersList();
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td>${u.department || 'Phòng Kỹ thuật'}</td>
        <td><span class="badge-tag ${u.email === 'letuananh18@gmail.com' ? 'type-pdf' : 'type-docx'}">${u.email === 'letuananh18@gmail.com' ? 'ADMIN' : 'MEMBER'}</span></td>
      </tr>
    `).join('');
  }

  bindFileUploadEvents() {
    const hiddenInput = document.getElementById('hiddenFileInput');
    const selectBtn = document.getElementById('dropzoneSelectBtn');
    const topUploadBtn = document.getElementById('topUploadBtn');
    const dropzone = document.getElementById('dashboardDropzone');
    const adminUploadDeptBtn = document.getElementById('adminUploadDeptBtn');

    selectBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hiddenInput) hiddenInput.setAttribute('data-target-cat', 'personal');
      hiddenInput?.click();
    });

    topUploadBtn?.addEventListener('click', () => {
      if (hiddenInput) hiddenInput.setAttribute('data-target-cat', 'personal');
      hiddenInput?.click();
    });

    adminUploadDeptBtn?.addEventListener('click', () => {
      if (!window.authManager || !window.authManager.isAdmin()) {
        alert("⚠️ Chỉ Admin (letuananh18@gmail.com) mới có quyền tải lên Kho nội bộ phòng ban!");
        return;
      }
      if (hiddenInput) hiddenInput.setAttribute('data-target-cat', 'department');
      hiddenInput?.click();
    });

    dropzone?.addEventListener('click', () => {
      if (hiddenInput) hiddenInput.setAttribute('data-target-cat', 'personal');
      hiddenInput?.click();
    });

    hiddenInput?.addEventListener('change', (e) => {
      const files = e.target.files;
      const category = hiddenInput.getAttribute('data-target-cat') || 'personal';
      if (files && files.length > 0) {
        Array.from(files).forEach(f => window.storageService.addFile(f, category));
        alert(`✅ Đã tải lên ${files.length} tệp thành công vào ${category === 'department' ? 'Kho nội bộ phòng ban' : 'Kho cá nhân'}!`);
      }
    });
  }

  bindTableActions() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) {
        const id = e.target.getAttribute('data-id');
        if (confirm("Bạn có chắc chắn muốn xóa tài liệu này không?")) {
          window.storageService.deleteFile(id);
        }
      }

      if (e.target.classList.contains('preview-btn')) {
        const id = e.target.getAttribute('data-id');
        const file = window.storageService.files.find(f => f.id === id);
        if (file) {
          const previewTitle = document.getElementById('previewFileName');
          const previewMeta = document.getElementById('previewFileMeta');
          const modal = document.getElementById('filePreviewModal');
          if (previewTitle) previewTitle.textContent = file.name;
          if (previewMeta) previewMeta.textContent = `${file.type} • ${file.sizeFormatted} • Tải bởi ${file.uploadedBy}`;
          if (modal) modal.style.display = 'flex';
          this.refreshLucideIcons();
        }
      }
    });

    document.getElementById('closePreviewModalBtn')?.addEventListener('click', () => {
      const modal = document.getElementById('filePreviewModal');
      if (modal) modal.style.display = 'none';
    });
  }

  bindChatEvents() {
    const btnSend = document.getElementById('btnSendTeamChat');
    const chatInput = document.getElementById('teamChatInput');

    const handleSend = () => {
      if (chatInput && chatInput.value.trim()) {
        window.chatService.sendMessage(chatInput.value);
        chatInput.value = '';
      }
    };

    btnSend?.addEventListener('click', handleSend);
    chatInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    document.querySelectorAll('[data-channel]').forEach(item => {
      item.addEventListener('click', () => {
        const channelId = item.getAttribute('data-channel');
        document.querySelectorAll('[data-channel]').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        if (window.chatService) window.chatService.setActiveTarget(channelId);
      });
    });
  }

  renderTeamChat() {
    const listEl = document.getElementById('teamChatMessageList');
    if (!listEl || !window.chatService) return;

    const msgs = window.chatService.getActiveMessages();
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

    if (msgs.length === 0) {
      listEl.innerHTML = `<div style="font-size: 13px; color: var(--slate-400); text-align: center; margin-top: 40px;">💬 Chưa có tin nhắn nào trong kênh này. Hãy gửi tin nhắn đầu tiên!</div>`;
      return;
    }

    listEl.innerHTML = msgs.map(msg => `
      <div class="chat-bubble ${msg.senderUid === (currentUser ? currentUser.uid : '') ? 'bubble-user' : 'bubble-ai'}" style="margin-bottom: 12px;">
        <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px; font-weight: 600;">${msg.senderName} • ${msg.timestamp}</div>
        <div>${msg.text}</div>
        ${msg.attachment ? `<div class="ai-summary-card" style="margin-top: 8px;">📎 <strong>${msg.attachment.name}</strong> (${msg.attachment.size})</div>` : ''}
      </div>
    `).join('');

    listEl.scrollTop = listEl.scrollHeight;
  }

  bindAiEvents() {
    const btnSend = document.getElementById('btnSendAiChat');
    const aiInput = document.getElementById('aiChatInput');

    const handleSend = () => {
      if (aiInput && aiInput.value.trim()) {
        window.aiAssistant.askQuestion(aiInput.value);
        aiInput.value = '';
      }
    };

    btnSend?.addEventListener('click', handleSend);
    aiInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }

  renderAiChat() {
    const area = document.getElementById('aiChatArea');
    if (!area || !window.aiAssistant) return;

    const msgs = window.aiAssistant.getActiveMessages();
    area.innerHTML = msgs.map(m => {
      if (m.role === 'pill') {
        return `<div class="suggested-prompt-pill">${m.text}</div>`;
      }
      return `
        <div class="chat-bubble ${m.role === 'user' ? 'bubble-user' : 'bubble-ai'}">
          <div>${m.text.replace(/\n/g, '<br>')}</div>
        </div>
      `;
    }).join('');

    area.scrollTop = area.scrollHeight;
  }
}

new AppController();
