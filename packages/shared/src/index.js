"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WS_EVENTS = exports.UserRole = exports.OrderStatus = void 0;
var order_status_enum_1 = require("./enums/order-status.enum");
Object.defineProperty(exports, "OrderStatus", { enumerable: true, get: function () { return order_status_enum_1.OrderStatus; } });
var user_role_enum_1 = require("./enums/user-role.enum");
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return user_role_enum_1.UserRole; } });
exports.WS_EVENTS = {
    ORDER_NEW: 'newOrder',
    ORDER_STATUS_CHANGED: 'orderStatusChanged',
    ORDER_JOIN_ROOM: 'joinOrderRoom',
    ORDER_UPDATE_STATUS: 'updateOrderStatus',
    RESTAURANT_JOIN_ROOM: 'joinRestaurantRoom',
    DRIVER_LOCATION_UPDATE: 'driverLocationUpdate',
    DRIVER_SEND_LOCATION: 'sendLocation',
    DRIVER_ACCEPT_DELIVERY: 'acceptDelivery',
    NOTIFICATION_NEW: 'newNotification',
};
//# sourceMappingURL=index.js.map