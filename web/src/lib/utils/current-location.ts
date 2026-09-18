export interface BrowserLocation {
  latitude: number
  longitude: number
  accuracyMeters: number
}

export const getCurrentBrowserLocation = () =>
  new Promise<BrowserLocation>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is unavailable'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters: coords.accuracy,
        })
      },
      reject,
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  })
