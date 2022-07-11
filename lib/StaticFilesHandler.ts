import * as path from "path";
import {Router} from "./Router";
import type {IHandler} from "./IHandler";
import {Context} from "./Context";
import {file} from "bun";

const StaticFilesHandler : IHandler = {
    addRoute: async function (routeFile: string): Promise<object> {
        let routerObject = {};
        routerObject['ANY'] = (ctx: Context) => {
            ctx.sendResponse(new Response(file(routeFile)));
        };
        return routerObject;
    },
    withExtension: true,
    withoutExtension: false
};
export default StaticFilesHandler;
