// Глобальная переменная для данных
let housesData = [];
let currentMap = null;
let currentPlacemarks = [];

// Ждем полной загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница загружена, начинаем работу');
    
    // Получаем элементы
    const addressInput = document.getElementById('addressInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const houseContent = document.getElementById('houseContent');
    const homeButton = document.getElementById('homeButton');
    const planTypeSelect = document.getElementById('planType');
    const timeFilterSelect = document.getElementById('timeFilter');
    
    // Загружаем данные
    function loadData() {
        fetch('data.json?t=' + Date.now())
            .then(function(response) {
                if (!response.ok) throw new Error('Ошибка загрузки: ' + response.status);
                return response.json();
            })
            .then(function(data) {
                housesData = data;
                console.log('Данные загружены! Количество домов:', housesData.length);
                updateTimeFilterOptions();
                initMap();
            })
            .catch(function(error) {
                console.error('Ошибка:', error);
                alert('Не удалось загрузить data.json. Проверьте консоль F12');
            });
    }
    
    // Обновление второго выпадающего списка
    function updateTimeFilterOptions() {
        const planType = planTypeSelect.value;
        let timeValues = new Set();
        
        if (planType === 'program') {
            housesData.forEach(function(house) {
                if (house.programWorks && house.programWorks.length > 0) {
                    house.programWorks.forEach(function(work) {
                        if (work.year) timeValues.add(work.year);
                    });
                }
            });
        } else {
            housesData.forEach(function(house) {
                if (house.shortTermWorks && house.shortTermWorks.length > 0) {
                    house.shortTermWorks.forEach(function(work) {
                        if (work.period && work.period !== 'Нет данных') {
                            const yearMatch = work.period.match(/(20\d{2})/);
                            if (yearMatch) {
                                timeValues.add(yearMatch[1]);
                            }
                        }
                    });
                }
            });
        }
        
        let sortedValues = Array.from(timeValues).sort();
        const currentValue = timeFilterSelect.value;
        
        timeFilterSelect.innerHTML = '<option value="all">📋 Все сроки</option>';
        sortedValues.forEach(function(value) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            timeFilterSelect.appendChild(option);
        });
        
        if (currentValue !== 'all' && sortedValues.includes(currentValue)) {
            timeFilterSelect.value = currentValue;
        } else {
            timeFilterSelect.value = 'all';
        }
    }
    
    // Получение списка лифтов с их регистрационными номерами и годами программы
    function getLiftsListForProgram(house, selectedYear) {
        let liftsWithYears = [];
        
        if (!house.entrances) return [];
        
        house.entrances.forEach(function(entrance) {
            // Новый формат (lifts)
            if (entrance.lifts && entrance.lifts.length > 0) {
                entrance.lifts.forEach(function(lift) {
                    let liftNumber = '?';
                    if (lift.registrationNumber) {
                        liftNumber = lift.registrationNumber;
                    } else if (entrance.name) {
                        const match = entrance.name.match(/№(\d+)/);
                        if (match) liftNumber = match[1];
                    }
                    
                    let liftYear = null;
                    if (house.programWorks && house.programWorks.length > 0) {
                        liftYear = house.programWorks[0].year;
                    }
                    
                    liftsWithYears.push({
                        number: liftNumber,
                        year: liftYear,
                        name: lift.name || `Лифт №${liftNumber}`
                    });
                });
            }
            // Старый формат (lift)
            else if (entrance.lift) {
                let liftNumber = '?';
                if (entrance.name) {
                    const match = entrance.name.match(/№(\d+)/);
                    if (match) liftNumber = match[1];
                }
                
                let liftYear = null;
                if (house.programWorks && house.programWorks.length > 0) {
                    liftYear = house.programWorks[0].year;
                }
                
                liftsWithYears.push({
                    number: liftNumber,
                    year: liftYear,
                    name: entrance.name || `Лифт №${liftNumber}`
                });
            }
        });
        
        // Фильтруем по выбранному году (если выбран не "all")
        if (selectedYear !== 'all') {
            liftsWithYears = liftsWithYears.filter(function(lift) {
                return lift.year === selectedYear;
            });
        }
        
        // Формируем HTML список
        if (liftsWithYears.length === 0) {
            return '<i>Нет данных о лифтах</i>';
        }
        
        let html = '<ul style="margin: 5px 0 0 20px; padding: 0; list-style-type: disc;">';
        liftsWithYears.forEach(function(lift) {
            const yearText = lift.year ? ` (${lift.year})` : '';
            html += `<li style="margin: 2px 0;">Лифт №${lift.number}${yearText}</li>`;
        });
        html += '</ul>';
        
        return html;
    }
    
    // Проверка, соответствует ли дом выбранным фильтрам
    function isHouseMatchesFilter(house, planType, timeValue) {
        if (timeValue === 'all') return true;
        
        if (planType === 'program') {
            if (!house.programWorks || house.programWorks.length === 0) return false;
            return house.programWorks.some(function(work) {
                return work.year === timeValue;
            });
        } else {
            if (!house.shortTermWorks || house.shortTermWorks.length === 0) return false;
            return house.shortTermWorks.some(function(work) {
                if (!work.period || work.period === 'Нет данных') return false;
                return work.period.includes(timeValue);
            });
        }
    }
    
    // Получение информации для балуна
    function getBalloonContent(house, planType, selectedTime) {
        const address = house.address;
        const district = house.district || '—';
        
        if (planType === 'program') {
            const liftsListHtml = getLiftsListForProgram(house, selectedTime);
            return `<b>${address}</b><br>🏢 Район: ${district}<br>🛗 <b>Лифты:</b>${liftsListHtml}<br><br><a href="#" class="balloon-details-link" data-id="${house.id}">📋 Подробнее о доме →</a>`;
        } else {
            // Табличка с границами для краткосрочного плана
            let tableHtml = '<table style="width:100%; border-collapse: collapse; margin-top: 5px; border: 1px solid #ccc;">';
            
            if (house.shortTermWorks && house.shortTermWorks.length > 0) {
                const work = house.shortTermWorks[0];
                tableHtml += `
                    <tr>
                        <td style="padding: 6px 8px; font-weight: 600; border: 1px solid #ccc; background-color: #f5f5f5; width: 35%;">🔧 Тип ремонта</td>
                        <td style="padding: 6px 8px; border: 1px solid #ccc;">${work.type || '—'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 8px; font-weight: 600; border: 1px solid #ccc; background-color: #f5f5f5;">🏭 Подрядчик</td>
                        <td style="padding: 6px 8px; border: 1px solid #ccc;">${work.contractor || '—'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 8px; font-weight: 600; border: 1px solid #ccc; background-color: #f5f5f5;">📅 Срок выполнения</td>
                        <td style="padding: 6px 8px; border: 1px solid #ccc;">${work.period || '—'}</td>
                    </tr>
                `;
            } else {
                tableHtml += `
                    <tr>
                        <td style="padding: 6px 8px; font-weight: 600; border: 1px solid #ccc;">📋 Данные</td>
                        <td style="padding: 6px 8px; border: 1px solid #ccc;">Нет информации по краткосрочному плану</td>
                    </tr>
                `;
            }
            tableHtml += '</table>';
            
            return `<b>${address}</b><br>🏢 Район: ${district}${tableHtml}<br><br><a href="#" class="balloon-details-link" data-id="${house.id}">📋 Подробнее о доме →</a>`;
        }
    }
    
    // Инициализация карты
    function initMap() {
        if (typeof ymaps === 'undefined') {
            console.error('Яндекс.Карты не загрузились');
            return;
        }
        
        ymaps.ready(function() {
            currentMap = new ymaps.Map('map', {
                center: [48.574, 39.307],
                zoom: 12,
                controls: ['zoomControl', 'fullscreenControl']
            });
            applyFilters();
        });
    }
    
    // Применение фильтров
    function applyFilters() {
        if (!currentMap) return;
        
        const planType = planTypeSelect.value;
        const timeValue = timeFilterSelect.value;
        
        currentPlacemarks.forEach(function(p) {
            currentMap.geoObjects.remove(p);
        });
        currentPlacemarks = [];
        
        let filteredHouses = housesData.filter(function(house) {
            return isHouseMatchesFilter(house, planType, timeValue);
        });
        
        filteredHouses.forEach(function(house) {
            if (house.coords && house.coords.length === 2) {
                const balloonContent = getBalloonContent(house, planType, timeValue);
                
                const placemark = new ymaps.Placemark(
                    house.coords,
                    {
                        balloonContentHeader: '',
                        balloonContentBody: balloonContent,
                        balloonContentFooter: ''
                    },
                    { preset: 'islands#blueHomeIcon' }
                );
                
                placemark.events.add('balloonopen', function() {
                    setTimeout(function() {
                        const link = document.querySelector('.balloon-details-link');
                        if (link) {
                            link.addEventListener('click', function(e) {
                                e.preventDefault();
                                const houseId = parseInt(this.dataset.id);
                                const selectedHouse = housesData.find(function(h) { return h.id === houseId; });
                                if (selectedHouse) {
                                    showHouseInfo(selectedHouse);
                                    currentMap.balloon.close();
                                    document.getElementById('houseContent').scrollIntoView({ behavior: 'smooth' });
                                }
                            });
                        }
                    }, 100);
                });
                
                currentPlacemarks.push(placemark);
                currentMap.geoObjects.add(placemark);
            }
        });
        
        console.log('Отображаем домов после фильтра:', filteredHouses.length);
    }
    
    // Поиск при вводе
    addressInput.addEventListener('input', function() {
        const query = addressInput.value.trim().toLowerCase();
        
        if (query.length === 0 || housesData.length === 0) {
            suggestionsDiv.classList.add('hidden');
            return;
        }
        
        const filtered = housesData.filter(function(house) {
            return house.address.toLowerCase().includes(query);
        });
        
        if (filtered.length === 0) {
            suggestionsDiv.classList.add('hidden');
            return;
        }
        
        suggestionsDiv.innerHTML = '';
        filtered.forEach(function(house) {
            const div = document.createElement('div');
            div.textContent = house.address;
            div.style.padding = '12px 18px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid #eef2f6';
            div.onmouseover = function() { this.style.backgroundColor = '#e6f4fa'; };
            div.onmouseout = function() { this.style.backgroundColor = 'white'; };
            div.onclick = function() {
                addressInput.value = house.address;
                suggestionsDiv.classList.add('hidden');
                showHouseInfo(house);
            };
            suggestionsDiv.appendChild(div);
        });
        suggestionsDiv.classList.remove('hidden');
    });
    
    // Функция отображения информации о доме
    function showHouseInfo(house) {
        console.log('Отображаем дом:', house.address);
        
        houseContent.classList.remove('hidden');
        
        document.getElementById('fullAddress').textContent = house.address;
        document.getElementById('district').textContent = house.district || '—';
        document.getElementById('buildingType').textContent = house.buildingType || 'Многоквартирный дом';
        document.getElementById('buildYear').textContent = house.constructionYear || house.buildYear || '—';
        document.getElementById('constructionYear').textContent = house.buildYear || '—';
        document.getElementById('floors').textContent = house.floors || '—';
        document.getElementById('series').textContent = house.series || '—';
        
        const entranceButtons = document.getElementById('entranceButtons');
        entranceButtons.innerHTML = '';
        
        if (house.entrances && house.entrances.length > 0) {
            const allLifts = [];
            
            house.entrances.forEach(function(entrance, entranceIdx) {
                if (entrance.lifts && entrance.lifts.length > 0) {
                    entrance.lifts.forEach(function(lift, liftIdx) {
                        allLifts.push({
                            id: entranceIdx + '_' + liftIdx,
                            name: lift.name || (entrance.name ? entrance.name + ' - ' + (liftIdx + 1) : 'Лифт ' + (liftIdx + 1)),
                            liftData: lift,
                            entranceIdx: entranceIdx,
                            liftIdx: liftIdx,
                            isNewFormat: true
                        });
                    });
                } else if (entrance.lift) {
                    allLifts.push({
                        id: entranceIdx + '_0',
                        name: entrance.name || 'Подъезд ' + (entranceIdx + 1),
                        liftData: entrance.lift,
                        entranceIdx: entranceIdx,
                        liftIdx: 0,
                        isNewFormat: false
                    });
                }
            });
            
            allLifts.forEach(function(liftItem, idx) {
                const btn = document.createElement('button');
                btn.textContent = liftItem.name;
                btn.className = 'entrance-btn';
                if (idx === 0) btn.classList.add('active');
                btn.onclick = function() {
                    document.querySelectorAll('.entrance-btn').forEach(function(b) {
                        b.classList.remove('active');
                    });
                    btn.classList.add('active');
                    showLiftInfo(house, liftItem);
                    showPreviousLift(house, liftItem);
                };
                entranceButtons.appendChild(btn);
            });
            
            if (allLifts.length > 0) {
                showLiftInfo(house, allLifts[0]);
                showPreviousLift(house, allLifts[0]);
            }
        } else {
            entranceButtons.innerHTML = '<button class="entrance-btn active">Лифт №1</button>';
            showLiftInfo(house, { liftData: null, isNewFormat: false });
            showPreviousLift(house, { liftData: null, isNewFormat: false });
        }
        
        const programTbody = document.querySelector('#programWorks tbody');
        programTbody.innerHTML = '';
        if (house.programWorks && house.programWorks.length > 0) {
            house.programWorks.forEach(function(work) {
                const row = programTbody.insertRow();
                row.insertCell(0).textContent = work.year || '—';
                row.insertCell(1).textContent = work.description || '—';
            });
        } else {
            programTbody.innerHTML = '<tr><td colspan="2">Нет данных</td></tr>';
        }
        
        const shortTbody = document.querySelector('#shortTermWorks tbody');
        shortTbody.innerHTML = '';
        if (house.shortTermWorks && house.shortTermWorks.length > 0) {
            house.shortTermWorks.forEach(function(work) {
                const row = shortTbody.insertRow();
                row.insertCell(0).textContent = work.type || '—';
                row.insertCell(1).textContent = work.contractor || '—';
                row.insertCell(2).textContent = work.period || '—';
            });
        } else {
            shortTbody.innerHTML = '<tr><td colspan="3">Нет данных</td></tr>';
        }
    }
    
    function showLiftInfo(house, liftItem) {
        const liftInfo = document.getElementById('liftInfo');
        
        let lift = null;
        if (liftItem && liftItem.liftData) {
            lift = liftItem.liftData;
        } else if (house.entrances && house.entrances[0] && house.entrances[0].lift) {
            lift = house.entrances[0].lift;
        }
        
        if (!lift) {
            liftInfo.innerHTML = '<div class="info-row">Нет данных о лифте</div>';
            return;
        }
        
        let yearsInService = '—';
        if (lift.yearOper && lift.yearOper !== '—') {
            const currentYear = new Date().getFullYear();
            const operYear = parseInt(lift.yearOper);
            if (!isNaN(operYear)) {
                yearsInService = (currentYear - operYear) + ' лет';
            }
        }
        
        liftInfo.innerHTML = `
            <div class="info-row"><span class="info-label">Модель</span><span class="info-value">${lift.model || '—'}</span></div>
            <div class="info-row"><span class="info-label">Год изготовления</span><span class="info-value">${lift.yearMade || '—'}</span></div>
            <div class="info-row"><span class="info-label">Год ввода в эксплуатацию</span><span class="info-value">${lift.yearOper || '—'}</span></div>
            <div class="info-row"><span class="info-label">Срок эксплуатации</span><span class="info-value">${yearsInService}</span></div>
            <div class="info-row"><span class="info-label">Грузоподъемность</span><span class="info-value">${lift.loadCapacity || '—'}</span></div>
            <div class="info-row"><span class="info-label">Скорость</span><span class="info-value">${lift.speed || '—'}</span></div>
            <div class="info-row"><span class="info-label">Тип лифта</span><span class="info-value">${lift.type || '—'}</span></div>
            <div class="info-row"><span class="info-label">Количество остановок</span><span class="info-value">${lift.stops || '—'}</span></div>
            <div class="info-row"><span class="info-label">Двигатель</span><span class="info-value">${lift.engine || '—'}</span></div>
            <div class="info-row"><span class="info-label">Текущее состояние</span><span class="info-value">${lift.condition || '—'}</span></div>
            <div class="info-row"><span class="info-label">Примечание</span><span class="info-value">${lift.note || '—'}</span></div>
        `;
    }
    
    function showPreviousLift(house, liftItem) {
        const previousLiftCard = document.getElementById('previousLiftCard');
        const previousLiftInfo = document.getElementById('previousLiftInfo');
        
        let previousLift = null;
        if (liftItem && liftItem.liftData && liftItem.liftData.previousLift) {
            previousLift = liftItem.liftData.previousLift;
        } else if (house.entrances && house.entrances[0] && house.entrances[0].lift && house.entrances[0].lift.previousLift) {
            previousLift = house.entrances[0].lift.previousLift;
        }
        
        if (!previousLift) {
            previousLiftCard.style.display = 'none';
            return;
        }
        
        previousLiftCard.style.display = 'block';
        
        let yearsInService = '—';
        if (previousLift.yearOper && previousLift.yearOper !== '—') {
            let endYear = previousLift.yearRemoved || new Date().getFullYear();
            if (typeof endYear === 'string') {
                endYear = parseInt(endYear);
            }
            const operYear = parseInt(previousLift.yearOper);
            if (!isNaN(operYear) && !isNaN(endYear)) {
                yearsInService = (endYear - operYear) + ' лет';
            }
        }
        
        previousLiftInfo.innerHTML = `
            <div class="info-row"><span class="info-label">Модель</span><span class="info-value">${previousLift.model || '—'}</span></div>
            <div class="info-row"><span class="info-label">Год изготовления</span><span class="info-value">${previousLift.yearMade || '—'}</span></div>
            <div class="info-row"><span class="info-label">Год ввода в эксплуатацию</span><span class="info-value">${previousLift.yearOper || '—'}</span></div>
            <div class="info-row"><span class="info-label">Год вывода из эксплуатации</span><span class="info-value">${previousLift.yearRemoved || '—'}</span></div>
            <div class="info-row"><span class="info-label">Срок эксплуатации</span><span class="info-value">${yearsInService}</span></div>
            <div class="info-row"><span class="info-label">Грузоподъемность</span><span class="info-value">${previousLift.loadCapacity || '—'}</span></div>
            <div class="info-row"><span class="info-label">Скорость</span><span class="info-value">${previousLift.speed || '—'}</span></div>
            <div class="info-row"><span class="info-label">Тип лифта</span><span class="info-value">${previousLift.type || '—'}</span></div>
            <div class="info-row"><span class="info-label">Количество остановок</span><span class="info-value">${previousLift.stops || '—'}</span></div>
            <div class="info-row"><span class="info-label">Двигатель</span><span class="info-value">${previousLift.engine || '—'}</span></div>
            <div class="info-row"><span class="info-label">Текущее состояние (до замены)</span><span class="info-value">${previousLift.condition || '—'}</span></div>
            <div class="info-row"><span class="info-label">Примечание</span><span class="info-value">${previousLift.note || '—'}</span></div>
        `;
    }
    
    // Обработчики фильтров
    planTypeSelect.addEventListener('change', function() {
        updateTimeFilterOptions();
        applyFilters();
    });
    
    timeFilterSelect.addEventListener('change', function() {
        applyFilters();
    });
    
    // Кнопка Главная
    homeButton.addEventListener('click', function() {
        addressInput.value = '';
        houseContent.classList.add('hidden');
        suggestionsDiv.classList.add('hidden');
        addressInput.focus();
    });
    
    // Скрываем подсказки при клике вне
    document.addEventListener('click', function(e) {
        if (e.target !== addressInput && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.classList.add('hidden');
        }
    });
    
    loadData();
});