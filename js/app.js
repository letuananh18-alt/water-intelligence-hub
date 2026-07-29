// ==========================================================================
// MAIN APPLICATION CONTROLLER (VIEW ROUTING, DOM BINDING & INTERACTIONS)
// Compatible with file:// protocol and http:// servers
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
      const userAvatarImg = document.getElementById('userAvatarImg');

      if (userNameTxt) userNameTxt.textContent = user.name;
      if (userRoleTxt) userRoleTxt.textContent = user.role;
      if (dashGreetingName) dashGreetingName.textContent = user.name.split(' ').pop() || user.name;
      if (userAvatarImg && user.avatar) userAvatarImg.src = user.avatar;

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

    // Bind Google Sign-In button
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

    document.getElementById('demoMemberBtn')?.addEventListener('click', () => {
      window.authManager.switchPersona('MEMBER');
    });

    document.getElementById('toggleSignupLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      const email = prompt("ĐĂNG KÝ TÀI KHOẢN MỚI\nNhập địa chỉ Email của bạn:");
      if (email && email.trim()) {
        window.authManager.login(email, "123456");
        alert("✨ Đã đăng ký và đăng nhập tài khoản mới thành công!");
      }
    });

    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      alert("📧 Đã gửi liên kết khôi phục mật khẩu vào Email của bạn!");
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
    this.renderTeamChat();
    this.renderAiChat();
    this.refreshLucideIcons();
  }

  renderDashboardStats() {
    if (!window.storageService) return;
    const stats = window.storageService.getStorageStats();
    const el = document.getElementById('statTotalFiles');
    if (el) el.textContent = stats.totalFiles.toLocaleString();
  }

  renderDashboardTable() {
    const tbody = document.getElementById('dashFilesTableBody');
    if (!tbody || !window.storageService) return;

    const files = window.storageService.getFiles('all').slice(0, 5);
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
    if (!listEl) return;

    const activities = [
      { name: "Quy trình thiết kế hệ thống.pdf", type: "pdf", user: "Nguyễn Văn Tuấn", action: "đã tải lên", time: "10:30" },
      { name: "Báo cáo dự án Q2.docx", type: "docx", user: "Trần Minh Anh", action: "đã cập nhật", time: "09:15" },
      { name: "Mockup giao diện.ai", type: "ai", user: "Lê Hoàng Nam", action: "đã tải lên", time: "Hôm qua" },
      { name: "Tài liệu hướng dẫn sử dụng.pdf", type: "pdf", user: "Phạm Thị Mai", action: "đã cập nhật", time: "2 ngày trước" }
    ];

    listEl.innerHTML = activities.map(act => `
      <div class="activity-item">
        <div class="file-type-icon type-${act.type}">${act.type.toUpperCase()}</div>
        <div class="activity-details">
          <div class="activity-filename">${act.name}</div>
          <div class="activity-meta">${act.user} ${act.action} • ${act.time}</div>
        </div>
      </div>
    `).join('');
  }

  renderPersonalTable() {
    const tbody = document.getElementById('personalFilesTableBody');
    if (!tbody || !window.storageService) return;

    const files = window.storageService.getFiles('personal');
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
            ${window.authManager.isAdmin() ? `<button class="table-btn table-btn-delete delete-btn" data-id="${file.id}">Xóa</button>` : `<span style="font-size: 11px; color: var(--slate-400);">Quyền xem</span>`}
          </div>
        </td>
      </tr>
    `).join('');
  }

  bindFileUploadEvents() {
    const hiddenInput = document.getElementById('hiddenFileInput');
    const selectBtn = document.getElementById('dropzoneSelectBtn');
    const topUploadBtn = document.getElementById('topUploadBtn');
    const dropzone = document.getElementById('dashboardDropzone');

    selectBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      hiddenInput?.click();
    });

    topUploadBtn?.addEventListener('click', () => {
      hiddenInput?.click();
    });

    dropzone?.addEventListener('click', () => {
      hiddenInput?.click();
    });

    hiddenInput?.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        Array.from(files).forEach(f => window.storageService.addFile(f, 'personal'));
        alert(`✅ Đã tải lên ${files.length} tệp thành công!`);
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
    const currentUser = window.authManager.getCurrentUser();

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
