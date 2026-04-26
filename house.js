let housesData = [];
let currentHouse = null;
let houseMap = null;
let mapInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница дома загружена');
    
    // ========== ТЁМНАЯ ТЕМА ==========
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
    // ========== КОНЕЦ БЛОКА ТЕМЫ ==========
    
    // ========== КНОПКА НАВЕРХ ==========
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
    // ========== КОНЕЦ КНОПКИ НАВЕРХ ==========
    
    // ========== СЧЁТЧИК В ШАПКЕ ==========
    function getLiftsCount(house) {
        let count = 0;
        if (house.entrances) {
            house.entrances.forEach(function(entrance) {
                if (entrance.lifts && entrance.lifts.length > 0) {
                    count += entrance.lifts.length;
                } else if (entrance.lift) {
                    count += 1;
                }
            });
        }
        return count;
    }
    
    function updateHeaderStats() {
        fetch('data.json?t=' + Date.now())
            .then(function(response) { return response.json(); })
            .then(function(data) {
                const totalHouses = data.length;
                let totalLifts = 0;
                data.forEach(function(house) {
                    totalLifts += getLiftsCount(house);
                });
                const statsDiv = document.getElementById('headerStats');
                if (statsDiv) {
                    statsDiv.innerHTML = '<span class="stat-badge">🏘️ ' + totalHouses + ' домов</span><span class="stat-badge">🛗 ' + totalLifts + ' лифтов</span>';
                }
            })
            .catch(function(error) {
                console.error('Stats error:', error);
            });
    }
    updateHeaderStats();
    // ========== КОНЕЦ СЧЁТЧИКА ==========
    
    // Получаем ID дома из URL
    const urlParams = new URLSearchParams(window.location.search);
    const houseId = parseInt(urlParams.get('id'));
    
    if (!houseId) {
        document.getElementById('houseContent').innerHTML = '<div class="info-card">Дом не указан. <a href="index.html">Вернуться на карту</a></div>';
        return;
    }
    
    function loadData() {
        fetch('data.json?t=' + Date.now())
            .then(function(response) { return response.json(); })
            .then(function(data) {
                housesData = data;
                const house = housesData.find(function(h) { return h.id === houseId; });
                if (house) {
                    currentHouse = house;
                    showHouseInfo(house);
                    initActionButtons(house);
                } else {
                    document.getElementById('houseContent').innerHTML = '<div class="info-card">Дом не найден. <a href="index.html">Вернуться на карту</a></div>';
                }
            })
            .catch(function(error) {
                console.error('Ошибка:', error);
                alert('Не удалось загрузить данные');
            });
    }
    
    function initActionButtons(house) {
        // Кнопка "Показать на карте" — открывает/закрывает карту
        const showOnMapBtn = document.getElementById('showOnMapBtn');
        const mapContainer = document.getElementById('houseMap');
        
        if (showOnMapBtn && mapContainer) {
            showOnMapBtn.addEventListener('click', function() {
                if (mapContainer.style.display === 'none') {
                    mapContainer.style.display = 'block';
                    showOnMapBtn.textContent = '🗺️ Скрыть карту';
                    showOnMapBtn.classList.add('active-map');
                    
                    if (!mapInitialized && house.coords && house.coords.length === 2) {
                        initHouseMap(house.coords);
                    } else if (house.coords && house.coords.length === 2 && houseMap) {
                        houseMap.setCenter(house.coords, 17);
                    } else if (!house.coords) {
                        showToast('❌ Координаты этого дома пока не добавлены');
                        mapContainer.style.display = 'none';
                        showOnMapBtn.textContent = '🗺️ Показать на карте';
                        showOnMapBtn.classList.remove('active-map');
                    }
                } else {
                    mapContainer.style.display = 'none';
                    showOnMapBtn.textContent = '🗺️ Показать на карте';
                    showOnMapBtn.classList.remove('active-map');
                }
            });
        }
        
        // Кнопка "Поделиться ссылкой"
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', function() {
                const shareUrl = window.location.href;
                navigator.clipboard.writeText(shareUrl).then(function() {
                    showToast('✅ Ссылка скопирована в буфер обмена!');
                }).catch(function() {
                    showToast('❌ Не удалось скопировать ссылку');
                });
            });
        }
        
        // Кнопка "Экспорт в PDF"
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', function() {
                exportToPDF();
            });
        }
    }
    
    function initHouseMap(coords) {
        if (typeof ymaps === 'undefined') {
            console.error('Яндекс.Карты не загрузились');
            return;
        }
        
        ymaps.ready(function() {
            houseMap = new ymaps.Map('houseMap', {
                center: coords,
                zoom: 17,
                controls: ['zoomControl', 'fullscreenControl']
            });
            
            const placemark = new ymaps.Placemark(
                coords,
                {
                    balloonContentHeader: '<b>' + currentHouse.address + '</b>',
                    balloonContentBody: '📍 ' + (currentHouse.district || '')
                },
                { preset: 'islands#blueHomeIcon' }
            );
            houseMap.geoObjects.add(placemark);
            mapInitialized = true;
        });
    }
    
    function showToast(message) {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(function() {
            toast.remove();
        }, 2000);
    }
    
    function exportToPDF() {
        const element = document.getElementById('houseContent');
        if (!element) return;
        
        const mapContainer = document.getElementById('houseMap');
        const wasVisible = mapContainer && mapContainer.style.display === 'block';
        if (wasVisible) {
            mapContainer.style.display = 'none';
        }
        
        const originalTitle = document.title;
        const address = document.getElementById('fullAddress').textContent;
        document.title = address + ' - информация о лифтах';
        
        const opt = {
            margin: [10, 10, 10, 10],
            filename: address.replace(/[^а-яА-Яa-zA-Z0-9]/g, '_') + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        showToast('📄 Генерация PDF, подождите...');
        
        html2pdf().set(opt).from(element).save().then(function() {
            document.title = originalTitle;
            if (wasVisible) {
                mapContainer.style.display = 'block';
            }
        }).catch(function(error) {
            console.error('PDF error:', error);
            showToast('❌ Ошибка при создании PDF');
            document.title = originalTitle;
            if (wasVisible) {
                mapContainer.style.display = 'block';
            }
        });
    }
    
    function showHouseInfo(house) {
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
                            isNewFormat: true
                        });
                    });
                } else if (entrance.lift) {
                    allLifts.push({
                        id: entranceIdx + '_0',
                        name: entrance.name || 'Подъезд ' + (entranceIdx + 1),
                        liftData: entrance.lift,
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
                    document.querySelectorAll('.entrance-btn').forEach(function(b) { b.classList.remove('active'); });
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
            programTbody.innerHTML = '<tr><td colspan="2">Нет данных<\/td><\/tr>';
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
            shortTbody.innerHTML = '<tr><td colspan="3">Нет данных<\/td><\/tr>';
        }
    }
    
    function showLiftInfo(house, liftItem) {
        const liftInfo = document.getElementById('liftInfo');
        let lift = liftItem && liftItem.liftData ? liftItem.liftData : null;
        
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
        
        let previousLift = liftItem && liftItem.liftData && liftItem.liftData.previousLift ? liftItem.liftData.previousLift : null;
        
        if (!previousLift) {
            previousLiftCard.style.display = 'none';
            return;
        }
        
        previousLiftCard.style.display = 'block';
        
        let yearsInService = '—';
        if (previousLift.yearOper && previousLift.yearOper !== '—') {
            let endYear = previousLift.yearRemoved || new Date().getFullYear();
            if (typeof endYear === 'string') endYear = parseInt(endYear);
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
    
    loadData();
});