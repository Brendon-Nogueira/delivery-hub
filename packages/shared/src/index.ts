// Enums
export { OrderStatus } from './enums/order-status.enum';
export { UserRole } from './enums/user-role.enum';

// Types
export type {
  OrderItemDTO,
  CreateOrderDTO,
  UpdateOrderStatusDTO,
  OrderResponseDTO,
} from './types/order';

export type {
  UserDTO,
  LoginDTO,
  RegisterDTO,
  AuthResponseDTO,
} from './types/user';

export type {
  GeoPoint,
  LocationUpdate,
} from './types/location';

// WebSocket Event Names (constantes)
export const WS_EVENTS = {
  // Orders namespace
  ORDER_NEW: 'newOrder',
  ORDER_STATUS_CHANGED: 'orderStatusChanged',
  ORDER_JOIN_ROOM: 'joinOrderRoom',
  ORDER_UPDATE_STATUS: 'updateOrderStatus',
  RESTAURANT_JOIN_ROOM: 'joinRestaurantRoom',

  // Delivery namespace
  DRIVER_LOCATION_UPDATE: 'driverLocationUpdate',
  DRIVER_SEND_LOCATION: 'sendLocation',
  DRIVER_ACCEPT_DELIVERY: 'acceptDelivery',

  // Notifications namespace
  NOTIFICATION_NEW: 'newNotification',
} as const;
