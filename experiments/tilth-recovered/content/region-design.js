export const REGION_LAYOUTS=['archipelago','river','caldera','grove','ruins'];
export function regionSeed(content){if(Number.isInteger(content.seed))return content.seed;let h=2166136261;for(const ch of content.name||'region')h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0}
export function regionLayout(content){return content.layout||REGION_LAYOUTS[regionSeed(content)%REGION_LAYOUTS.length]}
export function recentRegionDesigns(regions){return Object.values(regions||{}).slice(-6).map(({content:c})=>({name:c.name,theme:c.theme,layout:regionLayout(c),seed:regionSeed(c)}))}
export function availableLayouts(recent=[]){const used=recent.slice(-2).map(r=>r.layout);return REGION_LAYOUTS.filter(l=>!used.includes(l))}
