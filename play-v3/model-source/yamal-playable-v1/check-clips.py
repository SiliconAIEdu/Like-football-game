exec((O/'girdle.py').read_text())
for label,angle,plane in [('CheckRest',None,0),('CheckSide45',45,0),('CheckSide90',90,0),('CheckForward90',90,90),('CheckOverhead',155,0),('CheckForwardHigh',155,90),('CheckDiagonal',120,45)]:
 r.animation_data.action=None
 if bpy.data.actions.get(label):bpy.data.actions.remove(bpy.data.actions[label])
 if angle is None:
  for p in r.pose.bones:p.matrix_basis.identity()
  bpy.context.view_layer.update()
 else:set_arm_pose(r,angle,plane)
 action=bpy.data.actions.new(label);action.use_fake_user=True;r.animation_data.action=action
 for p in r.pose.bones:
  for frame in [0,60]:p.keyframe_insert('location',frame=frame);p.keyframe_insert('rotation_quaternion',frame=frame)
 r.animation_data.action=None
