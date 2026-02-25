"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function (m, exports) {
    for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
            __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var adapter_pg_1 = require("@prisma/adapter-pg");
var pg_1 = require("pg");
var dotenv = require("dotenv");
dotenv.config();
var prismaClientSingleton = function () {
    var pool = new pg_1.Pool({
        connectionString: process.env.DATABASE_URL
    });
    var adapter = new adapter_pg_1.PrismaPg(pool);
    return new client_1.PrismaClient({ adapter: adapter });
};
var prisma = globalThis.prisma ?? prismaClientSingleton();
exports.default = prisma;
if (process.env.NODE_ENV !== 'production')
    globalThis.prisma = prisma;
__exportStar(require("@prisma/client"), exports);
