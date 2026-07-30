// ==========================================================================
// CENTRAL STORAGE SERVICE (SUPABASE POSTGRESQL DB 100% SINGLE SOURCE OF TRUTH)
// Pure 1-to-1 Sync with Supabase Postgres 'files' & 'folders' Tables
// No seed overrides, no synthetic file generators, no auto-recreating deleted items
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
    // 1. Load local cache (for instant rendering before Supabase fetch completes)
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

  normalizeFolderFromDb(f) {
    return {
      id: f.id,
      name: f.name || "Thư mục",
      category: f.category || 'department',
      department: f.department || 'dept_kddvkh',
      createdBy: f.createdBy || f.created_by || 'Admin',
      ownerUid: f.ownerUid || f.owner_uid || '',
      date: f.date || new Date().toLocaleDateString('vi-VN'),
      filesCount: typeof f.filesCount !== 'undefined' ? f.filesCount : (typeof f.files_count !== 'undefined' ? f.files_count : 0)
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
    const targetFolderId = f.folderId || f.folder_id || null;
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

  // 100% PURE SYNC FROM SUPABASE POSTGRES DB 'folders' TABLE
  async syncFoldersFromSupabase() {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.from('folders').select('*');
      if (!error && data) {
        const cloudFolders = data.map(f => this.normalizeFolderFromDb(f));
        this.folders = cloudFolders;
        this.saveLocal();
        this.notify();
      }
    } catch (e) {
      console.warn("Folder sync notice:", e);
    }
  }

  // 100% PURE SYNC FROM SUPABASE POSTGRES DB 'files' TABLE
  async syncFilesFromSupabase() {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.from('files').select('*');
      if (!error && data) {
        const cloudFiles = data.map(f => this.normalizeFileFromDb(f));
        this.files = cloudFiles;
        this.saveLocal();
        this.notify();
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

  // UPLOAD FILE: SAVES BINARY TO BUCKET + INSERTS ROW TO SUPABASE DB
  async addFile(fileObj, category = 'personal', folderId = null, docType = 'Tài liệu cá nhân', statusTag = '🟢 Đã lưu') {
    const currentUser = (window.authManager && window.authManager.getCurrentUser()) || { name: "Client User", uid: "user_client" };
    const isAdmin = window.authManager && window.authManager.isAdmin();

    if (category === 'department' && !isAdmin) {
      alert("⛔ Bị từ chối: Client không có quyền tải lên Kho nội bộ Phòng Kinh doanh & Dịch vụ Khách hàng!");
      return null;
    }

    let targetFolderId = folderId;

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

  // DELETE SINGLE FILE: DELETES FROM POSTGRES DB & STORAGE BUCKET
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

  // DELETE BATCH FILES: DELETES FROM POSTGRES DB & STORAGE BUCKET
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
    this.files = [];
    this.folders = [];
    this.saveLocal();
    this.notify();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('folders').delete().neq('id', 'keep_all');
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

  // CREATE FOLDER: INSERTS ROW TO SUPABASE DB
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
      } catch (e) {
        console.warn("Create folder notice:", e);
      }
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
          await window.supabaseClient.from('folders').update({ name: newName }).eq('id', folderId);
        } catch (e) {}
      }
    }
  }

  // DELETE FOLDER: DELETES ROW FROM SUPABASE DB
  async deleteFolder(folderId) {
    this.folders = this.folders.filter(f => f.id !== folderId);
    this.saveLocal();
    this.notify();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('folders').delete().eq('id', folderId);
        await window.supabaseClient.from('files').update({ folder_id: null }).eq('folder_id', folderId);
      } catch (e) {
        console.warn("Delete folder notice:", e);
      }
    }
  }

  getFolders(category = 'department') {
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
