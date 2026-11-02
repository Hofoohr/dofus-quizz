// Mode solo « Confusion en chaîne » : on enchaîne des confusions horaires (mêmes scènes que le quizz), seul le premier clic de chaque scène compte.
// On commence avec 5 s par scène ; chaque réussite retire 5 % du temps restant. Une erreur ou le temps écoulé met fin à la série ; le score est le nombre de réussites.
// Le ladder (meilleur score de chaque joueur) est dans la base : ladder/<uid> = { name, score, at }.
import { db, ref, get, set, onValue, query, limitToLast, orderByChild, serverTimestamp } from "./firebase.js";
import { creerScene, infosScene, caseAViser, sceneAleatoire, sceneCarte } from "./confusion.js";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const DUREE_DEPART = 5000, PERTE = 0.05, TOP = 15, SCORE_MAX = 100;   // 5 s ; −5 % par réussite ; lignes affichées ; plafond accepté par les règles de la base
const sec = ms => (Math.round(ms / 10) / 100).toFixed(2).replace('.', ',') + ' s';

let ctx = null, ladder = [], run = null, jeu = null, minuteur = null;

// ctx : { uid(), name(), showScreen(nom), showError(msg) }
export function init(c) {
  ctx = c;
  onValue(query(ref(db, 'ladder'), orderByChild('score'), limitToLast(100)), s => {
    ladder = Object.entries(s.val() || {}).map(([id, v]) => ({ id, name: v.name, score: v.score, at: v.at || 0 }))
      .sort((a, b) => b.score - a.score || a.at - b.at);
    afficherLadder();
  });
  $('solo-open').onclick = ouvrir;
  $('so-start').onclick = demarrer;
  $('so-retry').onclick = demarrer;
  $('so-home').onclick = quitter;
}

const MEDAILLES = ['🥇', '🥈', '🥉'];
function ligne(e, rang, moi) {
  return `<li class="lad${moi ? ' me' : ''}"><b>${MEDAILLES[rang - 1] || rang + '.'}</b><span>${esc(e.name)}${moi ? ' <small>(toi)</small>' : ''}</span><b>${e.score}</b></li>`;
}
function afficherLadder() {
  const moi = ctx && ctx.uid();
  const rang = ladder.findIndex(e => e.id === moi) + 1;
  const haut = ladder.slice(0, TOP);
  let html = haut.map((e, i) => ligne(e, i + 1, e.id === moi)).join('');
  if (rang > TOP) html += `<li class="lad sep">…</li>` + ligne(ladder[rang - 1], rang, true);
  $('so-ladder').innerHTML = html || '<li class="lad vide">Personne n\'a encore joué : sois le premier !</li>';
  $('solo-top3').innerHTML = ladder.slice(0, 3).map((e, i) => ligne(e, i + 1, e.id === moi)).join('');
  $('solo-top3').hidden = !ladder.length;
  const record = rang ? ladder[rang - 1].score : null;
  $('so-record').textContent = record ? `Ton record : ${record}` : '';
}

export function ouvrir() {
  document.body.classList.add('large');
  ctx.showScreen('solo');
  $('so-intro').hidden = false; $('so-play').hidden = true; $('so-over').hidden = true;
  afficherLadder();
}
export function quitter() {
  arreter();
  document.body.classList.remove('large');
  ctx.showScreen('home');
}
function arreter() { clearInterval(minuteur); minuteur = null; if (run) run.actif = false; run = null; }

function demarrer() {
  const nom = ctx.name(); if (!nom) return;   // pseudo obligatoire (il apparaît dans le ladder)
  arreter();
  $('so-intro').hidden = true; $('so-over').hidden = true; $('so-play').hidden = false;
  run = { carte: $('so-carte').value, score: 0, duree: DUREE_DEPART, scene: null, debut: 0, actif: false, nom, id: Math.random() };
  // Début de série daté par le serveur : les règles de la base s'en servent pour refuser un score impossible en si peu de temps.
  if (run.carte === 'grille') run.depart = set(ref(db, `runs/${ctx.uid()}`), { start: serverTimestamp() }).catch(e => console.warn(e));
  $('so-score').textContent = 'Série : 0'; $('so-time').textContent = '';
  $('so-fill').style.width = '100%'; $('so-fill').classList.remove('urgent');
  $('so-conf').innerHTML = ''; $('so-scenewrap').hidden = true;
  const id = run.id;
  let n = 3;
  $('so-count').hidden = false; $('so-count').textContent = n;
  const t = setInterval(() => {
    if (!run || run.id !== id) return clearInterval(t);
    n--;
    if (n > 0) { $('so-count').textContent = n; return; }
    clearInterval(t); $('so-count').hidden = true; suivante();
  }, 800);
}

function suivante() {
  const sc = run.carte === 'grille' ? sceneAleatoire() : sceneCarte(run.carte);
  run.scene = sc;
  $('so-scenewrap').hidden = false;
  $('so-conf').innerHTML = infosScene(sc);
  jeu = creerScene($('so-scene'), sc, { surClic });
  $('so-score').textContent = `Série : ${run.score}`;
  $('so-time').textContent = `⏱ ${sec(run.duree)} par scène`;
  run.debut = performance.now(); run.actif = true;
  clearInterval(minuteur);
  minuteur = setInterval(tic, 30);
  tic();
}
function tic() {
  if (!run || !run.actif) return;
  const reste = run.duree - (performance.now() - run.debut);
  $('so-fill').style.width = Math.max(0, reste / run.duree * 100) + '%';
  $('so-fill').classList.toggle('urgent', reste < run.duree * 0.3);
  if (reste <= 0) perdre('Temps écoulé !', null);
}

// Seul le premier clic compte : dès qu'il est fait, la scène est verrouillée.
function surClic(x, y) {
  if (!run || !run.actif) return;
  run.actif = false;
  const v = caseAViser(run.scene);
  if (x === v[0] && y === v[1]) {
    run.score++; run.duree *= 1 - PERTE;
    jeu.dessiner({ choix: [x, y], solution: v });
    $('so-score').textContent = `Série : ${run.score}`;
    const id = run.id;
    setTimeout(() => { if (run && run.id === id) suivante(); }, 250);   // petit temps pour voir la case validée
  } else perdre('Raté !', [x, y]);
}

async function perdre(titre, choix) {
  clearInterval(minuteur); minuteur = null;
  run.actif = false;
  const { score, nom, depart, carte } = run;
  jeu.dessiner({ choix, solution: caseAViser(run.scene) });
  $('so-fill').style.width = '0%';
  $('so-title').textContent = titre;
  $('so-msg').textContent = score ? `Tu as enchaîné ${score} confusion${score > 1 ? 's' : ''}.` : "Aucune confusion enchaînée : réessaie !";
  $('so-over').hidden = false;
  $('so-over').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  if (!score) return;
  if (carte !== 'grille') { $('so-msg').textContent += ' (Carte en version test : score non enregistré dans le ladder.)'; return; }
  try {
    await depart;   // la série doit être enregistrée avant le score (grille classique seulement)
    const mine = await get(ref(db, `ladder/${ctx.uid()}`));
    const best = mine.exists() ? mine.val().score : 0;
    if (score > best) {
      await set(ref(db, `ladder/${ctx.uid()}`), { name: nom, score: Math.min(score, SCORE_MAX), at: serverTimestamp() });
      $('so-msg').textContent += best ? ` Nouveau record (ancien : ${best}) !` : ' Premier score enregistré dans le ladder !';
    } else $('so-msg').textContent += ` Ton record reste ${best}.`;
  } catch (e) { console.error(e); ctx.showError("Impossible d'enregistrer ton score dans le ladder."); }
}
