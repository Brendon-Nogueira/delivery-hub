export interface RestaurantDTO {
  id: string;
  name: string;
  description: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  isActive: boolean;
  category: string;
  deliveryFee: number;
  deliveryTime: string;
  rating: number;
  ownerId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface MenuItemDTO {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string;
  isAvailable: boolean;
  restaurantId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
