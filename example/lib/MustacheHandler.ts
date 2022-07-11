import { Context, IHandler } from "bun-bakery"
import Mustache from "mustache";



const MustacheHandler: IHandler = {
    addRoute: async function (routeFile: string): Promise<object> {
        let routerObject = {};
        routerObject['ANY'] = async (ctx: Context) => {
            let fileSrc: string = await Bun.file(routeFile).text();
            ctx.sendResponse(new Response(
                Mustache.render(fileSrc, {...ctx.params}), {
                    headers: {
                        'content-type': 'text/html'
                    }
                }
            ));
        };
        return routerObject;
    },
    withExtension: false,
    withoutExtension: true
};
export default MustacheHandler;
