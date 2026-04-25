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
    
    // Обновление второго выпадающего списка (периодов) в зависимости от выбранного типа плана
    function updateTimeFilterOptions() {
        const planType = planTypeSelect.value;
        let timeValues = new Set();
        
        if (planType === 'program') {
            // Собираем все уникальные годы из programWorks
            housesData.forEach(function(house) {
                if (house.programWorks && house.programWorks.length > 0) {
                    house.programWorks.forEach(function(work) {
                        if (work.year) timeValues.add(work.year);
                    });
                }
            });
        } else {
            // Собираем все уникальные периоды из shortTermWorks
            housesData.forEach(function(house) {
                if (house.shortTermWorks && house.shortTermWorks.length > 0) {
                    house.shortTermWorks.forEach(function(work) {
                        if (work.period) timeValues.add(work.period);
                    });
                }
            });
        }
        
        // Преобразуем Set в массив и сортируем
        let sortedValues = Array.from(timeValues).sort();
        
        // Сохраняем текущее выбранное значение
        const currentValue = timeFilterSelect.value;
        
        // Очищаем и заполняем select
        timeFilterSelect.innerHTML = '<option value="all">📋 Все сроки</option>';
        sortedValues.forEach(function(value) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            timeFilterSelect.appendChild(option);
        });
        
        // Восстанавливаем предыдущее значение, если оно существует в новом списке
        if (currentValue !== 'all' && sortedValues.includes(currentValue)) {
            timeFilterSelect.value = currentValue;
        } else {
            timeFilterSelect.value = 'all';
        }
    }
    
    // Получение значения периода для дома в зависимости от типа плана
    function getHouseTimeValue(house, planType) {
        if (planType === 'program') {
            if (house.programWorks && house.programWorks.length > 0) {
                return house.programWorks[0].year;
            }
        } else {
            if (house.shortTermWorks && house.shortTermWorks.length > 0) {
                return house.shortTermWorks[0].period;
            }
        }
        return null;
    }
    
    // Проверка, соответствует ли дом выбранным фильтрам
    function isHouseMatchesFilter(house, planType, timeValue) {
        if (planType === 'program') {
            if (!house.programWorks || house.programWorks.length === 0) return false;
            if (timeValue === 'all') return true;
            return house.programWorks.some(function(work) {
                return work.year === timeValue;
            });
        } else {
            if (!house.shortTermWorks || house.shortTermWorks.length === 0) return false;
            if (timeValue === 'all') return true;
            return house.shortTermWorks.some(function(work) {
                return work.period === timeValue;
            });
        }
    }
    
    // Инициализация карты
    function initMap() {
        if (typeof ymaps === 'undefined') {
            console.error('Яндекс.Карты не загрузились. Проверьте API-ключ.');
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
    
    // Применение фильтров и обновление меток
    function applyFilters() {
        if (!currentMap) return;
        
        const planType = planTypeSelect.value;
        const timeValue = timeFilterSelect.value;
        
        console.log('Применяем фильтры:', planType, timeValue);
        
        // Удаляем старые метки
        currentPlacemarks.forEach(function(p) {
            currentMap.geoObjects.remove(p);
        });
        currentPlacemarks = [];
        
        // Фильтруем дома
        let filteredHouses = housesData.filter(function(house) {
            return isHouseMatchesFilter(house, planType, timeValue);
        });
        
        console.log('Отображаем домов после фильтра:', filteredHouses.length);
        
        // Добавляем метки для отфильтрованных домов
        filteredHouses.forEach(function(house) {
            if (house.coords && house.coords.length === 2) {
                let preset = 'islands#blueHomeIcon';
                const timeValueForColor = getHouseTimeValue(house, planType);
                if (timeValueForColor) {
                    if (timeValueForColor === '2024-2025') preset = 'islands#redHomeIcon';
                    else if (timeValueForColor === '2025-2030') preset = 'islands#greenHomeIcon';
                }
                
                const placemark = new ymaps.Placemark(
                    house.coords,
                    {
                        balloonContentHeader: '<b>' + house.address + '</b>',
                        balloonContentBody: '<strong>📅 ' + (planType === 'program' ? 'План' : 'Период') + ':</strong> ' + (getHouseTimeValue(house, planType) || '—') + '<br><strong>🏢 Район:</strong> ' + (house.district || '—') + '<br><strong>🚪 Подъездов:</strong> ' + (house.entrances ? house.entrances.length : '—'),
                        balloonContentFooter: '<a href="#" class="balloon-details-link" data-id="' + house.id + '">📋 Подробнее о доме →</a>'
                    },
                    { preset: preset }
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
                    }, 50);
                });
                
                currentPlacemarks.push(placemark);
                currentMap.geoObjects.add(placemark);
            }
        });
        
        if (filteredHouses.length === 0) {
            console.log('Нет домов для отображения на карте');
        }
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
                document.getElementById('houseContent').scrollIntoView({ behavior: 'smooth' });
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
            house.entrances.forEach(function(entrance, idx) {
                const btn = document.createElement('button');
                btn.textContent = entrance.name || 'Подъезд ' + (idx + 1);
                btn.className = 'entrance-btn';
                if (idx === 0) btn.classList.add('active');
                btn.onclick = function() {
                    document.querySelectorAll('.entrance-btn').forEach(function(b) {
                        b.classList.remove('active');
                    });
                    btn.classList.add('active');
                    showLiftInfo(house, idx);
                    showPreviousLift(house, idx);
                };
                entranceButtons.appendChild(btn);
            });
            showLiftInfo(house, 0);
            showPreviousLift(house, 0);
        } else {
            entranceButtons.innerHTML = '<button class="entrance-btn active">Лифт №1</button>';
            showLiftInfo(house, 0);
            showPreviousLift(house, 0);
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
    
    function showLiftInfo(house, entranceIndex) {
        const liftInfo = document.getElementById('liftInfo');
        const entrance = house.entrances[entranceIndex];
        
        if (!entrance || !entrance.lift) {
            liftInfo.innerHTML = '<div class="info-row">Нет данных о лифте</div>';
            return;
        }
        
        const lift = entrance.lift;
        
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
    
    function showPreviousLift(house, entranceIndex) {
        const previousLiftCard = document.getElementById('previousLiftCard');
        const previousLiftInfo = document.getElementById('previousLiftInfo');
        
        const entrance = house.entrances[entranceIndex];
        const previousLift = entrance ? entrance.previousLift : null;
        
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
    
    // Кнопка Главная
    homeButton.addEventListener('click', function() {
        addressInput.value = '';
        houseContent.classList.add('hidden');
        suggestionsDiv.classList.add('hidden');
        addressInput.focus();
    });
    
    // Обработчики изменения фильтров
    planTypeSelect.addEventListener('change', function() {
        updateTimeFilterOptions();
        applyFilters();
    });
    
    timeFilterSelect.addEventListener('change', function() {
        applyFilters();
    });
    
    // Скрываем подсказки при клике вне
   