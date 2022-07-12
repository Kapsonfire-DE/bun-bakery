"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const RouterMethods_1 = require("./RouterMethods");
const JSTSHandler = {
    addRoute: async function (routeFile) {
        let routerObject = {};
        try {
            let parsed = (path.parse(routeFile));
            if (parsed.ext === '.ts' || parsed.ext === '.js') {
                let importedRoute = await Promise.resolve().then(() => __importStar(require(routeFile)));
                RouterMethods_1.RouterMethods.forEach(method => {
                    if (typeof importedRoute[method] !== 'undefined') {
                        routerObject[method] = importedRoute[method];
                    }
                });
            }
        }
        catch (e) {
        }
        return routerObject;
    },
    withExtension: false,
    withoutExtension: true
};
exports.default = JSTSHandler;
