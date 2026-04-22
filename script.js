// Загружаем данные из JSON-файла
let housesData = [];

async function loadData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Не удалось загрузить data.json');
        housesData = await response.json();
        console.log('Данные загружены:', housesData.length, 'домов');
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('resultCard').innerHTML = `
            <div style="color: red; padding: 20px;">
                ❌ Ошибка загрузки данных. Убедитесь, что файл data.json лежит рядом с index.html.
            </div>
        `;
        document.getElementById('resultCard').classList.remove('hidden');
    }
}

// Показ подсказок при вводе текста
const addressInput = document.getElementById('addressInput');
const suggestionsDiv = document.getElementById('suggestions');

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
            showHouseCard(house);
        });
        suggestionsDiv.appendChild(div);
    });
    
    suggestionsDiv.classList.remove('hidden');
}

addressInput.addEventListener('input', showSuggestions);

// Скрываем подсказки при клике вне
document.addEventListener('click', function(e) {
    if (e.target !== addressInput && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.classList.add('hidden');
    }
});

// Отображение карточки с информацией о доме
function showHouseCard(house) {
    const resultCard = document.getElementById('resultCard');
    
    // Формируем статус замены (фактическая или плановая)
    const actualStatus = house.actual_date !== "Еще не проведена" 
        ? `<span class="status-badge actual-date">✅ Фактически: ${house.actual_date}</span>`
        : `<span class="status-badge">⏳ ${house.actual_date}</span>`;
    
    const plannedPeriod = `${house.planned_start} — ${house.planned_end}`;
    
    const html = `
        <h2>🏠 ${house.address}</h2>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">📅 Плановый период замены:</div>
                <div class="info-value"><span class="status-badge planned-date">${plannedPeriod}</span></div>
            </div>
            <div class="info-row">
                <div class="info-label">🔧 Фактическое исполнение:</div>
                <div class="info-value">${actualStatus}</div>
            </div>
            <div class="info-row">
                <div class="info-label">🏭 Подрядная организация:</div>
                <div class="info-value">${house.contractor}</div>
            </div>
            <div class="info-row">
                <div class="info-label">🛗 Новый лифт (марка/модель):</div>
                <div class="info-value">${house.lift_brand}</div>
            </div>
            <div class="info-row">
                <div class="info-label">📌 Детали / примечания:</div>
                <div class="info-value">${house.details}</div>
            </div>
        </div>
    `;
    
    resultCard.innerHTML = html;
    resultCard.classList.remove('hidden');
}

// При загрузке страницы загружаем данные
loadData();

// Дополнительно: если пользователь нажал Enter, показываем первый подходящий дом
addressInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const query = addressInput.value.trim().toLowerCase();
        const found = housesData.find(house => house.address.toLowerCase().includes(query));
        if (found) {
            showHouseCard(found);
            suggestionsDiv.classList.add('hidden');
        } else {
            document.getElementById('resultCard').innerHTML = `<div style="padding: 20px;">❌ Дом не найден. Проверьте адрес.</div>`;
            document.getElementById('resultCard').classList.remove('hidden');
        }
    }
});