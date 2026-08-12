const LISTING_TYPE_LABELS = { satilik: 'Satılık', kiralik: 'Kiralık', gunluk: 'Günlük Kiralık' };
const PROPERTY_TYPE_LABELS = { daire: 'Daire', villa: 'Villa', mustakil: 'Müstakil Ev', arsa: 'Arsa', dukkan: 'Dükkan', ofis: 'Ofis' };
const HEATING_TYPE_LABELS = { dogalgaz: 'Doğalgaz', kombi: 'Kombi', soba: 'Soba', merkezi: 'Merkezi', klima: 'Klima', yerden: 'Yerden Isıtma' };

let currentListingImages = [];
let currentImageIndex = 0;

function formatPrice(price, listingType) {
  const formatted = new Intl.NumberFormat('tr-TR').format(price) + ' ₺';
  if (listingType === 'kiralik') return formatted + '/ay';
  if (listingType === 'gunluk') return formatted + '/gün';
  return formatted;
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function getFilteredListings() {
  let listings = await window.Storage.getListings();
  
  const typeFilter = document.getElementById('filter-type')?.value || 'all';
  const propFilter = document.getElementById('filter-property')?.value || 'all';
  const sort = document.getElementById('filter-sort')?.value || 'newest';
  
  if (typeFilter !== 'all') {
    listings = listings.filter(l => l.listingType === typeFilter);
  }
  if (propFilter !== 'all') {
    listings = listings.filter(l => l.propertyType === propFilter);
  }
  
  listings.sort((a, b) => {
    switch (sort) {
      case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      default: return 0;
    }
  });
  
  return listings;
}

function createCardHTML(listing) {
  const hasImages = listing.images && listing.images.length > 0;
  const adminHTML = window.Admin.isLoggedIn() ? `
    <div class="card-admin-actions">
      <button class="btn btn-small btn-ghost edit-btn" data-id="${listing.id}">✏️ Düzenle</button>
      <button class="btn btn-small btn-danger delete-btn" data-id="${listing.id}">🗑️ Sil</button>
    </div>` : '';

  return `
    <div class="card" data-id="${listing.id}">
      <div class="card-image">
        ${hasImages 
          ? `<img src="${listing.images[0]}" alt="${listing.title}" loading="lazy">` 
          : `<div class="card-image-placeholder">🏠</div>`}
        <span class="card-badge badge-${listing.listingType}">${LISTING_TYPE_LABELS[listing.listingType]}</span>
        <span class="card-price">${formatPrice(listing.price, listing.listingType)}</span>
      </div>
      <div class="card-info">
        <h3 class="card-title">${listing.title}</h3>
        <p class="card-location">📍 ${listing.location}</p>
        <div class="card-features">
          ${listing.rooms ? `<div class="card-feature"><span>${listing.rooms}</span><span>Oda</span></div>` : ''}
          ${listing.area ? `<div class="card-feature"><span>${listing.area} m²</span><span>Alan</span></div>` : ''}
          ${listing.floor ? `<div class="card-feature"><span>${listing.floor}.</span><span>Kat</span></div>` : ''}
        </div>
      </div>
      ${adminHTML}
    </div>
  `;
}

function showLoading() {
  const grid = document.getElementById('listings-grid');
  const emptyState = document.getElementById('empty-state');
  if (emptyState) emptyState.classList.add('hidden');
  if (grid) {
    grid.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">İlanlar yükleniyor...</p>
      </div>
    `;
  }
}

async function renderListings() {
  showLoading();
  
  const listings = await getFilteredListings();
  const grid = document.getElementById('listings-grid');
  const emptyState = document.getElementById('empty-state');
  
  if (grid) {
    grid.innerHTML = listings.map(l => createCardHTML(l)).join('');
  }
  
  if (emptyState) {
    if (listings.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
    }
  }
}

function updateGallery() {
  const galleryImg = document.getElementById('modal-gallery-img');
  const galleryCounter = document.getElementById('modal-gallery-counter');
  if (currentListingImages.length > 0) {
    if(galleryImg) galleryImg.src = currentListingImages[currentImageIndex];
    if(galleryCounter) galleryCounter.textContent = `${currentImageIndex + 1} / ${currentListingImages.length}`;
  } else {
    if(galleryImg) galleryImg.src = '';
    if(galleryCounter) galleryCounter.textContent = 'Görsel yok';
  }
}

async function openListingModal(id) {
  const listing = await window.Storage.getListing(id);
  if (!listing) return;
  
  const modal = document.getElementById('listing-modal');
  const body = document.getElementById('listing-modal-body');
  if (!modal || !body) return;
  
  currentListingImages = listing.images || [];
  currentImageIndex = 0;
  
  const wpNumber1 = '905324531171'; // Ercan ULUDAĞ
  const wpNumber2 = '905386322878'; // Hüseyin ULUDAĞ
  const wpText = encodeURIComponent(`Merhaba, ${listing.title} ilanı hakkında bilgi almak istiyorum.`);
  const wpLink1 = `https://wa.me/${wpNumber1}?text=${wpText}`;
  const wpLink2 = `https://wa.me/${wpNumber2}?text=${wpText}`;
  
  body.innerHTML = `
    <div class="detail-gallery">
      ${currentListingImages.length > 0 
        ? `<img id="modal-gallery-img" src="${currentListingImages[0]}" alt="${listing.title}">` 
        : `<div class="card-image-placeholder" style="height:400px;font-size:4rem">🏠</div>`}
      ${currentListingImages.length > 1 ? `
      <button class="gallery-nav gallery-prev" id="modal-prev-btn">❮</button>
      <button class="gallery-nav gallery-next" id="modal-next-btn">❯</button>
      <div class="gallery-counter" id="modal-gallery-counter">1 / ${currentListingImages.length}</div>` : ''}
    </div>
    
    <div class="detail-content">
      <div class="detail-header">
        <div class="detail-badges">
          <span class="card-badge badge-${listing.listingType}">${LISTING_TYPE_LABELS[listing.listingType]}</span>
          ${listing.propertyType ? `<span class="card-badge" style="background:#8E8E93">${PROPERTY_TYPE_LABELS[listing.propertyType] || listing.propertyType}</span>` : ''}
        </div>
        <h2 class="detail-title">${listing.title}</h2>
        <p class="detail-location">📍 ${listing.location}</p>
      </div>
      <p class="detail-price">${formatPrice(listing.price, listing.listingType)}</p>
      
      <div class="detail-specs">
        ${listing.propertyType ? `<div class="spec-item"><span class="spec-label">Emlak Tipi</span><span class="spec-value">${PROPERTY_TYPE_LABELS[listing.propertyType] || listing.propertyType}</span></div>` : ''}
        ${listing.rooms ? `<div class="spec-item"><span class="spec-label">Oda Sayısı</span><span class="spec-value">${listing.rooms}</span></div>` : ''}
        ${listing.area ? `<div class="spec-item"><span class="spec-label">Brüt Alan</span><span class="spec-value">${listing.area} m²</span></div>` : ''}
        ${listing.floor ? `<div class="spec-item"><span class="spec-label">Bulunduğu Kat</span><span class="spec-value">${listing.floor}</span></div>` : ''}
        ${listing.buildingAge ? `<div class="spec-item"><span class="spec-label">Bina Yaşı</span><span class="spec-value">${listing.buildingAge} Yıl</span></div>` : ''}
        ${listing.heatingType ? `<div class="spec-item"><span class="spec-label">Isıtma</span><span class="spec-value">${HEATING_TYPE_LABELS[listing.heatingType] || listing.heatingType}</span></div>` : ''}
      </div>
      
      ${listing.description ? `<div class="detail-description">${listing.description.replace(/\n/g, '<br>')}</div>` : ''}
      
      <div class="detail-actions" style="flex-direction: column; gap: 12px;">
        <p style="font-size: 0.85rem; color: #86868B; margin: 0;">Ercan ULUDAĞ</p>
        <a href="${wpLink1}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-large">📱 WhatsApp ile İletişime Geç</a>
        <p style="font-size: 0.85rem; color: #86868B; margin: 0;">Hüseyin ULUDAĞ</p>
        <a href="${wpLink2}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-large">📱 WhatsApp ile İletişime Geç</a>
      </div>
    </div>
  `;
  
  if (currentListingImages.length > 1) {
    document.getElementById('modal-prev-btn').addEventListener('click', () => {
      currentImageIndex = (currentImageIndex - 1 + currentListingImages.length) % currentListingImages.length;
      updateGallery();
    });
    document.getElementById('modal-next-btn').addEventListener('click', () => {
      currentImageIndex = (currentImageIndex + 1) % currentListingImages.length;
      updateGallery();
    });
  }
  
  modal.classList.remove('hidden');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

function setupEventListeners() {
  // Filtre değişikliklerinde debounce ile yeniden render
  ['filter-type', 'filter-property', 'filter-sort'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => renderListings());
  });
  
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) modal.classList.add('hidden');
    });
  });
  
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
      const modal = overlay.closest('.modal');
      if (modal) modal.classList.add('hidden');
    });
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach(modal => modal.classList.add('hidden'));
    }
  });
  
  const grid = document.getElementById('listings-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-btn');
      const deleteBtn = e.target.closest('.delete-btn');
      const card = e.target.closest('.card');
      
      if (editBtn) {
        window.Admin.openFormModal(editBtn.getAttribute('data-id'));
      } else if (deleteBtn) {
        window.Admin.confirmDelete(deleteBtn.getAttribute('data-id'));
      } else if (card) {
        openListingModal(card.getAttribute('data-id'));
      }
    });
  }
  
  window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (header) {
      if (window.scrollY > 50) header.classList.add('header-scrolled');
      else header.classList.remove('header-scrolled');
    }
  });
  
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }
  
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        if (navLinks) navLinks.classList.remove('active');
      }
    });
  });
}

// ==================== TESTIMONIALS ====================

function createTestimonialCardHTML(testimonial) {
  const adminHTML = window.Admin.isLoggedIn() ? `
    <div class="testimonial-admin-actions">
      <button class="btn btn-small btn-ghost testimonial-edit-btn" data-id="${testimonial.id}">✏️ Düzenle</button>
      <button class="btn btn-small btn-danger testimonial-delete-btn" data-id="${testimonial.id}">🗑️ Sil</button>
    </div>` : '';

  return `
    <div class="testimonial-card" data-id="${testimonial.id}">
      <div class="testimonial-image-wrapper">
        ${testimonial.image 
          ? `<img src="${testimonial.image}" alt="${testimonial.title}" class="testimonial-image" loading="lazy">` 
          : `<div class="testimonial-image-placeholder">👤</div>`}
      </div>
      <h3 class="testimonial-name">${testimonial.title}</h3>
      <p class="testimonial-text">${testimonial.description}</p>
      ${adminHTML}
    </div>
  `;
}

async function renderTestimonials() {
  const grid = document.getElementById('testimonials-grid');
  const emptyState = document.getElementById('testimonials-empty');
  if (!grid) return;

  grid.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Yorumlar yükleniyor...</p>
    </div>
  `;

  const testimonials = await window.Storage.getTestimonials();

  grid.innerHTML = testimonials.map(t => createTestimonialCardHTML(t)).join('');

  if (emptyState) {
    if (testimonials.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
    }
  }
}

function setupTestimonialEvents() {
  const grid = document.getElementById('testimonials-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.testimonial-edit-btn');
      const deleteBtn = e.target.closest('.testimonial-delete-btn');

      if (editBtn) {
        window.Admin.openTestimonialModal(editBtn.getAttribute('data-id'));
      } else if (deleteBtn) {
        window.Admin.confirmDeleteTestimonial(deleteBtn.getAttribute('data-id'));
      }
    });
  }
}

async function init() {
  setupEventListeners();
  setupTestimonialEvents();
  if (window.Admin) window.Admin.setupAdminEvents();
  await renderListings();
  await renderTestimonials();
}

document.addEventListener('DOMContentLoaded', init);

window.App = { renderListings, openListingModal, formatPrice, init, renderTestimonials };
