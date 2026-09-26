<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../../composables/useAuth'
import { useProfileModal } from '../../composables/useProfileModal'

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
let bathroomLayer: L.LayerGroup | null = null
let currentMode: 'explore' | 'saved' = 'explore'
const { state, fetchOpts } = useAuth()
const { open: openProfileModal } = useProfileModal()
const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined

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

const savedBathroomIcon = L.divIcon({
  className: 'bathroom-pin',
  html: '<span class="bathroom-pin-dot bathroom-pin-dot-saved"></span>',
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
// mode 'explore' loads every public bathroom; 'saved' loads only the
// current user's bookmarks (requires a valid session cookie — enforced by
// the backend, not just this check).
async function loadBathrooms(mode: 'explore' | 'saved' = 'explore') {
  if (!API_BASE || !map || !bathroomLayer) return

  const path = mode === 'saved' ? '/api/bathrooms/saved' : '/api/bathrooms'

  try {
    const response = await fetch(`${API_BASE}${path}`, fetchOpts)
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)

    const bathrooms: Bathroom[] = await response.json()

    let savedBathroomIds = new Set<number>()
    if (mode === 'saved') {
      savedBathroomIds = new Set(bathrooms.map((bathroom) => bathroom.id))
    } else if (state.user && !state.isChecking) {
      try {
        const savedResponse = await fetch(`${API_BASE}/api/bathrooms/saved`, fetchOpts)
        if (!savedResponse.ok) throw new Error(`Request failed: ${savedResponse.status}`)
        const savedBathrooms: Bathroom[] = await savedResponse.json()
        savedBathroomIds = new Set(savedBathrooms.map((bathroom) => bathroom.id))
      } catch (error) {
        // Keep Explore usable if the saved list cannot be loaded. The save
        // action still reports its own result when the user clicks it.
        console.warn('Could not load saved bathroom status:', error)
      }
    }

    bathroomLayer.clearLayers()
    bathrooms.forEach((b) => {
      let isSaved = savedBathroomIds.has(b.id)
      const marker = L.marker([b.latitude, b.longitude], {
        icon: mode === 'explore' && isSaved ? savedBathroomIcon : bathroomIcon,
      })
        .addTo(bathroomLayer as L.LayerGroup)

      // Build popup content with DOM nodes so bathroom names and addresses
      // are rendered as text rather than interpreted as HTML.
      const popup = document.createElement('div')
      popup.className = 'bathroom-popup'

      const title = document.createElement('strong')
      title.className = 'bathroom-popup-title'
      title.textContent = b.name
      popup.append(title)

      if (b.address) {
        const address = document.createElement('span')
        address.className = 'bathroom-popup-address'
        address.textContent = b.address
        popup.append(address)
      }

      const action = document.createElement('button')
      action.className = 'bathroom-popup-action'
      action.type = 'button'
      action.textContent = isSaved ? 'Remove from saved' : 'Save bathroom'

      action.addEventListener('click', async () => {
        if (state.isChecking) return
        if (!state.user) {
          openProfileModal()
          return
        }
        if (!API_BASE) return

        action.disabled = true
        action.textContent = isSaved ? 'Removing…' : 'Saving…'
        try {
          const response = await fetch(`${API_BASE}/api/bathrooms/${b.id}/save`, {
            ...fetchOpts,
            method: isSaved ? 'DELETE' : 'POST',
          })
          if (!response.ok) throw new Error(`Request failed: ${response.status}`)

          isSaved = !isSaved
          if (mode === 'explore') {
            marker.setIcon(isSaved ? savedBathroomIcon : bathroomIcon)
          }
          if (mode === 'saved' && !isSaved) {
            marker.closePopup()
            await loadBathrooms('saved')
          } else {
            action.textContent = isSaved ? 'Remove from saved' : 'Save bathroom'
            action.disabled = false
          }
        } catch (error) {
          console.warn('Could not update saved bathroom:', error)
          action.textContent = 'Try again'
          action.disabled = false
        }
      })
      popup.append(action)

      marker.bindPopup(popup)
    })
  } catch (error) {
    // Backend unreachable, or (for 'saved') the session expired — map still
    // works, just without pins for this mode.
    console.warn('Could not load bathrooms from the backend:', error)
  }
}

// Called by App.vue when the Explore/Saved toggle changes.
function setMode(mode: 'explore' | 'saved') {
  currentMode = mode
  loadBathrooms(mode)
}

// The first Explore request can finish before the initial session check.
// Reload it when sign-in changes so every popup has the user's saved state.
watch(
  () => state.user?.id,
  () => {
    if (currentMode === 'explore') loadBathrooms('explore')
  },
)

defineExpose({ zoomIn, zoomOut, reset, locateMe, flyTo, setMode })

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

  // Layer group for bathroom pins, so switching Explore/Saved can clear and
  // repopulate without touching other map layers (tiles, user location).
  bathroomLayer = L.layerGroup().addTo(map)

  // Load real bathroom pins from the backend (Explore mode by default)
  loadBathrooms('explore')

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

.bathroom-pin-dot-saved { background: #4b8a62; }

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

.bathroom-popup { display: flex; flex-direction: column; gap: 7px; min-width: 150px; color: #24332c; }
.bathroom-popup-title { font-size: 13px; }
.bathroom-popup-address { color: #718378; font-size: 11px; line-height: 1.35; }
.bathroom-popup-action { align-self: flex-start; margin-top: 3px; padding: 7px 10px; border-radius: 8px; color: #fff; background: #426e55; font-size: 11px; }
.bathroom-popup-action:hover:not(:disabled) { background: #315a43; }
.bathroom-popup-action:disabled { cursor: default; opacity: .65; }

@keyframes user-location-pulse {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(1.8); opacity: 0; }
}
</style>
