export const PRODUCTS = {
  base: {
    id: 'base',
    name: 'Invitation',
    nameEn: 'Invitation',
    description: 'PDF + PNG download — ready to print and share',
    price: 25,
    entitlements: ['pdf', 'png'],
  },
  music: {
    id: 'music',
    name: 'Invitation + music',
    nameEn: 'Invitation + music',
    description: 'PDF + PNG + MP4 video (~28s) with background music',
    price: 30,
    entitlements: ['pdf', 'png', 'video'],
  },
}

export function listProducts() {
  return Object.values(PRODUCTS)
}
