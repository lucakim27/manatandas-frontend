import { ref } from 'vue'

// Singleton open/closed state for the profile modal, shared across
// components — so ModeToggle can trigger the sign-in prompt (e.g. when a
// logged-out user taps "Saved") without needing to reach into ProfileButton,
// which is where the modal happens to be rendered.
const isOpen = ref(false)

export function useProfileModal() {
  return {
    isOpen,
    open: () => { isOpen.value = true },
    close: () => { isOpen.value = false },
  }
}
