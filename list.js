let housesData = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Список домов загружен');
    
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
    
    const searchInput = document.getElementById('searchInput');
    const housesList = document.getElementById('housesList');
    
    function loadData() {
        fetch('data.json?t=' + Date.now())
            .then(function(response) { return response.json(); })
            .then(function(data) {
                housesData = data;
                renderList();
            })
            .catch(function(error) {
                console.error('Ошибка:', error);
                housesList.innerHTML = '<tr><td colspan="6">Ошибка загрузки данных</td></tr>';
            });
    }
    
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
    
    function renderList() {
        const searchQuery = searchInput.value.trim().toLowerCase();
        
        let filtered = housesData;
        if (searchQuery) {
            filtered = housesData.filter(function(house) {
                return house.address.toLowerCase().includes(searchQuery);
            });
        }
        
        filtered.sort(function(a, b) {
            return a.address.localeCompare(b.address);
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
            housesList.innerHTML = '<tr><td colspan="6">Ничего не найдено</td></tr>';
        }
    }
    
    searchInput.addEventListener('input', function() {
        renderList();
    });
    
    loadData();
});