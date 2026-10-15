import type { CSSProperties } from 'react';
const paths={
 pin:'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 search:'M21 21l-4.5-4.5 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z',
 locate:'M12 2v3 M12 19v3 M2 12h3 M19 12h3 M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
 heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
 map:'m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z M9 3v15 M15 6v15',
 user:'M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 info:'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
 close:'M6 6l12 12 M6 18 18 6',
 arrow:'M5 12h14 M13 6l6 6-6 6',
 clock:'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
 phone:'M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3l1.5 5-2 2a16 16 0 0 0 6.4 6.4l2-2 5 1.5Z',
 building:'M4 22V4h16v18 M9 22v-5h6v5 M8 8h1 M15 8h1 M8 12h1 M15 12h1',
 check:'m5 12 4 4L19 6',
 filter:'M4 7h16 M4 17h16 M9 4v6 M15 14v6',
 list:'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
 baby:'M9 13h.01 M15 13h.01 M9 17s3 2 6 0 M12 3c-3 0-3 4 0 4 3 0 3-4 0-4 M7 6a8 8 0 1 0 10 0',
};
export function Icon({name,size=20,style}:{name:keyof typeof paths;size?:number;style?:CSSProperties}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]}/></svg>;
}
