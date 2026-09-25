<script setup lang="ts"></script>

<template>
  <div class="header-actions">
    <button class="profile-button" aria-label="Open profile"><span>LK</span><i></i></button>
  </div>
</template>

<style scoped>
.header-actions { display: flex; align-items: center; gap: 15px; margin-left: auto; }
.profile-button { display: grid; place-items: center; position: relative; width: 42px; height: 42px; border-radius: 50%; background: #d2a47c; color: #fff; font-size: 11px; font-weight: 700; box-shadow: 0 8px 20px rgba(40,70,51,.08); }
.profile-button i { position: absolute; right: -1px; bottom: 0; width: 9px; height: 9px; border: 2px solid #f5fbf5; border-radius: 50%; background: #7aac72; }

@media (max-width: 680px) {
  .profile-button { flex: 0 0 38px; width: 38px; height: 38px; }
}
</style>
