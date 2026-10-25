// Quantisky - Weather Analyzer App

let currentLocation = null;
let weatherDataGlobal = null;
let selectedDayIndex = null;

// DOM elements
const locationInput = document.getElementById('locationInput');
const searchBtn = document.getElementById('searchBtn');
const searchResultsDiv = document.getElementById('searchResults');
const locationInfoDiv = document.getElementById('locationInfo');
const locationNameEl = document.getElementById('locationName');
const locationDetailsEl = document.getElementById('locationDetails');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorMessageEl = document.getElementById('errorMessage');
const weatherDashboard = document.getElementById('weatherDashboard');
const selectedWeatherCard = document.getElementById('selectedWeatherCard');
const hourlyTempDiv = document.getElementById('hourlyTemp');
const allDaysRow = document.getElementById('allDaysRow');
const currentDateTimeDiv = document.getElementById('currentDateTime');
const hourlyPrevBtn = document.getElementById('hourlyPrev');
const hourlyNextBtn = document.getElementById('hourlyNext');
const hourlySliderContainer = document.getElementById('hourlySliderContainer');

// Update current date and time
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    currentDateTimeDiv.textContent = now.toLocaleDateString('en-US', options);
}

updateDateTime();
setInterval(updateDateTime, 1000);

// Weather code mappings
const weatherCodeDescriptions = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    66: 'Light freezing rain', 67: 'Heavy freezing rain',
    71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall', 77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
};

function getWeatherDescription(code) {
    return weatherCodeDescriptions[code] || 'Unknown';
}

function getWeatherIcon(code) {
    if (code === 0 || code === 1) return '☀️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 57) return '🌦️';
    if (code >= 61 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return '🌤️';
}

// Search for location
async function searchLocation(query) {
    if (!query.trim()) {
        searchResultsDiv.innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        const data = await response.json();
        
        searchResultsDiv.innerHTML = '';
        
        if (data.results) {
            data.results.forEach(result => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <strong>${result.name}</strong><br>
                    <small>${result.admin1 ? result.admin1 + ', ' : ''}${result.country}</small>
                `;
                item.onclick = () => {
                    selectLocation(result);
                    searchResultsDiv.innerHTML = '';
                    locationInput.value = result.name;
                };
                searchResultsDiv.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error searching location:', error);
    }
}

// Select location and fetch weather
async function selectLocation(location) {
    currentLocation = location;
    
    searchResultsDiv.innerHTML = '';
    
    locationInfoDiv.style.display = 'block';
    locationNameEl.textContent = `${location.name}, ${location.country}`;
    locationDetailsEl.textContent = location.admin1 ? `Region/State: ${location.admin1}` : 'Location';
    
    errorDiv.style.display = 'none';
    loadingDiv.style.display = 'block';
    weatherDashboard.style.display = 'none';
    
    try {
        const dailyResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,relative_humidity_2m_max,wind_speed_10m_max,weather_code&timezone=auto&past_days=3&forecast_days=4`
        );
        
        const hourlyResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code&timezone=auto&forecast_days=2`
        );
        
        const dailyData = await dailyResponse.json();
        const hourlyData = await hourlyResponse.json();
        
        weatherDataGlobal = { daily: dailyData.daily, hourly: hourlyData.hourly };
        
        loadingDiv.style.display = 'none';
        weatherDashboard.style.display = 'block';
        
        displayAllWeather(weatherDataGlobal.daily, weatherDataGlobal.hourly);
        
    } catch (error) {
        console.error('Error fetching weather:', error);
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        errorMessageEl.textContent = 'Error fetching weather data. Please try again.';
    }
}

function displayAllWeather(daily, hourly) {
    const time = daily.time;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayIndex = time.indexOf(todayStr);
    
    selectedDayIndex = todayIndex !== -1 ? todayIndex : 0;
    
    displaySelectedWeather(daily, selectedDayIndex);
    
    allDaysRow.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        if (time[i]) {
            const card = createMiniDayCardUniform(daily, i, time[i], i === selectedDayIndex);
            allDaysRow.appendChild(card);
        }
    }
    
    displayHourlySlider(hourly);
}

function displaySelectedWeather(daily, index) {
    const dateStr = daily.time[index];
    const date = new Date(dateStr + 'T00:00:00');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateFormatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    const tempMax = Math.round(daily.temperature_2m_max[index]);
    const tempMin = Math.round(daily.temperature_2m_min[index]);
    const precipSum = daily.precipitation_sum[index] || 0;
    const precipProb = daily.precipitation_probability_max[index] || 0;
    const humidity = daily.relative_humidity_2m_max[index] || 0;
    const windSpeed = Math.round(daily.wind_speed_10m_max[index] || 0);
    const weatherCode = daily.weather_code[index];
    const weatherDesc = getWeatherDescription(weatherCode);
    const icon = getWeatherIcon(weatherCode);
    
    selectedWeatherCard.innerHTML = `
        <div class="selected-weather-content">
            <div class="selected-header">
                <div>
                    <div class="selected-date">${dayName}, ${dateFormatted}</div>
                    <div class="selected-temp">${tempMax}°C</div>
                    <div class="selected-range">High: ${tempMax}°C | Low: ${tempMin}°C</div>
                </div>
                <div class="selected-weather-side">
                    <div class="selected-icon">${icon}</div>
                    <div class="selected-desc">${weatherDesc}</div>
                </div>
            </div>
            <div class="selected-details-grid">
                <div class="selected-detail-item">
                    <span class="selected-detail-label">☀️ Sun Heat</span>
                    <span class="selected-detail-value">${tempMax}°C</span>
                </div>
                <div class="selected-detail-item">
                    <span class="selected-detail-label">💦 Moisture/Humidity</span>
                    <span class="selected-detail-value">${humidity}%</span>
                </div>
                <div class="selected-detail-item">
                    <span class="selected-detail-label">🌧️ Expected Rain</span>
                    <span class="selected-detail-value">${precipSum}mm (${precipProb}%)</span>
                </div>
                <div class="selected-detail-item">
                    <span class="selected-detail-label">💨 Wind Speed</span>
                    <span class="selected-detail-value">${windSpeed} km/h</span>
                </div>
            </div>
        </div>
    `;
}

function createMiniDayCardUniform(daily, index, dateStr, isSelected) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const isPast = date < new Date(today.toDateString());
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dateFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const tempMax = Math.round(daily.temperature_2m_max[index]);
    const tempMin = Math.round(daily.temperature_2m_min[index]);
    const precipSum = daily.precipitation_sum[index] || 0;
    const humidity = daily.relative_humidity_2m_max[index] || 0;
    const weatherCode = daily.weather_code[index];
    const icon = getWeatherIcon(weatherCode);
    
    const card = document.createElement('div');
    card.className = isSelected ? 'mini-day-card-uniform mini-day-card-selected' : 'mini-day-card-uniform';
    card.style.cursor = 'pointer';
    
    card.innerHTML = `
        <div class="mini-day-header-uniform">
            <div>
                <div class="mini-day-name-uniform">${dayName}</div>
                <div class="mini-day-date-uniform">${dateFormatted} ${isPast ? '• Past' : '• Future'}</div>
            </div>
        </div>
        <div class="mini-day-main-uniform">
            <div class="mini-day-temp-uniform">${tempMax}°/${tempMin}°C</div>
            <div class="mini-day-icon-uniform">${icon}</div>
        </div>
        <div class="mini-day-details-uniform">
            <div class="mini-detail-row-uniform">
                <span class="mini-detail-label-uniform">💦 Moisture</span>
                <span class="mini-detail-value-uniform">${humidity}%</span>
            </div>
            <div class="mini-detail-row-uniform">
                <span class="mini-detail-label-uniform">🌧️ Rain</span>
                <span class="mini-detail-value-uniform">${precipSum}mm</span>
            </div>
        </div>
    `;
    
    card.onclick = () => {
        selectedDayIndex = index;
        if (weatherDataGlobal) {
            displaySelectedWeather(weatherDataGlobal.daily, index);
            // Update selected state
            allDaysRow.querySelectorAll('.mini-day-card-uniform').forEach((c, i) => {
                if (i === index) {
                    c.classList.add('mini-day-card-selected');
                } else {
                    c.classList.remove('mini-day-card-selected');
                }
            });
        }
    };
    
    return card;
}

function displayHourlySlider(hourly) {
    const time = hourly.time;
    const temp = hourly.temperature_2m;
    const weatherCode = hourly.weather_code;
    
    hourlyTempDiv.innerHTML = '';
    
    const now = new Date();
    const currentHour = now.getHours();
    
    for (let hour = currentHour; hour < currentHour + 24 && hour < 48; hour++) {
        const index = hour;
        if (time[index] !== undefined && temp[index] !== undefined) {
            let hourLabel;
            if (hour === currentHour) {
                hourLabel = 'Now';
            } else {
                const displayHour = hour % 24;
                if (displayHour === 0) hourLabel = '12 AM';
                else if (displayHour < 12) hourLabel = displayHour + ' AM';
                else if (displayHour === 12) hourLabel = '12 PM';
                else hourLabel = (displayHour - 12) + ' PM';
            }
            
            const hourTemp = Math.round(temp[index]);
            const icon = getWeatherIcon(weatherCode[index]);
            
            const item = document.createElement('div');
            item.className = 'hourly-item';
            item.innerHTML = `
                <div class="hourly-time">${hourLabel}</div>
                <div class="hourly-icon">${icon}</div>
                <div class="hourly-temp">${hourTemp}°C</div>
            `;
            hourlyTempDiv.appendChild(item);
        }
    }
}

if (hourlyPrevBtn) {
    hourlyPrevBtn.addEventListener('click', () => {
        hourlySliderContainer.scrollBy({ left: -220, behavior: 'smooth' });
    });
}

if (hourlyNextBtn) {
    hourlyNextBtn.addEventListener('click', () => {
        hourlySliderContainer.scrollBy({ left: 220, behavior: 'smooth' });
    });
}

searchBtn.addEventListener('click', async () => {
    const query = locationInput.value;
    if (query.trim()) {
        try {
            const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                selectLocation(data.results[0]);
                searchResultsDiv.innerHTML = '';
            } else {
                errorDiv.style.display = 'block';
                errorMessageEl.textContent = 'Location not found. Please try a different name.';
                weatherDashboard.style.display = 'none';
                locationInfoDiv.style.display = 'none';
            }
        } catch (err) {
            errorDiv.style.display = 'block';
            errorMessageEl.textContent = 'Error searching location. Please try again.';
        }
    }
});

locationInput.addEventListener('input', (e) => {
    searchLocation(e.target.value);
});

locationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-section')) {
        searchResultsDiv.innerHTML = '';
    }
});
