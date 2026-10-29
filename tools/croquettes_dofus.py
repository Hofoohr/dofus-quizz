#!/usr/bin/env python3
"""Génère les questions sur les croquettes infusées (catégorie « Légendaire ») : js/questions/croquettes.js

Usage : python3 tools/croquettes_dofus.py
Source : DofusDB (api.dofusdb.fr). Une « Croquette infusée du X » (objet « Nourriture pour familier ») donne un pouvoir passif au familier légendaire.
Pour chacune des croquettes, deux questions à deux champs :
  - le nom de la croquette est donné : on demande l'effet, et « Quelle légende craft cette croquette ? » ;
  - l'effet est donné : on demande le nom de la croquette, et « Quelle légende craft cette croquette ? ».
La légende vient de la recette : un des ingrédients est « Légende animale de Poukachi / Kwakarticho / Bakushana / Magicrabe ».
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://api.dofusdb.fr"
LEGENDES = {20964: "Kwakarticho", 20965: "Poukachi", 20966: "Magicrabe", 20967: "Bakushana"}   # « Légende animale de … »
PTS, TEMPS_EFFET, TEMPS_NOM = 5, 50, 40
CHAMP_LEGENDE = "Quelle légende craft cette croquette ? (la moitié des points)"
CHAMP_EFFET = "Effet de la croquette (la moitié des points, le plus précis gagne)"


def get(path, params=None):
    url = f"{API}/{path}?{urllib.parse.urlencode(params or {}, doseq=True, safe='[]$')}"
    for n in range(4):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                time.sleep(0.15)
                return json.load(r)
        except OSError:
            if n == 3:
                raise
            time.sleep(2 ** (n + 1))


def effet(pouvoir_id):
    """(nom du pouvoir, texte de l'effet) d'après la description du sort du pouvoir, au niveau 200."""
    s = get(f"spells/{pouvoir_id}")
    d = re.sub(r"\{\{spell,\d+,\d+::([^}]*)\}\}", r"\1", (s.get("description") or {}).get("fr", ""))
    d = " ".join(d.split())
    nom = " ".join(s["name"]["fr"].split())
    texte = re.sub(r"^.*?\(niveau \d+\)\s*:\s*", "", d)   # on enlève « Nom du pouvoir (niveau 200) : »
    return nom, texte


def main():
    croquettes = get("items", {"name.fr[$regex]": "Croquette infus", "$limit": 100, "$select[]": ["id", "name"]})["data"]
    items = []
    for c in sorted(croquettes, key=lambda c: c["id"]):
        nom = " ".join(c["name"]["fr"].split())
        it = get(f"items/{c['id']}")
        pouvoirs = [e["diceNum"] for e in it["possibleEffects"] if e.get("effectId") == 1175]
        rec = get("recipes", {"resultId": c["id"], "$limit": 1})["data"]
        legendes = sorted({LEGENDES[i] for i in (rec[0]["ingredientIds"] if rec else []) if i in LEGENDES})
        if len(pouvoirs) != 1 or len(legendes) != 1:
            print(f"  ! {nom} : pouvoirs {pouvoirs}, légendes {legendes} (ignorée)", file=sys.stderr)
            continue
        pnom, texte = effet(pouvoirs[0])
        items.append({"q": f"Quel est l'effet de la « {nom} » ?",
                      "champs": [[CHAMP_EFFET, f"{pnom} : {texte}"], [CHAMP_LEGENDE, legendes[0]]], "pts": PTS, "temps": TEMPS_EFFET,
                      "verif": [None, "contient"]})   # l'effet est jugé par le chef ; la légende est vérifiée automatiquement
        items.append({"q": f"Quelle croquette infusée a cet effet : {texte}",
                      "champs": [["Nom de la croquette (la moitié des points)", nom], [CHAMP_LEGENDE, legendes[0]]], "pts": PTS, "temps": TEMPS_NOM,
                      "verif": ["contient", "contient"]})   # nom complet et légende : vérifiés automatiquement
    lignes = ["    " + json.dumps(i, ensure_ascii=False) + "," for i in items]
    (ROOT / "js/questions/croquettes.js").write_text(
        "// Fichier généré par tools/croquettes_dofus.py : ne pas modifier à la main (relancer le script).\n"
        "// Croquettes infusées (pouvoir donné au familier légendaire) : l'effet, le nom de la croquette et la légende qui la craft.\n"
        'export default {\n  cat: "Légendaire",\n  items: [\n' + "\n".join(lignes) + "\n  ],\n};\n", encoding="utf-8")
    print(f"{len(items)} questions écrites ({len(items) // 2} croquettes)", file=sys.stderr)


if __name__ == "__main__":
    main()
