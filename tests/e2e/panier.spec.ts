import { expect, test, type Page } from '@playwright/test'

/**
 * Panier / sélection groupée.
 *
 * Ce n'est PAS un panier de commerce : le prix indicatif par produit et le
 * total sont affichés (catalogue, fiche produit, récapitulatif), mais aucun
 * vocabulaire d'achat ferme (commande, achat, checkout) n'apparaît jamais —
 * les assertions vérifient ça.
 */

const CLE = 'kolab_panier'

/**
 * Ajoute le n-ième produit du catalogue à la demande.
 *
 * L'attente porte sur le badge, pas sur un délai fixe : l'écriture dans
 * localStorage puis le re-rendu prennent un temps variable, et le test
 * devenait intermittent en émulation mobile.
 */
async function ajouterProduit(page: Page, index: number, attendu: number) {
  await page.getByRole('button', { name: /Ajouter au panier/ }).nth(index).click()
  await expect(page.getByRole('link', { name: /Voir ma sélection/ }).first()).toContainText(
    String(attendu),
  )
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

    await ajouterProduit(page, 0, 1)
    await expect(lien.first()).toBeVisible()

    await ajouterProduit(page, 1, 2)
  })

  test('2 · le bouton passe en « Ajouté » et se désactive', async ({ page }) => {
    await ajouterProduit(page, 0, 1)

    // Un bouton laissé actif mais inopérant serait annoncé comme cliquable
    // par un lecteur d'écran.
    await expect(page.getByRole('button', { name: 'Ajouté', exact: true }).first()).toBeDisabled()
  })

  test('3 · persistance après rechargement', async ({ page }) => {
    await ajouterProduit(page, 0, 1)
    await ajouterProduit(page, 1, 2)

    await page.reload()

    await expect(page.getByRole('link', { name: /Voir ma sélection/ }).first()).toContainText('2')

    const stocke = await page.evaluate((cle) => window.localStorage.getItem(cle), CLE)
    expect(JSON.parse(stocke ?? '[]')).toHaveLength(2)
  })

  test('4 · page de demande — quantité modifiable et retrait', async ({ page }) => {
    await ajouterProduit(page, 0, 1)
    await ajouterProduit(page, 1, 2)
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
    // ⚠️ `.nth(1)` après un premier ajout NE cible PAS le 2ᵉ produit du
    // catalogue : le bouton du 1ᵉʳ passe en « Ajouté » et sort du sélecteur
    // /Ajouter au panier/, donc tous les index suivants se décalent d'un cran
    // (X1-Carbon 1800 $ puis AMS 449 $, pas X1-Carbon puis P1S). Total
    // attendu ci-dessous vérifié en conséquence, pas dans l'ordre du
    // catalogue. Prix AMS relevé sur ca.store.bambulab.com (voir produits.ts).
    await ajouterProduit(page, 0, 1)
    await ajouterProduit(page, 1, 2)
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
    // Les deux prix indicatifs individuels, et leur somme (2249 $).
    expect(texte).toContain('1 800')
    expect(texte).toContain('449')
    expect(texte).toContain('total indicatif')
    expect(texte).toContain('2 249')
  })

  test('6 · envoi groupé — le message est pré-rempli avec la liste', async ({ page }) => {
    await ajouterProduit(page, 0, 1)
    await ajouterProduit(page, 1, 2)
    await page.goto('/fr/boutique/demande')

    await page.getByRole('link', { name: /Confirmer ma sélection/ }).click()
    await page.waitForURL('**/contact**')
    await page.waitForTimeout(800)

    const message = await page.locator('#message').inputValue()
    expect(message).toContain('Bambu Lab X1-Carbon')
    // Type de demande présélectionné par ?type=boutique.
    await expect(page.locator('#type')).toHaveValue('boutique')
  })

  test('7 · le panier n’est PAS pré-rempli hors demande boutique', async ({ page }) => {
    await ajouterProduit(page, 0, 1)

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
    // 12 avec la catégorie Conteneurs active (NEXT_PUBLIC_SOLUTIONS_MODULAIRES,
    // entente commerciale confirmée le 28 juillet 2026) — 9 sans elle.
    await expect(cartes).toHaveCount(12)

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
    // 12 avec la catégorie Conteneurs active (NEXT_PUBLIC_SOLUTIONS_MODULAIRES,
    // entente commerciale confirmée le 28 juillet 2026) — 9 sans elle.
    await expect(cartes).toHaveCount(12)
  })
})
