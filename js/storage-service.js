// ==========================================================================
// UNSTOPPABLE CLOUD HYBRID STORAGE SERVICE ENGINE
// Supabase Database Cloud Storage, Custom User Folders & Complete User Data Purge
// ==========================================================================

const INITIAL_DEPARTMENT_DOCS = [
  {
    id: "doc_init_001",
    name: "01_Quy-che-Vien-thong-va-Cap-nuoc-P-KDDVKH-2026.pdf",
    type: "PDF",
    docType: "Văn bản chỉ đạo",
    statusTag: "🟢 Đã ban hành",
    category: "department",
    size: 2450000,
    sizeFormatted: "2.4 MB",
    uploadedBy: "Lê Tuấn Anh (Admin)",
    uploaderEmail: "waterain8n@gmail.com",
    uploaderUid: "user_admin_001",
    uploadDate: "30/07/2026 14:00",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    id: "doc_init_002",
    name: "02_Huong-dan-Xu-ly-Khieu-nai-Thuy-ke-Thu-Duc.docx",
    type: "DOCX",
    docType: "Quy trình nội bộ",
    statusTag: "🟢 Đã ban hành",
    category: "department",
    size: 1180000,
    sizeFormatted: "1.2 MB",
    uploadedBy: "Lê Tuấn Anh (Admin)",
    uploaderEmail: "letuananh18@gmail.com",
    uploaderUid: "user_admin_002",
    uploadDate: "30/07/2026 15:30",
    url: "#"
  }
];

const INITIAL_FOLDERS = [
  { id: "fold_cv_den", name: "📁 Công văn Đến (P.KDDVKH)", category: "department", fileCount: 0, createdAt: "2026-07-30" },
  { id: "fold_cv_di", name: "📁 Công văn Đi & Báo cáo", category: "department", fileCount: 0, createdAt: "2026-07-30" },
  { id: "fold_hop_dong", name: "📁 Hồ sơ Hợp đồng Khách hàng", category: "department", fileCount: 0, createdAt: "2026-07-30" }
];

class StorageService {
  constructor() {
    this.files = [...INITIAL_DEPARTMENT_DOCS];
    this.folders = [...INITIAL_FOLDERS];
    this.rawFileObjects = {};
    this.listeners = [];
    this.init();
  }

  init() {
    const savedFiles = localStorage.getItem('thuduc_water_files');
    if (savedFiles) {
      try {
        this.files = JSON.parse(savedFiles);
      } catch (e) {
        this.files = [...INITIAL_DEPARTMENT_DOCS];
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
      window.supabaseClient
        .channel('schema-files-changes-v3')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, () => {
          this.syncFilesFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, () => {
          this.syncFoldersFromSupabase();
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
      if (!error && data && data.length > 0) {
        const cloudFolders = data.map(f => this.normalizeFolderFromDb(f));
        cloudFolders.forEach(f => {
          if (!this.folders.some(x => x.id === f.id)) {
            this.folders.push(f);
          }
        });
        this.saveLocal();
        this.notify();
      }
    } catch (e) {}
  }

  async syncFilesFromSupabase() {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.from('files').select('*');
      if (!error && data && data.length > 0) {
        const cloudFiles = data.map(f => this.normalizeFileFromDb(f));
        this.files = cloudFiles;
        this.saveLocal();
        this.notify();
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
    return this.folders.filter(f => f.category === category || !f.category);
  }

  getStorageStats() {
    const deptFiles = this.getFiles('department');
    let totalBytes = 0;
    deptFiles.forEach(f => {
      totalBytes += (f.size || 1000000);
    });

    const usedMB = (totalBytes / (1024 * 1024)).toFixed(1);
    return {
      totalFiles: deptFiles.length,
      usedMB: usedMB,
      limitMB: 1000,
      percentUsed: Math.min(100, Math.round((usedMB / 1000) * 100))
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
      url: URL.createObjectURL(fileObj)
    };

    this.files.unshift(newFile);
    this.rawFileObjects[fileId] = fileObj;
    this.saveLocal();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('files').insert({
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
        });
      } catch (e) {
        console.warn("Supabase file upload insert notice:", e);
      }
    }

    this.notify();
    return newFile;
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
        await window.supabaseClient.from('folders').insert({
          id: newFolder.id,
          name: newFolder.name,
          category: newFolder.category,
          uploader_email: uploaderEmail,
          uploader_uid: uploaderUid,
          parent_folder_id: newFolder.parentFolderId,
          file_count: 0,
          created_at: newFolder.createdAt
        });
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
