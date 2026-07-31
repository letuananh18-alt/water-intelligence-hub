// ==========================================================================
// THU DUC WATER FILE STORAGE & CLOUD PERSISTENCE ENGINE
// Supabase Database Sync & Realtime Storage Engine
// Realtime Folder Sync & Department Folder Multi-Broadcast Engine
// ==========================================================================

const INITIAL_FILES = [
  {
    id: "doc_kddvkh_001",
    name: "Quy_Trinh_Giai_Quyet_Khieu_Nai_Hoa_Don_T7_2026.pdf",
    type: "PDF",
    docType: "Quy trình CSKH",
    statusTag: "🟢 Đã ban hành",
    category: "department",
    folderId: "fold_kddvkh_1",
    size: 2457600,
    sizeFormatted: "2.4 MB",
    uploadedBy: "Lê Tuấn Anh (Admin)",
    uploaderEmail: "waterain8n@gmail.com",
    uploaderUid: "user_admin_001",
    uploadDate: "29/07/2026 14:20",
    url: "#"
  },
  {
    id: "doc_kddvkh_002",
    name: "Biểu_Giá_Dịch_Vụ_Cấp_Nước_Đô_Thị_Thủ_Đức_2026.docx",
    type: "DOCX",
    docType: "Biểu giá dịch vụ",
    statusTag: "🟡 Đang trình ký",
    category: "department",
    folderId: "fold_kddvkh_1",
    size: 1572864,
    sizeFormatted: "1.5 MB",
    uploadedBy: "Nguyễn Văn Hùng",
    uploaderEmail: "hung.nguyen@thuducwater.com.vn",
    uploaderUid: "user_hung_002",
    uploadDate: "28/07/2026 09:15",
    url: "#"
  },
  {
    id: "doc_kddvkh_003",
    name: "Hop_Dong_Cap_Nuoc_Khu_Do_Thi_Truong_Tho_2026.pdf",
    type: "PDF",
    docType: "Hợp đồng cấp nước",
    statusTag: "🟢 Đã ban hành",
    category: "department",
    folderId: "fold_kddvkh_1",
    size: 4194304,
    sizeFormatted: "4.2 MB",
    uploadedBy: "Lê Tuấn Anh (Admin)",
    uploaderEmail: "waterain8n@gmail.com",
    uploaderUid: "user_admin_001",
    uploadDate: "27/07/2026 16:45",
    url: "#"
  }
];

const INITIAL_FOLDERS = [
  {
    id: "fold_kddvkh_1",
    name: "📁 Quy trình CSKH & Giá Nước P.KDDVKH",
    category: "department",
    uploaderEmail: "waterain8n@gmail.com",
    uploaderUid: "user_admin_001",
    parentFolderId: null,
    fileCount: 3,
    createdAt: "2026-07-25"
  },
  {
    id: "fold_kddvkh_2",
    name: "📁 Hợp đồng & Hồ sơ Cấp nước Dự án 2026",
    category: "department",
    uploaderEmail: "waterain8n@gmail.com",
    uploaderUid: "user_admin_001",
    parentFolderId: null,
    fileCount: 0,
    createdAt: "2026-07-26"
  },
  {
    id: "fold_kddvkh_3",
    name: "📁 Báo cáo Thống kê & Công văn Đi - Đến",
    category: "department",
    uploaderEmail: "waterain8n@gmail.com",
    uploaderUid: "user_admin_001",
    parentFolderId: null,
    fileCount: 0,
    createdAt: "2026-07-27"
  }
];

class StorageService {
  constructor() {
    this.files = [...INITIAL_FILES];
    this.folders = [...INITIAL_FOLDERS];
    this.listeners = [];
    this.rawFileObjects = {};
    this.realtimeStorageChannel = null;
    this.init();
  }

  init() {
    const savedFiles = localStorage.getItem('thuduc_water_files');
    if (savedFiles) {
      try {
        this.files = JSON.parse(savedFiles);
      } catch (e) {
        this.files = [...INITIAL_FILES];
      }
    }

    const savedFolders = localStorage.getItem('thuduc_water_folders');
    if (savedFolders) {
      try {
        this.folders = JSON.parse(savedFolders);
      } catch (e) {
        this.folders = [...INITIAL_FOLDERS];
      }
    }

    if (window.supabaseClient) {
      this.syncFoldersFromSupabase();
      this.syncFilesFromSupabase();
      this.setupSupabaseRealtimeListeners();
    }
  }

  setupSupabaseRealtimeListeners() {
    if (!window.supabaseClient) return;

    try {
      this.realtimeStorageChannel = window.supabaseClient.channel('thuduc_realtime_storage_v4', {
        config: { broadcast: { self: true } }
      });

      this.realtimeStorageChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, () => {
          this.syncFilesFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, () => {
          this.syncFoldersFromSupabase();
        })
        .on('broadcast', { event: 'folder_created' }, (payload) => {
          if (payload && payload.payload) {
            const f = payload.payload;
            if (!this.folders.some(x => x.id === f.id)) {
              this.folders.push(f);
              this.saveLocal();
              this.notify();
            }
          }
        })
        .on('broadcast', { event: 'folder_renamed' }, (payload) => {
          if (payload && payload.payload) {
            const { id, name } = payload.payload;
            const fold = this.folders.find(x => x.id === id);
            if (fold) {
              fold.name = name;
              this.saveLocal();
              this.notify();
            }
          }
        })
        .on('broadcast', { event: 'folder_deleted' }, (payload) => {
          if (payload && payload.payload) {
            const { id } = payload.payload;
            this.folders = this.folders.filter(x => x.id !== id);
            this.saveLocal();
            this.notify();
          }
        })
        .subscribe();
    } catch (e) {
      console.warn("Supabase realtime storage notice:", e);
    }
  }

  async syncFoldersFromSupabase() {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.from('folders').select('*');
      if (!error && data) {
        const cloudFolders = data.map(f => this.normalizeFolderFromDb(f));
        let changed = false;

        cloudFolders.forEach(f => {
          const idx = this.folders.findIndex(x => x.id === f.id);
          if (idx >= 0) {
            if (this.folders[idx].name !== f.name) {
              this.folders[idx] = f;
              changed = true;
            }
          } else {
            this.folders.push(f);
            changed = true;
          }
        });

        if (changed) {
          this.saveLocal();
          this.notify();
        }
      }
    } catch (e) {}
  }

  async syncFilesFromSupabase() {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.from('files').select('*');
      if (!error && data) {
        const cloudFiles = data.map(f => this.normalizeFileFromDb(f));
        const cloudIds = cloudFiles.map(f => f.id).join(',');
        const localIds = this.files.map(f => f.id).join(',');
        if (cloudIds !== localIds || cloudFiles.length !== this.files.length) {
          this.files = cloudFiles;
          this.saveLocal();
          this.notify();
        }
      }
    } catch (e) {}
  }

  normalizeFolderFromDb(f) {
    return {
      id: f.id,
      name: f.name,
      category: f.category || 'department',
      uploaderEmail: f.uploader_email || f.uploaderEmail || '',
      uploaderUid: f.uploader_uid || f.uploaderUid || '',
      parentFolderId: f.parent_folder_id || f.parentFolderId || null,
      fileCount: f.file_count || 0,
      createdAt: f.created_at || f.createdAt || new Date().toISOString().split('T')[0]
    };
  }

  normalizeFileFromDb(f) {
    return {
      id: f.id,
      name: f.name,
      type: f.type || 'FILE',
      docType: f.doc_type || f.docType || 'Hợp đồng cấp nước',
      statusTag: f.status_tag || f.statusTag || '🟢 Đã ban hành',
      category: f.category || 'department',
      folderId: f.folder_id || f.folderId || null,
      size: f.size || 1024,
      sizeFormatted: f.size_formatted || f.sizeFormatted || '1.0 MB',
      uploadedBy: f.uploaded_by || f.uploadedBy || 'Cán bộ P.KDDVKH',
      uploaderEmail: f.uploader_email || f.uploaderEmail || '',
      uploaderUid: f.uploader_uid || f.uploaderUid || 'user_guest',
      uploadDate: f.upload_date || f.uploadDate || new Date().toLocaleString('vi-VN'),
      url: f.url || '#'
    };
  }

  saveLocal() {
    localStorage.setItem('thuduc_water_files', JSON.stringify(this.files));
    localStorage.setItem('thuduc_water_folders', JSON.stringify(this.folders));
  }

  getFiles(category = 'all', searchQuery = '', typeFilter = 'all', folderId = null, docTypeFilter = 'all') {
    let list = [...this.files];
    const user = window.authManager ? window.authManager.getCurrentUser() : null;

    if (category === 'personal') {
      if (!user || !user.uid) return [];
      const userEmail = (user.email || '').toLowerCase().trim();
      list = list.filter(f => f.category === 'personal' && (f.uploaderUid === user.uid || (f.uploaderEmail || '').toLowerCase().trim() === userEmail));
      if (folderId) {
        list = list.filter(f => f.folderId === folderId);
      }
    } else if (category === 'department') {
      list = list.filter(f => f.category === 'department' || !f.category);
      if (folderId) {
        list = list.filter(f => f.folderId === folderId);
      }
    }

    if (typeFilter && typeFilter !== 'all') {
      list = list.filter(f => f.type.toLowerCase() === typeFilter.toLowerCase());
    }

    if (docTypeFilter && docTypeFilter !== 'all') {
      list = list.filter(f => f.docType === docTypeFilter);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.uploadedBy.toLowerCase().includes(q) ||
        (f.docType && f.docType.toLowerCase().includes(q))
      );
    }

    return list;
  }

  getFolders(category = 'department', parentFolderId = null) {
    const user = window.authManager ? window.authManager.getCurrentUser() : null;
    const uUid = user ? user.uid : null;
    const uEmail = user ? (user.email || '').toLowerCase().trim() : '';

    if (category === 'personal') {
      if (!user) return [];
      return this.folders.filter(f => f.category === 'personal' && (f.uploaderUid === uUid || (f.uploaderEmail || '').toLowerCase().trim() === uEmail));
    }
    return this.folders.filter(f => f.category === 'department' || !f.category);
  }

  getStorageStats() {
    const deptFiles = this.getFiles('department');
    let totalBytes = 0;
    this.files.forEach(f => {
      totalBytes += (f.size || 1048576);
    });

    const usedMBNum = totalBytes / (1024 * 1024);
    let usedFormatted = "";
    if (usedMBNum >= 1024) {
      usedFormatted = (usedMBNum / 1024).toFixed(2) + " GB";
    } else {
      usedFormatted = usedMBNum.toFixed(1) + " MB";
    }

    const limitGB = 500;
    const usedGB = usedMBNum / 1024;
    const percentage = Math.min(100, Math.max(0.1, parseFloat(((usedGB / limitGB) * 100).toFixed(2))));

    return {
      totalFiles: deptFiles.length,
      usedMB: usedMBNum.toFixed(1),
      usedFormatted: usedFormatted,
      limitGB: limitGB,
      percentage: percentage,
      percentUsed: percentage
    };
  }

  async uploadFile(fileObj, category = 'personal', folderId = null, docType = 'Văn bản chung', statusTag = '🟢 Đã ban hành') {
    const user = window.authManager ? window.authManager.getCurrentUser() : null;
    const uploaderName = user ? (user.name || user.email.split('@')[0]) : "Cán bộ P.KDDVKH";
    const uploaderUid = user ? user.uid : "user_guest";
    const uploaderEmail = user ? (user.email || '').toLowerCase().trim() : '';

    const ext = fileObj.name.split('.').pop().toUpperCase();
    const sizeFormatted = (fileObj.size / (1024 * 1024)).toFixed(1) + " MB";
    const fileId = "doc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);

    const newFile = {
      id: fileId,
      name: fileObj.name,
      type: ext,
      docType: docType,
      statusTag: statusTag,
      category: category,
      folderId: folderId || null,
      size: fileObj.size,
      sizeFormatted: sizeFormatted,
      uploadedBy: uploaderName,
      uploaderEmail: uploaderEmail,
      uploaderUid: uploaderUid,
      uploadDate: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
      url: "#"
    };

    this.files.unshift(newFile);
    this.rawFileObjects[fileId] = fileObj;
    this.saveLocal();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('files').upsert({
          id: newFile.id,
          name: newFile.name,
          type: newFile.type,
          doc_type: newFile.docType,
          status_tag: newFile.statusTag,
          category: newFile.category,
          folder_id: newFile.folderId,
          size: newFile.size,
          size_formatted: newFile.sizeFormatted,
          uploaded_by: newFile.uploadedBy,
          uploader_email: uploaderEmail,
          uploader_uid: uploaderUid,
          upload_date: newFile.uploadDate,
          url: '#'
        }, { onConflict: 'id' });
      } catch (e) {
        console.warn("Supabase file upload insert notice:", e);
      }
    }

    this.notify();
    return newFile;
  }

  async addFile(fileObj, category = 'personal', folderId = null, docType = 'Văn bản chung', statusTag = '🟢 Đã ban hành') {
    return this.uploadFile(fileObj, category, folderId, docType, statusTag);
  }

  getRawFile(fileId) {
    return this.rawFileObjects[fileId] || null;
  }

  async deleteFile(fileId) {
    this.files = this.files.filter(f => f.id !== fileId);
    delete this.rawFileObjects[fileId];
    this.saveLocal();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('files').delete().eq('id', fileId);
      } catch (e) {}
    }

    this.notify();
  }

  async deleteFilesBatch(fileIds = []) {
    if (!fileIds || fileIds.length === 0) return;
    this.files = this.files.filter(f => !fileIds.includes(f.id));
    fileIds.forEach(id => delete this.rawFileObjects[id]);
    this.saveLocal();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('files').delete().in('id', fileIds);
      } catch (e) {}
    }

    this.notify();
  }

  async purgeFilesByUser(cleanEmail) {
    if (!cleanEmail) return;
    const clean = cleanEmail.toLowerCase().trim();

    const filesToDelete = this.files.filter(f => {
      const by = (f.uploadedBy || '').toLowerCase();
      const uEmail = (f.uploaderEmail || '').toLowerCase();
      return uEmail === clean || by.includes(clean) || by.includes(clean.split('@')[0]);
    });

    const fileIdsToDelete = filesToDelete.map(f => f.id);

    if (fileIdsToDelete.length > 0) {
      this.files = this.files.filter(f => !fileIdsToDelete.includes(f.id));
      fileIdsToDelete.forEach(id => delete this.rawFileObjects[id]);
      this.saveLocal();

      if (window.supabaseClient) {
        try {
          await window.supabaseClient.from('files').delete().in('id', fileIdsToDelete);
        } catch (e) {}
      }

      this.notify();
    }
  }

  async createFolder(name, category = 'department', parentFolderId = null) {
    const user = window.authManager ? window.authManager.getCurrentUser() : null;
    const uploaderEmail = user ? (user.email || '').toLowerCase().trim() : '';
    const uploaderUid = user ? user.uid : 'user_guest';

    let cleanName = name.trim();
    if (!cleanName.startsWith('📁')) cleanName = `📁 ${cleanName}`;

    const newFolder = {
      id: "fold_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      name: cleanName,
      category: category,
      uploaderEmail: uploaderEmail,
      uploaderUid: uploaderUid,
      parentFolderId: parentFolderId || null,
      fileCount: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };

    this.folders.push(newFolder);
    this.saveLocal();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('folders').upsert({
          id: newFolder.id,
          name: newFolder.name,
          category: newFolder.category,
          uploader_email: uploaderEmail,
          uploader_uid: uploaderUid,
          parent_folder_id: newFolder.parentFolderId,
          file_count: 0,
          created_at: newFolder.createdAt
        }, { onConflict: 'id' });

        if (this.realtimeStorageChannel) {
          this.realtimeStorageChannel.send({
            type: 'broadcast',
            event: 'folder_created',
            payload: newFolder
          });
        }
      } catch (e) {}
    }

    this.notify();
    return newFolder;
  }

  async renameFolder(folderId, newName) {
    const f = this.folders.find(x => x.id === folderId);
    if (!f) return;

    let cleanName = newName.trim();
    if (!cleanName.startsWith('📁')) cleanName = `📁 ${cleanName}`;

    f.name = cleanName;
    this.saveLocal();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('folders').update({ name: cleanName }).eq('id', folderId);
        if (this.realtimeStorageChannel) {
          this.realtimeStorageChannel.send({
            type: 'broadcast',
            event: 'folder_renamed',
            payload: { id: folderId, name: cleanName }
          });
        }
      } catch (e) {}
    }

    this.notify();
  }

  async deleteFolder(folderId) {
    this.folders = this.folders.filter(f => f.id !== folderId);
    this.saveLocal();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('folders').delete().eq('id', folderId);
        if (this.realtimeStorageChannel) {
          this.realtimeStorageChannel.send({
            type: 'broadcast',
            event: 'folder_deleted',
            payload: { id: folderId }
          });
        }
      } catch (e) {}
    }

    this.notify();
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.files, this.folders));
  }
}

window.storageService = new StorageService();
