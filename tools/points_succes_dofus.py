#!/usr/bin/env python3
"""Génère la catégorie « Point de succès » : combien de points de succès rapporte une catégorie (ou une sous-catégorie) de succès ?

Usage : python3 tools/points_succes_dofus.py
Écrit : js/questions/points-succes.js
Source : DofusDB (api.dofusdb.fr), catégories de succès (achievement-categories) et succès (achievements).
Pour chaque catégorie principale de la liste TOP : une question « total » (sous-catégories comprises) et une question par sous-catégorie directe.
Une catégorie à 0 point (ex. : Kolizéum) n'a pas de question.
Tirage (js/tirage.js) : chaque catégorie principale est un « groupe » (autant de chances chacune) ; dans le groupe, le total pèse autant que toutes
les sous-catégories ensemble (« rel » = nombre de sous-catégories) : une chance sur deux de tomber sur le total, sinon une sous-catégorie au hasard.
"""
import json
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://api.dofusdb.fr"
TOP = ["Général", "Exploration", "Donjons", "Monstres", "Quêtes", "Métiers", "Élevage", "Événements", "Kolizéum",
       "Anomalies Temporelles", "Songes Infinis", "Guilde", "Compagnons"]
PTS, TEMPS = 5, 30
CHAMP = "Nombre de points de succès (le plus proche gagne)"


def get(path, params):
    url = f"{API}/{path}?{urllib.parse.urlencode(params, doseq=True, safe='[]$')}"
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)


def tout(path, select):
    out, skip = [], 0
    while True:
        r = get(path, {"$limit": 50, "$skip": skip, "$select[]": select})
        out += r["data"]
        skip += len(r["data"])
        if not r["data"] or skip >= r["total"]:
            return out


def main():
    cats = tout("achievement-categories", ["id", "name.fr", "parentId"])
    succes = tout("achievements", ["id", "points", "categoryId"])
    parent = {c["id"]: c.get("parentId") or 0 for c in cats}
    nom = {c["id"]: " ".join(c["name"]["fr"].split()) for c in cats}

    def chaine(i):
        """Identifiants de la catégorie, puis de ses parents, jusqu'à la racine."""
        out = []
        while i:
            out.append(i)
            i = parent.get(i, 0)
        return out

    points = defaultdict(int)   # catégorie -> points de ses succès et de ceux de ses descendants
    for a in succes:
        for c in chaine(a["categoryId"]):
            points[c] += a.get("points") or 0
    items, compte = [], {}
    for t in TOP:
        racine = next(c["id"] for c in cats if nom[c["id"]] == t and not parent[c["id"]])
        subs = sorted((c for c in cats if parent[c["id"]] == racine and points[c["id"]] > 0), key=lambda c: nom[c["id"]])
        if points[racine] <= 0:
            print(f"{t} : 0 point, ignoré")
            continue
        items.append({"q": f"Combien de points de succès rapporte au total la catégorie « {t} » (sous-catégories comprises) ?",
                      "champs": [[CHAMP, str(points[racine])]], "pts": PTS, "temps": TEMPS, "groupe": t, "rel": max(1, len(subs))})
        for c in subs:
            items.append({"q": f"Combien de points de succès rapporte la sous-catégorie « {nom[c['id']]} » de la catégorie « {t} » ?",
                          "champs": [[CHAMP, str(points[c["id"]])]], "pts": PTS, "temps": TEMPS, "groupe": t, "rel": 1})
        compte[t] = (points[racine], len(subs))
    for t, (p, n) in compte.items():
        print(f"{t} : {p} points, {n} sous-catégories")
    lignes = ["    " + json.dumps(i, ensure_ascii=False) + "," for i in items]
    (ROOT / "js/questions/points-succes.js").write_text(
        "// Fichier généré par tools/points_succes_dofus.py : ne pas modifier à la main (relancer le script).\n"
        "// « groupe » = catégorie principale de succès, « rel » = poids dans son groupe (voir js/tirage.js).\n"
        'export default {\n  cat: "Point de succès",\n  niveauChamp: 0,   // le plus proche gagne (classement automatique, js/correction.js)\n  unite: "point",\n  seuil: 1e-9,   // statistiques : réussi = nombre exact\n  items: [\n'
        + "\n".join(lignes) + "\n  ]\n};\n", encoding="utf-8")
    print(len(items), "questions écrites")


if __name__ == "__main__":
    main()
