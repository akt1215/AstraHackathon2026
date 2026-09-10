"""Render the exported GLBs, not the authoring scene, for geometry review."""
import bpy
import sys
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'art/blender/previews'
OUT.mkdir(exist_ok=True)
requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['sofa','bed','dining-table','dining-chair','kitchen','window-frame','fridge','bookshelf','fridge-rear']
for name in requested:
    asset_name=name.removesuffix('-rear')
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'client/public/life-assets/cinematic'/(asset_name+'.glb')))
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.cycles.use_denoising=True
    scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
    scene.world.color=(.3,.3,.3)
    scene.view_settings.view_transform='AgX'
    mat=bpy.data.materials.new('Review ground');mat.diffuse_color=(.17,.155,.13,1)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.02));bpy.context.object.data.materials.append(mat)
    for loc,power,size,color in [((-3,4,6),600,4,(1,.86,.67)),((3,-2,4),500,3,(.65,.78,1)),((1,5,3),80,3,(1,1,1))]:
        data=bpy.data.lights.new('Studio area','AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
        obj=bpy.data.objects.new('Studio area',data);scene.collection.objects.link(obj);obj.location=loc
        obj.rotation_euler=(Vector((0,0,.7))-obj.location).to_track_quat('-Z','Y').to_euler()
    camera=bpy.data.cameras.new('Review camera');obj=bpy.data.objects.new('Review camera',camera);scene.collection.objects.link(obj)
    obj.location=(3.7,5.5,3.4) if name!='window-frame' else (3.5,6,3.0)
    if name.endswith('-rear'): obj.location=(-3.7,-5.5,3.4)
    target=Vector((0,0,.65 if asset_name not in ['kitchen','window-frame','fridge','bookshelf'] else 1.05))
    obj.rotation_euler=(target-obj.location).to_track_quat('-Z','Y').to_euler()
    camera.type='ORTHO';camera.ortho_scale=3.7 if name!='dining-chair' else 1.7
    scene.camera=obj
    scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    print('RENDER_READY',name,flush=True)
