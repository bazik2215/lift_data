// ========== ПЕРЕМЕННЫЕ ==========
let statsData = {};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async function() {
    // Проверка авторизации
    if (!checkAuth()) return;
    
    // Инициализация темы
    initAdminTheme();
    
    // Загрузка данных
    await loadData();
    
    // Расчёт статистики
    calculateAllStats();
    
    // Отрисовка статистики
    renderAllStats();
    
    // Настройка обработчиков
    setupEventListeners();
});

// ========== НАСТРОЙКА ОБРАБОТЧИКОВ ==========
function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleAdminTheme);
    }
}

// ========== РАСЧЁТ ВСЕХ СТАТИСТИК ==========
function calculateAllStats() {
    // Общая статистика
    statsData.totalHouses = housesData.length;
    statsData.totalLifts = getTotalLiftsCount();
    statsData.totalPrograms = getTotalProgramsCount();
    
    // Распределение по районам (дома)
    statsData.districts = {};
    housesData.forEach(house => {
        const district = house.district || 'Не указан';
        statsData.districts[district] = (statsData.districts[district] || 0) + 1;
    });
    
    // Текущие лифты по районам
    statsData.currentLiftsByDistrict = {};
    // Заменённые лифты по районам
    statsData.replacedLiftsByDistrict = {};
    
    housesData.forEach(house => {
        const district = house.district || 'Не указан';
        
        // Текущие лифты
        const lifts = getAllLifts(house);
        statsData.currentLiftsByDistrict[district] = (statsData.currentLiftsByDistrict[district] || 0) + lifts.length;
        
        // Заменённые лифты
        const previousLifts = getAllPreviousLifts(house);
        statsData.replacedLiftsByDistrict[district] = (statsData.replacedLiftsByDistrict[district] || 0) + previousLifts.length;
    });
    
    // Распределение по годам программы
    statsData.programYears = {};
    housesData.forEach(house => {
        if (house.programWorks) {
            house.programWorks.forEach(prog => {
                const year = prog.year || 'Не указан';
                statsData.programYears[year] = (statsData.programYears[year] || 0) + 1;
            });
        }
    });
    
    // Модели текущих лифтов
    statsData.currentModels = {};
    const allLifts = [];
    housesData.forEach(house => {
        const lifts = getAllLifts(house);
        lifts.forEach(lift => {
            allLifts.push(lift);
            const model = lift.model || 'Не указана';
            statsData.currentModels[model] = (statsData.currentModels[model] || 0) + 1;
        });
    });
    
    // Модели заменённых лифтов
    statsData.replacedModels = {};
    housesData.forEach(house => {
        const previousLifts = getAllPreviousLifts(house);
        previousLifts.forEach(lift => {
            const model = lift.model || 'Не указана';
            statsData.replacedModels[model] = (statsData.replacedModels[model] || 0) + 1;
        });
    });
    
    // Типы лифтов
    statsData.liftTypes = {};
    allLifts.forEach(lift => {
        const type = lift.type || 'Не указан';
        statsData.liftTypes[type] = (statsData.liftTypes[type] || 0) + 1;
    });
    
    // Грузоподъемность
    statsData.capacities = {};
    allLifts.forEach(lift => {
        const capacity = lift.loadCapacity || 'Не указана';
        statsData.capacities[capacity] = (statsData.capacities[capacity] || 0) + 1;
    });
    
    // Скорость
    statsData.speeds = {};
    allLifts.forEach(lift => {
        const speed = lift.speed || 'Не указана';
        statsData.speeds[speed] = (statsData.speeds[speed] || 0) + 1;
    });
    
    // Подрядчики из краткосрочного плана
    statsData.contractors = {};
    housesData.forEach(house => {
        if (house.shortTermWorks) {
            house.shortTermWorks.forEach(plan => {
                const contractor = plan.contractor || 'Не указан';
                if (contractor !== 'Не указан' && contractor !== '—' && contractor !== '') {
                    statsData.contractors[contractor] = (statsData.contractors[contractor] || 0) + 1;
                }
            });
        }
    });
}

// ========== ОТРИСОВКА ВСЕХ СТАТИСТИК ==========
function renderAllStats() {
    // Общая статистика
    document.getElementById('totalHouses').textContent = statsData.totalHouses;
    document.getElementById('totalLifts').textContent = statsData.totalLifts;
    document.getElementById('totalPrograms').textContent = statsData.totalPrograms;
    
    // Распределение по районам (дома)
    renderDistrictsStats();
    
    // Текущие лифты по районам
    renderCurrentLiftsByDistrict();
    
    // Заменённые лифты по районам
    renderReplacedLiftsByDistrict();
    
    // Распределение по годам
    renderYearsStats();
    
    // Модели текущих лифтов
    renderCurrentModelsStats();
    
    // Модели заменённых лифтов
    renderReplacedModelsStats();
    
    // Типы лифтов
    renderTypesStats();
    
    // Грузоподъемность
    renderCapacityStats();
    
    // Скорость
    renderSpeedStats();
    
    // Подрядчики
    renderContractorsStats();
}

// ========== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОЛЗУНКОВ ==========
function renderProgressBar(percent, showPercentInside = true) {
    if (percent >= 20 && showPercentInside) {
        // Если процент больше 20, показываем внутри
        return `<div class="progress-bar"><div class="progress-fill" style="width: ${percent}%">${percent}%</div></div>`;
    } else {
        // Если меньше 20, показываем ползунок без процента, а процент справа
        return `<div class="progress-bar" style="display: inline-block; width: 120px;"><div class="progress-fill" style="width: ${percent}%; min-width: 4px;"></div></div><span style="margin-left: 8px;">${percent}%</span>`;
    }
}

// ========== РАСПРЕДЕЛЕНИЕ ПО РАЙОНАМ (ДОМА) ==========
function renderDistrictsStats() {
    const container = document.getElementById('districtsStats');
    if (!container) return;
    
    const sorted = Object.entries(statsData.districts).sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...Object.values(statsData.districts), 1);
    
    let html = '<table class="stats-table">';
    html += '<thead><tr><th>Район</th><th>Домов</th><th>Доля</th></tr></thead><tbody>';
    
    sorted.forEach(([district, count]) => {
        const percent = Math.round((count / statsData.totalHouses) * 100);
        html += `
            <tr>
                <td>${escapeHtml(district)}</td>
                <td>${count}</td>
                <td>${renderProgressBar(percent, percent >= 20)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== ТЕКУЩИЕ ЛИФТЫ ПО РАЙОНАМ ==========
function renderCurrentLiftsByDistrict() {
    const container = document.getElementById('currentLiftsByDistrict');
    if (!container) {
        // Если контейнера нет, создадим его в HTML позже, но для безопасности проверим
        console.warn('Контейнер currentLiftsByDistrict не найден');
        return;
    }
    
    const sorted = Object.entries(statsData.currentLiftsByDistrict).sort((a, b) => b[1] - a[1]);
    const total = Object.values(statsData.currentLiftsByDistrict).reduce((a, b) => a + b, 0);
    
    let html = '<table class="stats-table">';
    html += '<thead><tr><th>Район</th><th>Лифтов</th><th>Доля</th></tr></thead><tbody>';
    
    sorted.forEach(([district, count]) => {
        const percent = Math.round((count / total) * 100);
        html += `
            <tr>
                <td>${escapeHtml(district)}</td>
                <td>${count}</td>
                <td>${renderProgressBar(percent, percent >= 20)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></td>';
    container.innerHTML = html;
}

// ========== ЗАМЕНЁННЫЕ ЛИФТЫ ПО РАЙОНАМ ==========
function renderReplacedLiftsByDistrict() {
    const container = document.getElementById('replacedLiftsByDistrict');
    if (!container) {
        console.warn('Контейнер replacedLiftsByDistrict не найден');
        return;
    }
    
    const sorted = Object.entries(statsData.replacedLiftsByDistrict).sort((a, b) => b[1] - a[1]);
    const total = Object.values(statsData.replacedLiftsByDistrict).reduce((a, b) => a + b, 0);
    
    if (total === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">Нет данных о заменённых лифтах</p>';
        return;
    }
    
    let html = '<table class="stats-table">';
    html += '<thead><tr><th>Район</th><th>Лифтов</th><th>Доля</th></tr></thead><tbody>';
    
    sorted.forEach(([district, count]) => {
        const percent = Math.round((count / total) * 100);
        html += `
            <tr>
                <td>${escapeHtml(district)}</td>
                <td>${count}</td>
                <td>${renderProgressBar(percent, percent >= 20)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== ЗАМЕНА ЛИФТОВ ПО ГОДАМ ==========
function renderYearsStats() {
    const container = document.getElementById('yearsStats');
    if (!container) return;
    
    const sorted = Object.entries(statsData.programYears).sort((a, b) => {
        const yearA = a[0].split(' - ')[0];
        const yearB = b[0].split(' - ')[0];
        return yearA.localeCompare(yearB);
    });
    const total = Object.values(statsData.programYears).reduce((a, b) => a + b, 0);
    
    let html = '<table class="stats-table">';
    html += '<thead><tr><th>Год</th><th>Программ</th><th>Доля</th></tr></thead><tbody>';
    
    sorted.forEach(([year, count]) => {
        const percent = Math.round((count / total) * 100);
        html += `
            <tr>
                <td>${escapeHtml(year)}</td>
                <td>${count}</td>
                <td>${renderProgressBar(percent, percent >= 20)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== МОДЕЛИ ТЕКУЩИХ ЛИФТОВ ==========
function renderCurrentModelsStats() {
    const container = document.getElementById('currentModelsStats');
    if (!container) return;
    
    const sorted = Object.entries(statsData.currentModels).sort((a, b) => b[1] - a[1]);
    const total = Object.values(statsData.currentModels).reduce((a, b) => a + b, 0);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">Нет данных</p>';
        return;
    }
    
    let html = '<table class="stats-table">';
    html += '<thead><tr><th>Модель</th><th>Количество</th><th>Доля</th></tr></thead><tbody>';
    
    sorted.forEach(([model, count]) => {
        const percent = Math.round((count / total) * 100);
        html += `
            <tr>
                <td>${escapeHtml(model)}</td>
                <td>${count}</td>
                <td>${renderProgressBar(percent, percent >= 20)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== МОДЕЛИ ЗАМЕНЁННЫХ ЛИФТОВ ==========
function renderReplacedModelsStats() {
    const container = document.getElementById('replacedModelsStats');
    if (!container) return;
    
    const sorted = Object.entries(statsData.replacedModels).sort((a, b) => b[1] - a[1]);
    const total = Object.values(statsData.replacedModels).reduce((a, b) => a + b, 0);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">Нет данных о заменённых лифтах</p>';
        return;
    }
    
    let html = '<table class="stats-table">';
    html += '<thead><tr><th>Модель</th><th>Количество</th><th>Доля</th></tr></thead><tbody>';
    
    sorted.forEach(([model, count]) => {
        const percent = Math.round((count / total) * 100);
        html += `
            <tr>
                <td>${escapeHtml(model)}</td>
                <td>${count}</td>
                <td>${renderProgressBar(percent, percent >= 20)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== ТИПЫ ЛИФТОВ ==========
function renderTypesStats() {
    const container = document.getElementById('typesStats');
    if (!container) return;
    
    const sorted = Object.entries(statsData.liftTypes).sort((a, b) => b[1] - a[1]);
    const total = Object.values(statsData.liftTypes).reduce((a, b) => a + b, 0);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">Нет данных</p>';
        return;
    }
    
    let html = '<table class="stats-table">';
    html += '<thead><tr><th>Тип</th><th>Количество</th><th>Доля</th></tr></thead><tbody>';
    
    sorted.forEach(([type, count]) => {
        const percent = Math.round((count / total) * 100);
        html += `
            <tr>
                <td>${escapeHtml(type)}</td>
                <td>${count}</td>
                <td>${renderProgressBar(percent, percent >= 20)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== ГРУЗОПОДЪЕМНОСТЬ ==========
function renderCapacityStats() {
    const container = document.getElementById('capacityStats');
    if (!container) return;
    
    const sorted = Object.entries(statsData.capacities).sort((a, b) => {
        const numA = parseInt(a[0]) || 0;
        const numB = parseInt(b[0]) || 0;
        return numB - numA;
    });
    const total = Object.values(statsData.capacities).reduce((a, b) => a + b, 0);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">Нет данных</p>';
        return;
    }
    
    let html = '<table class="stats-table">';
    html += '<thead><tr><th>Грузоподъемность</th><th>Количество</th><th>Доля</th></tr></thead><tbody>';
    
    sorted.forEach(([capacity, count]) => {
        const percent = Math.round((count / total) * 100);
        html += `
            <tr>
                <td>${escapeHtml(capacity)}</td>
                <td>${count}</td>
                <td>${renderProgressBar(percent, percent >= 20)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== СКОРОСТЬ ==========
function renderSpeedStats() {
    const container = document.getElementById('speedStats');
    if (!container) return;
    
    const sorted = Object.entries(statsData.speeds).sort((a, b) => b[1] - a[1]);
    const total = Object.values(statsData.speeds).reduce((a, b) => a + b, 0);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">Нет данных</p>';
        return;
    }
    
    let html = '<table class="stats-table">';
    html += '<thead><tr><th>Скорость</th><th>Количество</th><th>Доля</th></tr></thead><tbody>';
    
    sorted.forEach(([speed, count]) => {
        const percent = Math.round((count / total) * 100);
        html += `
            <tr>
                <td>${escapeHtml(speed)}</td>
                <td>${count}</td>
                <td>${renderProgressBar(percent, percent >= 20)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== ПОДРЯДЧИКИ ==========
function renderContractorsStats() {
    const container = document.getElementById('contractorsStats');
    if (!container) return;
    
    const sorted = Object.entries(statsData.contractors).sort((a, b) => b[1] - a[1]);
    const total = Object.values(statsData.contractors).reduce((a, b) => a + b, 0);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">Нет данных о подрядчиках</p>';
        return;
    }
    
    let html = '<table class="stats-table">';
    html += '<thead><tr><th>Подрядчик</th><th>Количество</th><th>Доля</th></tr></thead><tbody>';
    
    sorted.forEach(([contractor, count]) => {
        const percent = Math.round((count / total) * 100);
        html += `
            <tr>
                <td>${escapeHtml(contractor)}</td>
                <td>${count}</td>
                <td>${renderProgressBar(percent, percent >= 20)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}