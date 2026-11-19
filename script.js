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

(function () {
  const s = document.createElement("script");
  s.src = "script2.js";
  document.body.appendChild(s);
})();
