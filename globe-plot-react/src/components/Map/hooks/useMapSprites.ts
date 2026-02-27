import { RefObject, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

const SPRITES = [
  'styled-travel-flight',
  'styled-travel-train',
  'styled-travel-car',
  'styled-travel-boat',
  'styled-travel-bus',
  'styled-travel-other',
  'styled-accommodation-hotel',
  'styled-accommodation-hostel',
  'styled-accommodation-airbnb',
  'styled-accommodation-other',
  'styled-experience-activity',
  'styled-experience-tour',
  'styled-experience-museum',
  'styled-experience-concert',
  'styled-experience-other',
  'styled-meal-restaurant',
  'styled-meal-other',
  'styled-travel',
  'styled-accommodation',
  'styled-experience',
  'styled-meal',
  'styled-default',
];

export const useMapSprites = (mapRef: RefObject<mapboxgl.Map | null>) => {
  const createFallbackCircle = useCallback((id: string) => {
    const map = mapRef.current;
    if (!map || map.hasImage(id)) return;

    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);

    if (id.includes('travel')) {
      ctx.fillStyle = '#e0f2fe';
      ctx.strokeStyle = '#0369a1';
    } else if (id.includes('accommodation')) {
      ctx.fillStyle = '#fae8ff';
      ctx.strokeStyle = '#be123c';
    } else if (id.includes('experience')) {
      ctx.fillStyle = '#ecfdf5';
      ctx.strokeStyle = '#15803d';
    } else if (id.includes('meal')) {
      ctx.fillStyle = '#ffedd5';
      ctx.strokeStyle = '#ea580c';
    } else {
      ctx.fillStyle = '#f9fafb';
      ctx.strokeStyle = '#374151';
    }

    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();

    const imageData = ctx.getImageData(0, 0, size, size);
    map.addImage(id, {
      width: size,
      height: size,
      data: new Uint8Array(imageData.data.buffer),
    });
  }, [mapRef]);

  const loadSprite = useCallback((id: string) => {
    fetch(`/svgs/${id}.svg`)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load SVG: ${response.status}`);
        return response.text();
      })
      .then((svgText) => {
        const img = new Image();
        img.onload = () => {
          const map = mapRef.current;
          if (!map || map.hasImage(id)) return;

          const canvas = document.createElement('canvas');
          canvas.width = 34;
          canvas.height = 34;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(img, 0, 0, 34, 34);
          const imageData = ctx.getImageData(0, 0, 34, 34);
          map.addImage(id, {
            width: 34,
            height: 34,
            data: new Uint8Array(imageData.data.buffer),
          });
        };

        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
      })
      .catch((error) => {
        console.warn(`Could not load sprite ${id}, falling back to default circle`, error);
        createFallbackCircle(id);
      });
  }, [createFallbackCircle, mapRef]);

  const registerStyleImageMissingHandler = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    map.on('styleimagemissing', (e) => {
      const id = e.id;
      console.log(`Loading missing sprite: ${id}`);
      loadSprite(id);
    });
  }, [loadSprite, mapRef]);

  const preloadSprites = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingImages = map.listImages();
    const missingSprites = SPRITES.filter((sprite) => !existingImages.includes(sprite));
    if (missingSprites.length === 0) {
      console.log('All sprites already loaded in the map');
      return;
    }

    console.log(`Loading ${missingSprites.length} custom map sprites`);
    missingSprites.forEach((sprite) => loadSprite(sprite));
  }, [loadSprite, mapRef]);

  return {
    preloadSprites,
    registerStyleImageMissingHandler,
  };
};

