<script setup lang="ts">
import { ref } from 'vue'

interface Suggestion {
  label: string
  lat: number
  lon: number
}

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

const emit = defineEmits<{
  select: [place: { lat: number; lon: number }]
}>()

const search = ref('')
const isSearching = ref(false)
const searchError = ref('')
const suggestions = ref<Suggestion[]>([])
let searchDebounce: ReturnType<typeof setTimeout> | undefined

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

function selectSuggestion(place: Suggestion) {
  search.value = place.label
  suggestions.value = []
  emit('select', { lat: place.lat, lon: place.lon })
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
  <div class="search-wrap">
    <div class="search-shell">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.7"></circle><path d="m16 16 4.2 4.2"></path></svg>
      <input
        v-model="search"
        type="text"
        placeholder="Search mana tandas"
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
</template>

<style scoped>
.search-wrap { position: relative; width: min(515px, 58vw); }
.search-shell { display: flex; align-items: center; width: 100%; height: 52px; padding: 0 17px; border: 1px solid rgba(255,255,255,.86); border-radius: 17px; background: rgba(250,254,250,.86); box-shadow: 0 12px 35px rgba(40,70,51,.12), inset 0 1px 0 white; backdrop-filter: blur(20px); }
.search-shell svg { width: 19px; margin-right: 12px; fill: none; stroke: #527064; stroke-linecap: round; stroke-width: 1.8; }
.search-shell input { min-width: 0; flex: 1; border: 0; outline: 0; color: #263b30; background: transparent; font-size: 13px; }
.search-shell input::placeholder { color: #789083; }
.search-key { padding: 4px 7px; border: 1px solid #d3dfd5; border-radius: 6px; color: #91a198; font: 10px 'DM Mono'; }
.clear-search { color: #789083; background: transparent; font-size: 20px; }
.search-feedback { position: absolute; top: calc(100% + 8px); left: 4px; margin: 0; padding: 6px 12px; border-radius: 10px; color: #4a6355; background: rgba(251,255,251,.92); box-shadow: 0 8px 20px rgba(40,70,51,.1); font-size: 11px; white-space: nowrap; }
.search-suggestions { position: absolute; z-index: 6; top: calc(100% + 8px); left: 0; width: 100%; margin: 0; padding: 6px; list-style: none; border-radius: 15px; max-height: 260px; overflow-y: auto; }
.search-suggestions li { display: block; }
.search-suggestions button { display: block; width: 100%; padding: 10px 12px; border-radius: 10px; color: #2c4537; background: transparent; text-align: left; font-size: 12px; line-height: 1.35; white-space: normal; }
.search-suggestions button:hover { background: rgba(212,229,215,.7); }

@media (max-width: 680px) {
  .search-wrap { flex: 1; width: auto; }
  .search-shell { width: auto; height: 47px; padding: 0 12px; }
  .search-shell input { font-size: 12px; }
  .search-key { display: none; }
}
</style>
