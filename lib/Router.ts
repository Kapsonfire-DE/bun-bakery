import * as path from "path";
import * as fs from "fs";
import {deepmerge} from "deepmerge-ts";
import {Context} from "./Context";
import JSTSHandler from "./JSTSHandler";
import {IHandler} from "./IHandler";
import StaticFilesHandler from "./StaticFilesHandler";
import {RouterMethods} from "./RouterMethods";


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

        files.forEach(file => {

            let parsed = path.parse(file);
            let base = parsed.base;
            let basedir = parsed.dir.substring(this.config.routesPath.length) + '/';


            let routePath = basedir + base;
            routePath = Router.replaceParams(routePath);


            if ((this.EXT_HANDLER[parsed.ext]?.withoutExtension) ?? false) {
                if (typeof routes[routePath] === 'undefined') {
                    routes[routePath] = [file];
                } else {
                    routes[routePath].push(file);
                }
            }

            if ((this.EXT_HANDLER[parsed.ext]?.withExtension) ?? false) {
                if (typeof routes[routePath + parsed.ext] === 'undefined') {
                    routes[routePath + parsed.ext] = [file];
                } else {
                    routes[routePath + parsed.ext].push(file);
                }
            }


            if (base === 'index') {
                basedir = Router.replaceParams(basedir.substring(0, basedir.length - 1));
                if (basedir.length === 0) basedir = '/';
                if (typeof routes[basedir] === 'undefined') {
                    routes[basedir] = [file];
                } else {
                    routes[basedir].push(file);
                }
            }

        });
        let keys = Object.keys(routes);

        for (let i = 0; i < keys.length; i++) {
            let route = keys[i];
            let files = routes[route];

            if (files.length === 0) continue;

            if (files.length > 1) {
                let checkWeight = -1;
                files.forEach(file => {
                    let weight = this.EXT_WEIGHTS[(path.parse(file)).ext] ?? 0;
                    if (checkWeight < weight) {
                        checkWeight = weight;
                        routes[route] = [file];
                    }
                });

            }

            let file = routes[route][0];

            let ext = path.parse(file).ext;
            if (typeof this.EXT_HANDLER[ext] !== 'undefined') {
                router[route] = await this.EXT_HANDLER[ext].addRoute(file);
            }
        }

        this.router = router;

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

    private async serve(req: Request): Promise<Response> {
        const routes = Object.keys(this.router);
        const context = new Context(req);

        if (context.path.startsWith('/assets/')) {
            let resFile = path.parse(context.path);
            let filePath = this.config.assetsPath + resFile.dir.substring('/assets'.length) + '/' + resFile.name;
            if (fs.existsSync(filePath)) {
                return new Response(Bun.file(filePath));
            } else {
                return new Response('File not found.', {
                    status: 404
                });
            }
        }

        let router = null;


        if (routes.indexOf(context.path) >= 0) {
            if (typeof this.router[context.path][context.method] !== 'undefined' || typeof this.router[context.path]['ANY'] !== 'undefined') {
                router = this.router[context.path][context.method] ?? this.router[context.path]['ANY'];
            } else {
                return new Response('Method not allowed', {status: 405})
            }
        } else {
            for (let i = 0; i < routes.length; i++) {
                let route = routes[i];
                let regexp = new RegExp(`^${route}$`);
                let matcher = context.path.match(regexp);
                if (matcher) {
                    context.params = matcher.groups;
                    Object.keys(context.params).forEach(key => {
                        if (context.params[key].indexOf('/') >= 0) {
                            context.params[key] = (context.params[key] as string).split('/').filter(a => a !== '');
                        }
                    })
                    if (typeof this.router[route][context.method] !== 'undefined' || typeof this.router[route]['ANY'] !== 'undefined') {
                        router = this.router[route][context.method] ?? this.router[route]['ANY'];
                        break;
                    } else {
                        return new Response('Method not allowed', {status: 405})
                    }
                }
            }
        }
        if (router !== null) {
            await router(context);
            return context.response ?? new Response('Unknown error', {status: 500});
        }


        return new Response('File not found.', {
            status: 404
        });
    }
}

