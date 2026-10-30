#!/usr/bin/env python3
"""Génère la catégorie « 4 images 1 mot » : quatre monstres dont les noms ont un mot en commun (« Sombre » : Mineur Sombre, Forgeron Sombre…).

Usage : python3 tools/quatre_images.py
Écrit : js/questions/quatre-images.js   et   img/quatre/*.png
Source : DofusDB (mêmes monstres que « Monstre pixelisé » : ni quêtes, ni archimonstres, ni raids, ni invocations, ni Nowel).
Le joueur voit les 4 images et doit écrire le mot ; le plus rapide gagne le plus de points (voir js/devine.js).
Les illustrations appartiennent à Ankama ; DofusDB en est la source.
"""
import hashlib
import json
import random
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import monstres_pixel as mp   # noqa: E402  (réutilise le téléchargement et les filtres des monstres)

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "img" / "quatre"
# Mots faciles à deviner (pas des noms de familles) ; on en garde ceux qui ont assez de monstres différents.
MOTS = ["sombre", "sauvage", "rouge", "noir", "royal", "fantome", "esprit", "totem", "bleu", "vert", "marionnette", "maitre", "blanc",
        "rose", "chef", "terre", "indigo", "venerable", "irascible", "novice", "mature", "juvenile", "bebe", "coquille", "gardien", "geant",
        "elementaire", "perturbe", "ensorcele", "obscur", "dore", "jaune", "doree", "furieux", "vieux", "petit", "grand", "mini"]
PAR_MOT_MAX = 3      # énigmes par mot
PTS, TEMPS = 5, 30
QUESTION = "4 images, 1 mot : quel mot ces 4 monstres ont-ils en commun dans leur nom ?"


def sans_accent(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def main():
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    monstres = mp.tous_les_monstres()
    raids = mp.races_exclues()
    vus = {}
    for m in sorted(monstres, key=lambda m: m["id"]):
        nom = " ".join(((m.get("name") or {}).get("fr") or "").split())
        if (nom and "?" not in nom and m.get("img") and m.get("grades") and not m.get("isQuestMonster") and not m.get("isMiniBoss")
                and m.get("race") not in raids and nom not in mp.EXCLUS and nom not in vus):
            vus[nom] = m
    groupes = defaultdict(list)       # mot (sans accent) -> [(nom, monstre)]
    graphies = defaultdict(lambda: defaultdict(int))   # mot -> écriture avec accents -> nombre
    for nom, m in vus.items():
        for w in set(re.split(r"[^\wÀ-ÿ]+", nom)):
            k = sans_accent(w)
            if k in MOTS:
                groupes[k].append((nom, m))
                graphies[k][w.lower()] += 1
    rng = random.Random(2026)
    items, empreintes = [], {}

    def image(m):
        fichier = IMG_DIR / (hashlib.sha1(f"quatre-{m['id']}".encode()).hexdigest()[:10] + ".png")
        if not fichier.exists():
            im = mp.telecharger(m)
            if im is None:
                return None
            im.save(fichier, optimize=True)
        h = hashlib.md5(fichier.read_bytes()).hexdigest()
        return fichier, h

    for mot in MOTS:
        liste = groupes.get(mot, [])
        rng.shuffle(liste)
        affichage = max(graphies[mot], key=graphies[mot].get).capitalize() if mot in graphies else mot.capitalize()
        enigmes = []
        courant = []
        for nom, m in liste:
            if len(enigmes) >= PAR_MOT_MAX:
                break
            r = image(m)
            if r is None or any(r[1] == h for _, h in courant):
                continue                      # image absente, ou identique à une autre de l'énigme
            courant.append((r[0], r[1]))
            if len(courant) == 4:
                enigmes.append([f"img/quatre/{f.name}" for f, _ in courant]); courant = []
        for imgs in enigmes:
            items.append({"q": QUESTION, "mot": affichage, "images": imgs, "pts": PTS, "temps": TEMPS})
        print(f"  {affichage:12} {len(liste):3} monstres -> {len(enigmes)} énigme(s)", file=sys.stderr)
    rng.shuffle(items)
    lignes = ["    " + json.dumps(i, ensure_ascii=False) + "," for i in items]
    (ROOT / "js/questions/quatre-images.js").write_text(
        "// Fichier généré par tools/quatre_images.py : ne pas modifier à la main (relancer le script).\n"
        "// « 4 images 1 mot » : quatre monstres dont les noms ont un mot en commun ; le joueur écrit le mot, le plus rapide gagne le plus de points.\n"
        'export default {\n  cat: "4 images 1 mot",\n  items: [\n' + "\n".join(lignes) + "\n  ],\n};\n", encoding="utf-8")
    # on supprime les images devenues inutiles
    utilisees = {Path(i).name for it in items for i in it["images"]}
    for f in IMG_DIR.iterdir():
        if f.name not in utilisees:
            f.unlink()
    print(f"{len(items)} énigmes écrites ({len(utilisees)} images)", file=sys.stderr)


if __name__ == "__main__":
    main()
