import { chromium } from '@playwright/test'

const nav = await chromium.launch()

for (const vp of [
  { nom: '1280', width: 1280, height: 900 },
  { nom: '375', width: 375, height: 667 },
]) {
  const ctx = await nav.newContext({ viewport: vp, locale: 'fr-CA' })
  const p = await ctx.newPage()
  await p.goto('http://localhost:3000/fr/realisations', { waitUntil: 'networkidle' })
  await p.waitForTimeout(900)

  console.log(`\n=== ${vp.nom}px ===`)

  const mesurer = async (etiquette) => {
    await p.waitForTimeout(500)
    const h = await p.evaluate(() =>
      [...document.querySelectorAll('article')].map((a) => ({
        carte: Math.round(a.getBoundingClientRect().height),
        img: Math.round((a.firstElementChild?.getBoundingClientRect().height ?? 0)),
      })),
    )
    const ko = h.filter((x) => x.carte < 120)
    console.log(
      `  ${etiquette.padEnd(16)} ${h.length} carte(s) : ${h.map((x) => x.carte + 'px').join(', ')}` +
        (ko.length ? '   ECRASEE' : ''),
    )
  }

  await mesurer('Tout voir')
  for (const f of ['Opérations', 'Installations', 'Le LAB']) {
    await p.getByRole('button', { name: f, exact: true }).click()
    await mesurer(f)
  }

  await ctx.close()
}
await nav.close()
