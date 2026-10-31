// Correction automatique de la catégorie « Panoplie » : nombre d'items, types d'items (liste dans le désordre), niveau (le plus proche gagne).

const sans = s => String(s ?? '').toLowerCase().replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '');
const TYPES = ['chapeau', 'cape', 'amulette', 'anneau', 'ceinture', 'botte', 'arme', 'bouclier', 'familier'];
const SYNONYMES = { coiffe: 'chapeau', coiffure: 'chapeau', casque: 'chapeau', capuche: 'chapeau', bottine: 'botte', botte: 'botte', amu: 'amulette', collier: 'amulette' };
// « Bottes » = « botte », « anneaux » = « anneau », « coiffe » = « chapeau », « amu » = « amulette » (début d'un seul type, 3 lettres ou plus)
const forme = t => {
  const f = sans(t).replace(/[^a-z0-9]/g, '').replace(/(s|x)$/, '');
  if (SYNONYMES[f]) return SYNONYMES[f];
  const debut = f.length >= 3 ? TYPES.filter(x => x.startsWith(f)) : [];
  return debut.length === 1 ? debut[0] : f;
};

// Premier nombre écrit dans la réponse (« 8 », « 8 items », « huit » n'est pas lu), ou null.
export const nombre = s => { const m = /-?\d+/.exec(String(s ?? '').replace(/(\d)[\s\u00a0\u202f.](?=\d{3}(?!\d))/g, '$1')); return m ? Number(m[0]) : null; };   // « 4 751 » et « 4.751 » = 4751
// Écart entre le niveau écrit et le bon niveau (pour classer les joueurs : le plus proche gagne), ou null.
export const ecart = (saisie, attendu) => { const x = nombre(saisie), y = nombre(attendu); return x === null || y === null ? null : Math.abs(x - y); };

// Éléments d'une liste : séparés par « , », « ; », « / » ou « et », sauf à l'intérieur de parenthèses (« Arme (Hache, Marteau) » est un seul élément).
// Avec « libre » (réponse du joueur), les espaces séparent aussi : « amu coiffe cape anneau botte » ; « 2 anneaux » et « anneau x2 » restent groupés.
function elements(s, libre = false) {
  s = String(s ?? '');
  if (libre) s = s.replace(/\s+\(/g, '(');
  const out = []; let cur = '', depth = 0;
  for (const c of s) {
    if (c === '(') depth++; else if (c === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (c === ',' || c === ';' || c === '/' || (libre && /\s/.test(c)))) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  const liste = out.map(e => e.trim()).filter(Boolean);
  if (!libre) return liste.flatMap(e => (/\(/.test(e) ? [e] : e.split(/\s+et\s+/i))).map(e => e.trim()).filter(Boolean);
  const res = []; let nb = '';
  for (const mot of liste) {
    if (/^\d+$/.test(mot)) { nb = mot; continue; }
    const x = /^[×x](\d+)$/i.exec(mot);
    if (x && res.length) { res[res.length - 1] += ` ×${x[1]}`; continue; }
    if (/^(et|ou|\+|&)$/i.test(mot)) continue;
    res.push((nb ? `${nb} ` : '') + mot); nb = '';
  }
  return res;
}
// Un élément : { formes: écritures acceptées, n: combien } (« Anneau ×2 », « 2 anneaux », « Arme (Épée) »).
function lire(e, joueur = false) {
  let n = 1, t = e;
  let m = /[×x]\s*(\d+)\s*$/i.exec(t) || /^\s*(\d+)\s*[×x]?\s+/i.exec(t);
  if (m) { n = Number(m[1]); t = t.replace(m[0], ' '); }
  const dedans = (/\(([^)]*)\)/.exec(t) || [])[1];
  const base = t.replace(/\([^)]*\)/g, ' ');
  const options = dedans ? dedans.split(/,|\bou\b/).map(o => o.trim()).filter(Boolean) : [];
  const formes = new Set();
  if (forme(base) && !(joueur && options.length)) formes.add(forme(base));   // « Arme (Hache) » écrit par le joueur ne vaut pas « Arme » tout court
  options.forEach(o => { formes.add(forme(o)); if (forme(base)) formes.add(forme(base + o)); });
  return { formes, n };
}

// Les types écrits par le joueur sont-ils exactement ceux de la panoplie (même nombre de chaque, ordre libre, pluriels acceptés) ?
export function memesTypes(saisie, attendu) {
  const creux = elements(attendu).map(lire);   // places à remplir
  const mots = elements(saisie, true).map(e => lire(e, true));
  if (!mots.length) return false;
  for (const m of mots) {
    // une écriture du joueur compte pour une place libre dont les formes contiennent l'une des siennes
    for (let k = 0; k < m.n; k++) {
      const place = creux.find(c => c.n > 0 && [...m.formes].some(f => c.formes.has(f)));
      if (!place) return false;   // élément en trop ou inconnu
      place.n--;
    }
  }
  return creux.every(c => c.n === 0);
}
