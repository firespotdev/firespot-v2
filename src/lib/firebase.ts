import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: 'AIzaSyDfKyERVpkcHFGJ4W2e00UsUH3VVUgQzgI',
  authDomain: 'firespotlite.firebaseapp.com',
  projectId: 'firespotlite',
  storageBucket: 'firespotlite.firebasestorage.app',
  messagingSenderId: '200360892614',
  appId: '1:200360892614:web:f14d17b61ab0cfeb549fc7',
  measurementId: 'G-BJ2PJY8F3C',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Messaging service
export const messaging =
  typeof window !== 'undefined' ? getMessaging(app) : null

export const requestForToken = async () => {
  if (
    !messaging ||
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator)
  )
    return null

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      // Explicitly register the service worker
      const registration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
      )

      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
        serviceWorkerRegistration: registration,
      })

      if (currentToken) {
        return currentToken
      } else {
        console.warn(
          'No registration token available. Request permission to generate one.',
        )
        return null
      }
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err)
    return null
  }
}

// Returns an unsubscribe function — persistent, fires for every message
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}
