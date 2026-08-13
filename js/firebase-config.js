// Firebase Configuration - Uludağ Emlak
// CDN compat sürümü kullanıyoruz (index.html'de yükleniyor)

const firebaseConfig = {
  apiKey: "AIzaSyBDcMsSHBZTPAnLJV96M_vRn_WDJy4Bexs",
  authDomain: "uludagemlak-b5c3d.firebaseapp.com",
  projectId: "uludagemlak-b5c3d",
  storageBucket: "uludagemlak-b5c3d.firebasestorage.app",
  messagingSenderId: "272992167641",
  appId: "1:272992167641:web:05aae16d759a7954f240c8"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Firestore referansı
const db = firebase.firestore();

// Auth referansı
const auth = firebase.auth();

// Global erişim
window.db = db;
window.auth = auth;
