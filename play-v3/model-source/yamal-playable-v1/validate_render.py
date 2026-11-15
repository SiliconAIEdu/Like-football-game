from config import GAME
import bpy,numpy as np,math,json
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent;G=GAME
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps=60
bpy.ops.import_scene.gltf(filepath=str(G/'assets/yamal-playable-v1.glb'))
r=next(o for o in bpy.data.objects if o.type=='ARMATURE');meshes=[o for o in bpy.data.objects if o.type=='MESH'];body=next(o for o in meshes if 'Body' in o.name)
s=bpy.context.scene;s.render.fps=60
actions={a.name.split('|')[-1]:a for a in bpy.data.actions};print('ACTIONS',list(actions),flush=True)
def ease(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def correct():
 r.update_tag();bpy.context.view_layer.update()
 thorax=r.pose.bones['spine_03'];basis=(thorax.matrix@thorax.bone.matrix_local.inverted()).to_3x3();up=(basis@Vector((0,0,1))).normalized();forward=(basis@Vector((0,-1,0))).normalized()
 for side in ['l','r']:
  u=r.pose.bones['upperarm_'+side];l=r.pose.bones['lowerarm_'+side];d=(l.head-u.head).normalized();angle=math.degrees(d.angle(-up));hor=d-up*d.dot(up);front=max(0,hor.normalized().dot(forward))**2 if hor.length>.001 else 0
  active=ease(25,85,angle);over=ease(100,155,angle)
  for name,w in zip(['UpperArmVolume','ShoulderFront','ShoulderOverhead','ShoulderOverheadFront'],[active*(1-over)*(1-front),active*(1-over)*front,active*over*(1-front),active*over*front]):
   body.data.shape_keys.key_blocks[name+'_'+side].value=w
 bpy.context.view_layer.update()
def pose(name,t):
 r.animation_data.action=actions[name];s.frame_set(int(t*60),subframe=t*60%1);correct()
def points():
 ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();co=np.array([v.co for v in me.vertices]);ev.to_mesh_clear();return co
rest=np.array([v.co for v in body.data.vertices]);edges=np.array([e.vertices[:] for e in body.data.edges]);base=np.linalg.norm(rest[edges[:,0]]-rest[edges[:,1]],axis=1)
audits=[]
for name,t in [('Idle',.5),('Walk',.3),('Run',.2),('Run',.6),('Kick',.65),('Kick',.9),('Kick',1.15),('ReactGoal',1),('CheckSide90',0),('CheckForward90',0),('CheckOverhead',0)]:
 pose(name,t);co=points();growth=np.linalg.norm(co[edges[:,0]]-co[edges[:,1]],axis=1)-base
 audits.append({'clip':name,'time':t,'finite':bool(np.isfinite(co).all()),'floor':float(co[:,2].min()),'max_edge_growth_m':float(growth.max())})
print('AUDIT',audits,flush=True);(P/'deformation-audit.json').write_text(json.dumps(audits,indent=2))
# Exercise the same corrective targets in three planes and six elevations.
exec((P/'girdle.py').read_text())
shoulders=[]
r.animation_data.action=None
for plane in [0,45,90]:
 for angle in [0,30,60,90,120,155]:
  set_arm_pose(r,angle,plane);correct();co=points();growth=np.linalg.norm(co[edges[:,0]]-co[edges[:,1]],axis=1)-base
  core=(abs(rest[:,0])<.10)&(rest[:,2]>1.08)&(rest[:,2]<1.39)
  shoulders.append({'plane':plane,'angle':angle,'max_edge_growth_m':float(growth.max()),'chest_core_displacement_m':float(np.linalg.norm(co[core]-rest[core],axis=1).max()),'finite':bool(np.isfinite(co).all())})
(P/'shoulder-audit.json').write_text(json.dumps(shoulders,indent=2))
assert all(x['finite'] and x['max_edge_growth_m']<.20 and x['chest_core_displacement_m']<.005 for x in shoulders), shoulders
s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=True;s.render.resolution_x=600;s.render.resolution_y=800;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX'
s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.17,.21,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.6
for name,pos,power,size in [('Key',(-3,-4,5),400,4),('Fill',(3,-2,3),220,3),('Rim',(1,3,4),300,3)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=size;o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',d);s.collection.objects.link(cam);s.camera=cam;d.type='ORTHO';d.ortho_scale=2.15
for label,name,t,yaw in [('idle','Idle',0,0),('run','Run',.2,.65),('run-side','Run',.6,math.pi/2),('backswing','Kick',.65,.65),('contact','Kick',.9,.65),('follow','Kick',1.15,.65),('raise','CheckSide90',0,0),('reach','CheckForward90',0,.65),('high','CheckOverhead',0,.65),('celebrate','ReactGoal',1,0)]:
 pose(name,t);cam.location=(4*math.sin(yaw),-4*math.cos(yaw),1.05);cam.rotation_euler=(Vector((0,0,.93))-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(P/(label+'.png'));bpy.ops.render.render(write_still=True)
