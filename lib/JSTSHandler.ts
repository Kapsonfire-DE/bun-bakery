import * as path from "path";
import {Router} from "./Router";
import type {IHandler} from "./IHandler";

const JSTSHandler : IHandler = {
    addRoute: async function (routeFile: string): Promise<object> {
        let routerObject = {};
        try {
            let parsed = (path.parse(routeFile));
            if (parsed.ext === '.ts' || parsed.ext === '.js') {
                let importedRoute = await import(routeFile);
                Router.ALLOWED_METHODS.forEach(method => {
                    if (typeof importedRoute[method] !== 'undefined') {
                        routerObject[method] = importedRoute[method];
                    }
                });
            }
        } catch (e) {

        }
        return routerObject;
    },
    withExtension: false,
    withoutExtension: true
};

export default JSTSHandler;
