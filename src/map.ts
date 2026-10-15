import type { Facility } from './facilities';
export function hasCoordinates(f: Facility): f is Facility & {latitude:number;longitude:number} {
 return typeof f.latitude==='number' && typeof f.longitude==='number' && Number.isFinite(f.latitude) && Number.isFinite(f.longitude) && f.latitude>=-90 && f.latitude<=90 && f.longitude>=-180 && f.longitude<=180;
}
export function directionsUrl(f: Facility): string | null {
 if(f.isExample || !hasCoordinates(f)) return null;
 return `https://map.kakao.com/link/to/${encodeURIComponent(f.name)},${f.latitude},${f.longitude}`;
}
