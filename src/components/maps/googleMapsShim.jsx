import { cloneElement, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const MapContext = createContext(null);

function buildScriptUrl(apiKey, libraries = []) {
  const params = new URLSearchParams({
    key: apiKey,
    v: 'weekly',
  });
  if (libraries.length) params.set('libraries', libraries.join(','));
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
}

function loadGoogleMapsScript(apiKey, libraries = []) {
  if (!apiKey) return Promise.reject(new Error('Missing googleMapsApiKey'));
  if (window.google?.maps) return Promise.resolve(window.google);

  const libsKey = [...libraries].sort().join(',');
  const existing = window.__gmapsLoaderPromise;
  if (existing && window.__gmapsLoaderKey === `${apiKey}:${libsKey}`) return existing;

  const promise = new Promise((resolve, reject) => {
    const previous = document.getElementById('google-maps-script');
    if (previous) previous.remove();

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = buildScriptUrl(apiKey, libraries);
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });

  window.__gmapsLoaderKey = `${apiKey}:${libsKey}`;
  window.__gmapsLoaderPromise = promise;
  return promise;
}

export function useJsApiLoader({ googleMapsApiKey, libraries = [] }) {
  const [isLoaded, setIsLoaded] = useState(Boolean(window.google?.maps));
  const [loadError, setLoadError] = useState(null);
  const libsKey = useMemo(() => [...libraries].sort().join(','), [libraries]);

  useEffect(() => {
    let active = true;
    if (!googleMapsApiKey) {
      setIsLoaded(false);
      return () => {
        active = false;
      };
    }
    loadGoogleMapsScript(googleMapsApiKey, libraries)
      .then(() => {
        if (!active) return;
        setIsLoaded(true);
        setLoadError(null);
      })
      .catch((err) => {
        if (!active) return;
        setIsLoaded(false);
        setLoadError(err);
      });
    return () => {
      active = false;
    };
  }, [googleMapsApiKey, libsKey]);

  return { isLoaded, loadError };
}

export function GoogleMap({ mapContainerStyle, center, zoom = 14, options, onLoad, onClick, children }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const clickListenerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !window.google?.maps || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(containerRef.current, {
      center,
      zoom,
      ...(options || {}),
    });
    onLoad?.(mapRef.current);
    setIsReady(true);
  }, [center, zoom, options, onLoad]);

  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.setCenter(center);
  }, [center]);

  useEffect(() => {
    if (!mapRef.current || typeof zoom !== 'number') return;
    mapRef.current.setZoom(zoom);
  }, [zoom]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (clickListenerRef.current) window.google.maps.event.removeListener(clickListenerRef.current);
    if (!onClick) return;
    clickListenerRef.current = mapRef.current.addListener('click', onClick);
    return () => {
      if (clickListenerRef.current) window.google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    };
  }, [onClick]);

  return (
    <MapContext.Provider value={isReady ? mapRef.current : null}>
      <div style={mapContainerStyle} ref={containerRef} />
      {isReady ? children : null}
    </MapContext.Provider>
  );
}

export function Marker({ position, draggable, onDragEnd, title, label }) {
  const map = useContext(MapContext);
  const markerRef = useRef(null);
  const dragListenerRef = useRef(null);

  useEffect(() => {
    if (!map || !position || markerRef.current) return;
    markerRef.current = new window.google.maps.Marker({
      map,
      position,
      draggable: Boolean(draggable),
      title,
      label,
    });
    return () => {
      if (dragListenerRef.current) window.google.maps.event.removeListener(dragListenerRef.current);
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
  }, [map, position, draggable, title, label]);

  useEffect(() => {
    if (!markerRef.current || !position) return;
    markerRef.current.setPosition(position);
  }, [position]);

  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setDraggable(Boolean(draggable));
  }, [draggable]);

  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setTitle(title || '');
  }, [title]);

  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLabel(label || null);
  }, [label]);

  useEffect(() => {
    if (!markerRef.current) return;
    if (dragListenerRef.current) window.google.maps.event.removeListener(dragListenerRef.current);
    if (!onDragEnd) return;
    dragListenerRef.current = markerRef.current.addListener('dragend', onDragEnd);
    return () => {
      if (dragListenerRef.current) window.google.maps.event.removeListener(dragListenerRef.current);
      dragListenerRef.current = null;
    };
  }, [onDragEnd]);

  return null;
}

export function Autocomplete({ children, onLoad, onPlaceChanged }) {
  const wrapperRef = useRef(null);
  const autocompleteRef = useRef(null);
  const placeListenerRef = useRef(null);

  useEffect(() => {
    const input = wrapperRef.current?.querySelector('input');
    if (!input || !window.google?.maps?.places) return;
    if (!autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(input);
      onLoad?.(autocompleteRef.current);
    }
    if (placeListenerRef.current) window.google.maps.event.removeListener(placeListenerRef.current);
    if (onPlaceChanged) {
      placeListenerRef.current = autocompleteRef.current.addListener('place_changed', onPlaceChanged);
    }
    return () => {
      if (placeListenerRef.current) window.google.maps.event.removeListener(placeListenerRef.current);
      placeListenerRef.current = null;
    };
  }, [onLoad, onPlaceChanged]);

  return <div ref={wrapperRef}>{cloneElement(children)}</div>;
}
