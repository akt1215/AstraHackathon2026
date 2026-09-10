/** Static visible furniture shared by navigation and the room renderer. */
export interface StaticFixture { id: string; x: number; z: number; width: number; depth: number }
export const STATIC_FIXTURES: readonly StaticFixture[] = [
  { id: 'kitchen-counter', x: 4.6, z: .345, width: 3, depth: .69 },
  { id: 'corner-pot-west', x: .55, z: 9.35, width: .93, depth: .93 },
  { id: 'corner-pot-east', x: 11.4, z: 9.45, width: .72, depth: .72 },
  { id: 'floor-lamp-west', x: 4.2, z: 8.85, width: .5, depth: .5 },
  { id: 'floor-lamp-east', x: 11.55, z: 3.55, width: .5, depth: .5 },
  { id: 'coffee-table', x: 2.95, z: 6.8, width: 1.15, depth: .62 },
  { id: 'armchair', x: 4.6, z: 7.6, width: .86, depth: .88 },
  { id: 'dining-chair-north', x: 5.7, z: 1.06, width: .58, depth: .54 },
  { id: 'dining-chair-south', x: 5.7, z: 2.94, width: .58, depth: .54 },
];
