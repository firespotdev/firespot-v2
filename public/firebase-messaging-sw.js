importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js')
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js')

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

firebase.initializeApp({
  apiKey: 'AIzaSyDfKyERVpkcHFGJ4W2e00UsUH3VVUgQzgI',
  authDomain: 'firespotlite.firebaseapp.com',
  projectId: 'firespotlite',
  storageBucket: 'firespotlite.firebasestorage.app',
  messagingSenderId: '200360892614',
  appId: '1:200360892614:web:f14d17b61ab0cfeb549fc7',
})

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico',
    data: payload.data,
  }

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions,
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const clickAction = event.notification.data?.click_action || '/'
  const urlToOpen = new URL(clickAction, self.location.origin).href

  const promiseChain = clients
    .matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    .then((windowClients) => {
      let matchingClient = null

      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i]
        if (windowClient.url === urlToOpen) {
          matchingClient = windowClient
          break
        }
      }

      if (matchingClient) {
        return matchingClient.focus()
      } else {
        return clients.openWindow(urlToOpen)
      }
    })

  event.waitUntil(promiseChain)
})
