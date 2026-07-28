import { expect, test, type Page } from '@playwright/test'

/**
 * Panier de demande de prix groupée.
 *
 * Ce n'est PAS un panier de commerce : les assertions vérifient donc aussi
 * l'absence de vocabulaire marchand et de tout montant.
 */

const CLE = 'kolab_panier'

/** Ajoute le n-ième produit du catalogue à la demande. */
async function ajouterProduit(page: Page, index: number) {
  await page.getByRole('button', { name: /Ajouter à la demande/ }).nth(index).click()
  await page.waitForTimeout(250)
}

test.describe('Panier de demande de prix', () => {
  test.beforeEach(async ({ page }) => {
    // Repart d'un panier vide : localStorage persiste entre les tests d'un
    // même contexte, ce qui rendrait les comptages dépendants de l'ordre.
    await page.goto('/fr/boutique')
    await page.evaluate((cle) => window.localStorage.removeItem(cle), CLE)
    await page.reload()
  })

  test('1 · ajout — le badge apparaît et se met à jour', async ({ page }) => {
    const lien = page.getByRole('link', { name: /Voir ma demande/ })

    // Aucun panier : pas d'icône. Une icône vide en permanence serait un
    // élément décoratif sans information (skill 08).
    await expect(lien).toHaveCount(0)

    await ajouterProduit(page, 0)
    await expect(lien.first()).toBeVisible()
    await expect(lien.first()).toContainText('1')

    await ajouterProduit(page, 1)
    await expect(lien.first()).toContainText('2')
  })

  test('2 · le bouton passe en « Ajouté » et se désactive', async ({ page }) => {
    const bouton = page.getByRole('button', { name: /Ajouter à la demande/ }).first()
    await bouton.click()
    await page.waitForTimeout(250)

    // Ré-appuyer incrémenterait la quantité sans retour visible.
    await expect(page.getByRole('button', { name: 'Ajouté', exact: true }).first()).toBeDisabled()
  })

  test('3 · persistance après rechargement', async ({ page }) => {
    await ajouterProduit(page, 0)
    await ajouterProduit(page, 1)

    await page.reload()
    await page.waitForTimeout(600)

    await expect(page.getByRole('link', { name: /Voir ma demande/ }).first()).toContainText('2')

    const stocke = await page.evaluate((cle) => window.localStorage.getItem(cle), CLE)
    expect(JSON.parse(stocke ?? '[]')).toHaveLength(2)
  })

  test('4 · page de demande — quantité modifiable et retrait', async ({ page }) => {
    await ajouterProduit(page, 0)
    await ajouterProduit(page, 1)
    await page.goto('/fr/boutique/demande')
    await page.waitForTimeout(600)

    // Portée à la liste du panier : `li` seul capterait aussi les listes de
    // la nav et du pied de page.
    const lignes = page.locator('main ul li').filter({ has: page.locator('input[type="number"]') })
    await expect(lignes).toHaveCount(2)

    const quantite = page.locator('input[type="number"]').first()
    await quantite.fill('4')
    await quantite.blur()
    await page.waitForTimeout(300)

    const apresQuantite = await page.evaluate((cle) => window.localStorage.getItem(cle), CLE)
    expect(JSON.parse(apresQuantite ?? '[]')[0].quantite).toBe(4)

    await page.getByRole('button', { name: 'Retirer', exact: true }).first().click()
    await page.waitForTimeout(300)
    await expect(lignes).toHaveCount(1)
  })

  test('5 · aucun montant ni vocabulaire marchand', async ({ page }) => {
    await ajouterProduit(page, 0)
    await page.goto('/fr/boutique/demande')
    await page.waitForTimeout(600)

    const texte = (await page.locator('main').innerText()).toLowerCase()

    for (const interdit of ['commande', 'achat', 'checkout', 'total', 'panier']) {
      expect(texte, `mot interdit trouvé : ${interdit}`).not.toContain(interdit)
    }
    // Aucun montant : ni symbole, ni séparateur décimal monétaire.
    expect(texte).not.toMatch(/\d+[,.]\d{2}\s*\$/)
  })

  test('6 · envoi groupé — le message est pré-rempli avec la liste', async ({ page }) => {
    await ajouterProduit(page, 0)
    await ajouterProduit(page, 1)
    await page.goto('/fr/boutique/demande')
    await page.waitForTimeout(500)

    await page.getByRole('link', { name: /Envoyer ma demande de prix/ }).click()
    await page.waitForURL('**/contact**')
    await page.waitForTimeout(800)

    const message = await page.locator('#message').inputValue()
    expect(message).toContain('Bambu Lab X1-Carbon')
    expect(message).toContain('× 1')
    // Type de demande présélectionné par ?type=boutique.
    await expect(page.locator('#type')).toHaveValue('boutique')
  })

  test('7 · le panier n’est PAS pré-rempli hors demande boutique', async ({ page }) => {
    await ajouterProduit(page, 0)

    // Sans ?type=boutique, la liste ne doit pas polluer une demande de mandat.
    await page.goto('/fr/contact')
    await page.waitForTimeout(800)

    expect(await page.locator('#message').inputValue()).toBe('')
  })
})
