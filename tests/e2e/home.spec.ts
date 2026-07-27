import { expect, test, type Page } from '@playwright/test'

/**
 * Page d'accueil — contrôles rejouables (skill 26).
 *
 * Ces sept vérifications viennent d'un script ponctuel qui a trouvé quatre
 * bugs réels invisibles au typecheck : désynchronisation d'hydratation,
 * `lang` figé lors de la bascule de langue, débordements, états de survol.
 * Elles sont ici pour être rejouées à CHAQUE nouvelle section.
 *
 * Le serveur est démarré automatiquement par playwright.config.ts.
 */

/**
 * Fait défiler toute la page pour déclencher les IntersectionObserver, puis
 * revient en haut. Sans ça, les sections .reveal restent à opacity 0 et les
 * assertions de visibilité échouent.
 */
async function deroulerPuisRemonter(page: Page) {
  await page.evaluate(async () => {
    const pas = window.innerHeight / 2
    for (let y = 0; y < document.body.scrollHeight; y += pas) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(900)
}

/**
 * Diagnostics émis par Next EN DÉVELOPPEMENT SEULEMENT, à ne pas confondre
 * avec un défaut applicatif.
 *
 * L'avis LCP se déclenche par intermittence : l'observateur de Next court après
 * le chargement de l'image, et sur un serveur fraîchement compilé il conclut
 * parfois à tort. Les images concernées portent déjà `priority` — vérifié dans
 * Hero.tsx, Besoins.tsx et GalerieRealisations.tsx — et l'avis disparaît d'un
 * passage à l'autre sans changement de code.
 *
 * ⚠️ Filtre volontairement ÉTROIT : il ne doit jamais servir à masquer un vrai
 * avertissement. Toute autre entrée console fait toujours échouer le test.
 */
const DIAGNOSTICS_DEV = [/was detected as the Largest Contentful Paint \(LCP\)/]

/** Collecte erreurs console, exceptions et requêtes en échec. */
function collecterProblemes(page: Page): string[] {
  const problemes: string[] = []
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return
    if (DIAGNOSTICS_DEV.some((motif) => motif.test(m.text()))) return
    problemes.push(`[${m.type()}] ${m.text()}`)
  })
  page.on('pageerror', (e) => problemes.push(`[pageerror] ${e.message}`))
  page.on('requestfailed', (r) => problemes.push(`[requete] ${r.url()} — ${r.failure()?.errorText}`))
  return problemes
}

test.describe('Accueil', () => {
  test('1 · aucun débordement horizontal', async ({ page }) => {
    await page.goto('/fr')
    await deroulerPuisRemonter(page)

    const { scrollWidth, clientWidth, coupables } = await page.evaluate(() => {
      // Nomme l'élément fautif plutôt que de constater le symptôme.
      const large: string[] = []
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect()
        // Seuil au demi-pixel : un débordement d'arrondi sous-pixel suffit à
        // faire apparaître une barre de défilement horizontale.
        if (r.right > document.documentElement.clientWidth + 0.5) {
          large.push(`${el.tagName}.${String(el.className).slice(0, 70)} → ${r.right.toFixed(1)}px`)
        }
      }
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        coupables: large.slice(0, 5),
      }
    })

    expect(scrollWidth, `éléments hors cadre :\n${coupables.join('\n')}`).toBeLessThanOrEqual(
      clientWidth,
    )
  })

  test('2 · la nav est collante en haut', async ({ page }) => {
    await page.goto('/fr')

    // getByRole('banner') et non locator('header') : la section Besoins a elle
    // aussi un <header>, mais imbriqué dans un <section> il ne porte pas le
    // rôle banner. Seule la nav du document l'expose.
    const header = page.getByRole('banner')
    await expect(header).toHaveCSS('position', 'sticky')

    // Le filet n'apparaît qu'au défilement (skill 20).
    await page.evaluate(() => window.scrollTo(0, 400))
    await page.waitForTimeout(400)
    const couleur = await header.evaluate((el) => getComputedStyle(el).borderBottomColor)
    expect(couleur).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('3 · aucune erreur console', async ({ page }) => {
    const problemes = collecterProblemes(page)
    await page.goto('/fr')
    await deroulerPuisRemonter(page)
    expect(problemes, problemes.join('\n')).toEqual([])
  })

  test('4 · survol d’une carte Besoins agrandit l’image en 400 ms', async ({ page }) => {
    await page.goto('/fr')
    const carte = page.locator('a', { hasText: 'Déployer une équipe' }).first()
    const image = carte.locator('img')

    // Le zoom porte sur l'image, pas sur le fond de la carte : c'est
    // `group-hover:scale-[1.03]` qui agit, d'où la lecture du transform.
    const avant = await image.evaluate((el) => getComputedStyle(el).transform)
    await carte.hover()
    await page.waitForTimeout(600)
    const apres = await image.evaluate((el) => getComputedStyle(el).transform)

    expect(apres).not.toBe(avant)
    await expect(image).toHaveCSS('transition-duration', '0.4s')
  })

  test('5 · survol d’une ligne Capacités décale le texte et remplit la flèche', async ({ page }) => {
    await page.goto('/fr')
    const ligne = page.locator('li a', { hasText: 'Opérations terrain' }).first()

    // lastElementChild et non querySelector('span:last-child') : ce dernier
    // parcourt TOUS les descendants et renvoie la description, pas la flèche.
    const fondFleche = () =>
      ligne.evaluate((el) => getComputedStyle(el.lastElementChild as Element).backgroundColor)

    const flecheAvant = await fondFleche()
    await ligne.hover()
    await page.waitForTimeout(450)

    await expect(ligne).toHaveCSS('padding-left', '16px')
    expect(await fondFleche()).not.toBe(flecheAvant)
  })

  test('6 · la bascule FR → EN change contenu, titre ET lang', async ({ page }) => {
    await page.goto('/fr')
    const h1Fr = await page.locator('h1').first().innerText()

    // Sous lg, la bascule de langue vit dans le panneau hamburger : il faut
    // l'ouvrir d'abord. Le test couvre ainsi le vrai parcours mobile.
    const hamburger = page.getByRole('button', { name: /menu/i })
    if (await hamburger.isVisible()) {
      // toPass() réessaie le clic ET l'assertion. Indispensable : sous charge
      // parallèle, le premier clic peut partir avant la fin de l'hydratation
      // React — le bouton est déjà peint, mais aucun gestionnaire n'y répond
      // encore, et le clic est perdu sans erreur.
      await expect(async () => {
        await hamburger.click()
        await expect(page.locator('#menu-mobile')).toBeVisible({ timeout: 1000 })
      }).toPass({ timeout: 15_000 })
    }

    // `:visible` est indispensable : la nav desktop et le panneau mobile
    // contiennent chacun un lien de bascule. Sans filtre, `.first()` attrape
    // celui du desktop, masqué par `hidden lg:flex` en mobile.
    await page.locator('a[hreflang="en"]:visible').first().click()
    await page.waitForURL('**/en')

    await expect(page.locator('h1').first()).not.toHaveText(h1Fr)
    await expect(page).toHaveTitle(/From idea/)
    // Régression surveillée : `lang` restait figé quand <html> vivait dans un
    // layout au-dessus du segment [locale].
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('7 · reveal — tout se révèle, sauf le h1 qui doit rester hors reveal', async ({ page }) => {
    await page.goto('/fr')

    // Garde-fou anti-régression du LCP : le titre ne doit jamais démarrer à
    // opacity 0, sinon il n'apparaît qu'après hydratation.
    await expect(page.locator('.reveal h1')).toHaveCount(0)

    await deroulerPuisRemonter(page)

    const { total, reveles } = await page.evaluate(() => {
      // On ne compte que les .reveal RÉELLEMENT AFFICHÉS à ce breakpoint.
      // La carte de stats du hero est en `hidden md:block` : masquée en
      // display:none, elle n'intersecte jamais le viewport, donc ne reçoit
      // jamais .in. Ce n'est pas une régression, c'est le comportement voulu.
      const visibles = [...document.querySelectorAll<HTMLElement>('.reveal')].filter(
        (el) => el.offsetParent !== null,
      )
      return {
        total: visibles.length,
        reveles: visibles.filter((el) => el.classList.contains('in')).length,
      }
    })

    expect(total).toBeGreaterThan(0)
    expect(reveles).toBe(total)
  })
})
