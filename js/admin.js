const ADMIN_PASSWORD_HASH = 'a9db1a046faf39014d57d36394b9c6c96a36ba6c69d9f52bcf13a6ecc78217d2'; // SHA-256 of 'uludag2026'
let currentImages = [];

async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function verifyPassword(password) {
  const hash = await hashPassword(password);
  return hash === ADMIN_PASSWORD_HASH;
}

function login() {
  sessionStorage.setItem('uludagEmlak_admin', 'true');
  const adminControls = document.getElementById('admin-controls');
  if(adminControls) adminControls.classList.remove('hidden');
  document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  document.querySelectorAll('.card-admin-actions').forEach(el => el.classList.remove('hidden'));
  document.body.classList.add('admin-mode');
}

function logout() {
  sessionStorage.removeItem('uludagEmlak_admin');
  const adminControls = document.getElementById('admin-controls');
  if(adminControls) adminControls.classList.add('hidden');
  document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.card-admin-actions').forEach(el => el.classList.add('hidden'));
  document.body.classList.remove('admin-mode');
  if(window.App) window.App.renderListings();
}

function isLoggedIn() {
  return sessionStorage.getItem('uludagEmlak_admin') === 'true';
}

function compressImage(file, maxWidth = 600, quality = 0.5) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // WebP destekleniyorsa WebP kullan, yoksa JPEG fallback
        const webpData = canvas.toDataURL('image/webp', quality);
        if (webpData.startsWith('data:image/webp')) {
          resolve(webpData);
        } else {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderImagePreview() {
  const previewContainer = document.getElementById('image-preview');
  if (!previewContainer) return;
  previewContainer.innerHTML = '';
  currentImages.forEach((imgSrc, index) => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.margin = '5px';
    
    const img = document.createElement('img');
    img.src = imgSrc;
    img.style.width = '100px';
    img.style.height = '100px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '8px';
    
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '×';
    removeBtn.className = 'btn btn-danger btn-small';
    removeBtn.style.position = 'absolute';
    removeBtn.style.top = '0';
    removeBtn.style.right = '0';
    removeBtn.style.padding = '2px 6px';
    removeBtn.onclick = (e) => {
      e.preventDefault();
      currentImages.splice(index, 1);
      renderImagePreview();
    };
    
    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    previewContainer.appendChild(wrapper);
  });
}

async function openFormModal(listingId = null) {
  const modal = document.getElementById('admin-form-modal');
  const form = document.getElementById('admin-form');
  const title = document.getElementById('admin-form-title');
  currentImages = [];
  
  if (form) form.reset();
  
  if (listingId) {
    if(title) title.textContent = 'İlanı Düzenle';
    form.setAttribute('data-editing-id', listingId);
    const listing = await window.Storage.getListing(listingId);
    if (listing) {
      document.getElementById('form-title').value = listing.title || '';
      document.getElementById('form-price').value = listing.price || '';
      document.getElementById('form-location').value = listing.location || '';
      document.getElementById('form-listing-type').value = listing.listingType || '';
      document.getElementById('form-property-type').value = listing.propertyType || '';
      document.getElementById('form-rooms').value = listing.rooms || '';
      document.getElementById('form-area').value = listing.area || '';
      document.getElementById('form-floor').value = listing.floor || '';
      document.getElementById('form-building-age').value = listing.buildingAge || '';
      document.getElementById('form-heating').value = listing.heatingType || '';
      document.getElementById('form-description').value = listing.description || '';
      currentImages = listing.images ? [...listing.images] : [];
    }
  } else {
    if(title) title.textContent = 'Yeni İlan Ekle';
    form.removeAttribute('data-editing-id');
  }
  
  renderImagePreview();
  if (modal) modal.classList.remove('hidden');
}

function closeFormModal() {
  const modal = document.getElementById('admin-form-modal');
  const form = document.getElementById('admin-form');
  if (form) {
    form.reset();
    form.removeAttribute('data-editing-id');
  }
  currentImages = [];
  renderImagePreview();
  if (modal) modal.classList.add('hidden');
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  // Kaydet butonunu devre dışı bırak
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Kaydediliyor...';
  }
  
  try {
    const fileInput = document.getElementById('form-images');
    if (fileInput && fileInput.files.length > 0) {
      const files = Array.from(fileInput.files);
      for (const file of files) {
        const compressed = await compressImage(file);
        currentImages.push(compressed);
      }
    }
    
    const data = {
      title: document.getElementById('form-title').value,
      price: parseFloat(document.getElementById('form-price').value),
      location: document.getElementById('form-location').value,
      listingType: document.getElementById('form-listing-type').value,
      propertyType: document.getElementById('form-property-type').value,
      rooms: document.getElementById('form-rooms').value,
      area: parseFloat(document.getElementById('form-area').value),
      floor: parseInt(document.getElementById('form-floor').value) || 0,
      buildingAge: parseInt(document.getElementById('form-building-age').value) || 0,
      heatingType: document.getElementById('form-heating').value,
      description: document.getElementById('form-description').value,
      images: currentImages
    };
    
    const form = document.getElementById('admin-form');
    const editingId = form.getAttribute('data-editing-id');
    
    if (editingId) {
      await window.Storage.updateListing(editingId, data);
      showToast('İlan güncellendi');
    } else {
      await window.Storage.addListing(data);
      showToast('Yeni ilan eklendi');
    }
    
    closeFormModal();
    if(window.App) await window.App.renderListings();
  } catch (error) {
    console.error('Form kaydetme hatası:', error);
    showToast('Bir hata oluştu!', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kaydet';
    }
  }
}

async function confirmDelete(id) {
  const modal = document.getElementById('delete-modal');
  const confirmBtn = document.getElementById('delete-confirm');
  if (modal && confirmBtn) {
    modal.classList.remove('hidden');
    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Siliniyor...';
      try {
        await window.Storage.deleteListing(id);
        modal.classList.add('hidden');
        if(window.App) await window.App.renderListings();
        showToast('İlan silindi');
      } catch (error) {
        console.error('Silme hatası:', error);
        showToast('Silme işlemi başarısız!', 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Evet, Sil';
      }
    };
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.right = '20px';
  toast.style.padding = '12px 24px';
  toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
  toast.style.color = 'white';
  toast.style.borderRadius = '8px';
  toast.style.zIndex = '9999';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  toast.style.transition = 'opacity 0.3s ease';
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function setupAdminEvents() {
  if (isLoggedIn()) login();
  
  const logoBtn = document.getElementById('logo-btn');
  const pwModal = document.getElementById('password-modal');
  const pwSubmit = document.getElementById('password-submit');
  const pwInput = document.getElementById('password-input');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const addBtn = document.getElementById('admin-add-btn');
  const form = document.getElementById('admin-form');
  const formCancel = document.getElementById('form-cancel');
  const deleteCancel = document.getElementById('delete-cancel');
  const imageInput = document.getElementById('form-images');
  
  if (logoBtn) {
    logoBtn.addEventListener('click', (e) => {
      if(!isLoggedIn() && pwModal) pwModal.classList.remove('hidden');
    });
  }
  
  const pwError = document.getElementById('password-error');

  const handleLogin = async () => {
    if (pwInput && await verifyPassword(pwInput.value)) {
      login();
      if(pwModal) pwModal.classList.add('hidden');
      if(pwError) pwError.classList.add('hidden');
      pwInput.value = '';
      showToast('Giriş başarılı');
      if(window.App) await window.App.renderListings();
    } else {
      if(pwError) pwError.classList.remove('hidden');
      if(pwInput) pwInput.focus();
    }
  };
  
  if (pwSubmit) pwSubmit.addEventListener('click', handleLogin);
  if (pwInput) pwInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    logout();
    showToast('Çıkış yapıldı');
  });
  
  if (addBtn) addBtn.addEventListener('click', () => openFormModal());
  if (form) form.addEventListener('submit', handleFormSubmit);
  if (formCancel) formCancel.addEventListener('click', closeFormModal);
  
  if (deleteCancel) deleteCancel.addEventListener('click', () => {
    const modal = document.getElementById('delete-modal');
    if (modal) modal.classList.add('hidden');
  });
  
  if (imageInput) {
    imageInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        const compressed = await compressImage(file);
        currentImages.push(compressed);
      }
      renderImagePreview();
      e.target.value = ''; // Reset input
    });
  }

  // Testimonial event listeners
  const testimonialAddBtn = document.getElementById('testimonial-add-btn');
  const testimonialForm = document.getElementById('testimonial-form');
  const testimonialFormCancel = document.getElementById('testimonial-form-cancel');
  const testimonialDeleteCancel = document.getElementById('testimonial-delete-cancel');

  if (testimonialAddBtn) testimonialAddBtn.addEventListener('click', () => openTestimonialModal());
  if (testimonialForm) testimonialForm.addEventListener('submit', handleTestimonialSubmit);
  if (testimonialFormCancel) testimonialFormCancel.addEventListener('click', closeTestimonialModal);
  if (testimonialDeleteCancel) {
    testimonialDeleteCancel.addEventListener('click', () => {
      const modal = document.getElementById('testimonial-delete-modal');
      if (modal) modal.classList.add('hidden');
    });
  }
}

// ==================== TESTIMONIAL YÖNETİMİ ====================

let currentTestimonialImage = '';

async function openTestimonialModal(testimonialId = null) {
  const modal = document.getElementById('testimonial-form-modal');
  const form = document.getElementById('testimonial-form');
  const title = document.getElementById('testimonial-form-title');
  const imagePreview = document.getElementById('testimonial-image-preview');
  currentTestimonialImage = '';

  if (form) form.reset();
  if (imagePreview) imagePreview.innerHTML = '';

  if (testimonialId) {
    if (title) title.textContent = 'Yorumu Düzenle';
    form.setAttribute('data-editing-id', testimonialId);
    const testimonials = await window.Storage.getTestimonials();
    const testimonial = testimonials.find(t => t.id === testimonialId);
    if (testimonial) {
      document.getElementById('testimonial-title').value = testimonial.title || '';
      document.getElementById('testimonial-description').value = testimonial.description || '';
      if (testimonial.image) {
        currentTestimonialImage = testimonial.image;
        renderTestimonialImagePreview();
      }
    }
  } else {
    if (title) title.textContent = 'Yeni Müşteri Yorumu Ekle';
    form.removeAttribute('data-editing-id');
  }

  if (modal) modal.classList.remove('hidden');
}

function closeTestimonialModal() {
  const modal = document.getElementById('testimonial-form-modal');
  const form = document.getElementById('testimonial-form');
  if (form) {
    form.reset();
    form.removeAttribute('data-editing-id');
  }
  currentTestimonialImage = '';
  const imagePreview = document.getElementById('testimonial-image-preview');
  if (imagePreview) imagePreview.innerHTML = '';
  if (modal) modal.classList.add('hidden');
}

function renderTestimonialImagePreview() {
  const previewContainer = document.getElementById('testimonial-image-preview');
  if (!previewContainer) return;
  previewContainer.innerHTML = '';
  if (currentTestimonialImage) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.margin = '5px';

    const img = document.createElement('img');
    img.src = currentTestimonialImage;
    img.style.width = '100px';
    img.style.height = '100px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '50%';

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '×';
    removeBtn.className = 'btn btn-danger btn-small';
    removeBtn.style.position = 'absolute';
    removeBtn.style.top = '0';
    removeBtn.style.right = '0';
    removeBtn.style.padding = '2px 6px';
    removeBtn.onclick = (e) => {
      e.preventDefault();
      currentTestimonialImage = '';
      renderTestimonialImagePreview();
    };

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    previewContainer.appendChild(wrapper);
  }
}

async function handleTestimonialSubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Kaydediliyor...';
  }

  try {
    const fileInput = document.getElementById('testimonial-image-input');
    if (fileInput && fileInput.files.length > 0) {
      currentTestimonialImage = await compressImage(fileInput.files[0]);
    }

    const data = {
      title: document.getElementById('testimonial-title').value,
      description: document.getElementById('testimonial-description').value,
      image: currentTestimonialImage
    };

    const form = document.getElementById('testimonial-form');
    const editingId = form.getAttribute('data-editing-id');

    if (editingId) {
      await window.Storage.updateTestimonial(editingId, data);
      showToast('Yorum güncellendi');
    } else {
      await window.Storage.addTestimonial(data);
      showToast('Yeni yorum eklendi');
    }

    closeTestimonialModal();
    if (window.App) await window.App.renderTestimonials();
  } catch (error) {
    console.error('Testimonial kaydetme hatası:', error);
    showToast('Bir hata oluştu!', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kaydet';
    }
  }
}

async function confirmDeleteTestimonial(id) {
  const modal = document.getElementById('testimonial-delete-modal');
  const confirmBtn = document.getElementById('testimonial-delete-confirm');
  if (modal && confirmBtn) {
    modal.classList.remove('hidden');
    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Siliniyor...';
      try {
        await window.Storage.deleteTestimonial(id);
        modal.classList.add('hidden');
        if (window.App) await window.App.renderTestimonials();
        showToast('Yorum silindi');
      } catch (error) {
        console.error('Testimonial silme hatası:', error);
        showToast('Silme işlemi başarısız!', 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Evet, Sil';
      }
    };
  }
}

window.Admin = { setupAdminEvents, login, logout, isLoggedIn, openFormModal, confirmDelete, showToast, openTestimonialModal, confirmDeleteTestimonial };
