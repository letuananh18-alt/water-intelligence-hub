// ==========================================================================
// MAIN APPLICATION CONTROLLER (BULLETPROOF MODAL CLOSING & FOLDER FIX)
// ==========================================================================

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

class AppController {
  constructor() {
    this.currentView = 'dashboard';
    this.selectedFolderId = null;
    this.init();
  }

  init() {
    window.addEventListener('DOMContentLoaded', () => {
      this.refreshLucideIcons();
      this.bindAuthEvents();
      this.bindNavigationEvents();
      this.bindFileUploadEvents();
      this.bindTableActions();
      this.bindFolderEvents();
      this.bindGlobalModalEvents();
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

      if (userNameTxt) userNameTxt.textContent = user.name || user.email.split('@')[0];
      if (userRoleTxt) userRoleTxt.textContent = user.role;
      if (dashGreetingName) dashGreetingName.textContent = (user.name ? user.name.split(' ').pop() : user.email.split('@')[0]);

      const isAdmin = window.authManager && window.authManager.isAdmin();
      const adminUploadDeptBtn = document.getElementById('adminUploadDeptBtn');
      const btnCreateNewFolder = document.getElementById('btnCreateNewFolder');

      if (adminUploadDeptBtn) adminUploadDeptBtn.style.display = isAdmin ? 'flex' : 'none';
      if (btnCreateNewFolder) btnCreateNewFolder.style.display = isAdmin ? 'flex' : 'none';

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

    document.getElementById('toggleSignupLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      const email = prompt("ĐĂNG KÝ TÀI KHOẢN CLIENT MỚI\nNhập địa chỉ Email của bạn:");
      if (email && email.trim()) {
        window.authManager.login(email, "123456");
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
    this.renderDeptFolders();
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
      elUsed.innerHTML = `${escapeHTML(stats.usedFormatted)} <span style="font-size: 14px; font-weight: 500; color: var(--slate-400);">/ 500 GB</span>`;
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
    const isAdmin = window.authManager && window.authManager.isAdmin();

    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 35px; color: var(--slate-400); font-weight: 500;">
            📂 Chưa có tài liệu nào. Kéo & thả tệp vào ô trên để tải tệp cá nhân của bạn!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = files.map(file => `
      <tr>
        <td>
          <div class="file-name-cell">
            <span class="file-type-icon type-${escapeHTML(file.type.toLowerCase())}">${escapeHTML(file.type)}</span>
            <span>${escapeHTML(file.name)}</span>
          </div>
        </td>
        <td>${escapeHTML(file.sizeFormatted)}</td>
        <td>${escapeHTML(file.uploadDate)}</td>
        <td>${escapeHTML(file.uploadedBy)}</td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="table-btn preview-btn" data-id="${escapeHTML(file.id)}">Xem & Tải về</button>
            ${(isAdmin || (file.category === 'personal' && file.uploaderUid === window.authManager.getCurrentUser()?.uid)) ? `<button class="table-btn table-btn-delete delete-btn" data-id="${escapeHTML(file.id)}">Xóa</button>` : `<span style="font-size: 11px; color: var(--slate-400); padding: 4px 8px; background: var(--slate-100); border-radius: 4px;">Quyền xem</span>`}
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
        <div class="file-type-icon type-${escapeHTML(f.type.toLowerCase())}">${escapeHTML(f.type)}</div>
        <div class="activity-details">
          <div class="activity-filename">${escapeHTML(f.name)}</div>
          <div class="activity-meta">${escapeHTML(f.uploadedBy)} đã tải lên • ${escapeHTML(f.uploadDate)}</div>
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
            📄 Chưa có tài liệu cá nhân nào. Bấm "Tải lên" để chọn file từ máy tính của bạn!
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
            <span class="file-type-icon type-${escapeHTML(file.type.toLowerCase())}">${escapeHTML(file.type)}</span>
            <span>${escapeHTML(file.name)}</span>
          </div>
        </td>
        <td><span class="badge-tag type-${escapeHTML(file.type.toLowerCase())}">${escapeHTML(file.type)}</span></td>
        <td>${escapeHTML(file.sizeFormatted)}</td>
        <td>${escapeHTML(file.uploadDate)}</td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="table-btn preview-btn" data-id="${escapeHTML(file.id)}">Xem & Tải về</button>
            <button class="table-btn table-btn-delete delete-btn" data-id="${escapeHTML(file.id)}">Xóa</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderDeptTable() {
    const tbody = document.getElementById('deptFilesTableBody');
    if (!tbody || !window.storageService) return;

    const files = window.storageService.getFiles('department');
    const isAdmin = window.authManager && window.authManager.isAdmin();

    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 35px; color: var(--slate-400); font-weight: 500;">
            🏢 Kho KDDVKH chưa có văn bản nào. ${isAdmin ? 'Bấm "+ Thêm tài liệu phòng ban" ở trên để đăng bài!' : 'Chỉ Admin (letuananh18@gmail.com) được phép đăng văn bản chung cho Phòng Kinh doanh & DVKH.'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = files.map(file => `
      <tr>
        <td>
          <div class="file-name-cell">
            <span class="file-type-icon type-${escapeHTML(file.type.toLowerCase())}">${escapeHTML(file.type)}</span>
            <span>${escapeHTML(file.name)}</span>
          </div>
        </td>
        <td><span class="badge-tag type-${escapeHTML(file.type.toLowerCase())}">${escapeHTML(file.type)}</span></td>
        <td>${escapeHTML(file.sizeFormatted)}</td>
        <td>${escapeHTML(file.uploadedBy)}</td>
        <td>${escapeHTML(file.uploadDate)}</td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="table-btn preview-btn" data-id="${escapeHTML(file.id)}">Xem & Tải về</button>
            ${isAdmin ? `<button class="table-btn table-btn-delete delete-btn" data-id="${escapeHTML(file.id)}">Xóa</button>` : `<span style="font-size: 11px; color: var(--slate-500); padding: 4px 10px; background: var(--slate-100); border-radius: 4px; font-weight: 600;">👁️ Quyền xem & Tải về</span>`}
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderDeptFolders() {
    const grid = document.getElementById('deptFoldersGrid');
    const allGrid = document.getElementById('allFoldersListGrid');
    if (!grid || !window.storageService) return;

    const folders = window.storageService.getFolders();
    const isAdmin = window.authManager && window.authManager.isAdmin();

    const html = folders.map(fold => `
      <div class="stat-card" style="position: relative; flex-direction: column; cursor: pointer; border-left: 4px solid var(--accent-blue);">
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i data-lucide="folder" style="color: var(--accent-blue); width: 24px; height: 24px;"></i>
            <strong style="font-size: 14px; color: var(--slate-900);">${escapeHTML(fold.name)}</strong>
          </div>
          ${isAdmin ? `<button class="icon-btn folder-opt-btn" data-folder-id="${escapeHTML(fold.id)}" title="Tùy chọn thư mục">⋮</button>` : ''}
        </div>
        <div style="font-size: 11px; color: var(--slate-400); margin-top: 10px; display: flex; justify-content: space-between; width: 100%;">
          <span>Tạo bởi: ${escapeHTML(fold.createdBy)}</span>
          <span>${escapeHTML(fold.date)}</span>
        </div>
      </div>
    `).join('');

    grid.innerHTML = html;
    if (allGrid) allGrid.innerHTML = html;
  }

  renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody || !window.authManager) return;

    const users = window.authManager.getUsersList();
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${escapeHTML(u.name)}</strong></td>
        <td>${escapeHTML(u.email)}</td>
        <td>${escapeHTML(u.department || 'Phòng Kinh doanh & Dịch vụ Khách hàng')}</td>
        <td><span class="badge-tag ${u.email === 'letuananh18@gmail.com' ? 'type-pdf' : 'type-docx'}">${u.email === 'letuananh18@gmail.com' ? 'ADMIN' : 'CLIENT'}</span></td>
      </tr>
    `).join('');
  }

  bindFolderEvents() {
    const btnCreateFolder = document.getElementById('btnCreateNewFolder');
    const folderModal = document.getElementById('folderActionModal');
    const folderInput = document.getElementById('folderNameInput');
    const folderMeta = document.getElementById('folderMetaInfo');

    btnCreateFolder?.addEventListener('click', async () => {
      const name = prompt("NHẬP TÊN THƯ MỤC MỚI KHU VỰC KDDVKH:");
      if (name && name.trim()) {
        await window.storageService.createFolder(name);
        alert("✨ Đã tạo thư mục mới thành công!");
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('folder-opt-btn')) {
        e.stopPropagation();
        const id = e.target.getAttribute('data-folder-id');
        const fold = window.storageService.getFolders().find(f => f.id === id);
        if (fold) {
          this.selectedFolderId = id;
          if (folderInput) folderInput.value = fold.name;
          if (folderMeta) {
            folderMeta.innerHTML = `
              📅 <strong>Ngày tạo:</strong> ${escapeHTML(fold.date)}<br>
              👤 <strong>Người tạo:</strong> ${escapeHTML(fold.createdBy)}<br>
              📂 <strong>Phòng ban:</strong> Phòng Kinh doanh & Dịch vụ Khách hàng
            `;
          }
          if (folderModal) folderModal.style.display = 'flex';
        }
      }
    });

    document.getElementById('btnSaveFolderModal')?.addEventListener('click', async () => {
      if (this.selectedFolderId && folderInput && folderInput.value.trim()) {
        await window.storageService.renameFolder(this.selectedFolderId, folderInput.value);
        this.closeModal('folderActionModal');
        alert("✅ Đã cập nhật tên thư mục!");
      }
    });

    document.getElementById('btnDeleteFolderModal')?.addEventListener('click', async () => {
      if (this.selectedFolderId && confirm("Bạn có chắc chắn muốn xóa thư mục này không?")) {
        await window.storageService.deleteFolder(this.selectedFolderId);
        this.closeModal('folderActionModal');
        alert("🗑️ Đã xóa thư mục!");
      }
    });
  }

  bindGlobalModalEvents() {
    // Bulletproof event delegation for closing all modals
    document.addEventListener('click', (e) => {
      // Close button X icon click
      if (e.target.closest('#closeFolderModalBtn') || e.target.closest('.close-btn')) {
        this.closeModal('folderActionModal');
        this.closeModal('filePreviewModal');
      }

      // Backdrop click outside content card
      if (e.target.id === 'folderActionModal') {
        this.closeModal('folderActionModal');
      }
      if (e.target.id === 'filePreviewModal') {
        this.closeModal('filePreviewModal');
      }
    });

    // Keyboard ESC key listener
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal('folderActionModal');
        this.closeModal('filePreviewModal');
      }
    });
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  bindFileUploadEvents() {
    const hiddenInput = document.getElementById('hiddenFileInput');
    const selectBtn = document.getElementById('dropzoneSelectBtn');
    const topUploadBtn = document.getElementById('topUploadBtn');
    const dropzone = document.getElementById('dashboardDropzone');
    const adminUploadDeptBtn = document.getElementById('adminUploadDeptBtn');

    const getActiveCategory = () => {
      if (this.currentView === 'dept-docs') return 'department';
      return 'personal';
    };

    selectBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hiddenInput) hiddenInput.setAttribute('data-target-cat', getActiveCategory());
      hiddenInput?.click();
    });

    topUploadBtn?.addEventListener('click', () => {
      if (hiddenInput) hiddenInput.setAttribute('data-target-cat', getActiveCategory());
      hiddenInput?.click();
    });

    adminUploadDeptBtn?.addEventListener('click', () => {
      if (!window.authManager || !window.authManager.isAdmin()) {
        alert("⛔ Bị từ chối: Bạn đang ở quyền Client. Chỉ Admin (letuananh18@gmail.com) mới có quyền tải lên Kho nội bộ phòng ban!");
        return;
      }
      if (hiddenInput) hiddenInput.setAttribute('data-target-cat', 'department');
      hiddenInput?.click();
    });

    dropzone?.addEventListener('click', () => {
      if (hiddenInput) hiddenInput.setAttribute('data-target-cat', getActiveCategory());
      hiddenInput?.click();
    });

    hiddenInput?.addEventListener('change', (e) => {
      const files = e.target.files;
      const category = hiddenInput.getAttribute('data-target-cat') || getActiveCategory();
      if (files && files.length > 0) {
        let successCount = 0;
        Array.from(files).forEach(f => {
          const res = window.storageService.addFile(f, category);
          if (res) successCount++;
        });
        if (successCount > 0) {
          alert(`✅ Đã tải lên ${successCount} tệp thành công vào ${category === 'department' ? 'Kho Kinh doanh & DVKH' : 'Kho cá nhân'}!`);
        }
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
          const downloadBtn = document.getElementById('previewDownloadBtn');
          const modal = document.getElementById('filePreviewModal');
          
          if (previewTitle) previewTitle.textContent = file.name;
          if (previewMeta) previewMeta.textContent = `${file.type} • ${file.sizeFormatted} • Tải bởi ${file.uploadedBy}`;
          
          if (downloadBtn) {
            downloadBtn.href = file.url || "#";
            downloadBtn.download = file.name;
            downloadBtn.onclick = (event) => {
              if (file.url && file.url !== "#") {
                const tempLink = document.createElement('a');
                tempLink.href = file.url;
                tempLink.download = file.name;
                document.body.appendChild(tempLink);
                tempLink.click();
                document.body.removeChild(tempLink);
              } else {
                alert("ℹ️ Tệp này đã được lưu danh mục metadata. Bạn có thể xem thông tin trực tiếp trên bảng.");
              }
            };
          }

          if (modal) modal.style.display = 'flex';
          this.refreshLucideIcons();
        }
      }
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
        <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px; font-weight: 600;">${escapeHTML(msg.senderName)} • ${escapeHTML(msg.timestamp)}</div>
        <div>${escapeHTML(msg.text)}</div>
        ${msg.attachment ? `<div class="ai-summary-card" style="margin-top: 8px;">📎 <strong>${escapeHTML(msg.attachment.name)}</strong> (${escapeHTML(msg.attachment.size)})</div>` : ''}
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
        return `<div class="suggested-prompt-pill">${escapeHTML(m.text)}</div>`;
      }
      return `
        <div class="chat-bubble ${m.role === 'user' ? 'bubble-user' : 'bubble-ai'}">
          <div>${escapeHTML(m.text).replace(/\n/g, '<br>')}</div>
        </div>
      `;
    }).join('');

    area.scrollTop = area.scrollHeight;
  }
}

new AppController();
