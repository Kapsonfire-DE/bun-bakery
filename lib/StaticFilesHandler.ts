import type {IHandler} from "./IHandler";
import {Context} from "./Context";

const StaticFilesHandler : IHandler = {
    addRoute: async function (routeFile: string): Promise<object> {
        let routerObject = {};
        routerObject['ANY'] = (ctx: Context) => {
            ctx.sendFile(routeFile);
        };
        return routerObject;
    },
    withExtension: true,
    withoutExtension: false
};
export default StaticFilesHandler;
