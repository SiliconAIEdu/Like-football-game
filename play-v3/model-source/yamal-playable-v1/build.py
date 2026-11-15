import bpy, numpy as np, json
from pathlib import Path
from mathutils import Matrix,Vector
O=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(O/'prepared.blend'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in meshes:
 o.vertex_groups.clear()
 if o.name=='Body':
  # Release the generated low underarm saddle without moving the chest core.
  for v in o.data.vertices:
   x,y,z=v.co;ax=abs(x)
   if .145<ax<.205 and 1.17<z<1.40:
    w=max(0,1-abs(ax-.175)/.03);w=w*w*(3-2*w)
    h=(z-1.17)/.08 if z<1.25 else (1.40-z)/.15
    v.co.z+=.085*w*max(0,h)

# A new anatomical rest skeleton, constructed in the approved mesh coordinates.
# No joint positions or bind matrices are copied from the game skeleton.
data=bpy.data.armatures.new('Yamal_Independent_Anatomy');rig=bpy.data.objects.new('Yamal_Rig',data);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(n,h,t,parent=None):
 b=data.edit_bones.new(n);
 def fit(v):
  x,y,z=v
  z=float(np.interp(z,[0,.105,.52,.99,1.225,1.47,1.59,1.83],[0,.105,.50,.96,1.20,1.45,1.59,1.80]))
  x*=.81 if z<.2 else .92 if z<.6 else .96
  return (x,y,z)
 b.head=fit(h);b.tail=fit(t)
 if n.startswith('lowerarm_'):b.tail.z=.94
 if n.startswith('hand_'):b.head.z=.94;b.tail.z=.79
 if parent:b.parent=data.edit_bones[parent]
 b.use_deform=n!='Root'
bone('Root',(0,0,0),(0,0,.15))
bone('pelvis',(0,.025,.99),(0,.025,1.08),'Root')
bone('spine_01',(0,.025,1.08),(0,.02,1.23),'pelvis')
bone('spine_02',(0,.02,1.23),(0,.015,1.38),'spine_01')
bone('spine_03',(0,.015,1.38),(0,.015,1.49),'spine_02')
bone('neck_01',(0,.015,1.49),(0,.01,1.59),'spine_03')
bone('head',(0,.01,1.59),(0,.01,1.83),'neck_01')
for side,sgn in [('l',1),('r',-1)]:
 def p(x,y,z):return(sgn*x,y,z)
 bone('clavicle_'+side,p(.03,.015,1.46),p(.20,.01,1.47),'spine_03')
 bone('scapula_'+side,p(.20,.01,1.47),p(.12,.10,1.38),'clavicle_'+side)
 bone('upperarm_'+side,p(.20,.01,1.47),p(.266,.015,1.225),'scapula_'+side)
 bone('deltoid_'+side,p(.20,.01,1.47),p(.266,.015,1.225),'scapula_'+side)
 bone('lowerarm_'+side,p(.266,.015,1.225),p(.289,-.015,1.005),'upperarm_'+side)
 bone('hand_'+side,p(.289,-.015,1.005),p(.292,-.025,.88),'lowerarm_'+side)
 bone('thigh_'+side,p(.105,.025,.99),p(.148,.025,.52),'pelvis')
 bone('calf_'+side,p(.148,.025,.52),p(.210,.04,.105),'thigh_'+side)
 bone('foot_'+side,p(.210,.04,.105),p(.225,-.055,.035),'calf_'+side)
 bone('ball_'+side,p(.225,-.055,.035),p(.235,-.112,.028),'foot_'+side)
bpy.ops.object.mode_set(mode='OBJECT')
for p in rig.pose.bones:p.rotation_mode='QUATERNION'
def smooth(a,b,v):
 t=float(np.clip((v-a)/(b-a),0,1));return t*t*(3-2*t)
def blend(a,b,t):return {a:1-t,b:t}
for o in meshes:
 arm_region=np.zeros(len(o.data.vertices))
 if 'Body' in o.name:
  from scipy.sparse import coo_matrix,diags
  from scipy.sparse.csgraph import connected_components
  from scipy.sparse.linalg import spsolve
  coords=np.array([v.co for v in o.data.vertices]);edges=np.array([e.vertices[:] for e in o.data.edges])
  mask=coords[:,2]<1.20;e=edges[mask[edges].all(1)]
  graph=coo_matrix((np.ones(len(e)),(e[:,0],e[:,1])),shape=(len(coords),len(coords))).tocsr()
  _,labels=connected_components(graph,directed=False)
  for sign in [-1,1]:
   seed=np.argmin(np.linalg.norm(coords-np.array([sign*.275,0,1.0]),axis=1));component=labels==labels[seed]
   assert coords[component,2].min()>.70, 'Arm component leaks into legs'
   arm_region[component]=1
  fixed=mask|(np.abs(coords[:,0])<.14)|(coords[:,2]>1.51)
  outer=(np.abs(coords[:,0])>.225)&(coords[:,2]>1.30)&(coords[:,2]<1.42);fixed|=outer;arm_region[outer]=1
  length=np.linalg.norm(coords[edges[:,0]]-coords[edges[:,1]],axis=1)
  w=1/np.maximum(length,1e-5);adj=coo_matrix((np.r_[w,w],(np.r_[edges[:,0],edges[:,1]],np.r_[edges[:,1],edges[:,0]])),shape=(len(coords),len(coords))).tocsr()
  lap=diags(np.asarray(adj.sum(1)).ravel())-adj;free=np.flatnonzero(~fixed);known=np.flatnonzero(fixed)
  arm_region[free]=spsolve(lap[free][:,free]+diags(np.full(len(free),1e-8)),-lap[free][:,known]@arm_region[known]);arm_region=np.clip(arm_region,0,1)
 for b in data.bones:o.vertex_groups.new(name=b.name)
 for v in o.data.vertices:
  x,y,z=v.co;side='l' if x>0 else 'r';ax=abs(x)
  if 'Head' in o.name:
   w=blend('neck_01','head',smooth(1.54,1.66,z))
  else:
   if z>1.5:w=blend('neck_01','head',smooth(1.54,1.66,z))
   elif z>1.37:w=blend('spine_03','neck_01',smooth(1.46,1.53,z))
   elif z>1.22:w=blend('spine_02','spine_03',smooth(1.27,1.38,z))
   elif z>1.08:w=blend('spine_01','spine_02',smooth(1.13,1.25,z))
   elif z>.92:w=blend('pelvis','spine_01',smooth(1.0,1.1,z))
   elif z>.58:w=blend('thigh_'+side,'pelvis',max(smooth(.78,.97,z), (1-smooth(.025,.10,ax))*smooth(.68,.83,z)))
   elif z>.43:w=blend('calf_'+side,'thigh_'+side,smooth(.44,.55,z))
   elif z>.10:w=blend('foot_'+side,'calf_'+side,smooth(.10,.18,z))
   else:w=blend('foot_'+side,'ball_'+side,smooth(.035,.09,-y))
   if arm_region[v.index]>1e-8:
    arm=smooth(.08,.62,float(arm_region[v.index]))
    if z>1.41:aw=blend('upperarm_'+side,'scapula_'+side,smooth(1.44,1.55,z)*.25)
    elif z>1.17:aw=blend('lowerarm_'+side,'upperarm_'+side,smooth(1.15,1.25,z))
    else:aw=blend('hand_'+side,'lowerarm_'+side,smooth(.91,.99,z))
    w={n:a*(1-arm) for n,a in w.items()}
    for n,a in aw.items():w[n]=w.get(n,0)+arm*a
   if z>1.28 and arm_region[v.index]>1e-8:
    a=smooth(.08,.62,float(arm_region[v.index]));support=4*a*(1-a)*.85
    w={n:v*(1-support) for n,v in w.items()};w['deltoid_'+side]=support
  total=sum(w.values())
  for n,a in w.items():
   if a>1e-6:o.vertex_groups[n].add([v.index],a/total,'REPLACE')
 o.parent=rig;o.matrix_parent_inverse=Matrix.Identity(4);mod=o.modifiers.new('Independent anatomical skin','ARMATURE');mod.object=rig
rig['approvedPortrait']=True;rig['rigVersion']='yamal-playable-v1';rig['bindPose']='approved relaxed pose; new joint positions'
bpy.ops.wm.save_as_mainfile(filepath=str(O/'rig.blend'))
print('NEW RIG',len(data.bones),flush=True)
