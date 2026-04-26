let housesData = [];
let currentSort = { column: 'address', direction: 'asc' };

document.addEventListener('DOMContentLoaded', function() {
    console.log('Список домов загружен');
    
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
    
    const searchInput = document.getElementById('searchInput');
    const districtFilter = document.getElementById('districtFilter');
    const housesList = document.getElementById('housesList');
    
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
    
    function updateDistrictFilter() {
        const districts = new Set();
        housesData.forEach(function(house) {
            if (house.district) districts.add(house.district);
        });
        const sortedDistricts = Array.from(districts).sort();
        districtFilter.innerHTML = '<option value="all">📌 Все районы</option>';
        sortedDistricts.forEach(function(district) {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtFilter.appendChild(option);
        });
    }
    
    function renderList() {
        const searchQuery = searchInput.value.trim().toLowerCase();
        const selectedDistrict = districtFilter.value;
        
        let filtered = housesData.filter(function(house) {
            let match = true;
            if (searchQuery) {
                match = match && house.address.toLowerCase().includes(searchQuery);
            }
            if (selectedDistrict !== 'all') {
                match = match && house.district === selectedDistrict;
            }
            return match;
        });
        
        // СОРТИРОВКА
        filtered.sort(function(a, b) {
            let valA, valB;
            switch (currentSort.column) {
                case 'address':
                    valA = a.address;
                    valB = b.address;
                    return currentSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'district':
                    valA = a.district || '';
                    valB = b.district || '';
                    return currentSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'buildYear':
                    valA = a.buildYear || 0;
                    valB = b.buildYear || 0;
                    return currentSort.direction === 'asc' ? valA - valB : valB - valA;
                case 'floors':
                    valA = a.floors || 0;
                    valB = b.floors || 0;
                    return currentSort.direction === 'asc' ? valA - valB : valB - valA;
                case 'liftsCount':
                    valA = getLiftsCount(a);
                    valB = getLiftsCount(b);
                    return currentSort.direction === 'asc' ? valA - valB : valB - valA;
                default:
                    return 0;
            }
        });
        
        housesList.innerHTML = '';
        filtered.forEach(function(house) {
            const row = housesList.insertRow();
            row.insertCell(0).innerHTML = '<strong>' + house.address + '</strong>';
            row.insertCell(1).textContent = house.district || '—';
            row.insertCell(2).textContent = house.buildYear || '—';
            row.insertCell(3).textContent = house.floors || '—';
            row.insertCell(4).textContent = getLiftsCount(house);
            row.insertCell(5).innerHTML = '<a href="house.html?id=' + house.id + '" class="details-link">Подробнее →</a>';
        });
        
        if (filtered.length === 0) {
            housesList.innerHTML = '<tr><td colspan="6">Ничего не найдено<\/td><\/tr>';
        }
        
        updateSortArrows();
    }
    
    function updateSortArrows() {
        document.querySelectorAll('#housesTable th .sort-arrow').forEach(function(arrow) {
            arrow.textContent = '';
        });
        const activeHeader = document.querySelector('#housesTable th[data-sort="' + currentSort.column + '"] .sort-arrow');
        if (activeHeader) {
            activeHeader.textContent = currentSort.direction === 'asc' ? ' ↑' : ' ↓';
        }
    }
    
    function initSorting() {
        const headers = document.querySelectorAll('#housesTable th');
        console.log('Найдено заголовков:', headers.length);
        headers.forEach(function(th) {
            th.style.cursor = 'pointer';
            th.addEventListener('click', function() {
                const column = th.dataset.sort;
                console.log('Клик по:', column);
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }
                renderList();
            });
        });
    }
    
    function loadData() {
        fetch('data.json?t=' + Date.now())
            .then(function(response) { return response.json(); })
            .then(function(data) {
                housesData = data;
                console.log('Загружено домов:', housesData.length);
                updateDistrictFilter();
                updateHeaderStats();
                renderList();
                initSorting();
            })
            .catch(function(error) {
                console.error('Ошибка:', error);
                housesList.innerHTML = '<td><td colspan="6">Ошибка загрузки данных<\/td><\/tr>';
            });
    }
    
    searchInput.addEventListener('input', function() { renderList(); });
    districtFilter.addEventListener('change', function() { renderList(); });
    
    loadData();
});