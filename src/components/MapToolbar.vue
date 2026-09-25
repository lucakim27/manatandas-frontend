<script setup lang="ts">
defineEmits<{
  locate: []
  zoomIn: []
  zoomOut: []
}>()
</script>

<template>
  <section class="map-toolbar">
    <button class="location-button glass-panel" aria-label="Center on my location" @click="$emit('locate')">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path></svg>
    </button>
    <div class="zoom-controls glass-panel">
      <button aria-label="Zoom in" @click="$emit('zoomIn')">+</button>
      <span></span>
      <button aria-label="Zoom out" @click="$emit('zoomOut')">−</button>
    </div>
  </section>
</template>

<style scoped>
.map-toolbar { position: absolute; z-index: 4; right: 34px; bottom: 34px; display: flex; flex-direction: column; gap: 10px; }
.location-button { display: grid; place-items: center; width: 43px; height: 43px; border-radius: 13px; color: #3c6651; }
.location-button svg { width: 20px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.7; }
.zoom-controls { display: flex; flex-direction: column; align-items: center; padding: 5px 0; border-radius: 13px; }
.zoom-controls button { width: 41px; height: 34px; color: #355846; background: transparent; font-size: 21px; font-weight: 400; }
.zoom-controls span { width: 23px; height: 1px; background: #d7e2d8; }

@media (max-width: 680px) {
  .map-toolbar { right: 16px; bottom: 16px; }
}
</style>
