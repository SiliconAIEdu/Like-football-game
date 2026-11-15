import bpy,numpy as np
from pathlib import Path
from scipy.sparse import coo_matrix,diags
P=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(P/'rig.blend'))
exec((P/'girdle.py').read_text())
r=next(o for o in bpy.data.objects if o.type=='ARMATURE');o=bpy.data.objects['Body']
rest=np.array([v.co for v in o.data.vertices]);N=len(rest);edges=np.array([e.vertices[:] for e in o.data.edges]);names={g.index:g.name for g in o.vertex_groups}
adj=coo_matrix((np.ones(len(edges)*2),(np.r_[edges[:,0],edges[:,1]],np.r_[edges[:,1],edges[:,0]])),shape=(N,N)).tocsr();adj=diags(1/np.maximum(1,np.asarray(adj.sum(1)).ravel()))@adj
def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
o.shape_key_add(name='Basis')
for label,elevation,plane in [('UpperArmVolume',90,0),('ShoulderFront',90,90),('ShoulderOverhead',155,0),('ShoulderOverheadFront',155,90)]:
 set_arm_pose(r,elevation,plane)
 mats={g.index:np.array(r.pose.bones[g.name].matrix@r.data.bones[g.name].matrix_local.inverted()) for g in o.vertex_groups}
 M=np.array([sum((g.weight*mats[g.group] for g in v.groups),np.zeros((4,4))) for v in o.data.vertices]);posed=np.einsum('nij,nj->ni',M,np.c_[rest,np.ones(N)])[:,:3]
 for side,sign in [('l',1),('r',-1)]:
  key=o.shape_key_add(name=label+'_'+side);x=abs(rest[:,0]);z=rest[:,2]
  weight=smooth(.12,.17,x)*(1-smooth(.27,.31,x))*smooth(1.20,1.31,z)*(1-smooth(1.49,1.56,z))*(rest[:,0]*sign>0)
  result=posed.copy()
  for _ in range(35):result+=(adj@result-result)*weight[:,None]*.32
  arm=np.array([sum(g.weight for g in v.groups if names[g.group]=='upperarm_'+side) for v in o.data.vertices])
  u=r.pose.bones['upperarm_'+side];h=np.array(u.head);axis=np.array((u.tail-u.head).normalized());t=(result-h)@axis;centers=h+t[:,None]*axis;rad=result-centers;radius=np.linalg.norm(rad,axis=1)
  b=u.bone;rh=np.array(b.head_local);ra=np.array((b.tail_local-b.head_local).normalized());rt=(rest-rh)@ra;rr=np.linalg.norm(rest-rh-rt[:,None]*ra,axis=1)
  fill=smooth(.55,.9,arm)*smooth(.01,.045,rt)*(1-smooth(.17,.24,rt))*(rest[:,0]*sign>0)*.75
  result+=rad*(np.maximum(0,np.minimum(rr,.075)-radius)/np.maximum(radius,.001)*fill)[:,None]
  indices=np.flatnonzero((weight>0)|(fill>0));co=np.einsum('nij,nj->ni',np.linalg.inv(M[indices]),np.c_[result[indices],np.ones(len(indices))])
  for i,v in zip(indices,co):key.data[int(i)].co=v[:3]
for p in r.pose.bones:p.matrix_basis.identity()
for k in o.data.shape_keys.key_blocks:k.value=0
bpy.ops.wm.save_as_mainfile(filepath=str(P/'rig.blend'))
