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
            return data;
        })
        .catch(error => {
            console.error('Ошибка загрузки:', error);
            alert('Не удалось загрузить data.json. Убедитесь, что файл существует в корне репозитория.');
            return [];
        });
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
    const maxId = Math.max(...housesData.map(h => h.id), 0);
    newHouse.id = maxId + 1;
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

// ========== ЭСКЕЙПИНГ HTML ==========
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
        
        if (lastSaveRelativeSpan) {
            lastSaveRelativeSpan.textContent = `(${getRelativeTime(parseInt(savedTimestamp))})`;
        }
    } else {
        lastSaveDateSpan.textContent = 'Нет данных';
        if (lastSaveRelativeSpan) lastSaveRelativeSpan.textContent = '';
    }
}

function saveLastSaveTimestamp() {
    const now = Date.now();
    localStorage.setItem('adminLastSave', now);
    updateLastSaveIndicator();
}

// ========== КАСТОМНОЕ ОКНО ПОДТВЕРЖДЕНИЯ (с поддержкой тёмной темы) ==========
function showConfirmModal(options) {
    return new Promise((resolve) => {
        const existingModal = document.querySelector('.custom-confirm-modal');
        if (existingModal) existingModal.remove();
        
        const isDarkTheme = document.body.classList.contains('dark-theme');
        
        const colors = isDarkTheme ? {
            background: '#252a38',
            textColor: '#e0e0e0',
            titleColor: '#a0c4e8',
            messageColor: '#b0b4c0',
            cancelBg: '#3a3e4d',
            cancelHover: '#4a4e5d',
            cancelText: '#e0e0e0'
        } : {
            background: '#ffffff',
            textColor: '#1a2a3a',
            titleColor: '#0b3b5f',
            messageColor: '#4a627a',
            cancelBg: '#eef2f6',
            cancelHover: '#dce5ec',
            cancelText: '#1a2a3a'
        };
        
        const modal = document.createElement('div');
        modal.className = 'custom-confirm-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            animation: fadeIn 0.2s ease-out;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: ${colors.background};
            border-radius: 20px;
            padding: 28px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: slideIn 0.2s ease-out;
        `;
        
        const icon = options.icon || '⚠️';
        const title = options.title || 'Подтверждение';
        const message = options.message || 'Вы уверены?';
        const confirmText = options.confirmText || 'Да';
        const cancelText = options.cancelText || 'Отмена';
        const confirmColor = options.confirmColor || '#dc2626';
        
        content.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 12px;">${icon}</div>
            <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 12px; color: ${colors.titleColor};">${title}</div>
            <div style="margin-bottom: 24px; color: ${colors.messageColor}; line-height: 1.5;">${message}</div>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="confirmYes" class="confirm-btn-yes" style="background: ${confirmColor}; color: white; border: none; padding: 10px 20px; border-radius: 30px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;">${confirmText}</button>
                <button id="confirmNo" class="confirm-btn-no" style="background: ${colors.cancelBg}; color: ${colors.cancelText}; border: none; padding: 10px 20px; border-radius: 30px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;">${cancelText}</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        if (!document.querySelector('#confirm-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'confirm-modal-styles';
            style.textContent = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
                .confirm-btn-yes:hover, .confirm-btn-no:hover { transform: scale(0.98); }
            `;
            document.head.appendChild(style);
        }
        
        const confirmBtn = document.getElementById('confirmYes');
        const cancelBtn = document.getElementById('confirmNo');
        
        const cleanup = () => { modal.remove(); };
        
        confirmBtn.addEventListener('click', () => { cleanup(); resolve(true); });
        cancelBtn.addEventListener('click', () => { cleanup(); resolve(false); });
        
        modal.addEventListener('click', (e) => { if (e.target === modal) { cleanup(); resolve(false); } });
        
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve(false);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

// ========== ВЫХОД С КАСТОМНЫМ ОКНОМ ==========
async function logout() {
    const confirmed = await showConfirmModal({
        icon: '🚪',
        title: 'Выход из админ-панели',
        message: 'Точно выйти? Все несохранённые изменения будут потеряны.',
        confirmText: 'Да, выйти',
        cancelText: 'Отмена',
        confirmColor: '#dc2626'
    });
    
    if (confirmed) {
        sessionStorage.removeItem('adminLoggedIn');
        window.location.href = 'login.html';
    }
}

// ========== СОХРАНЕНИЕ ТЕКУЩИХ ДАННЫХ ПОДЪЕЗДОВ (для edit.js) ==========
window.saveCurrentEntranceData = function() {
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

// ========== СОХРАНЕНИЕ ПРОГРАММ (для edit.js) ==========
window.saveCurrentProgramsData = function() {
    for (let i = 0; i < window.programsData.length; i++) {
        window.programsData[i].year = document.getElementById(`prog_year_${i}`)?.value || '';
        window.programsData[i].description = document.getElementById(`prog_desc_${i}`)?.value || '';
    }
};

// ========== СОХРАНЕНИЕ КРАТКОСРОЧНЫХ ПЛАНОВ (для edit.js) ==========
window.saveCurrentShortTermData = function() {
    for (let i = 0; i < window.shortTermData.length; i++) {
        window.shortTermData[i].type = document.getElementById(`term_type_${i}`)?.value || '';
        window.shortTermData[i].contractor = document.getElementById(`term_contractor_${i}`)?.value || '';
        window.shortTermData[i].period = document.getElementById(`term_period_${i}`)?.value || '';
    }
};

// ========== ПРОВЕРКА АВТОРИЗАЦИИ ==========
function checkAuth() {
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ========== ИНИЦИАЛИЗАЦИЯ ТЁМНОЙ ТЕМЫ ==========
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

// ========== ИНИЦИАЛИЗАЦИЯ ИНДИКАТОРА ==========
document.addEventListener('DOMContentLoaded', function() {
    updateLastSaveIndicator();
});