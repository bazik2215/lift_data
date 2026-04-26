let housesData = [];
let currentMap = null;
let currentPlacemarks = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Карта загружена');
    
    // Тёмная тема
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggle) themeToggle.textContent = '☀️';
    } else {
        if (themeToggle) themeToggle.textContent = '🌙';
    }
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            if (document.body.classList.contains('dark-theme')) {
                localStorage.setItem('theme', 'dark');
                themeToggle.textContent = '☀️';
            } else {
                localStorage.setItem('theme', 'light');
                themeToggle.textContent = '🌙';
            }
        });
    }
    
    // Кнопка Наверх
    const scrollBtn = document.getElementById('scrollToTop');
    if (scrollBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        });
        scrollBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    const addressInput = document.getElementById('addressInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const planTypeSelect = document.getElementById('planType');
    const timeFilterSelect = document.getElementById('timeFilter');
    
    function getLiftsCount(house) {
        let count = 0;
        if (house.entrances) {
            house.entrances.forEach(function(entrance) {
                if (entrance.lifts && entrance.lifts.length > 0) count += entrance.lifts.length;
                else if (entrance.lift) count += 1;
            });
        }
        return count;
    }
    
    function updateHeaderStats() {
        const totalHouses = housesData.length;
        let totalLifts = 0;
        housesData.forEach(function(house) {
            totalLifts += getLiftsCount(house);
        });
        const statsDiv = document.getElementById('headerStats');
        if (statsDiv) {
            statsDiv.innerHTML = '<span class="stat-badge">🏘️ ' + totalHouses + ' домов</span><span class="stat-badge">🛗 ' + totalLifts + ' лифтов</span>';
        }
    }
    
    function loadData() {
        fetch('data.json?t=' + Date.now())
            .then(function(response) {
                if (!response.ok) throw new Error('Ошибка загрузки: ' + response.status);
                return response.json();
            })
            .then(function(data) {
                housesData = data;
                console.log('Данные загружены! Количество домов:', housesData.length);
                updateHeaderStats();
                updateTimeFilterOptions();
                initMap();
            })
            .catch(function(error) {
                console.error('Ошибка:', error);
                alert('Не удалось загрузить data.json');
            });
    }
    
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
                            if (yearMatch) timeValues.add(yearMatch[1]);
                        }
                    });
                }
            });
        }
        
        let sortedValues = Array.from(timeValues).sort();
        const currentValue = timeFilterSelect.value;
        
        timeFilterSelect.innerHTML = '<option value="all">Все время</option>';
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
    
    // Функция получения списка лифтов для балуна (с поддержкой registrationNumber)
    function getLiftsListForProgram(house, selectedYear) {
        let liftsWithYears = [];
        if (!house.entrances) return [];
        
        house.entrances.forEach(function(entrance) {
            // Новый формат (lifts)
            if (entrance.lifts && entrance.lifts.length > 0) {
                entrance.lifts.forEach(function(lift) {
                    let liftNumber = '?';
                    // Приоритет: registrationNumber > номер из названия
                    if (lift.registrationNumber && lift.registrationNumber !== '') {
                        liftNumber = lift.registrationNumber;
                    } else if (entrance.name) {
                        const match = entrance.name.match(/№(\d+)/);
                        if (match) liftNumber = match[1];
                    }
                    let liftYear = house.programWorks && house.programWorks.length > 0 ? house.programWorks[0].year : null;
                    liftsWithYears.push({ number: liftNumber, year: liftYear });
                });
            } 
            // Старый формат (lift)
            else if (entrance.lift) {
                let liftNumber = '?';
                if (entrance.name) {
                    const match = entrance.name.match(/№(\d+)/);
                    if (match) liftNumber = match[1];
                }
                let liftYear = house.programWorks && house.programWorks.length > 0 ? house.programWorks[0].year : null;
                liftsWithYears.push({ number: liftNumber, year: liftYear });
            }
        });
        
        if (selectedYear !== 'all') {
            liftsWithYears = liftsWithYears.filter(function(lift) { return lift.year === selectedYear; });
        }
        
        if (liftsWithYears.length === 0) return '<i>Нет данных</i>';
        
        let html = '<ul style="margin: 5px 0 0 20px; padding: 0; list-style-type: disc;">';
        liftsWithYears.forEach(function(lift) {
            const yearText = lift.year ? ' (' + lift.year + ')' : '';
            html += '<li style="margin: 2px 0;">Лифт №' + lift.number + yearText + '</li>';
        });
        html += '</ul>';
        return html;
    }
    
    function isHouseMatchesFilter(house, planType, timeValue) {
        if (timeValue === 'all') return true;
        if (planType === 'program') {
            if (!house.programWorks) return false;
            return house.programWorks.some(function(work) { return work.year === timeValue; });
        } else {
            if (!house.shortTermWorks) return false;
            return house.shortTermWorks.some(function(work) {
                return work.period && work.period !== 'Нет данных' && work.period.includes(timeValue);
            });
        }
    }
    
    function getBalloonContent(house, planType, selectedTime) {
        const address = house.address;
        const district = house.district || '—';
        if (planType === 'program') {
            const liftsListHtml = getLiftsListForProgram(house, selectedTime);
            return '<b>' + address + '</b><br>' + district + '<br><b>Лифты:</b>' + liftsListHtml + '<br><br><a href="house.html?id=' + house.id + '" class="balloon-link">Подробнее о доме →</a>';
        } else {
            let tableHtml = '<table style="width:100%; border-collapse: collapse; margin-top: 5px; border: 1px solid #ccc;">';
            if (house.shortTermWorks && house.shortTermWorks.length > 0) {
                const work = house.shortTermWorks[0];
                tableHtml += '<tr><td style="padding: 6px 8px; font-weight: 600; border: 1px solid #ccc;">Тип ремонта</td><td style="padding: 6px 8px; border: 1px solid #ccc;">' + (work.type || '—') + '</td></tr>';
                tableHtml += '<tr><td style="padding: 6px 8px; font-weight: 600; border: 1px solid #ccc;">Подрядчик</td><td style="padding: 6px 8px; border: 1px solid #ccc;">' + (work.contractor || '—') + '</td></tr>';
                tableHtml += '<tr><td style="padding: 6px 8px; font-weight: 600; border: 1px solid #ccc;">Срок выполнения</td><td style="padding: 6px 8px; border: 1px solid #ccc;">' + (work.period || '—') + '</td></tr>';
            } else {
                tableHtml += '<tr><td style="padding: 6px 8px;">Нет информации</td></tr>';
            }
            tableHtml += '</table>';
            return '<b>' + address + '</b><br>' + district + tableHtml + '<br><br><a href="house.html?id=' + house.id + '" class="balloon-link">Подробнее о доме →</a>';
        }
    }
    
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
    
    function applyFilters() {
        if (!currentMap) return;
        const planType = planTypeSelect.value;
        const timeValue = timeFilterSelect.value;
        currentPlacemarks.forEach(function(p) { currentMap.geoObjects.remove(p); });
        currentPlacemarks = [];
        let filteredHouses = housesData.filter(function(house) {
            return isHouseMatchesFilter(house, planType, timeValue);
        });
        filteredHouses.forEach(function(house) {
            if (house.coords && house.coords.length === 2) {
                const balloonContent = getBalloonContent(house, planType, timeValue);
                const placemark = new ymaps.Placemark(
                    house.coords,
                    { balloonContentHeader: '', balloonContentBody: balloonContent, balloonContentFooter: '' },
                    { preset: 'islands#blueHomeIcon' }
                );
                currentPlacemarks.push(placemark);
                currentMap.geoObjects.add(placemark);
            }
        });
        console.log('Отображаем домов после фильтра:', filteredHouses.length);
    }
    
    addressInput.addEventListener('input', function() {
        const query = addressInput.value.trim().toLowerCase();
        if (query.length === 0 || housesData.length === 0) {
            suggestionsDiv.classList.add('hidden');
            return;
        }
        const filtered = housesData
            .filter(function(house) { return house.address.toLowerCase().includes(query); })
            .sort(function(a, b) { return a.address.localeCompare(b.address); });
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
                window.location.href = 'house.html?id=' + house.id;
            };
            suggestionsDiv.appendChild(div);
        });
        suggestionsDiv.classList.remove('hidden');
    });
    
    planTypeSelect.addEventListener('change', function() {
        updateTimeFilterOptions();
        applyFilters();
    });
    timeFilterSelect.addEventListener('change', function() {
        applyFilters();
    });
    document.addEventListener('click', function(e) {
        if (e.target !== addressInput && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.classList.add('hidden');
        }
    });
    
    loadData();
});