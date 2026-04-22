let housesData = [];

// Элементы DOM
const addressInput = document.getElementById('addressInput');
const suggestionsDiv = document.getElementById('suggestions');
const houseContent = document.getElementById('houseContent');
const homeButton = document.getElementById('homeButton');

// Загрузка данных
async function loadData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Ошибка загрузки data.json');
        housesData = await response.json();
        console.log('Данные загружены:', housesData.length, 'домов');
    } catch (error) {
        console.error(error);
        alert('Не удалось загрузить данные. Проверьте файл data.json');
    }
}

// Показ подсказок
function showSuggestions() {
    const query = addressInput.value.trim().toLowerCase();
    if (query.length === 0) {
        suggestionsDiv.classList.add('hidden');
        return;
    }
    
    const filtered = housesData.filter(house => 
        house.address.toLowerCase().includes(query)
    );
    
    if (filtered.length === 0) {
        suggestionsDiv.classList.add('hidden');
        return;
    }
    
    suggestionsDiv.innerHTML = '';
    filtered.forEach(house => {
        const div = document.createElement('div');
        div.textContent = house.address;
        div.addEventListener('click', () => {
            addressInput.value = house.address;
            suggestionsDiv.classList.add('hidden');
            showFullHouseInfo(house);
        });
        suggestionsDiv.appendChild(div);
    });
    suggestionsDiv.classList.remove('hidden');
}

// Отображение полной информации о доме
function showFullHouseInfo(house) {
    // Показываем контейнер
    houseContent.classList.remove('hidden');
    
    // Адрес и район
    document.getElementById('fullAddress').textContent = house.address;
    document.getElementById('district').textContent = house.district;
    
    // Информация о здании
    document.getElementById('buildingType').textContent = house.buildingType || 'Многоквартирный дом';
    document.getElementById('buildYear').textContent = house.buildYear || '—';
    document.getElementById('constructionYear').textContent = house.constructionYear || house.buildYear || '—';
    document.getElementById('floors').textContent = house.floors || '—';
    document.getElementById('series').textContent = house.series || '—';
    
    // Кнопки подъездов
    const entranceButtonsDiv = document.getElementById('entranceButtons');
    entranceButtonsDiv.innerHTML = '';
    
    if (house.entrances && house.entrances.length > 0) {
        house.entrances.forEach((entrance, idx) => {
            const btn = document.createElement('button');
            btn.textContent = entrance.name || `Подъезд ${idx + 1}`;
            btn.classList.add('entrance-btn');
            if (idx === 0) btn.classList.add('active');
            btn.addEventListener('click', () => {
                document.querySelectorAll('.entrance-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                showLiftInfo(house, idx);
            });
            entranceButtonsDiv.appendChild(btn);
        });
        if (house.entrances.length > 0) showLiftInfo(house, 0);
    } else {
        entranceButtonsDiv.innerHTML = '<button class="entrance-btn active">Лифт №1</button>';
        showLiftInfo(house, 0);
    }
    
    // Виды работ по программе
    const programTbody = document.querySelector('#programWorks tbody');
    programTbody.innerHTML = '';
    if (house.programWorks && house.programWorks.length) {
        house.programWorks.forEach(work => {
            const row = programTbody.insertRow();
            row.insertCell(0).textContent = work.year;
            row.insertCell(1).textContent = work.description;
        });
    } else {
        const row = programTbody.insertRow();
        row.insertCell(0).textContent = '—';
        row.insertCell(1).textContent = 'Нет данных';
    }
    
    // Виды работ по краткосрочному плану
    const shortTbody = document.querySelector('#shortTermWorks tbody');
    shortTbody.innerHTML = '';
    if (house.shortTermWorks && house.shortTermWorks.length) {
        house.shortTermWorks.forEach(work => {
            const row = shortTbody.insertRow();
            row.insertCell(0).textContent = work.type;
            row.insertCell(1).textContent = work.contractor;
            row.insertCell(2).textContent = work.period;
        });
    } else {
        const row = shortTbody.insertRow();
        row.insertCell(0).textContent = '—';
        row.insertCell(1).textContent = '—';
        row.insertCell(2).textContent = '—';
    }
}

// Показать информацию о лифте для выбранного подъезда
function showLiftInfo(house, entranceIndex) {
    const liftInfoDiv = document.getElementById('liftInfo');
    const entrance = house.entrances?.[entranceIndex] || { 
        lift: { 
            model: '—', 
            yearMade: '—', 
            yearOper: '—', 
            type: '—',
            stops: '—',
            condition: '—',
            engine: '—',
            note: '—'
        } 
    };
    
    const lift = entrance.lift || {};
    
    liftInfoDiv.innerHTML = `
        <div class="info-row"><span class="info-label">Модель</span><span class="info-value">${lift.model || '—'}</span></div>
        <div class="info-row"><span class="info-label">Год изготовления</span><span class="info-value">${lift.yearMade || '—'}</span></div>
        <div class="info-row"><span class="info-label">Год ввода в эксплуатацию</span><span class="info-value">${lift.yearOper || '—'}</span></div>
        <div class="info-row"><span class="info-label">Тип лифта</span><span class="info-value">${lift.type || '—'}</span></div>
        <div class="info-row"><span class="info-label">Количество остановок</span><span class="info-value">${lift.stops || '—'}</span></div>
        <div class="info-row"><span class="info-label">Текущее состояние</span><span class="info-value">${lift.condition || '—'}</span></div>
        <div class="info-row"><span class="info-label">Двигатель</span><span class="info-value">${lift.engine || '—'}</span></div>
        <div class="info-row"><span class="info-label">Примечание</span><span class="info-value">${lift.note || '—'}</span></div>
    `;
}

// Сброс к началу (кнопка Главная)
function resetToHome() {
    addressInput.value = '';
    houseContent.classList.add('hidden');
    suggestionsDiv.classList.add('hidden');
    addressInput.focus();
}

// Обработчики
addressInput.addEventListener('input', showSuggestions);
homeButton.addEventListener('click', resetToHome);

document.addEventListener('click', (e) => {
    if (e.target !== addressInput && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.classList.add('hidden');
    }
});

// Загружаем данные
loadData();