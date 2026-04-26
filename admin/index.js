// ========== ПЕРЕМЕННЫЕ ==========
let currentPage = 1;
let itemsPerPage = 20;
let currentSort = { column: 'id', direction: 'asc' };
let currentSearchQuery = '';
let filteredData = [];
let selectedHouses = new Set(); // Множество для хранения ID выбранных домов
let isTempMode = false; // Режим показа временных данных

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
    
    // Проверяем наличие временных данных в localStorage
    const tempData = localStorage.getItem(STORAGE_KEY);
    if (tempData) {
        const parsedTemp = JSON.parse(tempData);
        if (parsedTemp.length > 0) {
            isTempMode = true;
            showToast(`📦 Обнаружены временные данные (${parsedTemp.length} домов). Нажмите «Сохранить JSON» для переноса на GitHub.`, 4000);
            
            // Показываем кнопку очистки временных данных
            const clearTempBtn = document.getElementById('clearLocalStorageBtn');
            if (clearTempBtn) clearTempBtn.style.display = 'inline-block';
        }
    }
    
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
            // Перед сохранением объединяем временные данные с основными
            const tempData = localStorage.getItem(STORAGE_KEY);
            if (tempData) {
                const parsedTemp = JSON.parse(tempData);
                if (parsedTemp.length > 0) {
                    // Добавляем временные дома, которых нет в основном списке
                    const existingIds = new Set(housesData.map(h => h.id));
                    parsedTemp.forEach(tempHouse => {
                        if (!existingIds.has(tempHouse.id)) {
                            housesData.push(tempHouse);
                        }
                    });
                    // Сортируем по id
                    housesData.sort((a, b) => a.id - b.id);
                    showToast(`📦 Временные данные (${parsedTemp.length} домов) добавлены в экспорт`);
                }
            }
            saveJSON();
            
            // После сохранения предлагаем очистить localStorage
            setTimeout(() => {
                if (confirm('JSON сохранён! Очистить временные данные из браузера? (Данные останутся на GitHub)')) {
                    clearLocalStorage();
                    location.reload();
                }
            }, 500);
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
    
    // Кнопка очистки временных данных
    const clearTempBtn = document.getElementById('clearLocalStorageBtn');
    if (clearTempBtn) {
        clearTempBtn.addEventListener('click', () => {
            if (confirm('Очистить все временные данные из браузера? (Данные на GitHub не пострадают)')) {
                clearLocalStorage();
                location.reload();
            }
        });
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

// ========== ПОЛУЧЕНИЕ ДАННЫХ ДЛЯ ОТОБРАЖЕНИЯ ==========
function getDisplayData() {
    // Объединяем основные данные с временными из localStorage
    const tempData = localStorage.getItem(STORAGE_KEY);
    if (!tempData) return [...housesData];
    
    const parsedTemp = JSON.parse(tempData);
    const allHouses = [...housesData];
    const existingIds = new Set(allHouses.map(h => h.id));
    
    parsedTemp.forEach(tempHouse => {
        if (!existingIds.has(tempHouse.id)) {
            allHouses.push(tempHouse);
        }
    });
    
    // Сортируем по id
    allHouses.sort((a, b) => a.id - b.id);
    return allHouses;
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
async function deleteSelectedHouses() {
    if (selectedHouses.size === 0) return;
    
    const count = selectedHouses.size;
    if (confirm(`🗑️ Удалить ${count} дом(ов)? Это действие нельзя отменить.`)) {
        // Сохраняем копии удаляемых домов для истории
        const allDisplayData = getDisplayData();
        const deletedHouses = allDisplayData.filter(house => selectedHouses.has(house.id));
        
        // Удаляем из основного массива
        housesData = housesData.filter(house => !selectedHouses.has(house.id));
        
        // Удаляем из localStorage, если там были эти дома
        const tempData = localStorage.getItem(STORAGE_KEY);
        if (tempData) {
            let parsedTemp = JSON.parse(tempData);
            parsedTemp = parsedTemp.filter(house => !selectedHouses.has(house.id));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedTemp));
        }
        
        selectedHouses.clear();
        
        // Обновление отображения
        const displayData = getDisplayData();
        const totalPages = Math.ceil(displayData.length / itemsPerPage);
        if (displayData.length === count && currentPage > 1) {
            currentPage--;
        }
        applyFiltersAndRender();
        updateStatsCards();
        showToast(`✅ Удалено ${count} дом(ов)`);
        
        // Логируем каждое удаление
        for (const house of deletedHouses) {
            await addHistoryRecord('delete', house.id, house.address, {
                deletedData: JSON.parse(JSON.stringify(house))
            });
        }
        
        // Скрыть кнопку массового удаления
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        if (deleteSelectedBtn) deleteSelectedBtn.style.display = 'none';
    }
}

// ========== ОБНОВЛЕНИЕ КАРТОЧЕК СТАТИСТИКИ ==========
function updateStatsCards() {
    const displayData = getDisplayData();
    const totalHouses = displayData.length;
    let totalLifts = 0;
    let totalPrograms = 0;
    
    displayData.forEach(house => {
        totalLifts += getLiftsCount(house);
        totalPrograms += house.programWorks?.length || 0;
    });
    
    const totalHousesEl = document.getElementById('totalHouses');
    const totalLiftsEl = document.getElementById('totalLifts');
    const totalProgramsEl = document.getElementById('totalPrograms');
    
    if (totalHousesEl) totalHousesEl.textContent = totalHouses;
    if (totalLiftsEl) totalLiftsEl.textContent = totalLifts;
    if (totalProgramsEl) totalProgramsEl.textContent = totalPrograms;
}

// ========== ПРИМЕНЕНИЕ ФИЛЬТРОВ ==========
function applyFiltersAndRender() {
    const displayData = getDisplayData();
    
    // Фильтрация по поиску
    if (currentSearchQuery) {
        filteredData = displayData.filter(house => 
            house.address.toLowerCase().includes(currentSearchQuery.toLowerCase())
        );
    } else {
        filteredData = [...displayData];
    }
    
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
    
    // Показываем индикатор временных данных
    updateTempDataIndicator();
}

// ========== ИНДИКАТОР ВРЕМЕННЫХ ДАННЫХ ==========
function updateTempDataIndicator() {
    const tempData = localStorage.getItem(STORAGE_KEY);
    const tempCount = tempData ? JSON.parse(tempData).length : 0;
    
    const indicator = document.getElementById('tempDataIndicator');
    if (indicator) {
        if (tempCount > 0) {
            indicator.style.display = 'inline-block';
            indicator.textContent = `⚠️ ${tempCount} временных домов (не сохранены на GitHub)`;
            indicator.style.background = '#f39c12';
            indicator.style.color = 'white';
            indicator.style.padding = '4px 12px';
            indicator.style.borderRadius = '30px';
            indicator.style.fontSize = '0.7rem';
        } else {
            indicator.style.display = 'none';
        }
    }
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
window.duplicateHouseHandler = async function(id) {
    const displayData = getDisplayData();
    const originalHouse = displayData.find(h => h.id === id);
    if (!originalHouse) return;
    
    const newHouse = duplicateHouse(originalHouse);
    
    // Добавляем в основной массив
    housesData.push(newHouse);
    
    // Добавляем в localStorage
    saveToLocalStorage();
    
    applyFiltersAndRender();
    updateStatsCards();
    showToast(`✅ Дом "${newHouse.address}" скопирован`);
    
    // Логируем дублирование
    await addHistoryRecord('duplicate', newHouse.id, newHouse.address, {
        sourceHouseId: originalHouse.id,
        sourceHouseAddress: originalHouse.address
    });
};

// ========== УДАЛЕНИЕ ДОМА ==========
window.deleteHouseHandler = async function(id) {
    const displayData = getDisplayData();
    const house = displayData.find(h => h.id === id);
    if (!house) return;
    
    if (confirm(`🗑️ Удалить дом "${house.address}"? Это действие нельзя отменить.`)) {
        // Сохраняем копию для истории
        const deletedHouse = JSON.parse(JSON.stringify(house));
        
        // Удаляем из основного массива
        housesData = housesData.filter(h => h.id !== id);
        
        // Удаляем из localStorage, если там был этот дом
        const tempData = localStorage.getItem(STORAGE_KEY);
        if (tempData) {
            let parsedTemp = JSON.parse(tempData);
            parsedTemp = parsedTemp.filter(h => h.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedTemp));
        }
        
        selectedHouses.delete(id);
        
        const displayDataNew = getDisplayData();
        if (displayDataNew.length === 0 && currentPage > 1) {
            currentPage--;
        }
        applyFiltersAndRender();
        updateStatsCards();
        showToast(`✅ Дом "${house.address}" удалён`);
        
        // Логируем удаление
        await addHistoryRecord('delete', id, house.address, {
            deletedData: deletedHouse
        });
    }
};