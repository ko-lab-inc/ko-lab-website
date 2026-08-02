import { hasLocale } from 'next-intl'
import { getFormatter, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AnneauSegments, BarresPeriode, ListeClassee } from '@/components/admin/Visualisations'
import {
  EnteteAdmin,
  EnteteTableau,
  GrilleStats,
  PanneauAdmin,
  TuileStat,
} from '@/components/layout/CadreAdmin'
import {
  IconeAccompagnement,
  IconeAlerte,
  IconeBadgeStock,
  IconeHorloge,
  IconeMonnaie,
  IconePanier,
  IconeProfil,
  IconeTendance,
} from '@/components/ui/Icones'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { stockEnAttention } from '@/lib/stock'
import { TYPES_DEMANDE } from '@/types'

type Props = { params: Promise<{ locale: string }> }

/** Fenêtre de la courbe, en jours. */
const JOURS = 30

/**
 * Tableau de bord de l'espace équipe.
 *
 * ---------------------------------------------------------------------------
 * CE QU'IL N'AFFICHE PAS, ET POURQUOI
 *
 * La maquette de référence (tableau de bord e-commerce) montre Total Revenue,
 * Orders, Conversion Rate et Inventory Alerts.
 *
 * Depuis la migration 0021, « Chiffre d'affaires » et « Commandes » sont
 * RÉELS — calculés sur `commandes`/`lignes_commande`, PAS sur un placeholder.
 * Les deux EXCLUENT les commandes `annulee` : une commande annulée n'est ni
 * un revenu ni une commande active, et la compter gonflerait artificiellement
 * les deux tuiles. Le détail (y compris les commandes annulées elles-mêmes)
 * reste consultable sur /admin/commandes — le tableau de bord n'a pas à
 * lister chaque commande, seulement à donner le nombre qui compte au premier
 * coup d'œil. « Chiffre d'affaires » reste construit sur des prix INDICATIFS
 * (voir `precision` sous la tuile) : ce n'est pas un montant facturé, KO-LAB
 * ne prend toujours aucun paiement en ligne.
 *
 * « Taux de conversion » reste non calculable : rien ne mesure les visites.
 * Un tiret, pas un 0 % — voir plus bas pourquoi les deux ne disent pas la
 * même chose.
 *
 * Inventory Alerts, elle, a une vraie contrepartie depuis la migration 0013 :
 * le panneau « Points d'attention » plus bas signale les produits en rupture
 * ou en stock faible, calculés sur `produits_boutique` (voir lib/stock.ts).
 *
 * La DISPOSITION de la référence est reprise à l'identique — quatre tuiles,
 * courbe, tableau récent, anneau, classement, alertes — mais remplie avec ce
 * que KO-LAB produit vraiment : des demandes, des commandes, des comptes, un
 * catalogue.
 *
 * ---------------------------------------------------------------------------
 * SÉCURITÉ (skill sécurité production, § 2 et 3)
 *
 * Toutes les lectures passent par le client de SESSION, donc par le RLS —
 * jamais par la service role key. Un contournement afficherait ici des
 * données qu'un editor n'a peut-être pas le droit de voir, et masquerait
 * toute erreur de politique jusqu'au jour où elle compte.
 *
 * Aucune donnée personnelle ne descend dans un composant client : cette page
 * est un Server Component, les graphiques aussi.
 * ---------------------------------------------------------------------------
 */
export default async function TableauDeBordPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const t = await getTranslations('Admin')
  const format = await getFormatter({ locale })
  const supabase = await createClient()

  const debutFenetre = new Date(Date.now() - (JOURS - 1) * 86_400_000)
  debutFenetre.setHours(0, 0, 0, 0)

  const [
    { count: total },
    { count: nouvelles },
    { count: comptes },
    fenetre,
    recentes,
    catalogue,
    commandesTuiles,
    lignesCommandeTuiles,
  ] = await Promise.all([
    // `head: true` : on veut le compte, pas les lignes. Ramener la table
    // entière pour en mesurer la longueur deviendrait coûteux dès quelques
    // centaines de demandes.
    supabase.from('demandes_contact').select('*', { count: 'exact', head: true }),
    supabase
      .from('demandes_contact')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'nouveau'),
    supabase.from('profils').select('*', { count: 'exact', head: true }),
    // Une seule requête sert à la fois la courbe et l'anneau : deux
    // requêtes agrégées séparées liraient la même plage deux fois.
    supabase
      .from('demandes_contact')
      .select('type, created_at')
      .gte('created_at', debutFenetre.toISOString()),
    supabase
      .from('demandes_contact')
      .select('id, created_at, type, nom, email, statut')
      .order('created_at', { ascending: false })
      .limit(8),
    // Catalogue réel (migration 0013) — une douzaine de lignes, agrégées
    // ici même plutôt qu'en SQL : sert le compte, la répartition par
    // catégorie, l'alerte de stock ET l'alerte de prix manquants, sans
    // quatre requêtes séparées.
    supabase.from('produits_boutique').select('categorie, prix, quantite, statut_stock, publie'),
    // Tuiles « Commandes » / « Chiffre d'affaires » — migration 0021.
    supabase.from('commandes').select('id, statut'),
    supabase.from('lignes_commande').select('commande_id, quantite, prix_indicatif'),
  ])

  /**
   * Commandes actives et chiffre d'affaires — EXCLUENT `annulee` des deux
   * côtés (voir la note d'en-tête). `PGRST205` = migration pas encore jouée
   * dans cet environnement : traité comme « aucune commande », jamais comme
   * une erreur qui casserait le tableau de bord.
   */
  const commandesActives = (commandesTuiles.data ?? []).filter((c) => c.statut !== 'annulee')
  const idsCommandesActives = new Set(commandesActives.map((c) => c.id))
  const chiffreAffaires = (lignesCommandeTuiles.data ?? [])
    .filter((l) => idsCommandesActives.has(l.commande_id) && l.prix_indicatif != null)
    .reduce((somme, l) => somme + l.prix_indicatif! * l.quantite, 0)

  const lignes = fenetre.data ?? []

  // Un seau par jour, y compris les jours vides : sans eux la courbe
  // rapprocherait deux demandes espacées d'une semaine.
  const parJour = new Array<number>(JOURS).fill(0)
  for (const l of lignes) {
    const jour = Math.floor((Date.parse(l.created_at) - debutFenetre.getTime()) / 86_400_000)
    if (jour >= 0 && jour < JOURS) parJour[jour] = (parJour[jour] ?? 0) + 1
  }

  const segments = TYPES_DEMANDE.map((type) => ({
    libelle: t(`type_${type}`),
    valeur: lignes.filter((l) => l.type === type).length,
  })).sort((a, b) => b.valeur - a.valeur)

  const produitsCatalogue = catalogue.data ?? []
  const produitsPublies = produitsCatalogue.filter((p) => p.publie).length

  // Table explicite plutôt que `t(\`cat_${cle}\`)` : les clés de messages sont
  // typées, et une clé construite à partir d'un `string` échappe au contrôle.
  // Une catégorie ajoutée en base sans libellé ici lève à la compilation au
  // lieu de planter à l'affichage.
  const libellesCategorie: Record<string, string> = {
    impression: t('cat_impression'),
    laser: t('cat_laser'),
    conteneurs: t('cat_conteneurs'),
    equipements: t('cat_equipements'),
  }

  const parCategorie = Object.entries(
    produitsCatalogue.reduce<Record<string, number>>((acc, p) => {
      acc[p.categorie] = (acc[p.categorie] ?? 0) + 1
      return acc
    }, {}),
  )
    .map(([cle, valeur]) => ({ libelle: libellesCategorie[cle] ?? cle, valeur }))
    .sort((a, b) => b.valeur - a.valeur)

  /**
   * Points d'attention — à la place des « Inventory Alerts » de la référence.
   *
   * Calculés sur l'état RÉEL du projet, pas sur un stock qui n'existe pas.
   * Chacun correspond à quelque chose qu'on peut aller corriger aujourd'hui.
   */
  const produitsEnAttention = produitsCatalogue.filter((p) =>
    stockEnAttention(p.statut_stock, p.quantite),
  ).length

  const alertes = [
    produitsCatalogue.filter((p) => p.prix === null).length > 0 ? t('alerte_prix_absents') : null,
    // Trois prix restent provisoires : X1-Carbon, xTool P2, xTool F1 — jamais
    // confirmés sur une source officielle (voir 0007_catalogue_en_base.sql).
    t('alerte_prix_provisoires'),
    process.env.RESEND_API_KEY ? null : t('alerte_smtp'),
    (nouvelles ?? 0) > 0 ? t('alerte_demandes', { n: nouvelles ?? 0 }) : null,
    produitsEnAttention > 0 ? t('alerte_stock', { n: produitsEnAttention }) : null,
  ].filter((a): a is string => a !== null)

  return (
    <>
      <EnteteAdmin titre={t('titre')} intro={t('intro_tableau')} />

      {/*
        Les quatre tuiles de la référence, avec leurs libellés — chiffre
        d'affaires, commandes, clients, taux de conversion — et leurs VRAIES
        valeurs.

        Chiffre d'affaires et Commandes sont RÉELS depuis la migration 0021
        (voir la note d'en-tête) — plus des placeholders à zéro. Taux de
        conversion reste un tiret : rien ne mesure les visites, et zéro pour
        cent affirmerait une mesure qui n'existe pas.
      */}
      <GrilleStats>
        <TuileStat
          libelle={t('chiffre_affaires')}
          valeur={format.number(chiffreAffaires, { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}
          precision={t('chiffre_affaires_precision')}
          Icone={IconeMonnaie}
        />
        <TuileStat
          libelle={t('commandes')}
          valeur={commandesActives.length}
          precision={t('commandes_precision')}
          Icone={IconePanier}
        />
        <TuileStat libelle={t('clients')} valeur={comptes ?? 0} Icone={IconeProfil} />
        <TuileStat
          libelle={t('conversion')}
          // Un tiret et non « 0 % » : zéro pour cent serait un taux mesuré,
          // alors que rien ne mesure les visites. L'absence de mesure et une
          // mesure nulle ne disent pas la même chose.
          valeur="—"
          precision={t('sans_mesure')}
          Icone={IconeTendance}
        />
      </GrilleStats>

      {/* Deuxième rangée : ce que le site produit RÉELLEMENT aujourd'hui. */}
      <div className="mt-6">
        <GrilleStats>
          <TuileStat
            libelle={t('total_demandes')}
            valeur={total ?? 0}
            Icone={IconeAccompagnement}
          />
          <TuileStat
            libelle={t('nouvelles')}
            valeur={nouvelles ?? 0}
            Icone={IconeHorloge}
            accent
          />
          <TuileStat libelle={t('nav_utilisateurs')} valeur={comptes ?? 0} Icone={IconeProfil} />
          <TuileStat
            libelle={t('nav_catalogue')}
            valeur={produitsCatalogue.length}
            precision={t('stat_catalogue_precision', { n: produitsPublies })}
            Icone={IconeBadgeStock}
          />
        </GrilleStats>
      </div>

      {/* Deux tiers / un tiers, comme la référence : la courbe a besoin de
          largeur, l'anneau non. */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="ko-h3 mb-4 text-[20px] text-ko-ink">{t('evolution')}</h2>
          <BarresPeriode
            points={parJour}
            libelle={t('evolution_resume', { n: lignes.length, j: JOURS })}
            vide={t('evolution_vide', { j: JOURS })}
          />
        </div>

        <div>
          <h2 className="ko-h3 mb-4 text-[20px] text-ko-ink">{t('repartition')}</h2>
          <PanneauAdmin>
            <AnneauSegments
              segments={segments}
              total={lignes.length}
              libelleTotal={t('sur_periode', { j: JOURS })}
              vide={t('evolution_vide', { j: JOURS })}
            />
          </PanneauAdmin>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="ko-h3 text-[20px] text-ko-ink">{t('recentes')}</h2>
            {/* Relie le tableau de bord au nouvel écran de gestion — avant,
                cliquer une ligne « récente » ne menait nulle part. */}
            <Link
              href={`/${locale}/admin/demandes`}
              className="text-sm text-ko-blue transition-colors duration-200 hover:text-ko-ink"
            >
              {t('voir_toutes_demandes')} →
            </Link>
          </div>
          <PanneauAdmin sansPadding>
            {recentes.error ? (
              // Le message technique n'est PAS affiché : il révélerait noms de
              // tables et politiques. Il part dans les journaux du serveur.
              <p className="p-6 text-base text-ko-ink">{t('erreur_lecture')}</p>
            ) : !recentes.data || recentes.data.length === 0 ? (
              <p className="p-6 text-base leading-relaxed text-ko-muted">{t('aucune_demande')}</p>
            ) : (
              <>
                <EnteteTableau
                  colonnes={[t('colonne_courriel'), t('colonne_type'), t('colonne_cree')]}
                />
                <ul className="divide-y divide-ko-line">
                  {recentes.data.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-col gap-1.5 px-6 py-4 sm:flex-row sm:items-baseline sm:gap-6"
                    >
                      <span className="min-w-0 flex-1 truncate text-base text-ko-ink">
                        {d.nom} — {d.email}
                      </span>
                      <span className="label-mono shrink-0 text-ko-blue sm:w-24">{d.type}</span>
                      <span className="shrink-0 font-mono text-xs text-ko-muted sm:w-40 sm:text-right">
                        {format.dateTime(new Date(d.created_at), {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </PanneauAdmin>
        </div>

        <div className="space-y-10">
          <div>
            <h2 className="ko-h3 mb-4 text-[20px] text-ko-ink">{t('par_categorie')}</h2>
            <PanneauAdmin>
              <ListeClassee entrees={parCategorie} />
            </PanneauAdmin>
          </div>

          <div>
            <h2 className="ko-h3 mb-4 text-[20px] text-ko-ink">{t('attention')}</h2>
            <PanneauAdmin>
              {alertes.length === 0 ? (
                <p className="text-sm text-ko-muted">{t('attention_aucune')}</p>
              ) : (
                <ul className="space-y-4">
                  {alertes.map((a) => (
                    <li key={a} className="flex gap-3">
                      <IconeAlerte taille={16} className="mt-0.5 text-ko-blue" />
                      <span className="text-sm leading-relaxed text-ko-ink">{a}</span>
                    </li>
                  ))}
                </ul>
              )}
            </PanneauAdmin>
          </div>
        </div>
      </div>
    </>
  )
}
