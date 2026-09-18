import { OrderStatus } from '../enums/order-status.enum';
export interface OrderItemDTO {
    menuItemId: string;
    quantity: number;
}
export interface CreateOrderDTO {
    restaurantId: string;
    items: OrderItemDTO[];
    notes?: string;
}
export interface UpdateOrderStatusDTO {
    orderId: string;
    status: OrderStatus;
    note?: string;
}
export interface OrderResponseDTO {
    id: string;
    status: OrderStatus;
    totalPrice: number;
    notes?: string;
    customerId: string;
    restaurantId: string;
    driverId?: string;
    createdAt: string;
    updatedAt: string;
}
