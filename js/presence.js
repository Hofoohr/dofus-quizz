// Nombre de personnes en ligne : chaque onglet ouvert s'inscrit dans « presence/<uid>/<onglet> » et se désinscrit tout seul à la déconnexion.
// Le compteur = nombre d'identifiants différents (deux onglets d'une même personne ne comptent qu'une fois).
import { db, ref, set, onValue, onDisconnect } from "./firebase.js";

export function enLigne(uid, onCount) {
  const moi = ref(db, `presence/${uid}/${Math.random().toString(36).slice(2, 8)}`);
  onValue(ref(db, '.info/connected'), s => {   // à chaque (re)connexion : on s'inscrit et on prépare la désinscription
    if (s.val() !== true) return;
    onDisconnect(moi).remove();
    set(moi, true);
  });
  onValue(ref(db, 'presence'), s => onCount(s.exists() ? Object.keys(s.val()).length : 0));
}
