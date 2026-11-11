#!/usr/bin/env python3
"""Génère la catégorie « Archimonstre » : js/questions/archimonstres.js + img/archimonstres/*.png.

Usage : python3 tools/archimonstres_dofus.py
Deux types de questions pour chaque archimonstre (« groupe » : à chaque tirage de la catégorie, les deux types ont autant de chances) :
  - « image » : le sprite de l'archimonstre avec la flamme bleue des archimonstres au-dessus (sans toucher le sprite) ; on demande son nom ;
  - « nom » : le nom de l'archimonstre ; on demande le nom du monstre correspondant (« correspondingNonMiniBoss » dans DofusDB).
Les noms, les sprites et la correspondance viennent de DofusDB (api.dofusdb.fr) : l'archimonstre = race « Archimonstres », isMiniBoss, avec un nom et une image ;
le monstre correspondant = « correspondingNonMiniBoss » de DofusDB (le monstre dont l'archimonstre est la version « archi »). Sans monstre correspondant, il n'y a pas de question « nom » ;
si deux archimonstres ont exactement le même dessin, il n'y a pas de question « image » (réponse ambiguë).
La flamme (tools/archimonstres/flamme.png) est découpée dans une capture du jeu fournie par le propriétaire du site.
Correction automatique : js/devine.js (« nom2 » : deux lettres d'écart tolérées pour les noms de 6 lettres ou plus ; le nom court avant « le/la/l' » est accepté).
"""
import hashlib
import io
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "img" / "archimonstres"
FLAMME = ROOT / "tools" / "archimonstres" / "flamme.png"
API = "https://api.dofusdb.fr"
RACE_ARCHI = 78
PTS, TEMPS = 5, 30
FLAMME_L = 44        # largeur de la flamme (px, pour un sprite de 128 px)
ECHELLE = 2          # agrandissement du sprite et de la flamme (les sprites de DofusDB sont petits)


def get(url):
    for n in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=60) as r:
                time.sleep(0.1)
                return r.read()
        except OSError:
            if n == 3:
                raise
            time.sleep(2 ** (n + 1))


def monstres():
    out, skip = [], 0
    while True:
        q = urllib.parse.urlencode({"$limit": 50, "$skip": skip, "$select[]": ["id", "name.fr", "gfxId", "race", "isMiniBoss", "img", "correspondingNonMiniBoss"]}, doseq=True, safe="[]$")
        r = json.loads(get(f"{API}/monsters?{q}"))
        out += r["data"]
        skip += len(r["data"])
        if not r["data"] or skip >= r["total"]:
            return out


def nom(m):
    return " ".join(((m.get("name") or {}).get("fr") or "").split())


def image_flamme(sprite_png):
    """Sprite + flamme au-dessus, centrée sur la tête, sans recouvrir un seul pixel du sprite."""
    sp = Image.open(io.BytesIO(sprite_png)).convert("RGBA")
    a = np.array(sp)[..., 3]
    ys, xs = np.where(a > 40)
    if not len(ys):
        return None
    haut = ys.min()
    cx = int(xs[ys < haut + (ys.max() - ys.min()) * 0.45].mean())   # centre de la tête (moitié haute du sprite)
    fl = Image.open(FLAMME).convert("RGBA")
    fl = fl.resize((FLAMME_L, round(fl.height * FLAMME_L / fl.width)), Image.LANCZOS)
    marge = 2
    cv = Image.new("RGBA", (sp.width, sp.height + fl.height + marge), (0, 0, 0, 0))
    cv.alpha_composite(sp, (0, fl.height + marge))
    x = min(max(cx - fl.width // 2, 0), sp.width - fl.width)
    cv.alpha_composite(fl, (x, haut))   # la flamme repose juste au-dessus du point le plus haut du sprite (marge de 2 px)
    return cv.resize((cv.width * ECHELLE, cv.height * ECHELLE), Image.LANCZOS)


def main():
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    tous = monstres()
    archis = [m for m in tous if m.get("race") == RACE_ARCHI and m.get("isMiniBoss") and nom(m) and "?" not in nom(m) and m.get("img") and m.get("gfxId")]
    gfx_archis = {}
    for m in archis:
        gfx_archis.setdefault(m["gfxId"], []).append(m)
    items, sans_base, ambigus, sans_image = [], [], [], []
    for m in sorted(archis, key=lambda m: m["id"]):
        n = nom(m)
        base = nom(m.get("correspondingNonMiniBoss") or {})
        bs = [base] if base and "?" not in base else []
        fichier = IMG_DIR / (hashlib.sha1(f"archi-{m['id']}".encode()).hexdigest()[:10] + ".png")
        if len(gfx_archis[m["gfxId"]]) > 1:
            ambigus.append(n)
        else:
            if not fichier.exists():
                im = image_flamme(get(m["img"]))
                if im is None:
                    sans_image.append(n)
                    continue
                im.save(fichier, optimize=True)
            items.append({"q": "Quel est le nom de cet archimonstre ?", "champs": [["Nom de l'archimonstre", n]], "pts": PTS, "temps": TEMPS,
                          "img": f"img/archimonstres/{fichier.name}", "petite": True, "verif": ["nom2"], "groupe": "image"})
        if bs:
            items.append({"q": f"Quel est le monstre correspondant à l'archimonstre « {n} » ?", "champs": [["Nom du monstre", " / ".join(bs)]],
                          "pts": PTS, "temps": TEMPS, "verif": ["nom2"], "groupe": "nom"})
        else:
            sans_base.append(n)
    lignes = ["    " + json.dumps(i, ensure_ascii=False) + "," for i in items]
    (ROOT / "js/questions/archimonstres.js").write_text(
        "// Fichier généré par tools/archimonstres_dofus.py : ne pas modifier à la main (relancer le script).\n"
        "// Deux types de questions (« groupe ») : le nom d'un archimonstre à partir de son image avec la flamme, et le monstre correspondant à un nom d'archimonstre.\n"
        'export default {\n  cat: "Archimonstre",\n  items: [\n' + "\n".join(lignes) + "\n  ]\n};\n", encoding="utf-8")
    ni = sum(1 for i in items if i["groupe"] == "image")
    print(f"{len(archis)} archimonstres, {ni} questions « image », {len(items) - ni} questions « nom » ; sans monstre correspondant : {len(sans_base)} ; dessin partagé : {len(ambigus)}")
    for t, l in (("sans monstre correspondant", sans_base), ("dessin partagé (pas de question image)", ambigus), ("sans image exploitable", sans_image)):
        if l:
            print(" ", t, ":", ", ".join(l))


if __name__ == "__main__":
    main()
