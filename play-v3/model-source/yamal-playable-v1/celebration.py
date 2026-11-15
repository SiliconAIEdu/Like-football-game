exec((O/'girdle.py').read_text())
# Self-contained reactions baked on this character's actual bind skeleton.
# Keep the humerus below the shoulder and the wrist aligned with the forearm.
def ease(a,b,t):
 u=max(0,min(1,(t-a)/(b-a)));return u*u*(3-2*u)
for label in ['ReactGoal','ReactMiss']:
 r.animation_data.action=None
 if bpy.data.actions.get(label):bpy.data.actions.remove(bpy.data.actions[label])
 samples=[]
 for frame in range(169):
  t=frame/60;amount=ease(.12,.72,t)*(1-ease(1.70,2.80,t))
  for p in r.pose.bones:p.matrix_basis.identity()
  bpy.context.view_layer.update()
  if label=='ReactGoal':
   for side,sign in [('l',1),('r',-1)]:
    strong=side=='r'
    # Upper arm remains near the ribs; forearm rises forward, not sideways.
    upper=Vector((sign*(.33 if strong else .26),-.16,-.93)).normalized()
    pulse=math.sin(math.pi*max(0,min(1,(t-.78)/.65)))**2
    fore=Vector((sign*.12,-.88,.46-.20*pulse)).normalized() if strong else Vector((sign*.12,-.63,-.77)).normalized()
    for n,direction in [('upperarm',upper),('lowerarm',fore)]:
     p=r.pose.bones[n+'_'+side];q=Quaternion().slerp((p.tail-p.head).rotation_difference(direction),amount)
     p.matrix=Matrix.Translation(p.head)@q.to_matrix().to_4x4()@Matrix.Translation(-p.head)@p.matrix;bpy.context.view_layer.update()
    wrist=r.pose.bones['hand_'+side];forearm=r.pose.bones['lowerarm_'+side]
    q=Quaternion().slerp((wrist.tail-wrist.head).rotation_difference(forearm.tail-forearm.head),amount*.85)
    wrist.matrix=Matrix.Translation(wrist.head)@q.to_matrix().to_4x4()@Matrix.Translation(-wrist.head)@wrist.matrix;bpy.context.view_layer.update()
  else:r.pose.bones['head'].rotation_quaternion=Quaternion((1,0,0),-.20*amount)
  apply_girdle(r)
  samples.append({p.name:(p.location.copy(),p.rotation_quaternion.copy()) for p in r.pose.bones})
 action=bpy.data.actions.new(label);action.use_fake_user=True;r.animation_data.action=action
 for frame,pose in enumerate(samples):
  for p in r.pose.bones:
   p.location,p.rotation_quaternion=pose[p.name];p.keyframe_insert('rotation_quaternion',frame=frame);p.keyframe_insert('location',frame=frame)
 for layer in action.layers:
  for strip in layer.strips:
   for bag in strip.channelbags:
    for fc in bag.fcurves:
     for key in fc.keyframe_points:key.interpolation='LINEAR'
 r.animation_data.action=None
