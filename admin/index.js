// ========== ПЕРЕМЕННЫЕ ==========
let currentPage = 1;
let itemsPerPage = 20;
let currentSort = { column: 'id', direction: 'asc' };
let currentSearchQuery = '';
let filteredData = [];
let selectedHouses = new Set(); // Множество для хранения ID выбранных домов

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async function() {
    // Проверка авторизации
    if (!checkAuth()) return;
    
    // Инициализация темы
    initAdminTheme();
    
    // Настройка обработчиков
    setupEventListeners();
    
    // Загрузка данных
    await loadData();
    
    // Обновление статистики
    updateStatsCards();
    
    // Рендеринг таблицы
    applyFiltersAndRender();
});

// ========== НАСТРОЙКА ОБРАБОТЧИКОВ ==========
function setupEventListeners() {
    // Поиск
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value;
            currentPage = 1;
            selectedHouses.clear();
            applyFiltersAndRender();
        });
    }
    
    // Сортировка
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            selectedHouses.clear();
            applyFiltersAndRender();
        });
    });
    
    // Кнопка добавления дома
    const addHouseBtn = document.getElementById('addHouseBtn');
    if (addHouseBtn) {
        addHouseBtn.addEventListener('click', () => {
            window.location.href = 'edit.html';
        });
    }
    
    // Кнопка сохранения JSON
    const saveJsonBtn = document.getElementById('saveJsonBtn');
    if (saveJsonBtn) {
        saveJsonBtn.addEventListener('click', () => {
            saveJSON();
        });
    }
    
    // Кнопка выхода
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Кнопка смены темы
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleAdminTheme);
    }
    
    // Кнопка массового удаления
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', () => deleteSelectedHouses());
    }
    
    // Чекбокс "Выбрать все"
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageData = filteredData.slice(start, end);
            
            if (e.target.checked) {
                pageData.forEach(house => selectedHouses.add(house.id));
            } else {
                pageData.forEach(house => selectedHouses.delete(house.id));
            }
            renderTable();
            updateDeleteButtonVisibility();
        });
    }
}

// ========== ОБНОВЛЕНИЕ КНОПКИ УДАЛЕНИЯ ==========
function updateDeleteButtonVisibility() {
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    if (deleteSelectedBtn) {
        if (selectedHouses.size > 0) {
            deleteSelectedBtn.style.display = 'inline-block';
            deleteSelectedBtn.textContent = `🗑️ Удалить выбранные (${selectedHouses.size})`;
        } else {
            deleteSelectedBtn.style.display = 'none';
        }
    }
    
    // Обновление состояния чекбокса "Выбрать все"
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox && filteredData.length > 0) {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = filteredData.slice(start, end);
        const allSelected = pageData.length > 0 && pageData.every(house => selectedHouses.has(house.id));
        selectAllCheckbox.checked = allSelected;
        selectAllCheckbox.indeterminate = !allSelected && pageData.some(house => selectedHouses.has(house.id));
    }
}

// ========== МАССОВОЕ УДАЛЕНИЕ ==========
function deleteSelectedHouses() {
    if (selectedHouses.size === 0) return;
    
    const count = selectedHouses.size;
    if (confirm(`🗑️ Удалить ${count} дом(ов)? Это действие нельзя отменить.`)) {
        housesData = housesData.filter(house => !selectedHouses.has(house.id));
        selectedHouses.clear();
        
        // Обновление отображения
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        if (filteredData.length === count && currentPage > 1) {
            currentPage--;
        }
        applyFiltersAndRender();
        updateStatsCards();
        showToast(`✅ Удалено ${count} дом(ов)`);
        
        // Скрыть кнопку массового удаления
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        if (deleteSelectedBtn) deleteSelectedBtn.style.display = 'none';
    }
}

// ========== ОБНОВЛЕНИЕ КАРТОЧЕК СТАТИСТИКИ ==========
function updateStatsCards() {
    const totalHouses = housesData.length;
    const totalLifts = getTotalLiftsCount();
    const totalPrograms = getTotalProgramsCount();
    
    const totalHousesEl = document.getElementById('totalHouses');
    const totalLiftsEl = document.getElementById('totalLifts');
    const totalProgramsEl = document.getElementById('totalPrograms');
    
    if (totalHousesEl) totalHousesEl.textContent = totalHouses;
    if (totalLiftsEl) totalLiftsEl.textContent = totalLifts;
    if (totalProgramsEl) totalProgramsEl.textContent = totalPrograms;
}

// ========== ПРИМЕНЕНИЕ ФИЛЬТРОВ ==========
function applyFiltersAndRender() {
    // Фильтрация по поиску
    filteredData = filterHousesByAddress(currentSearchQuery);
    
    // Сортировка
    filteredData = sortHouses(filteredData, currentSort.column, currentSort.direction);
    
    // Обновление информации о сортировке
    updateSortInfo();
    
    // Рендеринг таблицы
    renderTable();
    
    // Рендеринг пагинации
    renderPagination();
    
    // Обновление кнопки массового удаления
    updateDeleteButtonVisibility();
}

// ========== ОБНОВЛЕНИЕ ИНФОРМАЦИИ О СОРТИРОВКЕ ==========
function updateSortInfo() {
    const sortInfo = document.getElementById('sortInfo');
    if (sortInfo) {
        const columnNames = {
            id: 'ID',
            address: 'адресу',
            district: 'району',
            buildYear: 'году постройки'
        };
        const directionText = currentSort.direction === 'asc' ? '↑' : '↓';
        sortInfo.textContent = `Сортировка: по ${columnNames[currentSort.column]} ${directionText}`;
    }
    
    // Обновление стрелок в заголовках
    document.querySelectorAll('.sortable .sort-arrow').forEach(arrow => {
        arrow.textContent = '';
    });
    const activeHeader = document.querySelector(`.sortable[data-sort="${currentSort.column}"] .sort-arrow`);
    if (activeHeader) {
        activeHeader.textContent = currentSort.direction === 'asc' ? ' ↑' : ' ↓';
    }
}

// ========== РЕНДЕРИНГ ТАБЛИЦЫ ==========
function renderTable() {
    const tbody = document.getElementById('housesTableBody');
    if (!tbody) return;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredData.slice(start, end);
    
    tbody.innerHTML = '';
    
    if (pageData.length === 0) {
        const row = tbody.insertRow();
        row.insertCell(0).colSpan = 8;
        row.insertCell(0).textContent = 'Нет данных';
        row.insertCell(0).style.textAlign = 'center';
        row.insertCell(0).style.padding = '40px';
        return;
    }
    
    pageData.forEach(house => {
        const row = tbody.insertRow();
        
        // Чекбокс
        const checkboxCell = row.insertCell(0);
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedHouses.has(house.id);
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedHouses.add(house.id);
            } else {
                selectedHouses.delete(house.id);
            }
            updateDeleteButtonVisibility();
            // Обновляем чекбокс "Выбрать все"
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            if (selectAllCheckbox) {
                const start = (currentPage - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const pageData = filteredData.slice(start, end);
                const allSelected = pageData.length > 0 && pageData.every(h => selectedHouses.has(h.id));
                selectAllCheckbox.checked = allSelected;
                selectAllCheckbox.indeterminate = !allSelected && pageData.some(h => selectedHouses.has(h.id));
            }
        });
        checkboxCell.appendChild(checkbox);
        
        row.insertCell(1).textContent = house.id;
        row.insertCell(2).innerHTML = `<strong>${escapeHtml(house.address)}</strong>`;
        row.insertCell(3).textContent = house.district || '—';
        row.insertCell(4).textContent = house.buildYear || '—';
        row.insertCell(5).textContent = getLiftsCount(house);
        row.insertCell(6).textContent = house.programWorks?.length || 0;
        
        const actionsCell = row.insertCell(7);
        actionsCell.innerHTML = `
            <div class="action-icons">
                <button class="action-icon" onclick="editHouse(${house.id})" title="Редактировать">✏️</button>
                <button class="action-icon" onclick="duplicateHouseHandler(${house.id})" title="Дублировать">📋</button>
                <button class="action-icon" onclick="deleteHouseHandler(${house.id})" title="Удалить">🗑️</button>
            </div>
        `;
    });
}

// ========== РЕНДЕРИНГ ПАГИНАЦИИ ==========
function renderPagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let html = '';
    
    html += `<button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>←</button>`;
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<button onclick="goToPage(1)">1</button>`;
        if (startPage > 2) html += `<span style="padding: 0 4px;">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button onclick="goToPage(${i})" class="${i === currentPage ? 'active-page' : ''}">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span style="padding: 0 4px;">...</span>`;
        html += `<button onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `<button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>→</button>`;
    
    paginationContainer.innerHTML = html;
}

// ========== ПЕРЕХОД НА СТРАНИЦУ ==========
window.goToPage = function(page) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    renderPagination();
    updateDeleteButtonVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ========== РЕДАКТИРОВАНИЕ ДОМА ==========
window.editHouse = function(id) {
    window.location.href = `edit.html?id=${id}`;
};

// ========== ДУБЛИРОВАНИЕ ДОМА ==========
window.duplicateHouseHandler = function(id) {
    const originalHouse = housesData.find(h => h.id === id);
    if (!originalHouse) return;
    
    const newHouse = duplicateHouse(originalHouse);
    housesData.push(newHouse);
    
    applyFiltersAndRender();
    updateStatsCards();
    showToast(`✅ Дом "${newHouse.address}" скопирован`);
};

// ========== УДАЛЕНИЕ ДОМА ==========
window.deleteHouseHandler = function(id) {
    const house = housesData.find(h => h.id === id);
    if (!house) return;
    
    if (confirm(`🗑️ Удалить дом "${house.address}"? Это действие нельзя отменить.`)) {
        housesData = housesData.filter(h => h.id !== id);
        
        // Удаляем ID из выбранных
        selectedHouses.delete(id);
        
        if (filteredData.length === 1 && currentPage > 1) {
            currentPage--;
        }
        applyFiltersAndRender();
        updateStatsCards();
        showToast(`✅ Дом "${house.address}" удалён`);
    }
};