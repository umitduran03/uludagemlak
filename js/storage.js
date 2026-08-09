const STORAGE_KEY = 'uludagEmlak_listings';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getListings() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error parsing listings from localStorage', e);
    return [];
  }
}

function saveListings(listings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  } catch (e) {
    console.error('Error saving listings to localStorage', e);
  }
}

function addListing(data) {
  const listings = getListings();
  const newListing = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  listings.push(newListing);
  saveListings(listings);
  return newListing;
}

function updateListing(id, data) {
  const listings = getListings();
  const index = listings.findIndex(l => l.id === id);
  if (index !== -1) {
    listings[index] = {
      ...listings[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    saveListings(listings);
    return listings[index];
  }
  return null;
}

function deleteListing(id) {
  let listings = getListings();
  const initialLength = listings.length;
  listings = listings.filter(l => l.id !== id);
  if (listings.length !== initialLength) {
    saveListings(listings);
    return true;
  }
  return false;
}

function getListing(id) {
  const listings = getListings();
  return listings.find(l => l.id === id) || null;
}

window.Storage = { 
  getListings, 
  saveListings, 
  addListing, 
  updateListing, 
  deleteListing, 
  getListing, 
  generateId 
};
