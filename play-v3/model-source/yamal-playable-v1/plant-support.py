from config import GAME
# Run after motion retarget, before contact calibration. Support-leg IK only;
# the captured run flight phases and the striking leg are left intact.
import bpy,json,math,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
O=Path(__file__).resolve().parent;G=GAME
bpy.ops.wm.open_mainfile(filepath=str(O/'animated.blend'))
r=next(o for o in bpy.data.objects if o.type=='ARMATURE');s=bpy.context.scene;old=bpy.data.actions['Kick'];r.animation_data.action=old
root=next(c for c in json.loads((G/'assets/mocap-contract.json').read_text())['clips'] if c['name']=='Kick')['root']
def trajectory(t):
 a=max((v for v in root if v['t']<=t+1e-8),key=lambda v:v['t']);b=min((v for v in root if v['t']>=min(t,root[-1]['t'])-1e-8),key=lambda v:v['t']);u=(t-a['t'])/(b['t']-a['t']) if b['t']!=a['t'] else 0
 return tuple((a[k]+(b[k]-a[k])*u)*(1.8/1.87 if k!='yaw' else 1) for k in ['x','z','yaw'])
def smooth(a,b,t):
 x=max(0,min(1,(t-a)/(b-a)));return x*x*(3-2*x)
s.frame_set(39);bpy.context.view_layer.update();anchor=r.pose.bones['foot_l'].head.copy();rx,rz,yaw=trajectory(.65);anchorWorld=Vector((rx+math.cos(yaw)*anchor.x-math.sin(yaw)*anchor.y,rz-math.sin(yaw)*anchor.x-math.cos(yaw)*anchor.y))
body=bpy.data.objects['Body'];selected=[v for v in body.data.vertices if v.co.x>0 and v.co.z<.16]
rest=np.array([list(v.co)+[1] for v in selected]);influences={g.name:np.array([next((w.weight for w in v.groups if w.group==g.index),0) for v in selected]) for g in body.vertex_groups}
frames=[]
for frame in range(106):
 s.frame_set(frame);bpy.context.view_layer.update();t=frame/60;weight=smooth(.30,.60,t)*(1-smooth(1.10,1.36,t))
 if weight>0:
  upper=r.pose.bones['thigh_l'];lower=r.pose.bones['calf_l'];foot=r.pose.bones['foot_l'];footQ=foot.matrix.to_quaternion();hip=upper.head.copy();knee=lower.head.copy();ankle=foot.head.copy();rx,rz,yaw=trajectory(t);dx,dz=anchorWorld.x-rx,anchorWorld.y-rz
  planted=Vector((math.cos(yaw)*dx-math.sin(yaw)*dz,-math.sin(yaw)*dx-math.cos(yaw)*dz,.105));target=ankle.lerp(planted,weight)
  L1=(knee-hip).length;L2=(ankle-knee).length
  horizontal=(target.x-hip.x)**2+(target.y-hip.y)**2
  maxRise=math.sqrt(max(.001,(L1+L2-.005)**2-horizontal))
  if hip.z-target.z>maxRise:
   pelvis=r.pose.bones['pelvis'];pm=pelvis.matrix.copy();pm.translation.z-=hip.z-target.z-maxRise;pelvis.matrix=pm;bpy.context.view_layer.update()
   hip=upper.head.copy();knee=lower.head.copy();ankle=foot.head.copy()
  axis=target-hip;dist=min(axis.length,L1+L2-.0001);axis.normalize();target=hip+axis*dist
  bend=knee-hip-axis*(knee-hip).dot(axis)
  if bend.length<1e-5:bend=Vector((0,-1,0))-axis*Vector((0,-1,0)).dot(axis)
  bend.normalize();along=(L1*L1-L2*L2+dist*dist)/(2*dist);height=math.sqrt(max(0,L1*L1-along*along));newKnee=hip+axis*along+bend*height
  for p,dest in [(upper,newKnee),(lower,target)]:
   q=(p.tail-p.head).rotation_difference(dest-p.head);p.matrix=Matrix.Translation(p.head)@q.to_matrix().to_4x4()@Matrix.Translation(-p.head)@p.matrix;bpy.context.view_layer.update()
  foot.matrix=Matrix.Translation(foot.head)@footQ.to_matrix().to_4x4();bpy.context.view_layer.update()
 if weight>0:
  sole=np.zeros((len(selected),4))
  for name,w in influences.items():
   if w.max()>0:
    matrix=np.array(r.pose.bones[name].matrix@r.data.bones[name].matrix_local.inverted());sole+=(rest@matrix.T)*w[:,None]
  floor=float(sole[:,2].min());pelvis=r.pose.bones['pelvis'];m=pelvis.matrix.copy();m.translation.z+=(.002-floor)*weight;pelvis.matrix=m;bpy.context.view_layer.update()
 frames.append({p.name:(p.location.copy(),p.rotation_quaternion.copy()) for p in r.pose.bones})
old.name='Kick_unplanted';action=bpy.data.actions.new('Kick');action.use_fake_user=True;r.animation_data.action=action
for f,pose in enumerate(frames):
 for p in r.pose.bones:p.location,p.rotation_quaternion=pose[p.name];p.keyframe_insert('location',frame=f);p.keyframe_insert('rotation_quaternion',frame=f)
bpy.data.actions.remove(old);r.animation_data.action=None
for p in r.pose.bones:p.matrix_basis.identity()
bpy.ops.wm.save_as_mainfile(filepath=str(O/'animated.blend'))
