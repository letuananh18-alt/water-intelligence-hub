// ==========================================================================
// CENTRAL STORAGE SERVICE (SUPABASE POSTGRESQL & STORAGE BUCKET DIRECT SYNC)
// Syncs files from both Postgres DB AND Supabase Storage Bucket 'documents'
// ==========================================================================

class StorageService {
  constructor() {
    this.files = [];
    this.folders = [];
    this.listeners = [];
    this.rawFileMap = new Map();
    this.init();
  }

  async init() {
    // 1. Load local cache
    const savedFiles = localStorage.getItem('thuduc_water_files');
    const savedFolders = localStorage.getItem('thuduc_water_folders');

    if (savedFiles && savedFolders) {
      try {
        this.files = JSON.parse(savedFiles);
        this.folders = JSON.parse(savedFolders);
      } catch (e) {
        this.files = [];
        this.folders = [];
      }
    }

    this.ensureDefaultFolders();
    this.ensureDefaultFiles();

    // 2. Real-time Supabase Cloud Database & Storage Bucket Sync
    if (window.supabaseClient) {
      try {
        await this.syncFoldersFromSupabase();
        await this.syncFilesFromSupabase();
        await this.syncStorageBucketFromSupabase();

        // Subscribe to Supabase Realtime Changes
        window.supabaseClient
          .channel('schema-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, async () => {
            await this.syncFoldersFromSupabase();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, async () => {
            await this.syncFilesFromSupabase();
            await this.syncStorageBucketFromSupabase();
          })
          .subscribe();
      } catch (err) {
        console.warn("Supabase Realtime notice:", err);
      }
    }
  }

  ensureDefaultFolders() {
    if (!this.folders || this.folders.length === 0) {
      this.folders = [
        {
          id: "fold_kddvkh_1",
          name: "Hợp đồng cấp nước & Quy trình CSKH 2026",
          category: "department",
          department: "Phòng Kinh doanh & DVKH",
          createdBy: "Lê Tuấn Anh (Admin)",
          ownerUid: "admin_waterain8n",
          date: "30/07/2026",
          filesCount: 3
        },
        {
          id: "fold_kddvkh_2",
          name: "Biểu giá & Tiêu chuẩn nước sạch",
          category: "department",
          department: "Phòng Kinh doanh & DVKH",
          createdBy: "Lê Tuấn Anh (Admin)",
          ownerUid: "admin_waterain8n",
          date: "30/07/2026",
          filesCount: 2
        }
      ];
    }
  }

  ensureDefaultFiles() {
    if (!this.files || this.files.length === 0) {
      this.files = [
        {
          id: "f_seed_kddvkh_1",
          name: "Quy trình Dịch vụ Khách hàng & Cấp nước 2026.docx",
          type: "DOCX",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          sizeBytes: 450000,
          sizeFormatted: "450 KB",
          uploadedBy: "Lê Tuấn Anh",
          uploaderUid: "admin_waterain8n",
          uploadDate: "30/07/2026",
          category: "department",
          folderId: "fold_kddvkh_1",
          docType: "Quy trình CSKH",
          statusTag: "🟢 Đã ban hành",
          url: "#",
          dataUrl: null,
          tags: ["Văn bản gốc"]
        },
        {
          id: "f_seed_kddvkh_2",
          name: "Hợp đồng Cấp nước Dịch vụ Thương mại mẫu.pdf",
          type: "PDF",
          mimeType: "application/pdf",
          sizeBytes: 1200000,
          sizeFormatted: "1.2 MB",
          uploadedBy: "Lê Tuấn Anh",
          uploaderUid: "admin_waterain8n",
          uploadDate: "30/07/2026",
          category: "department",
          folderId: "fold_kddvkh_1",
          docType: "Hợp đồng cấp nước",
          statusTag: "🟢 Đã ban hành",
          url: "#",
          dataUrl: null,
          tags: ["Văn bản gốc"]
        }
      ];
      this.saveLocal();
    }
  }

  getStorageStats() {
    const totalFiles = this.files ? this.files.length : 0;
    let totalBytes = 0;
    if (this.files) {
      this.files.forEach(f => {
        totalBytes += (f.sizeBytes || 0);
      });
    }

    let usedFormatted = (totalBytes / (1024 * 1024)).toFixed(1) + " MB";
    if (totalBytes < 1024 * 1024) {
      usedFormatted = Math.round(totalBytes / 1024) + " KB";
    }

    const maxBytes = 500 * 1024 * 1024 * 1024; // 500 GB
    const percentage = ((totalBytes / maxBytes) * 100).toFixed(2);
    const sharedFiles = this.files ? this.files.filter(f => f.category === 'department' || !f.category).length : 0;

    return {
      totalFiles,
      totalBytes,
      usedFormatted,
      percentage,
      sharedFiles
    };
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

  // ENSURE ALL DATABASE FILES DEFAULT TO 'department' SO NOTHING IS EVER HIDDEN
  normalizeFileFromDb(f, existingLocalFile) {
    const targetFolderId = f.folderId || f.folder_id || (existingLocalFile ? existingLocalFile.folderId : "fold_kddvkh_1");
    const category = f.category || (existingLocalFile ? existingLocalFile.category : 'department');

    return {
      id: f.id,
      name: f.name || (existingLocalFile ? existingLocalFile.name : "Tệp tin"),
      type: f.type || (existingLocalFile ? existingLocalFile.type : 'PDF'),
      mimeType: f.mimeType || f.mime_type || (existingLocalFile ? existingLocalFile.mimeType : 'application/pdf'),
      sizeBytes: f.sizeBytes || f.size_bytes || (existingLocalFile ? existingLocalFile.sizeBytes : 1024),
      sizeFormatted: f.sizeFormatted || f.size_formatted || (existingLocalFile ? existingLocalFile.sizeFormatted : '1 MB'),
      uploadedBy: f.uploadedBy || f.uploaded_by || (existingLocalFile ? existingLocalFile.uploadedBy : 'Lê Tuấn Anh'),
      uploaderUid: f.uploaderUid || f.uploader_uid || (existingLocalFile ? existingLocalFile.uploaderUid : 'admin_waterain8n'),
      uploadDate: f.uploadDate || f.upload_date || (existingLocalFile ? existingLocalFile.uploadDate : new Date().toLocaleDateString('vi-VN')),
      category: category,
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
      if (!error && data && data.length > 0) {
        const prevJson = JSON.stringify(this.folders);

        const localMap = new Map();
        this.folders.forEach(f => localMap.set(f.id, f));

        const mergedMap = new Map();
        data.forEach(f => {
          const existing = localMap.get(f.id);
          mergedMap.set(f.id, this.normalizeFolderFromDb(f, existing));
        });

        this.folders.forEach(f => {
          if (!mergedMap.has(f.id)) {
            mergedMap.set(f.id, f);
          }
        });

        const nextFolders = Array.from(mergedMap.values());
        this.folders = nextFolders;
        this.ensureDefaultFolders();

        const nextJson = JSON.stringify(this.folders);
        if (prevJson !== nextJson) {
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
      if (!error && data && data.length > 0) {
        const prevJson = JSON.stringify(this.files);

        const localMap = new Map();
        this.files.forEach(f => localMap.set(f.id, f));

        const mergedMap = new Map();
        this.files.forEach(f => mergedMap.set(f.id, f));
        data.forEach(f => {
          const existing = localMap.get(f.id);
          mergedMap.set(f.id, this.normalizeFileFromDb(f, existing));
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

  // DIRECT SUPABASE STORAGE BUCKET SCANNER (SCANS ALL FILES IN BUCKET 'documents')
  async syncStorageBucketFromSupabase() {
    if (!window.supabaseClient || !window.supabaseClient.storage) return;
    try {
      const categories = ['department', 'personal'];
      let addedAny = false;

      for (const cat of categories) {
        const { data, error } = await window.supabaseClient.storage.from('documents').list(cat);
        if (!error && data && data.length > 0) {
          data.forEach(item => {
            if (item.name && item.name !== '.emptyFolderPlaceholder') {
              const nameParts = item.name.split('_');
              let rawName = item.name;
              if (nameParts.length >= 3) {
                rawName = nameParts.slice(2).join('_');
              }
              const ext = rawName.split('.').pop().toUpperCase() || 'PDF';
              const fileId = item.name.split('.')[0];

              if (!this.files.some(f => f.id === fileId || f.name === rawName)) {
                const publicUrlData = window.supabaseClient.storage.from('documents').getPublicUrl(`${cat}/${item.name}`);
                const publicUrl = publicUrlData ? publicUrlData.publicUrl : '#';

                let formattedSize = "1.0 MB";
                if (item.metadata && item.metadata.size) {
                  const size = item.metadata.size;
                  formattedSize = size < 1024 * 1024 ? Math.round(size / 1024) + " KB" : (size / (1024 * 1024)).toFixed(1) + " MB";
                }

                const deptFolds = this.getFolders('department');
                const defaultFolderId = deptFolds.length > 0 ? deptFolds[0].id : "fold_kddvkh_1";

                const newFile = {
                  id: fileId,
                  name: rawName,
                  type: ext,
                  mimeType: item.metadata?.mimetype || (ext === 'PDF' ? 'application/pdf' : 'application/octet-stream'),
                  sizeBytes: item.metadata?.size || 1048576,
                  sizeFormatted: formattedSize,
                  uploadedBy: "Lê Tuấn Anh (Admin)",
                  uploaderUid: "admin_waterain8n",
                  uploadDate: new Date(item.created_at || Date.now()).toLocaleDateString('vi-VN'),
                  category: 'department',
                  folderId: defaultFolderId,
                  docType: "Hợp đồng cấp nước",
                  statusTag: "🟢 Đã ban hành",
                  url: publicUrl,
                  dataUrl: null,
                  tags: ["Supabase Cloud"]
                };

                this.files.push(newFile);
                addedAny = true;
              }
            }
          });
        }
      }

      if (addedAny) {
        this.saveLocal();
        this.notify();
      }
    } catch (e) {
      console.warn("Storage bucket list sync notice:", e);
    }
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
      list = list.filter(f => f.category === 'personal' && f.uploaderUid && f.uploaderUid === user.uid);
      if (folderId) {
        list = list.filter(f => f.folderId === folderId);
      }
    } else if (category === 'department') {
      list = list.filter(f => f.category === 'department' || !f.category);
      if (folderId) {
        list = list.filter(f => f.folderId === folderId || !f.folderId);
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
      } catch (e) {
        console.warn("Supabase Storage upload notice:", e);
      }
    }

    // 2. Add to local state & sync to Supabase Postgres Table
    this.files.unshift(newFile);
    this.saveLocal();
    this.notify();

    if (window.supabaseClient) {
      try {
        const dbFile = this.normalizeFileToDb(newFile);
        await window.supabaseClient.from('files').upsert(dbFile);

        await window.supabaseClient.from('client_upload_audits').insert({
          uploader_name: currentUser.name || currentUser.email,
          uploader_email: currentUser.email,
          file_type: ext,
          size_formatted: formattedSize,
          category: category,
          privacy_mode: category === 'personal' ? "🔒 RIÊNG TƯ (Chỉ Client xem được)" : "🌐 PHÒNG BAN (Nội bộ KDDVKH)",
          timestamp: newFile.uploadDate
        });
      } catch (e) {
        console.warn("Supabase Postgres insert notice:", e);
      }
    }

    return newFile;
  }

  async deleteFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    this.files = this.files.filter(f => f.id !== fileId);
    this.saveLocal();
    this.notify();

    if (window.supabaseClient && file) {
      try {
        await window.supabaseClient.from('files').delete().eq('id', fileId);
        
        const sanitizeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${file.category}/${fileId}_${sanitizeName}`;
        await window.supabaseClient.storage.from('documents').remove([filePath]);
      } catch (e) {
        console.warn("Supabase delete notice:", e);
      }
    }
  }

  async deleteFilesBatch(fileIds) {
    if (!Array.isArray(fileIds) || fileIds.length === 0) return;
    this.files = this.files.filter(f => !fileIds.includes(f.id));
    this.saveLocal();
    this.notify();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('files').delete().in('id', fileIds);
      } catch (e) {
        console.warn("Batch delete notice:", e);
      }
    }
  }

  async updateFilesDocTypeBatch(fileIds, newDocType, newStatusTag) {
    if (!Array.isArray(fileIds) || fileIds.length === 0) return;
    this.files.forEach(f => {
      if (fileIds.includes(f.id)) {
        if (newDocType) f.docType = newDocType;
        if (newStatusTag) f.statusTag = newStatusTag;
      }
    });
    this.saveLocal();
    this.notify();

    if (window.supabaseClient) {
      try {
        const updateObj = {};
        if (newDocType) updateObj.doc_type = newDocType;
        if (newStatusTag) updateObj.status_tag = newStatusTag;
        await window.supabaseClient.from('files').update(updateObj).in('id', fileIds);
      } catch (e) {
        console.warn("Batch update notice:", e);
      }
    }
  }

  async purgeAllTrash() {
    this.files = this.files.filter(f => f.id.startsWith('f_seed_'));
    this.folders = this.folders.filter(f => f.id.startsWith('fold_kddvkh_'));
    this.saveLocal();
    this.notify();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('files').delete().neq('id', 'keep_all');
      } catch (e) {}
    }
  }

  async createFolder(name, category = 'department') {
    const currentUser = (window.authManager && window.authManager.getCurrentUser()) || { name: "Admin", uid: "admin_waterain8n" };
    const foldId = "fold_" + Date.now();
    const newFolder = {
      id: foldId,
      name: name,
      category: category,
      department: "Phòng Kinh doanh & DVKH",
      createdBy: currentUser.name || currentUser.email,
      ownerUid: currentUser.uid,
      date: new Date().toLocaleDateString('vi-VN'),
      filesCount: 0
    };

    this.folders.push(newFolder);
    this.saveLocal();
    this.notify();

    if (window.supabaseClient) {
      try {
        const dbFold = this.normalizeFolderToDb(newFolder);
        await window.supabaseClient.from('folders').upsert(dbFold);
      } catch (e) {}
    }

    return newFolder;
  }

  async renameFolder(folderId, newName) {
    const fold = this.folders.find(f => f.id === folderId);
    if (fold) {
      fold.name = newName;
      this.saveLocal();
      this.notify();

      if (window.supabaseClient) {
        try {
          await window.supabaseClient.from('files').update({ name: newName }).eq('id', folderId);
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
        await window.supabaseClient.from('files').delete().eq('folder_id', folderId);
      } catch (e) {}
    }
  }

  getFolders(category = 'department') {
    this.ensureDefaultFolders();
    return this.folders.filter(f => f.category === category);
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.files, this.folders));
  }
}

window.storageService = new StorageService();
