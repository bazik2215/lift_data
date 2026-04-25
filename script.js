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
    
    // Загружаем данные (с убийцей кэша)
    fetch('data.json?t=' + Date.now())
        .then(function(response) {
            console.log('Ответ от сервера:', response.status);
            if (!response.ok) throw new Error('Ошибка загрузки: ' + response.status);
            return response.json();
        })
        .then(function(data) {
            housesData = data;
            console.log('Данные загружены! Количество домов:', housesData.length);
            initMap();
        })
        .catch(function(error) {
            console.error('Ошибка:', error);
            alert('Не удалось загрузить data.json. Проверьте консоль F12');
        });
    
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
            updateMapMarkers();
        });
    }
    
    // Функция обновления меток на карте
    function updateMapMarkers() {
        if (!currentMap) return;
        
        currentPlacemarks.forEach(function(p) {
            currentMap.geoObjects.remove(p);
        });
        currentPlacemarks = [];
        
        housesData.forEach(function(house) {
            if (house.coords && house.coords.length === 2) {
                const placemark = new ymaps.Placemark(
                    house.coords,
                    {
                        balloonContentHeader: '<b>' + house.address + '</b>',
                        balloonContentBody: '<strong>📅 Год постройки:</strong> ' + (house.buildYear || '—') + '<br><strong>🏢 Район:</strong> ' + (house.district || '—') + '<br><strong>🚪 Подъездов:</strong> ' + (house.entrances ? house.entrances.length : '—'),
                        balloonContentFooter: '<a href="#" class="balloon-details-link" data-id="' + house.id + '">📋 Подробнее о доме →</a>'
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
        
        // Обработка кнопок подъездов (поддерживает оба формата)
        const entranceButtons = document.getElementById('entranceButtons');
        entranceButtons.innerHTML = '';
        
        if (house.entrances && house.entrances.length > 0) {
            // Собираем все лифты в один массив для отображения кнопок
            const allLifts = [];
            
            house.entrances.forEach(function(entrance, entranceIdx) {
                // Проверяем новый формат (lifts)
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
                }
                // Проверяем старый формат (lift)
                else if (entrance.lift) {
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
            
            // Создаем кнопки для всех лифтов
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
            
            // Показываем первый лифт
            if (allLifts.length > 0) {
                showLiftInfo(house, allLifts[0]);
                showPreviousLift(house, allLifts[0]);
            }
        } else {
            entranceButtons.innerHTML = '<button class="entrance-btn active">Лифт №1</button>';
            // Создаем фейковые данные для старого формата
            showLiftInfo(house, { liftData: null, isNewFormat: false });
            showPreviousLift(house, { liftData: null, isNewFormat: false });
        }
        
        // Программа работ
        const programTbody = document.querySelector('#programWorks tbody');
        programTbody.innerHTML = '';
        if (house.programWorks && house.programWorks.length > 0) {
            house.programWorks.forEach(function(work) {
                const row = programTbody.insertRow();
                row.insertCell(0).textContent = work.year || '—';
                row.insertCell(1).textContent = work.description || '—';
            });
        } else {
            programTbody.innerHTML = '<tr><td colspan="2">Нет данных<\/td><\/tr>';
        }
        
        // Краткосрочный план
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
            shortTbody.innerHTML = '<tr><td colspan="3">Нет данных<\/td><\/tr>';
        }
    }
    
    // Функция отображения информации о текущем лифте
    function showLiftInfo(house, liftItem) {
        const liftInfo = document.getElementById('liftInfo');
        
        // Получаем данные лифта
        let lift = null;
        if (liftItem && liftItem.liftData) {
            lift = liftItem.liftData;
        } else if (house.entrances && house.entrances[0] && house.entrances[0].lift) {
            // Старый формат
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
    
    // Функция отображения информации о предыдущем лифте
    function showPreviousLift(house, liftItem) {
        const previousLiftCard = document.getElementById('previousLiftCard');
        const previousLiftInfo = document.getElementById('previousLiftInfo');
        
        // Получаем данные предыдущего лифта
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
});