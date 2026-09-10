import {
  ArcRotateCamera, Color3, Color4, DefaultRenderingPipeline, HDRCubeTexture,
  Mesh, MeshBuilder, PBRMaterial, PointLight, Scene, SSAO2RenderingPipeline,
  Texture, TransformNode, Vector3,
} from '@babylonjs/core';
import type { LifeTheme } from '../../shared/life-types';

const color = (hex: string): Color3 => Color3.FromHexString(hex);

/** Poly Haven maps remain separate linear ORM/normal and sRGB albedo inputs. */
export function applyScannedMaterial(material: PBRMaterial, id: string, scene: Scene, scale = 1, onError: (asset: string) => void = () => {}): void {
  const base = `/life-assets/materials/${id}`;
  const map = (name: string, gamma: boolean): Texture => {
    const url = `${base}/${name}.jpg`;
    const result = new Texture(url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE, null, () => onError(url));
    result.gammaSpace = gamma; result.uScale = scale; result.vScale = scale;
    result.anisotropicFilteringLevel = 8;
    return result;
  };
  material.albedoTexture?.dispose();
  material.albedoTexture = id === 'rough_linen' ? null : map('albedo', true);
  material.bumpTexture = map('normal', false); material.bumpTexture.level = id === 'rough_linen' ? .32 : .65;
  material.metallicTexture = map('arm', false);
  material.useAmbientOcclusionFromMetallicTextureRed = true;
  material.useRoughnessFromMetallicTextureGreen = true;
  material.useMetallnessFromMetallicTextureBlue = true;
  material.useRoughnessFromMetallicTextureAlpha = false;
  material.metallic = 0;
  material.roughness = 1;
}

export function createCinematicAtmosphere(scene: Scene, camera: ArcRotateCamera, onAssetError: (asset: string) => void): { setTheme(theme: LifeTheme): void } {
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = .023;
  scene.fogColor = color('#2c4058');
  const environment = new HDRCubeTexture('/life-assets/materials/environment.hdr', scene, 128, false, true, false, true, null, () => onAssetError('/life-assets/materials/environment.hdr'));
  scene.environmentTexture = environment; scene.environmentIntensity = .45;
  const pipeline = new DefaultRenderingPipeline('cinematic-finishing', true, scene, [camera]);
  pipeline.fxaaEnabled = true;
  pipeline.samples = 2;
  pipeline.bloomEnabled = true; pipeline.bloomThreshold = 1.15; pipeline.bloomWeight = .11; pipeline.bloomKernel = 48; pipeline.bloomScale = .35;
  pipeline.sharpenEnabled = true; pipeline.sharpen.edgeAmount = .16; pipeline.sharpen.colorAmount = 1;
  scene.imageProcessingConfiguration.toneMappingType = 1;
  const ao = new SSAO2RenderingPipeline('furniture-contact-shading', scene, { ssaoRatio: .5, blurRatio: .5 }, [camera]);
  ao.radius = .75; ao.totalStrength = .8; ao.samples = 8; ao.expensiveBlur = false;
  ao.maxZ = 55; ao.minZAspect = .1;

  const root = new TransformNode('blue-hour-city', scene);
  const facade = new PBRMaterial('city-aged-brick', scene);
  facade.albedoColor = color('#6c7078').toLinearSpace(); facade.roughness = .94; facade.metallic = 0;
  applyScannedMaterial(facade, 'brick_wall_001', scene, 3, onAssetError);
  const stone = new PBRMaterial('city-limestone-trim', scene);
  stone.albedoColor = color('#65707b').toLinearSpace(); stone.roughness = .86; stone.metallic = 0;
  const dark = new PBRMaterial('city-window-unlit', scene);
  dark.albedoColor = color('#162332').toLinearSpace(); dark.roughness = .22; dark.metallic = .2;
  const warm = new PBRMaterial('city-window-lit', scene);
  warm.albedoColor = color('#8d775e').toLinearSpace(); warm.emissiveColor = color('#c4965a').toLinearSpace().scale(.22); warm.roughness = .5;
  const blue = new PBRMaterial('city-window-blue', scene);
  blue.albedoColor = color('#759bb8').toLinearSpace(); blue.emissiveColor = color('#426b91').toLinearSpace().scale(.12); blue.roughness = .35;
  const ground = new PBRMaterial('city-rooftop-ground', scene);
  ground.albedoColor = color('#182637').toLinearSpace(); ground.roughness = .83;
  const batches = new Map<PBRMaterial, Mesh[]>();
  function box(name: string, dims: [number, number, number], position: [number, number, number], mat: PBRMaterial): Mesh {
    const mesh = MeshBuilder.CreateBox(name, { width: dims[0], height: dims[1], depth: dims[2] }, scene);
    mesh.position.set(...position); mesh.material = mat; mesh.parent = root; mesh.isPickable = false;
    const group = batches.get(mat) ?? []; group.push(mesh); batches.set(mat, group);
    return mesh;
  }
  box('surrounding-roofscape', [78, .3, 74], [6, -7, 17], ground);
  // The home belongs to a building: brickwork, window bays and a cornice replace a floating slab.
  box('home-building-storey', [12.35, 5.5, 10.35], [6, -2.95, 5], facade);
  box('home-cornice', [12.6, .15, 10.6], [6, -.28, 5], stone);
  for (let x = .65; x < 12; x += 1.45) {
    box('lower-floor-window-frame', [.95, 1.8, .1], [x, -2.05, -.21], stone);
    box('lower-floor-window', [.79, 1.6, .12], [x, -2.05, -.28], Math.floor(x * 5) % 3 ? warm : dark);
  }
  function building(x: number, z: number, width: number, height: number, depth: number, seed: number): void {
    const floorY = -6.8;
    box('neighborhood-building', [width, height, depth], [x, floorY + height / 2, z], facade);
    box('roof-coping', [width + .2, .16, depth + .2], [x, floorY + height, z], stone);
    box('roof-equipment', [.85, .5, .9], [x + .3, floorY + height + .3, z], dark);
    const rows = Math.floor((height - 1) / 1.6), columns = Math.floor(width / 1.2);
    for (let row = 0; row < rows; row++) {
      const y = floorY + 1.15 + row * 1.6;
      box('building-floor-course', [width + .05, .06, .08], [x, y + .65, z - depth / 2 - .025], stone);
      for (let col = 0; col < columns; col++) {
        const wx = x - width / 2 + .65 + col * (width - 1) / Math.max(1, columns - 1);
        const pick = (row * 19 + col * 13 + seed * 7) % 11;
        box('recessed-city-window', [.5, .88, .055], [wx, y, z - depth / 2 - .04], pick < 3 ? warm : pick === 8 ? blue : dark);
        box('city-window-sill', [.75, .05, .12], [wx, y - .52, z - depth / 2 - .09], stone);
        box('city-window-mullion', [.025, 1, .03], [wx, y, z - depth / 2 - .08], stone);
      }
    }
  }
  for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) {
    const x = -14 + i * 6.3 + row * 1.3;
    building(x, 24 + row * 14, 4.2 + i % 3 * .4, 8 + (i * 3 + row * 7) % 7 + row * 2, 4.7, i + row * 7);
  }
  // Side streets give parallax during orbit while leaving the principal room view unobstructed.
  for (let i = 0; i < 3; i++) building(-11, 5 + i * 9, 4.8, 5.5 + i * 1.2, 4.2, 40 + i);
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    for (const mesh of meshes) { mesh.computeWorldMatrix(true); mesh.parent = null; }
    const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
    if (merged) { merged.parent = root; merged.isPickable = false; merged.freezeWorldMatrix(); }
  }

  const practicals: PointLight[] = [];
  function practical(name: string, x: number, y: number, z: number, intensity: number, radius: number): void {
    const light = new PointLight(name, new Vector3(x, y, z), scene);
    light.diffuse = color('#ffc480').toLinearSpace(); light.specular = light.diffuse.scale(.15); light.intensity = intensity; light.range = radius;
    light.radius = .25; practicals.push(light);
  }
  practical('living-room-lamp-light', 4.2, 1.72, 8.85, 12, 5);
  practical('bedside-lamp-light', 11.55, 1.7, 3.55, 12, 5);
  practical('kitchen-warm-light', 3.7, 2.6, 1.1, 9, 4.5);
  practical('loft-central-bounce', 6, 3.7, 5, 5, 8);
  practical('window-sconce-left', 2.7, 2.8, 9.85, 5, 4);
  practical('window-sconce-right', 9.8, 2.8, 9.85, 5, 4);
  return {
    setTheme(theme) {
      scene.clearColor = Color4.FromHexString(theme === 'comic' ? '#364c64ff' : theme === 'lantern' ? '#282d45ff' : '#253545ff');
      scene.fogColor = color(theme === 'lantern' ? '#33374e' : '#2c4058');
      for (const light of practicals) { light.diffuse = color(theme === 'lantern' ? '#ffad61' : theme === 'comic' ? '#ffe2ae' : '#ffc480').toLinearSpace(); light.specular = light.diffuse.scale(.15); }
    },
  };
}
