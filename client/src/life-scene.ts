import {
  AbstractMesh, AnimationGroup, ArcRotateCamera, Color3, Color4, DirectionalLight, DynamicTexture, Engine,
  HemisphericLight, Matrix, Mesh, MeshBuilder, PointerEventTypes, Scene,
  PBRMaterial, SceneLoader, Space, ShadowGenerator, Texture, TransformNode, Vector3, VertexData, VertexBuffer,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { createCinematicAtmosphere, applyScannedMaterial } from './life-materials';
import { createTrail, record, sample, SNAP_DISTANCE, STRIDE_PER_METRE, type MotionTrail } from './locomotion';
import { STATIC_FIXTURES } from '../../shared/life/layout';
import type { LifeObject, LifeResident, LifeScene, LifeSceneHooks, LifeState, LifeTheme } from '../../shared/life-types';

type Palette = { wall: string; accent: string; sofa: string; blanket: string; wood: string; sky: string; trim: string };
const PALETTES: Record<LifeTheme, Palette> = {
  loft: { wall: '#cfc2ab', accent: '#ad6846', sofa: '#697253', blanket: '#a96544', wood: '#a28d73', sky: '#253545', trim: '#283234' },
  lantern: { wall: '#d6bb92', accent: '#aa342d', sofa: '#a3483d', blanket: '#385e57', wood: '#6e3e2a', sky: '#666b85', trim: '#482f2b' },
  comic: { wall: '#f5e8cf', accent: '#ec6959', sofa: '#507ab8', blanket: '#e9af39', wood: '#b88a57', sky: '#80afc7', trim: '#273552' },
};
interface PersonRig {
  root: TransformNode; hips: TransformNode; head: TransformNode; arms: TransformNode[];
  forearms: TransformNode[]; legs: TransformNode[]; shins: TransformNode[];
  book: Mesh; cup: Mesh; brush: Mesh; ring: Mesh; phase: number; trail: MotionTrail;
  model?: TransformNode; clips?: AnimationGroup[]; clip?: string; bones?: Map<string, TransformNode>;
}
interface PropRig { root: TransformNode; signature: string }
const c3 = (hex: string): Color3 => Color3.FromHexString(/^#[\da-f]{6}$/i.test(hex) ? hex : '#b38874');
const mixAngle = (from: number, to: number, weight: number): number => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * weight;

/** A self-contained WebGL scene. Simulation state remains authoritative. */
export function createLifeScene(canvas: HTMLCanvasElement, hooks: LifeSceneHooks): LifeScene {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, powerPreference: 'high-performance', adaptToDeviceRatio: false });
  engine.setHardwareScalingLevel(1);
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString('#253545ff');
  scene.ambientColor = new Color3(.06, .07, .1);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.exposure = 1.56;
  scene.imageProcessingConfiguration.contrast = 1.12;
  // Framing shared by construction and the orbit-camera reset so both stay in step.
  const ORBIT_BETA = .92;
  const ROOM_FOCUS = new Vector3(6, .8, 4.9);
  let orbitRadius = 15.4;
  const camera = new ArcRotateCamera('room-camera', -Math.PI / 2.8, ORBIT_BETA, orbitRadius, ROOM_FOCUS.clone(), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 6;
  camera.upperRadiusLimit = 26;
  camera.lowerBetaLimit = .32;
  camera.upperBetaLimit = 1.43;
  camera.wheelPrecision = 38;
  camera.panningSensibility = 85;
  camera.inertia = .78;
  camera.minZ = .1;
  camera.maxZ = 120;
  camera.inputs.attached.keyboard?.detachControl();
  const fill = new HemisphericLight('sky-fill', new Vector3(.3, 1, -.2), scene);
  // Cool skylight above, warm bounce off the floorboards below, so unlit faces still read as lit.
  fill.intensity = .13;
  fill.diffuse = c3('#8fb2dd');
  fill.groundColor = c3('#6b4b33');
  fill.groundColor = c3('#66504b');
  fill.diffuse = c3('#a9bde3');
  // A low raking key does the work a steep overhead lamp cannot: long shadows, grazing angles
  // across the floorboards, and a warm/cool split against the blue-hour skylight.
  const sun = new DirectionalLight('late-afternoon', new Vector3(-.66, -.47, -.83), scene);
  sun.position = new Vector3(19, 11, 19);
  sun.intensity = 2.7;
  sun.diffuse = c3('#ffc186');
  sun.specular = c3('#ffd9ab');
  const shadows = new ShadowGenerator(2048, sun);
  // Contact hardening gives a tight shadow at the point of contact that widens with distance,
  // which is most of what separates a rendered contact from a stamped-on dark blob.
  shadows.useContactHardeningShadow = true;
  shadows.contactHardeningLightSizeUVRatio = .07;
  shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = .0016;
  shadows.normalBias = .03;
  shadows.setDarkness(.04);
  sun.shadowMinZ = 1;
  sun.shadowMaxZ = 45;
  sun.autoCalcShadowZBounds = true;
  const materials = new Map<string, PBRMaterial>();
  const themed: Array<{ mat: PBRMaterial; key: keyof Palette }> = [];
  const wallFaces: Array<{ mesh: Mesh; side: 'back' | 'left' }> = [];
  const props = new Map<string, PropRig>();
  const people = new Map<string, PersonRig>();
  let current: LifeState | undefined;
  let theme: LifeTheme = 'loft';
  let focused = '';
  let cameraMode: 'orbit' | 'follow' = 'orbit';
  let clock = 0;
  let simClock = { elapsedMs: 0, at: 0, speed: 1 };
  /** Simulation time now, carried forward from the last report so playback never waits on a poll. */
  const simElapsedNow = (): number => simClock.elapsedMs + (performance.now() - simClock.at) * simClock.speed;
  let disposed = false;
  let lastDown = { x: 0, y: 0 };
  const frameTimes: number[] = [];
  let previousFrame = 0, previousMetric = 0, metricWarmupUntil = Infinity;
  const pendingAssets: Promise<unknown>[] = [];
  const failedAssets = new Set<string>();
  let readySettled = false, readyStarted = false;
  let resolveReady!: (result: { degraded: boolean; failedAssets: string[] }) => void;
  const ready = new Promise<{ degraded: boolean; failedAssets: string[] }>(resolve => { resolveReady = resolve; });
  const resetMetrics = (): void => {
    frameTimes.length = 0; previousFrame = 0; previousMetric = performance.now();
    metricWarmupUntil = readySettled ? previousMetric + 2000 : Infinity;
    delete canvas.dataset.scenePerformance;
  };
  document.addEventListener('visibilitychange', resetMetrics);
  function settleReady(): void {
    if (readySettled) return;
    readySettled = true; clearTimeout(readyTimeout); resetMetrics();
    resolveReady({ degraded: failedAssets.size > 0, failedAssets: [...failedAssets] });
  }
  let readyTimeout: number | undefined;
  async function prepareFirstFrame(): Promise<void> {
    if (readyStarted) return;
    readyStarted = true;
    readyTimeout = window.setTimeout(() => { failedAssets.add('Scene preparation exceeded 30 seconds'); settleReady(); }, 30_000);
    // Dining chairs can enqueue their imports after the dining table finishes.
    let drained = 0;
    while (drained < pendingAssets.length && !disposed) {
      const batch = pendingAssets.slice(drained); drained = pendingAssets.length;
      await Promise.allSettled(batch);
    }
    if (!disposed && !readySettled) scene.executeWhenReady(settleReady);
  }

  const recordAssetError = (asset: string): void => { failedAssets.add(asset); };
  function scan(mat: PBRMaterial, id: string, scale: number): void { applyScannedMaterial(mat, id, scene, scale, recordAssetError); }

  function material(name: string, color: string, gloss = .05): PBRMaterial {
    const existing = materials.get(name);
    if (existing) return existing;
    const mat = new PBRMaterial(name, scene);
    mat.albedoColor = c3(color).toLinearSpace();
    mat.metallic = name.includes('brass') ? .8 : name.includes('iron') ? .6 : 0;
    mat.roughness = Math.max(.2, .88 - gloss);
    mat.maxSimultaneousLights = 8;
    mat.environmentIntensity = .65;

    materials.set(name, mat);
    return mat;
  }
  function themedMaterial(name: string, key: keyof Palette): PBRMaterial {
    const mat = material(name, PALETTES.loft[key]);
    themed.push({ mat, key });
    return mat;
  }
  const wall = themedMaterial('plaster', 'wall');
  const wood = themedMaterial('walnut', 'wood');
  const accent = themedMaterial('terracotta', 'accent');
  const upholstery = themedMaterial('woven-sofa', 'sofa');
  const blanket = themedMaterial('linen-duvet', 'blanket');
  const trim = themedMaterial('window-iron', 'trim');
  const cream = material('warm-ivory', '#f1e7d3');
  const dark = material('charcoal', '#293238');
  const brass = material('brushed-brass', '#cfa262', .36);
  const leaf = material('sage-leaves', '#507957');
  const leafLight = material('new-leaves', '#81a568');
  const soil = material('potting-soil', '#44352b');
  const pink = material('clay-pink', '#c8847c');
  const blue = material('dusty-blue', '#6d8b9b');
  const glass = material('tinted-glass', '#b2cdce', .55);
  const glow = material('warm-lamp', '#ffdf9f');
  glow.emissiveColor = c3('#ffb45e').scale(1.9);

  function box(name: string, dims: [number, number, number], pos: [number, number, number], mat: PBRMaterial, parent?: TransformNode, cast = true, bevel = 0): Mesh {
    const mesh = MeshBuilder.CreateBox(name, { width: dims[0], height: dims[1], depth: dims[2] }, scene);
    mesh.position.set(...pos);
    mesh.material = mat;
    mesh.parent = parent ?? null;
    mesh.isPickable = Boolean(parent?.metadata?.objectId || parent?.metadata?.residentId);
    mesh.receiveShadows = true;
    if (cast) shadows.addShadowCaster(mesh);
    if (bevel > 0) { mesh.enableEdgesRendering(); mesh.edgesWidth = bevel; mesh.edgesColor = new Color4(.15, .12, .1, .16); }
    return mesh;
  }
  function sphere(name: string, dims: [number, number, number], pos: [number, number, number], mat: PBRMaterial, parent?: TransformNode, cast = true): Mesh {
    const mesh = MeshBuilder.CreateSphere(name, { diameter: 1, segments: 10 }, scene);
    mesh.scaling.set(...dims);
    mesh.position.set(...pos);
    mesh.material = mat;
    mesh.parent = parent ?? null;
    mesh.isPickable = Boolean(parent?.metadata?.objectId || parent?.metadata?.residentId);
    mesh.receiveShadows = true;
    if (cast) shadows.addShadowCaster(mesh);
    return mesh;
  }
  function cylinder(name: string, radius: number, height: number, pos: [number, number, number], mat: PBRMaterial, parent?: TransformNode, topRadius = radius, cast = true): Mesh {
    const mesh = MeshBuilder.CreateCylinder(name, { diameterTop: topRadius * 2, diameterBottom: radius * 2, height, tessellation: 18 }, scene);
    mesh.position.set(...pos); mesh.material = mat; mesh.parent = parent ?? null;
    mesh.isPickable = Boolean(parent?.metadata?.objectId || parent?.metadata?.residentId);
    mesh.receiveShadows = true;
    if (cast) shadows.addShadowCaster(mesh);
    return mesh;
  }
  function beam(name: string, a: Vector3, b: Vector3, radius: number, mat: PBRMaterial, parent?: TransformNode): Mesh {
    const mesh = cylinder(name, radius, Vector3.Distance(a, b), [0, 0, 0], mat, parent);
    mesh.position.copyFrom(a.add(b).scale(.5));
    mesh.rotationQuaternion = null;
    mesh.rotation.z = -Math.atan2(b.x - a.x, b.y - a.y);
    mesh.rotation.x = Math.atan2(b.z - a.z, Math.hypot(b.x - a.x, b.y - a.y));
    return mesh;
  }
  function texture(name: string, draw: (ctx: CanvasRenderingContext2D, n: number) => void, size = 512): DynamicTexture {
    const tex = new DynamicTexture(name, { width: size, height: size }, scene, true);
    draw(tex.getContext() as unknown as CanvasRenderingContext2D, size);
    tex.update();
    tex.anisotropicFilteringLevel = 8;
    return tex;
  }
  scan(wood, 'wood_floor', .65);
  scan(wall, 'plastered_wall', 1.5);
  scan(upholstery, 'rough_linen', 6);
  scan(blanket, 'rough_linen', 6);

  // Continuous oak flooring keeps geometry inexpensive while retaining individual grain and joints.
  const floorMat = material('oak-floorboards', '#ffffff');
  // A sealed board finish: gloss enough to carry a specular streak from the key and the lamps.
  scan(floorMat, 'wood_floor', 6); floorMat.roughness = .74; floorMat.metallicF0Factor = .62;
  floorMat.environmentIntensity = .9;
  box('floating-foundation', [12.3, .3, 10.3], [6, -.18, 5], dark, undefined, false);
  const floor = MeshBuilder.CreateGround('walkable-oak', { width: 12, height: 10 }, scene);
  floor.position.set(6, 0, 5); floor.material = floorMat; floor.receiveShadows = true; floor.metadata = { ground: true };
  box('front-brass-inlay', [12.1, .025, .022], [6, .015, -.05], brass, undefined, false);
  const backWall = box('back-plaster-dado', [12, .66, .2], [6, .33, 10.04], wall, undefined, false);
  for (const [px, pw] of [[1.44, 2.88], [6.34, .44], [10.85, 2.3]]) {
    const pier = box('back-plaster-pier', [pw!, 3.65, .24], [px!, 1.825, 10.04], wall, undefined, false);
    wallFaces.push({ mesh: pier, side: 'back' });
  }
  const lintel = box('structural-window-lintel', [12.2, .22, .3], [6, 3.55, 10.04], wood, undefined, false);
  wallFaces.push({ mesh: lintel, side: 'back' });
  const leftWall = box('left-plaster', [.12, 3.35, 10], [-.04, 1.675, 5], wall, undefined, false);
  wallFaces.push({ mesh: backWall, side: 'back' }, { mesh: leftWall, side: 'left' });
  box('back-skirting', [12, .16, .055], [6, .08, 9.94], cream, undefined, false);
  box('left-skirting', [.055, .16, 10], [.04, .08, 5], cream, undefined, false);
  box('back-picture-rail', [12, .055, .07], [6, 3.14, 9.93], cream, undefined, false);
  box('left-picture-rail', [.07, .055, 10], [.04, 3.14, 5], cream, undefined, false);

  const windowFallbacks: Array<{ x: number; meshes: Mesh[] }> = [];
  for (const x of [4.65, 8.05]) {
    const pane = box('city-view-glass', [2.85, 2.72, .02], [x, 2.05, 9.985], glass, undefined, false);
    glass.alpha = .09; glass.roughness = .08; glass.metallic = .1; pane.isPickable = false;
    const frameStart = scene.meshes.length;
    for (const dx of [-1.48, 0, 1.48]) box('window-mullion', [.065, 2.84, .14], [x + dx, 2.07, 9.865], trim, undefined, false);
    for (const y of [.66, 1.66, 2.55, 3.49]) box('window-crossbar', [3.02, .055, .1], [x, y, 9.85], trim, undefined, false);
    box('stone-window-sill', [3.14, .085, .25], [x, .64, 9.79], cream);
    windowFallbacks.push({ x, meshes: scene.meshes.slice(frameStart) as Mesh[] });
  }

  for (const x of [2.7, 9.8]) {
    cylinder('sconce-brass-mount', .075, .22, [x, 2.55, 9.82], brass);
    const bulb = sphere('sconce-opal-globe', [.17, .24, .17], [x, 2.78, 9.8], glow);
    bulb.isPickable = false;
    box('sconce-wall-plate', [.1, .32, .04], [x, 2.56, 9.87], brass, undefined, false);
  }

  function artwork(x: number, z: number, side: 'back' | 'left', variant: number): void {
    const root = new TransformNode('framed-artwork', scene); root.position.set(x, 2, z);
    if (side === 'left') root.rotation.y = Math.PI / 2;
    box('oak-art-frame', [1.04, 1.27, .08], [0, 0, 0], wood, root, false);
    const artMat = material(`original-art-${variant}`, '#ffffff');
    artMat.albedoTexture = texture(`abstract-print-${variant}`, (ctx, n) => {
      ctx.fillStyle = '#eee3ce'; ctx.fillRect(0, 0, n, n);
      ctx.fillStyle = variant ? '#6c8580' : '#cb7555'; ctx.beginPath(); ctx.arc(n * .49, n * .4, n * .27, Math.PI, 0); ctx.lineTo(n * .76, n * .76); ctx.lineTo(n * .22, n * .76); ctx.fill();
      ctx.fillStyle = '#d9b25f'; ctx.beginPath(); ctx.arc(n * .7, n * .28, n * .12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#293f44'; ctx.fillRect(n * .18, n * .76, n * .64, 5);
      ctx.font = `${n * .035}px serif`; ctx.textAlign = 'center'; ctx.fillText(variant ? 'STILL LIFE / 02' : 'THE HOURS BETWEEN', n * .5, n * .9);
    }, 256);
    box('artwork-print', [.9, 1.13, .014], [0, 0, -.05], artMat, root, false);
  }
  artwork(.08, 6.4, 'left', 0); artwork(10.58, 9.93, 'back', 1);

  function rug(name: string, x: number, z: number, w: number, d: number, color: string, pattern: 'border' | 'stripe'): void {
    const mat = material(name, '#ffffff');
    mat.albedoTexture = texture(`${name}-design`, (ctx, n) => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, n, n);
      ctx.strokeStyle = '#ddc6a1'; ctx.lineWidth = 9; ctx.strokeRect(18, 18, n - 36, n - 36); ctx.lineWidth = 2; ctx.strokeRect(33, 33, n - 66, n - 66);
      if (pattern === 'border') for (let y = 70; y < n - 50; y += 45) for (let x = 70; x < n - 50; x += 45) { ctx.fillStyle = '#d9b38b'; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 6, y); ctx.fill(); }
      else for (let y = 60; y < n - 60; y += 25) { ctx.fillStyle = '#d5c8b1'; ctx.fillRect(48, y, n - 96, 3); }
      for (let i = 0; i < n; i += 3) { ctx.fillStyle = 'rgba(255,255,255,.045)'; ctx.fillRect(i, 0, 1, n); }
    });
    const mesh = box(name, [w, .018, d], [x, .014, z], mat, undefined, false);
    for (const sign of [-1, 1]) for (let i = 0; i < w * 12; i++) box('rug-fringe', [.026, .012, .09], [x - w / 2 + i / 12, .016, z + sign * (d / 2 + .04)], cream, undefined, false).isPickable = false;
    mesh.isPickable = false;
  }
  rug('living-room-kilim', 2.8, 7.15, 4.5, 3.55, '#916456', 'border');
  rug('bedroom-woven-rug', 10.2, 1.7, 3.25, 3.1, '#a8a79a', 'stripe');
  rug('studio-kilim-rug', 7.45, 6.15, 3.5, 2.9, '#6d4f3d', 'border');

  function plant(parent: TransformNode | undefined, x: number, y: number, z: number, scale = 1): void {
    const root = new TransformNode('ceramic-planter', scene); root.parent = parent ?? null; root.position.set(x, y, z); root.scaling.setAll(scale);
    cylinder('terracotta-pot', .22, .38, [0, .19, 0], accent, root, .29);
    cylinder('pot-rim', .3, .075, [0, .38, 0], accent, root);
    cylinder('rich-soil', .265, .015, [0, .415, 0], soil, root, .265, false);
    for (let i = 0; i < 13; i++) {
      const angle = i * 2.39996; const height = .65 + (i % 5) * .13;
      const spread = .22 + (i % 3) * .075;
      const px = Math.sin(angle) * spread, pz = Math.cos(angle) * spread;
      beam('plant-stem', new Vector3(0, .41, 0), new Vector3(px, height, pz), .012, leaf, root);
      const positions: number[] = [], indices: number[] = [], uvs: number[] = [], normals: number[] = [];
      const length = .35 + (i % 3) * .055;
      for (let row = 0; row <= 8; row++) for (let col = 0; col <= 4; col++) {
        const t = row / 8, across = (col / 4 - .5) * 2;
        const width = Math.pow(Math.sin(Math.PI * t), .72) * .115;
        positions.push(across * width, t * length, Math.sin(t * Math.PI) * .065 - across * across * .035);
        uvs.push(col / 4, t);
        if (row < 8 && col < 4) { const v = row * 5 + col; indices.push(v, v + 5, v + 1, v + 1, v + 5, v + 6); }
      }
      VertexData.ComputeNormals(positions, indices, normals);
      const blade = new Mesh('curved-botanical-leaf', scene), data = new VertexData();
      data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uvs; data.applyToMesh(blade);
      blade.parent = root; blade.position.set(px, height, pz); blade.rotation.set(.65 + i % 3 * .18, angle, .2 * Math.sin(angle));
      blade.material = i % 3 ? leaf : leafLight; (blade.material as PBRMaterial).backFaceCulling = false;
      blade.receiveShadows = true; shadows.addShadowCaster(blade);
    }
  }
  for (const fixture of STATIC_FIXTURES.filter(item => item.id.startsWith('corner-pot-'))) plant(undefined, fixture.x, 0, fixture.z, fixture.width / .6);
  plant(undefined, 4.1, .82, 9.78, .5);

  // The kitchenette is fixed architectural scenery; actionable appliances are supplied by state.
  const kitchenStart = scene.meshes.length;
  for (const z of [1.25, 2.23, 3.21]) {
    box('kitchen-lower-cabinet', [.88, .85, .95], [.48, .45, z], cream);
    box('inset-cabinet-panel', [.035, .67, .78], [.944, .46, z], wall);
    box('cabinet-brass-pull', [.055, .025, .25], [.98, .69, z], brass);
    box('marble-worktop', [1.04, .065, .98], [.53, .91, z], cream);
    box('sage-backsplash', [.022, .52, .95], [.045, 1.2, z], blue, undefined, false);
    for (const hy of [1.01, 1.19, 1.37]) box('tile-grout', [.026, .012, .95], [.06, hy, z], cream, undefined, false);
  }
  box('sink-dark-basin', [.58, .025, .48], [.55, .958, 2.23], dark);
  box('sink-inset', [.45, .024, .36], [.55, .971, 2.23], glass);
  cylinder('faucet-upright', .035, .3, [.22, 1.08, 2.23], brass);
  const faucet = cylinder('faucet-spout', .035, .28, [.34, 1.22, 2.23], brass); faucet.rotation.z = Math.PI / 2;
  box('ceramic-hob', [.67, .025, .67], [.56, .96, 1.25], dark);
  for (const dx of [-.16, .16]) for (const dz of [-.16, .16]) cylinder('hob-ring', .11, .012, [.56 + dx, .98, 1.25 + dz], trim, undefined, .11, false);
  box('chopping-board', [.55, .025, .34], [.54, .97, 3.25], wood);
  sphere('lemon', [.09, .075, .085], [.47, 1.02, 3.22], brass);
  cylinder('utensil-holder', .095, .17, [.23, 1.03, 3.51], cream);
  for (let i = 0; i < 3; i++) beam('wooden-spoon', new Vector3(.22, 1.1, 3.47 + i * .035), new Vector3(.2 + i * .025, 1.38, 3.47 + i * .035), .012, wood);

  const kitchenRoot = new TransformNode('kitchen-architecture', scene);
  const counterFixture = STATIC_FIXTURES.find(item => item.id === 'kitchen-counter')!;
  kitchenRoot.rotation.y = -Math.PI / 2; kitchenRoot.position.set(counterFixture.x + 2.2, 0, counterFixture.z - counterFixture.depth / 2); kitchenRoot.scaling.x = counterFixture.depth / 1.06;
  for (const mesh of scene.meshes.slice(kitchenStart)) mesh.parent = kitchenRoot;

  const lampShade = material('warm-linen-lampshade', '#dac5a2');
  scan(lampShade, 'rough_linen', 4); lampShade.emissiveColor = c3('#bc8c4e').toLinearSpace().scale(.2);
  function floorLamp(x: number, z: number): void {
    cylinder('lamp-foot', .25, .04, [x, .035, z], dark);
    cylinder('lamp-stem', .025, 1.9, [x, .99, z], brass);
    cylinder('linen-lampshade', .38, .43, [x, 1.91, z], lampShade, undefined, .28);
    cylinder('lampshade-glow', .33, .015, [x, 1.69, z], glow, undefined, .33, false);
  }
  for (const fixture of STATIC_FIXTURES.filter(item => item.id.startsWith('floor-lamp-'))) floorLamp(fixture.x, fixture.z);

  const lanternDecor = new TransformNode('spirit-inn-details', scene);
  for (const x of [1.65, 5.8, 10.75]) {
    cylinder('lantern-cord', .012, .45, [x, 3.42, 9.1], dark, lanternDecor, .012, false);
    const body = sphere('amber-paper-lantern', [.61, .72, .61], [x, 2.89, 9.1], glow, lanternDecor, false);
    for (const y of [2.55, 3.22]) cylinder('lantern-rim', .19, .045, [x, y, 9.1], accent, lanternDecor);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      beam('lantern-rib', new Vector3(x + Math.sin(a) * .22, 2.6, 9.1 + Math.cos(a) * .22), new Vector3(x + Math.sin(a) * .22, 3.17, 9.1 + Math.cos(a) * .22), .009, accent, lanternDecor);
    }
    cylinder('lantern-tassel', .023, .24, [x, 2.38, 9.1], accent, lanternDecor);
    body.isPickable = false;
  }
  for (let i = 0; i < 12; i++) box('inn-wood-lattice', [.055, 2.9, .055], [.13, 1.5, 5.5 + i * .34], wood, lanternDecor, false);
  const comicDecor = new TransformNode('comic-city-details', scene);
  const comicPrint = material('comic-wall-print', '#ffffff');
  comicPrint.albedoTexture = texture('original-comic-city-print', (ctx, n) => {
    ctx.fillStyle = '#f6c84b'; ctx.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y += 13) for (let x = 0; x < n; x += 13) { ctx.fillStyle = '#e9a447'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#eb6a58'; ctx.beginPath();
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; const r = n * (i % 2 ? .28 : .43); const x = n / 2 + Math.cos(a) * r; const y = n / 2 + Math.sin(a) * r; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#273552'; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillStyle = '#273552'; ctx.textAlign = 'center'; ctx.font = `900 ${n * .14}px sans-serif`; ctx.fillText('LIVE A', n / 2, n * .48); ctx.fillText('LITTLE!', n / 2, n * .63);
  }, 256);
  box('comic-poster-frame', [1.5, 1.65, .07], [1.8, 1.97, 9.85], dark, comicDecor, false);
  box('comic-original-poster', [1.38, 1.53, .02], [1.8, 1.97, 9.8], comicPrint, comicDecor, false);
  lanternDecor.setEnabled(false); comicDecor.setEnabled(false);

  // Batch small architectural pieces sharing materials; props retain their individual pick IDs.
  const staticGroups = new Map<PBRMaterial, Mesh[]>();
  const wallSet = new Set(wallFaces.map(face => face.mesh));
  for (const mesh of [...scene.meshes]) {
    if (!(mesh instanceof Mesh) || mesh === floor || wallSet.has(mesh) || mesh.parent || !mesh.material || mesh.getTotalVertices() === 0) continue;
    const nearBack = mesh.position.z > 9.74; const nearLeft = mesh.position.x < .15;
    if (nearBack || nearLeft) { wallFaces.push({ mesh, side: nearBack ? 'back' : 'left' }); continue; }
    if (mesh.isPickable || mesh.material === glow) continue;
    const mat = mesh.material as PBRMaterial;
    const group = staticGroups.get(mat) ?? []; group.push(mesh); staticGroups.set(mat, group);
  }
  for (const meshes of staticGroups.values()) {
    if (meshes.length < 4) continue;
    const hadShadow = meshes.some(mesh => shadows.getShadowMap()?.renderList?.includes(mesh));
    const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
    if (merged) { merged.name = 'batched-architecture'; merged.isPickable = false; merged.receiveShadows = true; if (hadShadow) shadows.addShadowCaster(merged); }
  }

  const atmosphere = createCinematicAtmosphere(scene, camera, recordAssetError);

  const cinematicLinen = material('cinematic-neutral-linen', '#d7c9ae');
  scan(cinematicLinen, 'rough_linen', 6);
  const cinematicRust = themedMaterial('cinematic-rust-fabric', 'accent');
  scan(cinematicRust, 'rough_linen', 6);
  const paintedSage = themedMaterial('cinematic-painted-sage', 'sofa'); paintedSage.roughness = .66;
  const cinematicOak = material('cinematic-oak-joinery', '#c8b99b');
  scan(cinematicOak, 'wood_floor', .6);
  function assetMaterial(name: string): PBRMaterial | undefined {
    if (name.includes('fabric.sage')) return upholstery;
    if (name.includes('paint.sage')) return paintedSage;
    if (name.includes('fabric.terracotta')) return cinematicRust;
    if (name.includes('fabric.linen')) return cinematicLinen;
    if (name.includes('seam.linen')) return cream;
    if (name.includes('wood.walnut')) return wood;
    if (name.includes('wood.oak')) return cinematicOak;
    if (name.includes('metal.iron')) return trim;
    if (name.includes('metal.brass')) return brass;
    if (name.includes('ceramic.ivory') || name.includes('stone.cream')) return cream;
    if (name.includes('glass')) return glass;
    return undefined;
  }
  function loadCinematicAsset(file: string, parent: TransformNode, objectId?: string): Promise<boolean> {
    const work = importCinematicAsset(file, parent, objectId); pendingAssets.push(work); return work;
  }
  async function importCinematicAsset(file: string, parent: TransformNode, objectId?: string): Promise<boolean> {
    try {
      const result = await SceneLoader.ImportMeshAsync('', '/life-assets/cinematic/', `${file}.glb`, scene);
      if (disposed || parent.isDisposed()) { result.meshes.forEach(mesh => mesh.dispose()); return false; }
      for (const mesh of result.meshes) {
        if (!mesh.parent) mesh.parent = parent;
        if (mesh.material) mesh.material = assetMaterial(mesh.material.name) ?? mesh.material;
        if (mesh.material instanceof PBRMaterial) { mesh.material.maxSimultaneousLights = 8; mesh.material.environmentIntensity = .65; }
        const tag = objectId ?? parent.metadata?.objectId;
        mesh.metadata = tag ? { objectId: tag } : null; mesh.isPickable = Boolean(tag);
        mesh.receiveShadows = true; shadows.addShadowCaster(mesh);
      }
      return true;
    } catch (error) { failedAssets.add(`cinematic/${file}.glb`); console.warn(`Unable to load cinematic ${file}; existing geometry remains.`, error); return false; }
  }

  for (const fallback of windowFallbacks) {
    const frame = new TransformNode('modeled-casement-window', scene);
    frame.position.set(fallback.x, .66, 9.87); frame.scaling.y = 2.84 / 2.4;
    void loadCinematicAsset('window-frame', frame).then(loaded => {
      if (!loaded) return;
      fallback.meshes.forEach(mesh => mesh.dispose());
      for (const mesh of frame.getChildMeshes()) if (mesh instanceof Mesh) wallFaces.push({ mesh, side: 'back' });
    });
  }
  const kitchenFallback = kitchenRoot.getChildMeshes();
  const cinematicKitchen = new TransformNode('modeled-kitchen', scene);
  cinematicKitchen.position.set(counterFixture.x, 0, counterFixture.z); cinematicKitchen.rotation.y = Math.PI;
  void loadCinematicAsset('kitchen', cinematicKitchen).then(loaded => { if (loaded) kitchenFallback.forEach(mesh => mesh.dispose()); });

  // Open storage shelving on the plaster wall; it must fade with the wall it hangs on.
  const cinematicShelf = new TransformNode('modeled-wall-shelf', scene);
  cinematicShelf.position.set(.02, 1.3, 7.86); cinematicShelf.rotation.y = -Math.PI / 2;
  void loadCinematicAsset('wall-shelf', cinematicShelf).then(loaded => {
    if (!loaded) return;
    for (const mesh of cinematicShelf.getChildMeshes()) if (mesh instanceof Mesh) wallFaces.push({ mesh, side: 'left' });
  });
  const armchairFixture = STATIC_FIXTURES.find(item => item.id === 'armchair')!;
  const cinematicArmchair = new TransformNode('modeled-armchair', scene);
  cinematicArmchair.position.set(armchairFixture.x, 0, armchairFixture.z); cinematicArmchair.rotation.y = -Math.PI * .62;
  void loadCinematicAsset('armchair', cinematicArmchair);
  const coffeeFixture = STATIC_FIXTURES.find(item => item.id === 'coffee-table')!;
  const cinematicCoffeeTable = new TransformNode('modeled-coffee-table', scene);
  cinematicCoffeeTable.position.set(coffeeFixture.x, 0, coffeeFixture.z);
  void loadCinematicAsset('coffee-table', cinematicCoffeeTable);

  function makeProp(object: LifeObject): PropRig {
    const root = new TransformNode(`object-${object.id}`, scene); root.metadata = { objectId: object.id };
    root.position.set(object.x, 0, object.z);
    const angle = Math.round(Math.atan2(object.x - object.approach.x, object.z - object.approach.z) / (Math.PI / 2)) * (Math.PI / 2);
    root.rotation.y = angle;
    const sideways = Math.abs(object.approach.x - object.x) > Math.abs(object.approach.z - object.z);
    const w = sideways ? object.depth : object.width; const d = sideways ? object.width : object.depth;
    const foot = (x: number, z: number, h = .2): void => { cylinder('turned-wood-foot', .045, h, [x, h / 2, z], wood, root); };
    if (object.kind === 'sofa') {
      box('sofa-plinth', [w - .13, .22, d - .1], [0, .23, 0], wood, root);
      box('sofa-back', [w, .74, .23], [0, .73, d / 2 - .12], upholstery, root);
      for (const sign of [-1, 1]) { box('rounded-arm', [.22, .49, d], [sign * (w / 2 - .11), .58, 0], upholstery, root); foot(sign * (w / 2 - .2), -.3); foot(sign * (w / 2 - .2), .3); }
      for (let i = 0; i < 3; i++) {
        box('seat-cushion', [(w - .5) / 3 - .025, .22, d - .3], [(i - 1) * (w - .5) / 3, .46, -.08], upholstery, root);
        const cushion = box('back-cushion', [(w - .55) / 3 - .035, .46, .2], [(i - 1) * (w - .5) / 3, .77, d / 2 - .27], upholstery, root); cushion.rotation.x = -.13;
      }
      const pillow = box('linen-throw-pillow', [.44, .42, .17], [-w * .3, .73, -.01], blanket, root); pillow.rotation.z = .21; pillow.rotation.x = -.15;
      const pillow2 = box('ochre-throw-pillow', [.39, .37, .16], [w * .3, .71, 0], cream, root); pillow2.rotation.z = -.17;
      box('draped-throw', [.43, .025, d * .82], [w * .22, .59, -.09], blanket, root);
      box('hanging-throw', [.43, .31, .025], [w * .22, .43, -d / 2 + .015], blanket, root);
    } else if (object.kind === 'bed') {
      box('walnut-bed-frame', [w, .27, d], [0, .28, 0], wood, root);
      box('upholstered-headboard', [w + .08, 1.03, .13], [0, .66, d / 2 - .05], blanket, root);
      box('deep-mattress', [w - .1, .23, d - .13], [0, .53, -.025], cream, root);
      box('linen-duvet', [w - .055, .105, d * .7], [0, .68, -d * .14], blanket, root);
      box('folded-coverlet', [w, .06, .44], [0, .755, -d * .23], accent, root);
      for (const sign of [-1, 1]) {
        foot(sign * w * .39, -d * .4); foot(sign * w * .39, d * .4);
        box('sleeping-pillow', [w * .4, .16, .47], [sign * w * .23, .73, d * .32], cream, root);
      }
      for (let i = -3; i <= 3; i++) box('duvet-seam', [.008, .004, d * .61], [i * w / 8, .735, -d * .13], cream, root, false);
    } else if (object.kind === 'fridge') {
      box('retro-fridge-body', [w * .93, 1.84, d * .93], [0, .96, 0], cream, root);
      box('freezer-door', [w * .88, .46, .08], [0, 1.59, -d * .49], cream, root);
      box('fridge-door', [w * .88, 1.23, .08], [0, .71, -d * .49], cream, root);
      box('freezer-handle', [.055, .22, .08], [-w * .31, 1.58, -d * .56], brass, root);
      box('fridge-handle', [.055, .48, .08], [-w * .31, 1.03, -d * .56], brass, root);
      box('fridge-note', [.22, .27, .014], [.16, 1.13, -d * .54], pink, root);
      sphere('note-magnet', [.045, .045, .025], [.16, 1.24, -d * .56], blue, root);
      box('freezer-seam', [w * .89, .018, .01], [0, 1.33, -d * .535], dark, root);
      plant(root, 0, 1.9, 0, .48);
    } else if (object.kind === 'table') {
      box('oak-dining-top', [w, .1, d], [0, .84, 0], wood, root);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box('tapered-table-leg', [.07, .77, .07], [sx * (w / 2 - .13), .41, sz * (d / 2 - .13)], wood, root);
      cylinder('ceramic-fruit-bowl', .18, .065, [.22, .93, .12], cream, root, .23);
      for (let i = 0; i < 4; i++) sphere('bowl-fruit', [.12, .12, .12], [.15 + (i % 2) * .12, 1, .07 + Math.floor(i / 2) * .1], i % 2 ? accent : brass, root);
      box('table-runner', [w * .28, .006, d * .97], [-w * .2, .897, 0], blanket, root);
      for (const sign of [-1, 1]) {
        const chair = new TransformNode('dining-chair', scene); chair.parent = root; chair.position.set(0, 0, sign * (d / 2 + .34)); chair.rotation.y = sign > 0 ? 0 : Math.PI;
        box('chair-seat', [.58, .09, .54], [0, .48, 0], wood, chair);
        box('chair-seat-pad', [.5, .055, .46], [0, .55, 0], blanket, chair);
        box('chair-back', [.58, .48, .08], [0, .81, .25], wood, chair);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cylinder('chair-leg', .032, .47, [sx * .23, .235, sz * .21], wood, chair);
      }
    } else if (object.kind === 'bookshelf') {
      const height = 2.15;
      box('shelf-back', [w, height, .045], [0, height / 2, d / 2], wood, root);
      for (const sign of [-1, 1]) box('shelf-upright', [.075, height, d], [sign * (w / 2 - .038), height / 2, 0], wood, root);
      for (let level = 0; level < 5; level++) {
        const y = .1 + level * .49;
        box('shelf-board', [w, .065, d], [0, y, 0], wood, root);
        if (level < 4) for (let b = 0; b < 7; b++) {
          const h = .25 + ((b * 13 + level * 7) % 12) / 100;
          const book = box('individual-book', [.075 + b % 2 * .02, h, d * .66], [-w * .37 + b * w * .108, y + h / 2 + .04, -.025], [blue, cream, accent, blanket, pink][(b + level) % 5]!, root);
          if (b === 6) book.rotation.z = -.17;
          box('book-spine-band', [.07, .014, .012], [book.position.x, y + h * .72, -d * .36], brass, root, false);
        }
      }
      plant(root, -w * .25, height + .04, 0, .47);
      cylinder('shelf-vase', .12, .27, [w * .25, height + .135, 0], cream, root, .065);
    } else if (object.kind === 'plant') {
      plant(root, 0, 0, 0, Math.min(w, d) * 1.25);
    } else if (object.kind === 'easel') {
      for (const sign of [-1, 1]) beam('easel-tripod', new Vector3(sign * .43, .03, -.26), new Vector3(sign * .22, 1.8, .07), .038, wood, root);
      beam('easel-rear-foot', new Vector3(0, .03, .43), new Vector3(0, 1.7, .07), .038, wood, root);
      box('easel-ledge', [.97, .075, .24], [0, .93, -.05], wood, root);
      box('stretched-canvas', [.84, .75, .065], [0, 1.34, 0], cream, root);
      const paintMat = material('in-progress-painting', '#ffffff');
      if (!paintMat.albedoTexture) paintMat.albedoTexture = texture('original-canvas-landscape', (ctx, n) => {
        ctx.fillStyle = '#dbcfae'; ctx.fillRect(0, 0, n, n); ctx.fillStyle = '#819c97'; ctx.fillRect(15, 15, n - 30, n * .62);
        ctx.fillStyle = '#edc879'; ctx.beginPath(); ctx.arc(n * .69, n * .3, n * .12, 0, 7); ctx.fill();
        ctx.fillStyle = '#496f61'; ctx.beginPath(); ctx.moveTo(15, n * .7); ctx.lineTo(n * .3, n * .43); ctx.lineTo(n * .53, n * .72); ctx.lineTo(n * .76, n * .48); ctx.lineTo(n - 15, n * .73); ctx.lineTo(n - 15, n - 15); ctx.lineTo(15, n - 15); ctx.fill();
        ctx.strokeStyle = '#d0926e'; ctx.lineWidth = n * .08; ctx.beginPath(); ctx.moveTo(n * .2, n); ctx.bezierCurveTo(n * .3, n * .7, n * .7, n * .86, n * .65, n * .68); ctx.stroke();
      }, 256);
      box('painted-landscape', [.78, .69, .007], [0, 1.34, -.038], paintMat, root);
      box('studio-canvas-study', [.78, .69, .007], [0, 1.34, .038], paintMat, root);
      cylinder('paint-water-cup', .065, .13, [.34, 1.04, -.11], blue, root);
    } else if (object.kind === 'coffee') {
      box('coffee-console-top', [w, .08, d], [0, .85, 0], wood, root);
      for (const sign of [-1, 1]) box('console-side', [.08, .79, d * .84], [sign * (w / 2 - .06), .43, 0], wood, root);
      box('coffee-machine', [.43, .38, .34], [0, 1.09, .02], dark, root);
      box('espresso-face', [.36, .26, .018], [0, 1.1, -.165], brass, root);
      box('drip-tray', [.39, .035, .23], [0, .92, -.14], dark, root);
      cylinder('coffee-cup', .075, .12, [0, 1.005, -.2], cream, root);
      sphere('espresso-button', [.03, .03, .02], [.12, 1.17, -.181], glow, root, false);
      cylinder('coffee-tin', .085, .2, [w * .33, 1, 0], cream, root);
      box('console-bottom-shelf', [w - .1, .06, d * .85], [0, .2, 0], wood, root);
      for (let i = 0; i < 3; i++) box('stacked-magazine', [.36, .035, .26], [-.1, .255 + i * .04, 0], [accent, cream, blue][i]!, root);
    }
    const originalPosition = root.position.clone(), originalRotation = root.rotation.clone();
    root.position.setAll(0); root.rotation.setAll(0); root.computeWorldMatrix(true);
    const groups = new Map<PBRMaterial, Mesh[]>();
    for (const mesh of root.getChildMeshes()) {
      if (!(mesh instanceof Mesh) || !(mesh.material instanceof PBRMaterial)) continue;
      mesh.computeWorldMatrix(true);
      const group = groups.get(mesh.material) ?? []; group.push(mesh); groups.set(mesh.material, group);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const merged = Mesh.MergeMeshes(group, true, true, undefined, false, false);
      if (merged) { merged.parent = root; merged.receiveShadows = true; shadows.addShadowCaster(merged); }
    }
    root.position.copyFrom(originalPosition); root.rotation.copyFrom(originalRotation);
    const file = object.kind === 'sofa' ? 'sofa' : object.kind === 'bed' ? 'bed' : object.kind === 'table' ? 'dining-table' : object.kind === 'fridge' ? 'fridge' : object.kind === 'bookshelf' ? 'bookshelf' : null;
    if (file) {
      const fallback = root.getChildMeshes();
      void loadCinematicAsset(file, root).then(loaded => {
        if (loaded) fallback.forEach(mesh => mesh.dispose());
        if (loaded && object.kind === 'table') for (const sign of [-1, 1]) {
          const chair = new TransformNode('cinematic-dining-chair', scene); chair.parent = root;
          chair.position.set(0, 0, sign * (d / 2 + .34)); chair.rotation.y = sign > 0 ? 0 : Math.PI;
          void loadCinematicAsset('dining-chair', chair, object.id);
        }
      });
    }
    // Tag all descendants, including nested chair/plant pieces, for object ray picks.
    for (const mesh of root.getChildMeshes()) { mesh.metadata = { objectId: object.id }; mesh.isPickable = true; }
    return { root, signature: `${object.kind}:${object.width}:${object.depth}:${object.x}:${object.z}` };
  }

  function softenCharacterNormals(mesh: AbstractMesh): void {
    if (!(mesh instanceof Mesh)) return;
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind), indices = mesh.getIndices();
    if (!positions || !indices) return;
    const normals: number[] = []; VertexData.ComputeNormals(positions, indices, normals);
    const shared = new Map<string, { sum: Vector3; vertices: number[] }>();
    for (let i = 0; i < positions.length; i += 3) {
      const key = `${Math.round(positions[i]! * 1e5)}:${Math.round(positions[i + 1]! * 1e5)}:${Math.round(positions[i + 2]! * 1e5)}`;
      const group = shared.get(key) ?? { sum: Vector3.Zero(), vertices: [] };
      group.sum.addInPlace(new Vector3(normals[i], normals[i + 1], normals[i + 2])); group.vertices.push(i); shared.set(key, group);
    }
    for (const group of shared.values()) {
      group.sum.normalize();
      for (const i of group.vertices) { normals[i] = group.sum.x; normals[i + 1] = group.sum.y; normals[i + 2] = group.sum.z; }
    }
    mesh.setVerticesData(VertexBuffer.NormalKind, normals);
  }

  function makePerson(resident: LifeResident, index: number): PersonRig {
    const root = new TransformNode(`resident-${resident.id}`, scene); root.metadata = { residentId: resident.id }; root.position.set(resident.x, 0, resident.z);
    const hips = new TransformNode('animated-pelvis', scene); hips.parent = root;
    const skin = material(`skin-${resident.id}`, resident.skin);
    const hair = material(`hair-${resident.id}`, resident.hair);
    const shirt = material(`clothing-${resident.id}`, resident.color);
    const pants = material(`trousers-${resident.id}`, index === 1 ? '#737f72' : index === 2 ? '#5a4c56' : '#344954');
    const shoes = material(`shoes-${resident.id}`, index === 1 ? '#d8c9b3' : '#463932');
    const torso = sphere('tailored-shirt', [.49, .62, .29], [0, 1.04, 0], shirt, hips);
    box('shirt-hem', [.4, .1, .27], [0, .79, 0], shirt, hips);
    cylinder('neck', .078, .16, [0, 1.4, 0], skin, hips);
    const head = new TransformNode('expressive-head', scene); head.parent = hips; head.position.set(0, 1.56, 0);
    sphere('face', [.33, .39, .31], [0, .01, 0], skin, head);
    sphere('hair-crown', [.35, .23, .33], [0, .16, .015], hair, head);
    for (const sign of [-1, 1]) {
      sphere('ear', [.065, .105, .075], [sign * .166, 0, .015], skin, head);
      sphere('eye-white', [.069, .05, .018], [sign * .067, .03, -.148], cream, head, false);
      sphere('eye-iris', [.026, .032, .014], [sign * .066, .03, -.16], dark, head, false);
      const brow = box('eyebrow', [.069, .012, .016], [sign * .067, .081, -.15], hair, head, false); brow.rotation.z = sign * -.09;
    }
    sphere('nose', [.052, .07, .06], [0, -.015, -.16], skin, head);
    box('smile', [.06, .011, .016], [0, -.086, -.147], accent, head, false);
    if (index % 3 === 0) {
      for (let i = 0; i < 5; i++) { const lock = sphere('swept-hair', [.11, .13, .21], [-.13 + i * .06, .18 + Math.sin(i) * .025, -.09], hair, head); lock.rotation.z = -.4; }
    } else if (index % 3 === 1) {
      sphere('hair-bun', [.24, .24, .21], [0, .23, .18], hair, head);
      for (const sign of [-1, 1]) sphere('side-hair', [.07, .25, .16], [sign * .14, .06, .05], hair, head);
      sphere('gold-earring', [.027, .052, .018], [-.19, -.055, -.005], brass, head);
      sphere('gold-earring', [.027, .052, .018], [.19, -.055, -.005], brass, head);
    } else {
      for (let i = 0; i < 8; i++) sphere('curly-hair', [.14, .15, .15], [Math.sin(i * 2.4) * .13, .17 + i % 2 * .025, Math.cos(i * 2.4) * .1], hair, head);
    }
    const arms: TransformNode[] = []; const forearms: TransformNode[] = []; const legs: TransformNode[] = []; const shins: TransformNode[] = [];
    for (const sign of [-1, 1]) {
      const arm = new TransformNode('shoulder-joint', scene); arm.parent = hips; arm.position.set(sign * .25, 1.26, 0); arms.push(arm);
      sphere('shirt-sleeve', [.2, .25, .21], [sign * .014, -.09, 0], shirt, arm);
      cylinder('upper-arm', .064, .23, [0, -.19, 0], skin, arm);
      const elbow = new TransformNode('elbow-joint', scene); elbow.parent = arm; elbow.position.set(0, -.3, 0); forearms.push(elbow);
      sphere('forearm', [.115, .26, .12], [0, -.12, 0], skin, elbow);
      sphere('hand', [.1, .14, .07], [0, -.27, -.015], skin, elbow);
      const leg = new TransformNode('hip-joint', scene); leg.parent = hips; leg.position.set(sign * .115, .79, 0); legs.push(leg);
      cylinder('trouser-thigh', .104, .36, [0, -.18, 0], pants, leg, .112);
      const knee = new TransformNode('knee-joint', scene); knee.parent = leg; knee.position.set(0, -.36, 0); shins.push(knee);
      cylinder('trouser-shin', .072, .32, [0, -.16, 0], pants, knee, .095);
      sphere('sneaker', [.18, .13, .29], [0, -.345, -.065], shoes, knee);
      box('shoe-sole', [.18, .035, .25], [0, -.387, -.065], cream, knee);
    }
    // Props are hand-bound and appear only during an activity.
    const book = box('open-book', [.37, .055, .25], [0, .91, -.35], cream, hips); book.rotation.x = -.45;
    const cup = cylinder('held-ceramic-cup', .062, .13, [0, -.3, -.04], cream, forearms[1]);
    const brush = cylinder('held-paintbrush', .01, .3, [0, -.27, -.1], wood, forearms[1]); brush.rotation.x = Math.PI / 2;
    book.isVisible = false; cup.isVisible = false; brush.isVisible = false;
    for (const mesh of root.getChildMeshes()) { mesh.metadata = { residentId: resident.id }; mesh.isPickable = true; }
    const ring = MeshBuilder.CreateTorus('controlled-resident-ring', { diameter: .64, thickness: .025, tessellation: 48 }, scene);
    ring.position.y = .025; ring.parent = root; ring.material = material('player-ring', '#f8e3ae'); ring.isPickable = false;
    (ring.material as PBRMaterial).emissiveColor = c3('#dfbb74').scale(.32); ring.isVisible = resident.role === 'player';
    torso.receiveShadows = true;
    const rig: PersonRig = { root, hips, head, arms, forearms, legs, shins, book, cup, brush, ring, phase: index * 2, trail: createTrail() };
    const fallbackMeshes = hips.getChildMeshes();
    const file = index === 1 ? 'casual-woman.glb' : index === 2 ? 'hoodie-man.glb' : 'casual-man.glb';
    const characterLoad = SceneLoader.ImportMeshAsync('', '/life-assets/', file, scene).then(result => {
      if (disposed || root.isDisposed()) { result.meshes.forEach(mesh => mesh.dispose()); result.animationGroups.forEach(group => group.dispose()); return; }
      const model = new TransformNode(`skinned-${resident.id}`, scene); model.parent = hips; model.scaling.setAll(.96); model.rotation.y = Math.PI;
      for (const mesh of result.meshes) {
        if (!mesh.parent) mesh.parent = model;
        mesh.metadata = { residentId: resident.id }; mesh.isPickable = true; mesh.receiveShadows = true;
        shadows.addShadowCaster(mesh);
        const mat = mesh.material;
        if (mat instanceof PBRMaterial) {
          mat.metallic = 0; mat.roughness = .88;
          const name = mat.name;
          if (name.startsWith('Skin') || name.startsWith('Hair')) softenCharacterNormals(mesh);
          mat.maxSimultaneousLights = 8; mat.environmentIntensity = .6;
          if (name === 'Skin' || name === 'Skin_Darker') mat.albedoColor = c3(resident.skin).toLinearSpace().scale(name === 'Skin_Darker' ? .84 : 1);
          else if (name.startsWith('Hair') || name === 'Eyebrows') mat.albedoColor = c3(resident.hair).toLinearSpace();
          else if ((index < 2 && name === 'White') || (index === 2 && name === 'Purple')) mat.albedoColor = c3(resident.color).toLinearSpace();
        }
      }
      for (const group of result.animationGroups) group.stop();
      for (const mesh of fallbackMeshes) mesh.isVisible = false;
      rig.model = model; rig.clips = result.animationGroups;
      rig.bones = new Map(result.skeletons[0]?.bones.flatMap(bone => { const node = bone.getTransformNode(); return node ? [[bone.name, node] as const] : []; }) ?? []);
      const idle = rig.clips.find(group => group.name === 'Idle_Neutral') ?? rig.clips.find(group => group.name === 'Idle');
      idle?.start(true); rig.clip = idle?.name;
    }).catch(error => { failedAssets.add(file); console.warn(`Character asset ${file} unavailable; using articulated resident.`, error); });
    pendingAssets.push(characterLoad);
    return rig;
  }

  const destination = MeshBuilder.CreateTorus('destination-marker', { diameter: .55, thickness: .018, tessellation: 40 }, scene);
  destination.material = material('destination-ivory', '#fff1c9'); destination.isPickable = false; destination.isVisible = false;
  let destinationLife = 0;
  const hover = MeshBuilder.CreateTorus('hover-ring', { diameter: 1, thickness: .018, tessellation: 48 }, scene);
  hover.material = material('hover-gold', '#e7c994'); hover.isPickable = false; hover.isVisible = false;

  function objectOrResident(mesh: AbstractMesh | null): { objectId?: string; residentId?: string; ground?: boolean } | null {
    let node: TransformNode | null = mesh;
    while (node) { if (node.metadata?.objectId || node.metadata?.residentId || node.metadata?.ground) return node.metadata; node = node.parent as TransformNode | null; }
    return null;
  }
  const pointerObserver = scene.onPointerObservable.add(info => {
    if (info.type === PointerEventTypes.POINTERDOWN) { lastDown = { x: scene.pointerX, y: scene.pointerY }; return; }
    if (info.type === PointerEventTypes.POINTERMOVE) {
      const tag = objectOrResident(info.pickInfo?.pickedMesh as Mesh | null);
      const object = current?.objects.find(o => o.id === tag?.objectId);
      const resident = current?.residents.find(r => r.id === tag?.residentId);
      canvas.style.cursor = tag?.objectId || tag?.residentId ? 'pointer' : 'grab';
      hover.isVisible = Boolean(object || resident);
      if (object || resident) { const p = object ?? people.get(resident!.id)?.root.position ?? resident!; hover.position.set(p.x, .03, p.z); hover.scaling.setAll(object ? Math.max(object.width, object.depth) + .15 : .8); }
      return;
    }
    if (info.type !== PointerEventTypes.POINTERUP || (info.event as PointerEvent).button !== 0) return;
    if (Math.hypot(scene.pointerX - lastDown.x, scene.pointerY - lastDown.y) > 7) return;
    const pick = scene.pick(scene.pointerX, scene.pointerY);
    if (!pick?.hit) return;
    const tag = objectOrResident(pick.pickedMesh);
    const rect = canvas.getBoundingClientRect(); const screen = { x: rect.left + scene.pointerX, y: rect.top + scene.pointerY };
    if (tag?.residentId) hooks.onResident(tag.residentId, screen);
    else if (tag?.objectId) hooks.onObject(tag.objectId, screen);
    else if (tag?.ground && pick.pickedPoint) {
      const point = { x: pick.pickedPoint.x, z: pick.pickedPoint.z }; hooks.onGround(point);
      destination.position.set(point.x, .035, point.z); destination.isVisible = true; destinationLife = 1;
    }
  });

  function applyTheme(next: LifeTheme): void {
    theme = next; const palette = PALETTES[next];
    lanternDecor.setEnabled(next === 'lantern'); comicDecor.setEnabled(next === 'comic');
    for (const item of themed) item.mat.albedoColor = c3(palette[item.key]).toLinearSpace();
    atmosphere.setTheme(next);
    // Every preset keeps the raking warm key; only its tint and strength shift.
    sun.diffuse = c3(next === 'lantern' ? '#ffab6a' : next === 'comic' ? '#ffd7a0' : '#ffc186');
    sun.intensity = next === 'lantern' ? 2.1 : next === 'comic' ? 3 : 2.7;
    fill.diffuse = c3(next === 'lantern' ? '#8b97ce' : '#8fb2dd');
    fill.groundColor = c3(next === 'lantern' ? '#5d3f34' : '#6b4b33');
    fill.intensity = next === 'lantern' ? .11 : .13;
    scene.imageProcessingConfiguration.contrast = next === 'comic' ? 1.42 : 1.24;
  }

  function animatePerson(resident: LifeResident, rig: PersonRig, dt: number): void {
    const activity = resident.activity;
    const doing = activity?.phase === 'doing';
    const walking = activity?.phase === 'walking';
    const kind = doing ? activity.kind : null;
    const object = current?.objects.find(o => o.id === activity?.targetId);
    let x = resident.x; let z = resident.z; let y = 0; let tilt = 0;
    let facing = resident.facing + Math.PI;
    if (kind === 'sleep' && object) { facing = Math.atan2(object.x - object.approach.x, object.z - object.approach.z); x = object.x - Math.sin(facing) * .48; z = object.z - Math.cos(facing) * .48; y = .86; tilt = Math.PI / 2; }
    else if (kind === 'relax' && object?.kind === 'sofa') { x = object.x; z = object.z - .24; y = -.12; facing = 0; }
    else if (kind === 'eat' && object?.kind === 'table') { x = object.x; z = object.z + object.depth / 2 + .34; y = -.12; facing = 0; }
    else if (doing && object) facing = Math.atan2(resident.x - object.x, resident.z - object.z);
    else if (doing && activity?.targetId) {
      const target = current?.residents.find(r => r.id === activity.targetId);
      if (target) facing = Math.atan2(resident.x - target.x, resident.z - target.z);
    }
    const weight = 1 - Math.exp(-dt * 12);
    // Server positions land about every 250ms. Chasing them exponentially converges well inside
    // one poll window and then stalls until the next, which reads as a stutter. Pursue at the
    // simulation's own walking pace instead, with a catch-up term, so motion stays continuous.
    // A posed activity pins the body to the furniture, so ease to it. Otherwise play the recorded
    // trail back slightly delayed, which keeps every frame between two reported positions.
    const posed = x !== resident.x || z !== resident.z;
    const played = posed ? null : sample(rig.trail, simElapsedNow());
    const goalX = played ? played.x : x, goalZ = played ? played.z : z;
    const dx = goalX - rig.root.position.x, dz = goalZ - rig.root.position.z;
    const gap = Math.hypot(dx, dz);
    let travelled = 0;
    if (gap > SNAP_DISTANCE) { rig.root.position.x = goalX; rig.root.position.z = goalZ; }
    else if (played) {
      travelled = gap;
      rig.root.position.x = goalX; rig.root.position.z = goalZ;
    } else if (gap > 1e-4) {
      travelled = Math.min(gap, gap * weight);
      rig.root.position.x += dx / gap * travelled;
      rig.root.position.z += dz / gap * travelled;
    }
    rig.root.position.y += (y - rig.root.position.y) * weight;
    rig.hips.rotation.x += (tilt - rig.hips.rotation.x) * weight;
    rig.root.rotation.y = mixAngle(rig.root.rotation.y, facing, 1 - Math.exp(-dt * 8));
    // Advancing the stride on a timer makes the feet skate whenever the body is not moving at
    // exactly that rate. Drive it from distance actually covered so the contact stays planted.
    rig.phase += walking ? travelled * STRIDE_PER_METRE : dt * 1.7 * (current?.speed === 0 ? 0 : 1);
    const stride = walking ? Math.sin(rig.phase) * .55 : 0;
    rig.hips.position.y = walking ? Math.abs(Math.sin(rig.phase)) * .045 : Math.sin(rig.phase) * .009;
    rig.hips.rotation.z = walking ? Math.sin(rig.phase) * .025 : 0;
    const seated = kind === 'relax' || (kind === 'eat' && object?.kind === 'table');
    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? 1 : -1;
      let arm = -stride * sign * .65; let elbow = -.09; let leg = stride * sign; let knee = walking ? Math.max(0, -Math.sin(rig.phase) * sign) * .75 : 0;
      if (seated) { leg = 1.4; knee = -1.4; arm = -.16; elbow = -.25; }
      if (kind === 'read') { arm = -1; elbow = -.7; }
      if (kind === 'eat' || kind === 'coffee') { arm = i ? -.45 - Math.max(0, Math.sin(rig.phase)) * .5 : -.12; elbow = i ? -1.1 : -.12; }
      if (kind === 'paint') { arm = i ? -1 + Math.sin(rig.phase * 2) * .14 : -.05; elbow = i ? -.4 : -.12; }
      if (kind === 'water') { arm = i ? -.8 : -.15; elbow = -.3; }
      if (kind && ['chat', 'share', 'compliment', 'apologize', 'insult'].includes(kind)) { arm = i ? -.3 - Math.sin(rig.phase * 1.2) * .25 : -.1; elbow = i ? -.8 : -.15; }
      if (kind === 'sleep') { arm = .06; elbow = -.35; leg = 0; knee = .05; }
      rig.arms[i]!.rotation.x += (arm - rig.arms[i]!.rotation.x) * weight;
      rig.forearms[i]!.rotation.x += (elbow - rig.forearms[i]!.rotation.x) * weight;
      rig.legs[i]!.rotation.x += (leg - rig.legs[i]!.rotation.x) * weight;
      rig.shins[i]!.rotation.x += (knee - rig.shins[i]!.rotation.x) * weight;
      rig.arms[i]!.rotation.z = (i ? -.07 : .07) + (kind === 'paint' && i ? -.12 : 0);
    }
    rig.head.rotation.y = walking ? 0 : Math.sin(rig.phase * .35) * .08;
    rig.head.rotation.x = kind === 'read' ? .25 : kind === 'sleep' ? -.05 : Math.sin(rig.phase * .7) * .025;
    rig.book.isVisible = kind === 'read'; rig.cup.isVisible = !rig.model && (kind === 'coffee' || kind === 'eat' || kind === 'water'); rig.brush.isVisible = !rig.model && kind === 'paint';
    if (rig.clips) {
      const name = walking ? 'Walk' : kind && ['paint', 'water', 'coffee', 'eat'].includes(kind) ? 'Interact' : kind && ['chat', 'share', 'compliment'].includes(kind) ? 'Wave' : 'Idle_Neutral';
      if (rig.clip !== name) { rig.clips.forEach(group => group.stop()); rig.clips.find(group => group.name === name)?.start(true); rig.clip = name; }
      const active = rig.clips.find(group => group.name === rig.clip);
      // Match the clip to the pace actually being travelled rather than a fixed ratio.
      if (active) active.speedRatio = current?.speed === 0 ? 0 : walking ? Math.min(2.2, .35 + travelled / Math.max(dt, 1e-4) * .62) : .72;
    }
    rig.ring.isVisible = resident.id === focused || resident.role === 'player';
    rig.ring.rotation.y += dt * .12;
  }

  // Imported clips drive locomotion. Procedural joint overrides supply absent seated/read poses.
  scene.onAfterAnimationsObservable.add(() => {
    if (!current) return;
    for (const resident of current.residents) {
      const rig = people.get(resident.id); const kind = resident.activity?.phase === 'doing' ? resident.activity.kind : null;
      if (!rig?.bones) continue;
      const axis = new Vector3(Math.cos(rig.root.rotation.y), 0, -Math.sin(rig.root.rotation.y));
      const pose = (name: string, angle: number): void => {
        const node = rig.bones?.get(name); if (!node) return;
        node.parent?.computeWorldMatrix(true); node.rotate(axis.clone(), angle, Space.WORLD); node.computeWorldMatrix(true);
      };
      if (kind === 'relax' || (kind === 'eat' && current.objects.find(object => object.id === resident.activity?.targetId)?.kind === 'table')) { pose('UpperLeg.L', 1.35); pose('UpperLeg.R', 1.35); pose('LowerLeg.L', -1.35); pose('LowerLeg.R', -1.35); }
      if (kind === 'read') { pose('UpperArm.L', .9); pose('UpperArm.R', .9); pose('LowerArm.L', .8); pose('LowerArm.R', .8); }
    }
  });
  const resize = (): void => {
    engine.resize();
    // Keep the entire dollhouse readable in portrait layouts without changing camera controls.
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    camera.fov = aspect < 1 ? 1.05 : .8;
    const horizontalHalfAngle = Math.atan(Math.tan(camera.fov / 2) * aspect);
    // Fit the home's bounding sphere to the narrower horizontal field on phones.
    orbitRadius = Math.max(15.4, 8.3 / Math.sin(horizontalHalfAngle) * 1.04);
    camera.upperRadiusLimit = Math.max(26, orbitRadius * 1.5);
    if (cameraMode === 'orbit') camera.radius = orbitRadius;
  };
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
  window.addEventListener('resize', resize);
  engine.runRenderLoop(() => {
    if (disposed) return;
    const now = performance.now();
    if (document.visibilityState === 'visible' && now >= metricWarmupUntil) {
      if (previousFrame > 0) {
        const frameTime = now - previousFrame;
        if (frameTime > 0) { frameTimes.push(frameTime); if (frameTimes.length > 600) frameTimes.shift(); }
      }
      previousFrame = now;
      if (now - previousMetric > 1000 && frameTimes.length > 30) {
        const sorted = [...frameTimes].sort((a, b) => a - b), elapsed = frameTimes.reduce((sum, value) => sum + value, 0);
        const median = sorted[Math.floor(sorted.length * .5)]!, p95 = sorted[Math.floor(sorted.length * .95)]!;
        const fps = +(frameTimes.length * 1000 / elapsed).toFixed(1);
        canvas.dataset.scenePerformance = JSON.stringify({
          frames: frameTimes.length + 1, windowMs: +elapsed.toFixed(1), medianMs: +median.toFixed(2), p95Ms: +p95.toFixed(2),
          maxMs: +sorted[sorted.length - 1]!.toFixed(2), stallCount: frameTimes.filter(value => value > 50).length,
          fps, averageFps: fps, width: engine.getRenderWidth(), height: engine.getRenderHeight(),
          meshes: scene.meshes.length, activeMeshes: scene.getActiveMeshes().length,
        });
        previousMetric = now;
      }
    } else previousFrame = 0;
    const dt = Math.min(engine.getDeltaTime() / 1000, .06); clock += dt;
    if (current) for (const resident of current.residents) { const rig = people.get(resident.id); if (rig) animatePerson(resident, rig, dt); }
    if (cameraMode === 'follow' && focused) { const rig = people.get(focused); if (rig) camera.target = Vector3.Lerp(camera.target, rig.root.position.add(new Vector3(0, .8, 0)), 1 - Math.exp(-dt * 3)); }
    // Cut away either wall whenever orbiting behind it, preserving readable residents.
    for (const face of wallFaces) face.mesh.visibility = (face.side === 'back' ? camera.position.z > 9.9 : camera.position.x < .1) ? .055 : 1;
    if (destinationLife > 0) { destinationLife -= dt; destination.scaling.setAll(1 + (1 - destinationLife) * .35); destination.visibility = Math.max(0, destinationLife); } else destination.isVisible = false;
    hover.rotation.y = clock * .1;
    scene.render();
  });

  return {
    ready,
    update(state) {
      current = state;
      if (state.theme !== theme) applyTheme(state.theme);
      const objectIds = new Set(state.objects.map(o => o.id));
      for (const [id, prop] of props) if (!objectIds.has(id)) { prop.root.dispose(false, false); props.delete(id); }
      for (const object of state.objects) {
        const signature = `${object.kind}:${object.width}:${object.depth}:${object.x}:${object.z}`;
        const old = props.get(object.id);
        if (!old || old.signature !== signature) { old?.root.dispose(false, false); props.set(object.id, makeProp(object)); }
      }
      const residentIds = new Set(state.residents.map(r => r.id));
      for (const [id, person] of people) if (!residentIds.has(id)) { person.root.dispose(false, false); people.delete(id); }
      state.residents.forEach((resident, index) => { if (!people.has(resident.id)) people.set(resident.id, makePerson(resident, index)); });
      // Key each reported position to the simulation clock, not arrival time. A resident advances
      // exactly 1.7m per simulated second, but a 250ms poll catches two or three ~100ms server
      // ticks, so wall-clock samples arrive 0.51m, 0.51m, 0.35m apart. Interpolating those on
      // arrival time reproduces that pulse; interpolating on sim time is exactly linear.
      simClock = { elapsedMs: state.elapsed * 1000, at: performance.now(), speed: state.speed };
      for (const resident of state.residents) { const rig = people.get(resident.id); if (rig) record(rig.trail, simClock.elapsedMs, resident.x, resident.z); }
      void prepareFirstFrame();
      if (!focused || !residentIds.has(focused)) focused = state.residents.find(r => r.role === 'player')?.id ?? state.residents[0]?.id ?? '';
    },
    movementDirection(horizontal, vertical) {
      const forward = camera.getForwardRay().direction;
      const length = Math.hypot(forward.x, forward.z);
      if (length < .0001) return { x: 0, z: 0 };
      const fx = forward.x / length, fz = forward.z / length;
      const x = fz * horizontal - fx * vertical;
      const z = -fx * horizontal - fz * vertical;
      const magnitude = Math.hypot(x, z);
      return magnitude > 0 ? { x: x / magnitude, z: z / magnitude } : { x: 0, z: 0 };
    },
    focusResident(id) {
      focused = id; const person = people.get(id);
      if (person) camera.setTarget(person.root.position.add(new Vector3(0, .85, 0)));
    },
    setCamera(mode) {
      cameraMode = mode;
      if (mode === 'follow') { camera.radius = 8; camera.beta = 1.15; }
      else { camera.radius = orbitRadius; camera.beta = ORBIT_BETA; camera.setTarget(ROOM_FOCUS.clone()); }
    },
    projectResident(id) {
      const person = people.get(id); if (!person) return null;
      const point = Vector3.Project(person.root.position.add(new Vector3(0, 2.08, 0)), Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
      const rect = canvas.getBoundingClientRect();
      return { x: rect.left + point.x * rect.width / engine.getRenderWidth(), y: rect.top + point.y * rect.height / engine.getRenderHeight(), visible: point.z >= 0 && point.z <= 1 && point.x >= 0 && point.x <= engine.getRenderWidth() && point.y >= 0 && point.y <= engine.getRenderHeight() };
    },
    dispose() {
      disposed = true; clearTimeout(readyTimeout); settleReady(); document.removeEventListener('visibilitychange', resetMetrics); resizeObserver.disconnect(); window.removeEventListener('resize', resize);
      scene.onPointerObservable.remove(pointerObserver); engine.stopRenderLoop(); scene.dispose(); engine.dispose();
    },
  };
}
