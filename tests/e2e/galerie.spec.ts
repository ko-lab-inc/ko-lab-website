import { expect, test } from '@playwright/test'

/**
 * Réalisations — galerie et visionneuse d'images.
 *
 * Demande de Christian : « nos réalisations sera pris comme galerie et on fera
 * un slide images à ce niveau ».
 */

/** Ouvre la série de la première carte et renvoie le dialogue. */
async function ouvrirSerie(page: import('@playwright/test').Page) {
  await page.goto('/fr/realisations')

  // Les cartes sont sous un `Reveal` : invisibles tant qu'elles ne sont pas
  // entrées dans la zone visible. Un clic sur un élément à opacité nulle
  // échouerait — c'est un vrai comportement du site, pas un artefact de test.
  const bouton = page.getByRole('button', { name: /Voir les images/ }).first()
  await bouton.scrollIntoViewIfNeeded()
  await expect(bouton).toBeVisible()
  await bouton.click()

  const boite = page.getByRole('dialog')
  await expect(boite).toBeVisible()
  return boite
}

test.describe('Galerie — visionneuse', () => {
  test('le compteur d’images n’apparaît que sur les séries', async ({ page }) => {
    await page.goto('/fr/realisations')
    await page.getByRole('button', { name: /Voir les images/ }).first().scrollIntoViewIfNeeded()

    // Trois réalisations, trois séries de plus d'une image : trois compteurs.
    // Une carte à image unique n'ouvrirait rien et ne doit donc rien annoncer.
    const ouvertures = page.getByRole('button', { name: /Voir les images/ })
    await expect(ouvertures).toHaveCount(3)
  })

  test('ouverture, navigation par les flèches, retour au début', async ({ page }) => {
    const boite = await ouvrirSerie(page)

    // La première réalisation compte trois images.
    await expect(boite.getByText('1 sur 3')).toBeVisible()

    await boite.getByRole('button', { name: 'Image suivante' }).click()
    await expect(boite.getByText('2 sur 3')).toBeVisible()

    await boite.getByRole('button', { name: 'Image précédente' }).click()
    await expect(boite.getByText('1 sur 3')).toBeVisible()

    // Boucle : reculer depuis la première mène à la dernière. Un bouton
    // désactivé en bout de série obligerait à revenir en arrière image par
    // image.
    await boite.getByRole('button', { name: 'Image précédente' }).click()
    await expect(boite.getByText('3 sur 3')).toBeVisible()
  })

  test('les flèches du clavier naviguent', async ({ page }) => {
    const boite = await ouvrirSerie(page)

    await page.keyboard.press('ArrowRight')
    await expect(boite.getByText('2 sur 3')).toBeVisible()

    await page.keyboard.press('ArrowLeft')
    await expect(boite.getByText('1 sur 3')).toBeVisible()
  })

  test('les pastilles mènent directement à une image', async ({ page }) => {
    const boite = await ouvrirSerie(page)

    await boite.getByRole('button', { name: '3 sur 3' }).click()
    await expect(boite.getByText('3 sur 3')).toBeVisible()
  })

  test('Échap ferme, et la série se rouvre ensuite', async ({ page }) => {
    const boite = await ouvrirSerie(page)

    // Comportement natif de <dialog>. Sans écoute de l'événement `close`,
    // l'état du parent resterait « ouvert » et la réouverture échouerait —
    // c'est précisément ce que ce test garde.
    await page.keyboard.press('Escape')
    await expect(boite).toBeHidden()

    await page.getByRole('button', { name: /Voir les images/ }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('la visionneuse rouvre toujours sur la première image', async ({ page }) => {
    const boite = await ouvrirSerie(page)
    await boite.getByRole('button', { name: 'Image suivante' }).click()
    await expect(boite.getByText('2 sur 3')).toBeVisible()

    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: /Voir les images/ }).first().click()

    // Sans remise à zéro, on rouvrirait sur l'image où l'on s'était arrêté —
    // déroutant quand on revient plusieurs minutes plus tard.
    await expect(page.getByRole('dialog').getByText('1 sur 3')).toBeVisible()
  })

  test('le filtre reste opérant sous la visionneuse', async ({ page }) => {
    await page.goto('/fr/realisations')
    const bouton = page.getByRole('button', { name: /Voir les images/ }).first()
    await bouton.scrollIntoViewIfNeeded()

    await page.getByRole('button', { name: 'Le LAB', exact: true }).click()
    await expect(page.getByRole('button', { name: /Voir les images/ })).toHaveCount(1)

    await page.getByRole('button', { name: /Voir les images/ }).click()
    // La série du LAB compte trois images, comme celle des opérations : on
    // vérifie plutôt le titre, qui distingue vraiment les deux.
    await expect(page.getByRole('dialog', { name: 'Fabrication sur mesure' })).toBeVisible()
  })

  test('aucun débordement horizontal, visionneuse ouverte', async ({ page }, infos) => {
    test.skip(infos.project.name !== 'mobile', 'Vérification propre au format mobile')
    await ouvrirSerie(page)

    const debordement = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(debordement, `${debordement}px de débordement`).toBeLessThanOrEqual(0)
  })
})
