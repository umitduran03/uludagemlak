// Firestore-based Storage Layer - Uludağ Emlak
const COLLECTION_NAME = 'listings';

async function getListings() {
  try {
    const snapshot = await window.db.collection(COLLECTION_NAME)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Firestore Timestamp → ISO string dönüşümü
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
    const newListing = {
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await window.db.collection(COLLECTION_NAME).add(newListing);
    return { ...newListing, id: docRef.id };
  } catch (e) {
    console.error('Firestore addListing hatası:', e);
    return null;
  }
}

async function updateListing(id, data) {
  try {
    const updateData = {
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await window.db.collection(COLLECTION_NAME).doc(id).update(updateData);
    return { id, ...updateData };
  } catch (e) {
    console.error('Firestore updateListing hatası:', e);
    return null;
  }
}

async function deleteListing(id) {
  try {
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
      return {
        id: doc.id,
        ...data,
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
