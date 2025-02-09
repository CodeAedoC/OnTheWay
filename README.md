# On The Way

## Overview
"On The Way" is a simple and smart web app designed to help you plan your journey efficiently. It not only finds the best route but also gives you live weather updates along the way and estimates the carbon footprint for different travel modes. We use Google Maps, OpenWeatherMap, and carbon emission data to bring you an insightful travel experience.

## Features
- **Interactive Map**: Easily find the best route based on your input.
- **Live Weather Updates**: Get real-time weather forecasts along your journey.
- **Carbon Footprint Calculator**: See the environmental impact of your travel choices.
- **Alternative Routes**: Discover eco-friendly travel options.

## Technologies Used
- **Frontend**: HTML, CSS (with customizable variables), JavaScript
- **Backend**: Node.js (for future scalability)
- **APIs**:
  - Google Maps API (for navigation and geolocation)
  - OpenWeatherMap API (for weather updates)
  - Custom carbon emission data

## Getting Started
### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/on-the-way.git
cd on-the-way
```

### 2. Set Up API Keys
Rename `config.sample.js` to `config.js` and add your API keys:
```js
const CONFIG = {
  GOOGLE_MAPS_API_KEY: "YOUR_GOOGLE_MAPS_API_KEY",
  OPENWEATHERMAP_API_KEY: "YOUR_OPENWEATHERMAP_API_KEY"
};
```

### 3. Launch the App
Open `index.html` in your browser. 

## How to Use
1. Enter your starting location and destination.
2. Choose a travel mode (Driving, Walking, Cycling, or Transit).
3. View your route along with weather updates and carbon footprint details.
4. Open the sidebar for additional insights and alternative routes.


