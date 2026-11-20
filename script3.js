function rafraichir() {
  const a = document.activeElement;
  if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA")) return;
  render();
}

function ecouterCommandes() {
  if (unsubCmd) return;
  unsubCmd = F.onSnapshot(
    F.query(F.collection(db, "commandes"), F.orderBy("ts", "desc")),
    snap => {
      commandes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      rafraichir();
    },
    () => { erreur = "Impossible de lire les commandes. Vérifie les règles Firebase."; render(); }
  );
}

function arreterCommandes() {
  if (unsubCmd) unsubCmd();
  unsubCmd = null;
  commandes = [];
}

async function creerCommande() {
  const ids = Object.keys(panier).filter(id => produits.some(p => p.id === id));
  if (!ids.length) return;
  if (!client.nom || !client.tel || !client.commune || !client.quartier) {
    alert("Remplis ton nom, ton numéro, ta commune et ton quartier.");
    return;
  }
  let total = 0;
  const lignes = ids.map(id => {
    const p = produits.find(x => x.id === id);
    const pr = prixActuel(p);
    total += pr * panier[id];
    return { id, nom: p.nom, qte: panier[id], prix: pr };
  });
  const cmd = {
    num: Number(String(Date.now()).slice(-6)),
    total, lignes,
    client: {
      nom: client.nom, tel: client.tel, commune: client.commune,
      quartier: client.quartier, details: client.details || "",
    },
    statut: "En cours",
    ts: Date.now(),
    date: new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
  };
  const ref = await F.addDoc(F.collection(db, "commandes"), cmd);
  maCommande = cmd;
  if (unsubMa) unsubMa();
  unsubMa = F.onSnapshot(F.doc(db, "commandes", ref.id), s => {
    if (s.exists()) { maCommande = s.data(); rafraichir(); }
  }, () => {});
  panier = {};
  client = {};
  vue = "merci";
}

(function () {
  const s = document.createElement("script");
  s.src = "script4.js";
  document.body.appendChild(s);
})();
