// Firestore-based Storage Layer - Uludağ Emlak
const COLLECTION_NAME = 'listings';
const IMAGES_SUBCOLLECTION = 'images';
const MAX_CHUNK_BYTES = 800000; // 800KB per chunk document

// ==================== IMAGE CHUNKING ====================

// Fotoğrafları boyut bazlı chunk'lara ayır
function chunkImages(images) {
  const chunks = [];
  let currentChunk = [];
  let currentSize = 0;
  
  for (const img of images) {
    const imgSize = new Blob([img]).size;
    
    // Eğer tek bir fotoğraf bile 800KB'den büyükse kendi chunk'ına koy
    if (imgSize >= MAX_CHUNK_BYTES) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentSize = 0;
      }
      chunks.push([img]);
      continue;
    }
    
    // Mevcut chunk'a sığıyorsa ekle
    if (currentSize + imgSize < MAX_CHUNK_BYTES) {
      currentChunk.push(img);
      currentSize += imgSize;
    } else {
      // Sığmıyorsa mevcut chunk'ı kaydet, yeni chunk başlat
      chunks.push(currentChunk);
      currentChunk = [img];
      currentSize = imgSize;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Subcollection'a fotoğraf chunk'larını kaydet
async function saveImageChunks(listingId, images) {
  const chunks = chunkImages(images);
  const batch = window.db.batch();
  const imagesRef = window.db.collection(COLLECTION_NAME).doc(listingId).collection(IMAGES_SUBCOLLECTION);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkDoc = imagesRef.doc(`chunk_${i}`);
    batch.set(chunkDoc, {
      images: chunks[i],
      order: i
    });
  }
  
  await batch.commit();
}

// Subcollection'dan tüm fotoğrafları yükle (sıralı)
async function loadImageChunks(listingId) {
  try {
    const snapshot = await window.db.collection(COLLECTION_NAME)
      .doc(listingId)
      .collection(IMAGES_SUBCOLLECTION)
      .orderBy('order', 'asc')
      .get();
    
    let allImages = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.images && Array.isArray(data.images)) {
        allImages = allImages.concat(data.images);
      }
    });
    
    return allImages;
  } catch (e) {
    console.error('Fotoğraf yükleme hatası:', e);
    return [];
  }
}

// Subcollection'daki tüm fotoğraf chunk'larını sil
async function deleteImageChunks(listingId) {
  try {
    const snapshot = await window.db.collection(COLLECTION_NAME)
      .doc(listingId)
      .collection(IMAGES_SUBCOLLECTION)
      .get();
    
    const batch = window.db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    if (snapshot.docs.length > 0) {
      await batch.commit();
    }
  } catch (e) {
    console.error('Fotoğraf silme hatası:', e);
  }
}

// ==================== LISTINGS ====================

async function getListings() {
  try {
    const snapshot = await window.db.collection(COLLECTION_NAME)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() ? doc.data().updatedAt.toDate().toISOString() : doc.data().updatedAt
    }));
  } catch (e) {
    console.error('Firestore getListings hatası:', e);
    return [];
  }
}

async function addListing(data) {
  try {
    // Fotoğrafları ayır
    const images = data.images || [];
    const thumbnail = images.length > 0 ? images[0] : null;
    
    // Ana doküman: fotoğrafsız (sadece thumbnail)
    const listingData = {
      ...data,
      images: [], // Artık ana dokümanda tutulmayacak
      thumbnail: thumbnail,
      imageCount: images.length,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await window.db.collection(COLLECTION_NAME).add(listingData);
    
    // Fotoğrafları subcollection'a kaydet
    if (images.length > 0) {
      await saveImageChunks(docRef.id, images);
    }
    
    return { ...listingData, id: docRef.id, images: images };
  } catch (e) {
    console.error('Firestore addListing hatası:', e);
    return null;
  }
}

async function updateListing(id, data) {
  try {
    // Fotoğrafları ayır
    const images = data.images || [];
    const thumbnail = images.length > 0 ? images[0] : null;
    
    // Ana doküman: fotoğrafsız (sadece thumbnail)
    const updateData = {
      ...data,
      images: [], // Artık ana dokümanda tutulmayacak
      thumbnail: thumbnail,
      imageCount: images.length,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await window.db.collection(COLLECTION_NAME).doc(id).update(updateData);
    
    // Eski fotoğraf chunk'larını sil, yenilerini kaydet
    await deleteImageChunks(id);
    if (images.length > 0) {
      await saveImageChunks(id, images);
    }
    
    return { id, ...updateData, images: images };
  } catch (e) {
    console.error('Firestore updateListing hatası:', e);
    return null;
  }
}

async function deleteListing(id) {
  try {
    // Önce fotoğraf chunk'larını sil
    await deleteImageChunks(id);
    // Sonra ana dokümanı sil
    await window.db.collection(COLLECTION_NAME).doc(id).delete();
    return true;
  } catch (e) {
    console.error('Firestore deleteListing hatası:', e);
    return false;
  }
}

async function getListing(id) {
  try {
    const doc = await window.db.collection(COLLECTION_NAME).doc(id).get();
    if (doc.exists) {
      const data = doc.data();
      
      // Fotoğrafları subcollection'dan yükle
      const images = await loadImageChunks(id);
      
      // Eğer subcollection boşsa ama ana dokümanda eski images varsa (geriye uyumluluk)
      const finalImages = images.length > 0 ? images : (data.images || []);
      
      return {
        id: doc.id,
        ...data,
        images: finalImages,
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt
      };
    }
    return null;
  } catch (e) {
    console.error('Firestore getListing hatası:', e);
    return null;
  }
}

// ==================== TESTIMONIALS ====================
const TESTIMONIALS_COLLECTION = 'testimonials';

async function getTestimonials() {
  try {
    const snapshot = await window.db.collection(TESTIMONIALS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() ? doc.data().updatedAt.toDate().toISOString() : doc.data().updatedAt
    }));
  } catch (e) {
    console.error('Firestore getTestimonials hatası:', e);
    return [];
  }
}

async function addTestimonial(data) {
  try {
    const newItem = {
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await window.db.collection(TESTIMONIALS_COLLECTION).add(newItem);
    return { ...newItem, id: docRef.id };
  } catch (e) {
    console.error('Firestore addTestimonial hatası:', e);
    return null;
  }
}

async function updateTestimonial(id, data) {
  try {
    const updateData = {
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await window.db.collection(TESTIMONIALS_COLLECTION).doc(id).update(updateData);
    return { id, ...updateData };
  } catch (e) {
    console.error('Firestore updateTestimonial hatası:', e);
    return null;
  }
}

async function deleteTestimonial(id) {
  try {
    await window.db.collection(TESTIMONIALS_COLLECTION).doc(id).delete();
    return true;
  } catch (e) {
    console.error('Firestore deleteTestimonial hatası:', e);
    return false;
  }
}

window.Storage = { 
  getListings, 
  addListing, 
  updateListing, 
  deleteListing, 
  getListing,
  getTestimonials,
  addTestimonial,
  updateTestimonial,
  deleteTestimonial
};
