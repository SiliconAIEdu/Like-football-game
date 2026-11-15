import os
from pathlib import Path
GAME=Path(os.environ.get("GAME_ROOT",str(Path(__file__).resolve().parents[2])))
SOURCE=Path(os.environ.get("SOURCE_GLB",str(GAME.parents[1]/"output/原创金发球员-3D-Demo/player-demo.glb")))
