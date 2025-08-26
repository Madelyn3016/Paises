// ---------- Mostrar mensaje de error ----------
function showError(message) {
	const errorElement = document.getElementById('error-message');
	if (errorElement) {
		errorElement.textContent = message;
		errorElement.style.display = 'block';
		setTimeout(() => { errorElement.style.display = 'none'; }, 5000);
	} else {
		alert(message);
	}
}

// ---------- Cargar países desde restcountries ----------
async function loadCountries() {
	try {
		document.getElementById('country-select').innerHTML = '<option value="">Cargando países...</option>';
		const response = await fetch('https://restcountries.com/v2/all?fields=name,alpha2Code,capital,region,population,area,languages,currencies,flag,timezones,latlng');
		if (!response.ok) {
			throw new Error(`API error: ${response.statusText}`);
		}
		const data = await response.json();
		countries = data.map(c => ({
			name: c.name,
			alpha2Code: c.alpha2Code,
			capital: c.capital,
			region: c.region,
			population: c.population,
			area: c.area,
			languages: c.languages ? c.languages.map(l => ({ name: l.name })) : [],
			currencies: c.currencies ? c.currencies.map(cur => ({ name: cur.name, symbol: cur.symbol })) : [],
			flags: { png: c.flag },
			timezones: c.timezones,
			latlng: c.latlng
		}));
		countries.sort((a, b) => a.name.localeCompare(b.name));
		if (!response.ok) {
			throw new Error(`API error: ${response.statusText}`);
		}

		const select = document.getElementById('country-select');
		select.innerHTML = '<option value="">Selecciona un país</option>';
		countries.forEach(country => {
			const option = document.createElement('option');
			option.value = country.alpha2Code || country.name;
			option.textContent = country.name;
			select.appendChild(option);
		});
	} catch (error) {
		console.error('Error cargando países:', error);
		document.getElementById('country-select').innerHTML = '<option value="">Error al cargar países</option>';
		showError('Error al cargar la lista de países. ' + (error.message || '')); 
	}
}

// ---------- Mostrar información del país ----------
async function showCountryInfo(countryCode) {
	const loadingEl = document.getElementById('loading');
	const infoEl = document.getElementById('country-info');
	loadingEl.style.display = 'block';
	infoEl.style.display = 'none';
	document.getElementById('error-message').style.display = 'none';
	try {
		const country = countries.find(c => c.alpha2Code === countryCode || c.name === countryCode);
		if (!country) throw new Error('País no encontrado');
		document.getElementById('country-name').textContent = country.name;
		document.getElementById('country-flag').src = country.flags?.png || '';
		document.getElementById('country-flag').alt = `Bandera de ${country.name}`;
		document.getElementById('capital').textContent = country.capital || 'No disponible';
		document.getElementById('region').textContent = country.region || 'No disponible';
		document.getElementById('population').textContent = country.population?.toLocaleString('es-ES') || 'No disponible';
		document.getElementById('country-code').textContent = country.alpha2Code || 'N/A';
		document.getElementById('area').textContent = country.area ? `${country.area.toLocaleString('es-ES')} km²` : 'No disponible';
		const languages = country.languages?.map(l => l.name).join(', ') || 'No disponible';
		document.getElementById('languages').textContent = languages;
		if (country.currencies?.length > 0) {
			document.getElementById('currency').textContent = country.currencies[0].name;
			document.getElementById('currency-symbol').textContent = country.currencies[0].symbol || 'N/A';
		} else {
			document.getElementById('currency').textContent = 'No disponible';
			document.getElementById('currency-symbol').textContent = 'N/A';
		}
		const timezone = country.timezones?.[0] || 'UTC';
		document.getElementById('timezone').textContent = timezone;
		updateTime(timezone, document.getElementById('current-time'));
		if (country.latlng?.length >= 2) {
			initMap(country.latlng[0], country.latlng[1], country.name);
		} else {
			document.getElementById('map').innerHTML = '<p>Ubicación no disponible</p>';
		}
		loadingEl.style.display = 'none';
		infoEl.style.display = 'block';
		infoEl.scrollIntoView({ behavior: 'smooth' });
	} catch (error) {
		console.error(error);
		loadingEl.style.display = 'none';
		showError('Error al cargar la información del país. ' + (error.message || ''));
	}
}

// ---------- Inicialización de eventos ----------
document.addEventListener('DOMContentLoaded', () => {
	initVisitorCounter();
	loadCountries();
	const select = document.getElementById('country-select');
	if (select) {
		select.addEventListener('change', function() {
			const countryCode = this.value;
			if (countryCode) {
				showCountryInfo(countryCode);
			} else {
				document.getElementById('country-info').style.display = 'none';
				document.getElementById('loading').style.display = 'none';
			}
		});
	}
});
let countries = [];
let map = null;
let timeInterval = null;


// ---------- Utilidades de zona horaria ----------
// getCurrentTime: acepta una cadena de timezone que provenga de restcountries (p.ej. "UTC+01:00")
function getCurrentTime(timezone) {
return new Promise((resolve) => {
// Si timezone tiene formato "UTC±HH:MM" calculamos la fecha basada en UTC y el offset
if (typeof timezone === 'string' && timezone.toUpperCase().startsWith('UTC')) {
const match = timezone.match(/UTC([+-]\d{1,2})(?::?(\d{2}))?/i);
if (match) {
const hours = parseInt(match[1], 10) || 0;
const mins = parseInt(match[2] || '0', 10) || 0;
const offsetMinutes = hours * 60 + (hours < 0 ? -mins : mins);
const nowUtc = new Date(new Date().toISOString());
const target = new Date(nowUtc.getTime() + offsetMinutes * 60 * 1000);
resolve({ datetime: target });
return;
}
}
// Fallback: devolvemos la hora local del navegador
resolve({ datetime: new Date() });
});
}


// ---------- Contador y registro de visitantes (local) ----------
function initVisitorCounter() {
try {
// Contador simple
let visitors = parseInt(localStorage.getItem('visitors') || '0', 10);
visitors = isNaN(visitors) ? 1 : visitors + 1;
localStorage.setItem('visitors', visitors.toString());
document.getElementById('visitor-count').textContent = `Visitante #${visitors}`;


// Registro de visitas: guardamos un arreglo con timestamp
const log = JSON.parse(localStorage.getItem('visitorLog') || '[]');
const entry = { id: Date.now(), when: new Date().toISOString() };
log.unshift(entry);
// mantenemos sólo los últimos 10
localStorage.setItem('visitorLog', JSON.stringify(log.slice(0, 10)));
renderVisitorLog(log.slice(0, 10));
} catch (e) {
console.warn('No se pudo inicializar visitor counter', e);
}
}


function renderVisitorLog(log) {
const el = document.getElementById('visitor-log');
if (!el) return;
}
