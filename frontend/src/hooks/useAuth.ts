import type { UserProfile } from '../types/pos'

// Auth mock — remplacé par Firebase Auth quand le backend est branché
export function useAuth(): { user: UserProfile | null; loading: boolean; logout: () => Promise<void> } {
  return {
    user: {
      uid:         'admin-001',
      displayName: 'Admin Tata',
      email:       'admin@poissonnerie-tata.com',
      role:        'gerant',
    },
    loading: false,
    logout: async () => {},
  }
}
