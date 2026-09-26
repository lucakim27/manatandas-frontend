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
  submittedByUserId: number | null
}

const mapContainer = ref<HTMLDivElement | null>(null)
const emit = defineEmits<{ 'show-explore': [] }>()
let map: L.Map | null = null
let userMarker: L.Marker | null = null
let bathroomLayer: L.LayerGroup | null = null
const bathroomMarkers = new Map<number, L.Marker>()
let currentMode: 'explore' | 'saved' = 'explore'
let bathroomLoadRequest = 0
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

function openMapContextMenu(event: L.LeafletMouseEvent) {
  if (!map || !MY_BOUNDS.contains(event.latlng)) return

  const target = event.originalEvent.target
  if (target instanceof Element && target.closest('.leaflet-marker-icon, .leaflet-popup')) return
  L.DomEvent.preventDefault(event.originalEvent)

  if (state.isChecking) {
    const message = document.createElement('p')
    message.className = 'add-bathroom-message'
    message.textContent = 'Checking your sign-in…'
    L.popup().setLatLng(event.latlng).setContent(message).openOn(map)
    return
  }

  if (!state.user) {
    const content = document.createElement('div')
    content.className = 'add-bathroom-popup'
    const message = document.createElement('p')
    message.textContent = 'Sign in to add a bathroom here.'
    const signInButton = document.createElement('button')
    signInButton.className = 'bathroom-popup-action'
    signInButton.type = 'button'
    signInButton.textContent = 'Sign in'
    signInButton.addEventListener('click', () => {
      map?.closePopup()
      openProfileModal()
    })
    content.append(message, signInButton)
    L.popup().setLatLng(event.latlng).setContent(content).openOn(map)
    return
  }

  openAddBathroomForm(event.latlng)
}

function openAddBathroomForm(location: L.LatLng) {
  if (!map) return

  const form = document.createElement('form')
  form.className = 'add-bathroom-popup'

  const heading = document.createElement('strong')
  heading.textContent = 'Add a bathroom'

  const coordinates = document.createElement('span')
  coordinates.className = 'add-bathroom-coordinates'
  coordinates.textContent = `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`

  const nameLabel = document.createElement('label')
  nameLabel.textContent = 'Bathroom name'
  const nameInput = document.createElement('input')
  nameInput.name = 'name'
  nameInput.type = 'text'
  nameInput.required = true
  nameInput.maxLength = 120
  nameInput.placeholder = 'e.g. Public toilet, KLCC'
  nameLabel.append(nameInput)

  const addressLabel = document.createElement('label')
  addressLabel.textContent = 'Address (optional)'
  const addressInput = document.createElement('input')
  addressInput.name = 'address'
  addressInput.type = 'text'
  addressInput.maxLength = 250
  addressInput.placeholder = 'Street, building, or nearby landmark'
  addressLabel.append(addressInput)

  const status = document.createElement('p')
  status.className = 'add-bathroom-message'
  status.setAttribute('aria-live', 'polite')

  const submit = document.createElement('button')
  submit.className = 'bathroom-popup-action'
  submit.type = 'submit'
  submit.textContent = 'Add bathroom'

  form.append(heading, coordinates, nameLabel, addressLabel, status, submit)
  form.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault()
    if (!API_BASE) {
      status.textContent = 'Bathroom submission is not configured.'
      return
    }

    submit.disabled = true
    submit.textContent = 'Adding…'
    status.textContent = ''
    try {
      const response = await fetch(`${API_BASE}/api/bathrooms`, {
        ...fetchOpts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          latitude: location.lat,
          longitude: location.lng,
          address: addressInput.value.trim() || null,
        }),
      })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          status.textContent = 'Your sign-in may have expired. Please sign in again.'
          openProfileModal()
        } else {
          status.textContent = `Could not add the bathroom (${response.status}). Please try again.`
        }
        return
      }

      const created: Bathroom = await response.json()
      if (currentMode !== 'explore') {
        currentMode = 'explore'
        emit('show-explore')
      }
      map?.closePopup()
      await loadBathrooms('explore')
      const marker = bathroomMarkers.get(created.id)
      if (marker) {
        map?.flyTo([created.latitude, created.longitude], 17)
        marker.openPopup()
      }
    } catch {
      status.textContent = 'Could not reach the server. Check your connection and try again.'
    } finally {
      submit.disabled = false
      submit.textContent = 'Add bathroom'
    }
  })

  L.popup({ minWidth: 230, maxWidth: 280 })
    .setLatLng(location)
    .setContent(form)
    .openOn(map)
  nameInput.focus()
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

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser does not support location access.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Allow location access to find the nearest bathroom.'
          : 'Could not get your location. Please try again.'
        reject(new Error(message))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )
  })
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const deltaLat = radians(lat2 - lat1)
  const deltaLng = radians(lng2 - lng1)
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function findNearestBathroom(lat: number, lng: number): Promise<Bathroom | null> {
  if (!API_BASE) throw new Error('Bathroom search is not configured.')

  let radiusKm = 1
  const maxRadiusKm = 1024
  let nearest: Bathroom | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  const longitudeScale = Math.max(Math.cos(lat * Math.PI / 180), 0.1)

  // Expand the bounding box until the closest result is inside its radius.
  // The backend applies these bounds in SQL, so we avoid downloading the
  // entire bathroom database for this one-tap action.
  while (radiusKm <= maxRadiusKm) {
    const latDelta = radiusKm / 110.574
    const lngDelta = radiusKm / (111.32 * longitudeScale)
    const params = new URLSearchParams({
      minLat: String(lat - latDelta),
      maxLat: String(lat + latDelta),
      minLng: String(lng - lngDelta),
      maxLng: String(lng + lngDelta),
    })
    const response = await fetch(`${API_BASE}/api/bathrooms?${params}`, fetchOpts)
    if (!response.ok) throw new Error('Could not search for nearby bathrooms.')

    const bathrooms: Bathroom[] = await response.json()
    for (const bathroom of bathrooms) {
      if (bathroom.accessType === 'PRIVATE') continue
      if (!Number.isFinite(bathroom.latitude) || !Number.isFinite(bathroom.longitude)) continue

      const distance = distanceKm(lat, lng, bathroom.latitude, bathroom.longitude)
      if (distance < nearestDistance) {
        nearest = bathroom
        nearestDistance = distance
      }
    }

    if (nearest && nearestDistance <= radiusKm) return nearest
    if (radiusKm === maxRadiusKm) break
    radiusKm = Math.min(radiusKm * 2, maxRadiusKm)
  }

  return nearest
}

async function showNearestBathroomPopup() {
  const position = await getCurrentPosition()
  const { latitude, longitude } = position.coords
  const nearest = await findNearestBathroom(latitude, longitude)
  if (!nearest) throw new Error('No nearby non-private bathrooms were found.')

  if (currentMode !== 'explore') {
    currentMode = 'explore'
    emit('show-explore')
    await loadBathrooms('explore')
  }

  let marker = bathroomMarkers.get(nearest.id)
  if (!marker) {
    await loadBathrooms('explore')
    marker = bathroomMarkers.get(nearest.id)
  }
  if (!marker) throw new Error('Found a bathroom, but could not show it on the map.')

  map?.flyTo([nearest.latitude, nearest.longitude], 17)
  marker.openPopup()
}

// Fetches bathrooms from the backend and drops a marker for each.
// mode 'explore' loads every public bathroom; 'saved' loads only the
// current user's bookmarks (requires a valid session cookie — enforced by
// the backend, not just this check).
async function loadBathrooms(mode: 'explore' | 'saved' = 'explore') {
  if (!API_BASE || !map || !bathroomLayer) return
  const requestId = ++bathroomLoadRequest

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

    if (requestId !== bathroomLoadRequest || mode !== currentMode) return

    bathroomLayer.clearLayers()
    bathroomMarkers.clear()
    bathrooms.forEach((b) => {
      let isSaved = savedBathroomIds.has(b.id)
      const marker = L.marker([b.latitude, b.longitude], {
        icon: mode === 'explore' && isSaved ? savedBathroomIcon : bathroomIcon,
      })
        .addTo(bathroomLayer as L.LayerGroup)
      bathroomMarkers.set(b.id, marker)

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

      if (state.user && b.submittedByUserId === state.user.id) {
        const deleteAction = document.createElement('button')
        deleteAction.className = 'bathroom-popup-action bathroom-popup-delete'
        deleteAction.type = 'button'
        deleteAction.textContent = 'Delete bathroom'
        deleteAction.addEventListener('click', async () => {
          if (!API_BASE || !window.confirm('Delete this bathroom for everyone? This also removes all saved bookmarks for it.')) return
          deleteAction.disabled = true
          deleteAction.textContent = 'Deleting…'
          try {
            const response = await fetch(`${API_BASE}/api/bathrooms/${b.id}`, {
              ...fetchOpts,
              method: 'DELETE',
            })
            if (!response.ok) throw new Error(`Request failed: ${response.status}`)
            marker.closePopup()
            await loadBathrooms(mode)
          } catch (error) {
            console.warn('Could not delete bathroom:', error)
            deleteAction.textContent = 'Try again'
            deleteAction.disabled = false
          }
        })
        popup.append(deleteAction)
      }

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
  if (mode === currentMode) return
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

defineExpose({ zoomIn, zoomOut, reset, locateMe, flyTo, setMode, showNearestBathroomPopup })

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
  map.on('contextmenu', openMapContextMenu)

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
.bathroom-popup-delete { background: #a7433e; }
.bathroom-popup-delete:hover:not(:disabled) { background: #873530; }

.add-bathroom-popup { display: flex; flex-direction: column; gap: 9px; min-width: 205px; color: #24332c; }
.add-bathroom-popup > strong { font-size: 14px; }
.add-bathroom-popup > p { margin: 0; color: #76564f; font-size: 11px; }
.add-bathroom-popup label { display: flex; flex-direction: column; gap: 4px; color: #52675b; font-size: 11px; }
.add-bathroom-popup input { width: 100%; padding: 7px 8px; border: 1px solid #d5e0d7; border-radius: 7px; outline: none; color: #24332c; background: #fff; font-size: 12px; }
.add-bathroom-popup input:focus { border-color: #71957d; }
.add-bathroom-coordinates { color: #829187; font: 10px 'DM Mono'; }
.add-bathroom-popup .bathroom-popup-action { align-self: stretch; margin-top: 0; }

@keyframes user-location-pulse {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(1.8); opacity: 0; }
}
</style>
