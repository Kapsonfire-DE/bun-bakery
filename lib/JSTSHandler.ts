import * as path from "path";
import type {IHandler} from "./IHandler";
import {RouterMethods} from "./RouterMethods";

const JSTSHandler : IHandler = {
    addRoute: async function (routeFile: string): Promise<object> {

        let routerObject = {};
        try {
            let parsed = (path.parse(routeFile));
            if (parsed.ext === '.ts' || parsed.ext === '.js') {

                let importedRoute = await import(routeFile);

                RouterMethods.forEach(method => {
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
