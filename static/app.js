let countries = [];
let map = null;
let timeInterval = null;

// Contador de visitantes usando localStorage
function initVisitorCounter() {
    let visitors = parseInt(localStorage.getItem('visitors') || '0');
    visitors++;
    localStorage.setItem('visitors', visitors.toString());
    document.getElementById('visitor-count').textContent = `Visitante #${visitors}`;
}

// Cargar países
async function loadCountries() {
    try {
        document.getElementById('country-select').innerHTML = '<option value="">Cargando países...</option>';
        
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flag,flags,capital,region,population,currencies,languages,area,timezones,latlng');
        
        if (!response.ok) {
            throw new Error(`Error en la respuesta de la API: ${response.statusText}`);
        }
        
        countries = await response.json();
        countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
        
        const select = document.getElementById('country-select');
        select.innerHTML = '<option value="">Selecciona un país</option>';
        
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.cca2;
            option.textContent = country.name.common;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading countries:', error);
        document.getElementById('country-select').innerHTML = '<option value="">Error al cargar países</option>';
        showError('Error al cargar la lista de países. Por favor, recarga la página.');
    }
}

// Mostrar mensaje de error
function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

// Obtener hora actual del país
async function getCurrentTime(timezone) {
    try {
        // Limpiar caracteres problemáticos en la zona horaria
        const cleanedTimezone = encodeURIComponent(timezone);
        const response = await fetch(`https://worldtimeapi.org/api/timezone/${cleanedTimezone}`);
        
        if (!response.ok) {
            throw new Error(`Error en la respuesta de la API: ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
            datetime: new Date(data.datetime),
            timezone: data.timezone
        };
    } catch (error) {
        console.error('Error getting time:', error);
        return {
            datetime: new Date(),
            timezone: 'UTC'
        };
    }
}

// Actualizar hora
function updateTime(timezone, targetElement) {
    if (timeInterval) {
        clearInterval(timeInterval);
    }
    
    getCurrentTime(timezone).then(timeData => {
        function update() {
            timeData.datetime = new Date(timeData.datetime.getTime() + 1000);
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            };
            targetElement.textContent = timeData.datetime.toLocaleDateString('es-ES', options);
        }
        
        update();
        timeInterval = setInterval(update, 1000);
    }).catch(error => {
        console.error('Error updating time:', error);
        targetElement.textContent = 'No disponible';
    });
}

// Inicializar mapa
function initMap(lat, lng, countryName) {
    if (map) {
        map.remove();
    }
    
    map = L.map('map').setView([lat, lng], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    L.marker([lat, lng]).addTo(map)
        .bindPopup(`<b>${countryName}</b>`)
        .openPopup();
}

// Mostrar información del país
async function showCountryInfo(countryCode) {
    const loadingElement = document.getElementById('loading');
    const infoElement = document.getElementById('country-info');
    
    loadingElement.style.display = 'block';
    infoElement.style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    
    try {
        const country = countries.find(c => c.cca2 === countryCode);
        if (!country) {
            throw new Error('País no encontrado');
        }

        // Mostrar información básica
        document.getElementById('country-name').textContent = country.name.common;
        document.getElementById('country-flag').src = country.flags.png;
        document.getElementById('country-flag').alt = `Bandera de ${country.name.common}`;
        
        // Información general
        document.getElementById('capital').textContent = country.capital ? country.capital[0] : 'No disponible';
        document.getElementById('region').textContent = country.region || 'No disponible';
        document.getElementById('population').textContent = country.population ? country.population.toLocaleString('es-ES') : 'No disponible';
        document.getElementById('country-code').textContent = country.cca2;
        document.getElementById('area').textContent = country.area ? `${country.area.toLocaleString('es-ES')} km²` : 'No disponible';
        
        // Idiomas
        const languages = country.languages ? Object.values(country.languages).join(', ') : 'No disponible';
        document.getElementById('languages').textContent = languages;
        
        // Moneda
        if (country.currencies) {
            const currency = Object.values(country.currencies)[0];
            document.getElementById('currency').textContent = currency.name;
            document.getElementById('currency-symbol').textContent = currency.symbol || 'N/A';
        } else {
            document.getElementById('currency').textContent = 'No disponible';
            document.getElementById('currency-symbol').textContent = 'N/A';
        }
        
        // Zona horaria y hora
        const timezone = country.timezones ? country.timezones[0] : 'UTC';
        document.getElementById('timezone').textContent = timezone;
        updateTime(timezone, document.getElementById('current-time'));
        
        // Mapa
        if (country.latlng && country.latlng.length >= 2) {
            initMap(country.latlng[0], country.latlng[1], country.name.common);
        } else {
            document.getElementById('map').innerHTML = '<p>Ubicación no disponible</p>';
        }
        
        // Mostrar la información
        loadingElement.style.display = 'none';
        infoElement.style.display = 'block';
        infoElement.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error showing country info:', error);
        loadingElement.style.display = 'none';
        showError('Error al cargar la información del país. Por favor, intenta con otro país.');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    initVisitorCounter();
    loadCountries();
    
    document.getElementById('country-select').addEventListener('change', function() {
        const countryCode = this.value;
        if (countryCode) {
            showCountryInfo(countryCode);
        } else {
            document.getElementById('country-info').style.display = 'none';
            document.getElementById('loading').style.display = 'none';
        }
    });
});

// Limpiar intervalo cuando se cierra la página
window.addEventListener('beforeunload', function() {
    if (timeInterval) {
        clearInterval(timeInterval);
    }
});