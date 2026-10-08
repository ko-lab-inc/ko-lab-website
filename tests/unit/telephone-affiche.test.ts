import { describe, expect, it } from 'vitest'

import { telephoneAffiche } from '@/lib/utils/telephone'

/**
 * Le « +1 » ne doit jamais s'afficher devant le numéro (demande de Chris,
 * 8 octobre 2026), mais il reste dans la valeur stockée pour le lien `tel:` et
 * le JSON-LD. Ce formateur ne touche QUE l'affichage.
 */
describe('telephoneAffiche', () => {
  it('retire « +1 » en tête, avec l\'espace qui suit', () => {
    expect(telephoneAffiche('+1 819 598-0225')).toBe('819 598-0225')
  })
  it('retire « +1 » collé ou suivi d\'un tiret', () => {
    expect(telephoneAffiche('+1819 598-0225')).toBe('819 598-0225')
    expect(telephoneAffiche('+1-819-598-0225')).toBe('819-598-0225')
  })
  it('laisse intact un numéro déjà sans indicatif', () => {
    expect(telephoneAffiche('819 598-0225')).toBe('819 598-0225')
  })
  it('ne retire PAS un +1 qui ne serait pas en tête', () => {
    // cas théorique : on ne touche qu'au début de la chaîne
    expect(telephoneAffiche('819 598-0225 +1')).toBe('819 598-0225 +1')
  })
  it('ne casse pas un indicatif étranger', () => {
    expect(telephoneAffiche('+33 1 23 45 67 89')).toBe('+33 1 23 45 67 89')
  })
})
