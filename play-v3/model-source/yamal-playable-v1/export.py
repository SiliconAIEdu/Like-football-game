from config import GAME
import bpy,json,gzip,math,hashlib
from pathlib import Path
P=Path(__file__).resolve().parent;G=GAME
bpy.ops.wm.open_mainfile(filepath=str(P/'animated.blend'))
r=next(o for o in bpy.data.objects if o.type=='ARMATURE');s=bpy.context.scene
c=json.loads((G/'assets/mocap-contract.json').read_text());kick=c['kick'];root=next(v for v in c['clips'] if v['name']=='Kick')['root'];t=kick['time']
a=max((v for v in root if v['t']<=t),key=lambda v:v['t']);b=min((v for v in root if v['t']>=t),key=lambda v:v['t']);u=(t-a['t'])/(b['t']-a['t']) if b['t']!=a['t'] else 0
trajectory={k:a[k]+(b[k]-a[k])*u for k in ['x','z','yaw']}
r.animation_data.action=None
for p in r.pose.bones:p.matrix_basis.identity()
bpy.context.view_layer.update();meshes=[o for o in bpy.data.objects if o.type=='MESH'];zs=[(o.matrix_world@v.co).z for o in meshes for v in o.data.vertices];scale=1.87/(max(zs)-min(zs))
r.animation_data.action=bpy.data.actions['Kick'];s.frame_set(round(t*60));p=r.matrix_world@r.pose.bones['ball_r'].head
x,y,z=p.x*scale,(p.z-min(zs))*scale,-p.y*scale;cy,sy=math.cos(trajectory['yaw']),math.sin(trajectory['yaw']);wx=trajectory['x']+cy*x+sy*z;wz=trajectory['z']-sy*x+cy*z
kick['localFoot']={'x':x,'y':y,'z':z};kick['footAtContact']={'x':wx,'y':y,'z':wz};kick['contact']={'x':wx,'y':.11,'z':wz+math.sqrt(max(.001,.11**2-(y-.11)**2))};kick['rig']='yamal-playable-v1'
(G/'assets/yamal-playable-v1-contact.json').write_text(json.dumps(kick,indent=2));(P/'contact.json').write_text(json.dumps(kick,indent=2))
r.animation_data.action=None
for p in r.pose.bones:p.matrix_basis.identity()
r['independentRig']=True;r['character']='original-golden-player';r['gameSlot']='yamal';r['rigVersion']='yamal-playable-v1'
bpy.context.view_layer.update()
for im in bpy.data.images:
 if im.size[0]>0:im.scale(min(2048,im.size[0]),min(2048,im.size[1]));im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(P/'animated.blend'))
dest=G/'assets/yamal-playable-v1.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',export_image_format='JPEG',export_jpeg_quality=90,export_morph_normal=False,export_morph_animation=False,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_optimize_animation_size=False,export_frame_range=False,export_extras=True)
dest.with_suffix('.glb.gz').write_bytes(gzip.compress(dest.read_bytes(),mtime=0))
report={'bones':len(r.data.bones),'triangles':sum(len(o.data.polygons) for o in meshes),'animations':[a.name for a in bpy.data.actions],'bytes':dest.stat().st_size,'gzip_bytes':dest.with_suffix('.glb.gz').stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'contact':kick}
(P/'export-report.json').write_text(json.dumps(report,indent=2));print(report,flush=True)
