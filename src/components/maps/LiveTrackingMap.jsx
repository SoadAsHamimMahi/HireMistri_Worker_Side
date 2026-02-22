import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from './googleMapsShim';

const MAP_STYLE = { width: '100%', height: '320px', borderRadius: '0.5rem' };
const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };
const THROTTLE_MS = 8000;
const MIN_MOVE_METERS = 15;

function getBounds(positions) {
  const valid = positions.filter(Boolean).filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
  if (valid.length === 0) return null;
  const lats = valid.map(p => p.lat);
  const lngs = valid.map(p => p.lng);
  return { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
}

export default function LiveTrackingMap({ jobId, jobLocationGeo, currentUserId, peerUserId, socket, isAccepted = true }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded } = useJsApiLoader({ id: 'live-tracking-map', googleMapsApiKey: apiKey });
  const [myPosition, setMyPosition] = useState(null);
  const [peerPosition, setPeerPosition] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);
  const lastEmitRef = useRef(0);
  const lastCoordsRef = useRef(null);
  const socketRef = useRef(socket);

  socketRef.current = socket;

  const jobCenter = useMemo(() => {
    if (jobLocationGeo && typeof jobLocationGeo.lat === 'number' && typeof jobLocationGeo.lng === 'number') {
      return { lat: jobLocationGeo.lat, lng: jobLocationGeo.lng };
    }
    return null;
  }, [jobLocationGeo]);

  const mapCenter = useMemo(() => {
    const positions = [jobCenter, myPosition, peerPosition].filter(Boolean);
    return getBounds(positions) || jobCenter || DEFAULT_CENTER;
  }, [jobCenter, myPosition, peerPosition]);

  const joinRoom = useCallback(() => {
    const s = socketRef.current;
    if (!s?.connected || !jobId || !currentUserId) return;
    s.emit('location:join', { jobId, userId: currentUserId });
  }, [jobId, currentUserId]);

  const emitPosition = useCallback((lat, lng) => {
    const s = socketRef.current;
    if (!s?.connected || !jobId || !currentUserId || paused) return;
    const now = Date.now();
    if (now - lastEmitRef.current < THROTTLE_MS) return;
    const prev = lastCoordsRef.current;
    if (prev && typeof prev.lat === 'number' && prev.lng === 'number') {
      const R = 6371000;
      const dLat = (lat - prev.lat) * Math.PI / 180;
      const dLng = (lng - prev.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(prev.lat * Math.PI/180) * Math.cos(lat * Math.PI/180) * Math.sin(dLng/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const dist = R * c;
      if (dist < MIN_MOVE_METERS) return;
    }
    lastEmitRef.current = now;
    lastCoordsRef.current = { lat, lng };
    s.emit('location:update', { jobId, userId: currentUserId, lat, lng, timestamp: new Date() });
  }, [jobId, currentUserId, paused]);

  useEffect(() => {
    if (!socketRef.current || !jobId || !currentUserId || !isAccepted) return;
    joinRoom();
    const s = socketRef.current;
    const onPeer = (data) => {
      if (data.jobId !== jobId || data.userId === currentUserId) return;
      setPeerPosition({ lat: data.lat, lng: data.lng });
      setLastUpdated(new Date());
    };
    const onErr = () => setError('Location sharing error');
    s.on('location:peer', onPeer);
    s.on('location_error', onErr);
    return () => {
      s.off('location:peer', onPeer);
      s.off('location_error', onErr);
      s.emit('location:stop', { jobId });
    };
  }, [jobId, currentUserId, isAccepted, joinRoom]);

  useEffect(() => {
    if (!('geolocation' in navigator) || paused || !isAccepted) return;
    setError(null);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMyPosition({ lat, lng });
        emitPosition(lat, lng);
      },
      () => setError('Location permission denied'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    watchIdRef.current = watchId;
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [paused, isAccepted, emitPosition]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (!apiKey || !isLoaded) {
    return (
      <div className="rounded-xl border border-base-300 bg-base-200 p-4">
        <p className="text-base-content/70">Map unavailable. Set VITE_GOOGLE_MAPS_API_KEY for live tracking.</p>
      </div>
    );
  }

  const markers = [
    jobCenter && { key: 'job', position: jobCenter, label: 'Job', color: '#22c55e' },
    myPosition && { key: 'me', position: myPosition, label: 'You', color: '#3b82f6' },
    peerPosition && { key: 'peer', position: peerPosition, label: 'Peer', color: '#f59e0b' },
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-base-300 overflow-hidden shadow-sm">
      <div className="p-3 border-b border-base-300 flex flex-wrap items-center justify-between gap-2">
        <span className="badge badge-info badge-sm">Live location</span>
        <div className="flex items-center gap-2">
          {lastUpdated && <span className="text-xs text-base-content/60">Updated {Math.round((Date.now() - lastUpdated) / 1000)}s ago</span>}
          <button type="button" className="btn btn-xs btn-ghost" onClick={() => setPaused(p => !p)}>
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>
      {error && <div className="px-3 py-1 bg-error/10 text-error text-sm">{error}</div>}
      <GoogleMap mapContainerStyle={MAP_STYLE} center={mapCenter} zoom={14} options={{ streetViewControl: false, fullscreenControl: true }}>
        {markers.map(({ key, position, label }) => (
          <Marker key={key} position={position} title={label} label={{ text: label.charAt(0), color: 'white', fontWeight: 'bold' }} />
        ))}
      </GoogleMap>
    </div>
  );
}
