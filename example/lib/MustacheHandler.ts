import { Context, IHandler } from "@kapsonfire/bun-bakery"
import Mustache from "mustache";



const MustacheHandler: IHandler = {
    addRoute: async function (routeFile: string): Promise<object> {
        let routerObject = {};
        routerObject['ANY'] = async (ctx: Context) => {
            let fileSrc: string = await Bun.file(routeFile).text();
            ctx.sendHTML(
                Mustache.render(fileSrc, {...ctx.params}), {
                    headers: {
                        'content-type': 'text/html'
                    }
                }
            );
        };
        return routerObject;
    },
    withExtension: false,
    withoutExtension: true
};
export default MustacheHandler;
