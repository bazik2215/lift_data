// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let housesData = [];
let currentEditingHouseId = null;

// ========== ЗАГРУЗКА ДАННЫХ ==========
function loadData() {
    return fetch('../data.json?t=' + Date.now())
        .then(response => {
            if (!response.ok) throw new Error('Ошибка загрузки data.json');
            return response.json();
        })
        .then(data => {
            housesData = data;
            console.log('📦 Загружено домов в housesData:', housesData.length);
            return data;
        })
        .catch(error => {
            console.error('Ошибка загрузки:', error);
            alert('Не удалось загрузить data.json. Убедитесь, что файл существует в корне репозитория.');
            return [];
        });
}

// ========== ЗАГРУЗКА ИСТОРИИ ==========
async function loadHistory() {
    try {
        const response = await fetch('../history.json?t=' + Date.now());
        if (response.ok) {
            const data = await response.json();
            console.log('✅ История загружена, записей:', data.records?.length || 0);
            return data;
        }
        console.log('⚠️ history.json не найден, создаём пустой');
        return { records: [] };
    } catch (error) {
        console.error('❌ Ошибка загрузки истории:', error);
        return { records: [] };
    }
}

// ========== СОХРАНЕНИЕ JSON ==========
function saveJSON() {
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
    
    saveLastSaveTimestamp();
    showToast('✅ JSON сохранён! Загрузите файл на GitHub.');
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

function getAllLifts(house) {
    const lifts = [];
    if (house.entrances) {
        house.entrances.forEach(entrance => {
            if (entrance.lifts && entrance.lifts.length > 0) {
                entrance.lifts.forEach(lift => lifts.push(lift));
            } else if (entrance.lift) {
                lifts.push(entrance.lift);
            }
        });
    }
    return lifts;
}

function getAllPreviousLifts(house) {
    const previousLifts = [];
    if (house.entrances) {
        house.entrances.forEach(entrance => {
            if (entrance.lifts && entrance.lifts.length > 0) {
                entrance.lifts.forEach(lift => {
                    if (lift.previousLift) previousLifts.push(lift.previousLift);
                });
            } else if (entrance.lift && entrance.lift.previousLift) {
                previousLifts.push(entrance.lift.previousLift);
            }
        });
    }
    return previousLifts;
}

function getTotalLiftsCount() {
    let total = 0;
    housesData.forEach(house => total += getLiftsCount(house));
    return total;
}

function getTotalProgramsCount() {
    let total = 0;
    housesData.forEach(house => {
        if (house.programWorks) total += house.programWorks.length;
    });
    return total;
}

// ========== ПОИСК И СОРТИРОВКА ==========
function filterHousesByAddress(query) {
    if (!query) return housesData;
    return housesData.filter(house => 
        house.address.toLowerCase().includes(query.toLowerCase())
    );
}

function sortHouses(houses, sortBy, sortDirection) {
    const sorted = [...houses];
    sorted.sort((a, b) => {
        let valA, valB;
        switch (sortBy) {
            case 'id':
                valA = a.id;
                valB = b.id;
                break;
            case 'address':
                valA = a.address || '';
                valB = b.address || '';
                return sortDirection === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            case 'district':
                valA = a.district || '';
                valB = b.district || '';
                return sortDirection === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            case 'buildYear':
                valA = a.buildYear || 0;
                valB = b.buildYear || 0;
                break;
            default:
                return 0;
        }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    return sorted;
}

// ========== ДУБЛИРОВАНИЕ ДОМА ==========
function duplicateHouse(house) {
    const newHouse = JSON.parse(JSON.stringify(house));
    const maxId = getNextId();
    newHouse.id = maxId;
    newHouse.address = `${newHouse.address} (копия)`;
    return newHouse;
}

// ========== УДАЛЕНИЕ ДОМА ==========
function deleteHouseById(id) {
    if (confirm('🗑️ Удалить дом? Это действие нельзя отменить.')) {
        housesData = housesData.filter(house => house.id !== id);
        return true;
    }
    return false;
}

// ========== ПОЛУЧЕНИЕ СЛЕДУЮЩЕГО ID ==========
function getNextId() {
    const maxId = Math.max(...housesData.map(h => h.id), 0);
    return maxId + 1;
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
    const timestamp = Date.now();
    localStorage.setItem('adminLastSave', timestamp);
    updateLastSaveIndicator();
    console.log('💾 Время сохранения обновлено:', new Date(timestamp).toLocaleString());
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

// ========== СОХРАНЕНИЕ ДАННЫХ ИЗ ФОРМ (ДЛЯ EDIT.JS) ==========
window.saveCurrentEntranceData = function() {
    if (!window.entrancesData) return;
    for (let i = 0; i < window.entrancesData.length; i++) {
        window.entrancesData[i].name = document.getElementById(`entrance_name_${i}`)?.value || '';
        const lifts = window[`liftsData_${i}`] || [];
        for (let j = 0; j < lifts.length; j++) {
            lifts[j].registrationNumber = document.getElementById(`lift_regNumber_${i}_${j}`)?.value || '';
            lifts[j].name = document.getElementById(`lift_name_${i}_${j}`)?.value || '';
            lifts[j].model = document.getElementById(`lift_model_${i}_${j}`)?.value || '';
            lifts[j].yearMade = document.getElementById(`lift_yearMade_${i}_${j}`)?.value || '';
            lifts[j].yearOper = document.getElementById(`lift_yearOper_${i}_${j}`)?.value || '';
            lifts[j].speed = document.getElementById(`lift_speed_${i}_${j}`)?.value || '';
            lifts[j].loadCapacity = document.getElementById(`lift_loadCapacity_${i}_${j}`)?.value || '';
            lifts[j].type = document.getElementById(`lift_type_${i}_${j}`)?.value || '';
            lifts[j].stops = document.getElementById(`lift_stops_${i}_${j}`)?.value || '';
            lifts[j].engine = document.getElementById(`lift_engine_${i}_${j}`)?.value || '';
            lifts[j].condition = document.getElementById(`lift_condition_${i}_${j}`)?.value || '';
            lifts[j].note = document.getElementById(`lift_note_${i}_${j}`)?.value || '';
            
            const prevModel = document.getElementById(`prev_lift_model_${i}_${j}`)?.value;
            if (prevModel) {
                lifts[j].previousLift = {
                    model: prevModel,
                    yearMade: document.getElementById(`prev_lift_yearMade_${i}_${j}`)?.value || '',
                    yearOper: document.getElementById(`prev_lift_yearOper_${i}_${j}`)?.value || '',
                    yearRemoved: document.getElementById(`prev_lift_yearRemoved_${i}_${j}`)?.value || '',
                    loadCapacity: document.getElementById(`prev_lift_loadCapacity_${i}_${j}`)?.value || '',
                    speed: document.getElementById(`prev_lift_speed_${i}_${j}`)?.value || '',
                    type: document.getElementById(`prev_lift_type_${i}_${j}`)?.value || '',
                    stops: document.getElementById(`prev_lift_stops_${i}_${j}`)?.value || '',
                    engine: document.getElementById(`prev_lift_engine_${i}_${j}`)?.value || '',
                    condition: document.getElementById(`prev_lift_condition_${i}_${j}`)?.value || '',
                    note: document.getElementById(`prev_lift_note_${i}_${j}`)?.value || ''
                };
            } else if (lifts[j].previousLift) {
                delete lifts[j].previousLift;
            }
        }
        window[`liftsData_${i}`] = lifts;
        window.entrancesData[i].lifts = lifts;
    }
};

window.saveCurrentProgramsData = function() {
    if (!window.programsData) return;
    for (let i = 0; i < window.programsData.length; i++) {
        window.programsData[i].year = document.getElementById(`prog_year_${i}`)?.value || '';
        window.programsData[i].description = document.getElementById(`prog_desc_${i}`)?.value || '';
    }
};

window.saveCurrentShortTermData = function() {
    if (!window.shortTermData) return;
    for (let i = 0; i < window.shortTermData.length; i++) {
        window.shortTermData[i].type = document.getElementById(`term_type_${i}`)?.value || '';
        window.shortTermData[i].contractor = document.getElementById(`term_contractor_${i}`)?.value || '';
        window.shortTermData[i].period = document.getElementById(`term_period_${i}`)?.value || '';
    }
};

// ========== СРАВНЕНИЕ ДОМОВ ==========
function compareHouses(oldHouse, newHouse) {
    const changes = [];
    
    const simpleFields = ['address', 'district', 'buildingType', 'buildYear', 'constructionYear', 'floors', 'series'];
    simpleFields.forEach(field => {
        const oldVal = oldHouse[field];
        const newVal = newHouse[field];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({
                field: field,
                oldValue: oldVal !== undefined && oldVal !== '' ? oldVal : '—',
                newValue: newVal !== undefined && newVal !== '' ? newVal : '—'
            });
        }
    });
    
    if (JSON.stringify(oldHouse.coords) !== JSON.stringify(newHouse.coords)) {
        changes.push({
            field: 'coords',
            oldValue: oldHouse.coords ? oldHouse.coords.join(', ') : '—',
            newValue: newHouse.coords ? newHouse.coords.join(', ') : '—'
        });
    }
    
    const oldLiftsCount = getLiftsCount(oldHouse);
    const newLiftsCount = getLiftsCount(newHouse);
    if (oldLiftsCount !== newLiftsCount) {
        changes.push({
            field: 'liftsCount',
            oldValue: oldLiftsCount,
            newValue: newLiftsCount
        });
    }
    
    if (JSON.stringify(oldHouse.programWorks) !== JSON.stringify(newHouse.programWorks)) {
        changes.push({
            field: 'programWorks',
            oldValue: `${oldHouse.programWorks?.length || 0} программ`,
            newValue: `${newHouse.programWorks?.length || 0} программ`
        });
    }
    
    if (JSON.stringify(oldHouse.shortTermWorks) !== JSON.stringify(newHouse.shortTermWorks)) {
        changes.push({
            field: 'shortTermWorks',
            oldValue: `${oldHouse.shortTermWorks?.length || 0} планов`,
            newValue: `${newHouse.shortTermWorks?.length || 0} планов`
        });
    }
    
    return changes;
}

// ========== ДОБАВЛЕНИЕ ЗАПИСИ В ИСТОРИЮ ==========
async function addHistoryRecord(action, houseId, houseAddress, details) {
    try {
        let history = await loadHistory();
        
        const newRecord = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 8),
            timestamp: new Date().toISOString(),
            action: action,
            houseId: houseId,
            houseAddress: houseAddress,
            user: 'admin',
            role: 'admin',
            details: details || {}
        };
        
        history.records.unshift(newRecord);
        
        if (history.records.length > 2000) {
            history.records = history.records.slice(0, 2000);
        }
        
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
        
        console.log('📜 Запись в историю добавлена:', newRecord);
        return newRecord;
    } catch (error) {
        console.error('Ошибка записи в историю:', error);
        return null;
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ИНДИКАТОРА ==========
document.addEventListener('DOMContentLoaded', function() {
    updateLastSaveIndicator();
});