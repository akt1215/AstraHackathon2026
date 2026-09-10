"""Original loft furniture. Blender 4.5 LTS, no external assets/add-ons.

Run: Blender --background --factory-startup --python art/blender/build_cinematic_kit.py
Authoring functions use game coordinates (x, height, depth); export is Y-up.
"""
import bpy
import math
import json
import hashlib
import random
import sys
from pathlib import Path
from mathutils import Vector

random.seed(729)
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'client/public/life-assets/cinematic'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
M = {}
ASSETS = []

def material(key, color, roughness=.65, metallic=0):
    mat = bpy.data.materials.new('cinematic.' + key)
    mat.use_nodes = True
    # Input swatches are sRGB; glTF base colors are linear.
    srgb = [int(color[i:i+2], 16)/255 for i in (1, 3, 5)]
    linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in srgb]
    mat.diffuse_color = (*linear, 1)
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*linear, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    M[key] = mat

for args in [('fabric.sage','#747a57',.91),('fabric.linen','#ddd0b5',.94),
             ('fabric.terracotta','#945239',.88),('fabric.charcoal','#434741',.9),
             ('wood.walnut','#65442e',.4),('wood.oak','#98714e',.5),
             ('metal.iron','#242b2a',.33,.8),('metal.steel','#9aa49e',.38,.93),('metal.brass','#af8750',.28,.75),
             ('ceramic.ivory','#e7dac1',.3),('ceramic.ochre','#ae7649',.42),('ceramic.sage','#74795b',.32),('stone.cream','#b7a792',.38),
             ('paint.sage','#454f41',.59),('seam.sage','#535940',.95),
             ('seam.linen','#b7a98d',.95),('glass','#adcad0',.12)]:
    material(*args)

def p(game):
    x,h,d = game
    return (x,-d,h)

def assign(obj, name, mat):
    obj.name = name
    obj.data.materials.append(M[mat])
    return obj

def smooth(obj):
    for face in obj.data.polygons:
        face.use_smooth = True

def bevel(obj, width=.02, segments=3):
    mod = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.affect = 'EDGES'
    weighted = obj.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
    weighted.keep_sharp = True
    return obj

def box(name, size, loc, mat, edge=.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p(loc))
    obj = assign(bpy.context.object,name,mat)
    obj.dimensions = (size[0],size[2],size[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if edge: bevel(obj,edge)
    return obj

def tube(name, points, radius, mat, cyclic=False):
    curve = bpy.data.curves.new(name,'CURVE')
    curve.dimensions='3D'
    curve.resolution_u=1
    curve.bevel_depth=radius
    curve.bevel_resolution=2
    spline=curve.splines.new('POLY')
    spline.points.add(len(points)-1)
    for a,b in zip(spline.points,points): a.co=(*p(b),1)
    spline.use_cyclic_u=cyclic
    obj=bpy.data.objects.new(name,curve)
    bpy.context.collection.objects.link(obj)
    return assign(obj,name,mat)

def rod(name, start, end, radius, mat, top=None, vertices=12):
    a,b=Vector(p(start)),Vector(p(end)); delta=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=radius,radius2=top if top is not None else radius,depth=delta.length,location=(a+b)/2)
    obj=assign(bpy.context.object,name,mat)
    obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    bevel(obj,.004,2); smooth(obj)
    return obj

def mesh(name, verts, faces, mat, uv=None):
    data=bpy.data.meshes.new(name)
    data.from_pydata([p(v) for v in verts],[],faces)
    data.update()
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    assign(obj,name,mat)
    smooth(obj)
    if uv:
        obj['cloth_uv'] = True
        layer=data.uv_layers.new(name='UVMap')
        for face in data.polygons:
            for li in face.loop_indices: layer.data[li].uv=uv[data.loops[li].vertex_index]
    return obj

def cushion(name,size,loc,mat,tilt=0,roll=0):
    """Closed tailored pillow: puffy face, pinched perimeter, modeled fabric creases."""
    w,h,d=size; nx,nz=24,18
    verts=[]; uv=[]; faces=[]
    for side in [-1,1]:
        for iz in range(nz+1):
            v=iz/nz*2-1
            for ix in range(nx+1):
                u=ix/nx*2-1
                edge=max(abs(u),abs(v))
                puff=(max(0,1-abs(u)**4)*max(0,1-abs(v)**4))**.38
                # Folds taper toward interior; they are geometry, not a bump texture.
                crease=.0018*math.sin(v*19+u*7)*(abs(u)**9)+.0012*math.sin(u*23-v*4)*(abs(v)**10)
                y=side*h*(.16+.34*puff)+crease
                x=u*w/2*(1-.06*abs(v)**8); z=v*d/2*(1-.06*abs(u)**8)
                # Rotate in game axes, then translate.
                yy=y*math.cos(tilt)-z*math.sin(tilt); zz=y*math.sin(tilt)+z*math.cos(tilt)
                xx=x*math.cos(roll)-yy*math.sin(roll); yy=x*math.sin(roll)+yy*math.cos(roll)
                verts.append((xx+loc[0],yy+loc[1],zz+loc[2])); uv.append((ix/nx*w,iz/nz*d))
    count=(nx+1)*(nz+1)
    for side in range(2):
        offset=side*count
        for iz in range(nz):
            for ix in range(nx):
                a=offset+iz*(nx+1)+ix
                f=(a,a+1,a+nx+2,a+nx+1)
                faces.append(f[::-1] if side else f)
    perimeter=list(range(nx+1))+[z*(nx+1)+nx for z in range(1,nz+1)]+[nz*(nx+1)+x for x in range(nx-1,-1,-1)]+[z*(nx+1) for z in range(nz-1,0,-1)]
    for a,b in zip(perimeter,perimeter[1:]+perimeter[:1]): faces.append((a,b,b+count,a+count))
    obj=mesh(name,verts,faces,mat,uv)
    seam=[tuple((verts[i][k]+verts[i+count][k])/2 for k in range(3)) for i in perimeter]
    tube(name+' welt piping',seam,.0038,'seam.linen' if 'linen' in mat else mat,True)
    return obj

def cloth(name,w,d,loc,mat,drop_sides=.0,drop_front=.0,nx=50,nz=48,side_start=.46,front_start=.12):
    verts=[]; faces=[]; uv=[]
    for j in range(nz+1):
        v=j/nz
        for i in range(nx+1):
            u=i/nx
            x=(u-.5)*w; z=(v-.5)*d
            fold=.0035*math.sin(x*24+z*5)+.002*math.sin(z*19-x*10)+.0015*math.sin(z*31+x*12)
            if drop_sides or drop_front: fold += .009*math.sin(x*8+z*5)*math.sin(v*math.pi)
            side=max(0,(abs(u-.5)-side_start)/(.5-side_start))
            front=max(0,(front_start-v)/front_start)
            if name == 'Relaxed linen throw':
                fold += .014*math.sin(x*29+v*9)*(math.sin(u*math.pi)**.5)
                z += .010*math.sin(x*34)*front
            h=loc[1]+fold-drop_sides*side**1.5-drop_front*front**1.4
            verts.append((loc[0]+x,h,loc[2]+z));uv.append((u*w,v*d))
    for j in range(nz):
        for i in range(nx):
            a=j*(nx+1)+i;faces.append((a,a+nx+1,a+nx+2,a+1))
    obj=mesh(name,verts,faces,mat,uv)
    solid=obj.modifiers.new('Cloth edge thickness','SOLIDIFY');solid.thickness=.008
    for edge in [list(range(nx+1)),[j*(nx+1) for j in range(nz+1)],[j*(nx+1)+nx for j in range(nz+1)]]:
        tube(name+' stitched hem',[verts[k] for k in edge],.003,mat)
    return obj

def begin():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def export(name, nominal, notes):
    # Apply bevels and curves, unwrap unmapped hard surfaces, merge per material.
    for obj in list(bpy.context.scene.objects):
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        if obj.type=='CURVE': bpy.ops.object.convert(target='MESH')
        for modifier in list(obj.modifiers): bpy.ops.object.modifier_apply(modifier=modifier.name)
        if obj.type=='MESH' and not obj.get('cloth_uv'):
            layer=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
            normal_matrix=obj.matrix_world.to_3x3().inverted().transposed()
            for face in obj.data.polygons:
                normal=normal_matrix@face.normal
                axis=max(range(3),key=lambda i:abs(normal[i]))
                axes=[i for i in range(3) if i!=axis]
                for li in face.loop_indices:
                    co=obj.matrix_world@obj.data.vertices[obj.data.loops[li].vertex_index].co
                    layer.data[li].uv=(co[axes[0]],co[axes[1]])
    groups={}
    for obj in list(bpy.context.scene.objects):
        if obj.type=='MESH':groups.setdefault(obj.data.materials[0].name,[]).append(obj)
    for mat,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        bpy.context.object.name=name+'__'+mat.removeprefix('cinematic.').replace('.','_')
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bpy.ops.object.select_all(action='SELECT')
    coords=[obj.matrix_world@Vector(c) for obj in bpy.context.selected_objects for c in obj.bound_box]
    bounds={'min':[min(c[0] for c in coords),min(c[2] for c in coords),-max(c[1] for c in coords)],'max':[max(c[0] for c in coords),max(c[2] for c in coords),-min(c[1] for c in coords)]}
    path=OUT/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT',export_animations=False)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/blender'/ (name+'.blend')),compress=True)
    triangles=sum(len(obj.data.loop_triangles) or sum(len(f.vertices)-2 for f in obj.data.polygons) for obj in bpy.context.selected_objects)
    ASSETS.append({'file':name+'.glb','nominalFootprint':nominal,'bounds':bounds,'pivot':[0,0,0],'front':'-Z','units':'meters','materials':sorted(groups),'meshCount':len(groups),'triangles':triangles,'notes':notes,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    print('ASSET_READY',name,json.dumps(ASSETS[-1]),flush=True)

def sofa():
    begin();w=2.8;d=1.1
    for x in [-1.13,1.13]:
        for z in [-.36,.36]:rod('Tapered walnut foot',(x,.0,z),(x*.985,.24,z*.96),.047,'wood.walnut',.033)
    box('Low upholstered frame',(2.7,.27,.99),(0,.285,0),'fabric.sage',.055)
    box('Rear upholstered shell',(2.76,.67,.19),(0,.66,.44),'fabric.sage',.065)
    for sign in [-1,1]:
        cushion('Shaped padded arm',(.255,.48,1.06),(sign*1.27,.565,-.01),'fabric.sage')
    for i in [-1,0,1]:
        cushion('Deep seat cushion',(.751,.235,.82),(i*.771,.457,-.085),'fabric.sage')
        cushion('Loose back cushion',(.748,.21,.555),(i*.765,.745,.325),'fabric.sage',1.34)
    cushion('Terracotta scatter pillow',(.45,.15,.43),(-.9,.73,.045),'fabric.terracotta',1.15,-.23)
    cushion('Linen scatter pillow',(.43,.15,.44),(.84,.75,.10),'fabric.linen',1.2,.20)
    cloth('Relaxed linen throw',.49,1.06,(.48,.592,-.09),'fabric.linen',0,.30,26,40)
    export('sofa',[w,d],'Three separate bulging seat/back cushions, piped seams, shaped arms, geometric folds and draped throw. Seat height ~0.57m; back +Z.')

def bed():
    begin();w=2.2;d=2.1
    for x in [-.9,.9]:
        for z in [-.81,.81]:rod('Recessed bed foot',(x,0,z),(x,.25,z),.065,'wood.walnut')
    box('Solid walnut bed rail',(2.16,.25,2.06),(0,.30,0),'wood.walnut',.035)
    for x in [-1.055,1.055]:box('Joinery inset rail',(.035,.10,1.94),(x,.31,0),'wood.oak',.008)
    box('Soft upholstered headboard',(2.2,1.08,.12),(0,.68,.98),'fabric.sage',.045)
    for x in [-.72,0,.72]:box('Headboard stitched panel',(.70,.83,.025),(x,.76,.91),'fabric.sage',.022)
    cushion('Deep rounded mattress',(2.08,.25,1.98),(0,.526,-.016),'fabric.linen')
    cloth('Terracotta duvet',2.18,1.56,(0,.709,-.25),'fabric.terracotta',.19,.24,side_start=.476,front_start=.032)
    cloth('Turned linen top edge',2.06,.29,(0,.735,.395),'fabric.linen',.08,0,45,15)
    for s in [-1,1]:
        cushion('Large sleep pillow',(.86,.185,.47),(s*.49,.728,.665),'fabric.linen',-.075,s*.03)
        cushion('Layered pillow',(.70,.14,.37),(s*.49,.845,.675),'fabric.linen',-.13,s*-.04)
    cushion('Small terracotta pillow',(.49,.15,.33),(0,.855,.535),'fabric.terracotta',.5,-.06)
    export('bed',[w,d],'Local width2.2 depth2.1; renderer rotates +pi/2. Mattress top~0.65, duvet~0.72. Geometric bedding folds and hanging blanket edges.')

def table():
    begin();w=1.9;d=1.2
    for x in [-.78,.78]:
        for z in [-.43,.43]:rod('Tapered square-profile dining leg',(x*1.025,0,z*1.025),(x,.79,z),.036,'wood.walnut',.052,4)
    for x in [-.79,.79]:box('End apron',(.075,.15,.96),(x,.706,0),'wood.walnut',.009)
    for z in [-.44,.44]:box('Long mortised apron',(1.63,.15,.065),(0,.706,z),'wood.walnut',.009)
    for i in range(5):box('Individual oak tabletop board',(w,.065,d/5-.003),(0,.829,(i-2)*d/5),'wood.oak',.007)
    cloth('Soft linen table runner',.42,1.18,(-.31,.882,0),'fabric.linen',0,0,18,36)
    # Hollow shallow bowl, revolved profile, not a capped solid cylinder.
    verts=[];faces=[];profile=[(.025,.891),(.135,.894),(.198,.931),(.207,.961),(.194,.963),(.184,.937),(.125,.909),(.025,.908)]
    for radius,h in profile:
        for i in range(48):a=i*math.tau/48;verts.append((.25+radius*math.cos(a),h,.05+radius*math.sin(a)))
    for j in range(len(profile)-1):
        for i in range(48):faces.append((j*48+i,j*48+(i+1)%48,(j+1)*48+(i+1)%48,(j+1)*48+i))
    mesh('Hand thrown serving bowl',verts,faces,'ceramic.ivory')
    for x,z in [(.17,0),(.30,.01),(.23,.13)]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.072,location=p((x,.973,z)))
        assign(bpy.context.object,'Decorative fruit','fabric.terracotta');smooth(bpy.context.object)
        rod('Fruit stem',(x,1.032,z),(x+.006,1.06,z),.005,'wood.walnut')
    export('dining-table',[w,d],'Table only; instantiate chairs separately at authoritative static fixture coordinates. Tabletop0.86m.')

def chair():
    begin()
    for x in [-.215,.215]:
        for z in [-.20,.20]:rod('Splayed chair leg',(x*1.15,0,z*1.12),(x,.49,z),.022,'wood.walnut',.031)
    for z in [-.19,.19]:rod('Chair side stretcher',(-.223,.22,z),(.223,.22,z),.014,'wood.walnut')
    box('Rounded chair seat',(.57,.055,.53),(0,.466,0),'wood.oak',.045)
    cushion('Linen chair seat pad',(.48,.072,.445),(0,.511,-.011),'fabric.sage')
    for x in [-.235,.235]:rod('Backrest upright',(x,.47,.205),(x,.995,.247),.024,'wood.walnut',.024)
    for row in range(3):
        y=.706+row*.11
        points=[(x,y,.236+.055*(1-(x/.25)**2)) for x in [-.25,-.20,-.15,-.1,-.05,0,.05,.1,.15,.2,.25]]
        tube('Steam bent backrest rail',points,.031,'wood.oak')
    export('dining-chair',[.58,.54],'Seat0.55m; back+Z, faces-Z. Rounded seat, splayed tapered legs, curved steam-bent back rails.')


def pottery(name,x,y,z,radius,height,color='ceramic.ivory',shape='jar'):
    if shape=='bowl':
        profile=[(.27,0),(.60,.07),(.84,.37),(1,1),(.94,1.02),(.78,.43),(.53,.16),(.27,.12)]
    else:
        profile=[(.68,0),(.91,.07),(1,.28),(.96,.69),(.72,.88),(.70,1),(.62,1),(.62,.86),(.80,.65),(.83,.25),(.65,.10)]
    verts=[];faces=[];segments=32
    for r,h in profile:
        for j in range(segments):
            angle=j*math.tau/segments;verts.append((x+radius*r*math.cos(angle),y+height*h,z+radius*r*math.sin(angle)))
    for ring in range(len(profile)-1):
        for j in range(segments):
            a=ring*segments+j;b=ring*segments+(j+1)%segments
            faces.append((a,a+segments,b+segments,b))
    return mesh(name,verts,faces,color)

def kitchen():
    begin();w=3;d=.69
    box('Recessed toe kick',(2.93,.12,.56),(0,.065,.035),'wood.walnut',.005)
    box('Cabinet carcass',(2.97,.73,.65),(0,.485,.01),'paint.sage',.012)
    for i in range(5):
        x=(i-2)*.592
        box('Recessed shaker panel',(.46,.59,.025),(x,.476,-.329),'paint.sage',.006)
        for dx in [-.263,.263]:box('Shaker stile',(.057,.705,.04),(x+dx,.49,-.340),'paint.sage',.008)
        for y in [.163,.817]:box('Shaker rail',(.468,.051,.04),(x,y,-.340),'paint.sage',.007)
        rod('Brass cabinet pull',(x+.17,.57,-.385),(x+.17,.72,-.385),.010,'metal.brass')
        for y in [.57,.72]:rod('Handle standoff',(x+.17,y,-.356),(x+.17,y,-.385),.009,'metal.brass')
    # Counter built around a real sink opening.
    box('Stone counter left',(1.09,.055,.69),(-.955,.875,0),'stone.cream',.012)
    box('Stone counter right',(1.17,.055,.69),(.915,.875,0),'stone.cream',.012)
    for z in [-.279,.279]:box('Stone sink surround',(.745,.055,.132),(-.04,.875,z),'stone.cream',.012)
    for x in [-.377,.297]:box('Undermount sink side',(.018,.21,.39),(x,.766,0),'metal.iron',.006)
    for z in [-.185,.185]:box('Undermount sink wall',(.688,.21,.018),(-.04,.766,z),'metal.iron',.006)
    box('Sink basin floor',(.686,.022,.378),(-.04,.663,0),'metal.iron',.025)
    rod('Sink drain',(-.04,.678,0),(-.04,.681,0),.035,'metal.brass')
    points=[(-.04,.907,.243),(-.04,1.16,.243),(-.04,1.215,.20),(-.04,1.24,.14),(-.04,1.21,.07),(-.04,1.15,.06)]
    tube('Gooseneck faucet',points,.017,'metal.brass')
    for y in [1.48,1.94]:
        box('Open oak kitchen shelf',(2.96,.054,.29),(0,y,.19),'wood.oak',.014)
        for x in [-1.1,1.1]:rod('Shelf iron bracket',(x,y-.18,.322),(x,y-.025,.322),.012,'metal.iron')
    # A deliberately mixed pantry, kept entirely on the architectural shelves.
    for i,(x,radius,height,color) in enumerate([(-1.25,.073,.21,'ceramic.ivory'),(-1.055,.060,.16,'ceramic.ochre'),(-.88,.067,.19,'ceramic.sage')]):
        pottery('Lidded spice crock',x,1.507,.18,radius,height,color)
        rod('Crock wooden lid',(x,1.507+height,.18),(x,1.521+height,.18),radius*.73,'wood.walnut',radius*.73,24)
    for i in range(4):pottery('Stacked dinner plate',-.54,1.511+i*.022,.175,.15,.027,'ceramic.ivory','bowl')
    pottery('Ochre serving bowl',-.13,1.509,.18,.122,.088,'ceramic.ochre','bowl')
    pottery('Small sage bowl',.16,1.510,.17,.093,.072,'ceramic.sage','bowl')
    for i,(height,cover) in enumerate([(.28,'paint.sage'),(.24,'wood.walnut'),(.30,'ceramic.ochre')]):
        x=.43+i*.07
        box('Recipe book pages',(.049,height-.021,.18),(x,1.507+height/2,.16),'ceramic.ivory',.001)
        for dx in [-.026,.026]:box('Recipe book cover',(.007,height,.189),(x+dx,1.507+height/2,.16),cover,.001)
        box('Recipe book spine',(.06,height,.010),(x,1.507+height/2,.06),cover,.002)
    pottery('Utensil crock',1.12,1.507,.18,.085,.17,'ceramic.ivory')
    for i in range(4):
        x=1.08+i*.025;rod('Wood cooking utensil',(x,1.57,.19),(x+(i-1.5)*.025,1.86-(i%2)*.02,.19),.008,'wood.oak')
        if i%2==0:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=p((x+(i-1.5)*.025,1.87,.19)))
            obj=assign(bpy.context.object,'Wood spoon head','wood.oak');obj.scale=(.025,.009,.041)
            bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);smooth(obj)
    for i in range(3):pottery('Upper shelf shallow bowl',-1.16,1.968+i*.047,.18,.15,.07,'ceramic.ivory','bowl')
    pottery('Tall ochre storage jar',-.65,1.968,.18,.101,.255,'ceramic.ochre')
    pottery('Small ivory jar',-.38,1.968,.185,.073,.164,'ceramic.ivory')
    for i in range(3):pottery('Nested mixing bowl',.09,1.969+i*.048,.18,.17-i*.02,.12,'ceramic.sage','bowl')
    for i in range(2):
        x=.60+i*.25
        pottery('Handmade mug',x,1.967,.17,.071,.113,'ceramic.ivory' if i else 'ceramic.ochre')
        points=[(x+.058+.035*math.sin(t*math.pi),2.026+.036*math.cos(t*math.pi),.17) for t in [j/12 for j in range(13)]]
        tube('Mug curved handle',points,.009,'ceramic.ivory' if i else 'ceramic.ochre')
    pottery('End shelf vase',1.23,1.968,.185,.085,.25,'ceramic.sage')
    export('kitchen',[w,d],'Front-Z; rotate pi aroundY for world+Z front. Includes shaker joinery, open sink, gooseneck tap and floating shelves. Counter0.9m. Handles exceed front envelope by0.05m.')

def window():
    begin();w=3.02;h=2.4
    for x in [-1.47,1.47]:box('Masonry window casing',(.08,h,.16),(x,h/2,0),'wood.walnut',.01)
    for y in [.035,h-.035]:box('Outer window casing',(2.86,.07,.16),(0,y,0),'wood.walnut',.01)
    for x in [-1.414,0,1.414]:
        box('Steel window mullion',(.043,h-.14,.073),(x,h/2,-.035),'metal.iron',.008)
        box('Raised mullion molding',(.017,h-.17,.022),(x,h/2,-.083),'metal.iron',.003)
    for y in [.105,.84,1.59,2.295]:box('Steel window transom',(2.87,.043,.073),(0,y,-.035),'metal.iron',.006)
    box('Deep beveled window sill',(3.02,.075,.27),(0,.025,-.06),'stone.cream',.016)
    for x in [-.065,.065]:
        rod('Window latch base',(x,1.19,-.077),(x,1.19,-.102),.022,'metal.brass')
        rod('Window latch lever',(x,1.19,-.113),(x,1.275,-.113),.008,'metal.brass')
    export('window-frame',[w,.27],'Floor-centered at sill base; renderer positions at window opening bottom. 3.02m wide×2.4m high. Open panes intentionally receive renderer city view/glazing.')


def fridge():
    begin()
    for x in [-.34,.34]:
        for z in [-.30,.30]:rod('Refrigerator adjustable foot',(x,0,z),(x,.075,z),.037,'metal.iron',.029)
    box('Stainless cabinet shell',(.878,1.80,.78),(0,.94,.015),'metal.steel',.026)
    box('Rolled top cap',(.878,.03,.79),(0,1.855,.015),'metal.steel',.014)
    # The door fronts, handles, rear cooling coils and side panels all fit .9m.
    for x in [-.218,.218]:
        box('French door gasket',(.426,1.177,.039),(x,1.266,-.387),'metal.iron',.011)
        box('Brushed steel upper door',(.423,1.165,.052),(x,1.269,-.397),'metal.steel',.019)
        hx=x*.20
        for y in [1.03,1.48]:rod('Handle curved standoff',(hx,y,-.420),(hx,y,-.442),.009,'metal.steel')
        rod('Vertical fridge pull',(hx,1.03,-.442),(hx,1.48,-.442),.008,'metal.steel',.008,20)
    box('Lower drawer gasket',(.866,.495,.039),(0,.421,-.387),'metal.iron',.012)
    box('Freezer drawer',(.86,.482,.052),(0,.422,-.397),'metal.steel',.020)
    for x in [-.22,.22]:rod('Freezer pull mount',(x,.58,-.420),(x,.58,-.441),.009,'metal.steel')
    rod('Horizontal drawer pull',(-.22,.58,-.441),(.22,.58,-.441),.008,'metal.steel',.008,20)
    box('Bottom ventilation recess',(.815,.10,.008),(0,.122,-.38),'metal.iron',.006)
    for i in range(15):box('Kick grille fin',(.037,.005,.012),(-.37+i*.053,.115,-.39),'metal.steel',.002)
    for side in [-1,1]:
        box('Inset side panel',(.007,1.59,.65),(side*.441,.95,.025),'metal.steel',.004)
        for z in [-.265,.315]:rod('Side panel edge bead',(side*.446,.17,z),(side*.446,1.725,z),.0025,'metal.iron')
        for y in [.225,1.68]:
            for z in [-.262,.31]:rod('Side service screw',(side*.444,y,z),(side*.448,y,z),.007,'metal.iron',.007,12)
    box('Rear service access panel',(.69,1.25,.008),(0,.83,.409),'metal.iron',.015)
    for x in [-.325,.325]:rod('Rear condenser riser',(x,.25,.43),(x,1.44,.43),.009,'metal.iron')
    for i in range(13):rod('Rear condenser coil',(-.322,.28+i*.085,.43),(.322,.28+i*.085,.43),.007,'metal.iron')
    for x in [-.3,.3]:
        for y in [.24,1.43]:rod('Rear service screw',(x,y,.414),(x,y,.424),.008,'metal.steel')
    box('Small paper grocery note',(.132,.18,.003),(.19,1.20,-.426),'fabric.linen',.002)
    for i in range(4):box('Note pencil mark',(.087-i*.008,.002,.001),(.19,1.23-i*.026,-.428),'wood.walnut',0)
    rod('Note magnet',(.19,1.286,-.43),(.19,1.286,-.438),.016,'ceramic.ochre',.016,20)
    export('fridge',[.9,.9],'Compact French-door stainless refrigerator; entire authored shell, handles, vents and rear cooling coils fit .9m footprint. Local front-Z; top1.87m.')


def bookshelf():
    begin();w=1.8;d=.7
    box('Solid bookcase plinth',(1.79,.12,.69),(0,.06,0),'wood.walnut',.015)
    box('Plinth raised molding',(1.80,.045,.7),(0,.145,0),'wood.oak',.008)
    box('Paneled cabinet back',(1.74,2.07,.035),(0,1.193,.323),'wood.walnut',.004)
    for x in [-.855,.855]:
        box('Bookcase face frame stile',(.079,2.07,.69),(x,1.193,0),'wood.walnut',.011)
        box('Front stile bead',(.015,2.025,.019),(x,1.193,-.338),'wood.oak',.003)
    box('Bookcase crown lower',(1.80,.05,.70),(0,2.255,0),'wood.oak',.009)
    box('Bookcase crown',(1.79,.025,.695),(0,2.2875,0),'wood.walnut',.007)
    for y in [.71,1.195,1.68,2.165]:
        box('Solid bookcase shelf',(1.64,.050,.66),(0,y,.007),'wood.oak',.008)
        box('Shelf front nosing',(1.64,.053,.022),(0,y,-.329),'wood.walnut',.005)
    for x in [-.42,.42]:
        box('Lower door recessed panel',(.707,.415,.023),(x,.43,-.307),'wood.walnut',.006)
        for dx in [-.381,.381]:box('Cabinet face stile',(.053,.50,.035),(x+dx,.43,-.320),'wood.walnut',.005)
        for y in [.205,.655]:box('Cabinet face rail',(.708,.05,.035),(x,y,-.320),'wood.walnut',.005)
        rod('Cabinet brass knob',(x*.2,.58,-.336),(x*.2,.58,-.349),.012,'metal.brass',.014,16)
    def book(x,y,width,height,depth,cover,lean=0):
        before=set(bpy.context.scene.objects)
        box('Book page block',(width-.009,height-.013,depth-.013),(x,y+height/2,-.10),'ceramic.ivory',.002)
        for side in [-1,1]:box('Book hardback board',(.006,height,depth),(x+side*(width/2-.003),y+height/2,-.10),cover,.002)
        box('Rounded book spine',(width,height,.012),(x,y+height/2,-.10-depth/2),cover,.004)
        for yy in [.055,height-.055]:box('Spine foil rule',(width*.63,.004,.002),(x,y+yy,-.108-depth/2),'metal.brass',.001)
        if lean:
            from_center=Vector(p((x,y,-.1)))
            # Existing mathutils Vector avoids any nonstandard dependency.
            for obj in set(bpy.context.scene.objects)-before:
                offset=obj.location-from_center
                xx=offset.x*math.cos(lean)+offset.z*math.sin(lean)
                zz=-offset.x*math.sin(lean)+offset.z*math.cos(lean)
                obj.location=from_center+Vector((xx,offset.y,zz));obj.rotation_euler.y=lean
    covers=['paint.sage','fabric.terracotta','wood.walnut','fabric.linen','ceramic.ochre']
    for row,y in enumerate([.739,1.224,1.709]):
        x=-.752
        count=10 if row==0 else 6 if row==1 else 8
        for i in range(count):
            width=random.uniform(.046,.070);height=random.uniform(.25,.365);depth=random.uniform(.195,.255)
            book(x+width/2,y,width,height,depth,covers[(i+row*2)%len(covers)],.08 if i==count-1 else 0)
            x+=width+.009
    # Mixed arrangements leave visible negative space rather than filling every shelf identically.
    for i in range(3):
        box('Horizontally stacked book',(.28,.039,.235),(.29,.759+i*.043,-.08),covers[i],.006)
        box('Horizontal page edge',(.268,.026,.002),(.29,.759+i*.043,-.20),'ceramic.ivory',.001)
    pottery('Shelf stoneware vase',.63,.739,-.015,.101,.30,'ceramic.sage')
    pottery('Small ochre bowl',.18,1.224,-.07,.125,.09,'ceramic.ochre','bowl')
    box('Leaning photo frame',(.24,.29,.025),(.58,1.384,.055),'wood.walnut',.008)
    box('Photo ivory mat',(.207,.255,.008),(.58,1.384,.037),'fabric.linen',.002)
    box('Abstract picture',(.163,.199,.004),(.58,1.384,.031),'fabric.sage',.002)
    pottery('Ivory shelf vessel',.19,1.709,.025,.085,.265,'ceramic.ivory')
    for i in range(2):pottery('Nested shelf bowl',.58,1.713+i*.043,-.06,.133-i*.015,.083,'ceramic.sage','bowl')
    export('bookshelf',[w,d],'Local width1.8 depth.7 height2.3; front-Z. Recessed lower cupboards, molded shelves, varied bound books, stoneware, nested bowls and framed artwork; all decor and knobs within cabinet footprint.')


builders={'sofa':sofa,'bed':bed,'dining-table':table,'dining-chair':chair,'kitchen':kitchen,'window-frame':window,'fridge':fridge,'bookshelf':bookshelf}
requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(builders)
for key in requested: builders[key]()
if len(requested) != len(builders) and (OUT/'manifest.json').exists():
    previous=json.loads((OUT/'manifest.json').read_text())['assets']
    changed={asset['file'] for asset in ASSETS}
    ASSETS.extend(asset for asset in previous if asset['file'] not in changed)
ASSETS.sort(key=lambda asset: list(builders).index(asset['file'].removesuffix('.glb')))
(OUT/'manifest.json').write_text(json.dumps({'generator':'art/blender/build_cinematic_kit.py','blender':bpy.app.version_string,'coordinateSystem':'glTF right-handed Y-up; local front -Z; floor-centered origin','assets':ASSETS},indent=2)+'\n')
print('KIT_COMPLETE',len(ASSETS),flush=True)
