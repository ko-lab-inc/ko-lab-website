import { NextResponse, type NextRequest } from 'next/server'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rateLimit'
import { schemaContact } from '@/lib/validation'

/**
 * Réception du formulaire de contact — skills 05, 09 et 15.
 *
 * Ordre des contrôles, du moins coûteux au plus coûteux : type de contenu,
 * limite de débit, honeypot, validation, puis écriture. Un robot ne doit
 * jamais atteindre la base de données ni le service de courriel.
 */

/** Cette route écrit en base : elle ne doit jamais être mise en cache. */
export const dynamic = 'force-dynamic'

/**
 * Adresse du client.
 *
 * `x-forwarded-for` est une LISTE (`client, proxy1, proxy2`) : n'en prendre
 * que la première entrée. Derrière Cloudflare, `cf-connecting-ip` est plus
 * fiable — c'est le seul en-tête que le proxy réécrit systématiquement.
 */
function adresseClient(req: NextRequest): string {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()

  const xff = req.headers.get('x-forwarded-for')
  const premier = xff?.split(',')[0]?.trim()

  return premier && premier.length > 0 ? premier : 'inconnue'
}

export async function POST(req: NextRequest) {
  // Un formulaire légitime envoie du JSON. Refuser autre chose élimine
  // d'emblée les soumissions cross-origin en form-encoded.
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ erreur: 'Type de contenu invalide' }, { status: 415 })
  }

  // Clé préfixée par la route : sans ça, toutes les routes partageraient
  // le même compteur et le budget de la boutique serait vidé par le contact.
  if (rateLimit(`contact:${adresseClient(req)}`, { max: 5, windowMs: 60_000 })) {
    return NextResponse.json({ erreur: 'trop_de_requetes' }, { status: 429 })
  }

  let brut: unknown
  try {
    brut = await req.json()
  } catch {
    return NextResponse.json({ erreur: 'JSON invalide' }, { status: 400 })
  }

  const analyse = schemaContact.safeParse(brut)
  if (!analyse.success) {
    return NextResponse.json({ erreur: 'Données invalides' }, { status: 400 })
  }

  const { _hp, ...donnees } = analyse.data

  // Honeypot rempli : robot. On répond 200 SANS RIEN FAIRE — un 4xx apprendrait
  // au robot que le piège existe et l'inciterait à s'adapter (skill 15).
  if (_hp) {
    return NextResponse.json({ succes: true })
  }

  try {
    const { error } = await getSupabaseAdmin().from('demandes_contact').insert({
      type: donnees.type,
      nom: donnees.nom,
      email: donnees.email,
      telephone: donnees.telephone ?? null,
      organisation: donnees.organisation ?? null,
      message: donnees.message,
    })

    if (error) throw error
  } catch (err) {
    // Message générique côté client : divulguer err.message exposerait la
    // structure de la base et les noms de tables (skill 15).
    console.error('[api/contact] échec insertion', err)
    return NextResponse.json({ erreur: 'serveur' }, { status: 500 })
  }

  // Notification par courriel — DÉGRADATION VOLONTAIRE.
  //
  // La demande est déjà enregistrée à ce stade. Si Resend n'est pas configuré,
  // ou s'il échoue, l'utilisateur doit quand même voir sa confirmation : son
  // message n'est pas perdu, il est en base. Faire échouer la requête ici
  // reviendrait à lui demander de renvoyer une demande déjà reçue.
  const cleResend = process.env.RESEND_API_KEY

  if (!cleResend) {
    console.warn('[api/contact] RESEND_API_KEY absente — notification non envoyée')
  } else {
    try {
      const { Resend } = await import('resend')

      await new Resend(cleResend).emails.send({
        from: 'KO-LAB <site@ko-lab.ca>',
        to: 'info@ko-lab.ca',
        replyTo: donnees.email,
        subject: `Nouvelle demande — ${donnees.type}`,
        text: [
          `Type         : ${donnees.type}`,
          `Nom          : ${donnees.nom}`,
          `Courriel     : ${donnees.email}`,
          `Téléphone    : ${donnees.telephone ?? '—'}`,
          `Organisation : ${donnees.organisation ?? '—'}`,
          '',
          donnees.message,
        ].join('\n'),
      })
    } catch (err) {
      console.error('[api/contact] échec envoi Resend', err)
    }
  }

  return NextResponse.json({ succes: true })
}
