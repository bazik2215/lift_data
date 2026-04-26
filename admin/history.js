// ========== ПЕРЕМЕННЫЕ ==========
let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
let itemsPerPage = 50;

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async function() {
    // Проверка авторизации
    if (!checkAuth()) return;
    
    // Инициализация темы
    initAdminTheme();
    
    // Загрузка истории
    await loadHistoryData();
    
    // Настройка обработчиков
    setupEventListeners();
    
    // Обновление индикатора сохранения
    updateLastSaveIndicator();
});

// ========== ЗАГРУЗКА ИСТОРИИ ==========
async function loadHistoryData() {
    try {
        const history = await loadHistory();
        allRecords = history.records || [];
        applyFilters();
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        allRecords = [];
        applyFilters();
    }
}

// ========== НАСТРОЙКА ОБРАБОТЧИКОВ ==========
function setupEventListeners() {
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
    
    // Фильтры
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const actionFilter = document.getElementById('actionFilter');
    const searchAddress = document.getElementById('searchAddress');
    
    if (dateFrom) dateFrom.addEventListener('change', () => applyFilters());
    if (dateTo) dateTo.addEventListener('change', () => applyFilters());
    if (actionFilter) actionFilter.addEventListener('change', () => applyFilters());
    if (searchAddress) searchAddress.addEventListener('input', () => applyFilters());
    
    // Сброс фильтров
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
    
    // Очистка всей истории
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearAllHistory);
    }
}

// ========== ПРИМЕНЕНИЕ ФИЛЬТРОВ ==========
function applyFilters() {
    const dateFrom = document.getElementById('dateFrom')?.value;
    const dateTo = document.getElementById('dateTo')?.value;
    const actionFilter = document.getElementById('actionFilter')?.value || 'all';
    const searchAddress = document.getElementById('searchAddress')?.value.trim().toLowerCase() || '';
    
    filteredRecords = allRecords.filter(record => {
        // Фильтр по дате
        if (dateFrom) {
            const date = new Date(record.timestamp).toISOString().split('T')[0];
            if (date < dateFrom) return false;
        }
        if (dateTo) {
            const date = new Date(record.timestamp).toISOString().split('T')[0];
            if (date > dateTo) return false;
        }
        
        // Фильтр по типу действия
        if (actionFilter !== 'all' && record.action !== actionFilter) return false;
        
        // Фильтр по адресу
        if (searchAddress && !record.houseAddress.toLowerCase().includes(searchAddress)) return false;
        
        return true;
    });
    
    // Обновляем статистику
    updateStats();
    
    // Сбрасываем на первую страницу
    currentPage = 1;
    
    // Рендерим таблицу
    renderHistoryTable();
    
    // Рендерим пагинацию
    renderPagination();
}

// ========== ОБНОВЛЕНИЕ СТАТИСТИКИ ==========
function updateStats() {
    const total = filteredRecords.length;
    const addCount = filteredRecords.filter(r => r.action === 'add').length;
    const updateCount = filteredRecords.filter(r => r.action === 'update').length;
    const deleteCount = filteredRecords.filter(r => r.action === 'delete').length;
    const duplicateCount = filteredRecords.filter(r => r.action === 'duplicate').length;
    
    document.getElementById('totalRecords').textContent = total;
    document.getElementById('totalAdd').textContent = addCount;
    document.getElementById('totalUpdate').textContent = updateCount;
    document.getElementById('totalDelete').textContent = deleteCount;
    document.getElementById('totalDuplicate').textContent = duplicateCount;
}

// ========== СБРОС ФИЛЬТРОВ ==========
function resetFilters() {
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const actionFilter = document.getElementById('actionFilter');
    const searchAddress = document.getElementById('searchAddress');
    
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    if (actionFilter) actionFilter.value = 'all';
    if (searchAddress) searchAddress.value = '';
    
    applyFilters();
}

// ========== ФОРМАТИРОВАНИЕ ДАТЫ ==========
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// ========== ПОЛУЧЕНИЕ CSS-КЛАССА ДЛЯ ДЕЙСТВИЯ ==========
function getActionClass(action) {
    switch (action) {
        case 'add': return 'action-add';
        case 'update': return 'action-update';
        case 'delete': return 'action-delete';
        case 'duplicate': return 'action-duplicate';
        default: return '';
    }
}

// ========== ПОЛУЧЕНИЕ ТЕКСТА ДЛЯ ДЕЙСТВИЯ ==========
function getActionText(action) {
    switch (action) {
        case 'add': return '➕ Добавление';
        case 'update': return '✏️ Изменение';
        case 'delete': return '🗑️ Удаление';
        case 'duplicate': return '📋 Копирование';
        default: return action;
    }
}

// ========== ФОРМИРОВАНИЕ ДЕТАЛЕЙ ЗАПИСИ ==========
function formatDetails(record) {
    if (record.action === 'add') {
        const summary = record.details?.summary || 'Новый дом';
        return `<div class="record-details">📋 ${escapeHtml(summary)}</div>`;
    }
    
    if (record.action === 'update') {
        const changes = record.details?.changes || [];
        if (changes.length === 0) return '<div class="record-details">📝 Изменения не детализированы</div>';
        
        let html = '<div class="record-details"><ul>';
        changes.forEach(change => {
            let fieldName = change.field;
            if (fieldName === 'address') fieldName = 'Адрес';
            else if (fieldName === 'district') fieldName = 'Район';
            else if (fieldName === 'floors') fieldName = 'Этажность';
            else if (fieldName === 'buildYear') fieldName = 'Год постройки';
            else if (fieldName === 'constructionYear') fieldName = 'Год ввода';
            else if (fieldName === 'liftsCount') fieldName = 'Количество лифтов';
            else if (fieldName === 'coords') fieldName = 'Координаты';
            else if (fieldName === 'programWorks') fieldName = 'Программы работ';
            else if (fieldName === 'shortTermWorks') fieldName = 'Краткосрочный план';
            
            html += `<li>📌 ${fieldName}: ${escapeHtml(String(change.oldValue))} → ${escapeHtml(String(change.newValue))}</li>`;
        });
        html += '</ul></div>';
        return html;
    }
    
    if (record.action === 'delete') {
        const summary = record.details?.deletedData ? 
            `Был удалён дом с ${record.details.deletedData.entrances?.length || 0} подъездами, ${record.details.deletedData.entrances?.reduce((sum, e) => sum + (e.lifts?.length || 0), 0) || 0} лифтами` :
            'Дом удалён';
        return `<div class="record-details">
                    <div>⚠️ ${escapeHtml(summary)}</div>
                    <button class="restore-btn" data-house-id="${record.houseId}" data-house-address="${escapeHtml(record.houseAddress)}">♻️ Восстановить</button>
                </div>`;
    }
    
    if (record.action === 'duplicate') {
        const source = record.details?.sourceHouseAddress || 'неизвестного дома';
        return `<div class="record-details">🔄 Создана копия из дома "${escapeHtml(source)}"</div>`;
    }
    
    return '';
}

// ========== ОТРИСОВКА ТАБЛИЦЫ ==========
function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageRecords = filteredRecords.slice(start, end);
    
    tbody.innerHTML = '';
    
    if (pageRecords.length === 0) {
        const row = tbody.insertRow();
        row.insertCell(0).colSpan = 6;
        row.insertCell(0).textContent = 'Нет записей';
        row.insertCell(0).style.textAlign = 'center';
        row.insertCell(0).style.padding = '40px';
        return;
    }
    
    pageRecords.forEach(record => {
        const row = tbody.insertRow();
        
        // Дата
        row.insertCell(0).textContent = formatDateTime(record.timestamp);
        
        // Адрес (ссылка на редактирование дома)
        const addressCell = row.insertCell(1);
        if (record.houseId) {
            addressCell.innerHTML = `<a href="edit.html?id=${record.houseId}" class="details-link">${escapeHtml(record.houseAddress)}</a>`;
        } else {
            addressCell.textContent = escapeHtml(record.houseAddress);
        }
        
        // Действие с цветным бейджем
        const actionCell = row.insertCell(2);
        actionCell.innerHTML = `<span class="record-action ${getActionClass(record.action)}">${getActionText(record.action)}</span>`;
        
        // Пользователь
        row.insertCell(3).textContent = record.user || 'admin';
        
        // Детали
        const detailsCell = row.insertCell(4);
        detailsCell.innerHTML = formatDetails(record);
        
        // Кнопка удаления записи
        const deleteCell = row.insertCell(5);
        deleteCell.innerHTML = `<button class="delete-record-btn" data-record-id="${record.id}" title="Удалить запись">🗑️</button>`;
    });
    
    // Добавляем обработчики для кнопок восстановления и удаления
    document.querySelectorAll('.restore-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const houseId = parseInt(btn.dataset.houseId);
            const houseAddress = btn.dataset.houseAddress;
            await restoreDeletedHouse(houseId, houseAddress);
        });
    });
    
    document.querySelectorAll('.delete-record-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const recordId = btn.dataset.recordId;
            await deleteRecord(recordId);
        });
    });
}

// ========== РЕНДЕРИНГ ПАГИНАЦИИ ==========
function renderPagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
    
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
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderHistoryTable();
    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ========== ВОССТАНОВЛЕНИЕ УДАЛЁННОГО ДОМА ==========
async function restoreDeletedHouse(houseId, houseAddress) {
    if (!confirm(`Восстановить дом "${houseAddress}"? Дом будет добавлен обратно в data.json.`)) return;
    
    // Находим запись об удалении
    const deleteRecord = allRecords.find(r => r.action === 'delete' && r.houseId === houseId);
    if (!deleteRecord || !deleteRecord.details?.deletedData) {
        showToast('❌ Не найдены данные для восстановления');
        return;
    }
    
    // Загружаем текущие данные
    await loadData();
    
    // Проверяем, не существует ли уже дом с таким ID
    const existingHouse = housesData.find(h => h.id === houseId);
    if (existingHouse) {
        if (!confirm(`Дом с ID ${houseId} уже существует. Восстановить с новым ID?`)) return;
        const maxId = Math.max(...housesData.map(h => h.id), 0);
        deleteRecord.details.deletedData.id = maxId + 1;
    }
    
    // Восстанавливаем дом
    housesData.push(deleteRecord.details.deletedData);
    
    // Сохраняем изменения
    const jsonStr = JSON.stringify(housesData, null, 2);
    const blob = new Blob([jsonStr], {type: 'application/json'});
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(`✅ Дом "${houseAddress}" восстановлен! Загрузите data.json на GitHub.`);
}

// ========== УДАЛЕНИЕ ОТДЕЛЬНОЙ ЗАПИСИ ==========
async function deleteRecord(recordId) {
    if (!confirm('Удалить эту запись из истории?')) return;
    
    // Загружаем текущую историю
    let history = { records: [] };
    try {
        const response = await fetch('../history.json?t=' + Date.now());
        if (response.ok) {
            history = await response.json();
        }
    } catch (e) {}
    
    history.records = history.records.filter(r => r.id !== recordId);
    
    // Сохраняем
    const jsonStr = JSON.stringify(history, null, 2);
    const blob = new Blob([jsonStr], {type: 'application/json'});
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'history.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('✅ Запись удалена! Загрузите history.json на GitHub.');
    
    // Перезагружаем страницу
    setTimeout(() => location.reload(), 500);
}

// ========== ОЧИСТКА ВСЕЙ ИСТОРИИ ==========
async function clearAllHistory() {
    if (!confirm('⚠️ ВНИМАНИЕ! Это действие удалит ВСЮ историю изменений без возможности восстановления. Продолжить?')) return;
    
    const emptyHistory = { records: [] };
    const jsonStr = JSON.stringify(emptyHistory, null, 2);
    const blob = new Blob([jsonStr], {type: 'application/json'});
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'history.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('✅ История очищена! Загрузите history.json на GitHub.');
    setTimeout(() => location.reload(), 500);
}