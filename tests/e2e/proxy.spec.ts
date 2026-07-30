import { expect, test } from '@playwright/test'

/**
 * Proxy — redirection de l'anglais retiré.
 *
 * Le site était bilingue FR/EN ; l'anglais a été retiré (décision de
 * Christian, « on garde en français pour facilité »). D'éventuels liens
 * externes ou résultats de recherche déjà indexés vers /en/... doivent
 * continuer de mener quelque part plutôt que de finir en 404 — voir la
 * docstring de src/proxy.ts pour le détail du mécanisme.
 */

test.describe('Proxy — retrait de /en', () => {
  test('/en redirige vers /fr en 308 (permanent)', async ({ page }) => {
    const reponse = await page.goto('/en')
    // `request().redirectedFrom()` remonte la chaîne de redirections client ;
    // le statut de la PREMIÈRE requête (avant que Playwright ne suive la
    // redirection) est ce qui compte pour le SEO — un 308 transmet
    // l'autorité du lien, un 307 ou un 302 la retiendrait comme temporaire.
    const premiere = reponse?.request().redirectedFrom()
    expect(premiere).not.toBeNull()
    // Playwright ne rapporte pas facilement le code exact d'une redirection
    // suivie automatiquement ; on vérifie donc l'effet observable — l'URL
    // finale et l'absence de 404 — plutôt que le code en transit.
    await expect(page).toHaveURL(/\/fr$/)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('/en/realisations redirige vers /fr/realisations', async ({ page }) => {
    await page.goto('/en/realisations')
    await expect(page).toHaveURL(/\/fr\/realisations$/)
  })

  test('/en/boutique/xtool-p2 redirige vers /fr/boutique/xtool-p2', async ({ page }) => {
    await page.goto('/en/boutique/xtool-p2')
    await expect(page).toHaveURL(/\/fr\/boutique\/xtool-p2$/)
  })

  test('un chemin inconnu sans /en n’est pas affecté par la règle', async ({ page }) => {
    // Garde-fou : la redirection ne doit matcher QUE le préfixe /en, pas
    // n'importe quel chemin qui contient ces deux lettres quelque part.
    const reponse = await page.goto('/fr/nos-capacites/le-lab')
    expect(reponse?.status()).toBe(200)
    await expect(page).toHaveURL(/\/fr\/nos-capacites\/le-lab$/)
  })
})
