// Catégorie « Monstre pixelisé » : un monstre dont l'image, très pixelisée au début, se précise avec le temps.
// Le joueur tape le nom exact (autant d'essais qu'il veut) ; le plus rapide à trouver gagne le plus de points.

// Nom comparé sans majuscules, accents, espaces ni ponctuation : « Bwork Archer » = « bwork  archer ! ».
export const normaliser = s => String(s ?? '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
// Distance d'édition entre deux textes : nombre de lettres à ajouter, enlever ou changer, ou de paires voisines à inverser (« Bouftou » / « Boutfou » : 1).
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
// Fautes tolérées : une seule lettre de différence (ajoutée, retirée, changée, ou deux lettres voisines inversées), sauf pour les noms de 3 lettres ou moins.
export const tolerance = longueur => (longueur <= 3 ? 0 : 1);

// La réponse du joueur contient-elle la bonne réponse (sans majuscules, accents ni ponctuation) ? « poukachi » est dans « la légende Poukachi ».
export const contient = (saisie, attendu) => { const t = normaliser(attendu); return t !== '' && normaliser(saisie).includes(t); };

// La réponse contient-elle le nom attendu, à une lettre près ? On compare le nom à chaque morceau du texte de longueur voisine.
export const contientProche = (saisie, attendu) => {
  const n = normaliser(saisie), t = normaliser(attendu);
  if (t === '') return false;
  if (n.includes(t)) return true;
  const tol = tolerance(t.length);
  if (tol === 0) return false;
  for (let len = t.length - tol; len <= t.length + tol; len++)
    for (let i = 0; i + len <= n.length; i++) if (distance(n.slice(i, i + len), t) <= tol) return true;
  return false;
};

// Quêtes : « À quel Dofus est reliée la quête… ». On accepte « Vulbis » comme « Dofus Vulbis » (et « Cauchemar » pour « Dofus du Cauchemar »),
// avec une lettre de différence au plus : on compare les noms sans « dofus » ni articles (du, des, de, la…).
const MOTS_VIDES = new Set(['dofus', 'du', 'des', 'de', 'd', 'la', 'le', 'les', 'l']);
const nomCourt = s => String(s ?? '').toLowerCase().replace(/œ/g, 'oe').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .split(/[^a-z0-9]+/).filter(m => m && !MOTS_VIDES.has(m)).join('');
// Sigle : les initiales de tous les mots (« Dofus des Glaces » : DDG). Accepté à partir de 3 lettres, sinon trop de noms auraient le même (DE : Émeraude et Ébène).
const sigle = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(Boolean).map(m => m[0]).join('');
export const memeDofus = (saisie, attendu) => {
  const n = nomCourt(saisie), t = nomCourt(attendu), sg = sigle(attendu);
  if (sg.length >= 3 && normaliser(saisie) === sg) return true;
  return n !== '' && t !== '' && (n === t || distance(n, t) <= tolerance(t.length));
};

// Réponse acceptée : le nom exact, ou assez proche (voir tolerance). « autres » : ensemble des noms normalisés de tous les monstres ; une réponse qui est
// exactement le nom d'un AUTRE monstre est refusée (« Bwork » ne vaut pas « Bworkette »).
export const estBonNom = (nom, saisie, autres = new Set()) => {
  const n = normaliser(saisie), t = normaliser(nom);
  if (n === '') return false;
  if (n === t) return true;
  if (autres.has(n)) return false;
  return distance(n, t) <= tolerance(t.length);
};
// Réponse refusée mais très proche (une faute de plus que la tolérance) : on peut encourager le joueur.
export const presque = (nom, saisie, autres = new Set()) => {
  const n = normaliser(saisie), t = normaliser(nom);
  return n !== '' && !autres.has(n) && distance(n, t) <= tolerance(t.length) + 1 && t.length >= 4;
};

// Réponse enregistrée : « ok@ms:essais|texte » quand le monstre est trouvé (ms = temps écoulé depuis le début de la question, texte = ce que le joueur a écrit),
// « no:essais » sinon. L'ancien format « ok@ms » ou « ok@ms:essais » reste lisible.
export const lireTrouve = t => { const m = /^ok@(\d+)(?::\d+)?(?:\|.*)?$/s.exec(String(t ?? '')); return m ? +m[1] : null; };
// Ce que le joueur a écrit quand il a trouvé (null si inconnu).
export const lireSaisie = t => { const m = /^ok@\d+(?::\d+)?\|(.*)$/s.exec(String(t ?? '')); return m ? m[1] : null; };
// Nombre d'essais (sert seulement à s'amuser dans la correction) ; null si inconnu.
export const lireEssais = t => { const m = /^(?:ok@\d+:|no:)(\d+)(?:\|.*)?$/s.exec(String(t ?? '')); return m ? +m[1] : null; };

// Points : parmi ceux qui ont trouvé, le plus rapide gagne le plus. pts × (n − rang + 1) / n, n = nombre de joueurs ; ex æquo : même rang.
// Retourne { idJoueur: { trouve, ms, rang, points, essais } }.
export function classerParTemps(reponses, joueurs, pts) {
  const n = joueurs.length, rep = reponses || {}, out = {};
  joueurs.forEach(id => {
    const ms = lireTrouve(rep[id]);
    const essais = lireEssais(rep[id]);
    if (ms === null) { out[id] = { trouve: false, ms: null, rang: null, points: 0, essais }; return; }
    const rang = 1 + joueurs.filter(o => { const t = lireTrouve(rep[o]); return t !== null && t < ms; }).length;
    out[id] = { trouve: true, ms, rang, points: Math.round(pts * (n - rang + 1) / n * 10) / 10, essais, saisie: lireSaisie(rep[id]) };
  });
  return out;
}

// Définition de l'image (en blocs par côté) selon le temps écoulé : 4 au début, l'image entière (128) à 90 % de la durée de la question.
export const TAILLE_MAX = 128, TAILLE_MIN = 4;
export function blocs(ms, dureeMs) {
  return Math.min(TAILLE_MAX, Math.round(TAILLE_MIN * Math.pow(TAILLE_MAX / TAILLE_MIN, Math.max(0, ms) / (0.9 * dureeMs))));
}

// Dessine le sprite avec « g » blocs par côté (g >= 128 : image nette).
const mini = document.createElement('canvas');
export function dessinerPixel(canvas, img, g) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e8e2cc'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!img.complete || !img.naturalWidth) return;
  if (g >= TAILLE_MAX) { ctx.imageSmoothingEnabled = true; ctx.drawImage(img, 0, 0, canvas.width, canvas.height); return; }
  mini.width = mini.height = g;
  const m = mini.getContext('2d');
  m.clearRect(0, 0, g, g); m.imageSmoothingEnabled = true; m.drawImage(img, 0, 0, g, g);   // réduction : chaque bloc est la moyenne de sa zone
  ctx.imageSmoothingEnabled = false;                                                         // agrandissement sans lissage : de gros pixels carrés
  ctx.drawImage(mini, 0, 0, canvas.width, canvas.height);
}

// La réponse acceptée contient-elle une faute d'orthographe (hors majuscules, accents et ponctuation) ?
export const aUneFaute = (nom, saisie) => saisie != null && normaliser(saisie) !== normaliser(nom);
