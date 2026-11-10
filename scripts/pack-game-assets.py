"""Build the smaller runtime copies from the original game assets (requires Pillow)."""

import gzip
import io
import json
import struct
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "play-v3/assets"


def write_portrait(path):
    with Image.open(path) as image:
        image.thumbnail((768, 1024), Image.Resampling.LANCZOS)
        image.save(path.with_suffix(".webp"), quality=86, method=6)


def write_model(path):
    source = path.read_bytes()
    magic, version, _, json_size, json_type = struct.unpack_from("<5I", source)
    assert (magic, version, json_type) == (0x46546C67, 2, 0x4E4F534A)
    model = json.loads(source[20:20 + json_size])
    bin_size, bin_type = struct.unpack_from("<2I", source, 20 + json_size)
    assert bin_type == 0x004E4942
    binary = source[28 + json_size:28 + json_size + bin_size]
    assert len(model["buffers"]) == 1 and all(view["buffer"] == 0 for view in model["bufferViews"])

    images = {image["bufferView"]: image for image in model.get("images", [])}
    # glTF ignores base color alpha for OPAQUE materials.
    alpha_images = {
        model["textures"][base_color["index"]]["source"]
        for material in model.get("materials", [])
        if material.get("alphaMode", "OPAQUE") != "OPAQUE"
        if (base_color := material.get("pbrMetallicRoughness", {}).get("baseColorTexture"))
    }
    alpha_views = {model["images"][index]["bufferView"] for index in alpha_images}
    packed = bytearray()
    for index, view in enumerate(model["bufferViews"]):
        start = view.get("byteOffset", 0)
        payload = binary[start:start + view["byteLength"]]
        image = images.get(index)
        if image and image["mimeType"] == "image/png":
            with Image.open(io.BytesIO(payload)) as texture:
                rgba = texture.convert("RGBA")
                if index not in alpha_views or rgba.getchannel("A").getextrema() == (255, 255):
                    encoded = io.BytesIO()
                    rgba.convert("RGB").save(encoded, "JPEG", quality=92, subsampling=0, optimize=True)
                    if encoded.tell() < len(payload):
                        payload = encoded.getvalue()
                        image["mimeType"] = "image/jpeg"
        view["byteOffset"] = len(packed)
        view["byteLength"] = len(payload)
        packed.extend(payload)
        packed.extend(b"\0" * (-len(packed) % 4))

    model["buffers"][0]["byteLength"] = len(packed)
    metadata = json.dumps(model, separators=(",", ":")).encode()
    metadata += b" " * (-len(metadata) % 4)
    header = struct.pack("<5I", magic, version, 28 + len(metadata) + len(packed), len(metadata), json_type)
    optimized = header + metadata + struct.pack("<2I", len(packed), bin_type) + packed
    path.with_suffix(".glb.gz").write_bytes(gzip.compress(optimized, compresslevel=9, mtime=0))


if __name__ == "__main__":
    for path in sorted((ROOT / "game/assets").glob("*.png")):
        write_portrait(path)
    for path in [ROOT / "game/assets/messi-photo.jpg", *sorted(ASSETS.glob("*portrait.png"))]:
        write_portrait(path)
    for path in [ASSETS / "ronaldo-natural.glb", *sorted(ASSETS.glob("players/*.glb")), *sorted(ASSETS.glob("crowd/*.glb"))]:
        write_model(path)
