// ==========================================================================
// THU DUC WATER FILE STORAGE & CLOUD PERSISTENCE ENGINE
// Supabase Database Sync & Realtime Storage Engine
// Realtime File & Folder Multi-User Sync & Live Broadcast Engine
// ==========================================================================

const INITIAL_FILES = [];
const INITIAL_FOLDERS = [];

class StorageService {
  constructor() {
    this.files = [];
    this.folders = [];
    this.listeners = [];
    this.rawFileObjects = {};
    this.realtimeStorageChannel = null;
    this.init();
  }

  init() {
    const savedFiles = localStorage.getItem('thuduc_water_files');
    if (savedFiles) {
      try {
        const arr = JSON.parse(savedFiles);
        if (Array.isArray(arr) && arr.length > 0) this.files = arr;
      } catch (e) {}
    }

    const savedFolders = localStorage.getItem('thuduc_water_folders');
    if (savedFolders) {
      try {
        const arr = JSON.parse(savedFolders);
        if (Array.isArray(arr) && arr.length > 0) this.folders = arr;
      } catch (e) {}
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
      this.realtimeStorageChannel = window.supabaseClient.channel('thuduc_realtime_storage_v5', {
        config: { broadcast: { self: true } }
      });

      this.realtimeStorageChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, () => {
          this.syncFilesFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, () => {
          this.syncFoldersFromSupabase();
        })
        .on('broadcast', { event: 'file_uploaded' }, (payload) => {
          if (payload && payload.payload) {
            const newF = payload.payload;
            const idx = this.files.findIndex(x => x.id === newF.id);
            if (idx >= 0) {
              this.files[idx] = newF;
            } else {
              this.files.unshift(newF);
            }
            this.saveLocal();
            this.notify();
          }
        })
        .on('broadcast', { event: 'file_deleted' }, (payload) => {
          if (payload && payload.payload) {
            const { id } = payload.payload;
            this.files = this.files.filter(x => x.id !== id);
            this.saveLocal();
            this.notify();
          }
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
      if (error) {
        window.handleSupabaseError?.(error, 'syncFolders');
        return;
      }
      if (data !== null) {
        const cloudFolders = data.map(f => this.normalizeFolderFromDb(f));
        // Keep personal folders, but department folders are 100% authoritative from Supabase Cloud
        const personalFolders = this.folders.filter(f => f.category === 'personal');
        this.folders = [...cloudFolders, ...personalFolders];
        this.saveLocal();
        this.notify();
      }
    } catch (e) {
      console.warn("syncFoldersFromSupabase notice:", e);
    }
  }

  async syncFilesFromSupabase() {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.from('files').select('*');
      if (error) {
        window.handleSupabaseError?.(error, 'syncFiles');
        return;
      }
      if (data !== null) {
        const cloudFiles = data.map(f => this.normalizeFileFromDb(f));
        // Keep personal files, but department files are 100% authoritative from Supabase Cloud
        const personalFiles = this.files.filter(f => f.category === 'personal');
        this.files = [...cloudFiles, ...personalFiles];
        this.saveLocal();
        this.notify();
      }
    } catch (e) {
      console.warn("syncFilesFromSupabase notice:", e);
    }
  }

  normalizeFolderFromDb(f) {
    const rawName = f.name || 'Thư mục';
    const cleanName = rawName.replace(/^📁\s*/, '');
    return {
      id: f.id,
      name: cleanName,
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
      size: f.size_bytes || f.size || 1024,
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
    } else if (category === 'process') {
      list = list.filter(f => f.category === 'process');
      if (folderId) {
        list = list.filter(f => f.folderId === folderId);
      }
    } else if (category === 'department') {
      list = list.filter(f => f.category === 'department' || (!f.category && f.category !== 'personal' && f.category !== 'process'));
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
    } else if (category === 'process') {
      let procFolders = this.folders.filter(f => f.category === 'process');
      if (procFolders.length === 0) {
        procFolders = [
          { id: 'fold_proc_1', name: 'Quy trình Tiếp nhận & CSKH', category: 'process', fileCount: 0, createdAt: '2026-01-15' },
          { id: 'fold_proc_2', name: 'Quy trình Lắp đặt & Thay đồng hồ', category: 'process', fileCount: 0, createdAt: '2026-01-15' },
          { id: 'fold_proc_3', name: 'Hướng dẫn Xử lý Sự cố & Khiếu nại', category: 'process', fileCount: 0, createdAt: '2026-01-15' },
          { id: 'fold_proc_4', name: 'Quy chế & Bảng mô tả Công việc', category: 'process', fileCount: 0, createdAt: '2026-01-15' }
        ];
        this.folders.push(...procFolders);
        this.saveLocal();
      }
      return procFolders;
    }
    return this.folders.filter(f => f.category === 'department' || (!f.category && f.category !== 'personal' && f.category !== 'process'));
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
        let publicUrl = '#';
        const cleanFileName = fileObj.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const storagePath = `${category}/${Date.now()}_${cleanFileName}`;

        try {
          const { data: storageData, error: storageErr } = await window.supabaseClient
            .storage
            .from('documents')
            .upload(storagePath, fileObj, { upsert: true });

          if (!storageErr && storageData) {
            const { data: urlData } = window.supabaseClient.storage.from('documents').getPublicUrl(storagePath);
            if (urlData && urlData.publicUrl) {
              publicUrl = urlData.publicUrl;
              newFile.url = publicUrl;
            }
          } else {
            console.warn("⚠️ Supabase Storage Bucket upload notice:", storageErr?.message);
          }
        } catch (stErr) {
          console.warn("⚠️ Supabase Storage Bucket upload exception notice:", stErr);
        }

        const fullPayload = {
          id: newFile.id,
          name: newFile.name,
          type: newFile.type,
          mime_type: newFile.type === 'PDF' ? 'application/pdf' : 'application/octet-stream',
          size_bytes: newFile.size,
          size_formatted: newFile.sizeFormatted,
          uploaded_by: newFile.uploadedBy,
          uploader_uid: uploaderUid,
          upload_date: newFile.uploadDate,
          category: newFile.category,
          folder_id: newFile.folderId,
          doc_type: newFile.docType,
          status_tag: newFile.statusTag,
          url: publicUrl
        };

        const { error: upsertErr } = await window.supabaseClient.from('files').upsert(fullPayload, { onConflict: 'id' });
        if (upsertErr) {
          console.warn("⚠️ Supabase full files upsert notice, trying minimal payload:", upsertErr.message);
          await window.supabaseClient.from('files').upsert({
            id: newFile.id,
            name: newFile.name,
            type: newFile.type,
            category: newFile.category,
            size_bytes: newFile.size,
            url: publicUrl
          }, { onConflict: 'id' });
        }

        if (this.realtimeStorageChannel) {
          this.realtimeStorageChannel.send({
            type: 'broadcast',
            event: 'file_uploaded',
            payload: newFile
          });
        }
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

  async deleteStorageBucketFile(fileUrlOrPath) {
    if (!window.supabaseClient || !fileUrlOrPath) return;
    try {
      let path = fileUrlOrPath;
      if (path.includes('/documents/')) {
        path = path.split('/documents/').pop();
      }
      if (path && path !== '#') {
        await window.supabaseClient.storage.from('documents').remove([path]);
      }
    } catch (e) {}
  }

  async purgeAllSupabaseStorageBucketFiles() {
    if (!window.supabaseClient) return;
    try {
      const { data: deptFiles } = await window.supabaseClient.storage.from('documents').list('department');
      if (deptFiles && deptFiles.length > 0) {
        const deptPaths = deptFiles.map(f => `department/${f.name}`);
        await window.supabaseClient.storage.from('documents').remove(deptPaths);
      }

      const { data: personalFiles } = await window.supabaseClient.storage.from('documents').list('personal');
      if (personalFiles && personalFiles.length > 0) {
        const personalPaths = personalFiles.map(f => `personal/${f.name}`);
        await window.supabaseClient.storage.from('documents').remove(personalPaths);
      }

      const { data: rootFiles } = await window.supabaseClient.storage.from('documents').list('');
      if (rootFiles && rootFiles.length > 0) {
        const rootPaths = rootFiles.filter(f => f.name && !f.name.startsWith('.')).map(f => f.name);
        if (rootPaths.length > 0) {
          await window.supabaseClient.storage.from('documents').remove(rootPaths);
        }
      }
    } catch (e) {
      console.warn("Supabase storage bucket purge notice:", e);
    }
  }

  async deleteFile(fileId) {
    const targetFile = this.files.find(f => f.id === fileId);
    this.files = this.files.filter(f => f.id !== fileId);
    delete this.rawFileObjects[fileId];
    this.saveLocal();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('files').delete().eq('id', fileId);
        if (targetFile && targetFile.url) {
          await this.deleteStorageBucketFile(targetFile.url);
        }
        if (this.realtimeStorageChannel) {
          this.realtimeStorageChannel.send({
            type: 'broadcast',
            event: 'file_deleted',
            payload: { id: fileId }
          });
        }
      } catch (e) {}
    }

    this.notify();
  }

  async deleteFilesBatch(fileIds = []) {
    if (!fileIds || fileIds.length === 0) return;
    const targetFiles = this.files.filter(f => fileIds.includes(f.id));
    this.files = this.files.filter(f => !fileIds.includes(f.id));
    fileIds.forEach(id => delete this.rawFileObjects[id]);
    this.saveLocal();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('files').delete().in('id', fileIds);
        for (const f of targetFiles) {
          if (f.url) await this.deleteStorageBucketFile(f.url);
        }
        fileIds.forEach(id => {
          if (this.realtimeStorageChannel) {
            this.realtimeStorageChannel.send({
              type: 'broadcast',
              event: 'file_deleted',
              payload: { id: id }
            });
          }
        });
      } catch (e) {}
    }

    this.notify();
  }

  async purgeAllSupabaseCloudFiles() {
    this.files = [];
    this.saveLocal();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('files').delete().neq('id', '0_keep_clean_id_9999');
        await this.purgeAllSupabaseStorageBucketFiles();

        if (this.realtimeStorageChannel) {
          this.realtimeStorageChannel.send({
            type: 'broadcast',
            event: 'file_deleted',
            payload: { id: 'ALL' }
          });
        }
      } catch (e) {
        console.warn("Supabase purge all notice:", e);
      }
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

    let cleanName = name.trim().replace(/^📁\s*/, '');

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
        const fullPayload = {
          id: newFolder.id,
          name: newFolder.name,
          category: newFolder.category,
          department: 'Phòng Kinh doanh & DVKH',
          created_by: user ? (user.name || uploaderEmail.split('@')[0]) : 'Master Admin',
          owner_uid: uploaderUid,
          date: new Date().toLocaleDateString('vi-VN'),
          files_count: 0
        };

        const { error: foldErr } = await window.supabaseClient.from('folders').upsert(fullPayload, { onConflict: 'id' });
        if (foldErr) {
          console.warn("⚠️ Supabase folder upsert notice:", foldErr.message);
        }

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

    let cleanName = newName.trim().replace(/^📁\s*/, '');

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
    if (!folderId) return;

    // 1. Find all files contained inside this folder
    const childFiles = this.files.filter(f => f.folderId === folderId || f.folder_id === folderId);
    const childFileIds = childFiles.map(f => f.id);

    // 2. Clear folder and contained files from local memory & cache
    this.folders = this.folders.filter(f => f.id !== folderId);
    if (childFileIds.length > 0) {
      this.files = this.files.filter(f => f.folderId !== folderId && f.folder_id !== folderId);
      childFileIds.forEach(id => delete this.rawFileObjects[id]);
    }
    this.saveLocal();

    // 3. Purge from Supabase Cloud (PostgreSQL DB tables + Storage Bucket)
    if (window.supabaseClient) {
      try {
        // Cascade delete all contained files from DB table 'files'
        if (childFileIds.length > 0) {
          await window.supabaseClient.from('files').delete().in('id', childFileIds);
          // Delete binary objects from Storage Bucket 'documents'
          for (const f of childFiles) {
            if (f.url) await this.deleteStorageBucketFile(f.url);
          }
        }

        // Delete folder record from DB table 'folders'
        await window.supabaseClient.from('folders').delete().eq('id', folderId);

        // Send live realtime broadcast notifications
        if (this.realtimeStorageChannel) {
          this.realtimeStorageChannel.send({
            type: 'broadcast',
            event: 'folder_deleted',
            payload: { id: folderId, deletedFileIds: childFileIds }
          });
          childFileIds.forEach(fId => {
            this.realtimeStorageChannel.send({
              type: 'broadcast',
              event: 'file_deleted',
              payload: { id: fId }
            });
          });
        }
      } catch (e) {
        console.warn("Supabase cascade deleteFolder notice:", e);
      }
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
