/**
 * КАТАЛОГ СТАЛЬНЫХ ДВЕРЕЙ - APP LOGIC
 */

document.addEventListener('DOMContentLoaded', () => {
  const doors = window.DOORS_DATA || [];
  if (!doors.length) {
    console.error('DOORS_DATA is empty or not loaded.');
    return;
  }

  // --- STATE ---
  const state = {
    search: '',
    sort: 'price-asc', // Default sort (no "по популярности")
    filters: {
      price: new Set(),
      minPrice: null,
      maxPrice: null,
      trim: new Set(),
      construction: new Set(),
      purpose: new Set()
    },
    pageSize: 24,
    renderedCount: 24,
    filteredDoors: [...doors],
    currentModalIndex: -1,
    activeGalleryImg: '',
    isHeroDoorOpen: false
  };

  // --- DOM ELEMENTS ---
  const doorsGrid = document.getElementById('doorsGrid');
  const resultsCount = document.getElementById('resultsCount');
  const totalCountEl = document.getElementById('totalCount');
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClear');
  const sortSelect = document.getElementById('sortSelect');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const loadMoreBox = document.getElementById('loadMoreBox');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const activeChipsBar = document.getElementById('activeChipsBar');
  
  // Custom price inputs
  const minPriceInput = document.getElementById('minPriceInput');
  const maxPriceInput = document.getElementById('maxPriceInput');

  // Mobile sidebar
  const mobileFiltersBtn = document.getElementById('mobileFiltersBtn');
  const sidebar = document.getElementById('sidebar');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');

  // Modal elements
  const modalBackdrop = document.getElementById('doorModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalPrevBtn = document.getElementById('modalPrevBtn');
  const modalNextBtn = document.getElementById('modalNextBtn');
  const modalTitle = document.getElementById('modalTitle');
  const modalPrice = document.getElementById('modalPrice');
  const modalOldPrice = document.getElementById('modalOldPrice');
  const galleryMainImg = document.getElementById('galleryMainImg');
  const galleryThumbs = document.getElementById('galleryThumbs');
  const modalSpecsTable = document.getElementById('modalSpecsTable');
  const modalDescText = document.getElementById('modalDescText');
  const tabSpecsBtn = document.getElementById('tabSpecsBtn');
  const tabDescBtn = document.getElementById('tabDescBtn');
  const tabSpecsPane = document.getElementById('tabSpecsPane');
  const tabDescPane = document.getElementById('tabDescPane');

  // Interactive 3D Hero Door Elements
  const interactiveDoorStage = document.getElementById('interactiveDoorStage');
  const toggleDoorBtn = document.getElementById('toggleDoorBtn');
  const toggleDoorText = document.getElementById('toggleDoorText');
  const doorStyleBtns = document.querySelectorAll('.door-style-btn');

  // Set total in header
  if (totalCountEl) totalCountEl.textContent = `${doors.length} моделей`;
  if (sortSelect) sortSelect.value = state.sort;

  // --- FORMAT UTILS ---
  const formatPrice = (val) => {
    if (!val || val === 0) return 'По запросу';
    return val.toLocaleString('ru-RU') + ' ₽';
  };

  const getImgPath = (filename) => {
    if (!filename) return '';
    if (filename.startsWith('http') || filename.startsWith('data:') || filename.startsWith('images/')) {
      return filename;
    }
    return `images/${filename}`;
  };

  // --- INTERACTIVE 3D DOOR HERO CONTROLS ---
  function setupInteractiveDoor() {
    if (!interactiveDoorStage) return;

    // Toggle Open/Close button
    if (toggleDoorBtn) {
      toggleDoorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.isHeroDoorOpen = !state.isHeroDoorOpen;
        updateHeroDoorState();
      });
    }

    // Clicking the door stage directly
    interactiveDoorStage.addEventListener('click', () => {
      state.isHeroDoorOpen = !state.isHeroDoorOpen;
      updateHeroDoorState();
    });

    function updateHeroDoorState() {
      if (state.isHeroDoorOpen) {
        interactiveDoorStage.classList.add('is-open');
        if (toggleDoorText) toggleDoorText.textContent = 'Закрыть дверь';
      } else {
        interactiveDoorStage.classList.remove('is-open');
        if (toggleDoorText) toggleDoorText.textContent = 'Открыть дверь';
      }
    }

    // Style Switcher buttons
    doorStyleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        doorStyleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const styleName = btn.getAttribute('data-style');
        interactiveDoorStage.setAttribute('data-active-style', styleName);
      });
    });
  }

  // --- FILTER & SEARCH LOGIC ---
  function applyFilters() {
    state.filteredDoors = doors.filter(door => {
      // 1. Search Query
      if (state.search) {
        const q = state.search.toLowerCase();
        const inTitle = (door.title || '').toLowerCase().includes(q);
        const inName = (door.name || '').toLowerCase().includes(q);
        const inSpecs = (door.characteristics || []).some(c => 
          (c.key || '').toLowerCase().includes(q) || (c.value || '').toLowerCase().includes(q)
        );
        if (!inTitle && !inName && !inSpecs) return false;
      }

      // 2. Price Preset Checkboxes
      if (state.filters.price.size > 0) {
        const matchesAnyPreset = Array.from(state.filters.price).some(rangeKey => {
          const [min, max] = rangeKey.split(',').map(Number);
          return door.price >= min && door.price <= max;
        });
        if (!matchesAnyPreset) return false;
      }

      // 3. Custom Min/Max Price Inputs
      if (state.filters.minPrice !== null && door.price > 0 && door.price < state.filters.minPrice) {
        return false;
      }
      if (state.filters.maxPrice !== null && door.price > 0 && door.price > state.filters.maxPrice) {
        return false;
      }

      // 4. Trim (По отделке)
      if (state.filters.trim.size > 0) {
        const doorTrims = door.filters?.trim || [];
        const hasAllSelected = Array.from(state.filters.trim).every(t => doorTrims.includes(t));
        if (!hasAllSelected) return false;
      }

      // 5. Construction (По конструкции)
      if (state.filters.construction.size > 0) {
        const doorConsts = door.filters?.construction || [];
        const hasAllSelected = Array.from(state.filters.construction).every(c => doorConsts.includes(c));
        if (!hasAllSelected) return false;
      }

      // 6. Purpose (По назначению)
      if (state.filters.purpose.size > 0) {
        const doorPurps = door.filters?.purpose || [];
        const hasAllSelected = Array.from(state.filters.purpose).every(p => doorPurps.includes(p));
        if (!hasAllSelected) return false;
      }

      return true;
    });

    // --- SORTING ---
    if (state.sort === 'price-asc') {
      state.filteredDoors.sort((a, b) => (a.price || 9999999) - (b.price || 9999999));
    } else if (state.sort === 'price-desc') {
      state.filteredDoors.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (state.sort === 'name-asc') {
      state.filteredDoors.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
    } else if (state.sort === 'name-desc') {
      state.filteredDoors.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'ru'));
    }

    state.renderedCount = state.pageSize;
    renderCatalog();
    renderActiveChips();
    updateFilterCounts();
  }

  // --- RENDER CATALOG GRID ---
  function renderCatalog() {
    const totalFound = state.filteredDoors.length;
    resultsCount.innerHTML = `Найдено: <strong>${totalFound}</strong>`;

    if (totalFound === 0) {
      doorsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Ничего не найдено</div>
          <div class="empty-text">Попробуйте изменить параметры фильтра или поисковый запрос</div>
          <button class="btn-reset-filters" style="padding: 8px 16px; border: 1px solid var(--border); border-radius: 6px;" id="emptyResetBtn">Сбросить все фильтры</button>
        </div>
      `;
      document.getElementById('emptyResetBtn')?.addEventListener('click', resetAllFilters);
      if (loadMoreBox) loadMoreBox.style.display = 'none';
      return;
    }

    const itemsToRender = state.filteredDoors.slice(0, state.renderedCount);
    doorsGrid.innerHTML = itemsToRender.map((door, index) => {
      const extImg = getImgPath(door.exteriorImage || (door.images && door.images[0]) || '');
      const intImg = getImgPath(door.interiorImage || (door.images && door.images[1]) || '');
      const hasBothImgs = extImg && intImg && extImg !== intImg;

      // Old price
      const oldPriceHtml = door.oldPrice ? `<div class="card-old-price">${formatPrice(door.oldPrice)}</div>` : '';

      // Specs summary
      const leaf = door.quickSpecs?.leaf ? `<div class="card-spec-item"><strong>Полотно:</strong> ${door.quickSpecs.leaf}</div>` : '';
      const box = door.quickSpecs?.box ? `<div class="card-spec-item"><strong>Короб:</strong> ${door.quickSpecs.box.split('.')[0]}</div>` : '';
      const intFinish = door.quickSpecs?.interior ? `<div class="card-spec-item"><strong>Внутри:</strong> ${door.quickSpecs.interior.split('.')[0]}</div>` : '';

      return `
        <div class="door-card" data-door-id="${door.id}" data-index="${index}">
          <div class="card-image-box">
            <div class="card-image-pair">
              ${hasBothImgs ? `
                <img src="${extImg}" alt="${door.name} - снаружи" class="card-door-img" loading="lazy" onerror="this.onerror=null; this.src='../' + this.getAttribute('data-raw');" data-raw="${door.exteriorImage}">
                <img src="${intImg}" alt="${door.name} - внутри" class="card-door-img" loading="lazy" onerror="this.onerror=null; this.src='../' + this.getAttribute('data-raw');" data-raw="${door.interiorImage}">
              ` : `
                <img src="${extImg}" alt="${door.name}" class="card-door-img single-img" loading="lazy" onerror="this.onerror=null; this.src='../' + this.getAttribute('data-raw');" data-raw="${door.exteriorImage}">
              `}
            </div>
            ${hasBothImgs ? '<div class="card-sides-hint">Снаружи / Внутри</div>' : ''}
          </div>
          <div class="card-body">
            <h3 class="card-title" title="${door.title}">${door.name || door.title}</h3>
            <div class="card-specs">
              ${leaf}
              ${box}
              ${intFinish}
            </div>
            <div class="card-footer">
              <div class="card-price-box">
                ${oldPriceHtml}
                <div class="card-price">${formatPrice(door.price)}</div>
              </div>
              <button class="card-btn" type="button">Подробнее</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Load More Visibility
    if (loadMoreBox) {
      loadMoreBox.style.display = state.renderedCount < totalFound ? 'block' : 'none';
    }

    // Attach click events
    doorsGrid.querySelectorAll('.door-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-index'), 10);
        openModal(idx);
      });
    });
  }

  // --- ACTIVE CHIPS ---
  function renderActiveChips() {
    if (!activeChipsBar) return;
    const chips = [];

    if (state.search) {
      chips.push({ label: `Поиск: "${state.search}"`, remove: () => { state.search = ''; searchInput.value = ''; searchClearBtn.style.display = 'none'; applyFilters(); } });
    }

    state.filters.price.forEach(key => {
      const labelMap = {
        '14000,25000': '14 000 — 25 000 ₽',
        '26000,34000': '26 000 — 34 000 ₽',
        '35000,110000': '35 000 — 110 000 ₽',
        '111000,600000': 'от 111 000 ₽'
      };
      chips.push({
        label: labelMap[key] || key,
        remove: () => {
          state.filters.price.delete(key);
          const cb = document.querySelector(`input[name="price"][value="${key}"]`);
          if (cb) cb.checked = false;
          applyFilters();
        }
      });
    });

    if (state.filters.minPrice !== null || state.filters.maxPrice !== null) {
      const minText = state.filters.minPrice ? `от ${state.filters.minPrice.toLocaleString('ru-RU')} ₽` : '';
      const maxText = state.filters.maxPrice ? `до ${state.filters.maxPrice.toLocaleString('ru-RU')} ₽` : '';
      chips.push({
        label: `Цена: ${minText} ${maxText}`.trim(),
        remove: () => {
          state.filters.minPrice = null;
          state.filters.maxPrice = null;
          if (minPriceInput) minPriceInput.value = '';
          if (maxPriceInput) maxPriceInput.value = '';
          applyFilters();
        }
      });
    }

    ['trim', 'construction', 'purpose'].forEach(cat => {
      state.filters[cat].forEach(val => {
        chips.push({
          label: val,
          remove: () => {
            state.filters[cat].delete(val);
            const cb = document.querySelector(`input[name="${cat}"][value="${val}"]`);
            if (cb) cb.checked = false;
            applyFilters();
          }
        });
      });
    });

    activeChipsBar.innerHTML = chips.map((c, i) => `
      <div class="filter-chip">
        <span>${c.label}</span>
        <button class="filter-chip-remove" data-chip-idx="${i}" type="button">&times;</button>
      </div>
    `).join('');

    activeChipsBar.querySelectorAll('.filter-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-chip-idx'), 10);
        if (chips[idx]) chips[idx].remove();
      });
    });
  }

  // --- DYNAMIC FILTER COUNTS ---
  function updateFilterCounts() {
    document.querySelectorAll('.filter-checkbox').forEach(cb => {
      const cat = cb.name;
      const val = cb.value;
      const countEl = cb.closest('.filter-option')?.querySelector('.filter-count');
      if (!countEl) return;

      let count = 0;
      if (cat === 'price') {
        const [min, max] = val.split(',').map(Number);
        count = doors.filter(d => d.price >= min && d.price <= max).length;
      } else {
        count = doors.filter(d => (d.filters?.[cat] || []).includes(val)).length;
      }
      countEl.textContent = `(${count})`;
    });
  }

  // --- RESET ALL FILTERS ---
  function resetAllFilters() {
    state.search = '';
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.style.display = 'none';

    state.filters.price.clear();
    state.filters.minPrice = null;
    state.filters.maxPrice = null;
    state.filters.trim.clear();
    state.filters.construction.clear();
    state.filters.purpose.clear();

    if (minPriceInput) minPriceInput.value = '';
    if (maxPriceInput) maxPriceInput.value = '';

    document.querySelectorAll('.filter-checkbox').forEach(cb => { cb.checked = false; });
    applyFilters();
  }

  // --- MODAL LOGIC ---
  function openModal(index) {
    if (index < 0 || index >= state.filteredDoors.length) return;
    state.currentModalIndex = index;
    const door = state.filteredDoors[index];

    modalTitle.textContent = door.title || door.name;
    modalPrice.textContent = formatPrice(door.price);
    if (door.oldPrice) {
      modalOldPrice.textContent = formatPrice(door.oldPrice);
      modalOldPrice.style.display = 'inline-block';
    } else {
      modalOldPrice.style.display = 'none';
    }

    // Gallery
    const allImages = door.images && door.images.length > 0 ? door.images : [door.exteriorImage, door.interiorImage].filter(Boolean);
    state.activeGalleryImg = allImages[0] || '';
    updateGalleryMain(state.activeGalleryImg, door.title);

    galleryThumbs.innerHTML = allImages.map((img, i) => `
      <div class="gallery-thumb-item ${i === 0 ? 'active' : ''}" data-img="${img}">
        <img src="${getImgPath(img)}" alt="${door.name} фото ${i+1}" onerror="this.onerror=null; this.src='../' + this.getAttribute('data-raw');" data-raw="${img}">
      </div>
    `).join('');

    galleryThumbs.querySelectorAll('.gallery-thumb-item').forEach(thumb => {
      thumb.addEventListener('click', () => {
        galleryThumbs.querySelectorAll('.gallery-thumb-item').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const imgName = thumb.getAttribute('data-img');
        updateGalleryMain(imgName, door.title);
      });
    });

    // Characteristics Table
    if (door.characteristics && door.characteristics.length > 0) {
      modalSpecsTable.innerHTML = door.characteristics.map(c => `
        <tr>
          <td class="spec-key">${c.key}</td>
          <td class="spec-val">${c.value}</td>
        </tr>
      `).join('');
    } else {
      modalSpecsTable.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted); padding: 20px;">Характеристики уточняйте у менеджера</td></tr>`;
    }

    // Description Pane
    if (door.description && door.description.trim().length > 0) {
      modalDescText.innerHTML = door.description;
      tabDescBtn.style.display = 'inline-block';
    } else {
      modalDescText.innerHTML = `<p>Надежная стальная дверь высокой прочности с качественной фурнитурой и надежной тепло- и шумоизоляцией.</p>`;
    }

    switchModalTab('specs');

    modalBackdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function updateGalleryMain(imgFilename, altText) {
    if (!imgFilename) {
      galleryMainImg.src = '';
      return;
    }
    galleryMainImg.src = getImgPath(imgFilename);
    galleryMainImg.alt = altText || 'Дверь';
    galleryMainImg.setAttribute('data-raw', imgFilename);
    galleryMainImg.onerror = function() {
      this.onerror = null;
      this.src = '../' + this.getAttribute('data-raw');
    };
  }

  function closeModal() {
    modalBackdrop.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function switchModalTab(tabName) {
    if (tabName === 'specs') {
      tabSpecsBtn.classList.add('active');
      tabDescBtn.classList.remove('active');
      tabSpecsPane.classList.add('active');
      tabDescPane.classList.remove('active');
    } else {
      tabDescBtn.classList.add('active');
      tabSpecsBtn.classList.remove('active');
      tabDescPane.classList.add('active');
      tabSpecsPane.classList.remove('active');
    }
  }

  // --- EVENT LISTENERS ---

  // Checkbox Filters
  document.querySelectorAll('.filter-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const cat = cb.name;
      const val = cb.value;
      if (cb.checked) {
        state.filters[cat].add(val);
      } else {
        state.filters[cat].delete(val);
      }
      applyFilters();
    });
  });

  // Custom Price inputs
  let priceTimeout = null;
  const onPriceChange = () => {
    clearTimeout(priceTimeout);
    priceTimeout = setTimeout(() => {
      const minVal = parseInt(minPriceInput.value, 10);
      const maxVal = parseInt(maxPriceInput.value, 10);
      state.filters.minPrice = isNaN(minVal) ? null : minVal;
      state.filters.maxPrice = isNaN(maxVal) ? null : maxVal;
      applyFilters();
    }, 400);
  };
  if (minPriceInput) minPriceInput.addEventListener('input', onPriceChange);
  if (maxPriceInput) maxPriceInput.addEventListener('input', onPriceChange);

  // Search input
  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.search = searchInput.value.trim();
      if (searchClearBtn) {
        searchClearBtn.style.display = state.search ? 'block' : 'none';
      }
      applyFilters();
    }, 250);
  });

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.search = '';
      searchClearBtn.style.display = 'none';
      applyFilters();
    });
  }

  // Sort Select
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      state.sort = sortSelect.value;
      applyFilters();
    });
  }

  // Load More Button
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      state.renderedCount += state.pageSize;
      renderCatalog();
    });
  }

  // Reset Filters Button
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', resetAllFilters);
  }

  // Mobile Filters Drawer
  if (mobileFiltersBtn) {
    mobileFiltersBtn.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
    });
  }
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
    });
  }

  // Modal Close & Nav
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  if (modalPrevBtn) {
    modalPrevBtn.addEventListener('click', () => {
      if (state.currentModalIndex > 0) {
        openModal(state.currentModalIndex - 1);
      }
    });
  }

  if (modalNextBtn) {
    modalNextBtn.addEventListener('click', () => {
      if (state.currentModalIndex < state.filteredDoors.length - 1) {
        openModal(state.currentModalIndex + 1);
      }
    });
  }

  // Modal Tabs
  if (tabSpecsBtn) tabSpecsBtn.addEventListener('click', () => switchModalTab('specs'));
  if (tabDescBtn) tabDescBtn.addEventListener('click', () => switchModalTab('desc'));

  // Keyboard Navigation
  window.addEventListener('keydown', (e) => {
    if (!modalBackdrop.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft' && state.currentModalIndex > 0) {
      openModal(state.currentModalIndex - 1);
    }
    if (e.key === 'ArrowRight' && state.currentModalIndex < state.filteredDoors.length - 1) {
      openModal(state.currentModalIndex + 1);
    }
  });

  // Init Interactive 3D Door in Hero
  setupInteractiveDoor();

  // Initial Filter Application & Render
  applyFilters();
});
