// Correction automatique de la catégorie « Panoplie » : nombre d'items, types d'items (liste dans le désordre), niveau (le plus proche gagne).

const sans = s => String(s ?? '').toLowerCase().replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '');
const forme = t => sans(t).replace(/[^a-z0-9]/g, '').replace(/(s|x)$/, '');   // « Bottes » = « botte », « anneaux » = « anneau »

// Premier nombre écrit dans la réponse (« 8 », « 8 items », « huit » n'est pas lu), ou null.
export const nombre = s => { const m = /-?\d+/.exec(String(s ?? '')); return m ? Number(m[0]) : null; };
// Écart entre le niveau écrit et le bon niveau (pour classer les joueurs : le plus proche gagne), ou null.
export const ecart = (saisie, attendu) => { const x = nombre(saisie), y = nombre(attendu); return x === null || y === null ? null : Math.abs(x - y); };

// Éléments d'une liste : séparés par « , », « ; », « / » ou « et », sauf à l'intérieur de parenthèses (« Arme (Hache, Marteau) » est un seul élément).
function elements(s) {
  const out = []; let cur = '', depth = 0;
  for (const c of String(s ?? '')) {
    if (c === '(') depth++; else if (c === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (c === ',' || c === ';' || c === '/')) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out.flatMap(e => (/\(/.test(e) ? [e] : e.split(/\s+et\s+/i))).map(e => e.trim()).filter(Boolean);
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
  const mots = elements(saisie).map(e => lire(e, true));
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
