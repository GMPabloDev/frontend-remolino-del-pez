import { PublicMenuClientError } from '../api/public-menu-client';
import type { PublicMenu } from '../contracts/public-menu';
import type { MenuFixtureScenario } from '../../../config/runtime';
import type { ValidMenuQuery } from '../lib/menu-query';

const fixtureCategories = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Para compartir',
    position: 1,
    dishes: [
      {
        id: '11111111-1111-4111-8111-111111111112',
        name: 'Causa de pollo crocante',
        description: 'Capas de papa amarilla, pollo crocante y crema de ají amarillo.',
        imageUrl:
          'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85',
        ingredients: ['Papa amarilla', 'Pollo', 'Ají amarillo', 'Palta'],
        allergens: ['Huevo'],
        position: 1,
        price: '28.90',
        status: 'available' as const,
      },
      {
        id: '11111111-1111-4111-8111-111111111113',
        name: 'Tequeños de queso ahumado',
        description: 'Crujientes, dorados y servidos con salsa de rocoto dulce.',
        imageUrl: null,
        ingredients: ['Masa de trigo', 'Queso ahumado', 'Rocoto'],
        allergens: ['Gluten', 'Lácteos'],
        position: 2,
        price: '19.50',
        status: 'available' as const,
      },
    ],
  },
  {
    id: '22222222-2222-4222-8222-222222222221',
    name: 'Favoritos de la casa',
    position: 2,
    dishes: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Arroz meloso de mar y tierra',
        description: 'Arroz cremoso con langostinos, chorizo artesanal y hierbas frescas.',
        imageUrl:
          'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=85',
        ingredients: ['Arroz', 'Langostinos', 'Chorizo', 'Pimiento'],
        allergens: ['Crustáceos'],
        position: 1,
        price: '42.00',
        status: 'available' as const,
      },
      {
        id: '22222222-2222-4222-8222-222222222223',
        name: 'Pesca del día a la parrilla',
        description: 'Filete de pesca del día con papas doradas y ensalada fresca.',
        imageUrl: null,
        ingredients: ['Pesca del día', 'Papa', 'Lechuga', 'Limón'],
        allergens: ['Pescado'],
        position: 2,
        price: '39.90',
        status: 'sold_out' as const,
      },
    ],
  },
  {
    id: '33333333-3333-4333-8333-333333333331',
    name: 'Para cerrar',
    position: 3,
    dishes: [
      {
        id: '33333333-3333-4333-8333-333333333332',
        name: 'Tarta tibia de chocolate',
        description: 'Chocolate intenso, sal marina y helado de vainilla.',
        imageUrl:
          'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=85',
        ingredients: ['Chocolate', 'Harina', 'Vainilla', 'Mantequilla'],
        allergens: ['Gluten', 'Lácteos', 'Huevo'],
        position: 1,
        price: '18.00',
        status: 'available' as const,
      },
    ],
  },
] satisfies PublicMenu['categories'];

export function getMenuFixture(
  scenario: MenuFixtureScenario,
  query: ValidMenuQuery,
): Promise<PublicMenu> {
  if (scenario === 'error') {
    return Promise.reject(
      new PublicMenuClientError(
        503,
        'FIXTURE_ERROR',
        'El menú de demostración no está disponible.',
      ),
    );
  }

  if (scenario === 'empty') {
    return Promise.resolve({
      restaurantId: query.restaurantId,
      branchId: query.branchId,
      categories: [],
    });
  }

  return Promise.resolve({
    restaurantId: query.restaurantId,
    branchId: query.branchId,
    categories: fixtureCategories,
  });
}
