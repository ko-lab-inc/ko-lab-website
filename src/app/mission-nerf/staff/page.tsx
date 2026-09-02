import { cookies } from 'next/headers'

import { cn } from '@/lib/utils/cn'

import {
  COOKIE_SESSION_STAFF,
  dateEvenementQuebec,
  heureQuebec,
  lireCompteursDuJour,
  sessionStaffValide,
  type CompteursMissionNerf,
} from '@/lib/mission-nerf'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { basculerZone, connexionStaff, deconnexionStaff, definirProchainDepart } from './actions'
import { BoutonRemiseAZero } from './BoutonRemiseAZero'
import { ChampMotDePasse } from './ChampMotDePasse'
import { ChronoSession } from './ChronoSession'

/**
 * Panneau staff Mission NERF — écran protégé, pensé pour un téléphone tenu
 * d'une main pendant l'événement (brief, Prompt 3) : pilote ce que le
 * dashboard public affiche (/mission-nerf/dashboard), ne le remplace pas.
 *
 * `cookies()` étant lu ici, la route est automatiquement dynamique (Next ne
 * la pré-rendra jamais statiquement) — pas besoin d'`export const dynamic`
 * en plus, mais posé quand même explicitement pour que ce soit visible sans
 * connaître cette règle implicite.
 *
 * Bloqué dans robots.txt : la règle `Disallow: /mission-nerf` (posée au
 * Prompt 1) couvre déjà tout chemin qui commence par ce préfixe, y compris
 * celui-ci — vérifié contre le fichier réellement généré, rien à ajouter.
 *
 * Fond plein sur le conteneur racine (`bg-[#0a0f1a]`), volontairement : le
 * root layout de /mission-nerf force `background: transparent` sur html/body
 * pour la zone caméra du dashboard (voir dashboard/page.tsx) — cette page
 * n'a aucun trou à ménager, donc son propre conteneur remplit tout le fond
 * plutôt que d'hériter de cette transparence.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ CORRECTIONS D'ERGONOMIE — 1er septembre 2026, test sur téléphone
 * Android réel
 * ---------------------------------------------------------------------------
 * 1. Champ d'heure méconnaissable — un <input type="time"> vide, sans
 *    `color-scheme`, rend son texte natif (dont le repère « --:-- ») dans
 *    la couleur par défaut du système, souvent sombre sur sombre. Corrigé
 *    par `style={{ colorScheme: 'dark' }}` (fait honorer par le navigateur
 *    les couleurs CLAIRES de son propre widget natif — pas une couleur CSS
 *    qu'on choisit, une INTENTION qu'on déclare), une icône d'horloge fixe
 *    à l'intérieur du champ, une étiquette « ou heure précise » visible, et
 *    une valeur par défaut (`defaultValue`) qui affiche l'heure déjà réglée
 *    au lieu de repartir vide à chaque rendu. Rendu plus petit que les
 *    raccourcis +10/+15/+20/+30 (l'usage principal).
 * 2. « Se déconnecter » déplacé du coin haut-droit (encadré, très visible)
 *    vers le bas de page, en texte simple sans cadre — un tap accidentel
 *    avec des gants ne doit plus être facile.
 * 3. Textes secondaires remontés de `text-slate-400/500` à `text-slate-300`,
 *    et `text-white/60` à `text-white/90` sur le bouton de zone — lisible en
 *    extérieur le soir, pas seulement en intérieur éclairé.
 * 4. Compteurs participants/décharges agrandis (`text-3xl` -> `text-5xl`).
 * 5. Bouton œil sur le mot de passe — voir ChampMotDePasse.tsx : état local
 *    uniquement, jamais mémorisé, repart masqué à chaque chargement.
 */
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ erreur?: string }> }

export default async function PageStaff({ searchParams }: Props) {
  const { erreur } = await searchParams
  const magasin = await cookies()
  const connecte = sessionStaffValide(magasin.get(COOKIE_SESSION_STAFF)?.value)

  if (!connecte) {
    return <PageConnexion erreur={erreur} />
  }

  const supabase = getSupabaseAdmin()
  const aujourdhui = dateEvenementQuebec()

  const [compteurs, dernieresRes] = await Promise.all([
    lireCompteursDuJour(supabase),
    supabase
      .from('inscriptions_nerf')
      .select('prenom, nom, age, recu_le, statut')
      .eq('date_evenement', aujourdhui)
      .order('recu_le', { ascending: false })
      .limit(4),
  ])

  if (dernieresRes.error) throw dernieresRes.error

  return <PagePanneau compteurs={compteurs} dernieres={dernieresRes.data} />
}

function PageConnexion({ erreur }: { erreur?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1a] p-6 font-mono text-white">
      <form
        action={connexionStaff}
        className="w-full max-w-xs rounded-xl border border-white/10 bg-white/[0.03] p-6"
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Mission NERF</p>
        <h1 className="mb-5 mt-1 text-lg font-semibold text-cyan-300">Panneau staff</h1>

        <label className="block text-xs uppercase tracking-wide text-slate-400" htmlFor="motDePasse">
          Mot de passe de l&apos;équipe
        </label>
        {/* Bouton œil — voir ChampMotDePasse.tsx : seul composant client de
            cette page, l'unique bit d'état qui a besoin de JS ici. */}
        <ChampMotDePasse />

        {erreur === '1' && <p className="mt-3 text-sm text-rose-400">Mot de passe incorrect.</p>}
        {erreur === 'trop_de_tentatives' && (
          <p className="mt-3 text-sm text-rose-400">Trop de tentatives — réessayez dans quelques minutes.</p>
        )}

        <button type="submit" className="mt-5 w-full rounded-lg bg-cyan-400 py-3 text-base font-semibold text-black">
          Se connecter
        </button>
      </form>
    </div>
  )
}

type Derniere = { prenom: string; nom: string; age: number; recu_le: string; statut: string }

function PagePanneau({
  compteurs,
  dernieres,
}: {
  compteurs: CompteursMissionNerf
  dernieres: readonly Derniere[]
}) {
  return (
    <div className="min-h-screen bg-[#0a0f1a] p-5 font-mono text-white">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Mission NERF</p>
        <h1 className="text-lg font-semibold text-cyan-300">Panneau staff</h1>
      </header>

      <div className="flex flex-col gap-5">
        {/* 0. Chrono de session — EN HAUT, avant même le bouton de zone
            (brief du soir du 1er septembre, 2e partie) : c'est l'info dont
            le staff a besoin en premier pour décider quand arrêter un
            groupe. Composant client (ChronoSession.tsx) — seul endroit de
            ce panneau qui défile à la seconde ; s'absente tout seul (rend
            null) tant qu'aucun départ n'est passé ou dès qu'un départ futur
            est réglé. */}
        <ChronoSession prochainDepart={compteurs.prochainDepart} />

        {/* 1. Zone — l'action la plus fréquente : un seul bouton, pleine
            largeur, sans confirmation (immédiatement réversible). */}
        <form action={basculerZone}>
          <button
            type="submit"
            className={cn(
              'flex w-full items-center justify-between rounded-xl border px-5 py-6 text-left',
              compteurs.zoneOuverte
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300',
            )}
          >
            <span className="text-xl font-semibold">{compteurs.zoneOuverte ? 'Zone ouverte' : 'Zone fermée'}</span>
            <span className="text-sm font-normal text-white/90">
              Toucher pour {compteurs.zoneOuverte ? 'fermer' : 'ouvrir'}
            </span>
          </button>
        </form>

        {/* Bandeau de signalement — PAS de blocage (brief du 1er septembre,
            « signaler, jamais interdire ») : la zone peut s'ouvrir avant que
            le premier groupe soit formé, ce bandeau le rappelle sans rien
            empêcher. Disparaît dès qu'une heure est réglée. */}
        {compteurs.zoneOuverte && !compteurs.prochainDepart && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
            Zone ouverte, aucun départ annoncé.
          </p>
        )}

        {/* 2. Prochain départ — raccourcis d'abord (un tap), gros boutons :
            c'est l'usage principal. Heure précise en repli, volontairement
            plus petite — voir la docstring de ce fichier pour le détail du
            correctif du champ natif. */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-300">
            Prochain départ {compteurs.prochainDepart ? `— actuellement ${compteurs.prochainDepart}` : '— non réglé'}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[10, 15, 20, 30].map((minutes) => (
              <form key={minutes} action={definirProchainDepart}>
                <input type="hidden" name="minutes" value={minutes} />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-cyan-400/30 bg-cyan-400/10 py-3 text-sm font-semibold text-cyan-300"
                >
                  +{minutes}
                </button>
              </form>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500" aria-hidden="true">
            <span className="h-px flex-1 bg-white/10" />
            ou heure précise
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form action={definirProchainDepart} className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5.2l3.5 2" />
              </svg>
              {/* `colorScheme: 'dark'` : SANS ça, un <input type="time"> vide
                  n'affiche parfois même pas son repère « --:-- » sur Android
                  — le widget natif rend son propre texte dans une couleur
                  système qui peut être sombre sur notre fond sombre.
                  `defaultValue` : affiche l'heure déjà réglée au lieu de
                  paraître vide à chaque rendu de page. */}
              <input
                type="time"
                name="heure"
                required
                defaultValue={compteurs.prochainDepart ?? undefined}
                style={{ colorScheme: 'dark' }}
                className="w-full rounded-lg border border-white/10 bg-transparent py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-400/60"
              />
            </div>
            <button type="submit" className="shrink-0 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-slate-300">
              Définir
            </button>
          </form>
        </section>

        {/* 3. Compteurs — mêmes chiffres que le dashboard, voir
            lireCompteursDuJour (lib/mission-nerf.ts). Agrandis le 1er
            septembre (text-3xl -> text-5xl) : doivent se lire d'un coup
            d'œil. */}
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-cyan-400/20 bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-wide text-slate-300">Participants</p>
            <p className="mt-1 text-5xl font-bold text-cyan-300">{compteurs.participants}</p>
          </div>
          <div className="rounded-xl border border-pink-400/20 bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-wide text-slate-300">Décharges</p>
            <p className="mt-1 text-5xl font-bold text-pink-300">{compteurs.decharges}</p>
          </div>
        </section>

        {/* 4. Dernières inscriptions — nom et âge visibles ICI seulement :
            écran interne, contrairement au dashboard public. Toujours SANS
            courriel, téléphone, contact d'urgence ni condition médicale
            (brief) : ces colonnes n'existent même pas dans
            `inscriptions_nerf`, voir la migration 0046. */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-300">Dernières inscriptions</p>
          <ul className="flex flex-col gap-2">
            {dernieres.length === 0 ? (
              <li className="text-sm text-slate-300">Aucune inscription aujourd&apos;hui.</li>
            ) : (
              dernieres.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border-t border-white/5 pt-2 text-sm first:border-t-0 first:pt-0"
                >
                  <span className="truncate pr-3">
                    {d.prenom} {d.nom} · {d.age} ans
                  </span>
                  <span className="shrink-0 text-slate-300">{heureQuebec(d.recu_le)}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* 5. Remise à zéro — voir BoutonRemiseAZero.tsx pour la confirmation
            en deux temps, et actions.ts pour ce qui est réellement écrit. */}
        <section className="rounded-xl border border-amber-400/20 bg-amber-400/[0.03] p-5">
          <BoutonRemiseAZero />
        </section>

        {/* Déconnexion — déplacée ici (1er septembre) : discrète, texte
            simple sans cadre, en fin de page. C'était le deuxième élément le
            plus visible de l'écran, encadré en haut à droite — risque de tap
            accidentel avec des gants (brief). */}
        <form action={deconnexionStaff} className="pb-2 pt-1 text-center">
          <button type="submit" className="text-xs text-slate-500">
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  )
}
