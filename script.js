const CONFIG = {
  GOOGLE_MAPS_API_KEY: "AIzaSyBpLGnD9GkXgUIRiF2dzmJNWjhN4aSjvr4",
  OPENWEATHERMAP_API_KEY: "54acca8f3ca7ae26914d5fc6f2b31b3c",
  CARBON_EMISSIONS: {
    DRIVING: {
      car: 120,
      bus: 68,
      motorcycle: 103,
    },
    TRANSIT: {
      train: 14,
      bus: 68,
    },
    BICYCLING: 0,
    WALKING: 0,
  },
};

let map;
let directionsService;
let directionsRenderer;
let userLocation;
let originAutocomplete;
let destinationAutocomplete;

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
}

function toggleCard(cardId) {
  const card = document.getElementById(cardId);
  card.classList.toggle("minimized");
  const btn = card.querySelector(".minimize-btn");
  btn.textContent = card.classList.contains("minimized") ? "+" : "−";
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 0, lng: 0 },
    zoom: 12,
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map: map });

  setupAutocomplete();
  getUserLocation();
}

function setupAutocomplete() {
  originAutocomplete = new google.maps.places.Autocomplete(
    document.getElementById("origin")
  );
  destinationAutocomplete = new google.maps.places.Autocomplete(
    document.getElementById("destination")
  );
}

function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      handleLocationError
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
}

function handleLocationSuccess(position) {
  userLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
  map.setCenter(userLocation);
  document.getElementById(
    "origin"
  ).placeholder = `Current Location: ${userLocation.lat.toFixed(
    4
  )}, ${userLocation.lng.toFixed(4)}`;
}

function handleLocationError(error) {
  console.error("Error getting location:", error);
  alert("Error getting your location: " + error.message);
}

async function calculateRoute() {
  const originInput = document.getElementById("origin").value;
  const destination = document.getElementById("destination").value;
  const travelMode = document.getElementById("travel-mode").value;

  if (!destination) {
    alert("Please enter a destination.");
    return;
  }

  const origin = originInput || userLocation;
  const request = {
    origin: origin,
    destination: destination,
    travelMode: travelMode,
  };

  try {
    const response = await new Promise((resolve, reject) => {
      directionsService.route(request, (response, status) => {
        status === "OK" ? resolve(response) : reject(status);
      });
    });

    handleRouteSuccess(response, travelMode);
  } catch (error) {
    alert("Directions request failed: " + error);
  }
}

function handleRouteSuccess(response, travelMode) {
  directionsRenderer.setDirections(response);
  const route = response.routes[0];

  addRouteMarkers(route);
  showAllCards();
  updateAllInfo(route, travelMode);
}

function addRouteMarkers(route) {
  const legs = route.legs;
  legs.forEach((leg) => {
    const distance = leg.distance.text;
    const duration = leg.duration.text;
    const startLocation = leg.start_location;

    new google.maps.marker.AdvancedMarkerElement({
      position: startLocation,
      map: map,
      title: `Distance: ${distance}, Duration: ${duration}`,
      content: createMarkerContent(distance, duration),
    });
  });
}

function createMarkerContent(distance, duration) {
  const container = document.createElement("div");
  container.style.backgroundColor = "white";
  container.style.padding = "8px";
  container.style.borderRadius = "4px";
  container.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
  container.innerHTML = `<div><strong>Distance:</strong> ${distance}</div><div><strong>Duration:</strong> ${duration}</div>`;
  return container;
}

function showAllCards() {
  const cards = ["weather-card", "carbon-card", "alternatives-card"];
  cards.forEach((cardId) => {
    const card = document.getElementById(cardId);
    if (card) {
      card.classList.remove("hidden");
      if (card.classList.contains("minimized")) {
        toggleCard(cardId);
      }
    }
  });
}

function updateAllInfo(route, travelMode) {
  getWeatherAlongRoute(route);
  calculateCarbonFootprint(route, travelMode);
  suggestAlternatives(
    route.legs[0].start_location,
    route.legs[0].end_location,
    route
  );
}

async function getWeatherAlongRoute(route) {
  const weatherInfoDiv = document
    .getElementById("weather-card")
    .querySelector(".card-content");
  weatherInfoDiv.innerHTML =
    '<div class="loading">Fetching weather data...</div>';

  try {
    const weatherData = await getWeatherDataForRoute(route);
    displayWeatherData(weatherData, weatherInfoDiv);
  } catch (error) {
    weatherInfoDiv.innerHTML =
      '<div class="error">Error fetching weather data.</div>';
    console.error("Weather fetch error:", error);
  }
}

async function getWeatherDataForRoute(route) {
  const path = route.overview_path;
  const weatherData = [];

  const start = path[0];
  const midpoint = path[Math.floor(path.length / 2)];
  const end = path[path.length - 1];

  const points = [start, midpoint, end];
  for (const point of points) {
    const weather = await fetchWeather(point.lat(), point.lng());
    weatherData.push(weather);
  }

  return weatherData;
}

function displayWeatherData(weatherData, container) {
  container.innerHTML = weatherData
    .map(
      (weather) => `
        <div class="info-row">
          <div class="info-label">Location: ${weather.name}</div>
          <div>Temperature: ${weather.main.temp}°C</div>
          <div>Weather: ${weather.weather[0].description}</div>
        </div>
      `
    )
    .join("");
}


function displayCarbonData(distance, travelMode, totalEmissions, container) {
  container.innerHTML = `
      <div class="info-row">
        <div class="info-label">Distance</div>
        <div>${distance.toFixed(2)} km</div>
      </div>
      <div class="info-row">
        <div class="info-label">Travel Mode</div>
        <div>${travelMode.toLowerCase()}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Carbon Footprint</div>
        <div>${totalEmissions} g CO₂</div>
      </div>
    `;
}

async function suggestAlternatives(origin, destination, mainRoute) {
  const alternativesInfoDiv = document
    .getElementById("alternatives-card")
    .querySelector(".card-content");
  alternativesInfoDiv.innerHTML =
    '<div class="loading">Calculating alternative travel options...</div>';

  try {
    const alternatives = await calculateAlternativeRoutes(origin, destination);
    displayAlternatives(alternatives, alternativesInfoDiv);
  } catch (error) {
    alternativesInfoDiv.innerHTML =
      '<div class="error">Error calculating alternatives.</div>';
    console.error("Alternatives calculation error:", error);
  }
}

function getCarbonEmissionRate(mode) {
  switch (mode) {
    case 'DRIVING':
      return CONFIG.CARBON_EMISSIONS.DRIVING.car;
    case 'TRANSIT':
      return CONFIG.CARBON_EMISSIONS.TRANSIT.bus;
    case 'BICYCLING':
      return CONFIG.CARBON_EMISSIONS.BICYCLING;
    case 'WALKING':
      return CONFIG.CARBON_EMISSIONS.WALKING;
    default:
      return 0;
  }
}

async function calculateAlternativeRoutes(origin, destination) {
  const travelModes = ["DRIVING", "TRANSIT", "BICYCLING", "WALKING"];
  const alternatives = [];

  for (const mode of travelModes) {
    const request = {
      origin: origin,
      destination: destination,
      travelMode: mode,
    };

    try {
      const response = await new Promise((resolve) => {
        directionsService.route(request, (response, status) => {
          status === "OK" ? resolve(response) : resolve(null);
        });
      });

      if (response) {
        const route = response.routes[0];
        const distance = route.legs[0].distance.value / 1000;
        const duration = route.legs[0].duration.text;
        const emissionRate = getCarbonEmissionRate(mode);
        const emissions = (distance * emissionRate).toFixed(2);

        alternatives.push({
          mode: mode,
          distance: distance.toFixed(2),
          duration: duration,
          emissions: emissions,
        });
      }
    } catch (error) {
      console.error(`Error calculating route for ${mode}:`, error);
    }
  }

  return alternatives;
}

function calculateCarbonFootprint(route, travelMode) {
  const carbonInfoDiv = document
    .getElementById("carbon-card")
    .querySelector(".card-content");
  const distance = route.legs[0].distance.value / 1000;

  const emissionRate = getCarbonEmissionRate(travelMode);
  const totalEmissions = (distance * emissionRate).toFixed(2);

  displayCarbonData(distance, travelMode, totalEmissions, carbonInfoDiv);
}

function displayAlternatives(alternatives, container) {
  container.innerHTML = alternatives
    .map(
      (alt) => `
        <div class="info-row">
          <div class="info-label">${alt.mode.toLowerCase()}</div>
          <div>Distance: ${alt.distance} km</div>
          <div>Duration: ${alt.duration}</div>
          <div>Carbon Footprint: ${alt.emissions} g CO₂</div>
        </div>
      `
    )
    .join("");
}

async function fetchWeather(lat, lng) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${CONFIG.OPENWEATHERMAP_API_KEY}&units=metric`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  return await response.json();
}

function loadScript() {
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
  script.defer = true;
  script.async = true;
  document.head.appendChild(script);
}
function handleRouteSuccess(response, travelMode) {
  directionsRenderer.setDirections(response);
  const route = response.routes[0];
  addRouteSummaryOverlay(route);

  showAllCards();
  updateAllInfo(route, travelMode);
}

function addRouteSummaryOverlay(route) {
  removeExistingRouteSummary();

  const leg = route.legs[0];
  const midpoint = findRouteMiddlePoint(route);

  const summaryDiv = document.createElement("div");
  summaryDiv.className = "route-summary";
  summaryDiv.innerHTML = `
      <strong>${leg.distance.text}</strong> • <strong>${leg.duration.text}</strong>
    `;

  const overlay = new google.maps.OverlayView();

  overlay.onAdd = function () {
    const panes = this.getPanes();
    panes.floatPane.appendChild(summaryDiv);
  };

  overlay.draw = function () {
    const projection = this.getProjection();
    const position = projection.fromLatLngToDivPixel(midpoint);

    summaryDiv.style.left = position.x + "px";
    summaryDiv.style.top = position.y + "px";
  };

  overlay.onRemove = function () {
    summaryDiv.parentNode.removeChild(summaryDiv);
  };

  overlay.setMap(map);

  window.currentRouteOverlay = overlay;
}

function removeExistingRouteSummary() {
  if (window.currentRouteOverlay) {
    window.currentRouteOverlay.setMap(null);
  }
}

function findRouteMiddlePoint(route) {
  const path = route.overview_path;
  const middleIndex = Math.floor(path.length / 2);
  return path[middleIndex];
}

loadScript();
