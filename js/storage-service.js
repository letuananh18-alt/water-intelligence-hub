// ==========================================================================
// FILE STORAGE & DUAL VAULT MANAGER SERVICE (STRICT PRIVACY ENFORCEMENT)
// 1. Personal Files: Strictly visible ONLY to their uploader (No exceptions, including Admin)
// 2. Dashboard Stats: ONLY counts Kho KDDVKH department files (Excludes personal files)
// ==========================================================================

class StorageService {
  constructor() {
    this.files = [];
    this.folders = [];
    this.rawFileMap = new Map();
    this.listeners = [];
    this.init();
  }

  async init() {
    // 1. Permanent Local Cache Restoration
    const savedFiles = localStorage.getItem('thuduc_water_files');
    if (savedFiles) {
      try {
        const parsed = JSON.parse(savedFiles);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.files = parsed;
        }
      } catch (e) {}
    }

    const savedFolders = localStorage.getItem('thuduc_water_folders');
    if (savedFolders) {
      try {
        const parsed = JSON.parse(savedFolders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.folders = parsed;
        }
      } catch (e) {}
    }

    // Default Seed Folders (ONLY initialized if no folders exist at all)
    if (!this.folders || this.folders.length === 0) {
      this.folders = [
        { id: "fold_kddvkh_1", name: "Hợp đồng Dịch vụ Khách hàng 2026", category: "department", department: "dept_kddvkh", createdBy: "Lê Tuấn Anh", ownerUid: "admin_waterain8n", date: "30/07/2026", filesCount: 0 },
        { id: "fold_kddvkh_2", name: "Báo cáo Doanh thu & Cấp nước KDDVKH", category: "department", department: "dept_kddvkh", createdBy: "Lê Tuấn Anh", ownerUid: "admin_waterain8n", date: "30/07/2026", filesCount: 0 },
        { id: "fold_kddvkh_3", name: "Biểu giá & Quy trình Dịch vụ Khách hàng", category: "department", department: "dept_kddvkh", createdBy: "Lê Tuấn Anh", ownerUid: "admin_waterain8n", date: "30/07/2026", filesCount: 0 }
      ];
      this.saveLocal();
    }

    // 2. Real-time Supabase Cloud Database Sync
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

  normalizeFolderFromDb(f, existingLocalFolder) {
    return {
      id: f.id,
      name: f.name || (existingLocalFolder ? existingLocalFolder.name : "Thư mục"),
      category: f.category || (existingLocalFolder ? existingLocalFolder.category : 'department'),
      department: f.department || (existingLocalFolder ? existingLocalFolder.department : 'dept_kddvkh'),
      createdBy: f.createdBy || f.created_by || (existingLocalFolder ? existingLocalFolder.createdBy : 'Admin'),
      ownerUid: f.ownerUid || f.owner_uid || (existingLocalFolder ? existingLocalFolder.ownerUid : ''),
      date: f.date || (existingLocalFolder ? existingLocalFolder.date : new Date().toLocaleDateString('vi-VN')),
      filesCount: typeof f.filesCount !== 'undefined' ? f.filesCount : (typeof f.files_count !== 'undefined' ? f.files_count : (existingLocalFolder ? existingLocalFolder.filesCount : 0))
    };
  }

  normalizeFolderToDb(f) {
    return {
      id: f.id,
      name: f.name,
      category: f.category || 'department',
      department: f.department || 'dept_kddvkh',
      created_by: f.createdBy || 'Admin',
      owner_uid: f.ownerUid || '',
      date: f.date,
      files_count: f.filesCount || 0
    };
  }

  normalizeFileFromDb(f, existingLocalFile) {
    const targetFolderId = f.folderId || f.folder_id || (existingLocalFile ? existingLocalFile.folderId : null);

    return {
      id: f.id,
      name: f.name || (existingLocalFile ? existingLocalFile.name : "Tài liệu"),
      type: f.type || (existingLocalFile ? existingLocalFile.type : 'FILE'),
      mimeType: f.mimeType || f.mime_type || (existingLocalFile ? existingLocalFile.mimeType : ''),
      sizeBytes: f.sizeBytes || f.size_bytes || (existingLocalFile ? existingLocalFile.sizeBytes : 0),
      sizeFormatted: f.sizeFormatted || f.size_formatted || (existingLocalFile ? existingLocalFile.sizeFormatted : '0 KB'),
      uploadedBy: f.uploadedBy || f.uploaded_by || (existingLocalFile ? existingLocalFile.uploadedBy : 'Khách hàng'),
      uploaderUid: f.uploaderUid || f.uploader_uid || (existingLocalFile ? existingLocalFile.uploaderUid : ''),
      uploadDate: f.uploadDate || f.upload_date || (existingLocalFile ? existingLocalFile.uploadDate : new Date().toLocaleDateString('vi-VN')),
      category: f.category || (existingLocalFile ? existingLocalFile.category : 'personal'),
      folderId: targetFolderId,
      docType: f.docType || f.doc_type || (existingLocalFile ? existingLocalFile.docType : 'Văn bản Nghiệp vụ'),
      statusTag: f.statusTag || f.status_tag || (existingLocalFile ? existingLocalFile.statusTag : '🟢 Đã ban hành'),
      url: f.url || (existingLocalFile ? existingLocalFile.url : '#'),
      dataUrl: f.dataUrl || f.data_url || (existingLocalFile ? existingLocalFile.dataUrl : null),
      tags: f.tags || (existingLocalFile ? existingLocalFile.tags : ["Tệp thực tế"])
    };
  }

  normalizeFileToDb(f) {
    return {
      id: f.id,
      name: f.name,
      type: f.type,
      mime_type: f.mimeType,
      size_bytes: f.sizeBytes,
      size_formatted: f.sizeFormatted,
      uploaded_by: f.uploadedBy,
      uploader_uid: f.uploaderUid,
      upload_date: f.uploadDate,
      category: f.category,
      folder_id: f.folderId,
      doc_type: f.docType,
      status_tag: f.statusTag,
      url: f.url,
      data_url: f.dataUrl,
      tags: f.tags
    };
  }

  async syncFoldersFromSupabase() {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.from('folders').select('*');
      if (!error && data) {
        const prevJson = JSON.stringify(this.folders);

        const localMap = new Map();
        this.folders.forEach(f => localMap.set(f.id, f));

        const dbIds = new Set(data.map(f => f.id));
        const mergedMap = new Map();

        // 1. Load cloud folders
        data.forEach(f => {
          const existing = localMap.get(f.id);
          mergedMap.set(f.id, this.normalizeFolderFromDb(f, existing));
        });

        // 2. Keep local folders that haven't been deleted on cloud
        this.folders.forEach(f => {
          if (!mergedMap.has(f.id) && !dbIds.has(f.id)) {
            mergedMap.set(f.id, f);
          }
        });

        const nextFolders = Array.from(mergedMap.values());
        const nextJson = JSON.stringify(nextFolders);

        if (prevJson !== nextJson) {
          this.folders = nextFolders;
          this.saveLocal();
          this.notify();
        }
      }
    } catch (e) {
      console.warn("Folder sync notice:", e);
    }
  }

  async syncFilesFromSupabase() {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.from('files').select('*');
      if (!error && data) {
        const prevJson = JSON.stringify(this.files);

        const localMap = new Map();
        this.files.forEach(f => localMap.set(f.id, f));

        const dbIds = new Set(data.map(f => f.id));
        const mergedMap = new Map();

        // 1. Load cloud files
        data.forEach(f => {
          const existing = localMap.get(f.id);
          mergedMap.set(f.id, this.normalizeFileFromDb(f, existing));
        });

        // 2. Keep local files if not explicitly deleted from DB
        this.files.forEach(f => {
          if (!mergedMap.has(f.id) && !dbIds.has(f.id)) {
            mergedMap.set(f.id, f);
          }
        });

        const nextFiles = Array.from(mergedMap.values());
        const nextJson = JSON.stringify(nextFiles);

        if (prevJson !== nextJson) {
          this.files = nextFiles;
          this.saveLocal();
          this.notify();
        }
      }
    } catch (e) {
      console.warn("Files sync notice:", e);
    }
  }

  saveLocal() {
    localStorage.setItem('thuduc_water_files', JSON.stringify(this.files));
    localStorage.setItem('thuduc_water_folders', JSON.stringify(this.folders));
  }

  // STRICTEST PRIVACY: Personal files are visible ONLY if f.uploaderUid STRICTLY matches user.uid!
  getFiles(category = 'all', searchQuery = '', typeFilter = 'all', folderId = null, docTypeFilter = 'all') {
    let list = [...this.files];
    const user = window.authManager ? window.authManager.getCurrentUser() : null;

    if (category === 'personal') {
      if (!user || !user.uid) return [];
      // STRICTEST UID ISOLATION: A personal file is visible ONLY if f.uploaderUid EXACTLY matches user.uid!
      list = list.filter(f => f.category === 'personal' && f.uploaderUid && f.uploaderUid === user.uid);
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
      list = list.filter(f => f.name.toLowerCase().includes(q) || (f.uploadedBy && f.uploadedBy.toLowerCase().includes(q)));
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

    let targetFolderId = folderId;
    if (category === 'department' && !targetFolderId) {
      const deptFolds = this.getFolders('department');
      targetFolderId = deptFolds.length > 0 ? deptFolds[0].id : "fold_kddvkh_1";
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
      folderId: targetFolderId,
      docType: docType,
      statusTag: statusTag,
      url: fileUrl,
      dataUrl: null,
      tags: ["Tệp thực tế"]
    };

    // 1. Upload raw file binary directly to Supabase Storage Bucket 'documents'
    if (window.supabaseClient && window.supabaseClient.storage) {
      try {
        const sanitizeName = fileObj.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${category}/${fileId}_${sanitizeName}`;
        
        const { data: uploadData, error: uploadErr } = await window.supabaseClient.storage.from('documents').upload(filePath, fileObj, {
          cacheControl: '3600',
          upsert: true
        });

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = window.supabaseClient.storage.from('documents').getPublicUrl(filePath);
          if (publicUrlData && publicUrlData.publicUrl) {
            newFile.url = publicUrlData.publicUrl;
          }
        }
      } catch (stErr) {
        console.warn("Supabase Storage bucket notice:", stErr);
      }
    }

    // 2. Base64 DataURL for offline persistent live previewer
    if (fileObj.size < 8 * 1024 * 1024) {
      try {
        newFile.dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(fileObj);
        });
      } catch (rErr) {}
    }

    this.files.unshift(newFile);

    if (targetFolderId) {
      const fold = this.folders.find(f => f.id === targetFolderId);
      if (fold) {
        fold.filesCount = (fold.filesCount || 0) + 1;
        if (window.supabaseClient) {
          window.supabaseClient.from('folders').update({ files_count: fold.filesCount }).eq('id', targetFolderId).then(()=>{}).catch(()=>{});
        }
      }
    }

    this.saveLocal();
    this.notify();

    // 3. Upsert record to Supabase PostgreSQL 'files' Table
    if (window.supabaseClient) {
      try {
        const dbPayload = this.normalizeFileToDb(newFile);
        await window.supabaseClient.from('files').upsert(dbPayload);
      } catch (err) {}
    }

    return newFile;
  }

  async deleteFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    const user = window.authManager ? window.authManager.getCurrentUser() : null;
    const isAdmin = window.authManager && window.authManager.isAdmin();

    if (file && file.category === 'department' && !isAdmin) {
      alert("⛔ Bị từ chối: Client không có quyền xóa tài liệu trong Kho nội bộ Phòng Kinh doanh & Dịch vụ Khách hàng!");
      return false;
    }

    const category = file ? file.category : 'department';

    // 1. Remove from local memory state
    if (file && file.folderId) {
      const fold = this.folders.find(f => f.id === file.folderId);
      if (fold && fold.filesCount > 0) {
        fold.filesCount -= 1;
        if (window.supabaseClient) {
          await window.supabaseClient.from('folders').update({ files_count: fold.filesCount }).eq('id', file.folderId).catch(()=>{});
        }
      }
    }

    this.rawFileMap.delete(fileId);
    this.files = this.files.filter(f => f.id !== fileId);
    this.saveLocal();
    this.notify();

    // 2. Cascade delete from Supabase Postgres Table & Storage Bucket
    if (window.supabaseClient) {
      try {
        // Delete row in Postgres DB
        await window.supabaseClient.from('files').delete().eq('id', fileId);

        // Prefix-matching search and delete in Storage Bucket
        if (window.supabaseClient.storage) {
          const { data: listData } = await window.supabaseClient.storage.from('documents').list(category);
          if (listData && listData.length > 0) {
            const targets = listData
              .filter(item => item.name.startsWith(fileId))
              .map(item => `${category}/${item.name}`);
            
            if (targets.length > 0) {
              await window.supabaseClient.storage.from('documents').remove(targets);
            }
          }
        }
      } catch (e) {
        console.warn("Supabase deleteFile error:", e);
      }
    }
    return true;
  }

  getFolders(category = 'all') {
    const user = window.authManager ? window.authManager.getCurrentUser() : null;

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

    // Save to local memory first
    this.folders.unshift(newFolder);
    this.saveLocal();
    this.notify();

    // Upsert directly to Supabase Postgres Cloud
    if (window.supabaseClient) {
      try {
        const payload = this.normalizeFolderToDb(newFolder);
        await window.supabaseClient.from('folders').upsert(payload);
      } catch (e) {}
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
    const folderFiles = this.files.filter(f => f.folderId === folderId);
    
    // 1. Delete all contained files locally and from Supabase
    for (const file of folderFiles) {
      await this.deleteFile(file.id);
    }

    // 2. Delete folder locally
    this.folders = this.folders.filter(f => f.id !== folderId);
    this.saveLocal();
    this.notify();

    // 3. Delete folder record from Supabase Postgres 'folders' table
    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('folders').delete().eq('id', folderId);
      } catch (e) {
        console.warn("Supabase deleteFolder error:", e);
      }
    }
    return true;
  }

  // Admin function to purge all files from local & Supabase Cloud
  async purgeAllFiles() {
    const isAdmin = window.authManager && window.authManager.isAdmin();
    if (!isAdmin) {
      alert("⛔ Chỉ Admin mới có quyền thực hiện xóa sạch rác!");
      return;
    }

    if (confirm("⚠️ XÁC NHẬN: Bạn có muốn dọn sạch TẤT CẢ TỆP TIN rác cũ trên cả Web App và Supabase Storage Cloud không?")) {
      const allFiles = [...this.files];
      for (const f of allFiles) {
        await this.deleteFile(f.id);
      }

      this.files = [];
      this.saveLocal();
      this.notify();

      if (window.supabaseClient) {
        try {
          await window.supabaseClient.from('files').delete().neq('id', '0');
          if (window.supabaseClient.storage) {
            const { data: deptList } = await window.supabaseClient.storage.from('documents').list('department');
            if (deptList && deptList.length > 0) {
              const targets = deptList.map(item => `department/${item.name}`);
              await window.supabaseClient.storage.from('documents').remove(targets);
            }
          }
        } catch (e) {}
      }
      alert("✨ Đã dọn sạch 100% rác cũ trên CSDL và Storage Supabase!");
    }
  }

  // DASHBOARD STATS ONLY COUNT KHO KDDVKH (DEPARTMENT) FILES! EXCLUDES PERSONAL FILES!
  getStorageStats() {
    const deptFiles = this.files.filter(f => f.category === 'department');
    
    const totalBytes = deptFiles.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    const maxGB = 500;
    const percentage = Math.min(100, Math.round((totalGB / maxGB) * 100));

    return {
      totalFiles: deptFiles.length,
      usedFormatted: totalBytes >= 1024 * 1024 * 1024 ? `${totalGB} GB` : `${totalMB} MB`,
      maxGB: maxGB,
      percentage: percentage,
      sharedFiles: deptFiles.length
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
