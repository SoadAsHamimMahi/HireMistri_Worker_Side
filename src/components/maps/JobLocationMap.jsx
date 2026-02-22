import { useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from './googleMapsShim';

const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };
const MAP_STYLE = { width: '100%', height: '240px', borderRadius: '0.5rem' };

export default function JobLocationMap({ locationGeo, locationText, className = '' }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded } = useJsApiLoader({ id: 'job-location-map', googleMapsApiKey: apiKey });

  const center = useMemo(() => {
    if (locationGeo && typeof locationGeo.lat === 'number' && typeof locationGeo.lng === 'number') {
      return { lat: locationGeo.lat, lng: locationGeo.lng };
    }
    return DEFAULT_CENTER;
  }, [locationGeo]);

  const hasValidGeo = locationGeo && typeof locationGeo.lat === 'number' && typeof locationGeo.lng === 'number';
  const mapsUrl = hasValidGeo
    ? `https://www.google.com/maps?q=${locationGeo.lat},${locationGeo.lng}`
    : locationText
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`
      : null;

  if (!apiKey) {
    return (
      <div className={`rounded-xl border border-base-300 bg-base-200 p-4 ${className}`}>
        {locationText && <p className="text-base-content/80 font-medium">{locationText}</p>}
        <p className="text-sm text-base-content/60 mt-1">Set VITE_GOOGLE_MAPS_API_KEY to show map.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`rounded-xl border border-base-300 overflow-hidden ${className}`}>
        <div className="h-[240px] bg-base-300 animate-pulse flex items-center justify-center">Loading map...</div>
      </div>
    );
  }

  if (!hasValidGeo) {
    return (
      <div className={`rounded-xl border border-base-300 bg-base-200 p-4 ${className}`}>
        {locationText ? (
          <>
            <p className="text-base-content/80 font-medium">{locationText}</p>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost mt-2 text-primary">
                Open in Google Maps
              </a>
            )}
          </>
        ) : (
          <p className="text-base-content/60">No location set.</p>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-base-300 overflow-hidden shadow-sm ${className}`}>
      <div className="p-3 border-b border-base-300 flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium text-base-content/80 truncate">{locationText || 'Job location'}</span>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-ghost text-primary">
            Open in Google Maps
          </a>
        )}
      </div>
      <GoogleMap mapContainerStyle={MAP_STYLE} center={center} zoom={15} options={{ streetViewControl: false, fullscreenControl: true }}>
        <Marker position={center} />
      </GoogleMap>
    </div>
  );
}
