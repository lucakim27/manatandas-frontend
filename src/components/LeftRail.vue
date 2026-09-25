<script setup lang="ts">
const activeMode = defineModel<'explore' | 'saved'>({ required: true })
</script>

<template>
  <nav class="left-rail glass-panel" aria-label="Map modes">
    <button :class="{ active: activeMode === 'explore' }" @click="activeMode = 'explore'">
      <svg viewBox="0 0 24 24"><path d="m4 19 6-3 5 3 5-3V5l-5 3-5-3-6 3zM10 5v11M15 8v11"></path></svg>
      <span>Explore</span>
    </button>
    <button :class="{ active: activeMode === 'saved' }" @click="activeMode = 'saved'">
      <svg viewBox="0 0 24 24"><path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3.5L6 21z"></path></svg>
      <span>Saved</span>
    </button>
  </nav>
</template>

<style scoped>
.left-rail { position: absolute; z-index: 5; top: 50%; left: 34px; display: flex; flex-direction: column; gap: 5px; width: 73px; padding: 10px 8px; border-radius: 19px; transform: translateY(-50%); }
.left-rail button { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 3px; border-radius: 12px; color: #779084; background: transparent; font-size: 10px; }
.left-rail button:hover, .left-rail button.active { color: #263e32; background: rgba(212,229,215,.7); }
.left-rail svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.6; }

@media (max-width: 680px) {
  .left-rail { top: auto; bottom: 16px; left: 16px; width: auto; flex-direction: row; padding: 5px; transform: none; }
  .left-rail button { flex-direction: row; padding: 7px 9px; }
}
</style>
