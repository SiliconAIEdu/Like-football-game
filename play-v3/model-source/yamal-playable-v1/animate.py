from config import GAME
import bpy,numpy as np,math
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
OUT=Path(__file__).resolve().parent;O=OUT
bpy.ops.wm.open_mainfile(filepath=str(OUT/'rig.blend'))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');targets=[o for o in bpy.data.objects if o.type=='MESH']
bpy.context.scene.render.fps=24
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(GAME/'assets/ronaldo-natural.glb'));added=set(bpy.data.objects)-before
sourceRig=next(o for o in added if o.type=='ARMATURE')
exec((OUT/'retarget.py').read_text())
for o in added:bpy.data.objects.remove(o,do_unlink=True)
r=rig
exec((OUT/'celebration.py').read_text());exec((OUT/'check-clips.py').read_text())
for a in bpy.data.actions:a.use_fake_user=True
rig.animation_data.action=None
for p in rig.pose.bones:p.matrix_basis.identity()
bpy.context.scene.render.fps=60
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'animated.blend'))
