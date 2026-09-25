<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Bathroom {
  id: number
  latitude: number
  longitude: number
  name: string
  address: string | null
  accessType: 'PUBLIC' | 'CUSTOMERS_ONLY' | 'PRIVATE' | 'UNKNOWN'
  isPaid: boolean | null
  isAccessible: boolean | null
  rating: number | null
  source: 'USER' | 'OSM' | 'GOOGLE_PLACES' | 'PETROL_STATION' | 'GOVERNMENT' | 'PLUS_RR'
}

const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let userMarker: L.Marker | null = null

// Bounding box around Malaysia (covers Peninsular + East Malaysia)
const MY_BOUNDS = L.latLngBounds(
  L.latLng(0.5, 99.0),
  L.latLng(7.5, 119.5),
)

const bathroomIcon = L.divIcon({
  className: 'bathroom-pin',
  html: '<span class="bathroom-pin-dot"></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -30],
})

const userLocationIcon = L.divIcon({
  className: 'user-location-pin',
  html: '<span class="user-location-dot"></span><span class="user-location-ring"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function zoomIn() {
  map?.zoomIn()
}

function zoomOut() {
  map?.zoomOut()
}

function reset() {
  map?.fitBounds(MY_BOUNDS)
}

// Flies the map to an arbitrary coordinate, e.g. from a place search result
function flyTo(lat: number, lng: number, zoom = 16) {
  map?.flyTo([lat, lng], zoom)
}

// Asks the browser for the user's current location (triggers the permission
// prompt) and centers the map there if it falls within Malaysia.
function locateMe() {
  if (!map || !('geolocation' in navigator)) return

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      const latlng = L.latLng(latitude, longitude)

      if (!userMarker) {
        userMarker = L.marker(latlng, { icon: userLocationIcon }).addTo(map as L.Map)
      } else {
        userMarker.setLatLng(latlng)
      }

      // Only recenter on it if it's actually inside Malaysia's bounds
      if (MY_BOUNDS.contains(latlng)) {
        map?.setView(latlng, 17)
      }
    },
    (error) => {
      // Permission denied or unavailable — keep the default Malaysia view
      console.warn('Location access unavailable:', error.message)
    },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}

// Fetches bathrooms from the backend and drops a marker for each.
async function loadBathrooms() {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (!apiBase || !map) return

  try {
    const response = await fetch(`${apiBase}/api/bathrooms`)
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)

    const bathrooms: Bathroom[] = await response.json()

    bathrooms.forEach((b) => {
      L.marker([b.latitude, b.longitude], { icon: bathroomIcon })
        .addTo(map as L.Map)
        .bindPopup(b.name)
    })
  } catch (error) {
    // Backend not running / unreachable — map still works, just without pins
    console.warn('Could not load bathrooms from the backend:', error)
  }
}

defineExpose({ zoomIn, zoomOut, reset, locateMe, flyTo })

onMounted(() => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    maxBounds: MY_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 6,
    maxZoom: 20,
    zoomControl: false,
    attributionControl: false,
  }).fitBounds(MY_BOUNDS)

  const cartoKey = import.meta.env.VITE_CARTO_API_KEY as string | undefined
  const tileUrl = cartoKey
    ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  L.tileLayer(tileUrl, {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: cartoKey ? '' : 'abc',
    maxZoom: 20,
  }).addTo(map)

  // Load real bathroom pins from the backend
  loadBathrooms()

  // Ask for location permission once the map is ready
  locateMe()
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div ref="mapContainer" class="leaflet-root" />
</template>

<style>
.leaflet-root {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.bathroom-pin {
  display: grid;
  place-items: center;
}

.bathroom-pin-dot {
  display: block;
  width: 24px;
  height: 24px;
  border: 5px solid rgba(255, 255, 255, 0.85);
  border-radius: 50% 50% 50% 0;
  background: #dc7359;
  box-shadow: 0 5px 12px rgba(45, 91, 67, 0.25);
  transform: rotate(-45deg);
}

.user-location-pin {
  position: relative;
  display: grid;
  place-items: center;
}

.user-location-dot {
  position: relative;
  z-index: 1;
  display: block;
  width: 14px;
  height: 14px;
  border: 3px solid #fff;
  border-radius: 50%;
  background: #2f6fed;
  box-shadow: 0 2px 8px rgba(20, 40, 90, 0.35);
}

.user-location-ring {
  position: absolute;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(47, 111, 237, 0.25);
  animation: user-location-pulse 2s ease-out infinite;
}

@keyframes user-location-pulse {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(1.8); opacity: 0; }
}
</style>
