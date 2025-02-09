const GOOGLE_MAPS_API_KEY = "AIzaSyBpLGnD9GkXgUIRiF2dzmJNWjhN4aSjvr4";
const OPENWEATHERMAP_API_KEY = "54acca8f3ca7ae26914d5fc6f2b31b3c";

const CARBON_EMISSIONS = {
  DRIVING: 120,
  WALKING: 0,
  BICYCLING: 0,
  TRANSIT: 68,
};

let map;
let directionsService;
let directionsRenderer;
let userLocation;
let originAutocomplete;
let destinationAutocomplete;

// Toggle Sidebar
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("collapsed");
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

  originAutocomplete = new google.maps.places.Autocomplete(
    document.getElementById("origin")
  );
  destinationAutocomplete = new google.maps.places.Autocomplete(
    document.getElementById("destination")
  );

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
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
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Error getting your location: " + error.message);
      }
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
}

function calculateRoute() {
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

  directionsService.route(request, (response, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(response);
      const route = response.routes[0];

      ["weather-card", "carbon-card", "alternatives-card"].forEach((cardId) => {
        const card = document.getElementById(cardId);
        card.classList.remove("hidden");
        if (card.classList.contains("minimized")) {
          toggleCard(cardId);
        }
      });

      getWeatherAlongRoute(route);
      calculateCarbonFootprint(route, travelMode);
      suggestAlternatives(origin, destination, route);
    } else {
      alert("Directions request failed: " + status);
    }
  });
}

async function getWeatherAlongRoute(route) {
  const weatherInfoDiv = document
    .getElementById("weather-card")
    .querySelector(".card-content");
  weatherInfoDiv.innerHTML =
    '<div class="loading">Fetching weather data...</div>';

  const path = route.overview_path;
  const weatherData = [];

  try {
    for (let i = 0; i < path.length; i += Math.floor(path.length / 5)) {
      const point = path[i];
      const weather = await fetchWeather(point.lat(), point.lng());
      weatherData.push(weather);
    }

    weatherInfoDiv.innerHTML = weatherData
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
  } catch (error) {
    weatherInfoDiv.innerHTML =
      '<div class="error">Error fetching weather data.</div>';
    console.error("Weather fetch error:", error);
  }
}

function calculateCarbonFootprint(route, travelMode) {
  const carbonInfoDiv = document
    .getElementById("carbon-card")
    .querySelector(".card-content");
  const distance = route.legs[0].distance.value / 1000; // Convert to kilometers
  const emissionsPerKm = CARBON_EMISSIONS[travelMode] || 0;
  const totalEmissions = (distance * emissionsPerKm).toFixed(2);

  carbonInfoDiv.innerHTML = `
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

  const travelModes = ["DRIVING", "TRANSIT", "BICYCLING", "WALKING"];
  const alternatives = [];

  try {
    for (const mode of travelModes) {
      const request = {
        origin: origin,
        destination: destination,
        travelMode: mode,
      };

      const response = await new Promise((resolve) => {
        directionsService.route(request, (response, status) => {
          if (status === "OK") {
            resolve(response);
          } else {
            resolve(null);
          }
        });
      });

      if (response) {
        const route = response.routes[0];
        const distance = route.legs[0].distance.value / 1000;
        const duration = route.legs[0].duration.text;
        const emissions = (distance * CARBON_EMISSIONS[mode]).toFixed(2);

        alternatives.push({
          mode: mode,
          distance: distance.toFixed(2),
          duration: duration,
          emissions: emissions,
        });
      }
    }

    alternativesInfoDiv.innerHTML = alternatives
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
  } catch (error) {
    alternativesInfoDiv.innerHTML =
      '<div class="error">Error calculating alternatives.</div>';
    console.error("Alternatives calculation error:", error);
  }
}

async function fetchWeather(lat, lng) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }
  return await response.json();
}

function loadScript() {
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
  script.defer = true;
  script.async = true;
  document.head.appendChild(script);
}

loadScript();
