// ==========================================================================
// FILE STORAGE & DUAL VAULT MANAGER SERVICE (STRICT RBAC PERMISSIONS)
// ==========================================================================

class StorageService {
  constructor() {
    this.files = [];
    this.listeners = [];
    this.init();
  }

  init() {
    const saved = localStorage.getItem('thuduc_water_files');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.files = parsed.filter(f => f.tags && f.tags.includes('Tệp thực tế'));
      } catch (e) {
        this.files = [];
      }
    } else {
      this.files = [];
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
          this.files = cloudFiles;
          this.saveLocal();
          this.notify();
        }, err => {
          console.warn("Firestore snapshot notice:", err.message);
        });
      } catch (e) {}
    }
  }

  saveLocal() {
    localStorage.setItem('thuduc_water_files', JSON.stringify(this.files));
  }

  getFiles(category = 'all', searchQuery = '', typeFilter = 'all') {
    let list = [...this.files];

    if (category === 'personal') {
      const user = window.authManager ? window.authManager.getCurrentUser() : null;
      list = list.filter(f => f.category === 'personal' || (user && f.uploaderUid === user.uid));
    } else if (category === 'department') {
      list = list.filter(f => f.category === 'department');
    }

    if (typeFilter && typeFilter !== 'all') {
      list = list.filter(f => f.type.toLowerCase() === typeFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q) || f.uploadedBy.toLowerCase().includes(q));
    }

    return list;
  }

  async addFile(fileObj, category = 'personal') {
    const currentUser = (window.authManager && window.authManager.getCurrentUser()) || { name: "Client User", uid: "user_client" };
    const isAdmin = window.authManager && window.authManager.isAdmin();

    // STRICT RBAC CHECK: Client CANNOT upload to Department Vault
    if (category === 'department' && !isAdmin) {
      alert("⛔ Bị từ chối: Client không có quyền tải lên Kho nội bộ phòng ban! Chỉ Admin (letuananh18@gmail.com) mới được phép.");
      return null;
    }

    let formattedSize = (fileObj.size / (1024 * 1024)).toFixed(1) + " MB";
    if (fileObj.size < 1024 * 1024) {
      formattedSize = Math.round(fileObj.size / 1024) + " KB";
    }

    const ext = fileObj.name.split('.').pop().toUpperCase();

    const newFile = {
      id: "f_" + Date.now(),
      name: fileObj.name,
      type: ext || "FILE",
      sizeBytes: fileObj.size,
      sizeFormatted: formattedSize,
      uploadedBy: currentUser.name || currentUser.email,
      uploaderUid: currentUser.uid,
      uploadDate: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
      category: category,
      url: "#",
      tags: ["Tệp thực tế"]
    };

    this.files.unshift(newFile);
    this.saveLocal();
    this.notify();

    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection("files").doc(newFile.id).set(newFile);
      } catch (err) {
        console.warn("Firestore upload sync notice:", err.message);
      }
    }

    return newFile;
  }

  async deleteFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return false;

    const user = window.authManager ? window.authManager.getCurrentUser() : null;
    const isAdmin = window.authManager && window.authManager.isAdmin();

    // STRICT RBAC CHECK: Client CANNOT delete files in Department Vault or belonging to others
    if (file.category === 'department' && !isAdmin) {
      alert("⛔ Bị từ chối: Client không có quyền xóa hoặc sửa đổi tài liệu trong Kho nội bộ phòng ban! Chỉ Admin (letuananh18@gmail.com) mới có quyền.");
      return false;
    }

    if (isAdmin || (user && file.uploaderUid === user.uid && file.category === 'personal')) {
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
