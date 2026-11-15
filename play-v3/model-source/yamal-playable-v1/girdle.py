# Shoulder-girdle approximation for this game rig, not a clinical simulator.
# Clavicle elevation + scapular upward rotation/protraction; preserve humeral aim.
import bpy, math
from mathutils import Vector,Matrix,Quaternion
def ease(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def apply_girdle(r):
 thorax=r.pose.bones['spine_03'];basis=(thorax.matrix@thorax.bone.matrix_local.inverted()).to_3x3()
 up=(basis@Vector((0,0,1))).normalized();forward=(basis@Vector((0,-1,0))).normalized()
 for side,sign in [('l',1),('r',-1)]:
  u=r.pose.bones['upperarm_'+side];c=r.pose.bones['clavicle_'+side];sc=r.pose.bones['scapula_'+side]
  initial=u.matrix.copy();direction=(u.tail-u.head).normalized();angle=math.degrees(direction.angle(-up))
  elevation=ease(25,155,angle);reach=max(0,direction.dot(forward))*ease(20,80,angle)
  # Set shoulder helpers relative to their anatomical rest, avoiding accumulated offsets.
  c.rotation_quaternion=Quaternion();sc.matrix_basis.identity();r.pose.bones['deltoid_'+side].matrix_basis.identity();bpy.context.view_layer.update()
  axis=(basis@Vector((0,-sign,0))).normalized();pivot=c.head.copy()
  q=Quaternion(axis,math.radians(12)*elevation)
  c.matrix=Matrix.Translation(pivot)@q.to_matrix().to_4x4()@Matrix.Translation(-pivot)@c.matrix;bpy.context.view_layer.update()
  sm=sc.matrix.copy();sm.translation+=forward*(.022*reach)+up*(.008*elevation)
  q=Quaternion(axis,math.radians(25)*elevation)
  sc.matrix=Matrix.Translation(sm.translation)@q.to_matrix().to_4x4()@Matrix.Translation(-sm.translation)@sm;bpy.context.view_layer.update()
  new_head=u.head.copy();initial.translation=new_head;u.matrix=initial;bpy.context.view_layer.update()
  d=r.pose.bones['deltoid_'+side];q=d.matrix.to_quaternion().slerp(u.matrix.to_quaternion(),.5);d.matrix=Matrix.Translation(new_head)@q.to_matrix().to_4x4();bpy.context.view_layer.update()
def set_arm_pose(r,elevation,plane=0):
 # plane=0 lateral raise, 90 forward reach. Both shoulders in torso coordinates.
 for p in r.pose.bones:p.matrix_basis.identity()
 bpy.context.view_layer.update();a=math.radians(elevation);p=math.radians(plane)
 for side,sign in [('l',1),('r',-1)]:
  direction=Vector((sign*math.sin(a)*math.cos(p),-math.sin(a)*math.sin(p),-math.cos(a)))
  for name in ['upperarm','lowerarm','hand']:
   b=r.pose.bones[name+'_'+side];q=(b.tail-b.head).rotation_difference(direction)
   b.matrix=Matrix.Translation(b.head)@q.to_matrix().to_4x4()@Matrix.Translation(-b.head)@b.matrix;bpy.context.view_layer.update()
 apply_girdle(r)
