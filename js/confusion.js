// Mini-jeu « Confusion horaire » (Comte Harebourg) : une Enutrof (le joueur) lance un sort sur le Comte, mais la case visée est tournée
// autour du lanceur selon sa confusion (qui dépend de sa vie). Il faut cliquer la case qui, une fois tournée, tombe sur le Comte.
// Les trois rotations (noms internes « rouge », « bleue », « verte » : aucune couleur n'est montrée aux joueurs) :
//   100 à 75 % de vie : 90° dans le sens horaire ; 75 à 25 % : 180° ; 25 à 0 % : 270° dans le sens horaire (= 90° anti-horaire).
// Repère : x vers le bas-droite de l'écran, y vers le bas-gauche (comme les cases de Dofus vues en isométrique).

import { CLEPSYDRE } from "./clepsydre.js";

export const COULEURS = {
  rouge: { k: 1, hex: '#e53935', nom: 'rouge', angle: '90° dans le sens horaire' },
  bleue: { k: 2, hex: '#2f6bff', nom: 'bleue', angle: '180°' },
  verte: { k: 3, hex: '#2fc24b', nom: 'verte', angle: '270° dans le sens horaire (soit 90° dans le sens anti-horaire)' },
};

// Texte affiché dans le jeu pour chaque confusion (plusieurs écritures de la même rotation : chaque scène en montre une seule, « aff ») et plage de vie de l'Enutrof qui la déclenche.
export const AFFICHAGE = {
  rouge: ['270° Contre Horaire', 'Contre Horaire 3Pi/2', 'Horaire 1Pi/2', 'Horaire 2Pi/4', 'Contre Horaire 6Pi/4'],
  bleue: ['Horaire 2Pi/2', 'Horaire 4Pi/4', 'Contre Horaire 2Pi/2', 'Contre Horaire 4Pi/4'],
  verte: ['270° Horaire', 'Contre Horaire 1Pi/2', 'Horaire 3Pi/2', 'Contre Horaire 2Pi/4', 'Horaire 6Pi/4'],
};
export const PLAGE_VIE = { rouge: '100 % à 75 %', bleue: '75 % à 25 %', verte: '25 % à 0 %' };
// Encadré « vie + confusion » (une seule écriture de la confusion) affiché au-dessus de la scène (HTML).
export const infosScene = scene => `<div class="conf">
  <div class="pv"><span>❤️ Vie de l'Enutrof : <b>${scene.pv} %</b></span><i style="width:${scene.pv}%"></i></div>
  <p class="rot">${AFFICHAGE[scene.conf][scene.aff % AFFICHAGE[scene.conf].length]}</p></div>`;

// Scène publiée dans la base avec la question (tous les joueurs voient exactement la même, même si leur copie du site est plus ancienne).
// Firebase rend les listes sous forme de tableaux ou d'objets : on remet la scène en forme. « repli » : scène de la banque locale.
export function lireScene(pub, repli) {
  if (!pub) return repli || null;
  const liste = v => (Array.isArray(v) ? v : Object.values(v || {})).map(Number);
  return { n: +pub.n, e: liste(pub.e), c: liste(pub.c), conf: pub.conf, pv: +pub.pv, aff: +pub.aff };
}

// Un quart de tour dans le sens horaire (à l'écran) d'un décalage (dx, dy), répété k fois.
export function tourner([dx, dy], k) {
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) [dx, dy] = [-dy, dx];
  return [dx, dy];
}
// Case où tombe le sort quand le joueur clique sur « clic ».
export function caseTouchee(scene, clic) {
  const k = COULEURS[scene.conf].k, [dx, dy] = tourner([clic[0] - scene.e[0], clic[1] - scene.e[1]], k);
  return [scene.e[0] + dx, scene.e[1] + dy];
}
// Case sur laquelle il faut cliquer pour toucher le Comte.
export function caseAViser(scene) {
  const k = COULEURS[scene.conf].k, [dx, dy] = tourner([scene.c[0] - scene.e[0], scene.c[1] - scene.e[1]], 4 - k);
  return [scene.e[0] + dx, scene.e[1] + dy];
}
// Scène tirée au hasard (mode solo), avec les mêmes règles que tools/confusion_horaire.py : l'Enutrof est dans le carré central de 9 × 9 cases,
// le Comte est n'importe où ailleurs, la vie ne tombe pas pile sur 25 ou 75 %, et la case à cliquer est dans la grille.
export function sceneAleatoire(n = 15, hasard = Math.random) {
  const alea = (a, b) => a + Math.floor(hasard() * (b - a + 1)), m = Math.floor((n - 9) / 2);
  for (;;) {
    const pv = alea(1, 100);
    if (pv === 25 || pv === 75) continue;
    const conf = pv > 75 ? 'rouge' : pv > 25 ? 'bleue' : 'verte';
    const e = [alea(m, m + 8), alea(m, m + 8)], c = [alea(0, n - 1), alea(0, n - 1)];
    if (e[0] === c[0] && e[1] === c[1]) continue;
    const sc = { n, e, c, conf, pv, aff: alea(0, AFFICHAGE[conf].length - 1) }, v = caseAViser(sc);
    if (v[0] >= 0 && v[0] < n && v[1] >= 0 && v[1] < n) return sc;
  }
}
// Cartes particulières (mode test du solo) : cases libres (« sol ») et obstacles. Une scène de ces cartes porte « carte: "clepsydre" ».
const prepare = c => ({ sol: new Set(c.sol.map(p => p.join(','))), obst: new Set(c.obstacles.map(p => p.join(','))), liste: c.sol, obstacles: c.obstacles });
const CARTES = { clepsydre: prepare(CLEPSYDRE) };
export const NOMS_CARTES = { grille: 'Grille classique (15 × 15)', clepsydre: 'Tour de la Clepsydre, salle du boss (test)' };
// Scène tirée au hasard sur une carte particulière : l'Enutrof et le Comte sont sur des cases libres, et la case à cliquer aussi.
export function sceneCarte(nom, hasard = Math.random) {
  const L = CARTES[nom], alea = (a, b) => a + Math.floor(hasard() * (b - a + 1)), un = () => L.liste[alea(0, L.liste.length - 1)];
  for (;;) {
    const pv = alea(1, 100);
    if (pv === 25 || pv === 75) continue;
    const conf = pv > 75 ? 'rouge' : pv > 25 ? 'bleue' : 'verte', e = un(), c = un();
    if (e[0] === c[0] && e[1] === c[1]) continue;
    const n = 1 + Math.max(...L.liste.map(p => Math.max(p[0], p[1])));
    const sc = { n, e: [...e], c: [...c], conf, pv, aff: alea(0, AFFICHAGE[conf].length - 1), carte: nom }, v = caseAViser(sc);
    if (L.sol.has(v.join(','))) return sc;
  }
}
// Réponse enregistrée : « x,y@ms » (ms = temps écoulé entre l'affichage de la scène et le dernier clic). L'ancien format « x,y » reste lisible.
export const lireCase = t => { const m = /^\s*(-?\d+)\s*,\s*(-?\d+)\s*(?:@\s*(\d+))?\s*$/.exec(String(t ?? '')); return m ? [+m[1], +m[2]] : null; };
export const lireTemps = t => { const m = /@\s*(\d+)\s*$/.exec(String(t ?? '')); return m ? +m[1] : null; };
export const estJuste = (scene, t) => { const c = lireCase(t), v = caseAViser(scene); return !!c && c[0] === v[0] && c[1] === v[1]; };

// Question de rapidité : parmi les bonnes réponses, la plus rapide gagne le plus de points.
// reponses = { idJoueur: « x,y@ms » }, joueurs = identifiants. Rang = 1 + nombre de bonnes réponses strictement plus rapides (ex æquo : même rang).
// Points = pts × (n − rang + 1) / n avec n le nombre de joueurs ; mauvaise ou pas de réponse = 0.
// Retourne { idJoueur: { juste, ms, rang, points } }.
export function classementRapide(reponses, scene, joueurs, pts) {
  const n = joueurs.length, rep = reponses || {}, out = {};
  const ms = id => lireTemps(rep[id]) ?? Infinity;
  joueurs.forEach(id => {
    const juste = estJuste(scene, rep[id]);
    if (!juste) { out[id] = { juste: false, ms: null, rang: null, points: 0 }; return; }
    const rang = 1 + joueurs.filter(o => estJuste(scene, rep[o]) && ms(o) < ms(id)).length;
    out[id] = { juste: true, ms: Number.isFinite(ms(id)) ? ms(id) : null, rang, points: Math.round(pts * (n - rang + 1) / n * 10) / 10 };
  });
  return out;
}

// --- Dessin ---
const W = 52, H = 26, HAUT = 80;   // largeur / hauteur d'une case, marge en haut pour les personnages
const IMG = {};
const charge = src => IMG[src] || (IMG[src] = Object.assign(new Image(), { src }));

// Crée la scène dans un <canvas>. opts : { surClic(x, y) } ; renvoie { dessiner({ choix, marques, solution }) }.
export function creerScene(canvas, scene, opts = {}) {
  const n = scene.n, ctx = canvas.getContext('2d'), L = scene.carte && CARTES[scene.carte];
  // étendue de la grille à l'écran : u = x − y (gauche/droite), v = x + y (haut/bas) ; la grille carrée n × n donne n × W de large
  let minU = -(n - 1), maxU = n - 1, minV = 0, maxV = 2 * (n - 1);
  if (L) {
    const tout = [...L.liste, ...L.obstacles];
    minU = Math.min(...tout.map(p => p[0] - p[1])); maxU = Math.max(...tout.map(p => p[0] - p[1]));
    minV = Math.min(...tout.map(p => p[0] + p[1])); maxV = Math.max(...tout.map(p => p[0] + p[1]));
  }
  canvas.width = (maxU - minU + 2) * W / 2; canvas.height = (maxV - minV + 2) * H / 2 + HAUT + 10;
  canvas.style.background = L ? '#0b0e18' : '';
  const ox = (1 - minU) * W / 2, oy = HAUT - minV * H / 2;       // position à l'écran de la case (0, 0)
  const libre = (x, y) => L ? L.sol.has(x + ',' + y) : x >= 0 && y >= 0 && x < n && y < n;   // case sur laquelle on peut cliquer
  const centre = (x, y) => [ox + (x - y) * W / 2, oy + (x + y) * H / 2 + H / 2];
  let survol = null, etat = { choix: null, marques: [], solution: null };
  const losange = (x, y, marge = 0) => {
    const [cx, cy] = centre(x, y);
    ctx.beginPath(); ctx.moveTo(cx, cy - H / 2 + marge); ctx.lineTo(cx + W / 2 - marge * 2, cy); ctx.lineTo(cx, cy + H / 2 - marge); ctx.lineTo(cx - W / 2 + marge * 2, cy); ctx.closePath();
  };
  const caseSous = (px, py) => {   // inverse de « centre » : case sous le pointeur, ou null
    const a = (px - ox) / (W / 2), b = (py - oy - H / 2) / (H / 2);   // a = x - y ; b = x + y
    const x = Math.round((a + b) / 2), y = Math.round((b - a) / 2);
    if (!libre(x, y)) return null;
    const [cx, cy] = centre(x, y);
    return Math.abs(px - cx) / (W / 2) + Math.abs(py - cy) / (H / 2) <= 1 ? [x, y] : null;
  };
  const pointeur = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height]; };
  function cube(x, y) {   // obstacle : un cube d'une demi-case de haut, posé sur la case
    const [cx, cy] = centre(x, y), ty = cy - H / 2, poly = (pts, col) => { ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke(); };
    poly([[cx - W / 2, ty], [cx, ty + H / 2], [cx, cy + H / 2], [cx - W / 2, cy]], '#37342f');
    poly([[cx + W / 2, ty], [cx, ty + H / 2], [cx, cy + H / 2], [cx + W / 2, cy]], '#4a473e');
    poly([[cx, ty - H / 2], [cx + W / 2, ty], [cx, ty + H / 2], [cx - W / 2, ty]], '#58533a');
  }
  function sprite(src, x, y, haut) {   // personnage découpé sans marge : les pieds sont posés au centre de la case
    const im = charge(src), [cx, cy] = centre(x, y);
    if (im.complete && im.naturalWidth) { const l = haut * im.naturalWidth / im.naturalHeight; ctx.drawImage(im, cx - l / 2, cy + H / 4 - haut, l, haut); }
  }
  function dessiner(e) {
    if (e) etat = { ...etat, ...e };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sols = L ? [...L.liste].sort((u, v) => (u[0] + u[1]) - (v[0] + v[1])) : [];
    if (L) sols.forEach(([x, y]) => {
      losange(x, y); ctx.fillStyle = (x + y) % 2 ? '#8a7f58' : '#928860'; ctx.fill();
      ctx.strokeStyle = 'rgba(40,34,20,.45)'; ctx.lineWidth = 1; ctx.stroke();
    });
    else for (let s = 0; s <= 2 * (n - 1); s++) for (let x = 0; x < n; x++) {   // du fond vers l'avant
      const y = s - x; if (y < 0 || y >= n) continue;
      losange(x, y); ctx.fillStyle = (x + y) % 2 ? '#c9b98f' : '#d8caa3'; ctx.fill();
      ctx.strokeStyle = 'rgba(70,55,30,.35)'; ctx.lineWidth = 1; ctx.stroke();
    }
    const col = '#7c5cff';   // anneau du lanceur
    if (etat.solution) {   // correction : bonne case, et trajet du sort vers le Comte
      const [sx, sy] = etat.solution; losange(sx, sy); ctx.fillStyle = 'rgba(46,204,113,.55)'; ctx.fill(); ctx.strokeStyle = '#1e9e53'; ctx.lineWidth = 3; ctx.stroke();
      const a = centre(...scene.e), b = centre(sx, sy), c = centre(...scene.c);
      ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = '#1e9e53';
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
      ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...c); ctx.stroke(); ctx.setLineDash([]);
    }
    if (survol && !etat.solution && opts.surClic && (!etat.choix || survol[0] !== etat.choix[0] || survol[1] !== etat.choix[1])) {
      losange(...survol); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
    }
    if (etat.choix) { losange(...etat.choix); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.stroke(); }
    // personnages et obstacles (cubes), dans l'ordre d'affichage (le plus en arrière d'abord)
    const persos = [{ p: scene.e, src: 'img/confusion/enutrof.png', nom: 'Enutrof', halo: col }, { p: scene.c, src: 'img/confusion/comte.png', nom: 'Comte Harebourg' },
      ...(L ? L.obstacles.map(p => ({ p, cube: true })) : [])]
      .sort((u, v) => (u.p[0] + u.p[1]) - (v.p[0] + v.p[1]) || (u.cube ? -1 : 0) - (v.cube ? -1 : 0));
    persos.forEach(o => {
      if (o.cube) { cube(...o.p); return; }
      const [cx, cy] = centre(...o.p);
      if (o.halo) { ctx.beginPath(); ctx.ellipse(cx, cy, W * .36, H * .38, 0, 0, 7); ctx.strokeStyle = o.halo; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = o.halo + '55'; ctx.fill(); }
      sprite(o.src, o.p[0], o.p[1], o.nom === 'Enutrof' ? 64 : 72);
    });
    (etat.marques || []).forEach(m => {   // correction : case cliquée par chaque joueur
      const [cx, cy] = centre(...m.p);
      ctx.beginPath(); ctx.arc(cx + (m.dec || 0), cy, 11, 0, 7); ctx.fillStyle = m.moi ? '#7c5cff' : '#fff'; ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = m.moi ? '#fff' : '#222'; ctx.font = 'bold 10px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(m.label, cx + (m.dec || 0), cy + 1); ctx.textBaseline = 'alphabetic';
    });
  }
  (canvas._ecouteurs || []).forEach(([t, f]) => canvas.removeEventListener(t, f));   // la même zone de dessin sert à chaque question
  canvas._ecouteurs = [];
  if (opts.surClic) {
    canvas._ecouteurs = [
      ['mousemove', e => { survol = caseSous(...pointeur(e)); dessiner(); }],
      ['mouseleave', () => { survol = null; dessiner(); }],
      ['click', e => { const c = caseSous(...pointeur(e)); if (c) opts.surClic(c[0], c[1]); }],
    ];
    canvas._ecouteurs.forEach(([t, f]) => canvas.addEventListener(t, f));
  }
  ['enutrof.png', 'comte.png'].forEach(f => { const im = charge('img/confusion/' + f); if (!im.complete) im.addEventListener('load', () => dessiner()); });
  dessiner();
  return { dessiner };
}
