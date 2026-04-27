let currentPage = 1;
let itemsPerPage = 20;
let currentSort = { column: 'id', direction: 'asc' };
let currentSearchQuery = '';
let filteredData = [];
let selectedHouses = new Set();

document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAuth()) return;
    initAdminTheme();
    setupEventListeners();
    await loadData();
    updateStatsCards();
    applyFiltersAndRender();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value;
            currentPage = 1;
            selectedHouses.clear();
            applyFiltersAndRender();
        });
    }
    
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
    
    const addHouseBtn = document.getElementById('addHouseBtn');
    if (addHouseBtn) {
        addHouseBtn.addEventListener('click', () => {
            window.location.href = 'edit.html';
        });
    }
    
    // ========== ГЛАВНАЯ КНОПКА: СОХРАНИТЬ ВСЁ ==========
    const saveAllBtn = document.getElementById('saveAllBtn');
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', async () => {
            await saveBothJSON();
            showToast('✅ data.json и history.json скачаны! Загрузите оба файла на GitHub.');
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleAdminTheme);
    }
    
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', () => deleteSelectedHouses());
    }
    
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

function applyFiltersAndRender() {
    filteredData = currentSearchQuery ? 
        housesData.filter(house => house.address.toLowerCase().includes(currentSearchQuery.toLowerCase())) : 
        [...housesData];
    
    filteredData = sortHouses(filteredData, currentSort.column, currentSort.direction);
    updateSortInfo();
    renderTable();
    renderPagination();
    updateDeleteButtonVisibility();
}

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
    
    document.querySelectorAll('.sortable .sort-arrow').forEach(arrow => {
        arrow.textContent = '';
    });
    const activeHeader = document.querySelector(`.sortable[data-sort="${currentSort.column}"] .sort-arrow`);
    if (activeHeader) {
        activeHeader.textContent = currentSort.direction === 'asc' ? ' ↑' : ' ↓';
    }
}

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

window.goToPage = function(page) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    renderPagination();
    updateDeleteButtonVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.editHouse = function(id) {
    window.location.href = `edit.html?id=${id}`;
};

// ========== ДУБЛИРОВАНИЕ (БЕЗ АВТО-СКАЧИВАНИЯ) ==========
window.duplicateHouseHandler = async function(id) {
    const originalHouse = housesData.find(h => h.id === id);
    if (!originalHouse) return;
    
    const newHouse = duplicateHouse(originalHouse);
    housesData.push(newHouse);
    
    // Сохраняем в историю (только в память)
    await addHistoryRecord('duplicate', newHouse.id, newHouse.address, {
        sourceHouseId: id,
        sourceHouseAddress: originalHouse.address
    });
    
    // Обновляем таблицу
    applyFiltersAndRender();
    updateStatsCards();
    
    showToast(`✅ Дом "${newHouse.address}" скопирован. Не забудьте нажать «Сохранить всё»!`);
};

// ========== УДАЛЕНИЕ (БЕЗ АВТО-СКАЧИВАНИЯ) ==========
window.deleteHouseHandler = async function(id) {
    const house = housesData.find(h => h.id === id);
    if (!house) return;
    
    if (confirm(`🗑️ Удалить дом "${house.address}"?`)) {
        // Сохраняем в историю ДО удаления
        await addHistoryRecord('delete', id, house.address, {
            deletedData: JSON.parse(JSON.stringify(house))
        });
        
        housesData = housesData.filter(h => h.id !== id);
        selectedHouses.delete(id);
        
        if (filteredData.length === 1 && currentPage > 1) {
            currentPage--;
        }
        applyFiltersAndRender();
        updateStatsCards();
        
        showToast(`✅ Дом "${house.address}" удалён. Не забудьте нажать «Сохранить всё»!`);
    }
};

// ========== МАССОВОЕ УДАЛЕНИЕ (БЕЗ АВТО-СКАЧИВАНИЯ) ==========
async function deleteSelectedHouses() {
    if (selectedHouses.size === 0) return;
    
    const count = selectedHouses.size;
    if (confirm(`🗑️ Удалить ${count} дом(ов)?`)) {
        // Сохраняем удаляемые дома в историю
        const deletedHouses = housesData.filter(house => selectedHouses.has(house.id));
        for (const house of deletedHouses) {
            await addHistoryRecord('delete', house.id, house.address, {
                deletedData: JSON.parse(JSON.stringify(house))
            });
        }
        
        housesData = housesData.filter(house => !selectedHouses.has(house.id));
        selectedHouses.clear();
        
        if (filteredData.length === count && currentPage > 1) {
            currentPage--;
        }
        applyFiltersAndRender();
        updateStatsCards();
        
        showToast(`✅ Удалено ${count} дом(ов). Не забудьте нажать «Сохранить всё»!`);
        
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        if (deleteSelectedBtn) deleteSelectedBtn.style.display = 'none';
    }
}