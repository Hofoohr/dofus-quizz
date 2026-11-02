#!/usr/bin/env python3
"""Génère js/clepsydre.js : la grille de combat de la 5e salle (salle du boss) de la Tour de la Clepsydre (Donjon du Comte Harebourg).

Usage : python3 tools/clepsydre_carte.py
Source : la carte tactique de l'article « Donjon du Comte Harebourg » de dofus.jeuxonline.info (image 1205 × 691 px, cases de 86,6 × 43,3 px).
On lit l'image case par case : une case dont les points sont noirs n'existe pas (vide) ; une case dont le centre est recouvert par le dessus gris d'un cube
(couleur 88, 83, 58, une demi-case au-dessus du centre) est un obstacle ; toutes les autres sont des cases libres (les personnages dessinés par-dessus ne gênent pas).
Les coordonnées (x, y) suivent le même repère que le mode Confusion horaire (x vers le bas-droite, y vers le bas-gauche), recalées pour commencer à 0.
Mode test du solo (js/solo.js).
"""
import io
import json
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
URL = "https://jolstatic.fr/dofus/equipe/226595/Articles/Comte/Sallecomtetactique.png"
HW, HH = 43.3, 21.65          # demi-largeur et demi-hauteur d'une case
OX, OY = 629.0, 132.0         # centre d'une case de départ bleue (sert d'origine : (a, b) = (0, 0))
TOP = (88, 83, 58)            # dessus d'un cube


def proche(p, col, t):
    return abs(np.array(p) - np.array(col)).sum() <= t


def main():
    with urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"}), timeout=60) as r:
        im = np.array(Image.open(io.BytesIO(r.read())).convert("RGB")).astype(int)
    H, W = im.shape[:2]

    def px(x, y):
        return im[min(max(int(round(y)), 0), H - 1), min(max(int(round(x)), 0), W - 1)]

    sol, obst = [], []
    for a in range(-20, 40):
        for b in range(-20, 40):
            cx, cy = OX + HW * (a - b), OY + HH * (a + b)
            if not (-HW <= cx < W + HW and -HH <= cy < H + HH):
                continue
            dessus = sum(proche(px(cx + dx, cy - HH + dy), TOP, 12) for dx in (-12, 0, 12) for dy in (-4, 0, 4))
            noirs = sum(proche(px(cx + dx * HW * .55, cy + dy * HH * .55), (0, 0, 0), 12)
                        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (.5, .5), (-.5, .5), (.5, -.5), (-.5, -.5)))
            if dessus >= 6:
                obst.append((a, b))
            elif noirs < 5:
                sol.append((a, b))
    tout = sol + obst
    a0, b0 = min(a for a, _ in tout), min(b for _, b in tout)
    cases = lambda l: sorted([a - a0, b - b0] for a, b in l)
    texte = ("// Fichier généré par tools/clepsydre_carte.py : ne pas modifier à la main (relancer le script).\n"
             "// Grille de combat de la salle du boss de la Tour de la Clepsydre : cases libres et obstacles, en (x, y) comme js/confusion.js.\n"
             "export const CLEPSYDRE = {\n  sol: " + json.dumps(cases(sol)) + ",\n  obstacles: " + json.dumps(cases(obst)) + ",\n};\n")
    (ROOT / "js" / "clepsydre.js").write_text(texte, encoding="utf-8")
    print(len(sol), "cases libres,", len(obst), "obstacles")


if __name__ == "__main__":
    main()
