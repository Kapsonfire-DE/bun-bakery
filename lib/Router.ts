import * as path from "path";
import * as fs from "fs";
import {deepmerge} from "deepmerge-ts";
import {Context} from "./Context";
import JSTSHandler from "./JSTSHandler";
import {IHandler} from "./IHandler";
import StaticFilesHandler from "./StaticFilesHandler";
import {RouterMethods} from "./RouterMethods";
import {FileInfo} from "./FileInfo";
import {IMiddleware} from "./IMiddleware";
import TRouter from './TrekRouter';

function* walkSync(dir) {
    const files = fs.readdirSync(dir, {withFileTypes: true});
    for (const file of files) {
        if (file.isDirectory()) {
            yield* walkSync(path.join(dir, file.name));
        } else {
            yield path.join(dir, file.name);
        }
    }
}

async function getFiles(dir): Promise<string[]> {
    let files: string[] = [];
    for (const filePath of walkSync(dir)) {
        files.push(filePath);
    }
    return files;
}

export type RouterConfig = {
    port?: number;
    routesPath?: string;
    assetsPath?: string;
    customHandlers?: { [key: string]: IHandler }
}


export class Router {


    private router = {};

    private trouter = new TRouter();
    static readonly ALLOWED_METHODS = RouterMethods;

    public EXT_WEIGHTS = {
        '.ts': 100,
        '.js': 99
    };

    private EXT_HANDLER: { [key: string]: IHandler } = {
        '.ts': JSTSHandler,
        '.js': JSTSHandler,
        '.html': StaticFilesHandler,
        '.json': StaticFilesHandler,
    };


    private config: RouterConfig = {
        port: 3000,
        routesPath: './routes',
        assetsPath: './assets',
        customHandlers: {}
    }


    public static tReplaceParams(route: string): string {
        const regexSpread = /\[\.\.\.(\w*)\]/gm;
        const substSpread = `*$1`;
        const regex = /\[(\w+)\]/gm;
        const subst = `:$1`;
        return route.replace(regex, subst).replace(regexSpread, substSpread);
    }

    private websocketConfig: { [key: string]: any } = {};


    private async bake(): Promise<void> {
        let files = await getFiles(this.config.routesPath);
        let routes = {
            '/': [],
        };

        let router = {};


        for (let i = 0; i < files.length; i++) {
            let file = files[i];


            let parsed = path.parse(file);
            let base = parsed.base;


            let basedir = parsed.dir.substring(this.config.routesPath.length) + '/';


            let routePath = basedir + base;


            routePath = Router.tReplaceParams(routePath);
            let indexRoutePath = null;

            if (this.EXT_HANDLER[parsed.ext]) {


                let ro = await this.EXT_HANDLER[parsed.ext].addRoute(file);

                if ((this.EXT_HANDLER[parsed.ext]?.withExtension) ?? false) {
                    RouterMethods.forEach(method => {
                        if (ro[method]) {
                            this.trouter.add(method, routePath + parsed.ext, ro[method]);
                        }
                        if (ro['WEBSOCKET']) {
                            this.websocketConfig[routePath + parsed.ext] = ro['WEBSOCKET'];
                        }
                    })
                }
                if ((this.EXT_HANDLER[parsed.ext]?.withoutExtension) ?? false) {
                    let len = routePath.length;
                    indexRoutePath = routePath.substring(0, len - (len > 6 ? 6 : 5));
                    RouterMethods.forEach(method => {
                        if (ro[method]) {
                            if (base === 'index') {
                                this.trouter.add(method, indexRoutePath, ro[method])
                            }
                            this.trouter.add(method, routePath, ro[method])
                        }
                    });
                    if (ro['WEBSOCKET']) {
                        if (base === 'index') {
                            this.websocketConfig[indexRoutePath] = ro['WEBSOCKET'];
                        }
                        this.websocketConfig[routePath] = ro['WEBSOCKET'];
                    }
                }
            }


            if (base === 'index') {
                basedir = Router.tReplaceParams(basedir.substring(0, basedir.length - 1));

                if (basedir.length === 0) basedir = '/';
                if (typeof routes[basedir] === 'undefined') {
                    routes[basedir] = [file];
                } else {
                    routes[basedir].push(file);
                }
            }

        }
    }

    constructor(options: RouterConfig) {

        this.config = deepmerge(this.config, options);
        this.config.routesPath = path.resolve(options.routesPath);
        if (!fs.existsSync(this.config.routesPath)) {
            throw new Error(`routesPath '${this.config.routesPath}' does not exist`)
        }
        this.EXT_HANDLER = {...this.EXT_HANDLER, ...this.config.customHandlers};

        this.bake().then(_r => this.listen());
    }

    async listen() {

        let config = {
            fetch: this.serve.bind(this),
            port: this.config.port,
            websocket: {
                open:       (ws)            => ws.data.__wsEndPoint.open?.apply(ws, [ws]),
                message:    (ws, message)   => ws.data.__wsEndPoint.message?.apply(ws, [ws,message]),
                close:      (ws)            => ws.data.__wsEndPoint.close?.apply(ws, [ws]),
                error:      (ws, ex)        => ws.data.__wsEndPoint.error?.apply(ws, [ws, ex]),
                drain:      (ws)            => ws.data.__wsEndPoint.drain?.apply(ws, [ws]),
            }
        }
        Bun.serve(config);
    }


    public addMiddleware(middleware: IMiddleware) {
        Object.keys(this.middlewares).forEach(state => {
            if (typeof middleware[state] === "function") {
                this.middlewares[state].add(middleware);
            }
        })
    }

    private middlewares = {
        onRequest: new Set<IMiddleware>(),
        onRoute: new Set<IMiddleware>(),
        onResponse: new Set<IMiddleware>(),
    }


    private static readonly ERROR500 = new Response('Unknown error', {status: 500});
    private static readonly ERROR404 = new Response('File not found.', {status: 404});

    private static_responses = {};


    private defaultAcceptWebsocket(ctx: Context) {
        ctx.acceptWebsocketUpgrade();
    }

    private async serve(req: Request, srv): Promise<Response> {
        const context = new Context(req, srv);


        if(req.headers.get('Connection')?.toLowerCase() === 'upgrade' && req.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
            if(this.websocketConfig[context.path]) {
                context.websocketEndpoint = this.websocketConfig[context.path];

                return (context.websocketEndpoint.upgrade??this.defaultAcceptWebsocket)(context);
            }
        }

        if (this.middlewares.onRoute.onRequest > 0) {
            for (const middleware of Array.from(this.middlewares.onRequest.values())) {
                await middleware.onRequest(context)
            }
        }

        if (this.static_responses[context.path]) {
            let response = this.static_responses[context.path];
            if (req.headers.has('If-None-Match')) {
                if (req.headers.get('If-None-Match') === response.headers.get('ETag')) {
                    return new Response(null, {
                        status: 304
                    });
                }
            }
            return response;
        }

        if (context.path.startsWith('/assets/')) {
            let resFile = path.parse(context.path);
            let filePath = this.config.assetsPath + resFile.dir.substring('/assets'.length) + resFile.name;
            let fileInfo = FileInfo.getInfo(filePath);
            if (fileInfo) {
                if (req.headers.has('If-None-Match')) {
                    if (req.headers.get('If-None-Match') === fileInfo.weakEtag) {
                        return new Response(null, {
                            status: 304
                        });
                    }
                }
                const headers = new Headers();
                headers.set('ETag', fileInfo.weakEtag);
                let response = new Response(Bun.file(filePath), {
                    headers: headers
                });
                this.static_responses[context.path] = response;
                return response;

            } else {
                return new Response('File not found.', {
                    status: 404
                });
            }
        }

        let router = this.trouter.find(context.method as any, context.path);
        if (router[0]) {
            router[1].forEach(([n, v]) => {
                if (n[0] === '*') {
                    v = v.split('/') as any;
                    n = n.substring(n.length > 1 ? 1 : 0);
                }
                context.params[n] = v
            });

            if (this.middlewares.onRoute.size > 0) {
                for (const middleware of Array.from(this.middlewares.onRoute.values())) {
                    await middleware.onRoute(context)
                }
            }

            await router[0](context);

            if (this.middlewares.onResponse.size > 0) {
                for (const middleware of Array.from(this.middlewares.onResponse.values())) {
                    await middleware.onResponse(context)
                }
            }
            return context.response ?? new Response('Unknown error', {status: 500});
        } else {
            return Router.ERROR404;
        }

    }
}

