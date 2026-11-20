const renderBase = render;
render = function () {
  renderBase();
  majMenu();
};

function majMenu() {
  const nb = Object.values(panier).reduce((s, n) => s + n, 0);
  const bp = document.querySelector('nav button[data-vue="panier"]');
  if (bp) {
    bp.innerHTML = nb
      ? `Panier <span style="background:#e10600;color:#fff;border-radius:99px;padding:1px 7px;font-size:12px;margin-left:3px">${nb}</span>`
      : "Panier";
  }
  const bg = document.querySelector('nav button[data-vue="gestion"]');
  if (bg) {
    const visible = admin || location.hash === "#admin";
    bg.style.display = visible ? "" : "none";
  }
  if (admin && vue === "gestion" && !document.getElementById("zoneMdp")) {
    const z = document.createElement("div");
    z.id = "zoneMdp";
    z.className = "carte";
    z.innerHTML = `<h3>Compte administrateur</h3>
      <p class="cat">${esc(ADMIN_EMAIL)}</p>
      <button class="btn gris" data-action="motdepasse">Changer mon mot de passe</button>`;
    app.appendChild(z);
  }
}

function toast(texte) {
  const t = document.createElement("div");
  t.textContent = texte;
  t.style.cssText = "position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:#111;color:#fff;padding:10px 18px;border-radius:99px;font-size:15px;z-index:99;box-shadow:0 2px 8px rgba(0,0,0,.3)";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1400);
}

const actions = {
  ajouter(id) {
    const p = produits.find(x => x.id === id);
    if (!p) return;
    if ((panier[id] || 0) < p.stock) {
      panier[id] = (panier[id] || 0) + 1;
      toast("✔ Ajouté au panier");
    } else alert("Stock maximum atteint pour cet appareil.");
  },
  retirer(id) { if (--panier[id] <= 0) delete panier[id]; },
  async commander() {
    try { await creerCommande(); }
    catch (e) { alert("Impossible d'envoyer la commande. Vérifie ta connexion et réessaie."); }
  },
  async connexion() {
    const email = document.getElementById("lEmail").value.trim();
    const mdp = document.getElementById("lMdp").value;
    try {
      await A.signInWithEmailAndPassword(auth, email, mdp);
      admin = true;
      ecouterCommandes();
      vue = "gestion";
    } catch (e) {
      alert("E-mail ou mot de passe incorrect.");
    }
  },
  async deconnexion() {
    await A.signOut(auth);
    admin = false;
    arreterCommandes();
    vue = "accueil";
  },
  async motdepasse() {
    try {
      await A.sendPasswordResetEmail(auth, ADMIN_EMAIL);
      alert("Un e-mail a été envoyé à " + ADMIN_EMAIL + ". Ouvre-le et appuie sur le lien pour choisir un nouveau mot de passe.");
    } catch (e) {
      alert("Impossible d'envoyer l'e-mail pour le moment.");
    }
  },
  async statut(id) {
    const c = commandes.find(x => x.id === id);
    const valide = estValide(c);
    if (!valide) {
      const manque = c.lignes.some(l => {
        const p = produits.find(x => x.id === l.id);
        return p && p.stock < l.qte;
      });
      if (manque && !confirm("Le stock est insuffisant pour un appareil. Valider quand même ?")) return;
    }
    const batch = F.writeBatch(db);
    batch.update(F.doc(db, "commandes", id), { statut: valide ? "En cours" : "Validée" });
    c.lignes.forEach(l => {
      const p = produits.find(x => x.id === l.id);
      if (p) batch.update(F.doc(db, "produits", l.id),
        { stock: Math.max(0, p.stock + (valide ? l.qte : -l.qte)) });
    });
    await batch.commit();
  },
  async supprimerCmd(id) {
    if (confirm("Supprimer cette commande ? (le stock ne sera pas remis)"))
      await F.deleteDoc(F.doc(db, "commandes", id));
  },
  async plus(id) {
    await F.updateDoc(F.doc(db, "produits", id), { stock: F.increment(1) });
  },
  async moins(id) {
    const p = produits.find(x => x.id === id);
    if (p && p.stock > 0)
      await F.updateDoc(F.doc(db, "produits", id), { stock: F.increment(-1) });
  },
  async supprimer(id) {
    if (!confirm("Supprimer cet appareil ?")) return;
    delete panier[id];
    await F.deleteDoc(F.doc(db, "produits", id));
  },
  async nouveau() {
    const nom = document.getElementById("nNom").value.trim();
    if (!nom) return alert("Écris un nom.");
    await F.addDoc(F.collection(db, "produits"), {
      nom,
      cat: document.getElementById("nCat").value.trim() || "Divers",
      prix: +document.getElementById("nPrix").value || 0,
      promo: 0,
      stock: +document.getElementById("nStock").value || 0,
      ordre: Date.now(),
    });
  },
  async charger() {
    const batch = F.writeBatch(db);
    DEPART.forEach((p, i) =>
      batch.set(F.doc(db, "produits", "p" + (i + 1)), { ...p, promo: 0, ordre: i + 1 }));
    await batch.commit();
  },
};

document.addEventListener("click", async e => {
  const b = e.target.closest("button");
  if (!b) return;
  try {
    if (b.dataset.vue) {
      vue = (b.dataset.vue === "gestion" && !admin) ? "connexion" : b.dataset.vue;
    } else if (b.dataset.cat) {
      categorie = b.dataset.cat;
    } else if (b.dataset.action) {
      const a = b.dataset.action;
      const adminOnly = ["plus", "moins", "supprimer", "nouveau", "statut",
                         "supprimerCmd", "charger", "motdepasse"];
      if (adminOnly.includes(a) && !admin) return;
      if (!pret && a !== "retirer") return alert("Connexion en cours, réessaie dans un instant.");
      await actions[a](b.dataset.id);
    } else return;
  } catch (err) {
    console.error(err);
    alert("Action refusée. Vérifie ta connexion et tes droits.");
  }
  render();
});

document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "recherche") {
    recherche = t.value;
    document.getElementById("liste").innerHTML = listeCatalogue();
  } else if (t.dataset.champ) {
    client[t.dataset.champ] = t.value;
  }
});

document.addEventListener("change", async e => {
  const t = e.target;
  if (!t.dataset.edit || !admin) return;
  const f = t.dataset.f;
  const val = (f === "prix" || f === "promo") ? (+t.value || 0) : t.value;
  try {
    await F.updateDoc(F.doc(db, "produits", t.dataset.edit), { [f]: val });
  } catch (err) {
    alert("Modification refusée.");
  }
});

window.addEventListener("hashchange", () => render());

async function demarrer() {
  render();
  try {
    const [appM, fsM, authM] = await Promise.all([
      import(BASE + "firebase-app.js"),
      import(BASE + "firebase-firestore.js"),
      import(BASE + "firebase-auth.js"),
    ]);
    F = fsM; A = authM;
    const fbApp = appM.initializeApp(firebaseConfig);
    db = F.getFirestore(fbApp);
    auth = A.getAuth(fbApp);

    F.onSnapshot(F.collection(db, "produits"), snap => {
      produits = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
      pret = true;
      erreur = "";
      rafraichir();
    }, () => {
      erreur = "Connexion à la base impossible. Vérifie les règles Firebase.";
      render();
    });

    A.onAuthStateChanged(auth, user => {
      if (user && user.email === ADMIN_EMAIL) {
        admin = true;
        ecouterCommandes();
      } else {
        admin = false;
        arreterCommandes();
      }
      rafraichir();
    });
  } catch (e) {
    erreur = "Impossible de charger Firebase. Vérifie ta connexion internet.";
    render();
  }
}

demarrer();
