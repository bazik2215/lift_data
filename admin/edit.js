// ========== ПЕРЕМЕННЫЕ ==========
let houseId = null;
let isNewHouse = true;
let oldHouseData = null;

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAuth()) return;
    initAdminTheme();
    
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    
    if (idParam) {
        houseId = parseInt(idParam);
        isNewHouse = false;
        document.getElementById('pageTitle').textContent = '✏️ Редактирование дома';
        document.getElementById('deleteHouseBtn').style.display = 'inline-block';
    } else {
        isNewHouse = true;
        document.getElementById('pageTitle').textContent = '➕ Добавление дома';
        document.getElementById('deleteHouseBtn').style.display = 'none';
    }
    
    await loadData();
    
    if (isNewHouse) {
        initEmptyForm();
    } else {
        const house = housesData.find(h => h.id === houseId);
        if (house) {
            oldHouseData = JSON.parse(JSON.stringify(house));
            fillForm(house);
        } else {
            showToast('❌ Дом не найден');
            window.location.href = 'index.html';
        }
    }
    
    setupEventListeners();
});

// ========== НАСТРОЙКА ОБРАБОТЧИКОВ ==========
function setupEventListeners() {
    document.getElementById('saveHouseBtn')?.addEventListener('click', () => saveHouse());
    document.getElementById('deleteHouseBtn')?.addEventListener('click', () => deleteHouse());
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('themeToggle')?.addEventListener('click', toggleAdminTheme);
    document.getElementById('addEntranceBtn')?.addEventListener('click', () => addEntrance());
    document.getElementById('addProgramBtn')?.addEventListener('click', () => addProgram());
    document.getElementById('addShortTermBtn')?.addEventListener('click', () => addShortTerm());
    document.getElementById('previewCoordsBtn')?.addEventListener('click', () => previewCoordinates());
    
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveHouse();
        }
    });
}

function initEmptyForm() {
    document.getElementById('houseId').value = getNextId();
    document.getElementById('houseBuildingType').value = 'Многоквартирный дом';
    window.entrancesData = [];
    window.programsData = [];
    window.shortTermData = [];
    renderEntrances();
    renderPrograms();
    renderShortTerm();
}

function fillForm(house) {
    document.getElementById('houseId').value = house.id;
    document.getElementById('houseAddress').value = house.address || '';
    document.getElementById('houseDistrict').value = house.district || '';
    document.getElementById('houseBuildingType').value = house.buildingType || 'Многоквартирный дом';
    document.getElementById('houseBuildYear').value = house.buildYear || '';
    document.getElementById('houseConstructionYear').value = house.constructionYear || '';
    document.getElementById('houseFloors').value = house.floors || '';
    document.getElementById('houseSeries').value = house.series || '';
    
    if (house.coords && house.coords.length === 2) {
        document.getElementById('houseCoords').value = house.coords.join(', ');
    }
    
    window.entrancesData = JSON.parse(JSON.stringify(house.entrances || []));
    window.programsData = JSON.parse(JSON.stringify(house.programWorks || []));
    window.shortTermData = JSON.parse(JSON.stringify(house.shortTermWorks || []));
    renderEntrances();
    renderPrograms();
    renderShortTerm();
}

function getNextId() {
    const maxId = Math.max(...housesData.map(h => h.id), 0);
    return maxId + 1;
}

// ========== МИНИ-КАРТА ==========
let miniMap = null;
let miniMapInitialized = false;
let isMapVisible = false;

function previewCoordinates() {
    const coordsInput = document.getElementById('houseCoords');
    const miniMapDiv = document.getElementById('miniMap');
    const previewBtn = document.getElementById('previewCoordsBtn');
    
    if (!coordsInput || !miniMapDiv || !previewBtn) return;
    
    const coordsStr = coordsInput.value.trim();
    if (!coordsStr) {
        showToast('❌ Введите координаты');
        return;
    }
    
    const parts = coordsStr.split(',').map(s => parseFloat(s.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
        showToast('❌ Неверный формат координат. Пример: 48.560115, 39.310170');
        return;
    }
    
    if (!isMapVisible) {
        miniMapDiv.style.display = 'block';
        previewBtn.textContent = '🗺️ Скрыть карту';
        isMapVisible = true;
        
        if (!miniMapInitialized) {
            initMiniMap(parts[0], parts[1]);
        } else if (miniMap) {
            miniMap.setCenter(parts);
        }
    } else {
        miniMapDiv.style.display = 'none';
        previewBtn.textContent = '🗺️ Показать на карте';
        isMapVisible = false;
    }
}

function initMiniMap(lat, lon) {
    if (typeof ymaps === 'undefined') {
        showToast('❌ Карты не загрузились');
        return;
    }
    
    ymaps.ready(() => {
        miniMap = new ymaps.Map('miniMap', {
            center: [lat, lon],
            zoom: 17,
            controls: ['zoomControl']
        });
        const placemark = new ymaps.Placemark([lat, lon], {}, { preset: 'islands#blueHomeIcon' });
        miniMap.geoObjects.add(placemark);
        miniMapInitialized = true;
    });
}

// ========== ОТРИСОВКА ПОДЪЕЗДОВ ==========
function renderEntrances() {
    const container = document.getElementById('entrancesContainer');
    if (!container) return;
    container.innerHTML = '';
    
    window.entrancesData.forEach((entrance, idx) => {
        const div = document.createElement('div');
        div.className = 'subgroup';
        div.innerHTML = `
            <div class="subgroup-header">
                <strong>🚪 Подъезд ${idx + 1}</strong>
                <button class="action-icon" onclick="removeEntrance(${idx})">🗑️</button>
            </div>
            <div class="form-field">
                <label>Название подъезда</label>
                <input type="text" id="entrance_name_${idx}" value="${escapeHtml(entrance.name || '')}">
            </div>
            <div id="lifts_${idx}_container"></div>
            <button class="btn-add" onclick="addLift(${idx})">➕ Добавить лифт</button>
        `;
        container.appendChild(div);
        
        const lifts = entrance.lifts || (entrance.lift ? [entrance.lift] : []);
        window[`liftsData_${idx}`] = JSON.parse(JSON.stringify(lifts));
        renderLifts(idx);
    });
}

function renderLifts(entranceIdx) {
    const container = document.getElementById(`lifts_${entranceIdx}_container`);
    if (!container) return;
    const lifts = window[`liftsData_${entranceIdx}`] || [];
    container.innerHTML = '';
    
    lifts.forEach((lift, liftIdx) => {
        const liftDiv = document.createElement('div');
        liftDiv.className = 'lift-group';
        liftDiv.innerHTML = `
            <div class="lift-header">
                <strong>🛗 Лифт ${liftIdx + 1}</strong>
                <button class="action-icon" onclick="removeLift(${entranceIdx}, ${liftIdx})">🗑️</button>
            </div>
            <div class="form-grid" style="grid-template-columns: repeat(2, 1fr); gap: 12px;">
                <div class="form-field"><label>Рег. номер</label><input type="text" id="lift_regNumber_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.registrationNumber || '')}"></div>
                <div class="form-field"><label>Название</label><input type="text" id="lift_name_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.name || '')}"></div>
                <div class="form-field"><label>Модель</label><input type="text" id="lift_model_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.model || '')}"></div>
                <div class="form-field"><label>Год изготовления</label><input type="number" id="lift_yearMade_${entranceIdx}_${liftIdx}" value="${lift.yearMade || ''}"></div>
                <div class="form-field"><label>Год ввода</label><input type="number" id="lift_yearOper_${entranceIdx}_${liftIdx}" value="${lift.yearOper || ''}"></div>
                <div class="form-field"><label>Скорость</label><input type="text" id="lift_speed_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.speed || '')}"></div>
                <div class="form-field"><label>Грузоподъемность</label><input type="text" id="lift_loadCapacity_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.loadCapacity || '')}"></div>
                <div class="form-field"><label>Тип лифта</label><input type="text" id="lift_type_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.type || '')}"></div>
                <div class="form-field"><label>Остановок</label><input type="number" id="lift_stops_${entranceIdx}_${liftIdx}" value="${lift.stops || ''}"></div>
                <div class="form-field"><label>Двигатель</label><input type="text" id="lift_engine_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.engine || '')}"></div>
                <div class="form-field"><label>Состояние</label><input type="text" id="lift_condition_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.condition || '')}"></div>
                <div class="form-field"><label>Примечание</label><input type="text" id="lift_note_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.note || '')}"></div>
            </div>
            <details style="margin-top: 12px;">
                <summary>📜 Предыдущий лифт (до замены)</summary>
                <div class="form-grid" style="grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px;">
                    <div class="form-field"><label>Модель</label><input type="text" id="prev_lift_model_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.previousLift ? lift.previousLift.model : '')}"></div>
                    <div class="form-field"><label>Год изготовления</label><input type="number" id="prev_lift_yearMade_${entranceIdx}_${liftIdx}" value="${lift.previousLift ? lift.previousLift.yearMade : ''}"></div>
                    <div class="form-field"><label>Год ввода</label><input type="number" id="prev_lift_yearOper_${entranceIdx}_${liftIdx}" value="${lift.previousLift ? lift.previousLift.yearOper : ''}"></div>
                    <div class="form-field"><label>Год вывода</label><input type="number" id="prev_lift_yearRemoved_${entranceIdx}_${liftIdx}" value="${lift.previousLift ? lift.previousLift.yearRemoved : ''}"></div>
                    <div class="form-field"><label>Грузоподъемность</label><input type="text" id="prev_lift_loadCapacity_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.previousLift ? lift.previousLift.loadCapacity : '')}"></div>
                    <div class="form-field"><label>Скорость</label><input type="text" id="prev_lift_speed_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.previousLift ? lift.previousLift.speed : '')}"></div>
                    <div class="form-field"><label>Тип лифта</label><input type="text" id="prev_lift_type_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.previousLift ? lift.previousLift.type : '')}"></div>
                    <div class="form-field"><label>Остановок</label><input type="number" id="prev_lift_stops_${entranceIdx}_${liftIdx}" value="${lift.previousLift ? lift.previousLift.stops : ''}"></div>
                    <div class="form-field"><label>Двигатель</label><input type="text" id="prev_lift_engine_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.previousLift ? lift.previousLift.engine : '')}"></div>
                    <div class="form-field"><label>Состояние</label><input type="text" id="prev_lift_condition_${entranceIdx}_${liftIdx}" value="${escapeHtml(lift.previousLift ? lift.previousLift.condition : '')}"></div>
                    <div class="form-field"><label>Примечание</label><textarea id="prev_lift_note_${entranceIdx}_${liftIdx}" rows="2">${escapeHtml(lift.previousLift ? lift.previousLift.note : '')}</textarea></div>
                </div>
            </details>
        `;
        container.appendChild(liftDiv);
    });
}

// ========== ДОБАВЛЕНИЕ/УДАЛЕНИЕ ==========
function addEntrance() {
    saveCurrentEntranceData();
    window.entrancesData.push({ name: '', lifts: [] });
    renderEntrances();
}

function removeEntrance(idx) {
    saveCurrentEntranceData();
    window.entrancesData.splice(idx, 1);
    renderEntrances();
}

function addLift(entranceIdx) {
    saveCurrentEntranceData();
    if (!window[`liftsData_${entranceIdx}`]) window[`liftsData_${entranceIdx}`] = [];
    window[`liftsData_${entranceIdx}`].push({
        registrationNumber: '', name: '', model: '', yearMade: '', yearOper: '',
        speed: '', loadCapacity: '', type: '', stops: '', engine: '', condition: '', note: ''
    });
    renderLifts(entranceIdx);
}

function removeLift(entranceIdx, liftIdx) {
    saveCurrentEntranceData();
    window[`liftsData_${entranceIdx}`].splice(liftIdx, 1);
    renderLifts(entranceIdx);
}

function addProgram() {
    saveCurrentProgramsData();
    window.programsData.push({ year: '', description: '' });
    renderPrograms();
}

function removeProgram(idx) {
    saveCurrentProgramsData();
    window.programsData.splice(idx, 1);
    renderPrograms();
}

function addShortTerm() {
    saveCurrentShortTermData();
    window.shortTermData.push({ type: '', contractor: '', period: '' });
    renderShortTerm();
}

function removeShortTerm(idx) {
    saveCurrentShortTermData();
    window.shortTermData.splice(idx, 1);
    renderShortTerm();
}

function renderPrograms() {
    const container = document.getElementById('programsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    window.programsData.forEach((prog, idx) => {
        const div = document.createElement('div');
        div.className = 'subgroup';
        div.innerHTML = `
            <div class="subgroup-header">
                <strong>📅 Программа ${idx + 1}</strong>
                <button class="action-icon" onclick="removeProgram(${idx})">🗑️</button>
            </div>
            <div class="form-field"><label>Год</label><input type="text" id="prog_year_${idx}" value="${escapeHtml(prog.year || '')}"></div>
            <div class="form-field"><label>Описание</label><textarea id="prog_desc_${idx}" rows="2">${escapeHtml(prog.description || '')}</textarea></div>
        `;
        container.appendChild(div);
    });
}

function renderShortTerm() {
    const container = document.getElementById('shortTermContainer');
    if (!container) return;
    container.innerHTML = '';
    
    window.shortTermData.forEach((term, idx) => {
        const div = document.createElement('div');
        div.className = 'subgroup';
        div.innerHTML = `
            <div class="subgroup-header">
                <strong>⚡ План ${idx + 1}</strong>
                <button class="action-icon" onclick="removeShortTerm(${idx})">🗑️</button>
            </div>
            <div class="form-field"><label>Тип ремонта</label><textarea id="term_type_${idx}" rows="2">${escapeHtml(term.type || '')}</textarea></div>
            <div class="form-field"><label>Подрядчик</label><textarea id="term_contractor_${idx}" rows="2">${escapeHtml(term.contractor || '')}</textarea></div>
            <div class="form-field"><label>Период</label><input type="text" id="term_period_${idx}" value="${escapeHtml(term.period || '')}"></div>
        `;
        container.appendChild(div);
    });
}

// ========== СОХРАНЕНИЕ ==========
async function saveHouse() {
    saveCurrentEntranceData();
    saveCurrentProgramsData();
    saveCurrentShortTermData();
    
    const id = parseInt(document.getElementById('houseId').value);
    const address = document.getElementById('houseAddress').value.trim();
    if (!address) {
        showToast('❌ Введите адрес дома');
        return;
    }
    
    const coordsStr = document.getElementById('houseCoords').value.trim();
    let coords = null;
    if (coordsStr) {
        const parts = coordsStr.split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            coords = parts;
        } else {
            showToast('❌ Неверный формат координат');
            return;
        }
    }
    
    const entrances = [];
    for (let i = 0; i < window.entrancesData.length; i++) {
        entrances.push({
            name: window.entrancesData[i].name,
            lifts: window[`liftsData_${i}`] || []
        });
    }
    
    const houseData = {
        id: id,
        address: address,
        district: document.getElementById('houseDistrict').value || '',
        buildingType: document.getElementById('houseBuildingType').value || 'Многоквартирный дом',
        buildYear: parseInt(document.getElementById('houseBuildYear').value) || 0,
        constructionYear: parseInt(document.getElementById('houseConstructionYear').value) || 0,
        floors: parseInt(document.getElementById('houseFloors').value) || 0,
        series: document.getElementById('houseSeries').value || '',
        coords: coords,
        entrances: entrances,
        programWorks: window.programsData,
        shortTermWorks: window.shortTermData
    };
    
    if (isNewHouse) {
        housesData.push(houseData);
        showToast(`✅ Дом "${address}" добавлен`);
        await addHistoryRecord('add', houseData.id, houseData.address, {
            summary: `${houseData.entrances?.length || 0} подъездов, ${getLiftsCount(houseData)} лифтов, ${houseData.programWorks?.length || 0} программ`
        });
    } else {
        const index = housesData.findIndex(h => h.id === houseId);
        if (index !== -1) {
            housesData[index] = houseData;
            showToast(`✅ Дом "${address}" сохранён`);
            if (oldHouseData) {
                const changes = compareHouses(oldHouseData, houseData);
                if (changes.length > 0) {
                    await addHistoryRecord('update', houseData.id, houseData.address, { changes });
                }
            }
        }
    }
    
    window.location.href = 'index.html';
}

async function deleteHouse() {
    if (confirm('🗑️ Удалить дом? Это действие нельзя отменить.')) {
        const deletedHouse = housesData.find(h => h.id === houseId);
        housesData = housesData.filter(h => h.id !== houseId);
        showToast('✅ Дом удалён');
        if (deletedHouse) {
            await addHistoryRecord('delete', deletedHouse.id, deletedHouse.address, {
                deletedData: JSON.parse(JSON.stringify(deletedHouse))
            });
        }
        window.location.href = 'index.html';
    }
}

// Привязываем функции к window для доступа из onclick
window.addEntrance = addEntrance;
window.removeEntrance = removeEntrance;
window.addLift = addLift;
window.removeLift = removeLift;
window.removeProgram = removeProgram;
window.removeShortTerm = removeShortTerm;