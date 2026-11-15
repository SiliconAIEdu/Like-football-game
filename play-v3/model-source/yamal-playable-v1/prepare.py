from config import SOURCE
import bpy,bmesh,numpy as np,json
from pathlib import Path
P=Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
report={}
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 o.name='Body' if 'body' in o.name.lower() else 'PortraitHead'
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(o.data);bm.free()
 original=len(o.data.polygons);m=o.modifiers.new('Game resolution','DECIMATE');m.ratio=min(1,(65000 if o.name=='Body' else 45000)/original);bpy.ops.object.modifier_apply(modifier=m.name)
 for f in o.data.polygons:f.use_smooth=True
 for mat in o.data.materials:
  for node in mat.node_tree.nodes:
   if node.type=='TEX_IMAGE' and node.image and max(node.image.size)>2048:node.image.scale(2048,2048)
 co=np.array([v.co for v in o.data.vertices]);report[o.name]={'before_faces':original,'faces':len(o.data.polygons),'min':co.min(0).tolist(),'max':co.max(0).tolist()}
 if o.name=='Body':
  for z in [.1,.48,.90,1.,1.15,1.25,1.38,1.46]:
   q=co[(abs(co[:,2]-z)<.008)&(co[:,0]>0)]
   print('SLICE',z,'x range',np.quantile(q[:,0],[0,.1,.5,.9,1]),flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(P/'prepared.blend'))
(P/'mesh-report.json').write_text(json.dumps(report,indent=2));print(report,flush=True)
