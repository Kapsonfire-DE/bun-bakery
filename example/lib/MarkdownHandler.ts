import { Context, IHandler } from "@kapsonfire/bun-bakery"
import MarkdownIt from "markdown-it";

const md = new MarkdownIt();

const MarkdownHandler: IHandler = {
    addRoute: async function (routeFile: string): Promise<object> {
        let routerObject = {};
        routerObject['ANY'] = async (ctx: Context) => {
            let fileSrc: string = await Bun.file(routeFile).text();
            ctx.sendResponse(new Response(
                md.render(fileSrc), {
                    headers: {
                        'content-type': 'text/html'
                    }
                }
            ));
        };
        return routerObject;
    },
    withExtension: true,
    withoutExtension: true
};
export default MarkdownHandler;
