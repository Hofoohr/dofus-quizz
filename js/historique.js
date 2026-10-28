// Page « Historique des parties » : les 100 dernières parties inscrites dans history/ (voir js/histo.js).
import { db, ref, onValue, query, limitToLast, signIn } from "./firebase.js";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const fmt = n => String(Math.round(n * 10) / 10).replace('.', ',');
let parties = [];

const quand = t => new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function render() {
  const mot = $('h-q').value.trim().toLowerCase(), jeu = $('h-jeu').value;
  const liste = parties.filter(p => (!jeu || p.game === jeu) && (!mot || Object.values(p.players).some(j => j.name.toLowerCase().includes(mot))));
  $('h-etat').textContent = liste.length ? `${liste.length} partie${liste.length > 1 ? 's' : ''}` : (parties.length ? 'Aucune partie ne correspond.' : "Pas encore de partie enregistrée : elles apparaissent quand une partie se termine.");
  $('h-liste').innerHTML = liste.map(p => {
    const joueurs = Object.values(p.players);
    const detail = p.game === 'geo' ? `GeoGuessr · ${p.nb} manche${p.nb > 1 ? 's' : ''}` : `Quizz · ${p.nb} question${p.nb > 1 ? 's' : ''}`;
    return `<div class="h-partie"><div class="h-tete"><b>${esc(quand(p.at))}</b><span>${esc(detail)}</span></div>
      ${p.cats ? `<small class="h-cats">${esc(Object.values(p.cats).join(' · '))}</small>` : ''}
      <ol>${joueurs.map((j, i) => {
        const rang = 1 + joueurs.filter(x => x.score > j.score).length;
        return `<li><span>${['🥇', '🥈', '🥉'][rang - 1] || rang + '.'} ${esc(j.name)}</span><b>${fmt(j.score)} / ${fmt(j.max)} pts</b></li>`;
      }).join('')}</ol></div>`;
  }).join('');
}

$('h-q').oninput = render; $('h-jeu').onchange = render;
signIn().then(() => onValue(query(ref(db, 'history'), limitToLast(100)), s => {
  const v = s.val() || {};
  parties = Object.keys(v).sort().reverse().map(k => ({ id: k, ...v[k], players: Array.isArray(v[k].players) ? v[k].players : Object.values(v[k].players || {}) }));
  render();
}, e => { console.error(e); $('h-etat').textContent = "Impossible de lire l'historique."; }))
  .catch(e => { console.error(e); $('h-etat').textContent = 'Connexion à Firebase impossible.'; });
render();
