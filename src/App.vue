<script setup lang="ts">
import { ref } from 'vue'
import MapView from './components/MapView.vue'

const activeMode = ref<'explore' | 'saved'>('explore')
const search = ref('')
const mapView = ref<InstanceType<typeof MapView> | null>(null)

function zoomIn() {
  mapView.value?.zoomIn()
}

function zoomOut() {
  mapView.value?.zoomOut()
}

function resetMap() {
  mapView.value?.reset()
}

function locateMe() {
  mapView.value?.locateMe()
}

const isSearching = ref(false)
const searchError = ref('')
const suggestions = ref<{ label: string; lat: number; lon: number }[]>([])
let searchDebounce: ReturnType<typeof setTimeout> | undefined

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

async function fetchSuggestions(query: string) {
  isSearching.value = true
  searchError.value = ''

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=my&accept-language=en&q=${encodeURIComponent(query)}`
    const response = await fetch(url)
    const results: NominatimResult[] = await response.json()

    const seen = new Set<string>()
    suggestions.value = results
      .map((r) => ({
        label: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
      }))
      .filter((place) => {
        if (seen.has(place.label)) return false
        seen.add(place.label)
        return true
      })

    if (!suggestions.value.length) {
      searchError.value = 'No matching place found in Malaysia'
    }
  } catch {
    searchError.value = 'Search failed — try again'
    suggestions.value = []
  } finally {
    isSearching.value = false
  }
}

function onSearchInput() {
  searchError.value = ''
  const query = search.value.trim()

  clearTimeout(searchDebounce)

  if (query.length < 3) {
    suggestions.value = []
    return
  }

  searchDebounce = setTimeout(() => fetchSuggestions(query), 400)
}

function selectSuggestion(place: { label: string; lat: number; lon: number }) {
  search.value = place.label
  suggestions.value = []
  mapView.value?.flyTo(place.lat, place.lon)
}

function searchPlace() {
  if (suggestions.value.length) {
    selectSuggestion(suggestions.value[0])
  }
}

function clearSearch() {
  search.value = ''
  searchError.value = ''
  suggestions.value = []
}
</script>

<template>
  <main class="map-app">
    <MapView ref="mapView" />

    <header class="topbar">
      <a class="brand" href="#" aria-label="Maat home">
        <span class="brand-mark">m</span>
        <span>maat</span>
      </a>

      <div class="search-wrap">
        <div class="search-shell">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.7"></circle><path d="m16 16 4.2 4.2"></path></svg>
          <input
            v-model="search"
            type="text"
            placeholder="Search Malaysian toilets or locations"
            aria-label="Search the map"
            @input="onSearchInput"
            @keyup.enter="searchPlace"
          />
          <button v-if="search" class="clear-search" aria-label="Clear search" @click="clearSearch">×</button>
          <span v-else class="search-key">⌘ K</span>
        </div>

        <ul v-if="suggestions.length" class="search-suggestions glass-panel">
          <li v-for="place in suggestions" :key="place.label">
            <button type="button" @click="selectSuggestion(place)">{{ place.label }}</button>
          </li>
        </ul>
        <p v-else-if="searchError" class="search-feedback">{{ searchError }}</p>
        <p v-else-if="isSearching" class="search-feedback">Searching…</p>
      </div>

      <div class="header-actions">
        <button class="icon-button notification" aria-label="Notifications">
          <svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"></path></svg>
        </button>
        <button class="profile-button" aria-label="Open profile"><span>LK</span><i></i></button>
      </div>
    </header>

    <nav class="left-rail glass-panel" aria-label="Map modes">
      <button :class="{ active: activeMode === 'explore' }" @click="activeMode = 'explore'">
        <svg viewBox="0 0 24 24"><path d="m4 19 6-3 5 3 5-3V5l-5 3-5-3-6 3zM10 5v11M15 8v11"></path></svg>
        <span>Explore</span>
      </button>
      <button :class="{ active: activeMode === 'saved' }" @click="activeMode = 'saved'">
        <svg viewBox="0 0 24 24"><path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3.5L6 21z"></path></svg>
        <span>Saved</span>
      </button>
      <span class="rail-divider"></span>
      <button @click="resetMap">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 10.8v5.3M12 7.5h.01"></path></svg>
        <span>Reset</span>
      </button>
    </nav>

    <section class="map-toolbar">
      <button class="location-button glass-panel" aria-label="Center on my location" @click="locateMe">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path></svg>
      </button>
      <div class="zoom-controls glass-panel">
        <button aria-label="Zoom in" @click="zoomIn">+</button>
        <span></span>
        <button aria-label="Zoom out" @click="zoomOut">−</button>
      </div>
    </section>

    <div class="map-attribution">© maat toilet maps <span>·</span> Malaysia</div>
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;1,500&display=swap');

:root { font-family: 'DM Sans', sans-serif; color: #24332c; background: #dbe6dd; font-synthesis: none; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; }
button, input { font: inherit; }
button { border: 0; cursor: pointer; }
.map-app { position: relative; min-height: 100vh; overflow: hidden; background: #dce6db; isolation: isolate; }
.glass-panel { border: 1px solid rgba(255,255,255,.72); background: rgba(251,255,251,.72); box-shadow: 0 10px 30px rgba(50,80,62,.09), inset 0 1px 0 rgba(255,255,255,.75); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.topbar { position: absolute; z-index: 5; display: flex; align-items: center; gap: clamp(18px, 4vw, 68px); top: 25px; right: 34px; left: 34px; }
.brand { display: flex; align-items: center; gap: 9px; color: #263b30; text-decoration: none; font-size: 20px; font-weight: 700; letter-spacing: -.06em; }.brand-mark { display: grid; place-items: center; width: 29px; height: 29px; border-radius: 9px; background: #263b30; color: #e8f1e7; font: italic 21px Georgia; }
.search-shell { display: flex; align-items: center; width: min(515px, 58vw); height: 52px; padding: 0 17px; border: 1px solid rgba(255,255,255,.86); border-radius: 17px; background: rgba(250,254,250,.86); box-shadow: 0 12px 35px rgba(40,70,51,.12), inset 0 1px 0 white; backdrop-filter: blur(20px); }.search-shell svg { width: 19px; margin-right: 12px; fill: none; stroke: #527064; stroke-linecap: round; stroke-width: 1.8; }.search-shell input { min-width: 0; flex: 1; border: 0; outline: 0; color: #263b30; background: transparent; font-size: 13px; }.search-shell input::placeholder { color: #789083; }.search-key { padding: 4px 7px; border: 1px solid #d3dfd5; border-radius: 6px; color: #91a198; font: 10px 'DM Mono'; }.clear-search { color: #789083; background: transparent; font-size: 20px; }
.search-wrap { position: relative; width: min(515px, 58vw); }
.search-wrap .search-shell { width: 100%; }
.search-feedback { position: absolute; top: calc(100% + 8px); left: 4px; margin: 0; padding: 6px 12px; border-radius: 10px; color: #4a6355; background: rgba(251,255,251,.92); box-shadow: 0 8px 20px rgba(40,70,51,.1); font-size: 11px; white-space: nowrap; }
.search-suggestions { position: absolute; z-index: 6; top: calc(100% + 8px); left: 0; width: 100%; margin: 0; padding: 6px; list-style: none; border-radius: 15px; max-height: 260px; overflow-y: auto; }
.search-suggestions li { display: block; }
.search-suggestions button { display: block; width: 100%; padding: 10px 12px; border-radius: 10px; color: #2c4537; background: transparent; text-align: left; font-size: 12px; line-height: 1.35; white-space: normal; }
.search-suggestions button:hover { background: rgba(212,229,215,.7); }
.header-actions { display: flex; align-items: center; gap: 15px; margin-left: auto; }.icon-button, .profile-button { display: grid; place-items: center; background: rgba(250,254,250,.7); box-shadow: 0 8px 20px rgba(40,70,51,.08); }.icon-button { width: 42px; height: 42px; border: 1px solid rgba(255,255,255,.8); border-radius: 13px; }.icon-button svg { width: 19px; fill: none; stroke: #3b594a; stroke-width: 1.6; stroke-linecap: round; }.profile-button { position: relative; width: 42px; height: 42px; border-radius: 50%; background: #d2a47c; color: #fff; font-size: 11px; font-weight: 700; }.profile-button i { position: absolute; right: -1px; bottom: 0; width: 9px; height: 9px; border: 2px solid #f5fbf5; border-radius: 50%; background: #7aac72; }
.left-rail { position: absolute; z-index: 5; top: 50%; left: 34px; display: flex; flex-direction: column; gap: 5px; width: 73px; padding: 10px 8px; border-radius: 19px; transform: translateY(-50%); }.left-rail button { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 3px; border-radius: 12px; color: #779084; background: transparent; font-size: 10px; }.left-rail button:hover, .left-rail button.active { color: #263e32; background: rgba(212,229,215,.7); }.left-rail svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.6; }.rail-divider { height: 1px; margin: 3px 7px; background: #dbe6dc; }
.map-toolbar { position: absolute; z-index: 4; right: 34px; bottom: 34px; display: flex; flex-direction: column; gap: 10px; }.location-button { display: grid; place-items: center; width: 43px; height: 43px; border-radius: 13px; color: #3c6651; }.location-button svg { width: 20px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.7; }.zoom-controls { display: flex; flex-direction: column; align-items: center; padding: 5px 0; border-radius: 13px; }.zoom-controls button { width: 41px; height: 34px; color: #355846; background: transparent; font-size: 21px; font-weight: 400; }.zoom-controls span { width: 23px; height: 1px; background: #d7e2d8; }
.map-filters { position: absolute; z-index: 4; top: 101px; left: 50%; display: flex; gap: 8px; transform: translateX(-50%); }.filter-chip { padding: 9px 15px; border-radius: 99px; color: #496958; font-size: 11px; white-space: nowrap; }.filter-chip:hover { background: #fff; }.muted-chip { display: flex; align-items: center; gap: 7px; }.muted-chip svg { width: 14px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.7; }
.place-card { position: absolute; z-index: 4; bottom: 31px; left: 34px; display: flex; width: min(430px, calc(100vw - 68px)); min-height: 164px; overflow: hidden; border-radius: 21px; transition: transform .25s ease; }.place-card:hover { transform: translateY(-3px); }.place-visual { position: relative; width: 119px; flex: 0 0 119px; overflow: hidden; background: linear-gradient(145deg,#b5cfbb,#6e9e83 55%,#c8a77f); }.photo-glow { position: absolute; width: 110px; height: 110px; top: 33px; left: -8px; border-radius: 45% 55% 50% 50%; background: radial-gradient(circle at 42% 35%,#f5dcab 0 8%,#b9794c 9% 17%,#d5ac72 18% 32%,#557b62 33% 52%,transparent 53%); transform: rotate(-20deg); }.photo-badge { position: absolute; top: 12px; left: 11px; padding: 4px 6px; border-radius: 5px; color: #315540; background: rgba(239,251,237,.8); font: 8px 'DM Mono'; letter-spacing: .08em; }.place-content { padding: 19px 18px 15px; }.eyebrow { margin-bottom: 7px; color: #739080; font: 9px 'DM Mono'; letter-spacing: .08em; }.place-content h1 { margin: 0 0 6px; color: #2c4537; font-size: 20px; font-weight: 600; letter-spacing: -.04em; }.place-content h1 em { font-family: 'Playfair Display', serif; font-weight: 500; }.place-content p { max-width: 245px; margin: 0 0 11px; color: #668072; font-size: 11px; line-height: 1.4; }.place-meta { display: flex; gap: 10px; color: #86a094; font-size: 10px; }.rating { color: #bc804f; }.details-button { margin-top: 12px; padding: 0; color: #365e49; background: transparent; font-size: 11px; font-weight: 600; }.details-button span { margin-left: 4px; font-size: 14px; }.save-place { position: absolute; top: 13px; right: 14px; color: #537461; background: transparent; font-size: 22px; line-height: 1; }.map-attribution { position: absolute; z-index: 4; right: 34px; bottom: 20px; color: #729080; font: 9px 'DM Mono'; }.map-attribution span { margin: 0 4px; color: #a0b4a6; }.map-attribution a { color: inherit; }
@media (max-width: 680px) { .topbar { top: 16px; right: 16px; left: 16px; gap: 12px; }.brand { font-size: 17px; }.brand-mark { width: 26px; height: 26px; }.search-shell { width: auto; flex: 1; height: 47px; padding: 0 12px; }.search-shell input { font-size: 12px; }.search-key, .notification { display: none; }.profile-button { flex: 0 0 38px; width: 38px; height: 38px; }.left-rail { top: auto; bottom: 16px; left: 16px; width: auto; flex-direction: row; padding: 5px; transform: none; }.left-rail button { flex-direction: row; padding: 7px 9px; }.left-rail .rail-divider { width: 1px; height: 21px; margin: 5px 2px; }.map-toolbar { right: 16px; bottom: 16px; }.map-attribution { display: none; } }
</style>
