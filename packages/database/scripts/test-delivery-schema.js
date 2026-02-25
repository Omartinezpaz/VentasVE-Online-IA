"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var business, person, order, customer, deliveryOrder, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 15, 16, 18]);
                    return [4 /*yield*/, prisma.business.findFirst()];
                case 1:
                    business = _a.sent();
                    if (!!business) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.business.create({
                            data: {
                                name: 'Test Business',
                                slug: 'test-business',
                                address: 'Test Address 123',
                                ownerId: 'test-owner-id',
                            },
                        })];
                case 2:
                    business = _a.sent();
                    _a.label = 3;
                case 3: return [4 /*yield*/, prisma.deliveryPerson.findFirst({
                        where: { businessId: business.id }
                    })];
                case 4:
                    person = _a.sent();
                    if (!!person) return [3 /*break*/, 6];
                    return [4 /*yield*/, prisma.deliveryPerson.create({
                            data: {
                                businessId: business.id,
                                name: 'Test Driver',
                                phone: '555-1234',
                                email: 'driver@test.com',
                                passwordHash: 'dummy',
                                isAvailable: true
                            }
                        })];
                case 5:
                    person = _a.sent();
                    _a.label = 6;
                case 6: return [4 /*yield*/, prisma.order.findFirst({
                        where: { businessId: business.id }
                    })];
                case 7:
                    order = _a.sent();
                    if (!!order) return [3 /*break*/, 12];
                    return [4 /*yield*/, prisma.customer.findFirst()];
                case 8:
                    customer = _a.sent();
                    if (!!customer) return [3 /*break*/, 10];
                    return [4 /*yield*/, prisma.customer.create({
                            data: {
                                phone: '555-9876',
                                name: 'Test Customer'
                            }
                        })];
                case 9:
                    customer = _a.sent();
                    _a.label = 10;
                case 10: return [4 /*yield*/, prisma.order.create({
                        data: {
                            businessId: business.id,
                            customerId: customer.id,
                            totalCents: 1000,
                            paymentMethod: 'CASH',
                            status: 'PENDING',
                            shippingCostCents: 500, // $5.00
                            deliveryAddress: 'Calle Real 456, Caracas'
                        }
                    })];
                case 11:
                    order = _a.sent();
                    _a.label = 12;
                case 12:
                    // 4. Create DeliveryOrder (The actual test)
                    console.log('Creating DeliveryOrder with new fields...');
                    return [4 /*yield*/, prisma.deliveryOrder.create({
                            data: {
                                orderId: order.id,
                                deliveryPersonId: person.id,
                                businessId: business.id,
                                status: 'ASSIGNED',
                                otpCode: '123456',
                                pickupAddress: business.address || 'Tienda Test',
                                deliveryAddress: order.deliveryAddress || 'Cliente Test',
                                deliveryFee: 5.00 // Testing the Decimal field
                            }
                        })];
                case 13:
                    deliveryOrder = _a.sent();
                    console.log('DeliveryOrder created successfully:', deliveryOrder);
                    // Verify fields
                    if (deliveryOrder.pickupAddress && deliveryOrder.deliveryAddress && deliveryOrder.deliveryFee) {
                        console.log('SUCCESS: All new fields persisted correctly.');
                    }
                    else {
                        console.error('FAILURE: Missing fields in created record.');
                    }
                    // Cleanup
                    return [4 /*yield*/, prisma.deliveryOrder.delete({ where: { id: deliveryOrder.id } })];
                case 14:
                    // Cleanup
                    _a.sent();
                    console.log('Cleanup complete.');
                    return [3 /*break*/, 18];
                case 15:
                    error_1 = _a.sent();
                    console.error('Test failed:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 18];
                case 16: return [4 /*yield*/, prisma.$disconnect()];
                case 17:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 18: return [2 /*return*/];
            }
        });
    });
}
main();
