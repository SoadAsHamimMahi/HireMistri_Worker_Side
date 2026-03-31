import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from './googleMapsShim';

const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 }; // Dhaka
const MAP_CONTAINER_STYLE = { width: '100%', height: '300px', borderRadius: '1rem' };
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

async function nominatimReverse(lat, lng) {
  const res = await fetch(
    `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lng}&format=json&addressdetails=1&namedetails=1&zoom=18`,
    { headers: { 'Accept-Language': 'en' } }
  );
  if (!res.ok) throw new Error('Reverse geocode failed');
  return res.json();
}

async function googlePlacesSearch(query, sessionToken) {
  if (!window.google?.maps?.places) return [];
  const service = new window.google.maps.places.AutocompleteService();
  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: 'bd' },
        sessionToken,
      },
      (predictions, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
          resolve([]);
          return;
        }
        resolve(predictions);
      }
    );
  });
}

function buildDisplayName(data) {
  if (!data) return '';
  const a = data.address || {};
  const building = a.amenity || a.building || a.shop || a.office || a.tourism || a.leisure || a.historic || (data.type !== 'road' && data.name) || '';
  const houseNumber = a.house_number || a.house_name || '';
  const street = a.road || a.pedestrian || a.footway || a.path || a.cycleway || '';
  const streetPart = [houseNumber, street].filter(Boolean).join(', ');
  const subArea = a.quarter || a.neighbourhood || a.suburb || a.hamlet || '';
  const city = a.city_district || a.town || a.city || a.village || a.county || '';
  const state = a.state || '';
  const country = a.country || '';
  const parts = [building, streetPart, subArea, city, state, country].filter(Boolean);
  if (!streetPart && !building && data.display_name) return data.display_name.split(',').slice(0, 5).join(',').trim();
  return parts.length >= 2 ? parts.join(', ') : data.display_name || '';
}

function parseGoogleAddressComponents(components = [], placeName = '') {
  const getCompResource = (type) => components.find((c) => Array.isArray(c.types) && c.types.includes(type));
  const getComp = (type) => {
    const comp = getCompResource(type);
    return comp?.long_name || comp?.short_name || '';
  };
  const streetNumber = getComp('street_number');
  const subpremise = getComp('subpremise');
  const premise = getComp('premise');
  const floorParts = [streetNumber, subpremise].map((s) => String(s).trim()).filter(Boolean);
  const floorHouseNo = floorParts.length ? floorParts.join(', ') : (premise || null);
  const isGenericAddress = /^\d+|^[A-Z]\d+/.test(placeName) && placeName.includes(',');
  const landmarkCandidate = [
    !isGenericAddress ? placeName : '',
    getComp('point_of_interest'),
    getComp('establishment'),
    getComp('neighborhood'),
    getComp('sublocality_level_1')
  ].map(s => String(s || '').trim()).filter(Boolean);
  return { floorHouseNo, landmark: landmarkCandidate.length ? landmarkCandidate[0] : null };
}

export default function LocationPicker({
  value = '',
  locationGeo,
  onChange,
  placeholder = 'Pin your location on map...',
  className = '',
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded } = useJsApiLoader({ id: 'location-picker', googleMapsApiKey: apiKey, libraries: ['places'] });
  const [center, setCenter] = useState(locationGeo ? { lat: locationGeo.lat, lng: locationGeo.lng } : DEFAULT_CENTER);
  const [markerPosition, setMarkerPosition] = useState(locationGeo ? { lat: locationGeo.lat, lng: locationGeo.lng } : null);
  const [addressText, setAddressText] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const geocoderRef = useRef(null);
  const autocompleteSessionTokenRef = useRef(null);
  const placeDetailsCacheRef = useRef(new Map());

  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getPlaceExtras = useCallback(async (placeId = null, result = null) => {
    if (placeId && placeDetailsCacheRef.current.has(placeId)) return placeDetailsCacheRef.current.get(placeId);
    if (result?.address_components) {
      const parsed = parseGoogleAddressComponents(result.address_components, result.name || '');
      const data = { ...parsed, name: result.name || null };
      if (placeId) placeDetailsCacheRef.current.set(placeId, data);
      return data;
    }
    if (!placeId || !window.google?.maps?.places) return { floorHouseNo: null, landmark: null, name: null };
    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    const details = await new Promise((resolve) => {
      service.getDetails({ placeId, fields: ['name', 'address_components'] }, (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) return resolve({ floorHouseNo: null, landmark: null, name: null });
        const parsed = parseGoogleAddressComponents(place.address_components || [], place.name || '');
        resolve({ ...parsed, name: place.name || null });
      });
    });
    placeDetailsCacheRef.current.set(placeId, details);
    return details;
  }, []);

  const buildLocationString = (name, formattedAddress) => {
    if (!name) return formattedAddress || '';
    if (!formattedAddress) return name;
    if (formattedAddress.toLowerCase().startsWith(name.toLowerCase())) return formattedAddress;
    return `${name}, ${formattedAddress}`;
  };

  const reverseGeocode = useCallback((lat, lng) => {
    setReverseLoading(true);
    const applyAddr = async (addr, placeId = null, result = null) => {
      const extras = await getPlaceExtras(placeId, result);
      const finalAddr = buildLocationString(extras.name, addr);
      setAddressText(finalAddr);
      onChange?.({ locationText: finalAddr, locationGeo: { lat, lng }, placeId, floorHouseNo: extras.floorHouseNo, landmark: extras.landmark });
      setReverseLoading(false);
    };
    const fallbackToNominatim = async () => {
      try {
        const data = await nominatimReverse(lat, lng);
        const addr = data.display_name ? data.display_name.split(',').slice(0, 6).join(',').trim() : buildDisplayName(data);
        await applyAddr(addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } catch { await applyAddr(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); }
    };
    if (geocoderRef.current) {
      geocoderRef.current.geocode({ location: { lat, lng } }, async (results, status) => {
        if (status === 'OK' && results?.length) {
          const best = results.find((r) => r.types?.includes('premise')) || results.find((r) => r.types?.includes('point_of_interest')) || results.find((r) => r.types?.includes('establishment')) || results.find((r) => r.types?.includes('street_address')) || results[0];
          await applyAddr(best.formatted_address || '', best.place_id || null, best);
        } else await fallbackToNominatim();
      });
    } else fallbackToNominatim();
  }, [onChange, getPlaceExtras]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setAddressText(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim() || val.trim().length < 2) { setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        if (!autocompleteSessionTokenRef.current && window.google?.maps?.places) autocompleteSessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        const results = await googlePlacesSearch(val, autocompleteSessionTokenRef.current);
        setSuggestions(results || []);
        setShowSuggestions(true);
      } catch { setSuggestions([]); } finally { setSearchLoading(false); }
    }, 400);
  };

  const handleSuggestionClick = async (item) => {
    const placeId = item.place_id;
    const addr = item.description || item.structured_formatting?.main_text || '';
    setAddressText(addr);
    setShowSuggestions(false);
    setReverseLoading(true);
    const extras = await getPlaceExtras(placeId);
    if (window.google?.maps?.places) autocompleteSessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    if (geocoderRef.current) {
      geocoderRef.current.geocode({ placeId }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const res = results[0];
          const lat = res.geometry.location.lat();
          const lng = res.geometry.location.lng();
          setCenter({ lat, lng });
          setMarkerPosition({ lat, lng });
          const finalAddr = buildLocationString(extras.name || addr, res.formatted_address);
          onChange?.({ locationText: finalAddr, locationGeo: { lat, lng }, placeId, floorHouseNo: extras.floorHouseNo, landmark: extras.landmark });
          setAddressText(finalAddr);
        }
        setReverseLoading(false);
      });
    } else setReverseLoading(false);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCenter({ lat, lng });
      setMarkerPosition({ lat, lng });
      await reverseGeocode(lat, lng);
      setGpsLoading(false);
    }, () => { setGpsLoading(false); setGpsError('Location access denied.'); }, { timeout: 8000 });
  };

  const onMapClick = useCallback(async (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPosition({ lat, lng });
    setCenter({ lat, lng });
    if (e.placeId) {
      const placeId = e.placeId;
      setReverseLoading(true);
      const extras = await getPlaceExtras(placeId);
      if (geocoderRef.current) {
        geocoderRef.current.geocode({ placeId }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            const res = results[0];
            const finalAddr = buildLocationString(extras.name, res.formatted_address);
            setAddressText(finalAddr);
            onChange?.({ locationText: finalAddr, locationGeo: { lat, lng }, placeId, floorHouseNo: extras.floorHouseNo, landmark: extras.landmark });
          }
          setReverseLoading(false);
        });
      } else { setReverseLoading(false); reverseGeocode(lat, lng); }
    } else reverseGeocode(lat, lng);
  }, [reverseGeocode, getPlaceExtras, onChange]);

  const onMapLoad = useCallback(() => { if (window.google?.maps?.Geocoder && !geocoderRef.current) geocoderRef.current = new window.google.maps.Geocoder(); }, []);

  if (!isLoaded) return <div className="h-[300px] rounded-2xl bg-white/5 animate-pulse flex items-center justify-center text-white/50 border border-white/5">Loading map...</div>;

  return (
    <div className="space-y-4">
      <div ref={wrapperRef} className="relative">
        <div className="flex gap-2">
          <input type="text" className="input input-bordered w-full bg-[#111] border-white/10 focus:border-[#1DC66C] transition-all" value={addressText} onChange={handleInputChange} onFocus={() => suggestions.length > 0 && setShowSuggestions(true)} placeholder={placeholder} />
          <button type="button" onClick={handleUseMyLocation} disabled={gpsLoading} className="btn btn-outline border-white/10 text-white hover:bg-[#1DC66C] hover:text-[#070b14] hover:border-[#1DC66C]">
            {gpsLoading ? <span className="loading loading-spinner loading-xs" /> : <span className="material-symbols-outlined">my_location</span>}
          </button>
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-[100] w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            {suggestions.map((item) => (
              <li key={item.place_id}>
                <button type="button" onMouseDown={() => handleSuggestionClick(item)} className="w-full text-left px-4 py-3 hover:bg-[#1DC66C]/10 hover:text-[#1DC66C] text-sm border-b border-white/5 last:border-0 flex items-start gap-3 transition-colors">
                  <span className="material-symbols-outlined text-[#1DC66C] text-base mt-1 shrink-0">location_on</span>
                  <div className="flex flex-col"><span className="font-bold text-white line-clamp-1">{item.structured_formatting?.main_text}</span><span className="text-xs text-slate-500 line-clamp-1">{item.structured_formatting?.secondary_text}</span></div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900 relative">
        <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE} center={center} zoom={15} onLoad={onMapLoad} onClick={onMapClick} options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true, zoomControl: true, styles: [{ featureType: 'all', elementType: 'all', stylers: [{ saturation: -100 }, { lightness: -50 }] }] }}>
          {markerPosition && <Marker position={markerPosition} draggable onDragEnd={(e) => { const lat = e.latLng.lat(); const lng = e.latLng.lng(); setMarkerPosition({ lat, lng }); reverseGeocode(lat, lng); }} />}
        </GoogleMap>
        {(reverseLoading || searchLoading) && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10"><span className="loading loading-spinner text-[#1DC66C]"></span></div>}
      </div>
    </div>
  );
}
