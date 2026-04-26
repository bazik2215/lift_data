// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let housesData = [];
let currentEditingHouseId = null;

// ========== РАБОТА С LOCALSTORAGE ==========
const STORAGE_KEY = 'lift_data_houses_temp';

// Сохранить временные дома в localStorage
function saveTempHouses(tempHouses) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tempHouses));
}

// Загрузить временные дома из localStorage
function loadTempHouses() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        return JSON.parse(saved);
    }
    return [];
}

// Очистить временные дома
function clearTempHouses() {
    localStorage.removeItem(STORAGE_KEY);
}

// Получить все дома (постоянные + временные)
function getAllHouses() {
    const mainHouses = housesData || [];
    const tempHouses = loadTempHouses();
    
    // Объединяем, удаляя дубликаты по id (приоритет у временных)
    const allIds = new Set(mainHouses.map(h => h.id));
    const combined = [...mainHouses];
    
    tempHouses.forEach(tempHouse => {
        if (!allIds.has(tempHouse.id)) {
            combined.push(tempHouse);
        } else {
            // Если есть в основных, заменяем временным (более свежие данные)
            const index = combined.findIndex(h => h.id === tempHouse.id);
            if (index !== -1) combined[index] = tempHouse;
        }
    });
    
    return combined.sort((a, b) => a.id - b.id);
}

// ========== ЗАГРУЗКА ДАННЫХ С GITHUB ==========
function loadData() {
    return fetch('../data.json?t=' + Date.now())
        .then(response => {
            if (!response.ok) throw new Error('Ошибка загрузки data.json');
            return response.json();
        })
        .then(data => {
            housesData = data;
            return data;
        })
        .catch(error => {
            console.error('Ошибка загрузки:', error);
            return [];
        });
}

// ========== СОХРАНЕНИЕ JSON НА ДИСК ==========
function saveJSON() {
    // Берём все дома (постоянные + временные)
    const allHouses = getAllHouses();
    const jsonStr = JSON.stringify(allHouses, null, 2);
    const blob = new Blob([jsonStr], {type: 'application/json'});
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    saveLastSaveTimestamp();
    showToast('✅ JSON сохранён! Загрузите файл на GitHub.');
    
    // Предлагаем очистить временные данные
    setTimeout(() => {
        if (confirm('JSON сохранён! Очистить временные данные из браузера?')) {
            clearTempHouses();
            location.reload();
        }
    }, 500);
}

// ========== ПОДСЧЁТ СТАТИСТИКИ ==========
function getLiftsCount(house) {
    let count = 0;
    if (house.entrances) {
        house.entrances.forEach(entrance => {
            if (entrance.lifts && entrance.lifts.length > 0) {
                count += entrance.lifts.length;
            } else if (entrance.lift) {
                count += 1;
            }
        });
    }
    return count;
}

function getTotalLiftsCount() {
    const allHouses = getAllHouses();
    let total = 0;
    allHouses.forEach(house => total += getLiftsCount(house));
    return total;
}

function getTotalProgramsCount() {
    const allHouses = getAllHouses();
    let total = 0;
    allHouses.forEach(house => {
        if (house.programWorks) total += house.programWorks.length;
    });
    return total;
}

// ========== ID ДЛЯ НОВОГО ДОМА ==========
function getNextId() {
    const allHouses = getAllHouses();
    const maxId = Math.max(...allHouses.map(h => h.id), 0);
    return maxId + 1;
}

// ========== ДУБЛИРОВАНИЕ ==========
function duplicateHouse(house) {
    const newHouse = JSON.parse(JSON.stringify(house));
    newHouse.id = getNextId();
    newHouse.address = `${newHouse.address} (копия)`;
    return newHouse;
}

// ========== УДАЛЕНИЕ ДОМА ==========
function deleteHouseById(id) {
    const allHouses = getAllHouses();
    const tempHouses = loadTempHouses();
    const newTempHouses = tempHouses.filter(h => h.id !== id);
    saveTempHouses(newTempHouses);
    return true;
}

// ========== ДОБАВЛЕНИЕ ДОМА ВО ВРЕМЕННОЕ ХРАНИЛИЩЕ ==========
function addHouseToTemp(houseData) {
    const tempHouses = loadTempHouses();
    const existingIndex = tempHouses.findIndex(h => h.id === houseData.id);
    if (existingIndex !== -1) {
        tempHouses[existingIndex] = houseData;
    } else {
        tempHouses.push(houseData);
    }
    saveTempHouses(tempHouses);
}

// ========== УВЕДОМЛЕНИЯ ==========
function showToast(message, duration = 3000) {
    const existingToast = document.querySelector('.admin-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'admin-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #0b5e7e;
        color: white;
        padding: 10px 20px;
        border-radius: 30px;
        font-size: 0.9rem;
        z-index: 10000;
        animation: fadeInOut 2s ease-in-out;
        pointer-events: none;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
            15% { opacity: 1; transform: translateX(-50%) translateY(0); }
            85% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== ИНДИКАЦИЯ ПОСЛЕДНЕГО СОХРАНЕНИЯ ==========
function getRelativeTime(timestamp) {
    const now = Date.now();
    const diffSeconds = Math.floor((now - timestamp) / 1000);
    if (diffSeconds < 60) return 'только что';
    if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        return `${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'} назад`;
    }
    if (diffSeconds < 86400) {
        const hours = Math.floor(diffSeconds / 3600);
        return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} назад`;
    }
    const days = Math.floor(diffSeconds / 86400);
    return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`;
}

function updateLastSaveIndicator() {
    const lastSaveDateSpan = document.getElementById('lastSaveDate');
    const lastSaveRelativeSpan = document.getElementById('lastSaveRelative');
    if (!lastSaveDateSpan) return;
    
    const savedTimestamp = localStorage.getItem('adminLastSave');
    if (savedTimestamp) {
        const date = new Date(parseInt(savedTimestamp));
        const formattedDate = date.toLocaleDateString('ru-RU');
        const formattedTime = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lastSaveDateSpan.textContent = `${formattedDate}, ${formattedTime}`;
        if (lastSaveRelativeSpan) lastSaveRelativeSpan.textContent = `(${getRelativeTime(parseInt(savedTimestamp))})`;
    } else {
        lastSaveDateSpan.textContent = 'Нет данных';
        if (lastSaveRelativeSpan) lastSaveRelativeSpan.textContent = '';
    }
}

function saveLastSaveTimestamp() {
    localStorage.setItem('adminLastSave', Date.now());
    updateLastSaveIndicator();
}

// ========== ИСТОРИЯ ==========
async function addHistoryRecord(action, houseId, houseAddress, details) {
    try {
        let history = { records: [] };
        try {
            const response = await fetch('../history.json?t=' + Date.now());
            if (response.ok) history = await response.json();
        } catch(e) {}
        
        const newRecord = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            timestamp: new Date().toISOString(),
            action: action,
            houseId: houseId,
            houseAddress: houseAddress,
            user: 'admin',
            role: 'admin',
            details: details || {}
        };
        
        history.records.unshift(newRecord);
        if (history.records.length > 2000) history.records = history.records.slice(0, 2000);
        
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
        showToast('📜 История изменений сохранена! Загрузите history.json на GitHub.');
        
        return newRecord;
    } catch(error) {
        console.error('Ошибка записи в историю:', error);
        return null;
    }
}

// ========== ПРОВЕРКА АВТОРИЗАЦИИ ==========
function checkAuth() {
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ========== ТЁМНАЯ ТЕМА ==========
function initAdminTheme() {
    const savedTheme = localStorage.getItem('adminTheme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-theme');
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.textContent = '🌙';
    }
}

function toggleAdminTheme() {
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('adminTheme', 'light');
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.textContent = '🌙';
    } else {
        document.body.classList.add('dark-theme');
        localStorage.setItem('adminTheme', 'dark');
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.textContent = '☀️';
    }
}

async function logout() {
    if (confirm('Точно выйти из админ-панели?')) {
        sessionStorage.removeItem('adminLoggedIn');
        window.location.href = 'login.html';
    }
}

// Сохранение текущих данных из форм (для edit.js)
window.saveCurrentEntranceData = function() { /* полная функция */ };
window.saveCurrentProgramsData = function() { /* полная функция */ };
window.saveCurrentShortTermData = function() { /* полная функция */ };