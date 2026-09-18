export { OrderStatus } from './enums/order-status.enum';
export { UserRole } from './enums/user-role.enum';
export type { OrderItemDTO, CreateOrderDTO, UpdateOrderStatusDTO, OrderResponseDTO, } from './types/order';
export type { UserDTO, LoginDTO, RegisterDTO, AuthResponseDTO, } from './types/user';
export type { GeoPoint, LocationUpdate, } from './types/location';
export declare const WS_EVENTS: {
    readonly ORDER_NEW: "newOrder";
    readonly ORDER_STATUS_CHANGED: "orderStatusChanged";
    readonly ORDER_JOIN_ROOM: "joinOrderRoom";
    readonly ORDER_UPDATE_STATUS: "updateOrderStatus";
    readonly RESTAURANT_JOIN_ROOM: "joinRestaurantRoom";
    readonly DRIVER_LOCATION_UPDATE: "driverLocationUpdate";
    readonly DRIVER_SEND_LOCATION: "sendLocation";
    readonly DRIVER_ACCEPT_DELIVERY: "acceptDelivery";
    readonly NOTIFICATION_NEW: "newNotification";
};
