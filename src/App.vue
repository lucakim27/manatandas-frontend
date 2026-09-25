<script setup lang="ts">
import { ref } from 'vue'
import MapView from './components/MapView.vue'
import SearchBar from './components/SearchBar.vue'
import HeaderActions from './components/HeaderActions.vue'
import LeftRail from './components/LeftRail.vue'
import MapToolbar from './components/MapToolbar.vue'

const activeMode = ref<'explore' | 'saved'>('explore')
const mapView = ref<InstanceType<typeof MapView> | null>(null)

function handlePlaceSelected({ lat, lon }: { lat: number; lon: number }) {
  mapView.value?.flyTo(lat, lon)
}
</script>

<template>
  <main class="map-app">
    <MapView ref="mapView" />

    <header class="topbar">
      <SearchBar @select="handlePlaceSelected" />
      <HeaderActions />
    </header>

    <LeftRail v-model="activeMode" />

    <MapToolbar
      @locate="mapView?.locateMe()"
      @zoom-in="mapView?.zoomIn()"
      @zoom-out="mapView?.zoomOut()"
    />

    <div class="map-attribution">© mana tandas maps <span>·</span> Malaysia</div>
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

/* Shared frosted-glass utility, used by SearchBar, LeftRail, MapToolbar, HeaderActions */
.glass-panel { border: 1px solid rgba(255,255,255,.72); background: rgba(251,255,251,.72); box-shadow: 0 10px 30px rgba(50,80,62,.09), inset 0 1px 0 rgba(255,255,255,.75); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }

.topbar { position: absolute; z-index: 5; display: flex; align-items: center; gap: clamp(18px, 4vw, 68px); top: 25px; right: 34px; left: 34px; }

.map-attribution { position: absolute; z-index: 4; right: 34px; bottom: 20px; color: #729080; font: 9px 'DM Mono'; }
.map-attribution span { margin: 0 4px; color: #a0b4a6; }
.map-attribution a { color: inherit; }

@media (max-width: 680px) {
  .topbar { top: 16px; right: 16px; left: 16px; gap: 12px; }
  .map-attribution { display: none; }
}
</style>
