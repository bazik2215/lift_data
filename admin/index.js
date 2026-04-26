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
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value;
        currentPage = 1;
        selectedHouses.clear();
        applyFiltersAndRender();
    });
    
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
    
    document.getElementById('addHouseBtn')?.addEventListener('click', () => window.location.href = 'edit.html');
    document.getElementById('saveJsonBtn')?.addEventListener('click', () => saveJSON());
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('themeToggle')?.addEventListener('click', toggleAdminTheme);
    document.getElementById('deleteSelectedBtn')?.addEventListener('click', () => deleteSelectedHouses());
    
    document.getElementById('selectAllCheckbox')?.addEventListener('change', (e) => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = filteredData.slice(start, end);
        if (e.target.checked) pageData.forEach(house => selectedHouses.add(house.id));
        else pageData.forEach(house => selectedHouses.delete(house.id));
        renderTable();
        updateDeleteButtonVisibility();
    });
}

function updateStatsCards() {
    document.getElementById('totalHouses').textContent = housesData.length;
    document.getElementById('totalLifts').textContent = getTotalLiftsCount();
    document.getElementById('totalPrograms').textContent = getTotalProgramsCount();
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
        const allSelected = pageData.length > 0 && pageData.every(h => selectedHouses.has(h.id));
        selectAllCheckbox.checked = allSelected;
        selectAllCheckbox.indeterminate = !allSelected && pageData.some(h => selectedHouses.has(h.id));
    }
}

function applyFiltersAndRender() {
    filteredData = currentSearchQuery ? housesData.filter(house => house.address.toLowerCase().includes(currentSearchQuery.toLowerCase())) : [...housesData];
    filteredData = sortHouses(filteredData, currentSort.column, currentSort.direction);
    updateSortInfo();
    renderTable();
    renderPagination();
    updateDeleteButtonVisibility();
}

function updateSortInfo() {
    const sortInfo = document.getElementById('sortInfo');
    if (sortInfo) {
        const columnNames = { id: 'ID', address: 'адресу', district: 'району', buildYear: 'году постройки' };
        sortInfo.textContent = `Сортировка: по ${columnNames[currentSort.column]} ${currentSort.direction === 'asc' ? '↑' : '↓'}`;
    }
    document.querySelectorAll('.sortable .sort-arrow').forEach(arrow => arrow.textContent = '');
    const activeHeader = document.querySelector(`.sortable[data-sort="${currentSort.column}"] .sort-arrow`);
    if (activeHeader) activeHeader.textContent = currentSort.direction === 'asc' ? ' ↑' : ' ↓';
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
            if (e.target.checked) selectedHouses.add(house.id);
            else selectedHouses.delete(house.id);
            updateDeleteButtonVisibility();
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            if (selectAllCheckbox) {
                const pageData = filteredData.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);
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
        row.insertCell(7).innerHTML = `<div class="action-icons">
            <button class="action-icon" onclick="editHouse(${house.id})">✏️</button>
            <button class="action-icon" onclick="duplicateHouseHandler(${house.id})">📋</button>
            <button class="action-icon" onclick="deleteHouseHandler(${house.id})">🗑️</button>
        </div>`;
    });
}

function renderPagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (totalPages <= 1) { paginationContainer.innerHTML = ''; return; }
    
    let html = `<button onclick="goToPage(${currentPage-1})" ${currentPage===1 ? 'disabled' : ''}>←</button>`;
    const startPage = Math.max(1, currentPage-2);
    const endPage = Math.min(totalPages, currentPage+2);
    if (startPage > 1) { html += `<button onclick="goToPage(1)">1</button>`; if (startPage > 2) html += `<span style="padding:0 4px;">...</span>`; }
    for (let i=startPage; i<=endPage; i++) html += `<button onclick="goToPage(${i})" class="${i===currentPage ? 'active-page' : ''}">${i}</button>`;
    if (endPage < totalPages) { if (endPage < totalPages-1) html += `<span style="padding:0 4px;">...</span>`; html += `<button onclick="goToPage(${totalPages})">${totalPages}</button>`; }
    html += `<button onclick="goToPage(${currentPage+1})" ${currentPage===totalPages ? 'disabled' : ''}>→</button>`;
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

window.editHouse = function(id) { window.location.href = `edit.html?id=${id}`; };

window.duplicateHouseHandler = async function(id) {
    const originalHouse = housesData.find(h => h.id === id);
    if (!originalHouse) return;
    const newHouse = duplicateHouse(originalHouse);
    housesData.push(newHouse);
    applyFiltersAndRender();
    updateStatsCards();
    showToast(`✅ Дом "${newHouse.address}" скопирован`);
    await addHistoryRecord('duplicate', newHouse.id, newHouse.address, { sourceHouseId: originalHouse.id });
};

window.deleteHouseHandler = async function(id) {
    const house = housesData.find(h => h.id === id);
    if (!house) return;
    if (confirm(`🗑️ Удалить дом "${house.address}"?`)) {
        housesData = housesData.filter(h => h.id !== id);
        selectedHouses.delete(id);
        applyFiltersAndRender();
        updateStatsCards();
        showToast(`✅ Дом "${house.address}" удалён`);
        await addHistoryRecord('delete', id, house.address, { summary: 'Удалён через админ-панель' });
    }
};

async function deleteSelectedHouses() {
    if (selectedHouses.size === 0) return;
    if (confirm(`🗑️ Удалить ${selectedHouses.size} дом(ов)?`)) {
        housesData = housesData.filter(house => !selectedHouses.has(house.id));
        selectedHouses.clear();
        applyFiltersAndRender();
        updateStatsCards();
        showToast(`✅ Удалено ${selectedHouses.size} дом(ов)`);
        for (const id of selectedHouses) {
            await addHistoryRecord('delete', id, 'Несколько домов', { summary: 'Массовое удаление' });
        }
    }
}