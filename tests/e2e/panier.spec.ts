import { expect, test, type Page } from '@playwright/test'

/**
 * Panier / sélection groupée.
 *
 * Ce n'est PAS un panier de commerce : le prix indicatif par produit et le
 * total sont affichés (catalogue, fiche produit, récapitulatif), mais aucun
 * vocabulaire d'achat ferme (commande, achat, checkout) n'apparaît jamais —
 * les assertions vérifient ça.
 */

/**
 * ⚠️ La clé porte l'identité depuis la séparation des paniers par compte
 * (PanierContext, `cleDe()`). Ces tests naviguent tous sans session : le
 * suffixe est donc `anonyme`. Le cloisonnement entre comptes est vérifié à
 * part, dans `compte.spec.ts` ; la confirmation de commande avec une VRAIE
 * session, dans `commande.spec.ts` (nécessaire dès qu'une écriture en base
 * dépend de `auth.getUser()` — une session simulée via /api/session, comme
 * ici, ne suffit plus pour ça).
 */
const CLE = 'kolab_panier:anonyme'

/**
 * Ajoute UN PRODUIT NOMMÉ (pas « le n-ième ») à la demande.
 *
 * L'attente porte sur le badge, pas sur un délai fixe : l'écriture dans
 * localStorage puis le re-rendu prennent un temps variable, et le test
 * devenait intermittent en émulation mobile.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ PAR NOM, PAS PAR POSITION — corrigé après l'ajout d'un vrai conteneur
 * depuis /admin/catalogue pendant les tests.
 *
 * Cibler « le 1ᵉʳ bouton Ajouter au panier » supposait un catalogue figé :
 * l'ordre d'affichage recale les produits récents en tête (voir lib/stock.ts
 * et actions.ts, ordre = min - 10), donc un produit ajouté par l'équipe
 * décale silencieusement TOUS les index suivants. La recherche isole le
 * produit visé, quel que soit son rang dans la grille.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI LE CLIC EST REJOUÉ
 *
 * Un clic qui arrive avant la fin de l'hydratation ne déclenche rien : le
 * bouton est dans le document, mais React n'y a pas encore attaché son
 * gestionnaire. Sous exécution parallèle (deux projets, plusieurs workers),
 * l'hydratation prend assez de temps pour que ça se produise — d'où des échecs
 * d'environ une exécution sur trois, sur un test différent à chaque fois.
 * ---------------------------------------------------------------------------
 */
async function ajouterProduit(page: Page, nom: string, attendu: number) {
  const badge = page.getByRole('link', { name: /Voir ma sélection/ }).first()
  const champRecherche = page.getByPlaceholder('Rechercher un produit…')

  await expect(async () => {
    const dejaFait = (await badge.count()) > 0 && (await badge.innerText()).includes(String(attendu))
    if (!dejaFait) {
      await champRecherche.fill(nom)
      await page.getByRole('button', { name: /Ajouter au panier/ }).first().click()
      await champRecherche.fill('')
    }
    await expect(badge).toContainText(String(attendu), { timeout: 3_000 })
  }).toPass({ timeout: 15_000 })
}

/**
 * Réactivée avec PANIER_ACTIF (Christian, refonte boutique style Bambu Store) —
 * voir src/lib/config/features.ts. Si le drapeau repasse à false, re-skip
 * cette suite plutôt que la laisser échouer silencieusement.
 */
test.describe('Panier / sélection', () => {
  test.beforeEach(async ({ page }) => {
    // Repart d'un panier vide : localStorage persiste entre les tests d'un
    // même contexte, ce qui rendrait les comptages dépendants de l'ordre.
    await page.goto('/fr/boutique')
    await page.evaluate((cle) => window.localStorage.removeItem(cle), CLE)
    await page.reload()
  })

  test('1 · ajout — le badge apparaît et se met à jour', async ({ page }) => {
    const lien = page.getByRole('link', { name: /Voir ma sélection/ })

    // Aucun panier : pas d'icône. Une icône vide en permanence serait un
    // élément décoratif sans information (skill 08).
    await expect(lien).toHaveCount(0)

    await ajouterProduit(page, 'Bambu Lab X1-Carbon', 1)
    await expect(lien.first()).toBeVisible()

    await ajouterProduit(page, 'Conteneur 2 pieds', 2)
  })

  test('2 · le bouton passe en « Ajouté » et se désactive', async ({ page }) => {
    await ajouterProduit(page, 'Bambu Lab X1-Carbon', 1)

    // Un bouton laissé actif mais inopérant serait annoncé comme cliquable
    // par un lecteur d'écran.
    await expect(page.getByRole('button', { name: 'Ajouté', exact: true }).first()).toBeDisabled()
  })

  test('3 · persistance après rechargement', async ({ page }) => {
    await ajouterProduit(page, 'Bambu Lab X1-Carbon', 1)
    await ajouterProduit(page, 'Conteneur 2 pieds', 2)

    await page.reload()

    await expect(page.getByRole('link', { name: /Voir ma sélection/ }).first()).toContainText('2')

    const stocke = await page.evaluate((cle) => window.localStorage.getItem(cle), CLE)
    expect(JSON.parse(stocke ?? '[]')).toHaveLength(2)
  })

  test('4 · page de demande — quantité modifiable et retrait', async ({ page }) => {
    await ajouterProduit(page, 'Bambu Lab X1-Carbon', 1)
    await ajouterProduit(page, 'Conteneur 2 pieds', 2)
    await page.goto('/fr/boutique/demande')

    // Portée à la liste du panier : `li` seul capterait aussi les listes de
    // la nav et du pied de page. Même contrôle +/- que la boutique
    // (BoutonAjouter) — plus de <input type="number"> natif sur cette page.
    const lignes = page.locator('main ul li').filter({ has: page.getByLabel(/Quantité \+/) })
    await expect(lignes).toHaveCount(2)

    const plus = lignes.first().getByLabel(/Quantité \+/)
    await plus.click()
    await plus.click()
    await plus.click()
    await page.waitForTimeout(400)

    const apresQuantite = await page.evaluate((cle) => window.localStorage.getItem(cle), CLE)
    expect(JSON.parse(apresQuantite ?? '[]')[0].quantite).toBe(4)

    await page.getByRole('button', { name: 'Retirer', exact: true }).first().click()
    await expect(lignes).toHaveCount(1)
  })

  test('5 · prix par article ET total, tous indicatifs', async ({ page }) => {
    // Deux produits nommés explicitement (pas « le 1er et le 2e du
    // catalogue ») : le total attendu (3800 $) dépend des DEUX prix exacts,
    // et l'ordre d'affichage du catalogue n'a aucune raison de rester stable
    // d'une exécution à l'autre (voir la docstring de ajouterProduit).
    //
    // ⚠️ Choisis parce qu'ils sont EN STOCK (≥ 5 unités) au moment d'écrire ce
    // test — BoutonAjouter refuse maintenant d'ajouter un produit en rupture
    // (quantité < 5, même règle que le badge public, lib/produits.ts). Si
    // l'un des deux tombe sous ce seuil depuis /admin/catalogue, ce test
    // échouera sur l'AJOUT lui-même (timeout dans ajouterProduit), pas sur
    // les montants — signe qu'il faut choisir deux autres produits en stock.
    await ajouterProduit(page, 'Bambu Lab X1-Carbon', 1)
    await ajouterProduit(page, 'Conteneur 2 pieds', 2)
    await page.goto('/fr/boutique/demande')
    await page.waitForTimeout(500)

    // Intl.NumberFormat (fr-CA) sépare les milliers par une espace insécable
    // (U+00A0 ou U+202F), pas une espace normale — invisible à l'œil mais
    // différente pour `toContain`. Normalisée avant comparaison.
    const texte = (await page.locator('main').innerText())
      .toLowerCase()
      .replace(/[  ]/g, ' ')

    // Toujours interdit : vocabulaire d'achat ferme, même avec un total
    // affiché — la sélection reste sujette à confirmation, jamais une
    // facture ou une commande passée.
    for (const interdit of ['commande', 'achat', 'checkout', 'panier']) {
      expect(texte, `mot interdit trouvé : ${interdit}`).not.toContain(interdit)
    }
    // Les deux prix indicatifs individuels, et leur somme (3800 $).
    expect(texte).toContain('1 800')
    expect(texte).toContain('2 000')
    expect(texte).toContain('total indicatif')
    expect(texte).toContain('3 800')
  })

  /**
   * ⚠️ Tests 6 et 6bis RETIRÉS le 1er août 2026 (migration 0021), pas
   * seulement corrigés.
   *
   * Les deux vérifiaient un mécanisme qui n'existe plus : un lien direct vers
   * /contact?type=boutique (test 6), et une redirection vers /connexion pour
   * l'anonyme (6bis). Confirmer une commande passe désormais par une VRAIE
   * commande (`commandes`/`lignes_commande`) et, pour l'anonyme, par une
   * modale EN PLACE — plus aucune navigation vers /contact ni /connexion à
   * ce moment du parcours.
   *
   * La même intention est couverte, à jour, dans tests/e2e/commande.spec.ts :
   *   test 1 — anonyme, la modale apparaît, aucune navigation
   *   test 2 — connecté, la commande est créée et le panier vidé
   * Dupliquer ici aurait fini par diverger de ce que fait réellement
   * PagePanier, exactement le risque que ces tests étaient censés surveiller.
   */

  test('7 · le panier n’est PAS pré-rempli hors demande boutique', async ({ page }) => {
    await ajouterProduit(page, 'Bambu Lab X1-Carbon', 1)

    // Sans ?type=boutique, la liste ne doit pas polluer une demande de mandat.
    await page.goto('/fr/contact')
    await page.waitForTimeout(800)

    expect(await page.locator('#message').inputValue()).toBe('')
  })
})

test.describe('Recherche boutique', () => {
  test('8 · la recherche et le filtre de catégorie se cumulent', async ({ page }) => {
    await page.goto('/fr/boutique')
    const cartes = page.locator('article')
    // Total réel du catalogue à cet instant, PAS un nombre figé : le
    // catalogue est géré depuis /admin/catalogue et grandit avec le temps —
    // un compte codé en dur ici a déjà cassé ce test le jour où un vrai
    // produit a été ajouté (voir lib/produits.ts). Sert uniquement à
    // vérifier plus bas que « Tout voir » restaure la liste complète.
    await expect(cartes.first()).toBeVisible()
    const total = await cartes.count()
    expect(total).toBeGreaterThan(0)

    const champ = page.getByPlaceholder('Rechercher un produit…')

    // Recherche seule.
    await champ.fill('xTool')
    await expect(cartes).toHaveCount(3)

    // Insensible aux accents : « decoupe » doit trouver « découpe ».
    await champ.fill('decoupe')
    await expect(cartes.first()).toBeVisible()

    // Cumul avec la catégorie : xTool filtré sur Impression 3D = rien.
    await champ.fill('xTool')
    await page.getByRole('button', { name: 'Impression 3D', exact: true }).click()
    await expect(cartes).toHaveCount(0)
    await expect(page.getByText('Aucun produit ne correspond à votre recherche.')).toBeVisible()

    // Retour à l'état complet.
    await champ.fill('')
    await page.getByRole('button', { name: 'Tout voir', exact: true }).click()
    await expect(cartes).toHaveCount(total)
  })
})
