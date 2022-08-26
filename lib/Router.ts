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


    public static replaceParams(route: string): string {
        const regexSpread = /\[\.\.\.(\w*)\]/gm;
        const substSpread = `(?<$1>.*)`;
        const regex = /\[(\w+)\]/gm;
        const subst = `(?<$1>[^\\/]+)`;
        return route.replace(regex, subst).replace(regexSpread, substSpread);
    }

    private async bake(): Promise<void> {
        let files = await getFiles(this.config.routesPath);
        let routes = {
            '/': [],
        };

        let router = {};


        for(let i = 0; i < files.length; i++) {
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
                            if(ro[method]) {
                                this.trouter.add(method, routePath + parsed.ext, ro[method]);
                            }
                        })
                    }
                    if ((this.EXT_HANDLER[parsed.ext]?.withoutExtension) ?? false) {
                        RouterMethods.forEach(method => {
                            if(ro[method]) {
                                if(base === 'index') {
                                    let len = routePath.length;
                                    indexRoutePath = routePath.substring(0,len - (len>6?6:5));
                                    this.trouter.add(method, indexRoutePath, ro[method])
                                }
                                this.trouter.add(method, routePath, ro[method])
                            }
                        })
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


        Bun.serve({
            fetch: this.serve.bind(this),
            port: this.config.port,
        });


    }



    public addMiddleware(middleware: IMiddleware) {
        Object.keys(this.middlewares).forEach(state => {
            if(typeof middleware[state] === "function") {
                this.middlewares[state].add(middleware);
            }
        })
    }

    private middlewares = {
        onRequest: new Set<IMiddleware>(),
        onRoute: new Set<IMiddleware>(),
        onResponse: new Set<IMiddleware>(),
    }

    private async serve(req: Request): Promise<Response> {
        const routes = Object.keys(this.router);
        const context = new Context(req);

        for(const middleware of Array.from(this.middlewares.onRequest.values())) {
            await middleware.onRequest(context)
        }



        if (context.path.startsWith('/assets/')) {
            let resFile = path.parse(context.path);
            let filePath = this.config.assetsPath + resFile.dir.substring('/assets'.length) + resFile.name;
            let fileInfo = FileInfo.getInfo(filePath);
            if (fileInfo) {
                if(req.headers.has('If-None-Match')) {
                    if(req.headers.get('If-None-Match') === fileInfo.weakEtag) {
                        return new Response(null, {
                            status: 304
                        });
                    }
                }
                const headers = new Headers();
                headers.set('ETag', fileInfo.weakEtag);
                return new Response(Bun.file(filePath), {
                    headers: headers
                });
            } else {
                return new Response('File not found.', {
                    status: 404
                });
            }
        }

        let router = null;
        router = this.trouter.find(context.method as any , context.path);
        if(router[0]) {

            router[1].forEach(([n,v]) => {
                if(n[0] === '*') {
                    v = v.split('/');
                    n = n.substring(n.length>1?1:0);
                }
                context.params[n] = v
            });

            for(const middleware of Array.from(this.middlewares.onRoute.values())) {
                await middleware.onRoute(context)
            }
            await router[0](context);
            for(const middleware of Array.from(this.middlewares.onResponse.values())) {
                await middleware.onResponse(context)
            }
            return context.response ?? new Response('Unknown error', {status: 500});
        } else {
            return new Response('File not found.', {
                status: 404
            });
        }
    }
}

