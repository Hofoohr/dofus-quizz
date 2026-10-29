// Correction automatique de la catégorie « Sort de classe » (9 champs). Chaque champ a sa règle de comparaison, tolérante sur la façon d'écrire
// (majuscules, accents, « 1/6 », « 1-6 », « oui », « Aucun » ou « 0 »…). Retourne true / false, ou undefined quand la réponse attendue est
// trop particulière pour être jugée automatiquement (le chef tranche alors lui-même).

const sans = s => String(s ?? '').toLowerCase().replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
const INFINI = /illimit|infini|sans limite|pas de limite|aucune limite|∞/;
const AUCUN = /^(aucun|aucune|rien|pas de relance|pas de|sans|nul|nulle|neant|non|0|-|\/)$/;
const OUI = /^(oui|o|yes|y|vrai|true|ok)$/, NON = /^(non|n|no|faux|false)$/;

// Nombre, « illimité » ou « aucun » : une valeur simple.
function valeur(s) {
  const n = sans(s);
  if (INFINI.test(n)) return 'inf';
  if (AUCUN.test(n)) return 'aucun';
  if (/^-?\d+$/.test(n)) return String(Number(n));
  return n;
}
const nombres = s => (sans(s).match(/\d+/g) || []).map(Number);
const booleen = s => { const n = sans(s); return OUI.test(n) ? true : NON.test(n) ? false : null; };

// Zone : forme + taille + trous éventuels (« Zone : Cercle de 2 cases avec un trou de 1 case »).
const FORMES = [['croix diagonale', /diagonale/], ['demi cercle', /demi ?-? ?cercle/], ['ligne perpendiculaire', /perpendiculaire/], ['ligne', /ligne/],
  ['croix', /croix/], ['cercle', /cercle/], ['anneau', /anneau/], ['carre', /carre/], ['cone', /cone/], ['etoile', /etoile/], ['fourchette', /fourchette/]];
function zone(s) {
  const n = sans(s).replace(/-/g, ' ');
  if (/mono/.test(n)) return { mono: true };
  const forme = (FORMES.find(([, re]) => re.test(n)) || [])[0];
  const trous = [...new Set([...n.matchAll(/trou de (\d+)/g)].map(m => m[1]))].sort();
  const reste = n.replace(/avec un trou de \d+ cases?/g, '');
  const t = reste.match(/(\d+|illimit\w*)\s*cases?/);
  return { forme, taille: t ? (/^\d/.test(t[1]) ? String(Number(t[1])) : 'inf') : null, trous };
}
function memeZone(rep, att) {
  const a = zone(att);
  if (a.mono) return /mono/.test(sans(rep)) && !/(zone|cercle|croix|ligne|carre|cone)/.test(sans(rep).replace(/monocible/, ''));
  if (!a.forme || /jusqu|inconnu/.test(sans(att))) return undefined;   // « ligne jusqu'à la cible », « forme inconnue » : au chef de juger
  const r = zone(rep);
  return !r.mono && r.forme === a.forme && r.taille === a.taille && r.trous.join() === a.trous.join();
}

// k : numéro du champ (0 à 8, dans l'ordre de js/questions/sorts.js) ; saisie : réponse du joueur ; attendu : bonne réponse.
export function corrigerSort(k, saisie, attendu) {
  if (saisie == null || String(saisie).trim() === '') return false;
  switch (k) {
    case 0: {   // portée min / max : deux nombres ; un seul nombre suffit quand min = max
      const a = nombres(attendu), r = nombres(saisie);
      return r.length === 2 ? r[0] === a[0] && r[1] === a[1] : r.length === 1 && a[0] === a[1] && r[0] === a[0];
    }
    case 1: case 2: {   // oui / non
      const r = booleen(saisie), a = booleen(attendu);
      return a === null ? undefined : r === a;
    }
    case 3: return memeZone(saisie, attendu);
    default: return valeur(saisie) === valeur(attendu);   // utilisations, relances : nombre, « illimité » ou « aucun »
  }
}
