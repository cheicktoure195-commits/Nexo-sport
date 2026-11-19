function vuePanier() {
  const ids = Object.keys(panier).filter(id => produits.some(p => p.id === id));
  if (!ids.length) return "<h2>Panier</h2><p>Ton panier est vide.</p>";
  let total = 0;
  const lignes = ids.map(id => {
    const p = produits.find(x => x.id === id);
    total += prixActuel(p) * panier[id];
    return `<div class="carte ligne">
      <div><b>${esc(p.nom)}</b><br>${fmt(prixActuel(p))} × ${panier[id]}</div>
      <button class="rond" data-action="retirer" data-id="${id}">−</button>
    </div>`;
  }).join("");
  return `<h2>Panier</h2>${lignes}
    <p class="prix">Total : ${fmt(total)}</p>
    <div class="carte">
      <h3>Informations de livraison</h3>
      ${champ("nom", "Ton nom complet")}
      ${champ("tel", "Ton numéro de téléphone", "tel")}
      ${champ("commune", "Commune")}
      ${champ("quartier", "Quartier")}
      <textarea data-champ="details" rows="3" placeholder="Détails pour te trouver (près de..., immeuble, étage...)">${esc(client.details)}</textarea>
    </div>
    <p><button class="btn" data-action="commander">Valider la commande</button></p>`;
}

function vueMerci() {
  const c = maCommande;
  const ok = c && estValide(c);
  return `<div class="merci">
      <div class="coche">${ok ? "🟢" : "🟠"}</div>
      <h2>${ok ? "Commande validée" : "Commande en cours de validation"}</h2>
      <p>Votre commande n°${c ? c.num : ""} a bien été enregistrée.</p>
      <p>${ok
        ? "<b>Votre commande est validée.</b> Le technicien va vous appeler pour la livraison."
        : "<b>Vous allez recevoir l'appel du technicien</b> pour confirmer la livraison. Merci de garder votre téléphone à portée de main."}</p>
      <button class="btn" data-vue="catalogue">Retour au catalogue</button>
    </div>`;
}

function vueConnexion() {
  return `<h2>Connexion administrateur</h2>
    <div class="carte">
      <input id="lEmail" type="email" placeholder="Ton e-mail" autocomplete="username">
      <input id="lMdp" type="password" placeholder="Ton mot de passe" autocomplete="current-password">
      <button class="btn" data-action="connexion">Se connecter</button>
    </div>`;
}

function blocCommandes() {
  const valides = commandes.filter(estValide);
  const enCours = commandes.length - valides.length;
  const ca = valides.reduce((s, c) => s + c.total, 0);
  const liste = commandes.length
    ? commandes.map(c => {
        const cl = c.client || {};
        return `
      <div class="carte">
        <div class="ligne"><b>Commande n°${c.num}</b>${badgeCmd(c)}</div>
        <p class="cat">${esc(c.date)}</p>
        ${(c.lignes || []).map(l => `<div>${l.qte} × ${esc(l.nom)}</div>`).join("")}
        <p class="prix">${fmt(c.total)}</p>
        <div class="client">
          <b>${esc(cl.nom)}</b><br>
          📞 <a href="tel:${esc(cl.tel)}">${esc(cl.tel)}</a><br>
          📍 ${esc(cl.commune)}, ${esc(cl.quartier)}
          ${cl.details ? "<br>" + esc(cl.details) : ""}
        </div>
        <p>
          <button class="btn ${estValide(c) ? "gris" : ""}" data-action="statut" data-id="${c.id}">
            ${estValide(c) ? "Remettre en cours" : "✔ Valider la commande"}</button>
          <button class="rond" data-action="supprimerCmd" data-id="${c.id}">🗑</button>
        </p>
      </div>`;
      }).join("")
    : "<p>Aucune commande pour le moment.</p>";
  return `<h2>Commandes</h2>
    <div class="stats">
      <div><b>🟠 ${enCours}</b>En cours</div>
      <div><b>🟢 ${valides.length}</b>Validées</div>
      <div><b>${fmt(ca)}</b>CA validé</div>
    </div>
    ${liste}`;
}

function vueGestion() {
  const finis = produits.filter(p => p.stock === 0).length;
  const faibles = produits.filter(p => p.stock > 0 && p.stock <= 3).length;
  return `<p><button class="btn gris" data-action="deconnexion">Se déconnecter</button></p>` +
    blocCommandes() +
    `<h2>Gestion du stock</h2>
    <div class="stats">
      <div><b>${produits.length}</b>Appareils</div>
      <div><b>${faibles}</b>Stock faible</div>
      <div><b>${finis}</b>Épuisés</div>
    </div>` +
    (produits.length ? "" : `<div class="carte"><p>Le catalogue est vide.</p>
      <button class="btn" data-action="charger">Charger les appareils de départ</button></div>`) +
    produits.map(p => `
    <div class="carte">
      <div class="ligne"><b>${esc(p.nom)}</b>${badge(p)}</div>
      <label class="lab">Nom</label>
      <input data-edit="${p.id}" data-f="nom" value="${esc(p.nom)}">
      <label class="lab">Catégorie</label>
      <input data-edit="${p.id}" data-f="cat" value="${esc(p.cat)}">
      <label class="lab">Prix (FCFA)</label>
      <input data-edit="${p.id}" data-f="prix" type="number" value="${p.prix}">
      <label class="lab">Prix promo (FCFA), laisse vide s'il n'y a pas de promo</label>
      <input data-edit="${p.id}" data-f="promo" type="number" value="${p.promo > 0 ? p.promo : ""}">
      <div class="ligne" style="margin-top:10px">
        <div>
          <button class="rond" data-action="moins" data-id="${p.id}">−</button>
          <b style="margin:0 10px">${p.stock}</b>
          <button class="rond" data-action="plus" data-id="${p.id}">+</button>
        </div>
        <button class="rond" data-action="supprimer" data-id="${p.id}">🗑</button>
      </div>
    </div>`).join("") + `
    <div class="carte">
      <h3>Ajouter un appareil</h3>
      <input id="nNom" placeholder="Nom">
      <input id="nCat" placeholder="Catégorie">
      <input id="nPrix" type="number" placeholder="Prix (FCFA)">
      <input id="nStock" type="number" placeholder="Stock">
      <button class="btn" data-action="nouveau">Ajouter</button>
    </div>`;
}

function render() {
  document.querySelectorAll("nav button").forEach(b =>
    b.classList.toggle("actif", b.dataset.vue === vue ||
      (vue === "connexion" && b.dataset.vue === "gestion")));
  const nb = commandes.filter(c => !estValide(c)).length;
  const bg = document.querySelector('nav button[data-vue="gestion"]');
  if (bg) bg.textContent = admin && nb ? `Gestion 🟠${nb}` : "Gestion";
  const alerte = erreur ? `<div class="carte">⚠️ ${esc(erreur)}</div>` : "";
  app.innerHTML = alerte + (
    vue === "accueil" ? vueAccueil()
    : vue === "catalogue" ? vueCatalogue()
    : vue === "panier" ? vuePanier()
    : vue === "merci" ? vueMerci()
    : vue === "connexion" ? vueConnexion() : vueGestion());
}

(function () {
  const s = document.createElement("script");
  s.src = "script3.js";
  document.body.appendChild(s);
})();
