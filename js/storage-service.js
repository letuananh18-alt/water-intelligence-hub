// ==========================================================================
// FILE STORAGE & DUAL VAULT MANAGER SERVICE (KDDVKH ENHANCED)
// ==========================================================================

class StorageService {
  constructor() {
    this.files = [];
    this.folders = [
      { id: "fold_1", name: "Hợp đồng Dịch vụ Khách hàng 2026", department: "dept_kddvkh", createdBy: "Lê Tuấn Anh", date: "10/06/2026", filesCount: 0 },
      { id: "fold_2", name: "Báo cáo Doanh thu & Cấp nước KDDVKH", department: "dept_kddvkh", createdBy: "Lê Tuấn Anh", date: "12/06/2026", filesCount: 0 },
      { id: "fold_3", name: "Biểu giá & Quy trình Dịch vụ Khách hàng", department: "dept_kddvkh", createdBy: "Lê Tuấn Anh", date: "15/06/2026", filesCount: 0 }
    ];
    this.listeners = [];
    this.init();
  }

  init() {
    const savedFiles = localStorage.getItem('thuduc_water_files');
    if (savedFiles) {
      try {
        this.files = JSON.parse(savedFiles).filter(f => f.tags && f.tags.includes('Tệp thực tế'));
      } catch (e) {
        this.files = [];
      }
    }

    const savedFolders = localStorage.getItem('thuduc_water_folders');
    if (savedFolders) {
      try {
        this.folders = JSON.parse(savedFolders);
      } catch (e) {}
    }

    this.saveLocal();

    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        firebase.firestore().collection("files").onSnapshot(snapshot => {
          const cloudFiles = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.tags && data.tags.includes('Tệp thực tế')) {
              cloudFiles.push({ id: doc.id, ...data });
            }
          });
          if (cloudFiles.length > 0) {
            this.files = cloudFiles;
            this.saveLocal();
            this.notify();
          }
        }, err => console.warn("Firestore files notice:", err));

        firebase.firestore().collection("folders").onSnapshot(snapshot => {
          const cloudFolders = [];
          snapshot.forEach(doc => cloudFolders.push({ id: doc.id, ...doc.data() }));
          if (cloudFolders.length > 0) {
            this.folders = cloudFolders;
            this.saveLocal();
            this.notify();
          }
        }, err => console.warn("Firestore folders notice:", err));
      } catch (e) {}
    }
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

  async addFile(fileObj, category = 'personal', folderId = null, docType = 'Hợp đồng cấp nước', statusTag = '🟢 Đã ban hành') {
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
    
    let fileUrl = "#";
    try {
      fileUrl = URL.createObjectURL(fileObj);
    } catch (e) {}

    const newFile = {
      id: "f_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      name: fileObj.name,
      type: ext || "FILE",
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
      tags: ["Tệp thực tế"]
    };

    this.files.unshift(newFile);

    // Update folder file count
    if (folderId) {
      const fold = this.folders.find(f => f.id === folderId);
      if (fold) fold.filesCount = (fold.filesCount || 0) + 1;
    }

    this.saveLocal();
    this.notify();

    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection("files").doc(newFile.id).set({
          ...newFile,
          url: "#"
        });
      } catch (err) {
        console.warn("Firestore upload notice:", err);
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

    if (isAdmin || (user && file.uploaderUid === user.uid && file.category === 'personal')) {
      if (file.folderId) {
        const fold = this.folders.find(f => f.id === file.folderId);
        if (fold && fold.filesCount > 0) fold.filesCount -= 1;
      }

      this.files = this.files.filter(f => f.id !== fileId);
      this.saveLocal();
      this.notify();

      if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
          await firebase.firestore().collection("files").doc(fileId).delete();
        } catch (e) {}
      }
      return true;
    } else {
      alert("⛔ Bị từ chối: Bạn không có quyền xóa tài liệu của người khác.");
      return false;
    }
  }

  getFolders() {
    return this.folders;
  }

  async createFolder(name) {
    const currentUser = (window.authManager && window.authManager.getCurrentUser()) || { name: "Lê Tuấn Anh" };
    const newFolder = {
      id: "fold_" + Date.now(),
      name: name.trim(),
      department: "dept_kddvkh",
      createdBy: currentUser.name || currentUser.email,
      date: new Date().toLocaleDateString('vi-VN'),
      filesCount: 0
    };

    this.folders.unshift(newFolder);
    this.saveLocal();
    this.notify();

    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection("folders").doc(newFolder.id).set(newFolder);
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

      if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
          await firebase.firestore().collection("folders").doc(folderId).update({ name: newName.trim() });
        } catch (e) {}
      }
    }
  }

  async deleteFolder(folderId) {
    this.folders = this.folders.filter(f => f.id !== folderId);
    this.files = this.files.filter(f => f.folderId !== folderId);
    this.saveLocal();
    this.notify();

    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection("folders").doc(folderId).delete();
      } catch (e) {}
    }
  }

  getStorageStats() {
    const totalBytes = this.files.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    const maxGB = 500;
    const percentage = Math.min(100, Math.round((totalGB / maxGB) * 100));

    return {
      totalFiles: this.files.length,
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
