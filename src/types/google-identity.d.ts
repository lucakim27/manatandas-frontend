// Minimal ambient types for Google Identity Services (loaded via the
// <script src="https://accounts.google.com/gsi/client"> tag in index.html).
// Only the bits this project actually uses — not Google's full API surface.

export {}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }): void
          renderButton(
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon'
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              width?: number
            },
          ): void
          disableAutoSelect(): void
        }
      }
    }
  }
}
