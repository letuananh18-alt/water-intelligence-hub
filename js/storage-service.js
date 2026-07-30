// ==========================================================================
// FILE STORAGE & DUAL VAULT MANAGER SERVICE (SUPABASE POSTGRESQL + REALTIME)
// ==========================================================================

class StorageService {
  constructor() {
    this.files = [];
    this.folders = [];
    this.rawFileMap = new Map();
    this.listeners = [];
    this.hasInitializedCloud = false;
    this.init();
  }

  async init() {
    // 1. Load Local Cache first for instant render
    const savedFiles = localStorage.getItem('thuduc_water_files');
    if (savedFiles !== null) {
      try {
        this.files = JSON.parse(savedFiles);
      } catch (e) {
        this.files = [];
      }
    }

    const savedFolders = localStorage.getItem('thuduc_water_folders');
    if (savedFolders !== null) {
      try {
        this.folders = JSON.parse(savedFolders);
      } catch (e) {
        this.folders = [];
      }
    }

    if (this.folders.length === 0) {
      this.folders = [
        { id: "fold_kddvkh_1", name: "Hợp đồng Dịch vụ Khách hàng 2026", category: "department", department: "dept_kddvkh", createdBy: "Lê Tuấn Anh", ownerUid: "admin_letuananh18", date: "30/07/2026", filesCount: 0 },
        { id: "fold_kddvkh_2", name: "Báo cáo Doanh thu & Cấp nước KDDVKH", category: "department", department: "dept_kddvkh", createdBy: "Lê Tuấn Anh", ownerUid: "admin_letuananh18", date: "30/07/2026", filesCount: 0 },
        { id: "fold_kddvkh_3", name: "Biểu giá & Quy trình Dịch vụ Khách hàng", category: "department", department: "dept_kddvkh", createdBy: "Lê Tuấn Anh", ownerUid: "admin_letuananh18", date: "30/07/2026", filesCount: 0 }
      ];
      this.saveLocal();
    }

    // 2. Real-time PostgreSQL Sync with Supabase Cloud
    if (window.supabaseClient) {
      try {
        await this.syncFoldersFromSupabase();
        await this.syncFilesFromSupabase();

        // Subscribe to Supabase Realtime Postgres Changes
        window.supabaseClient
          .channel('schema-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, async () => {
            await this.syncFoldersFromSupabase();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, async () => {
            await this.syncFilesFromSupabase();
          })
          .subscribe();
      } catch (err) {
        console.warn("Supabase Realtime notice:", err);
      }
    }
  }

  async syncFoldersFromSupabase() {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.from('folders').select('*');
      if (!error && data && data.length > 0) {
        const map = new Map();
        this.folders.forEach(f => map.set(f.id, f));
        data.forEach(f => map.set(f.id, f));
        this.folders = Array.from(map.values());
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
        const map = new Map();
        this.files.forEach(f => map.set(f.id, f));
        data.forEach(f => map.set(f.id, f));
        this.files = Array.from(map.values());
        this.saveLocal();
        this.notify();
      }
    } catch (e) {}
  }

  saveLocal() {
    localStorage.setItem('thuduc_water_files', JSON.stringify(this.files));
    localStorage.setItem('thuduc_water_folders', JSON.stringify(this.folders));
  }

  getFiles(category = 'all', searchQuery = '', typeFilter = 'all', folderId = null, docTypeFilter = 'all') {
    let list = [...this.files];

    if (category === 'personal') {
      const user = window.authManager ? window.authManager.getCurrentUser() : null;
      list = list.filter(f => f.category === 'personal' && (user ? (f.uploaderUid === user.uid || f.uploadedBy === user.name || f.uploadedBy === user.email) : true));
      if (folderId) {
        list = list.filter(f => f.folderId === folderId);
      }
    } else if (category === 'department') {
      list = list.filter(f => f.category === 'department');
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q) || f.uploadedBy.toLowerCase().includes(q));
    }

    return list;
  }

  getRawFile(fileId) {
    return this.rawFileMap.get(fileId) || null;
  }

  async addFile(fileObj, category = 'personal', folderId = null, docType = 'Tài liệu cá nhân', statusTag = '🟢 Đã lưu') {
    const currentUser = (window.authManager && window.authManager.getCurrentUser()) || { name: "Client User", uid: "user_client" };
    const isAdmin = window.authManager && window.authManager.isAdmin();

    if (category === 'department' && !isAdmin) {
      alert("⛔ Bị từ chối: Client không có quyền tải lên Kho nội bộ Phòng Kinh doanh & Dịch vụ Khách hàng!");
      return null;
    }

    let formattedSize = (fileObj.size / (1024 * 1024)).toFixed(1) + " MB";
    if (fileObj.size < 1024 * 1024) {
      formattedSize = Math.round(fileObj.size / 1024) + " KB";
    }

    const ext = fileObj.name.split('.').pop().toUpperCase();
    const fileId = "f_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
    
    let fileUrl = "#";
    try {
      fileUrl = URL.createObjectURL(fileObj);
    } catch (e) {}

    this.rawFileMap.set(fileId, fileObj);

    const newFile = {
      id: fileId,
      name: fileObj.name,
      type: ext || "FILE",
      mimeType: fileObj.type,
      sizeBytes: fileObj.size,
      sizeFormatted: formattedSize,
      uploadedBy: currentUser.name || currentUser.email,
      uploaderUid: currentUser.uid,
      uploadDate: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
      category: category,
      folderId: folderId,
      docType: docType,
      statusTag: statusTag,
      url: fileUrl,
      dataUrl: null,
      tags: ["Tệp thực tế"]
    };

    if (fileObj.size < 8 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        newFile.dataUrl = e.target.result;
        this.saveLocal();
        if (window.supabaseClient) {
          try {
            await window.supabaseClient.from('files').upsert(newFile);
          } catch (err) {}
        }
        this.notify();
      };
      reader.readAsDataURL(fileObj);
    }

    this.files.unshift(newFile);

    if (folderId) {
      const fold = this.folders.find(f => f.id === folderId);
      if (fold) {
        fold.filesCount = (fold.filesCount || 0) + 1;
        if (window.supabaseClient) {
          window.supabaseClient.from('folders').update({ filesCount: fold.filesCount }).eq('id', folderId).then(()=>{}).catch(()=>{});
        }
      }
    }

    this.saveLocal();
    this.notify();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('files').upsert(newFile);
      } catch (err) {
        console.warn("Supabase file upload notice:", err);
      }
    }

    return newFile;
  }

  async deleteFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return false;

    const user = window.authManager ? window.authManager.getCurrentUser() : null;
    const isAdmin = window.authManager && window.authManager.isAdmin();

    if (file.category === 'department' && !isAdmin) {
      alert("⛔ Bị từ chối: Client không có quyền xóa tài liệu trong Kho nội bộ Phòng Kinh doanh & Dịch vụ Khách hàng!");
      return false;
    }

    if (isAdmin || (user && file.uploaderUid === user.uid)) {
      if (file.folderId) {
        const fold = this.folders.find(f => f.id === file.folderId);
        if (fold && fold.filesCount > 0) {
          fold.filesCount -= 1;
          if (window.supabaseClient) {
            window.supabaseClient.from('folders').update({ filesCount: fold.filesCount }).eq('id', file.folderId).then(()=>{}).catch(()=>{});
          }
        }
      }

      this.rawFileMap.delete(fileId);
      this.files = this.files.filter(f => f.id !== fileId);
      this.saveLocal();
      this.notify();

      if (window.supabaseClient) {
        try {
          await window.supabaseClient.from('files').delete().eq('id', fileId);
        } catch (e) {}
      }
      return true;
    } else {
      alert("⛔ Bị từ chối: Bạn không có quyền xóa tài liệu của người khác.");
      return false;
    }
  }

  getFolders(category = 'all') {
    const user = window.authManager ? window.authManager.getCurrentUser() : null;
    const isAdmin = window.authManager && window.authManager.isAdmin();

    if (category === 'department') {
      return this.folders.filter(f => f.category === 'department' || f.department === 'dept_kddvkh');
    } else if (category === 'personal') {
      return this.folders.filter(f => f.category === 'personal' && (user ? f.ownerUid === user.uid : true));
    }
    return this.folders;
  }

  async createFolder(name, category = 'department') {
    const currentUser = (window.authManager && window.authManager.getCurrentUser()) || { name: "Khách hàng", uid: "user_client" };
    const folderId = "fold_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
    
    const newFolder = {
      id: folderId,
      name: name.trim(),
      category: category,
      department: category === 'department' ? "dept_kddvkh" : "personal",
      createdBy: currentUser.name || currentUser.email,
      ownerUid: currentUser.uid,
      date: new Date().toLocaleDateString('vi-VN'),
      filesCount: 0
    };

    this.folders.unshift(newFolder);
    this.saveLocal();
    this.notify();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('folders').upsert(newFolder);
      } catch (e) {
        console.warn("Supabase createFolder notice:", e);
      }
    }
    return newFolder;
  }

  async renameFolder(folderId, newName) {
    const fold = this.folders.find(f => f.id === folderId);
    if (fold) {
      fold.name = newName.trim();
      this.saveLocal();
      this.notify();

      if (window.supabaseClient) {
        try {
          await window.supabaseClient.from('folders').update({ name: newName.trim() }).eq('id', folderId);
        } catch (e) {}
      }
    }
  }

  async deleteFolder(folderId) {
    this.folders = this.folders.filter(f => f.id !== folderId);
    this.files = this.files.filter(f => f.folderId !== folderId);
    this.saveLocal();
    this.notify();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('folders').delete().eq('id', folderId);
      } catch (e) {
        console.warn("Supabase deleteFolder notice:", e);
      }
    }
    return true;
  }

  getStorageStats() {
    const user = window.authManager ? window.authManager.getCurrentUser() : null;
    const userFiles = this.files.filter(f => f.uploaderUid === (user ? user.uid : '') || f.category === 'department');
    
    const totalBytes = userFiles.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    const maxGB = 500;
    const percentage = Math.min(100, Math.round((totalGB / maxGB) * 100));

    return {
      totalFiles: userFiles.length,
      usedFormatted: totalBytes >= 1024 * 1024 * 1024 ? `${totalGB} GB` : `${totalMB} MB`,
      maxGB: maxGB,
      percentage: percentage,
      sharedFiles: this.files.filter(f => f.category === 'department').length
    };
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.files));
  }
}

window.storageService = new StorageService();
