#!/usr/bin/env python3
"""Génère la catégorie « Pokémon pixelisé » : 100 Pokémon des générations 1 à 3, tirés au hasard (graine fixe), à nommer sur une image qui se précise.

Usage : python3 tools/pokemon_pixel.py
Écrit : js/questions/pokemon-pixel.js   et   img/pokemon/*.png
Noms français : PokeAPI (pokeapi.co). Images : artworks officiels du dépôt PokeAPI/sprites. Les Pokémon sont © Nintendo / Game Freak / Creatures.
Le nom du fichier image est un code (empreinte), pour ne pas révéler le nom.
"""
import hashlib
import io
import json
import random
import time
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "img" / "pokemon"
H = {"User-Agent": "Mozilla/5.0 quiz"}
PTS, TEMPS, NB = 5, 30, 100
EXCLUS = {29, 32, 201}   # Nidoran femelle/mâle (symboles), Zarbi (plusieurs formes)


def ouvrir(url):
    for n in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=60) as r:
                return r.read()
        except OSError:
            if n == 3:
                raise
            time.sleep(2 ** (n + 1))


def main():
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    ids = list(range(1, 387))
    random.Random(7).shuffle(ids)
    items = []
    for i in ids:
        if len(items) >= NB:
            break
        if i in EXCLUS:
            continue
        d = json.loads(ouvrir(f"https://pokeapi.co/api/v2/pokemon-species/{i}"))
        nom = next(n["name"] for n in d["names"] if n["language"]["name"] == "fr")
        if any(c in nom for c in "♀♂"):
            continue
        fichier = IMG_DIR / (hashlib.sha1(f"pokemon-{i}".encode()).hexdigest()[:10] + ".png")
        if not fichier.exists():
            im = Image.open(io.BytesIO(ouvrir(f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{i}.png"))).convert("RGBA")
            im = im.crop(im.getbbox())
            s = max(im.size) + 20
            carre = Image.new("RGBA", (s, s), (0, 0, 0, 0))
            carre.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
            carre.resize((256, 256), Image.LANCZOS).save(fichier, optimize=True)
        items.append({"q": "Quel est ce Pokémon ? Tape son nom exact : l'image devient plus nette avec le temps, le plus rapide gagne le plus de points !",
                      "nom": nom, "sprite": f"img/pokemon/{fichier.name}", "pts": PTS, "temps": TEMPS})
    lignes = ["    " + json.dumps(it, ensure_ascii=False) + "," for it in items]
    (ROOT / "js/questions/pokemon-pixel.js").write_text(
        "// Fichier généré par tools/pokemon_pixel.py : ne pas modifier à la main (relancer le script).\n"
        "// Un Pokémon (générations 1 à 3) : image très pixelisée qui se précise ; il faut taper son nom exact, le plus vite possible (voir js/devine.js).\n"
        'export default {\n  cat: "Pokémon pixelisé",\n  items: [\n' + "\n".join(lignes) + "\n  ]\n};\n", encoding="utf-8")
    print(f"{len(items)} Pokémon écrits")


if __name__ == "__main__":
    main()
