// Loads the Google Maps JavaScript API once and caches the promise, so
// multiple components (currently just RadarMap) can request it without
// injecting the <script> tag more than once.
let loadPromise: Promise<any> | null = null;

declare global {
  interface Window {
    google?: any;
    __culinaryQuestMapsInit?: () => void;
  }
}

export function loadGoogleMaps(apiKey: string): Promise<any> {
  if (typeof window !== "undefined" && window.google?.maps) {
    return Promise.resolve(window.google);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    window.__culinaryQuestMapsInit = () => {
      resolve(window.google);
      delete window.__culinaryQuestMapsInit;
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&loading=async&callback=__culinaryQuestMapsInit`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Google Maps JavaScript API"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
