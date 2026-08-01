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
    this.currentPersonalFolderId = null;
    this.pendingUploadFiles = null;
    this.pendingUploadCategory = 'personal';
    this.currentPreviewFileId = null;
    this.searchQuery = '';
    window.appController = this;
    this.init();
  }

  init() {
    const setup = () => {
      try {
        this.bindAuthEvents();
        this.bindNavigationEvents();
        this.bindFileUploadEvents();
        this.bindTableActions();
        this.bindFolderEvents();
        this.bindPersonalFolderEvents();
        this.bindDeptFilterEvents();
        this.bindGlobalModalEvents();
        this.bindChatEvents();
        this.bindAiEvents();
        this.bindMobileSidebarEvents();
        this.bindSettingsEvents();
        this.bindGlobalSearchEvents();
        this.bindReportEvents();
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
    };

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
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
      const btnPurgeCloudFiles = document.getElementById('btnPurgeCloudFiles');
      const navItemUsers = document.getElementById('navItemUsers');

      if (adminUploadDeptBtn) adminUploadDeptBtn.style.display = isAdmin ? 'flex' : 'none';
      if (btnCreateNewFolder) btnCreateNewFolder.style.display = isAdmin ? 'flex' : 'none';
      if (btnPurgeCloudFiles) btnPurgeCloudFiles.style.display = isAdmin ? 'flex' : 'none';
      if (navItemUsers) navItemUsers.style.display = isAdmin ? 'flex' : 'none';

      if (!isAdmin && this.currentView === 'users') {
        this.switchView('dashboard');
        return;
      }

      // Update Supabase Realtime Online Presence & Custom Channels Sync for chat
      if (window.chatService) {
        window.chatService.updateUserPresence();
        window.chatService.syncCustomChannelsWithCloud();
      }

      this.renderCurrentView();
    }
  }

  bindNavigationEvents() {
    document.addEventListener('click', (e) => {
      const item = e.target.closest('.sidebar-nav .nav-item');
      if (item) {
        const viewName = item.getAttribute('data-view');
        if (viewName) {
          document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          this.switchView(viewName);

          // Close mobile sidebar on nav click
          document.querySelector('.sidebar')?.classList.remove('mobile-open');
          document.getElementById('sidebarOverlay')?.classList.remove('mobile-open');
        }
      }
    });
  }

  switchView(viewName) {
    const isAdmin = window.authManager && window.authManager.isAdmin();
    if (viewName === 'users' && !isAdmin) {
      alert("⛔ QUYỀN HẠN TỪ CHỐI: Chỉ Ban Quản trị Admin mới có quyền xem và sử dụng mục Người dùng & Giám sát!");
      viewName = 'dashboard';
    }

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
      'reports': 'viewReports',
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
    this.renderPersonalDocs();
    this.renderDeptTable();
    this.renderDeptFolders();
    this.renderReports();
    this.renderUsersTable();
    this.renderTeamChat();
    this.renderAiChat();
    this.refreshLucideIcons();
  }

  renderDashboardStats() {
    if (!window.storageService) return;
    const stats = window.storageService.getStorageStats();
    const deptFiles = window.storageService.getFiles('department');
    
    const elTotal = document.getElementById('statTotalFiles');
    if (elTotal) elTotal.textContent = stats.totalFiles.toLocaleString();

    const elDeptCount = document.getElementById('dashDeptDocCount');
    if (elDeptCount) elDeptCount.textContent = deptFiles.length.toString();

    const elUsed = document.getElementById('dashUsedStorageVal');
    if (elUsed) {
      elUsed.innerHTML = `${escapeHTML(stats.usedFormatted || '0.0 MB')} <span style="font-size: 13px; font-weight: 500; color: var(--slate-400);">/ 500 GB</span>`;
    }

    const elProgress = document.getElementById('dashStorageProgressFill');
    if (elProgress) {
      elProgress.style.width = `${stats.percentage || 0.1}%`;
    }

    const elProgressSub = document.getElementById('dashStoragePercentText');
    if (elProgressSub) {
      elProgressSub.textContent = `${stats.percentage || 0.1}% đã sử dụng`;
    }

    const elShared = document.querySelector('.stat-card:nth-child(3) .stat-value');
    if (elShared) {
      elShared.textContent = deptFiles.length.toString();
    }

    // Populate Dashboard Pro Analytics Card Progress Bars
    const categories = ['Hợp đồng cấp nước', 'Biểu giá dịch vụ', 'Quy trình CSKH', 'Văn bản chỉ đạo', 'Biên bản sự cố'];
    const totalDeptCount = deptFiles.length;
    const catListEl = document.getElementById('dashCategoriesProgressList');

    if (catListEl) {
      catListEl.innerHTML = categories.map(cat => {
        const count = deptFiles.filter(f => (f.docType || 'Hợp đồng cấp nước') === cat).length;
        const pct = totalDeptCount > 0 ? Math.round((count / totalDeptCount) * 100) : 0;
        return `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">
              <span>${cat}</span>
              <span style="color: #0284c7;"><strong>${count} tệp</strong> (${pct}%)</span>
            </div>
            <div style="background: #f1f5f9; border-radius: 6px; height: 7px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #0284c7 0%, #38bdf8 100%); width: ${pct}%; height: 100%; border-radius: 6px; transition: width 0.4s ease;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Quick Action Pill Buttons
    document.getElementById('btnDashGotoDept')?.addEventListener('click', () => this.switchView('dept-docs'));
    document.getElementById('btnDashGotoReports')?.addEventListener('click', () => this.switchView('reports'));
    document.getElementById('btnDashGotoAi')?.addEventListener('click', () => this.switchView('ai-assistant'));
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
            <i data-lucide="folder-open" style="width: 22px; height: 22px; display: block; margin: 0 auto 8px auto; color: #94a3b8;"></i>
            <span>Kho Kinh doanh & DVKH chưa có văn bản khớp với tìm kiếm.</span>
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

  bindPersonalFolderEvents() {
    document.getElementById('btnCreatePersonalFolder')?.addEventListener('click', async () => {
      const folderName = prompt("Vui lòng nhập tên Thư mục cá nhân mới:");
      if (folderName && folderName.trim()) {
        if (window.storageService) {
          await window.storageService.createFolder(folderName.trim(), 'personal', this.currentPersonalFolderId);
          this.renderPersonalDocs();
        }
      }
    });

    document.getElementById('btnBackPersonalRootFolder')?.addEventListener('click', () => {
      this.currentPersonalFolderId = null;
      this.renderPersonalDocs();
    });

    document.getElementById('btnUploadPersonalDocBtn')?.addEventListener('click', () => {
      this.pendingUploadCategory = 'personal';
      const fileInput = this.getOrCreateFileInput();
      fileInput.value = '';
      fileInput.setAttribute('data-target-cat', 'personal');
      fileInput.click();
    });

    document.getElementById('personalTypeFilter')?.addEventListener('change', () => {
      this.renderPersonalDocs();
    });
  }

  renderPersonalFolders() {
    const grid = document.getElementById('personalFoldersGrid');
    const foldersSection = document.getElementById('personalFoldersSection');
    const breadcrumbFolderPart = document.getElementById('personalBreadcrumbFolderPart');
    const btnBackPersonalRootFolder = document.getElementById('btnBackPersonalRootFolder');

    if (!grid || !window.storageService) return;

    const folders = window.storageService.getFolders('personal');

    if (this.currentPersonalFolderId) {
      const activeFold = folders.find(f => f.id === this.currentPersonalFolderId);
      if (foldersSection) foldersSection.style.display = 'none';
      if (btnBackPersonalRootFolder) btnBackPersonalRootFolder.style.display = 'flex';
      if (breadcrumbFolderPart && activeFold) {
        breadcrumbFolderPart.innerHTML = ` &gt; <span style="color: var(--slate-800);">${escapeHTML(activeFold.name)}</span>`;
      }
    } else {
      if (foldersSection) foldersSection.style.display = folders.length > 0 ? 'block' : 'none';
      if (btnBackPersonalRootFolder) btnBackPersonalRootFolder.style.display = 'none';
      if (breadcrumbFolderPart) breadcrumbFolderPart.innerHTML = '';

      if (folders.length === 0) {
        grid.innerHTML = `<div style="font-size: 13px; color: var(--slate-400); padding: 10px;">Chưa có thư mục cá nhân nào. Hãy bấm "+ Tạo thư mục mới" ở trên để phân loại tệp riêng của bạn!</div>`;
      } else {
        grid.innerHTML = folders.map(f => {
          const filesInFold = window.storageService.getFiles('personal', '', 'all', f.id);
          return `
            <div class="folder-card-compact personal-folder-card" data-id="${escapeHTML(f.id)}">
              <div class="folder-icon-compact">
                <i data-lucide="folder"></i>
              </div>
              <div class="folder-info-compact" style="flex: 1;">
                <div class="folder-name-compact">${escapeHTML(f.name.replace(/^📁\s*/, ''))}</div>
                <div class="folder-meta-compact">${filesInFold.length} tệp cá nhân</div>
              </div>
              <div style="display: flex; gap: 4px;" onclick="event.stopPropagation();">
                <button class="icon-btn btn-rename-personal-folder" data-id="${escapeHTML(f.id)}" title="Đổi tên thư mục" style="width: 28px; height: 28px;">
                  <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                </button>
                <button class="icon-btn btn-delete-personal-folder" data-id="${escapeHTML(f.id)}" title="Xóa thư mục" style="width: 28px; height: 28px; color: #ef4444;">
                  <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');

        this.bindPersonalFolderGridEvents();
      }
    }
  }

  bindPersonalFolderGridEvents() {
    const cards = document.querySelectorAll('.personal-folder-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const foldId = card.getAttribute('data-id');
        if (foldId) {
          this.currentPersonalFolderId = foldId;
          this.renderPersonalDocs();
        }
      });
    });

    const renameBtns = document.querySelectorAll('.btn-rename-personal-folder');
    renameBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const foldId = btn.getAttribute('data-id');
        const folders = window.storageService ? window.storageService.getFolders('personal') : [];
        const fold = folders.find(f => f.id === foldId);
        if (fold) {
          const newName = prompt("Vui lòng nhập tên mới cho Thư mục cá nhân:", fold.name.replace(/^📁\s*/, ''));
          if (newName && newName.trim()) {
            await window.storageService.renameFolder(foldId, newName.trim());
            this.renderPersonalDocs();
          }
        }
      });
    });

    const deleteBtns = document.querySelectorAll('.btn-delete-personal-folder');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const foldId = btn.getAttribute('data-id');
        if (confirm("⚠️ Bạn có chắc chắn muốn xóa Thư mục cá nhân này không?")) {
          await window.storageService.deleteFolder(foldId);
          if (this.currentPersonalFolderId === foldId) {
            this.currentPersonalFolderId = null;
          }
          this.renderPersonalDocs();
        }
      });
    });
  }

  // STRICT PRIVACY: PERSONAL FILES SHOWN STRICTLY ONLY TO THEIR UPLOADER OWNER!
  renderPersonalTable() {
    const tbody = document.getElementById('personalFilesTableBody');
    if (!tbody || !window.storageService) return;

    const fileTypeVal = document.getElementById('personalTypeFilter')?.value || 'all';
    const files = window.storageService.getFiles('personal', this.searchQuery, fileTypeVal, this.currentPersonalFolderId);

    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 35px; color: var(--slate-400); font-weight: 500;">
            🔒 Chưa có tài liệu cá nhân nào trong thư mục này. Bấm "Tải tệp cá nhân" để lưu tệp riêng của bạn!
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
            <button class="table-btn ai-analyze-btn" data-id="${escapeHTML(file.id)}" style="background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd;">🤖 Phân tích AI</button>
            <button class="table-btn table-btn-delete delete-btn" data-id="${escapeHTML(file.id)}">Xóa</button>
          </div>
        </td>
      </tr>
    `}).join('');
  }

  renderPersonalDocs() {
    this.renderPersonalFolders();
    this.renderPersonalTable();
    this.refreshLucideIcons();
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

      const cleanFoldName = fold.name.replace(/^📁\s*/, '');
      return `
        <div class="folder-card-compact folder-card-item" data-folder-id="${escapeHTML(fold.id)}">
          <div class="folder-header-row">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <i data-lucide="folder" style="color: #2563eb; width: 22px; height: 22px; flex-shrink: 0; margin-top: 2px;"></i>
              <span class="folder-title-text">${escapeHTML(cleanFoldName)}</span>
            </div>
            ${isAdmin ? `<button class="icon-btn folder-opt-btn" data-folder-id="${escapeHTML(fold.id)}" title="Tùy chọn thư mục" style="padding: 2px 6px;">⋮</button>` : ''}
          </div>
          <div class="folder-meta-row">
            <span style="font-weight: 700; color: #2563eb; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="files" style="width: 14px; height: 14px;"></i> ${realFileCount} tệp</span>
            <span style="display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="calendar" style="width: 14px; height: 14px; color: #64748b;"></i> ${escapeHTML(fold.date)}</span>
          </div>
        </div>
      `;
    }).join('');

    grid.innerHTML = html;
    if (allGrid) allGrid.innerHTML = html;
    this.refreshLucideIcons();
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
    const btnCreateUserModal = document.getElementById('btnCreateUserModal');
    if (!window.authManager) return;

    const isAdmin = window.authManager.isAdmin();
    if (btnCreateUserModal) {
      btnCreateUserModal.style.display = isAdmin ? 'inline-block' : 'none';
    }

    const users = window.authManager.getUsersList();

    if (tbody) {
      tbody.innerHTML = users.map(u => {
        const lastTime = u.lastLogin || u.last_login || 'Vừa truy cập';
        const isOnline = window.chatService ? window.chatService.isUserOnline(u.email) : false;
        const uStatus = u.status || 'approved';
        const isMasterAdmin = u.email.toLowerCase().trim() === 'letuananh18@gmail.com';

        const statusBadge = isOnline ? `
          <span style="display: inline-flex; align-items: center; gap: 5px; background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981;"></span> Trực tuyến
          </span>
        ` : `
          <span style="display: inline-flex; align-items: center; gap: 5px; background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">
            ⚪ Ngoại tuyến
          </span>
        `;

        let accountStatusTag = '';
        if (uStatus === 'blocked') {
          accountStatusTag = `<span class="badge-tag" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-weight: 800;">⛔ Đã Khóa</span>`;
        } else {
          accountStatusTag = `<span class="badge-tag" style="background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; font-weight: 700;">🟢 Hoạt động</span>`;
        }

        let adminActionsHtml = '<span style="color: var(--slate-400); font-size: 12px; font-style: italic;">Master Admin</span>';
        if (isAdmin && !isMasterAdmin) {
          const toggleBlockBtn = uStatus === 'blocked' ? 
            `<button class="table-btn btn-unblock-user" data-email="${escapeHTML(u.email)}" style="padding: 4px 10px; font-size: 11px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">🔓 Mở Khóa</button>` : 
            `<button class="table-btn btn-block-user" data-email="${escapeHTML(u.email)}" style="padding: 4px 10px; font-size: 11px; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">⛔ Khóa</button>`;
          
          const deleteBtn = `<button class="table-btn table-btn-delete btn-delete-user" data-email="${escapeHTML(u.email)}" style="padding: 4px 10px; font-size: 11px; border-radius: 6px; font-weight: 700; cursor: pointer;">🗑️ Xóa</button>`;

          adminActionsHtml = `
            <div style="display: flex; gap: 6px; justify-content: center;">
              ${toggleBlockBtn}
              ${deleteBtn}
            </div>
          `;
        }

        return `
          <tr>
            <td><strong>${escapeHTML(u.name)}</strong></td>
            <td>${escapeHTML(u.email)}</td>
            <td>${escapeHTML(u.department || 'Phòng Kinh doanh & Dịch vụ Khách hàng')}</td>
            <td>
              <div style="display: flex; gap: 6px; align-items: center;">
                <span class="badge-tag ${isMasterAdmin ? 'type-pdf' : 'type-docx'}">${isMasterAdmin ? 'ADMIN' : 'CLIENT'}</span>
                ${accountStatusTag}
              </div>
            </td>
            <td>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <span style="font-weight: 600; color: var(--slate-700); font-size: 12.5px;">⏱️ ${escapeHTML(lastTime)}</span>
                ${statusBadge}
              </div>
            </td>
            <td style="text-align: center;">${adminActionsHtml}</td>
          </tr>
        `;
      }).join('');
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

    const btnPurgeCloudFiles = document.getElementById('btnPurgeCloudFiles');
    btnPurgeCloudFiles?.addEventListener('click', async () => {
      if (confirm("⚠️ ANH CÓ CHẮC CHẮN MUỐN DỌN DẸP SẠCH DỮ LIỆU TỆP DƯ THỪA TRÊN SUPABASE CLOUD KHÔNG?\n\nThao tác này sẽ dọn dẹp toàn bộ dữ liệu tệp tin cũ trên Supabase PostgreSQL để CSDL sạch sẽ 100% đồng bộ với giao diện hiện tại!")) {
        await window.storageService.purgeAllSupabaseCloudFiles();
        this.renderCurrentView();
        alert("✨ Đã dọn dẹp dứt điểm toàn bộ dữ liệu tệp cũ trên CSDL Supabase Cloud thành công!");
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

  getOrCreateFileInput() {
    let input = document.getElementById('hiddenFileInput');
    if (!input) {
      input = document.createElement('input');
      input.type = 'file';
      input.id = 'hiddenFileInput';
      input.style.display = 'none';
      input.multiple = true;
      document.body.appendChild(input);
    }
    return input;
  }

  bindFileUploadEvents() {
    const uploadMetaModal = document.getElementById('uploadMetaModal');
    const btnConfirmUploadMeta = document.getElementById('btnConfirmUploadMeta');

    const getActiveCategory = () => {
      if (this.currentView === 'dept-docs') return 'department';
      return 'personal';
    };

    document.addEventListener('click', (e) => {
      const adminBtn = e.target.closest('#adminUploadDeptBtn');
      if (adminBtn) {
        if (!window.authManager || !window.authManager.isAdmin()) {
          alert("⛔ Bị từ chối: Chỉ Ban Quản trị Admin (waterain8n@gmail.com & letuananh18@gmail.com) mới có quyền tải lên Kho nội bộ phòng ban!");
          return;
        }
        const fileInput = this.getOrCreateFileInput();
        fileInput.value = '';
        fileInput.setAttribute('data-target-cat', 'department');
        fileInput.click();
        return;
      }

      const topBtn = e.target.closest('#topUploadBtn');
      if (topBtn) {
        const fileInput = this.getOrCreateFileInput();
        fileInput.value = '';
        fileInput.setAttribute('data-target-cat', getActiveCategory());
        fileInput.click();
        return;
      }

      const dropBtn = e.target.closest('#dropzoneSelectBtn') || e.target.closest('#dashboardDropzone');
      if (dropBtn) {
        const fileInput = this.getOrCreateFileInput();
        fileInput.value = '';
        fileInput.setAttribute('data-target-cat', getActiveCategory());
        fileInput.click();
        return;
      }
    });

    document.addEventListener('change', async (e) => {
      if (e.target && e.target.id === 'hiddenFileInput') {
        const files = e.target.files;
        const category = e.target.getAttribute('data-target-cat') || getActiveCategory();
        if (files && files.length > 0) {
          if (category === 'department') {
            this.pendingUploadFiles = Array.from(files);
            this.pendingUploadCategory = 'department';
            if (uploadMetaModal) uploadMetaModal.style.display = 'flex';
          } else {
            let successCount = 0;
            for (const f of Array.from(files)) {
              const res = await window.storageService.uploadFile(f, 'personal', this.currentPersonalFolderId);
              if (res) successCount++;
            }
            if (successCount > 0) {
              this.renderCurrentView();
              alert(`✅ Đã tải lên ${successCount} tệp thành công vào Kho cá nhân!`);
            }
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

        if (!this.currentDeptFolderId && targetFolderId) {
          this.currentDeptFolderId = targetFolderId;
        }

        this.closeModal('uploadMetaModal');
        this.pendingUploadFiles = null;

        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }

        let successCount = 0;
        for (const f of filesToUpload) {
          const res = await window.storageService.uploadFile(f, 'department', targetFolderId, docType, statusTag);
          if (res) successCount++;
        }

        this.renderCurrentView();
        if (successCount > 0) {
          alert(`✅ Đã tải lên ${successCount} tệp PDF/Văn bản thành công vào Thư mục!`);
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

    // Event listener for User Management Admin Action Buttons (Approve, Block, Unblock, Delete)
    document.addEventListener('click', async (e) => {
      const approveBtn = e.target.closest('.btn-approve-user');
      const blockBtn = e.target.closest('.btn-block-user');
      const unblockBtn = e.target.closest('.btn-unblock-user');
      const deleteUserBtn = e.target.closest('.btn-delete-user');

      if (approveBtn) {
        const email = approveBtn.getAttribute('data-email');
        if (email && window.authManager) {
          await window.authManager.approveUser(email);
          this.renderUsersTable();
          alert(`✅ Đã phê duyệt cấp quyền truy cập thành công cho cán bộ ${email}!`);
        }
      }

      if (blockBtn) {
        const email = blockBtn.getAttribute('data-email');
        if (email && confirm(`⚠️ XÁC NHẬN KHÓA: Bạn có chắc chắn muốn TẠM KHÓA QUYỀN TRUY CẬP của ${email} không?`)) {
          if (window.authManager) {
            await window.authManager.blockUser(email);
            this.renderUsersTable();
            alert(`⛔ Đã tạm khóa quyền truy cập của ${email}!`);
          }
        }
      }

      if (unblockBtn) {
        const email = unblockBtn.getAttribute('data-email');
        if (email && window.authManager) {
          await window.authManager.approveUser(email);
          this.renderUsersTable();
          alert(`🔓 Đã khôi phục mở khóa truy cập cho ${email}!`);
        }
      }

      if (deleteUserBtn) {
        const email = deleteUserBtn.getAttribute('data-email');
        if (email && confirm(`⚠️ XÁC NHẬN XÓA TÀI KHOẢN: Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản ${email} khỏi hệ thống không?`)) {
          if (window.authManager) {
            await window.authManager.deleteUserAccount(email);
            this.renderUsersTable();
            alert(`🗑️ Đã xóa tài khoản ${email} thành công!`);
          }
        }
      }
    });

    // Create User Modal Listeners
    const btnCreateUserModal = document.getElementById('btnCreateUserModal');
    const createUserModal = document.getElementById('createUserModal');
    const btnCloseCreateUser = document.getElementById('closeCreateUserModalBtn');
    const btnCancelCreateUser = document.getElementById('btnCancelCreateUser');
    const btnConfirmCreateUser = document.getElementById('btnConfirmCreateUser');

    btnCreateUserModal?.addEventListener('click', () => {
      if (createUserModal) createUserModal.style.display = 'flex';
    });

    const closeCreateUserModalFunc = () => {
      if (createUserModal) createUserModal.style.display = 'none';
    };

    btnCloseCreateUser?.addEventListener('click', closeCreateUserModalFunc);
    btnCancelCreateUser?.addEventListener('click', closeCreateUserModalFunc);

    btnConfirmCreateUser?.addEventListener('click', async () => {
      const nameInput = document.getElementById('newUserNameInput');
      const emailInput = document.getElementById('newUserEmailInput');
      const deptInput = document.getElementById('newUserDeptInput');
      const roleSelect = document.getElementById('newUserRoleSelect');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const dept = deptInput ? deptInput.value.trim() : '';
      const role = roleSelect ? roleSelect.value : 'Cán bộ P.KDDVKH';

      if (!name || !email) {
        alert("⚠️ Vui lòng nhập đầy đủ Họ tên và Email cán bộ!");
        return;
      }

      if (window.authManager) {
        await window.authManager.createUserAccount(name, email, role, dept);
        closeCreateUserModalFunc();
        this.renderUsersTable();
        alert(`🎉 Đã tạo thành công tài khoản cho cán bộ ${name} (${email})!`);
      }
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
    const btnAttach = document.getElementById('btnAttachTeamChat');
    const fileInput = document.getElementById('teamChatAttachmentInput');
    const previewBox = document.getElementById('teamChatAttachmentPreview');
    const previewName = document.getElementById('teamChatAttachmentName');
    const btnRemoveAttach = document.getElementById('btnRemoveTeamChatAttachment');
    const btnClearChannel = document.getElementById('btnClearTeamChat');

    const btnCreateChan = document.getElementById('btnCreateNewChannel');
    const createModal = document.getElementById('createChannelModal');
    const btnCloseModal = document.getElementById('closeCreateChannelModalBtn');
    const btnConfirmCreate = document.getElementById('btnConfirmCreateChannel');
    const membersListEl = document.getElementById('newChannelMembersList');

    btnCreateChan?.addEventListener('click', () => {
      if (!window.authManager || !window.authManager.isAdmin()) {
        alert("⛔ Bị từ chối: Chỉ Ban Quản trị Admin (waterain8n@gmail.com & letuananh18@gmail.com) mới có quyền khởi tạo Kênh nhóm làm việc mới!");
        return;
      }
      if (!createModal) return;
      
      // Populate member checkboxes
      const realUsers = window.chatService ? window.chatService.getRealDirectUsers() : [];
      if (membersListEl) {
        membersListEl.innerHTML = realUsers.map(u => `
          <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; cursor: pointer;">
            <input type="checkbox" class="channel-member-checkbox" value="${escapeHTML(u.email || u.id)}">
            <span>👤 <strong>${escapeHTML(u.name)}</strong> (${escapeHTML(u.email)})</span>
          </label>
        `).join('');
      }

      createModal.style.display = 'flex';
    });

    const btnCancelModal = document.getElementById('btnCancelCreateChannel');

    const closeModalFunc = () => {
      if (createModal) createModal.style.display = 'none';
    };

    btnCloseModal?.addEventListener('click', closeModalFunc);
    btnCancelModal?.addEventListener('click', closeModalFunc);

    createModal?.addEventListener('click', (e) => {
      if (e.target === createModal) closeModalFunc();
    });

    btnConfirmCreate?.addEventListener('click', () => {
      const nameInput = document.getElementById('newChannelName');
      const descInput = document.getElementById('newChannelDesc');
      const name = nameInput ? nameInput.value.trim() : '';
      const desc = descInput ? descInput.value.trim() : '';

      if (!name) {
        alert("⚠️ Vui lòng nhập Tên kênh nhóm!");
        return;
      }

      const selectedEmails = [];
      document.querySelectorAll('.channel-member-checkbox:checked').forEach(cb => {
        selectedEmails.push(cb.value);
      });

      if (window.chatService) {
        window.chatService.createCustomChannel(name, desc, selectedEmails);
      }

      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
      if (createModal) createModal.style.display = 'none';

      this.renderTeamChat();
    });

    const handleSend = () => {
      if (chatInput && (chatInput.value.trim() || this.pendingChatAttachment)) {
        window.chatService.sendMessage(chatInput.value, this.pendingChatAttachment);
        chatInput.value = '';
        this.pendingChatAttachment = null;
        if (fileInput) fileInput.value = '';
        if (previewBox) previewBox.style.display = 'none';
      }
    };

    btnSend?.addEventListener('click', handleSend);
    chatInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    btnAttach?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        let formattedSize = (file.size / 1024).toFixed(1) + ' KB';
        if (file.size > 1024 * 1024) formattedSize = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
        
        this.pendingChatAttachment = {
          name: file.name,
          size: formattedSize,
          type: file.name.split('.').pop().toUpperCase()
        };

        if (previewName) previewName.textContent = `📎 Đính kèm tệp: ${file.name} (${formattedSize})`;
        if (previewBox) previewBox.style.display = 'flex';
      }
    });

    btnRemoveAttach?.addEventListener('click', () => {
      this.pendingChatAttachment = null;
      if (fileInput) fileInput.value = '';
      if (previewBox) previewBox.style.display = 'none';
    });

    btnClearChannel?.addEventListener('click', () => {
      if (confirm("❓ Bạn có chắc chắn muốn xóa tất cả tin nhắn trong kênh này không?")) {
        if (window.chatService) window.chatService.clearChannelMessages();
      }
    });

    // Mobile Back Buttons
    document.getElementById('btnMobileBackToChannels')?.addEventListener('click', () => {
      document.querySelector('.team-chat-container')?.classList.remove('mobile-show-chat');
    });

    document.getElementById('btnMobileBackToAiThreads')?.addEventListener('click', () => {
      document.querySelector('.ai-assistant-container')?.classList.remove('mobile-show-chat');
    });

    // Floating Scroll-to-Bottom Button Handlers
    const teamMsgList = document.getElementById('teamChatMessageList');
    const teamScrollBtn = document.getElementById('btnScrollToBottomTeam');
    teamMsgList?.addEventListener('scroll', () => {
      const distFromBottom = teamMsgList.scrollHeight - teamMsgList.scrollTop - teamMsgList.clientHeight;
      if (distFromBottom > 120) {
        if (teamScrollBtn) teamScrollBtn.style.display = 'flex';
      } else {
        if (teamScrollBtn) teamScrollBtn.style.display = 'none';
      }
    });

    teamScrollBtn?.addEventListener('click', () => {
      teamMsgList?.scrollTo({ top: teamMsgList.scrollHeight, behavior: 'smooth' });
      if (teamScrollBtn) teamScrollBtn.style.display = 'none';
    });

    const aiMsgList = document.getElementById('aiChatArea');
    const aiScrollBtn = document.getElementById('btnScrollToBottomAi');
    aiMsgList?.addEventListener('scroll', () => {
      const distFromBottom = aiMsgList.scrollHeight - aiMsgList.scrollTop - aiMsgList.clientHeight;
      if (distFromBottom > 120) {
        if (aiScrollBtn) aiScrollBtn.style.display = 'flex';
      } else {
        if (aiScrollBtn) aiScrollBtn.style.display = 'none';
      }
    });

    aiScrollBtn?.addEventListener('click', () => {
      aiMsgList?.scrollTo({ top: aiMsgList.scrollHeight, behavior: 'smooth' });
      if (aiScrollBtn) aiScrollBtn.style.display = 'none';
    });

    // Event delegation for Admin Channel Options ⋮ Button
    document.addEventListener('click', (e) => {
      const optBtn = e.target.closest('.channel-opt-btn');
      if (optBtn) {
        e.stopPropagation();
        const chanId = optBtn.getAttribute('data-channel-id');
        const chan = window.chatService ? window.chatService.getChannels().find(c => c.id === chanId) : null;
        if (chan) {
          this.selectedManageChanId = chanId;
          const modal = document.getElementById('channelActionModal');
          const titleEl = document.getElementById('chanModalHeaderTitle');
          const infoBox = document.getElementById('chanModalInfoBox');
          const nameInput = document.getElementById('editChanNameInput');
          const descInput = document.getElementById('editChanDescInput');

          if (titleEl) titleEl.textContent = `⚙️ Quản Lý Kênh: ${chan.name}`;
          if (nameInput) nameInput.value = chan.name.replace(/^[👥💬📝⚠️💰]\s*#\s*/, '');
          if (descInput) descInput.value = chan.desc || '';

          const msgsCount = (window.chatService.messages[chanId] || []).length;
          const membersListText = (chan.members && chan.members.length > 0) ? chan.members.join(', ') : 'Tất cả cán bộ phòng';

          if (infoBox) {
            infoBox.innerHTML = `
              📌 <strong>Tên kênh gốc:</strong> ${escapeHTML(chan.name)}<br>
              💬 <strong>Tổng tin nhắn:</strong> ${msgsCount} lượt thảo luận<br>
              👥 <strong>Thành viên tham gia:</strong> ${escapeHTML(membersListText)}
            `;
          }

          if (modal) modal.style.display = 'flex';
        }
      }
    });

    document.getElementById('closeChanActionModalBtn')?.addEventListener('click', () => {
      this.closeModal('channelActionModal');
    });
    document.getElementById('btnCancelChanModal')?.addEventListener('click', () => {
      this.closeModal('channelActionModal');
    });

    document.getElementById('btnSaveChanModal')?.addEventListener('click', async () => {
      if (this.selectedManageChanId) {
        const nameInput = document.getElementById('editChanNameInput');
        const descInput = document.getElementById('editChanDescInput');
        if (nameInput && nameInput.value.trim()) {
          await window.chatService.renameChannel(this.selectedManageChanId, nameInput.value, descInput ? descInput.value : '');
          this.closeModal('channelActionModal');
          this.renderTeamChat();
          alert("✅ Đã cập nhật Tên & Mô tả Kênh nhóm thành công!");
        }
      }
    });

    document.getElementById('btnDeleteChannelModal')?.addEventListener('click', async () => {
      if (this.selectedManageChanId && confirm("⚠️ XÁC NHẬN XÓA: Bạn có chắc chắn muốn XÓA VĨNH VIỄN Kênh nhóm này khỏi hệ thống không?")) {
        await window.chatService.deleteChannel(this.selectedManageChanId);
        this.closeModal('channelActionModal');
        this.renderTeamChat();
        alert("🗑️ Đã xóa Kênh nhóm thành công!");
      }
    });
  }

  renderTeamChatSidebar() {
    const chansContainer = document.getElementById('teamChatChannelsList');
    const dmContainer = document.getElementById('teamChatDirectUsersList');
    const btnCreateChan = document.getElementById('btnCreateNewChannel');
    if (!window.chatService) return;

    // Show + Tạo Kênh button ONLY to Admin users
    const isAdmin = window.authManager && window.authManager.isAdmin();
    if (btnCreateChan) {
      btnCreateChan.style.display = isAdmin ? 'inline-block' : 'none';
    }

    // 1. Render channels (system + custom) with Unread Badges & Admin ⋮ Options
    const channels = window.chatService.getChannels();
    if (chansContainer) {
      chansContainer.innerHTML = channels.map(c => {
        const unread = window.chatService.getUnreadCount(c.id);
        const unreadBadgeHtml = unread > 0 ? `<span class="unread-pill">${unread}</span>` : '';
        const isCustom = c.type === 'custom_channel' || c.id.startsWith('chan_custom_');
        const optBtnHtml = (isAdmin && isCustom) ? `
          <button class="channel-opt-btn" data-channel-id="${escapeHTML(c.id)}" title="Quản lý kênh" style="padding: 0 4px; font-size: 14px; font-weight: 800; color: var(--slate-400); background: transparent; border: none; cursor: pointer; border-radius: 4px;">⋮</button>
        ` : '';

        return `
          <div class="thread-item ${window.chatService.activeTargetId === c.id ? 'active' : ''}" data-target="${escapeHTML(c.id)}" style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <span>${escapeHTML(c.name)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
              ${unreadBadgeHtml}
              ${optBtnHtml}
            </div>
          </div>
        `;
      }).join('');
    }

    // 2. Render direct 1:1 user accounts with Dynamic Glowing Online / Offline Badges
    const realUsers = window.chatService.getRealDirectUsers();
    if (dmContainer) {
      if (realUsers.length === 0) {
        dmContainer.innerHTML = `
          <div style="font-size: 11.5px; color: var(--slate-400); padding: 8px 10px; text-align: center; font-style: italic;">
            ⚪ Chưa có cán bộ nào khác trong danh sách
          </div>
        `;
      } else {
        dmContainer.innerHTML = realUsers.map(u => {
          const unread = window.chatService.getUnreadCount(u.id);
          const hasUnread = unread > 0;
          const unreadDotHtml = hasUnread ? `
            <span class="unread-red-dot" title="Có ${unread} tin nhắn mới chưa đọc"></span>
          ` : '';
          const isOnline = u.isOnline;

          const statusHtml = isOnline ? `
            <span style="font-size: 10px; color: #10b981; font-weight: 700; display: flex; align-items: center; gap: 4px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; display: inline-block;"></span>
              Trực tuyến
            </span>
          ` : `
            <span style="font-size: 10px; color: #94a3b8; font-weight: 500;">⚪ Ngoại tuyến</span>
          `;

          return `
            <div class="thread-item ${window.chatService.activeTargetId === u.id ? 'active' : ''} ${hasUnread ? 'has-unread' : ''}" data-target="${escapeHTML(u.id)}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; margin-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">👤 ${escapeHTML(u.name)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 6px;">
                ${unreadDotHtml}
                ${statusHtml}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 3. Update Nav Sidebar Unread Badge
    const totalUnread = window.chatService.getTotalUnreadCount();
    const navBadgeEl = document.querySelector('.nav-item[data-view="team-chat"] .nav-badge');
    if (navBadgeEl) {
      navBadgeEl.textContent = totalUnread.toString();
      navBadgeEl.style.display = totalUnread > 0 ? 'inline-block' : 'none';
    }

    // Rebind click events for all targets (with mobile chat window toggle)
    document.querySelectorAll('[data-target]').forEach(item => {
      item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        document.querySelectorAll('[data-target]').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Show chat window on mobile when a room is selected
        document.querySelector('.team-chat-container')?.classList.add('mobile-show-chat');

        if (window.chatService) window.chatService.setActiveTarget(targetId);
        this.renderTeamChat();
      });
    });
  }

  renderTeamChat() {
    this.renderTeamChatSidebar();

    const listEl = document.getElementById('teamChatMessageList');
    const titleEl = document.getElementById('currentChatTitle');
    const descEl = document.getElementById('currentChatDesc');
    if (!listEl || !window.chatService) return;

    const targetInfo = window.chatService.getActiveTargetInfo();
    const activeTargetId = window.chatService.activeTargetId;
    const isGeneralChan = activeTargetId === 'chan_general';
    const isDm = activeTargetId.startsWith('dm_');

    if (titleEl && targetInfo) titleEl.textContent = targetInfo.name;
    if (descEl && targetInfo) descEl.textContent = targetInfo.desc || "Kênh trao đổi công việc P.KDDVKH";

    const msgs = window.chatService.getActiveMessages();
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    const currentEmail = currentUser ? (currentUser.email || '').toLowerCase().trim() : '';
    const isAdmin = window.authManager ? window.authManager.isAdmin() : false;

    if (msgs.length === 0) {
      listEl.innerHTML = `<div style="font-size: 13px; color: var(--slate-400); text-align: center; margin-top: 40px;">💬 Chưa có tin nhắn nào trong kênh này. Hãy gửi tin nhắn đầu tiên!</div>`;
      return;
    }

    const messagesHtml = msgs.map(msg => {
      const isUser = msg.senderUid === (currentUser ? currentUser.uid : 'admin_18') || (msg.senderEmail && msg.senderEmail.toLowerCase().trim() === currentEmail);
      const canDelete = isUser || isAdmin;

      let attachmentHtml = '';
      if (msg.attachment) {
        attachmentHtml = `
          <div style="background: rgba(255,255,255,0.95); border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 8px; margin-top: 8px; font-size: 12.5px; color: #1e293b; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">📄</span>
              <div>
                <div style="font-weight: 700; color: #0f172a;">${escapeHTML(msg.attachment.name)}</div>
                <div style="font-size: 11px; color: #64748b;">Dung lượng: ${escapeHTML(msg.attachment.size)}</div>
              </div>
            </div>
          </div>
        `;
      }

      const deleteBtnHtml = canDelete ? `
        <button class="btn-delete-msg" data-msg-id="${escapeHTML(msg.id)}" title="Xóa tin nhắn này" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 11px; padding: 2px 4px; border-radius: 4px; margin-left: 6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">🗑️ Xóa</button>
      ` : '';

      return `
        <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-direction: ${isUser ? 'row-reverse' : 'row'}; align-items: flex-start;">
          <div style="width: 34px; height: 34px; border-radius: 50%; background: ${isUser ? '#0284c7' : '#475569'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0;">
            ${escapeHTML((msg.senderName || 'U').charAt(0))}
          </div>
          <div style="max-width: 75%;">
            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; font-weight: 600; text-align: ${isUser ? 'right' : 'left'}; display: flex; align-items: center; gap: 6px; justify-content: ${isUser ? 'flex-end' : 'flex-start'};">
              <span>${escapeHTML(msg.senderName)} <span style="background: #e2e8f0; color: #334155; padding: 1px 6px; border-radius: 4px; font-size: 10px;">${escapeHTML(msg.senderRole || 'Cán bộ')}</span> • ${escapeHTML(msg.timestamp)}</span>
              ${deleteBtnHtml}
            </div>
            <div style="background: ${isUser ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#ffffff'}; color: ${isUser ? '#ffffff' : '#1e293b'}; border: ${isUser ? 'none' : '1px solid #e2e8f0'}; padding: 12px 16px; border-radius: ${isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px'}; font-size: 13.5px; line-height: 1.6; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
              ${escapeHTML(msg.text).replace(/\n/g, '<br>')}
              ${attachmentHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    listEl.innerHTML = messagesHtml;

    // Bind event listeners for single message deletion
    listEl.querySelectorAll('.btn-delete-msg').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const msgId = btn.getAttribute('data-msg-id');
        if (msgId && confirm("Bạn có chắc chắn muốn xóa tin nhắn này không?")) {
          window.chatService.deleteSingleMessage(activeTargetId, msgId);
        }
      });
    });

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

  renderReports() {
    const deptFiles = window.storageService ? window.storageService.getFiles('department') : [];
    
    // 1. Calculate Summary Metrics
    const totalCount = deptFiles.length;
    const contractCount = deptFiles.filter(f => (f.docType || '').includes('Hợp đồng')).length;
    const processCount = deptFiles.filter(f => (f.docType || '').includes('Quy trình') || (f.docType || '').includes('Biểu giá')).length;
    
    let totalSizeBytes = 0;
    deptFiles.forEach(f => {
      totalSizeBytes += (f.sizeInBytes || 1024 * 500);
    });
    let formattedSize = (totalSizeBytes / (1024 * 1024)).toFixed(1) + ' MB';

    document.getElementById('rptTotalDocs') && (document.getElementById('rptTotalDocs').textContent = totalCount);
    document.getElementById('rptContractDocs') && (document.getElementById('rptContractDocs').textContent = contractCount);
    document.getElementById('rptProcessDocs') && (document.getElementById('rptProcessDocs').textContent = processCount);
    document.getElementById('rptTotalStorage') && (document.getElementById('rptTotalStorage').textContent = formattedSize);

    // 2. Render Category Percentage Chart
    const categories = ['Hợp đồng cấp nước', 'Biểu giá dịch vụ', 'Quy trình CSKH', 'Văn bản chỉ đạo', 'Biên bản sự cố'];
    const catListEl = document.getElementById('chartCategoryList');
    if (catListEl) {
      catListEl.innerHTML = categories.map(cat => {
        const count = deptFiles.filter(f => (f.docType || 'Hợp đồng cấp nước') === cat).length;
        const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        return `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 4px;">
              <span>${cat}</span>
              <span><strong>${count} tệp</strong> (${pct}%)</span>
            </div>
            <div style="background: #e2e8f0; border-radius: 6px; height: 8px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #0284c7 0%, #38bdf8 100%); width: ${pct}%; height: 100%; border-radius: 6px; transition: width 0.4s ease;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 3. Render File Format Chart
    const formats = [
      { name: 'PDF Document', ext: 'pdf', color: '#ef4444' },
      { name: 'Word Document (DOCX)', ext: 'docx', color: '#2563eb' },
      { name: 'Excel Sheet (XLSX)', ext: 'xlsx', color: '#16a34a' },
      { name: 'Hình ảnh (PNG/JPG)', ext: 'jpg', color: '#d97706' }
    ];
    const fmtListEl = document.getElementById('chartFormatList');
    if (fmtListEl) {
      fmtListEl.innerHTML = formats.map(fmt => {
        const count = deptFiles.filter(f => (f.type || '').toLowerCase() === fmt.ext.toLowerCase()).length;
        const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        return `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 4px;">
              <span>${fmt.name}</span>
              <span><strong>${count} tệp</strong> (${pct}%)</span>
            </div>
            <div style="background: #e2e8f0; border-radius: 6px; height: 8px; overflow: hidden;">
              <div style="background: ${fmt.color}; width: ${pct}%; height: 100%; border-radius: 6px; transition: width 0.4s ease;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 4. Render Status Counts
    const cntBanHanh = deptFiles.filter(f => (f.statusTag || '').includes('ban hành')).length;
    const cntKhan = deptFiles.filter(f => (f.statusTag || '').includes('Khẩn')).length;
    const cntChoDuyet = deptFiles.filter(f => (f.statusTag || '').includes('Chờ duyệt')).length;
    const cntMat = deptFiles.filter(f => (f.statusTag || '').includes('Mật')).length;

    document.getElementById('cntBanHanh') && (document.getElementById('cntBanHanh').textContent = cntBanHanh);
    document.getElementById('pctBanHanh') && (document.getElementById('pctBanHanh').textContent = (totalCount > 0 ? Math.round(cntBanHanh / totalCount * 100) : 0) + '%');

    document.getElementById('cntKhan') && (document.getElementById('cntKhan').textContent = cntKhan);
    document.getElementById('pctKhan') && (document.getElementById('pctKhan').textContent = (totalCount > 0 ? Math.round(cntKhan / totalCount * 100) : 0) + '%');

    document.getElementById('cntChoDuyet') && (document.getElementById('cntChoDuyet').textContent = cntChoDuyet);
    document.getElementById('pctChoDuyet') && (document.getElementById('pctChoDuyet').textContent = (totalCount > 0 ? Math.round(cntChoDuyet / totalCount * 100) : 0) + '%');

    document.getElementById('cntMat') && (document.getElementById('cntMat').textContent = cntMat);
    document.getElementById('pctMat') && (document.getElementById('pctMat').textContent = (totalCount > 0 ? Math.round(cntMat / totalCount * 100) : 0) + '%');
  }

  bindReportEvents() {
    const btnExport = document.getElementById('btnExportReport');
    btnExport?.addEventListener('click', () => {
      const deptFiles = window.storageService ? window.storageService.getFiles('department') : [];
      if (deptFiles.length === 0) {
        alert("⚠️ Hiện chưa có dữ liệu văn bản nào trong Kho KDDVKH để xuất báo cáo!");
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += "STT,Tên Văn Bản,Phân Loại,Trạng Thái,Kích Thước,Ngày Ban Hành,Người Đăng\n";

      deptFiles.forEach((f, idx) => {
        const row = [
          idx + 1,
          `"${(f.name || '').replace(/"/g, '""')}"`,
          `"${f.docType || 'Hợp đồng cấp nước'}"`,
          `"${f.statusTag || '🟢 Đã ban hành'}"`,
          `"${f.size || '1.2 MB'}"`,
          `"${f.uploadDate || ''}"`,
          `"${f.uploadedBy || 'Lê Tuấn Anh'}"`
        ].join(",");
        csvContent += row + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Bao_Cao_Thong_Ke_Kho_KDDVKH_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  bindSettingsEvents() {
    const btnSaveKey = document.getElementById('btnSaveGeminiKey');
    const inputKey = document.getElementById('geminiApiKeyInput');
    const statusEl = document.getElementById('geminiKeyStatus');

    const inputN8n = document.getElementById('n8nWebhookUrlInput');
    const btnSaveN8n = document.getElementById('btnSaveN8nWebhook');
    const btnTestN8n = document.getElementById('btnTestN8nWebhook');
    const statusN8n = document.getElementById('n8nWebhookStatus');

    const updateStatus = () => {
      const savedKey = localStorage.getItem('gemini_api_key') || localStorage.getItem('openai_api_key') || '';
      if (inputKey && savedKey && !inputKey.value) {
        inputKey.value = savedKey;
      }
      if (statusEl) {
        if (savedKey) {
          statusEl.innerHTML = savedKey.startsWith('sk-') ? 
            `<span style="color: #10b981; display: inline-flex; align-items: center; gap: 4px;">✅ Đã kích hoạt OpenAI ChatGPT Key (${savedKey.slice(0, 7)}...)</span>` : 
            `<span style="color: #10b981; display: inline-flex; align-items: center; gap: 4px;">✅ Đã kích hoạt Google Gemini AI Key (${savedKey.slice(0, 6)}...)</span>`;
        } else {
          statusEl.innerHTML = `<span style="color: #64748b;">ℹ️ Chưa dán Mã Khóa AI Engine tùy chỉnh (Đang dùng Key mặc định của hệ thống)</span>`;
        }
      }

      // n8n Webhook status
      const savedN8nUrl = window.aiAnalyzerModule ? window.aiAnalyzerModule.getN8nWebhookUrl() : localStorage.getItem('n8n_webhook_url');
      if (inputN8n && savedN8nUrl && !inputN8n.value) {
        inputN8n.value = savedN8nUrl;
      }
      if (statusN8n) {
        if (savedN8nUrl) {
          statusN8n.innerHTML = `<span style="color: #0284c7; display: inline-flex; align-items: center; gap: 4px;">🔗 Đã kích hoạt n8n AI Chatbot Webhook (${escapeHTML(savedN8nUrl)})</span>`;
        } else {
          statusN8n.innerHTML = `<span style="color: #64748b;">ℹ️ Chưa kết nối Webhook n8n (AI Assistant đang chạy Engine AI nội bộ)</span>`;
        }
      }
    };

    updateStatus();

    btnSaveKey?.addEventListener('click', () => {
      if (inputKey && inputKey.value.trim()) {
        const val = inputKey.value.trim();
        if (val.startsWith('sk-')) {
          localStorage.setItem('openai_api_key', val);
          if (window.aiAnalyzerModule) window.aiAnalyzerModule.setOpenAiKey(val);
        } else {
          localStorage.setItem('gemini_api_key', val);
        }
        updateStatus();
        alert("🎉 Đã lưu và kích hoạt Cấu hình Mã Khóa AI Engine thành công!");
      }
    });

    btnSaveN8n?.addEventListener('click', () => {
      if (inputN8n) {
        const val = inputN8n.value.trim();
        if (window.aiAnalyzerModule) {
          window.aiAnalyzerModule.setN8nWebhookUrl(val);
        } else {
          if (val) localStorage.setItem('n8n_webhook_url', val);
          else localStorage.removeItem('n8n_webhook_url');
        }
        updateStatus();
        if (val) {
          alert(`🎉 Đã lưu n8n Webhook URL thành công!\n\nTừ bây giờ, tất cả câu hỏi trên cổng AI Assistant sẽ được chuyển trực tiếp tới n8n Bot của anh (${val}).`);
        } else {
          alert("ℹ️ Đã xóa Webhook URL n8n. AI Assistant chuyển về dùng Engine AI nội bộ!");
        }
      }
    });

    btnTestN8n?.addEventListener('click', async () => {
      const url = inputN8n ? inputN8n.value.trim() : (localStorage.getItem('n8n_webhook_url') || '');
      if (!url) {
        alert("⚠️ Vui lòng dán đường dẫn n8n Webhook URL vào ô trước khi kiểm tra!");
        return;
      }

      btnTestN8n.disabled = true;
      const originalText = "⚡ Test Kết Nối";
      btnTestN8n.textContent = "⌛ Đang kết nối test...";

      try {
        if (window.aiAnalyzerModule) {
          const testRes = await window.aiAnalyzerModule.queryN8nWebhook("Xin chào n8n bot! Kiểm tra kết nối từ Thủ Đức Water Web App", "admin@thuducwater.vn");

          if (testRes && testRes.success) {
            alert(`✅ KẾT NỐI N8N THÔNG THÀNH CÔNG (100% OK)!\n\nURL Webhook: ${url}\n\nPhản hồi từ n8n Bot:\n"${(testRes.text || '').substring(0, 400)}..."`);
          } else {
            const errDetail = testRes ? testRes.error : "Không nhận được phản hồi";
            alert(`❌ CHƯA THÔNG KẾT NỐI TỚI N8N!\n\nURL Webhook: ${url}\nChi tiết kết quả: ${errDetail}\n\n👉 BƯỚC NĂM RÕ NGUYÊN NHÂN & CÁCH KHẮC PHỤC THƯỜNG GẶP:\n1. n8n có 2 loại URL Webhook: Nếu Workflow CHƯA Active, n8n chỉ nhận URL dạng '/webhook-test/...' khi bấm 'Listen for Test Event'!\n2. Nếu đã bấm gạt công tắc Active (Màu xanh), hãy dùng URL chính thức dạng '/webhook/...'\n3. Kiểm tra HTTP Method trong Node Webhook n8n (Chọn GET hoặc POST).`);
          }
        }
      } catch (err) {
        alert(`❌ LỖI KẾT NỐI: ${err.message || 'Hết thời gian chờ phản hồi từ n8n (Timeout)'}`);
      } finally {
        btnTestN8n.disabled = false;
        btnTestN8n.textContent = originalText;
      }
    });
  }

  playNotificationChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.3);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
        gain2.gain.setValueAtTime(0.18, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.4);
      }, 100);
    } catch (e) {}
  }

  handleIncomingMessageNotif(message, targetId) {
    // 1. Play Audio Chime Sound
    this.playNotificationChime();

    // 2. Request & trigger Native Browser Notification
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      } else if (Notification.permission === 'granted') {
        try {
          new Notification(`💬 Tin nhắn mới từ ${message.senderName}`, {
            body: message.text || 'Đã gửi một tệp đính kèm',
            icon: 'assets/logo.png'
          });
        } catch (e) {}
      }
    }

    // 3. Create Floating Glass Toast Notification at top-right
    const toast = document.createElement('div');
    toast.className = 'chat-notif-toast';
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 99999;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      padding: 14px 20px;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      max-width: 380px;
    `;

    toast.innerHTML = `
      <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(2,132,199,0.3);">
        💬
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 13px; font-weight: 800; color: #38bdf8; display: flex; justify-content: space-between; align-items: center;">
          <span>${escapeHTML(message.senderName)}</span>
          <span style="font-size: 10.5px; color: #94a3b8; font-weight: 500;">${message.timestamp || ''}</span>
        </div>
        <div style="font-size: 12.5px; color: #e2e8f0; margin-top: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
          ${escapeHTML(message.text || 'Đã gửi một tệp đính kèm')}
        </div>
      </div>
      <div style="font-size: 10px; font-weight: 800; background: #ef4444; color: white; padding: 3px 8px; border-radius: 10px; flex-shrink: 0; box-shadow: 0 0 8px rgba(239,68,68,0.5);">
        MỚI
      </div>
    `;

    toast.addEventListener('click', () => {
      this.switchView('team-chat');
      if (window.chatService) window.chatService.setActiveTarget(targetId);
      toast.remove();
    });

    document.body.appendChild(toast);
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s ease';
        setTimeout(() => toast.remove(), 400);
      }
    }, 5000);
  }
}

new AppController();
