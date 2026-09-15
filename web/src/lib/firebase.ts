import { initializeApp } from 'firebase/app'
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from 'firebase/messaging'

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

let messagingPromise: Promise<Messaging | null> | null = null

export const getMessagingSafe = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null

  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        const supported = await isSupported()
        if (!supported) return null
        return getMessaging(app)
      } catch (err) {
        console.warn(
          'Firebase messaging is not supported in this browser:',
          err,
        )
        return null
      }
    })()
  }

  return messagingPromise
}

export const requestForToken = async () => {
  if (
    typeof window === 'undefined' ||
    typeof Notification === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return null
  }

  try {
    const msg = await getMessagingSafe()
    if (!msg) return null

    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      // Explicitly register the service worker
      const registration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
      )

      const currentToken = await getToken(msg, {
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

  return null
}

// Returns an unsubscribe function — persistent, fires for every message
export const onForegroundMessage = (callback: (payload: any) => void) => {
  let unsub: (() => void) | null = null
  let disposed = false

  getMessagingSafe()
    .then((msg) => {
      if (msg && !disposed) {
        unsub = onMessage(msg, callback)
      }
    })
    .catch(() => {})

  return () => {
    disposed = true
    unsub?.()
  }
}
