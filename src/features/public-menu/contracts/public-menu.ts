export type DishAvailability = 'available' | 'sold_out';

export interface PublicMenu {
  restaurantId: string;
  branchId: string;
  categories: PublicMenuCategory[];
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  position: number;
  dishes: PublicDish[];
}

export interface PublicDish {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  ingredients: string[];
  allergens: string[];
  position: number;
  price: string;
  status: DishAvailability;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      code: string;
      message: string;
    }>;
  };
}
