const firebaseConfig = {
  apiKey: "AIzaSyDIcVO4ZoNR8GDFVMgcX-5fNqdXLb4gAg8",
  authDomain: "nexo-sport-2026.firebaseapp.com",
  projectId: "nexo-sport-2026",
  storageBucket: "nexo-sport-2026.firebasestorage.app",
  messagingSenderId: "16834511743",
  appId: "1:16834511743:web:f635f945606811f084504a",
};
const BASE = "https://www.gstatic.com/firebasejs/13.3.0/";
const ADMIN_EMAIL = "alainvitesse4@gmail.com";

const DEPART = [
  { nom: "Tapis de course E6", cat: "Tapis de course", prix: 222000, stock: 5 },
  { nom: "Tapis de course A2", cat: "Tapis de course", prix: 261000, stock: 5 },
  { nom: "Tapis de course AV7", cat: "Tapis de course", prix: 315000, stock: 5 },
  { nom: "Vélo fitness pliable", cat: "Vélos fitness", prix: 136000, stock: 5 },
  { nom: "Vélo fitness non pliable", cat: "Vélos fitness", prix: 216000, stock: 5 },
  { nom: "Dégraisseur ultra", cat: "Remise en forme", prix: 124500, stock: 5 },
  { nom: "Tapis pilates", cat: "Pilates et yoga", prix: 52000, stock: 5 },
  { nom: "Gaine de sport", cat: "Accessoires", prix: 10000, stock: 5 },
];

let F, A, db, auth;
let produits = [];
let commandes = [];
let panier = {};
let client = {};
let maCommande = null;
let vue = "accueil";
let recherche = "";
let categorie = "Tous";
let admin = false;
let pret = false;
let erreur = "";
let unsubCmd = null;
let unsubMa = null;

const app = document.getElementById("app");
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = n => Number(n).toLocaleString("fr-FR") + " FCFA";
const prixActuel = p => (p.promo > 0 && p.promo < p.prix) ? p.promo : p.prix;
const estValide = c => c.statut === "Validée";

function badge(p) {
  if (p.stock === 0) return '<span class="badge fini">Épuisé</span>';
  if (p.stock <= 3) return `<span class="badge faible">Stock faible : ${p.stock}</span>`;
  return `<span class="badge ok">En stock : ${p.stock}</span>`;
}
function badgeCmd(c) {
  return estValide(c)
    ? '<span class="badge st-vert">🟢 Commande validée</span>'
    : '<span class="badge st-orange">🟠 En cours de validation</span>';
}
function affichePrix(p) {
  return prixActuel(p) < p.prix
    ? `<span><span class="ancien">${fmt(p.prix)}</span><span class="prix">${fmt(p.promo)}</span></span>`
    : `<span class="prix">${fmt(p.prix)}</span>`;
}

function vueAccueil() {
  const dispo = produits.filter(p => p.stock > 0).length;
  return `<div class="hero">
      <h2>Nexo, votre équipement de sport</h2>
      <p>Tapis de course, vélos fitness, remise en forme et plus encore. Consultez en temps réel ce qui est en stock et commandez en quelques clics.</p>
      <button class="btn-clair" data-vue="catalogue">Voir le catalogue</button>
    </div>
    <div class="stats">
      <div><b>${produits.length}</b>Appareils</div>
      <div><b>${dispo}</b>Disponibles</div>
    </div>
    <div class="carte">
      <h3>Comment ça marche ?</h3>
      <p>Choisissez vos appareils dans le catalogue, ajoutez-les au panier, indiquez votre adresse de livraison et validez votre commande.</p>
    </div>`;
}

function listeCatalogue() {
  if (!pret) return "<p>Chargement du catalogue...</p>";
  const q = recherche.trim().toLowerCase();
  const liste = produits.filter(p =>
    (categorie === "Tous" || p.cat === categorie) &&
    String(p.nom).toLowerCase().includes(q));
  if (!liste.length) return "<p>Aucun appareil trouvé.</p>";
  return liste.map(p => `
    <div class="carte">
      <h3>${esc(p.nom)} ${prixActuel(p) < p.prix ? '<span class="badge promo">PROMO</span>' : ""}</h3>
      <p class="cat">${esc(p.cat)}</p>
      <div class="ligne">${affichePrix(p)}${badge(p)}</div>
      <p><button class="btn" data-action="ajouter" data-id="${p.id}"
        ${p.stock === 0 ? "disabled" : ""}>
        ${p.stock === 0 ? "Indisponible" : "Ajouter au panier"}</button></p>
    </div>`).join("");
}

function vueCatalogue() {
  const cats = ["Tous", ...new Set(produits.map(p => p.cat))];
  return `<h2>Nos appareils</h2>
    <input id="recherche" placeholder="Rechercher un appareil" value="${esc(recherche)}">
    <div class="filtres">
      ${cats.map(c => `<button class="puce ${c === categorie ? "actif" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}
    </div>
    <div id="liste">${listeCatalogue()}</div>`;
}

function champ(k, ph, type = "text") {
  return `<input data-champ="${k}" type="${type}" placeholder="${ph}" value="${esc(client[k])}">`;
}

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
  if (bg) bg.textContent = admin && nb 
