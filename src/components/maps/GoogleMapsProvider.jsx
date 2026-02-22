import { useJsApiLoader } from './googleMapsShim';

const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };
const LIBRARIES = ['places'];

export default function GoogleMapsProvider({ children }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-base-300 bg-base-200 p-6 text-center text-base-content/70">
        <p>Set VITE_GOOGLE_MAPS_API_KEY in .env to enable maps.</p>
        {children}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center text-error">
        <p>Failed to load Google Maps. Check your API key and console.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-base-300 bg-base-200 p-8">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <span className="ml-3 text-base-content/70">Loading map...</span>
      </div>
    );
  }

  return children;
}

export { DEFAULT_CENTER };
