// ==========================================================================
// FILE STORAGE & DUAL VAULT MANAGER SERVICE (LIVE CLOUD FIRESTORE + STORAGE)
// ==========================================================================

const INITIAL_FILES = [
  {
    id: "f1",
    name: "Quy trình thiết kế hệ thống.pdf",
    type: "PDF",
    sizeBytes: 4404019,
    sizeFormatted: "4.2 MB",
    uploadedBy: "Nguyễn Văn Tuấn",
    uploaderUid: "admin_tuan_001",
    uploadDate: "10/06/2026 10:30",
    category: "department",
    url: "#",
    tags: ["Kỹ thuật", "Hệ thống"]
  },
  {
    id: "f2",
    name: "Báo cáo dự án Q2.docx",
    type: "DOCX",
    sizeBytes: 2936012,
    sizeFormatted: "2.8 MB",
    uploadedBy: "Trần Minh Anh",
    uploaderUid: "member_anh_002",
    uploadDate: "10/06/2026 09:15",
    category: "personal",
    url: "#",
    tags: ["Báo cáo", "Q2"]
  },
  {
    id: "f3",
    name: "Mockup giao diện.ai",
    type: "AI",
    sizeBytes: 16462592,
    sizeFormatted: "15.7 MB",
    uploadedBy: "Lê Hoàng Nam",
    uploaderUid: "member_nam_003",
    uploadDate: "09/06/2026 16:45",
    category: "personal",
    url: "#",
    tags: ["Thiết kế", "UI/UX"]
  },
  {
    id: "f4",
    name: "Danh sách yêu cầu tính năng.xlsx",
    type: "XLSX",
    sizeBytes: 1677721,
    sizeFormatted: "1.6 MB",
    uploadedBy: "Phạm Thị Mai",
    uploaderUid: "member_mai_004",
    uploadDate: "09/06/2026 14:20",
    category: "department",
    url: "#",
    tags: ["Phòng Kế hoạch"]
  },
  {
    id: "f5",
    name: "Hướng dẫn sử dụng.pdf",
    type: "PDF",
    sizeBytes: 3460300,
    sizeFormatted: "3.3 MB",
    uploadedBy: "Nguyễn Văn Tuấn",
    uploaderUid: "admin_tuan_001",
    uploadDate: "08/06/2026 11:05",
    category: "department",
    url: "#",
    tags: ["Quy trình", "Chung"]
  },
  {
    id: "f6",
    name: "Biểu mẫu đăng ký.docx",
    type: "DOCX",
    sizeBytes: 1153433,
    sizeFormatted: "1.1 MB",
    uploadedBy: "Trần Minh Anh",
    uploaderUid: "member_anh_002",
    uploadDate: "08/06/2026 09:50",
    category: "department",
    url: "#",
    tags: ["Hành chính"]
  },
  {
    id: "f7",
    name: "Ảnh chụp hiện trạng.jpg",
    type: "JPG",
    sizeBytes: 2516582,
    sizeFormatted: "2.4 MB",
    uploadedBy: "Lê Hoàng Nam",
    uploaderUid: "member_nam_003",
    uploadDate: "07/06/2026 15:30",
    category: "personal",
    url: "#",
    tags: ["Khảo sát"]
  }
];

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
        this.files = JSON.parse(saved);
      } catch (e) {
        this.files = INITIAL_FILES;
      }
    } else {
      this.files = INITIAL_FILES;
      this.saveLocal();
    }

    // Subscribe to Live Cloud Firestore files collection
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        firebase.firestore().collection("files").onSnapshot(snapshot => {
          if (!snapshot.empty) {
            const cloudFiles = [];
            snapshot.forEach(doc => cloudFiles.push({ id: doc.id, ...doc.data() }));
            // Merge cloud files into list
            cloudFiles.forEach(cf => {
              if (!this.files.some(f => f.id === cf.id)) {
                this.files.unshift(cf);
              }
            });
            this.notify();
          }
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
      const user = window.authManager.getCurrentUser();
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
    const currentUser = window.authManager.getCurrentUser() || { name: "Nguyễn Văn Tuấn", uid: "admin_tuan_001" };
    
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
      uploadedBy: currentUser.name,
      uploaderUid: currentUser.uid,
      uploadDate: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
      category: category,
      url: "#",
      tags: ["Cloud Upload"]
    };

    this.files.unshift(newFile);
    this.saveLocal();
    this.notify();

    // Push live metadata to Cloud Firestore if connected
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        await firebase.firestore().collection("files").doc(newFile.id).set(newFile);
        console.log("☁️ File metadata saved to Cloud Firestore!");
      } catch (err) {
        console.warn("Firestore upload sync notice:", err.message);
      }
    }

    return newFile;
  }

  async deleteFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return false;

    const user = window.authManager.getCurrentUser();
    if (window.authManager.isAdmin() || (user && file.uploaderUid === user.uid)) {
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
      alert("⚠️ Bạn không có quyền xóa tài liệu của phòng ban hoặc của người khác. Vui lòng liên hệ Admin!");
      return false;
    }
  }

  getStorageStats() {
    return {
      totalFiles: 1248 + this.files.length - INITIAL_FILES.length,
      usedGB: 128.4,
      maxGB: 500,
      percentage: 25,
      sharedFiles: 342
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
