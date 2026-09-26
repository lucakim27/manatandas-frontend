<script setup lang="ts">
import { useAuth } from '../../composables/useAuth'
import { useProfileModal } from '../../composables/useProfileModal'
import ProfileModal from './ProfileModal.vue'
import DefaultAvatar from '../ui/DefaultAvatar.vue'

const { state } = useAuth()
const { isOpen: showModal, open: openModal, close: closeModal } = useProfileModal()
</script>

<template>
  <div class="header-actions">
    <button
      class="profile-button"
      :class="{ checking: state.isChecking }"
      :aria-label="state.user ? 'Open profile' : 'Sign in'"
      @click="openModal"
    >
      <DefaultAvatar :size="20" />
      <i :class="{ online: state.user }"></i>
    </button>

    <ProfileModal v-if="showModal" @close="closeModal" />
  </div>
</template>

<style scoped>
.header-actions { display: flex; align-items: center; gap: 15px; margin-left: auto; }
.profile-button { display: grid; place-items: center; position: relative; width: 42px; height: 42px; border-radius: 50%; background: #8fa596; color: #fff; box-shadow: 0 8px 20px rgba(40,70,51,.08); overflow: hidden; }
.profile-button.checking { opacity: 0.5; }
.profile-button i { position: absolute; right: -1px; bottom: 0; width: 9px; height: 9px; border: 2px solid #f5fbf5; border-radius: 50%; background: transparent; }
.profile-button i.online { background: #7aac72; }

@media (max-width: 680px) {
  .profile-button { flex: 0 0 38px; width: 38px; height: 38px; }
}
</style>
