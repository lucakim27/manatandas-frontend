<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'
import DefaultAvatar from '../ui/DefaultAvatar.vue'

const emit = defineEmits<{ close: [] }>()

const { state, loginWithGoogleIdToken, logout } = useAuth()

const googleButtonEl = ref<HTMLElement | null>(null)
const errorMessage = ref('')
const isSigningIn = ref(false)

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

async function handleCredential(response: { credential: string }) {
  isSigningIn.value = true
  errorMessage.value = ''
  try {
    await loginWithGoogleIdToken(response.credential)
  } catch {
    errorMessage.value = 'Sign-in failed — please try again.'
  } finally {
    isSigningIn.value = false
  }
}

onMounted(async () => {
  if (state.user || !window.google) return

  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: handleCredential,
  })

  await nextTick()
  if (googleButtonEl.value) {
    window.google.accounts.id.renderButton(googleButtonEl.value, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      width: 280,
    })
  }
})

function handleLogout() {
  logout()
  emit('close')
}
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal glass-panel">
      <button class="close-btn" aria-label="Close" @click="$emit('close')">×</button>

      <template v-if="state.user">
        <div class="profile-header">
          <div class="avatar-lg avatar-fallback">
            <DefaultAvatar :size="28" />
          </div>
          <div>
            <h2>{{ state.user.displayName ?? 'Explorer' }}</h2>
            <p class="email">{{ state.user.email }}</p>
          </div>
        </div>

        <button class="logout-btn" @click="handleLogout">Log out</button>
      </template>

      <template v-else>
        <h2>Sign in to mana tandas</h2>
        <p class="sub">Save your favorite bathrooms and add new ones to the map.</p>

        <div ref="googleButtonEl" class="google-btn-slot" />
        <p v-if="isSigningIn" class="status">Signing you in…</p>
        <p v-if="errorMessage" class="status error">{{ errorMessage }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 90px 34px 0 0;
  background: rgba(36, 51, 44, 0.25);
}
.modal {
  position: relative;
  width: min(340px, calc(100vw - 40px));
  padding: 28px 26px;
  border-radius: 20px;
}
.close-btn {
  position: absolute;
  top: 14px;
  right: 16px;
  background: transparent;
  color: #789083;
  font-size: 22px;
  line-height: 1;
}
h2 {
  margin: 0 0 4px;
  font-size: 17px;
  color: #24332c;
}
.sub {
  margin: 0 0 20px;
  color: #5d7669;
  font-size: 12.5px;
  line-height: 1.5;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}
.avatar-lg {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.avatar-fallback {
  display: grid;
  place-items: center;
  background: #8fa596;
  color: #fff;
}
.email {
  margin: 2px 0 0;
  font-size: 12px;
  color: #5d7669;
}
.google-btn-slot {
  display: flex;
  justify-content: center;
  min-height: 44px;
}
.status {
  margin: 12px 0 0;
  font-size: 12px;
  text-align: center;
  color: #5d7669;
}
.status.error {
  color: #b3462c;
}
.logout-btn {
  width: 100%;
  padding: 11px;
  border-radius: 14px;
  background: rgba(179, 70, 44, 0.1);
  color: #b3462c;
  font-weight: 600;
  font-size: 13px;
}
.logout-btn:hover {
  background: rgba(179, 70, 44, 0.16);
}
</style>
