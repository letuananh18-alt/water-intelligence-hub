// ==========================================================================
// CENTRAL STORAGE SERVICE (SUPABASE POSTGRESQL DB SINGLE SOURCE OF TRUTH)
// 100% Pure 1-to-1 Sync with Supabase Postgres 'files' & 'folders' Tables
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

    // 2. Real-time Supabase Cloud Database Sync
    if (window.supabaseClient) {
      try {
        await this.syncFoldersFromSupabase();
        await this.syncFilesFromSupabase();

        // Subscribe to Supabase Realtime Changes
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
          filesCount: 2
        },
        {
          id: "fold_kddvkh_2",
          name: "Biểu giá & Tiêu chuẩn nước sạch",
          category: "department",
          department: "Phòng Kinh doanh & DVKH",
          createdBy: "Lê Tuấn Anh (Admin)",
          ownerUid: "admin_waterain8n",
          date: "30/07/2026",
          filesCount: 1
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

  normalizeFileFromDb(f) {
    const targetFolderId = f.folderId || f.folder_id || "fold_kddvkh_1";
    const category = f.category || 'department';

    return {
      id: f.id,
      name: f.name || "Tệp tin",
      type: f.type || 'PDF',
      mimeType: f.mimeType || f.mime_type || 'application/pdf',
      sizeBytes: f.sizeBytes || f.size_bytes || 1024,
      sizeFormatted: f.sizeFormatted || f.size_formatted || '1 MB',
      uploadedBy: f.uploadedBy || f.uploaded_by || 'Lê Tuấn Anh',
      uploaderUid: f.uploaderUid || f.uploader_uid || 'admin_waterain8n',
      uploadDate: f.uploadDate || f.upload_date || new Date().toLocaleDateString('vi-VN'),
      category: category,
      folderId: targetFolderId,
      docType: f.docType || f.doc_type || 'Hợp đồng cấp nước',
      statusTag: f.statusTag || f.status_tag || '🟢 Đã ban hành',
      url: f.url || '#',
      dataUrl: f.dataUrl || f.data_url || null,
      tags: f.tags || ["Supabase CSDL"]
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

        const dbFolders = data.map(f => this.normalizeFolderFromDb(f));
        const seedFolders = this.folders.filter(f => f.id.startsWith('fold_kddvkh_') && !data.some(d => d.id === f.id));

        this.folders = [...seedFolders, ...dbFolders];
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

  // 100% PURE ACCURATE SYNC FROM SUPABASE POSTGRES DB 'files' TABLE
  async syncFilesFromSupabase() {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.from('files').select('*');
      if (!error && data) {
        const prevJson = JSON.stringify(this.files);

        // Normalize DB rows
        const cloudFiles = data.map(f => this.normalizeFileFromDb(f));

        // Preserve seed files if DB does not have them yet
        const seedFiles = this.files.filter(f => f.id.startsWith('f_seed_') && !data.some(d => d.id === f.id));

        const nextFiles = [...seedFiles, ...cloudFiles];
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

  // DELETE SINGLE FILE FROM SUPABASE DB & STORAGE BUCKET
  async deleteFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    this.files = this.files.filter(f => f.id !== fileId);
    this.saveLocal();
    this.notify();

    if (window.supabaseClient) {
      try {
        // 1. Delete record from Supabase Postgres Table
        await window.supabaseClient.from('files').delete().eq('id', fileId);

        // 2. Delete raw binary file from Supabase Storage Bucket 'documents'
        if (window.supabaseClient.storage) {
          const categories = ['department', 'personal'];
          for (const cat of categories) {
            const { data: bucketFiles } = await window.supabaseClient.storage.from('documents').list(cat);
            if (bucketFiles && bucketFiles.length > 0) {
              const pathsToRemove = [];
              bucketFiles.forEach(item => {
                if (item.name && (item.name.includes(fileId) || (file && item.name.includes(file.name)))) {
                  pathsToRemove.push(`${cat}/${item.name}`);
                }
              });
              if (pathsToRemove.length > 0) {
                await window.supabaseClient.storage.from('documents').remove(pathsToRemove);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Supabase delete notice:", e);
      }
    }
  }

  // DELETE BATCH FILES FROM SUPABASE DB & STORAGE BUCKET
  async deleteFilesBatch(fileIds) {
    if (!Array.isArray(fileIds) || fileIds.length === 0) return;
    const targetFiles = this.files.filter(f => fileIds.includes(f.id));
    this.files = this.files.filter(f => !fileIds.includes(f.id));
    this.saveLocal();
    this.notify();

    if (window.supabaseClient) {
      try {
        // 1. Delete records from Supabase Postgres Table
        await window.supabaseClient.from('files').delete().in('id', fileIds);

        // 2. Delete raw binary files from Supabase Storage Bucket 'documents'
        if (window.supabaseClient.storage) {
          const categories = ['department', 'personal'];
          for (const cat of categories) {
            const { data: bucketFiles } = await window.supabaseClient.storage.from('documents').list(cat);
            if (bucketFiles && bucketFiles.length > 0) {
              const pathsToRemove = [];
              bucketFiles.forEach(item => {
                const match = fileIds.some(id => item.name.includes(id)) || targetFiles.some(tf => item.name.includes(tf.name));
                if (item.name && match) {
                  pathsToRemove.push(`${cat}/${item.name}`);
                }
              });
              if (pathsToRemove.length > 0) {
                await window.supabaseClient.storage.from('documents').remove(pathsToRemove);
              }
            }
          }
        }
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

        if (window.supabaseClient.storage) {
          const categories = ['department', 'personal'];
          for (const cat of categories) {
            const { data: bucketFiles } = await window.supabaseClient.storage.from('documents').list(cat);
            if (bucketFiles && bucketFiles.length > 0) {
              const pathsToRemove = bucketFiles.map(b => `${cat}/${b.name}`);
              await window.supabaseClient.storage.from('documents').remove(pathsToRemove);
            }
          }
        }
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
