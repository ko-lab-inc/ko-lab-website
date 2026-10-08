import { describe, expect, it } from 'vitest'

import chargeurImage from '@/lib/chargeur-image'

/**
 * Le chargeur d'images de next/image.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE TEST EXISTE, ET POURQUOI IL EST CRUCIAL
 *
 * Du 5 septembre au 6 octobre 2026, ce chargeur a déformé TOUTES les photos
 * Supabase du site (réalisations, galeries, et surtout le catalogue de
 * location). La cause : il n'envoyait pas `resize=contain` à Supabase, qui
 * appliquait alors son défaut `cover` — largeur imposée, hauteur d'origine
 * conservée, donc image écrasée. Rien ne l'a signalé : ni le typage, ni le
 * build, ni aucun test. On ne l'a vu qu'à l'œil, par hasard.
 *
 * La synchro des photos de location dépend entièrement de ce chargeur pour
 * l'affichage. Ce test est le garde-fou qui rend cette panne IMPOSSIBLE à
 * repasser en silence : si quelqu'un retire `resize=contain`, il casse ici.
 * ---------------------------------------------------------------------------
 */

const OBJET =
  'https://x.supabase.co/storage/v1/object/public/location/2689.jpg'

describe('chargeurImage — photos Supabase (catalogue de location)', () => {
  it('passe TOUJOURS resize=contain, sinon Supabase deforme la photo', () => {
    const url = chargeurImage({ src: OBJET, width: 1024, quality: 80 })
    expect(url).toContain('resize=contain')
  })

  it('bascule du chemin objet vers le chemin de rendu (transformation)', () => {
    const url = chargeurImage({ src: OBJET, width: 640 })
    expect(url).toContain('/storage/v1/render/image/public/')
    expect(url).not.toContain('/storage/v1/object/public/')
  })

  it('reporte la largeur et la qualite demandees', () => {
    const url = chargeurImage({ src: OBJET, width: 768, quality: 85 })
    expect(url).toContain('width=768')
    expect(url).toContain('quality=85')
  })

  it('applique une qualite par defaut quand elle est absente', () => {
    const url = chargeurImage({ src: OBJET, width: 500 })
    expect(url).toMatch(/quality=\d+/)
  })

  it('laisse les images LOCALES passer par l optimiseur Vercel, pas par Supabase', () => {
    const url = chargeurImage({ src: '/images/hero/x.webp', width: 1280, quality: 85 })
    expect(url).toContain('/_next/image')
    expect(url).toContain('w=1280')
    expect(url).not.toContain('resize=contain')
  })
})
