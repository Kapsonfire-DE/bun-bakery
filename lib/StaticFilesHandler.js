"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bun_1 = require("bun");
const StaticFilesHandler = {
    addRoute: async function (routeFile) {
        let routerObject = {};
        routerObject['ANY'] = (ctx) => {
            ctx.sendResponse(new Response((0, bun_1.file)(routeFile)));
        };
        return routerObject;
    },
    withExtension: true,
    withoutExtension: false
};
exports.default = StaticFilesHandler;
