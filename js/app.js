// ==========================================================================
// MAIN APPLICATION CONTROLLER (RESPONSIVE PC/MOBILE + AI KNOWLEDGE ENGINE)
// REALTIME DATA SYNC & SEARCH HIGHLIGHTING & 1-CLICK AI SUMMARY
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

function highlightSearchTerm(text, query) {
  if (!query || !query.trim() || typeof text !== 'string') return escapeHTML(text);
  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${q})`, 'gi');
  const escapedText = escapeHTML(text);
  return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
}

class AppController {
  constructor() {
    this.currentView = 'dashboard';
    this.selectedFolderId = null;
    this.currentDeptFolderId = null;
    this.pendingUploadFiles = null;
    this.pendingUploadCategory = 'personal';
    this.currentPreviewFileId = null;
    this.searchQuery = '';
    this.init();
  }

  init() {
    window.addEventListener('DOMContentLoaded', () => {
      try {
        this.bindAuthEvents();
        this.bindNavigationEvents();
        this.bindFileUploadEvents();
        this.bindTableActions();
        this.bindFolderEvents();
        this.bindDeptFilterEvents();
        this.bindGlobalModalEvents();
        this.bindChatEvents();
        this.bindAiEvents();
        this.bindMobileSidebarEvents();
        this.bindSettingsEvents();
        this.bindGlobalSearchEvents();
        this.refreshLucideIcons();
      } catch (err) {
        console.warn("App initialization notice:", err);
      }

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

  bindGlobalSearchEvents() {
    const searchInput = document.getElementById('globalSearchInput');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderCurrentView();
    });
  }

  bindSettingsEvents() {
    const keyInput = document.getElementById('geminiApiKeyInput');
    const saveBtn = document.getElementById('btnSaveGeminiKey');
    const statusTxt = document.getElementById('geminiKeyStatus');

    if (keyInput && window.aiAssistant) {
      keyInput.value = window.aiAssistant.getApiKey();
      if (statusTxt) {
        statusTxt.textContent = window.aiAssistant.getApiKey() ? "✅ Đã kích hoạt Google Gemini AI Key" : "⚡ Chưa cấu hình Key (Đang dùng AI RAG Engine nội bộ)";
        statusTxt.style.color = window.aiAssistant.getApiKey() ? "#059669" : "var(--slate-500)";
      }
    }

    saveBtn?.addEventListener('click', () => {
      if (keyInput && window.aiAssistant) {
        window.aiAssistant.setApiKey(keyInput.value);
        if (statusTxt) {
          statusTxt.textContent = keyInput.value.trim() ? "✅ Đã lưu và kích hoạt Google Gemini AI Key thành công!" : "⚡ Đã xóa Key";
          statusTxt.style.color = keyInput.value.trim() ? "#059669" : "var(--slate-500)";
        }
        alert("✨ Đã cập nhật cấu hình Trí tuệ Nhân tạo Google Gemini AI Engine!");
      }
    });

    document.getElementById('btnPurgeCloudTrash')?.addEventListener('click', () => {
      if (window.storageService) {
        window.storageService.purgeAllFiles();
      }
    });
  }

  bindAuthEvents() {
    const authForm = document.getElementById('authForm');
    const emailInput = document.getElementById('authEmail');
    const passInput = document.getElementById('authPassword');
    const btnGoogle = document.getElementById('btnGoogleSignIn');
    const logoutBtn = document.getElementById('logoutBtn');
    const togglePassBtn = document.getElementById('togglePasswordBtn');

    authForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput?.value;
      const pass = passInput?.value;
      if (window.authManager) {
        await window.authManager.login(email, pass);
      }
    });

    btnGoogle?.addEventListener('click', async () => {
      if (window.authManager) {
        await window.authManager.signInWithGoogle();
      }
    });

    logoutBtn?.addEventListener('click', async () => {
      if (window.authManager) {
        await window.authManager.logout();
      }
    });

    togglePassBtn?.addEventListener('click', () => {
      if (passInput) {
        passInput.type = passInput.type === 'password' ? 'text' : 'password';
      }
    });
  }

  refreshLucideIcons() {
    if (window.lucide) {
      try {
        window.lucide.createIcons();
      } catch (e) {}
    }
  }

  bindMobileSidebarEvents() {
    const mobileBtn = document.getElementById('mobileMenuToggleBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    const toggleSidebar = () => {
      sidebar?.classList.toggle('mobile-open');
      overlay?.classList.toggle('mobile-open');
    };

    mobileBtn?.addEventListener('click', toggleSidebar);
    overlay?.addEventListener('click', toggleSidebar);
  }

  onUserChanged(user) {
    const authContainer = document.getElementById('authContainer');
    const appShell = document.getElementById('appShell');

    if (!user) {
      if (authContainer) authContainer.style.display = 'flex';
      if (appShell) appShell.style.display = 'none';
      if (window.techBgInstance) window.techBgInstance.start();
    } else {
      if (authContainer) authContainer.style.display = 'none';
      if (appShell) appShell.style.display = 'flex';
      if (window.techBgInstance) window.techBgInstance.stop();

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

  bindNavigationEvents() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const viewName = item.getAttribute('data-view');
        if (viewName) {
          navItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          this.switchView(viewName);

          // Close mobile sidebar on nav click
          document.querySelector('.sidebar')?.classList.remove('mobile-open');
          document.getElementById('sidebarOverlay')?.classList.remove('mobile-open');
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

    const files = window.storageService.getFiles('department', this.searchQuery).slice(0, 5);
    const isAdmin = window.authManager && window.authManager.isAdmin();

    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 35px; color: var(--slate-400); font-weight: 500;">
            📂 Kho Kinh doanh & DVKH chưa có văn bản khớp với tìm kiếm.
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
            <span>${highlightSearchTerm(file.name, this.searchQuery)}</span>
          </div>
        </td>
        <td>${escapeHTML(file.sizeFormatted)}</td>
        <td>${escapeHTML(file.uploadDate)}</td>
        <td>${highlightSearchTerm(file.uploadedBy, this.searchQuery)}</td>
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

    const files = window.storageService.getFiles('department', this.searchQuery).slice(0, 4);
    if (files.length === 0) {
      listEl.innerHTML = `<div style="font-size: 13px; color: var(--slate-400); text-align: center; padding: 25px;">Chưa có hoạt động mới nào trong Kho KDDVKH.</div>`;
      return;
    }

    listEl.innerHTML = files.map(f => `
      <div class="activity-item">
        <div class="file-type-icon type-${escapeHTML(f.type.toLowerCase())}">${escapeHTML(f.type)}</div>
        <div class="activity-details">
          <div class="activity-filename">${highlightSearchTerm(f.name, this.searchQuery)}</div>
          <div class="activity-meta">${highlightSearchTerm(f.uploadedBy, this.searchQuery)} đã tải lên • ${escapeHTML(f.uploadDate)}</div>
        </div>
      </div>
    `).join('');
  }

  // STRICT PRIVACY: PERSONAL FILES SHOWN STRICTLY ONLY TO THEIR UPLOADER OWNER!
  renderPersonalTable() {
    const tbody = document.getElementById('personalFilesTableBody');
    if (!tbody || !window.storageService) return;

    const files = window.storageService.getFiles('personal', this.searchQuery);
    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 35px; color: var(--slate-400); font-weight: 500;">
            🔒 Chưa có tài liệu cá nhân nào. Bấm "Tải lên" để lưu tệp riêng của bạn (Chỉ duy nhất bạn mới nhìn thấy tệp này)!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = files.map(file => {
      const isChecked = this.selectedFileIds && this.selectedFileIds.has(file.id) ? 'checked' : '';
      return `
      <tr>
        <td style="text-align: center;"><input type="checkbox" class="file-select-cb personal-file-cb" data-id="${escapeHTML(file.id)}" ${isChecked}></td>
        <td>
          <div class="file-name-cell">
            <span class="file-type-icon type-${escapeHTML(file.type.toLowerCase())}">${escapeHTML(file.type)}</span>
            <span>${highlightSearchTerm(file.name, this.searchQuery)}</span>
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
    `}).join('');
  }

  renderDeptTable() {
    const tbody = document.getElementById('deptFilesTableBody');
    const tableCard = document.querySelector('#viewDeptDocs .table-card');
    const tableTitle = document.getElementById('deptTableTitle');
    if (!tbody || !window.storageService) return;

    // Table card is ALWAYS visible in Kho KDDVKH view
    if (tableCard) tableCard.style.display = 'block';

    const docTypeVal = document.getElementById('deptDocTypeFilter')?.value || 'all';
    const fileTypeVal = document.getElementById('deptFileTypeFilter')?.value || 'all';

    const files = window.storageService.getFiles('department', this.searchQuery, fileTypeVal, this.currentDeptFolderId, docTypeVal);
    const isAdmin = window.authManager && window.authManager.isAdmin();

    if (tableTitle) {
      if (this.currentDeptFolderId) {
        const folders = window.storageService.getFolders('department');
        const activeFold = folders.find(f => f.id === this.currentDeptFolderId);
        tableTitle.textContent = activeFold ? `Văn bản trong thư mục: ${activeFold.name}` : `Văn bản Phòng Kinh doanh & DVKH`;
      } else {
        tableTitle.textContent = `Tất cả Văn bản & Tài liệu Phòng Kinh doanh & DVKH`;
      }
    }

    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 35px; color: var(--slate-400); font-weight: 500;">
            🏢 Kho KDDVKH chưa có văn bản nào. ${isAdmin ? 'Bấm "+ Thêm tài liệu phòng ban" ở trên để đăng tệp!' : 'Chỉ Admin được phép đăng văn bản cho phòng ban.'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = files.map(file => {
      const isChecked = this.selectedFileIds && this.selectedFileIds.has(file.id) ? 'checked' : '';
      return `
      <tr>
        <td style="text-align: center;"><input type="checkbox" class="file-select-cb dept-file-cb" data-id="${escapeHTML(file.id)}" ${isChecked}></td>
        <td>
          <div class="file-name-cell">
            <span class="file-type-icon type-${escapeHTML(file.type.toLowerCase())}">${escapeHTML(file.type)}</span>
            <span>${highlightSearchTerm(file.name, this.searchQuery)}</span>
          </div>
        </td>
        <td><span class="badge-tag type-docx">${escapeHTML(file.docType || 'Hợp đồng cấp nước')}</span></td>
        <td><span class="badge-tag" style="background: var(--slate-100); color: var(--slate-800);">${escapeHTML(file.statusTag || '🟢 Đã ban hành')}</span></td>
        <td>${escapeHTML(file.sizeFormatted)}</td>
        <td>${highlightSearchTerm(file.uploadedBy, this.searchQuery)}</td>
        <td>${escapeHTML(file.uploadDate)}</td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="table-btn preview-btn" data-id="${escapeHTML(file.id)}">Xem & Tải về</button>
            ${isAdmin ? `<button class="table-btn table-btn-delete delete-btn" data-id="${escapeHTML(file.id)}">Xóa</button>` : `<span style="font-size: 11px; color: var(--slate-500); padding: 4px 10px; background: var(--slate-100); border-radius: 4px; font-weight: 600;">👁️ Quyền xem & Tải về</span>`}
          </div>
        </td>
      </tr>
    `}).join('');
    this.updateBatchToolbar();
  }

  renderDeptFolders() {
    const grid = document.getElementById('deptFoldersGrid');
    const allGrid = document.getElementById('allFoldersListGrid');
    const foldersSection = document.getElementById('deptFoldersSection');
    const breadcrumbFolderPart = document.getElementById('breadcrumbFolderPart');
    const btnBackToRootFolder = document.getElementById('btnBackToRootFolder');
    const deptTitle = document.getElementById('deptTitle');

    if (!grid || !window.storageService) return;

    const folders = window.storageService.getFolders('department');
    const allDeptFiles = window.storageService.getFiles('department');
    const isAdmin = window.authManager && window.authManager.isAdmin();

    if (this.currentDeptFolderId) {
      const activeFold = folders.find(f => f.id === this.currentDeptFolderId);
      if (foldersSection) foldersSection.style.display = 'none';
      if (btnBackToRootFolder) btnBackToRootFolder.style.display = 'flex';
      if (breadcrumbFolderPart && activeFold) {
        breadcrumbFolderPart.innerHTML = ` &gt; <span style="color: var(--slate-800);">${escapeHTML(activeFold.name)}</span>`;
      }
      if (deptTitle && activeFold) {
        deptTitle.textContent = `Thư mục: ${activeFold.name}`;
      }
    } else {
      if (foldersSection) foldersSection.style.display = folders.length > 0 ? 'block' : 'none';
      if (btnBackToRootFolder) btnBackToRootFolder.style.display = 'none';
      if (breadcrumbFolderPart) breadcrumbFolderPart.innerHTML = '';
      if (deptTitle) deptTitle.textContent = 'Kho nội bộ Phòng Kinh doanh & Dịch vụ Khách hàng';
    }

    const html = folders.map(fold => {
      let realFileCount = allDeptFiles.filter(f => f.folderId === fold.id).length;
      if (fold.id === 'fold_kddvkh_1') {
        const unassignedCount = allDeptFiles.filter(f => !f.folderId || f.folderId === 'fold_kddvkh_1').length;
        realFileCount = Math.max(realFileCount, unassignedCount);
      }

      return `
        <div class="folder-card-compact folder-card-item" data-folder-id="${escapeHTML(fold.id)}">
          <div class="folder-header-row">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <i data-lucide="folder" style="color: var(--accent-blue); width: 22px; height: 22px; flex-shrink: 0; margin-top: 2px;"></i>
              <span class="folder-title-text">${escapeHTML(fold.name)}</span>
            </div>
            ${isAdmin ? `<button class="icon-btn folder-opt-btn" data-folder-id="${escapeHTML(fold.id)}" title="Tùy chọn thư mục" style="padding: 2px 6px;">⋮</button>` : ''}
          </div>
          <div class="folder-meta-row">
            <span style="font-weight: 700; color: var(--accent-blue);">📂 ${realFileCount} tệp</span>
            <span>📅 ${escapeHTML(fold.date)}</span>
          </div>
        </div>
      `;
    }).join('');

    grid.innerHTML = html;
    if (allGrid) allGrid.innerHTML = html;
  }

  bindDeptFilterEvents() {
    document.getElementById('deptDocTypeFilter')?.addEventListener('change', () => this.renderDeptTable());
    document.getElementById('deptFileTypeFilter')?.addEventListener('change', () => this.renderDeptTable());

    document.getElementById('btnBackToRootFolder')?.addEventListener('click', () => {
      this.currentDeptFolderId = null;
      this.renderCurrentView();
    });
  }

  renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    const auditTbody = document.getElementById('clientUploadAuditTableBody');
    if (!window.authManager) return;

    const users = window.authManager.getUsersList();

    if (tbody) {
      tbody.innerHTML = users.map(u => `
        <tr>
          <td><strong>${escapeHTML(u.name)}</strong></td>
          <td>${escapeHTML(u.email)}</td>
          <td>${escapeHTML(u.department || 'Phòng Kinh doanh & Dịch vụ Khách hàng')}</td>
          <td><span class="badge-tag ${(u.email === 'waterain8n@gmail.com' || u.email === 'letuananh18@gmail.com') ? 'type-pdf' : 'type-docx'}">${(u.email === 'waterain8n@gmail.com' || u.email === 'letuananh18@gmail.com') ? 'ADMIN' : 'CLIENT'}</span></td>
          <td><span style="font-weight: 600; color: var(--slate-700);">⏱️ ${escapeHTML(u.lastLogin || 'Mới đăng nhập')}</span></td>
        </tr>
      `).join('');
    }

    if (auditTbody && window.storageService) {
      const allFiles = window.storageService.files;
      const clientUploads = allFiles.filter(f => f.category === 'personal');

      if (clientUploads.length === 0) {
        auditTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 25px; color: var(--slate-400);">
              🔒 Chưa có nhật ký tải lên nào từ Client.
            </td>
          </tr>
        `;
      } else {
        auditTbody.innerHTML = clientUploads.map(f => `
          <tr>
            <td><strong>${escapeHTML(f.uploadedBy)}</strong></td>
            <td><span class="badge-tag type-${escapeHTML(f.type.toLowerCase())}">${escapeHTML(f.type)}</span></td>
            <td>${escapeHTML(f.sizeFormatted)}</td>
            <td>${escapeHTML(f.uploadDate)}</td>
            <td><span class="privacy-badge">🔒 Bảo mật riêng tư (Nội dung tệp ẩn đối với Admin)</span></td>
          </tr>
        `).join('');
      }
    }
  }

  bindFolderEvents() {
    const btnCreateFolder = document.getElementById('btnCreateNewFolder');
    const folderModal = document.getElementById('folderActionModal');
    const folderInput = document.getElementById('folderNameInput');
    const folderMeta = document.getElementById('folderMetaInfo');

    btnCreateFolder?.addEventListener('click', async () => {
      const name = prompt("NHẬP TÊN THƯ MỤC MỚI KHU VỰC KDDVKH:");
      if (name && name.trim()) {
        await window.storageService.createFolder(name, 'department');
        alert("✨ Đã tạo thư mục mới thành công!");
      }
    });

    document.addEventListener('click', (e) => {
      const card = e.target.closest('.folder-card-item');
      if (card && !e.target.classList.contains('folder-opt-btn')) {
        const id = card.getAttribute('data-folder-id');
        if (id) {
          this.currentDeptFolderId = id;
          this.renderCurrentView();
        }
      }

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
    document.addEventListener('click', (e) => {
      if (e.target.closest('#closeFolderModalBtn') || e.target.closest('.close-btn')) {
        this.closeModal('folderActionModal');
        this.closeModal('filePreviewModal');
        this.closeModal('uploadMetaModal');
        this.closeModal('batchEditModal');
        this.closeModal('aiDocAnalyzerModal');
      }

      if (e.target.id === 'folderActionModal') this.closeModal('folderActionModal');
      if (e.target.id === 'filePreviewModal') this.closeModal('filePreviewModal');
      if (e.target.id === 'uploadMetaModal') this.closeModal('uploadMetaModal');
      if (e.target.id === 'batchEditModal') this.closeModal('batchEditModal');
      if (e.target.id === 'aiDocAnalyzerModal') this.closeModal('aiDocAnalyzerModal');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal('folderActionModal');
        this.closeModal('filePreviewModal');
        this.closeModal('uploadMetaModal');
        this.closeModal('batchEditModal');
        this.closeModal('aiDocAnalyzerModal');
      }
    });
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  }

  bindFileUploadEvents() {
    const hiddenInput = document.getElementById('hiddenFileInput');
    const selectBtn = document.getElementById('dropzoneSelectBtn');
    const topUploadBtn = document.getElementById('topUploadBtn');
    const dropzone = document.getElementById('dashboardDropzone');
    const adminUploadDeptBtn = document.getElementById('adminUploadDeptBtn');
    const uploadMetaModal = document.getElementById('uploadMetaModal');
    const btnConfirmUploadMeta = document.getElementById('btnConfirmUploadMeta');

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
        alert("⛔ Bị từ chối: Chỉ Ban Quản trị Admin (waterain8n@gmail.com & letuananh18@gmail.com) mới có quyền tải lên Kho nội bộ phòng ban!");
        return;
      }
      const deptFolders = window.storageService ? window.storageService.getFolders('department') : [];
      if (!this.currentDeptFolderId && deptFolders.length > 0) {
        this.currentDeptFolderId = deptFolders[0].id;
      }
      if (hiddenInput) hiddenInput.setAttribute('data-target-cat', 'department');
      hiddenInput?.click();
    });

    dropzone?.addEventListener('click', () => {
      if (hiddenInput) hiddenInput.setAttribute('data-target-cat', getActiveCategory());
      hiddenInput?.click();
    });

    hiddenInput?.addEventListener('change', async (e) => {
      const files = e.target.files;
      const category = hiddenInput.getAttribute('data-target-cat') || getActiveCategory();
      if (files && files.length > 0) {
        if (category === 'department') {
          this.pendingUploadFiles = Array.from(files);
          this.pendingUploadCategory = 'department';
          if (uploadMetaModal) uploadMetaModal.style.display = 'flex';
        } else {
          let successCount = 0;
          for (const f of Array.from(files)) {
            const res = await window.storageService.addFile(f, 'personal', null);
            if (res) successCount++;
          }
          if (successCount > 0) {
            alert(`✅ Đã tải lên ${successCount} tệp thành công vào Kho cá nhân!`);
          }
        }
      }
    });

    btnConfirmUploadMeta?.addEventListener('click', async () => {
      if (this.pendingUploadFiles && this.pendingUploadFiles.length > 0) {
        const btn = btnConfirmUploadMeta;
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<span>⌛ Đang đăng tệp lên Supabase Cloud...</span>`;
        }

        const docType = document.getElementById('modalDocTypeSelect')?.value || 'Hợp đồng cấp nước';
        const statusTag = document.getElementById('modalStatusTagSelect')?.value || '🟢 Đã ban hành';
        
        const deptFolders = window.storageService.getFolders('department');
        const targetFolderId = this.currentDeptFolderId || (deptFolders[0] ? deptFolders[0].id : null);
        const filesToUpload = [...this.pendingUploadFiles];

        // Ensure currentDeptFolderId is set so table is ALWAYS displayed
        if (!this.currentDeptFolderId && targetFolderId) {
          this.currentDeptFolderId = targetFolderId;
        }

        // Close modal immediately so UI is 100% responsive and never looks stuck
        this.closeModal('uploadMetaModal');
        this.pendingUploadFiles = null;

        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }

        let successCount = 0;
        for (const f of filesToUpload) {
          const res = await window.storageService.addFile(f, 'department', targetFolderId, docType, statusTag);
          if (res) successCount++;
        }

        this.renderCurrentView();
        if (successCount > 0) {
          alert(`✅ Đã tải lên ${successCount} tệp PDF/Văn bản thành công vào Kho KDDVKH!`);
        }
      }
    });
  }

  updateBatchToolbar() {
    const toolbar = document.getElementById('deptBatchToolbar');
    const badge = document.getElementById('selectedCountBadge');
    const count = this.selectedFileIds ? this.selectedFileIds.size : 0;

    if (toolbar) {
      if (count > 0) {
        toolbar.style.display = 'flex';
        if (badge) badge.textContent = `${count} tệp đã chọn`;
      } else {
        toolbar.style.display = 'none';
      }
    }
  }

  bindTableActions() {
    // Checkbox multi-select listeners
    document.addEventListener('change', (e) => {
      if (!this.selectedFileIds) this.selectedFileIds = new Set();

      if (e.target.classList.contains('file-select-cb')) {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          this.selectedFileIds.add(id);
        } else {
          this.selectedFileIds.delete(id);
        }
        this.updateBatchToolbar();
      }

      if (e.target.id === 'selectAllDeptCheckbox') {
        const checkboxes = document.querySelectorAll('.dept-file-cb');
        checkboxes.forEach(cb => {
          cb.checked = e.target.checked;
          const id = cb.getAttribute('data-id');
          if (e.target.checked) {
            this.selectedFileIds.add(id);
          } else {
            this.selectedFileIds.delete(id);
          }
        });
        this.updateBatchToolbar();
      }

      if (e.target.id === 'selectAllPersonalCheckbox') {
        const checkboxes = document.querySelectorAll('.personal-file-cb');
        checkboxes.forEach(cb => {
          cb.checked = e.target.checked;
          const id = cb.getAttribute('data-id');
          if (e.target.checked) {
            this.selectedFileIds.add(id);
          } else {
            this.selectedFileIds.delete(id);
          }
        });
        this.updateBatchToolbar();
      }
    });

    document.getElementById('btnCancelBatchSelect')?.addEventListener('click', () => {
      if (this.selectedFileIds) this.selectedFileIds.clear();
      document.querySelectorAll('.file-select-cb, #selectAllDeptCheckbox, #selectAllPersonalCheckbox').forEach(cb => cb.checked = false);
      this.updateBatchToolbar();
    });

    document.getElementById('btnBatchDelete')?.addEventListener('click', async () => {
      const count = this.selectedFileIds ? this.selectedFileIds.size : 0;
      if (count === 0) return;
      if (confirm(`❓ Bạn có chắc chắn muốn XÓA HÀNG LOẠT ${count} tệp tin đã chọn khỏi CSDL Supabase không?`)) {
        await window.storageService.deleteFilesBatch(Array.from(this.selectedFileIds));
        this.selectedFileIds.clear();
        this.updateBatchToolbar();
        this.renderCurrentView();
        alert(`✅ Đã xóa thành công ${count} tệp tin khỏi hệ thống!`);
      }
    });

    document.getElementById('btnBatchEditMeta')?.addEventListener('click', () => {
      const count = this.selectedFileIds ? this.selectedFileIds.size : 0;
      if (count === 0) {
        alert("⚠️ Vui lòng tick chọn ít nhất 1 tệp tin bằng ô checkbox để sửa hàng loạt!");
        return;
      }
      const countTxt = document.getElementById('batchEditCountTxt');
      if (countTxt) countTxt.textContent = `Đang chuẩn bị sửa Phân loại & Trạng thái cho ${count} tệp đã chọn:`;
      const modal = document.getElementById('batchEditModal');
      if (modal) modal.style.display = 'flex';
    });

    document.getElementById('closeBatchEditModalBtn')?.addEventListener('click', () => {
      this.closeModal('batchEditModal');
    });

    document.getElementById('btnConfirmBatchEdit')?.addEventListener('click', async () => {
      const count = this.selectedFileIds ? this.selectedFileIds.size : 0;
      if (count === 0) return;

      const docType = document.getElementById('batchDocTypeSelect')?.value || null;
      const statusTag = document.getElementById('batchStatusTagSelect')?.value || null;

      if (!docType && !statusTag) {
        alert("⚠️ Vui lòng chọn Phân loại mới hoặc Trạng thái mới để cập nhật!");
        return;
      }

      await window.storageService.updateFilesDocTypeBatch(Array.from(this.selectedFileIds), docType, statusTag);
      this.closeModal('batchEditModal');
      this.selectedFileIds.clear();
      this.updateBatchToolbar();
      this.renderCurrentView();
      alert(`✅ Đã cập nhật Phân loại & Trạng thái thành công cho ${count} tệp đã chọn!`);
    });

    // Nút AI Tóm Tắt 3 Giây - Kết nối Module AI Phân tích Độc lập (Không chạm đến Storage/DB)
    document.getElementById('btnAiSummarizeDoc')?.addEventListener('click', async () => {
      if (!this.currentPreviewFileId || !window.storageService || !window.aiAnalyzerModule) return;
      const file = window.storageService.files.find(f => f.id === this.currentPreviewFileId);
      const rawFile = window.storageService.getRawFile(this.currentPreviewFileId);
      const btn = document.getElementById('btnAiSummarizeDoc');

      const modal = document.getElementById('aiDocAnalyzerModal');
      const titleEl = document.getElementById('aiAnalyzerModalTitle');
      const modeEl = document.getElementById('aiAnalyzerStatusMode');
      const bodyEl = document.getElementById('aiAnalyzerResultBody');

      if (file && modal && bodyEl) {
        const originalBtnHtml = btn ? btn.innerHTML : '';
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<span style="font-size: 12px; color: white;">⌛ AI đang đọc file...</span>`;
        }

        if (titleEl) titleEl.textContent = `🤖 Phân tích AI Độc lập: ${file.name}`;
        if (modeEl) modeEl.textContent = `⌛ PDF.js / Gemini Engine đang trích xuất chữ thực tế...`;
        if (bodyEl) bodyEl.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--slate-500);">⌛ Mắt thần AI đang giải mã từng trang tài liệu PDF / Word...</div>`;
        modal.style.display = 'flex';

        const result = await window.aiAnalyzerModule.analyzeDocument(file, rawFile);

        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalBtnHtml;
        }

        if (result) {
          if (modeEl) modeEl.textContent = result.modeText || `⚡ Trích xuất hoàn tất.`;
          if (bodyEl) bodyEl.innerHTML = result.contentHtml;
        }
      }
    });

    // Event listener cho nút Lưu Key ChatGPT ngay bên trong Modal Gateway
    document.addEventListener('click', async (e) => {
      if (e.target.closest('#btnSaveModalGptKey')) {
        const input = document.getElementById('modalGptKeyInput');
        const status = document.getElementById('modalGptKeyStatus');
        if (input && input.value.trim()) {
          const val = input.value.trim();
          if (val.startsWith('sk-')) {
            window.aiAnalyzerModule.setOpenAiKey(val);
            if (status) status.textContent = '✅ Đã lưu OpenAI ChatGPT Key (sk-...)! Đang gửi tệp cho ChatGPT...';
          } else {
            localStorage.setItem('gemini_api_key', val);
            if (status) status.textContent = '✅ Đã lưu Google Gemini Key! Đang gửi tệp xử lý...';
          }
          setTimeout(() => {
            const btn = document.getElementById('btnAiSummarizeDoc');
            if (btn) btn.click();
          }, 600);
        }
      }
    });

    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.preview-btn') || e.target;
      if (btn.classList.contains('delete-btn')) {
        const id = btn.getAttribute('data-id');
        if (confirm("Bạn có chắc chắn muốn xóa tài liệu này không?")) {
          await window.storageService.deleteFile(id);
          this.renderCurrentView();
        }
      }

      if (btn.classList.contains('preview-btn')) {
        const id = btn.getAttribute('data-id');
        const file = window.storageService.files.find(f => f.id === id);
        if (file) {
          this.currentPreviewFileId = id;
          const modalTitle = document.getElementById('previewModalTitle');
          const docViewer = document.getElementById('docViewerContainer');
          const previewMeta = document.getElementById('previewFileMeta');
          const downloadBtn = document.getElementById('previewDownloadBtn');
          const modal = document.getElementById('filePreviewModal');
          
          const rawFile = window.storageService.getRawFile(id);
          let fileSrc = file.dataUrl || file.url;
          if (rawFile && (!fileSrc || fileSrc === "#")) {
            fileSrc = URL.createObjectURL(rawFile);
          }

          if (modalTitle) modalTitle.textContent = `Xem trực tiếp: ${file.name}`;
          if (previewMeta) previewMeta.textContent = `Dung lượng: ${file.sizeFormatted} • Đăng bởi: ${file.uploadedBy}`;

          if (downloadBtn) {
            downloadBtn.href = fileSrc || "#";
            downloadBtn.download = file.name;
            downloadBtn.onclick = () => {
              if (fileSrc && fileSrc !== "#") {
                const tempLink = document.createElement('a');
                tempLink.href = fileSrc;
                tempLink.download = file.name;
                document.body.appendChild(tempLink);
                tempLink.click();
                document.body.removeChild(tempLink);
              }
            };
          }

          const ext = file.type ? file.type.toUpperCase() : file.name.split('.').pop().toUpperCase();
          const isImage = ['JPG', 'PNG', 'JPEG', 'WEBP', 'SVG', 'GIF'].includes(ext) || /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(file.name);
          const isPdf = ext === 'PDF' || /\.pdf$/i.test(file.name);
          const isDocx = ['DOCX', 'DOC'].includes(ext) || /\.(docx|doc)$/i.test(file.name);

          if (modal) modal.style.display = 'flex';

          if (docViewer) {
            if (isImage) {
              const imageSource = (fileSrc && fileSrc !== "#") ? fileSrc : "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=800&auto=format&fit=crop&q=80";
              docViewer.innerHTML = `
                <div style="text-align: center; padding: 10px;">
                  <img src="${imageSource}" alt="${escapeHTML(file.name)}" style="max-width: 100%; max-height: 480px; border-radius: 8px; box-shadow: var(--shadow-md); object-fit: contain;">
                </div>
              `;
            } 
            else if (isPdf && fileSrc && fileSrc !== "#") {
              docViewer.innerHTML = `
                <div style="width: 100%; height: 500px;">
                  <iframe src="${fileSrc}#toolbar=1" width="100%" height="100%" style="border: none; border-radius: 8px;"></iframe>
                </div>
              `;
            } 
            else if (isDocx) {
              docViewer.innerHTML = `
                <div style="text-align: center; padding: 50px 20px; color: var(--accent-blue);">
                  <div style="font-size: 32px; margin-bottom: 12px;">📄</div>
                  <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px;">Đang giải mã và định dạng tài liệu Word (.docx)...</div>
                  <div style="font-size: 12px; color: var(--slate-500);">Vui lòng chờ trong giây lát...</div>
                </div>
              `;

              const renderDocxHtml = (htmlContent) => {
                docViewer.innerHTML = `
                  <div class="doc-reader-paper" style="max-height: 520px; overflow-y: auto; text-align: left; background: white; padding: 30px 40px; border-radius: 8px; border: 1px solid var(--slate-200); box-shadow: var(--shadow-sm);">
                    <div class="doc-reader-header" style="border-bottom: 2px solid var(--slate-200); padding-bottom: 14px; margin-bottom: 20px;">
                      <div style="font-size: 11px; font-weight: 800; color: var(--accent-blue); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">CÔNG TY CỔ PHẦN CẤP NƯỚC THỦ ĐỨC</div>
                      <h3 class="doc-reader-title" style="margin: 4px 0 8px 0; font-size: 18px; color: var(--slate-900); font-weight: 800;">${escapeHTML(file.name)}</h3>
                      <div class="doc-reader-meta" style="font-size: 12px; color: var(--slate-500);">
                        📌 <strong>Phân loại:</strong> ${escapeHTML(file.docType || 'Văn bản Nghiệp vụ KDDVKH')} | 
                        🏷️ <strong>Trạng thái:</strong> ${escapeHTML(file.statusTag || '🟢 Đã ban hành')} | 
                        📅 <strong>Ngày đăng:</strong> ${escapeHTML(file.uploadDate)}
                      </div>
                    </div>
                    <div class="doc-reader-body docx-rendered-content" style="font-size: 14px; line-height: 1.7; color: var(--slate-800);">
                      ${htmlContent}
                    </div>
                  </div>
                `;
              };

              const tryConvertArrayBuffer = async (arrayBuffer) => {
                if (window.mammoth) {
                  try {
                    const result = await window.mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                    if (result && result.value) {
                      renderDocxHtml(result.value);
                      return true;
                    }
                  } catch (mErr) {
                    console.warn("Mammoth conversion notice:", mErr);
                  }
                }
                return false;
              };

              (async () => {
                let success = false;
                if (rawFile) {
                  try {
                    const buffer = await rawFile.arrayBuffer();
                    success = await tryConvertArrayBuffer(buffer);
                  } catch (e) {}
                }

                if (!success && file.dataUrl && file.dataUrl.includes('base64,')) {
                  try {
                    const base64Str = file.dataUrl.split('base64,')[1];
                    const binaryStr = window.atob(base64Str);
                    const len = binaryStr.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                      bytes[i] = binaryStr.charCodeAt(i);
                    }
                    success = await tryConvertArrayBuffer(bytes.buffer);
                  } catch (e) {}
                }

                if (!success && file.url && file.url !== "#") {
                  try {
                    const resp = await fetch(file.url);
                    const buffer = await resp.arrayBuffer();
                    success = await tryConvertArrayBuffer(buffer);
                  } catch (e) {}
                }

                if (!success) {
                  if (file.url && file.url !== "#" && file.url.startsWith("http")) {
                    docViewer.innerHTML = `
                      <div style="width: 100%; height: 520px;">
                        <iframe src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}" width="100%" height="100%" style="border: none; border-radius: 8px;"></iframe>
                      </div>
                    `;
                  } else {
                    renderDocxHtml(`
                      <div style="background: var(--slate-50); padding: 20px; border-left: 4px solid var(--accent-blue); border-radius: 6px;">
                        <p>📄 Tệp Word: <strong>${escapeHTML(file.name)}</strong></p>
                        <p style="font-size: 13px; color: var(--slate-600); margin-top: 8px;">
                          Hệ thống đã lưu trữ và bảo vệ văn bản Word này. Anh hãy bấm nút <strong>"Tải tệp này về máy"</strong> bên dưới để mở file bằng Microsoft Word.
                        </p>
                      </div>
                    `);
                  }
                }
              })();
            }
            else if (['TXT', 'CSV', 'JSON', 'LOG', 'MD', 'HTML', 'JS'].includes(ext) && rawFile) {
              const reader = new FileReader();
              reader.onload = (event) => {
                docViewer.innerHTML = `
                  <pre style="white-space: pre-wrap; font-family: monospace; font-size: 13px; background: white; padding: 20px; border-radius: 8px; border: 1px solid var(--slate-200); max-height: 480px; overflow-y: auto; text-align: left; color: var(--slate-800);">${escapeHTML(event.target.result)}</pre>
                `;
              };
              reader.readAsText(rawFile);
            } 
            else {
              docViewer.innerHTML = `
                <div class="doc-reader-paper">
                  <div class="doc-reader-header">
                    <div style="font-size: 11px; font-weight: 800; color: var(--accent-blue); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">CÔNG TY CỔ PHẦN CẤP NƯỚC THỦ ĐỨC</div>
                    <h3 class="doc-reader-title">${escapeHTML(file.name)}</h3>
                    <div class="doc-reader-meta">
                      📌 <strong>Phân loại:</strong> ${escapeHTML(file.docType || 'Văn bản Nghiệp vụ KDDVKH')} | 
                      🏷️ <strong>Trạng thái:</strong> ${escapeHTML(file.statusTag || '🟢 Đã ban hành')} | 
                      📅 <strong>Ngày đăng:</strong> ${escapeHTML(file.uploadDate)}
                    </div>
                  </div>
                  <div class="doc-reader-body">
                    <p><strong>Nội dung tóm tắt xem trước văn bản:</strong></p>
                    <div style="background: var(--slate-50); padding: 18px; border-left: 4px solid var(--accent-blue); border-radius: 6px; margin: 16px 0; font-size: 13.5px; line-height: 1.6;">
                      • File <strong>${escapeHTML(file.name)}</strong> thuộc định dạng ${escapeHTML(file.type)} lưu trữ chính thức trên hệ thống.<br>
                      • Dữ liệu văn bản gồm các điều khoản hợp đồng dịch vụ, tiêu chuẩn nước sạch và quy trình CSKH.<br>
                      • Hãy bấm nút <strong>"Tải tệp này về máy"</strong> bên dưới để xem bản gốc.
                    </div>
                  </div>
                </div>
              `;
            }
          }

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
    const btnNewChat = document.getElementById('btnNewAiChat');
    const btnClearHistory = document.getElementById('btnClearAiHistory');

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

    btnNewChat?.addEventListener('click', () => {
      if (window.aiAssistant) window.aiAssistant.clearHistory();
    });

    btnClearHistory?.addEventListener('click', () => {
      if (window.aiAssistant) window.aiAssistant.clearHistory();
    });

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('suggested-prompt-pill')) {
        const text = e.target.textContent.replace(/^🔍|^📊|^📋|^📂/, '').trim();
        window.aiAssistant.askQuestion(text);
      }
    });

    // Thread item click listeners
    const threadItems = document.querySelectorAll('#aiThreadList .thread-item');
    threadItems.forEach(item => {
      item.addEventListener('click', () => {
        threadItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const text = item.textContent.trim();
        if (window.aiAssistant) {
          window.aiAssistant.askQuestion(`Tra cứu thông tin về: ${text}`);
        }
      });
    });
  }

  renderAiChat() {
    const area = document.getElementById('aiChatArea');
    if (!area || !window.aiAssistant) return;

    const formatBotChatMarkdownHtml = (rawText) => {
      if (!rawText) return '';

      return rawText
        // Remove raw markdown headings (### Title -> Clean h4 title)
        .replace(/^#{1,6}\s+(.*$)/gim, '<h4 style="font-size: 14.5px; font-weight: 800; color: #0284c7; margin-top: 14px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1.5px solid #e0f2fe; display: flex; align-items: center; gap: 6px;"><span>📄</span> <span>$1</span></h4>')
        // Bold text (**text**)
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a; font-weight: 700;">$1</strong>')
        // Numbered list items (1. **Title**: text)
        .replace(/^\d+\.\s+\*\*(.*?)\*\*(.*)$/gim, '<div style="margin-top: 10px; margin-bottom: 6px; font-size: 13.5px;"><span style="font-weight: 800; color: #0369a1;">▶ $1</span><span style="color: #334155;">$2</span></div>')
        // Bullet list items (- or *)
        .replace(/^[*-]\s+(.*)$/gim, '<div style="font-size: 13.5px; color: #334155; line-height: 1.6; margin-bottom: 4px; padding-left: 10px; border-left: 3px solid #38bdf8;">• $1</div>')
        // Line breaks & paragraphs
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');
    };

    const msgs = window.aiAssistant.getActiveMessages();
    area.innerHTML = msgs.map(m => {
      if (m.role === 'pill') {
        return `<div class="suggested-prompt-pill">${escapeHTML(m.text)}</div>`;
      }

      if (m.role === 'user') {
        return `
          <div class="chat-bubble bubble-user" style="margin-bottom: 16px; margin-left: auto; max-width: 80%; background: #0284c7; color: white; padding: 12px 18px; border-radius: 16px 16px 2px 16px; font-size: 13.5px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);">
            <div>${escapeHTML(m.text)}</div>
          </div>
        `;
      }

      // AI Bot Executive Response Card
      const formattedContent = formatBotChatMarkdownHtml(m.text);

      return `
        <div class="ai-bot-chat-row" style="display: flex; gap: 12px; margin-bottom: 20px; align-items: flex-start;">
          <div class="ai-bot-avatar" style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.25);">
            🤖
          </div>
          <div class="ai-bot-message-card" style="flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px 22px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); max-width: 88%;">
            <div style="font-size: 11.5px; font-weight: 800; color: #0284c7; margin-bottom: 10px; letter-spacing: 0.5px; text-transform: uppercase; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
              <span>🤖 TRỢ LÝ AI THỦ ĐỨC WATER</span>
              <span style="font-weight: 500; color: #94a3b8;">• ${m.timestamp || ''}</span>
            </div>
            <div style="font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-size: 13.5px; color: #1e293b; line-height: 1.7;">
              ${formattedContent}
            </div>
          </div>
        </div>
      `;
    }).join('');

    area.scrollTop = area.scrollHeight;
  }
}

new AppController();
