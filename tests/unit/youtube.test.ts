import { describe, expect, it } from 'vitest'

import { identifiantYoutube, vignetteVideo } from '@/lib/utils/youtube'

/**
 * Extraction d'identifiant YouTube.
 *
 * Testé en unitaire parce que l'entrée vient d'un humain qui COLLE un lien :
 * barre d'adresse, bouton « Partager », Short, code d'intégration — quatre
 * formes différentes pour la même vidéo, plus les paramètres de suivi que
 * YouTube ajoute au partage. Se tromper ici produit un cadre vide sur la page
 * publique, sans erreur nulle part.
 */

const ID = 'dQw4w9WgXcQ' // 11 caractères, forme réelle d'un identifiant.

describe('identifiantYoutube', () => {
  it('reconnaît les quatre formes que YouTube produit', () => {
    expect(identifiantYoutube(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID)
    expect(identifiantYoutube(`https://youtu.be/${ID}`)).toBe(ID)
    expect(identifiantYoutube(`https://www.youtube.com/shorts/${ID}`)).toBe(ID)
    expect(identifiantYoutube(`https://www.youtube.com/embed/${ID}`)).toBe(ID)
  })

  it('ignore les paramètres ajoutés au partage', () => {
    // `t` (horodatage) et `si` (suivi) changent d'un partage à l'autre sans
    // désigner une autre vidéo.
    expect(identifiantYoutube(`https://youtu.be/${ID}?si=AbCdEf`)).toBe(ID)
    expect(identifiantYoutube(`https://www.youtube.com/watch?v=${ID}&t=42s`)).toBe(ID)
  })

  it('tolère www., m. et les espaces autour', () => {
    expect(identifiantYoutube(`  https://m.youtube.com/watch?v=${ID}  `)).toBe(ID)
    expect(identifiantYoutube(`https://youtube.com/watch?v=${ID}`)).toBe(ID)
  })

  it('refuse ce qui n’est pas une vidéo', () => {
    // Une playlist, une chaîne ou la page d'accueil n'ont pas d'identifiant de
    // vidéo — fabriquer une vignette à partir de ces chemins donnerait une 404.
    expect(identifiantYoutube('https://www.youtube.com/playlist?list=PL123')).toBeNull()
    expect(identifiantYoutube('https://www.youtube.com/@une-chaine')).toBeNull()
    expect(identifiantYoutube('https://www.youtube.com')).toBeNull()
    expect(identifiantYoutube('https://vimeo.com/123456789')).toBeNull()
    expect(identifiantYoutube('pas une url')).toBeNull()
    expect(identifiantYoutube('')).toBeNull()
  })

  it('refuse un identifiant de mauvaise longueur', () => {
    // Garde-fou : un chemin qui ressemble à une vidéo mais n'en est pas une.
    expect(identifiantYoutube('https://youtu.be/trop-court')).toBeNull()
    expect(identifiantYoutube(`https://youtu.be/${ID}XXXX`)).toBeNull()
  })
})

describe('vignetteVideo', () => {
  it('déduit la miniature d’une URL YouTube', () => {
    expect(vignetteVideo(`https://youtu.be/${ID}`)).toBe(
      `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
    )
  })

  it('laisse la priorité à une vignette imposée', () => {
    expect(vignetteVideo(`https://youtu.be/${ID}`, '/images/videos/maison.webp')).toBe(
      '/images/videos/maison.webp',
    )
  })

  it('renvoie null quand rien n’est déductible', () => {
    // Un lien Vimeo sans vignette imposée : la carte ne peut rien afficher,
    // l'appelant doit l'écarter plutôt que rendre un cadre vide.
    expect(vignetteVideo('https://vimeo.com/123456789')).toBeNull()
  })
})
