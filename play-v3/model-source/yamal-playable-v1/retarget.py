# Retarget to the fitted bind skeleton while leaving approved vertices untouched.
# Unlike inverse blended skinning, each bone uses its own bind transform.
import math
from mathutils import Quaternion
scene=bpy.context.scene;sourceRig.animation_data_create();rig.animation_data_create()
exec((OUT/'girdle.py').read_text())
actions=list(bpy.data.actions)
for source in actions:
 name=source.name;sourceRig.animation_data.action=source;frames=[];duration=float(source.frame_range[1])/24
 for frame in range(round(duration*60)+1):
  f=frame*24/60;scene.frame_set(int(f),subframe=f-int(f));bpy.context.view_layer.update()
  sourcePose={p.name:p.matrix.copy() for p in sourceRig.pose.bones}
  for p in rig.pose.bones:
   p.matrix_basis.identity()
  for p in rig.pose.bones:
   if p.name not in sourcePose:
    bpy.context.view_layer.update();continue
   m=sourcePose[p.name]
   if p.parent:
    position=p.parent.matrix@p.parent.bone.matrix_local.inverted()@p.bone.head_local
   else:position=p.bone.head_local.copy()
   if p.name=='pelvis':position.z+=m.translation.z-sourceRig.data.bones['pelvis'].head_local.z
   sourceRest=sourceRig.data.bones[p.name].matrix_local
   rotation=m.to_quaternion()@sourceRest.to_quaternion().inverted()@p.bone.matrix_local.to_quaternion()
   if p.name.startswith(('upperarm_','lowerarm_','hand_','thigh_','calf_')):
    direction=m.to_quaternion()@Vector((0,1,0))
    rotation=(rotation@Vector((0,1,0))).rotation_difference(direction)@rotation
   p.matrix=Matrix.Translation(position)@rotation.to_matrix().to_4x4()
   bpy.context.view_layer.update()
  for side in ['l','r']:
   u=rig.pose.bones['upperarm_'+side];l=rig.pose.bones['lowerarm_'+side];h=rig.pose.bones['hand_'+side]
   a=(l.head-u.head).normalized();b=(h.head-l.head).normalized();angle=a.angle(b)
   desired=angle
   if name=='Idle':desired=angle*.55
   elif name=='Walk':desired=angle*.65
   elif name in ['Run','TurnLeft','TurnRight']:desired=math.radians(75)+(angle-math.radians(95))*.55
   axis=a.cross(b)
   if axis.length>.001:
    q=Quaternion(axis.normalized(),desired-angle);pivot=l.head.copy();l.matrix=Matrix.Translation(pivot)@q.to_matrix().to_4x4()@Matrix.Translation(-pivot)@l.matrix;bpy.context.view_layer.update()
   # Match palm longitudinal direction to forearm while preserving captured twist.
   b=(h.head-l.head).normalized();actual=(h.tail-h.head).normalized();q=Quaternion().slerp(actual.rotation_difference(b),.8);pivot=h.head.copy();h.matrix=Matrix.Translation(pivot)@q.to_matrix().to_4x4()@Matrix.Translation(-pivot)@h.matrix
   bpy.context.view_layer.update()
  for neck_name in ['neck_01','head']:
   neck=rig.pose.bones[neck_name];neck.rotation_quaternion=Quaternion().slerp(neck.rotation_quaternion,.40)
  bpy.context.view_layer.update()
  if name=='Idle':
   for p in rig.pose.bones:p.matrix_basis.identity()
   bpy.context.view_layer.update()
  if name in ['Idle','Walk']:

   body=next(o for o in targets if 'Body' in o.name);ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();coords=np.empty(len(me.vertices)*3);me.vertices.foreach_get('co',coords);coords=coords.reshape(-1,3);mat=np.array(ev.matrix_world);floor=float((coords@mat[2,:3]+mat[2,3]).min());ev.to_mesh_clear();p=rig.pose.bones['pelvis'];m=p.matrix.copy();m.translation.z+=(.002-floor)/rig.matrix_world.to_scale().z;p.matrix=m;bpy.context.view_layer.update()
  apply_girdle(rig)
  frames.append({p.name:(p.location.copy(),p.rotation_quaternion.copy()) for p in rig.pose.bones})
 source.name=name+'_source';action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
 for frame,pose in enumerate(frames):
  for p in rig.pose.bones:
   p.location,p.rotation_quaternion=pose[p.name];p.keyframe_insert('location',frame=frame);p.keyframe_insert('rotation_quaternion',frame=frame)
 for layer in action.layers:
  for strip in layer.strips:
   for bag in strip.channelbags:
    for fc in bag.fcurves:
     for k in fc.keyframe_points:k.interpolation='LINEAR'
 rig.animation_data.action=None;bpy.data.actions.remove(source)
 print('RETARGET',name,flush=True)
sourceRig.animation_data_clear()
for p in rig.pose.bones:p.matrix_basis.identity()
scene.render.fps=60
