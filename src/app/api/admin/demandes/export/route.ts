import { NextResponse } from 'next/server'

import { exigerRole } from '@/lib/auth/garde'

/**
 * Export CSV des demandes — point 5 du diagnostic du 2 octobre 2026.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI UNE ROUTE ET PAS UNE SERVER ACTION
 *
 * Une Server Action rend une valeur à du JavaScript ; elle ne déclenche pas un
 * téléchargement. Il faudrait fabriquer un Blob côté client, donc transporter
 * tout le fichier dans la charge React avant de le réécrire. Une route rend
 * directement les bons en-têtes, et le navigateur fait le reste.
 *
 * ---------------------------------------------------------------------------
 * CE QUI EST VÉRIFIÉ AVANT DE RENDRE QUOI QUE CE SOIT
 *
 * `exigerRole` d'abord, et rien n'est lu avant. Ce fichier contient des
 * coordonnées de prospects et les notes internes de l'équipe : c'est l'export
 * le plus sensible du site. Un 401 doit tomber avant la requête, pas après.
 * ---------------------------------------------------------------------------
 */

/** Colonnes, dans l'ordre du fichier. */
const COLONNES = [
  'Date',
  'Type',
  'Statut',
  'Nom',
  'Courriel',
  'Téléphone',
  'Organisation',
  'Langue',
  'Message',
  'Note interne',
  'Statut changé par',
  'Statut changé le',
  'Notification équipe',
] as const

/**
 * Échappe une cellule CSV.
 *
 * ⚠️ LE PRÉFIXE `'` N'EST PAS DÉCORATIF — c'est une protection contre
 * l'injection de formule. Une cellule qui commence par `=`, `+`, `-`, `@`, une
 * tabulation ou un retour chariot est interprétée comme une FORMULE par Excel
 * et par LibreOffice. Or le champ « Message » est rempli par n'importe quel
 * visiteur du site : `=HYPERLINK("http://…","Cliquez")` dans un formulaire
 * public devient un lien piégé dans le fichier qu'ouvre l'équipe.
 *
 * L'apostrophe force le mode texte. Elle est invisible dans la cellule une
 * fois le fichier ouvert.
 */
function cellule(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return ''
  let t = String(valeur)
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`
  // Guillemets doublés, et la cellule entière entre guillemets : le message
  // contient des retours à la ligne et des points-virgules.
  return `"${t.replace(/"/g, '""')}"`
}

export async function GET() {
  const acces = await exigerRole()
  if (!acces) {
    return NextResponse.json({ erreur: 'refuse' }, { status: 401 })
  }
  const { supabase } = acces

  const { data, error } = await supabase
    .from('demandes_contact')
    .select(
      'created_at, type, statut, nom, email, telephone, organisation, locale, message, note_interne, traite_par, traite_le, notification_envoyee, notification_erreur',
    )
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('[export demandes] lecture refusée', error?.message)
    return NextResponse.json({ erreur: 'serveur' }, { status: 500 })
  }

  // Noms de l'équipe plutôt que des identifiants : un tableur ouvert par un
  // humain ne doit pas contenir d'UUID. Une seule requête, sur les comptes
  // réellement cités.
  const ids = [...new Set(data.map((d) => d.traite_par).filter(Boolean))] as string[]
  const noms = new Map<string, string>()
  if (ids.length > 0) {
    const { data: profils } = await supabase.from('profils').select('id, nom, email').in('id', ids)
    for (const p of profils ?? []) noms.set(p.id, p.nom?.trim() || p.email?.trim() || p.id)
  }

  const lignes = data.map((d) =>
    [
      d.created_at,
      d.type,
      d.statut,
      d.nom,
      d.email,
      d.telephone,
      d.organisation,
      d.locale,
      d.message,
      d.note_interne,
      d.traite_par ? (noms.get(d.traite_par) ?? '') : '',
      d.traite_le,
      d.notification_envoyee ? 'envoyée' : d.notification_erreur || 'non tentée',
    ]
      .map(cellule)
      .join(';'),
  )

  /**
   * POINT-VIRGULE, et NON la virgule.
   *
   * Excel choisit son séparateur selon les paramètres régionaux du poste. En
   * français (Canada comme France), c'est le point-virgule : un fichier
   * séparé par des virgules s'ouvre alors entièrement dans la colonne A.
   * L'équipe de KO-LAB travaille en français.
   *
   * Et le BOM UTF-8 en tête : sans lui, Excel lit le fichier en ANSI et
   * affiche « Réalisé » au lieu de « Réalisé ». Les accents sont partout dans
   * ces données.
   */
  const csv = '﻿' + [COLONNES.map(cellule).join(';'), ...lignes].join('\r\n')

  const horodatage = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="demandes-ko-lab-${horodatage}.csv"`,
      // Jamais mis en cache : le fichier contient des données personnelles et
      // change à chaque demande reçue.
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
