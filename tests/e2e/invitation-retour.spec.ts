import fs from 'node:fs'

import { expect, test } from '@playwright/test'

const env: Record<string, string> = {}
for (const ligne of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m?.[1]) env[m[1]] = (m[2] ?? '').replace(/^['"]|['"]$/g, '')
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL!
const CLE_SERVICE = env.SUPABASE_SERVICE_ROLE_KEY!
const MOT_DE_PASSE = 'Zz!' + Math.random().toString(36).slice(2) + 'Aa9'
const enTeteService = {
  apikey: CLE_SERVICE,
  Authorization: `Bearer ${CLE_SERVICE}`,
  'Content-Type': 'application/json',
  'User-Agent': 'node',
}

async function creerCompteAdmin(request: import('@playwright/test').APIRequestContext, prefixe: string) {
  const email = `zzaudit_${prefixe}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@ko-lab.test`
  const rep = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: enTeteService,
    data: { email, password: MOT_DE_PASSE, email_confirm: true },
  })
  const compteId = (await rep.json()).id
  await request.patch(`${SUPABASE_URL}/rest/v1/profils?id=eq.${compteId}`, {
    headers: enTeteService,
    data: { role: 'admin' },
  })
  return { email, compteId }
}

async function connecter(page: import('@playwright/test').Page, email: string) {
  await page.goto('/fr/connexion')
  await page.getByLabel(/Courriel/i).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /^Se connecter$/ }).click()
  await page.waitForURL('**/admin', { timeout: 10_000 })
}

async function supprimerParEmail(request: import('@playwright/test').APIRequestContext, email: string) {
  const r = await request.get(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers: enTeteService })
  const users: { id: string; email?: string }[] = (await r.json()).users ?? []
  const cible = users.find((u) => u.email === email)
  if (cible) await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${cible.id}`, { headers: enTeteService }).catch(() => {})
}

test.describe('retour après une invitation', () => {
  test('une invitation affiche le lien copiable, et distingue clairement un échec Resend', async ({
    page,
    context,
    request,
  }) => {
    const { email: emailAdmin, compteId: adminId } = await creerCompteAdmin(request, 'inv_admin')
    const emailInvite = `zzaudit_invite_ok_${Date.now()}@ko-lab.test`

    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await connecter(page, emailAdmin)
      await page.goto('/fr/admin/utilisateurs')

      await page.getByRole('button', { name: 'Inviter un utilisateur' }).click()
      const modal = page.locator('dialog[open]')
      await expect(modal).toBeVisible()

      await modal.locator('#invitation-courriel').fill(emailInvite)
      await modal.getByRole('button', { name: 'Envoyer l’invitation' }).or(modal.getByRole('button', { name: /Envoyer/i })).click()

      // RESEND_API_KEY n'est pas configurée dans cet environnement local —
      // exactement le scénario "point 2, cas 2" du prompt (compte créé,
      // envoi échoué, raison donnée) : le message le dit clairement, et le
      // lien reste affiché malgré l'échec de l'envoi.
      await expect(modal.getByText('Compte créé, courriel non envoyé')).toBeVisible({ timeout: 15_000 })
      await expect(modal.getByText(/RESEND_API_KEY absente/i)).toBeVisible()

      const champLien = modal.locator('#lien-activation')
      await expect(champLien).toBeVisible()
      const valeurLien = await champLien.inputValue()
      expect(valeurLien).toContain('/api/auth/confirmer')
      expect(valeurLien).toContain('token_hash=')

      // Bouton copier — fonctionne sans lever d'erreur, libellé change.
      const boutonCopier = modal.getByRole('button', { name: 'Copier le lien' })
      await boutonCopier.click()
      await expect(modal.getByRole('button', { name: 'Lien copié' })).toBeVisible()
    } finally {
      await supprimerParEmail(request, emailInvite)
      await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${adminId}`, { headers: enTeteService }).catch(() => {})
    }
  })

  test('renvoyer une invitation sur un compte en attente fonctionne', async ({ page, context, request }) => {
    const { email: emailAdmin, compteId: adminId } = await creerCompteAdmin(request, 'inv_renvoi_admin')

    // Compte invité créé directement (invited_at posé via generateLink), pas
    // via l'UI — plus rapide, et teste précisément le chemin "compte déjà
    // existant, jamais activé".
    const emailInvite = `zzaudit_renvoi_${Date.now()}@ko-lab.test`
    const rCree = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: enTeteService,
      data: { email: emailInvite, email_confirm: false },
    })
    const invited = await rCree.json()
    // Pose invited_at : seul generateLink(type:'invite') le fait, comme en
    // production — un simple createUser ne suffit pas à le distinguer d'une
    // inscription publique (voir page.tsx, note "ORIGINE ET ACTIVATION").
    await request.post(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      headers: enTeteService,
      data: { type: 'invite', email: emailInvite },
    })

    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await connecter(page, emailAdmin)
      await page.goto('/fr/admin/utilisateurs')

      const ligne = page.locator('li', { hasText: emailInvite })
      await expect(ligne).toBeVisible()
      await expect(ligne.getByText('En attente d’activation').or(ligne.getByText(/En attente/))).toBeVisible()

      const boutonRenvoyer = ligne.getByRole('button', { name: /Renvoyer l.invitation/i })
      await expect(boutonRenvoyer).toBeVisible()
      await boutonRenvoyer.click()

      await expect(
        ligne.getByText('Invitation renvoyée').or(ligne.getByText(/Nouveau lien généré/i)),
      ).toBeVisible({ timeout: 15_000 })
      const champLien = ligne.locator('#lien-activation')
      await expect(champLien).toBeVisible()
      const valeurLien = await champLien.inputValue()
      expect(valeurLien).toContain('/api/auth/confirmer')
    } finally {
      await supprimerParEmail(request, emailInvite)
      await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${adminId}`, { headers: enTeteService }).catch(() => {})
    }
  })
})
