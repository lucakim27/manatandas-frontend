<script setup lang="ts"></script>

<template>
  <div class="header-actions">
    <button class="icon-button notification" aria-label="Notifications">
      <svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"></path></svg>
    </button>
    <button class="profile-button" aria-label="Open profile"><span>LK</span><i></i></button>
  </div>
</template>

<style scoped>
.header-actions { display: flex; align-items: center; gap: 15px; margin-left: auto; }
.icon-button, .profile-button { display: grid; place-items: center; background: rgba(250,254,250,.7); box-shadow: 0 8px 20px rgba(40,70,51,.08); }
.icon-button { width: 42px; height: 42px; border: 1px solid rgba(255,255,255,.8); border-radius: 13px; }
.icon-button svg { width: 19px; fill: none; stroke: #3b594a; stroke-width: 1.6; stroke-linecap: round; }
.profile-button { position: relative; width: 42px; height: 42px; border-radius: 50%; background: #d2a47c; color: #fff; font-size: 11px; font-weight: 700; }
.profile-button i { position: absolute; right: -1px; bottom: 0; width: 9px; height: 9px; border: 2px solid #f5fbf5; border-radius: 50%; background: #7aac72; }

@media (max-width: 680px) {
  .notification { display: none; }
  .profile-button { flex: 0 0 38px; width: 38px; height: 38px; }
}
</style>
