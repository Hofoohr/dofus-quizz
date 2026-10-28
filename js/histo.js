// Historique des parties : à la fin d'une partie, le chef inscrit dans history/<id> qui a joué et les points de chacun
// (pseudos et scores uniquement). La page historique.html les affiche. Une partie n'est inscrite qu'une fois (rooms/<code>/historyDone).
import { db, ref, runTransaction, set, serverNow } from "./firebase.js";

// entree = { game: 'quizz' | 'geo', nb: nombre de questions ou de manches, cats: [catégories] (quizz), players: [{ name, score, max }] classés }
export async function enregistrerPartie(code, entree) {
  try {
    if (!entree.players.length) return;
    const marque = await runTransaction(ref(db, `rooms/${code}/historyDone`), cur => (cur ? undefined : true));
    if (!marque.committed) return;
    const at = serverNow();
    const lignes = { code, at, game: entree.game, nb: entree.nb, players: entree.players.slice(0, 10).map(p => ({ name: String(p.name).slice(0, 20), score: p.score, max: p.max })) };
    if (entree.cats && entree.cats.length) lignes.cats = entree.cats.slice(0, 20).map(c => String(c).slice(0, 100));
    await set(ref(db, `history/${at.toString(36)}-${code}`), lignes);
  } catch (e) { console.warn('Historique non enregistré :', e); }
}
