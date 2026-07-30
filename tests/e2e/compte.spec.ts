import { expect, test, type Page } from '@playwright/test'

/**
 * Pages de compte — révélateur de mot de passe, format de page, cloisonnement
 * du panier.
 *
 * Trois demandes de Christian couvertes ici :
 *   1. « on doit avoir l'œil pour voir le mot de passe si on le souhaite »
 *   2. « on voit en bas du formulaire retour sur le site, alors qu'on voit
 *      déjà l'entête » — le lien redondant a été retiré
 *   3. « chaque profil connecté doit avoir son état, pas celui des autres »
 */

const PREFIXE = 'kolab_panier'

/** Identifiants fictifs : le test porte sur le cloisonnement, pas sur l'auth. */
const COMPTE_A = '11111111-1111-4111-8111-111111111111'
const COMPTE_B = '22222222-2222-4222-8222-222222222222'

/**
 * Fait répondre /api/session comme si telle personne était connectée.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI SIMULER PLUTÔT QUE SE CONNECTER POUR DE VRAI
 *
 * Créer deux comptes demanderait deux courriels de confirmation, donc un SMTP
 * configuré — il ne l'est pas encore (Resend en attente côté KO-LAB). Et même
 * une fois branché, faire dépendre ce test d'une boîte aux lettres le rendrait
 * lent et intermittent.
 *
 * Ce qu'on teste ici, c'est le CLOISONNEMENT CÔTÉ CLIENT : à identité donnée,
 * le panier lu est-il bien celui de cette identité et d'aucune autre. La route
 * est la seule source de l'identifiant pour le panier ; la remplacer isole
 * exactement la logique visée.
 *
 * ⚠️ Ce test ne dit RIEN de la solidité de l'authentification elle-même. Que
 * /api/session renvoie le bon identifiant relève du serveur, et repose sur
 * getUser() — vérifié ailleurs. Un panier n'est pas une frontière de sécurité :
 * il ne contient aucune donnée sensible et toute décision d'accès reste prise
 * côté serveur.
 * ---------------------------------------------------------------------------
 */
async function connecterCommeSi(page: Page, userId: string | null) {
  await page.route('**/api/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ userId }),
    }),
  )
}

/** Contenu brut du panier stocké pour une identité. */
function panierDe(page: Page, userId: string | null) {
  return page.evaluate(
    (cle) => JSON.parse(window.localStorage.getItem(cle) ?? '[]') as unknown[],
    `${PREFIXE}:${userId ?? 'anonyme'}`,
  )
}

/**
 * Ajoute un produit, en rejouant le clic tant que l'hydratation n'a pas eu
 * lieu — même raison que dans panier.spec.ts, où le mécanisme est détaillé.
 */
async function ajouterPremierProduit(page: Page) {
  const badge = page.getByRole('link', { name: /Voir ma sélection/ }).first()

  await expect(async () => {
    if ((await badge.count()) === 0) {
      await page.getByRole('button', { name: /Ajouter au panier/ }).first().click()
    }
    await expect(badge).toContainText('1', { timeout: 3_000 })
  }).toPass({ timeout: 15_000 })
}

test.describe('Mot de passe — révélateur', () => {
  for (const [nom, chemin] of [
    ['connexion', '/fr/connexion'],
    ['inscription', '/fr/inscription'],
  ] as const) {
    test(`${nom} — l'œil bascule le champ et revient`, async ({ page }) => {
      await page.goto(chemin)

      const champ = page.locator('#motDePasse')
      await expect(champ).toHaveAttribute('type', 'password')

      // `first()` : l'inscription a un second œil, celui de la confirmation.
      // Le bouton est hors du flux de tabulation, on le cible donc par son nom
      // accessible — qui doit décrire l'action à venir, pas l'état courant.
      await page.getByRole('button', { name: 'Afficher le mot de passe' }).first().click()
      await expect(champ).toHaveAttribute('type', 'text')

      await page.getByRole('button', { name: 'Masquer le mot de passe' }).first().click()
      await expect(champ).toHaveAttribute('type', 'password')
    })

    test(`${nom} — le bouton ne soumet pas le formulaire`, async ({ page }) => {
      await page.goto(chemin)
      // Sans type="button", un bouton dans un <form> vaut submit : le clic
      // enverrait le formulaire vide à chaque affichage du mot de passe.
      const oeil = page.getByRole('button', { name: 'Afficher le mot de passe' }).first()
      await expect(oeil).toHaveAttribute('type', 'button')
      await oeil.click()
      await expect(page).toHaveURL(new RegExp(`${chemin}$`))
    })
  }

  test('inscription — la confirmation a son propre œil', async ({ page }) => {
    await page.goto('/fr/inscription')

    // Deux champs, deux boutons indépendants : basculer l'un ne doit pas
    // révéler l'autre.
    await page.getByRole('button', { name: 'Afficher le mot de passe' }).first().click()
    await expect(page.locator('#motDePasse')).toHaveAttribute('type', 'text')
    await expect(page.locator('#confirmation')).toHaveAttribute('type', 'password')
  })
})

test.describe('Pages de compte — format', () => {
  for (const chemin of ['/fr/connexion', '/fr/inscription']) {
    test(`${chemin} — pas de lien « Retour au site » redondant`, async ({ page }) => {
      await page.goto(chemin)
      // L'entête est déjà là avec toute la navigation : un second chemin de
      // retour en bas de formulaire n'ajoute rien et alourdit la page.
      await expect(page.getByRole('link', { name: 'Retour au site' })).toHaveCount(0)
    })

    test(`${chemin} — l'entête complète est présente`, async ({ page }) => {
      await page.goto(chemin)
      await expect(page.getByRole('link', { name: 'KO-LAB' }).first()).toBeVisible()
    })
  }
})

test.describe('Pages de compte — mobile', () => {
  for (const chemin of ['/fr/connexion', '/fr/inscription', '/fr/mot-de-passe-oublie']) {
    test(`${chemin} — hamburger présent et panneau ouvrable`, async ({ page }, infos) => {
      test.skip(infos.project.name !== 'mobile', 'Vérification propre au format mobile')
      await page.goto(chemin)

      // Ces pages ont un gabarit à part (formulaire centré) : la régression
      // guettée est une entête amputée de sa navigation, relevée par
      // Christian sur la version en modale.
      const hamburger = page.getByRole('button', { name: /menu/i })
      await expect(hamburger).toBeVisible()

      await expect(async () => {
        await hamburger.click()
        await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
      }).toPass({ timeout: 10_000 })
    })

    test(`${chemin} — aucun débordement horizontal`, async ({ page }, infos) => {
      test.skip(infos.project.name !== 'mobile', 'Vérification propre au format mobile')
      await page.goto(chemin)

      // scrollWidth du document : un seul élément trop large suffit à décaler
      // toute la page, et c'est invisible tant qu'on ne mesure pas.
      const debordement = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debordement, `${debordement}px de débordement`).toBeLessThanOrEqual(0)
    })

    test(`${chemin} — cibles tactiles d'au moins 44px`, async ({ page }, infos) => {
      test.skip(infos.project.name !== 'mobile', 'Vérification propre au format mobile')
      await page.goto(chemin)

      // Le révélateur de mot de passe est le plus petit contrôle ajouté : s'il
      // passe, les champs et le bouton d'envoi passent aussi.
      for (const bouton of await page.getByRole('button').all()) {
        if (!(await bouton.isVisible())) continue
        const boite = await bouton.boundingBox()
        const nom = (await bouton.getAttribute('aria-label')) ?? (await bouton.innerText())
        expect(boite?.height ?? 0, `« ${nom} » trop bas`).toBeGreaterThanOrEqual(44)
      }
    })
  }
})

test.describe('Panier — un état par profil', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fr/boutique')
    await page.evaluate((p) => {
      for (const c of Object.keys(window.localStorage)) {
        if (c.startsWith(p)) window.localStorage.removeItem(c)
      }
    }, PREFIXE)
  })

  test('deux comptes ne voient pas la sélection de l’autre', async ({ page }) => {
    await connecterCommeSi(page, COMPTE_A)
    await page.goto('/fr/boutique')
    await ajouterPremierProduit(page)
    expect(await panierDe(page, COMPTE_A)).toHaveLength(1)

    // Même navigateur, autre compte : la sélection de A ne doit pas
    // apparaître, et ne doit pas non plus être détruite.
    await connecterCommeSi(page, COMPTE_B)
    await page.goto('/fr/boutique')
    await expect(page.getByRole('link', { name: /Voir ma sélection/ })).toHaveCount(0)
    expect(await panierDe(page, COMPTE_B)).toHaveLength(0)
    expect(await panierDe(page, COMPTE_A)).toHaveLength(1)

    // A revient : il reprend sa demande là où il l'avait laissée.
    await connecterCommeSi(page, COMPTE_A)
    await page.goto('/fr/boutique')
    await expect(page.getByRole('link', { name: /Voir ma sélection/ }).first()).toContainText('1')
  })

  test('la sélection anonyme est reprise à la connexion', async ({ page }) => {
    await connecterCommeSi(page, null)
    await page.goto('/fr/boutique')
    await ajouterPremierProduit(page)
    expect(await panierDe(page, null)).toHaveLength(1)

    await connecterCommeSi(page, COMPTE_A)
    await page.goto('/fr/boutique')
    await expect(page.getByRole('link', { name: /Voir ma sélection/ }).first()).toContainText('1')

    // Reprise, pas copie : la clé anonyme est vidée, sinon la sélection
    // resurgirait chez le visiteur suivant sur le même poste.
    expect(await panierDe(page, COMPTE_A)).toHaveLength(1)
    expect(await panierDe(page, null)).toHaveLength(0)
  })

  test('un ajout fait avant la réponse de session n’est pas perdu', async ({ page }) => {
    // Régression : l'identité arrivait après le clic et remplaçait l'état,
    // effaçant l'ajout sans le moindre signe à l'écran.
    let repondre: (() => void) | undefined
    const attente = new Promise<void>((r) => {
      repondre = r
    })
    await page.route('**/api/session', async (route) => {
      await attente
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ userId: COMPTE_A }),
      })
    })

    await page.goto('/fr/boutique')
    await page.getByRole('button', { name: /Ajouter au panier/ }).first().click()
    repondre?.()

    await expect(page.getByRole('link', { name: /Voir ma sélection/ }).first()).toContainText('1')
    expect(await panierDe(page, COMPTE_A)).toHaveLength(1)
  })

  test('rien ne s’affiche avant que l’identité soit connue', async ({ page }) => {
    // Session lente : tant qu'on ne sait pas qui est là, montrer un panier
    // reviendrait à risquer d'afficher celui d'un autre pendant un instant.
    await page.route('**/api/session', async (route) => {
      await new Promise((r) => setTimeout(r, 1200))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ userId: COMPTE_B }),
      })
    })

    await page.evaluate(
      (args) => window.localStorage.setItem(args[0], args[1]),
      [
        `${PREFIXE}:${COMPTE_A}`,
        JSON.stringify([{ slug: 'x', nom: 'X', categorie: 'C', quantite: 1 }]),
      ] as const,
    )

    await page.goto('/fr/boutique')
    await expect(page.getByRole('link', { name: /Voir ma sélection/ })).toHaveCount(0)
  })
})
