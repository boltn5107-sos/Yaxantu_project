import type { DivIconOptions } from "leaflet";

// Marqueur de position sur la carte : icône MapPin (lucide) aux couleurs de la
// marque, avec un contour blanc et une ombre portée pour rester lisible sur le
// fond de la carte.
export const positionPin: DivIconOptions = {
  className: "",
  html:
    '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" ' +
    'fill="none" style="filter: drop-shadow(0 3px 4px rgba(0,0,0,0.35));">' +
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="#059669" stroke="#ffffff" stroke-width="2" stroke-join="round"/>' +
    '<circle cx="12" cy="10" r="3.4" fill="#ffffff"/>' +
    "</svg>",
  iconSize: [36, 36],
  iconAnchor: [18, 34],
};