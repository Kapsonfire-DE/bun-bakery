"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const deepmerge_ts_1 = require("deepmerge-ts");
const bun_1 = require("bun");
const Context_1 = require("./Context");
const JSTSHandler_1 = __importDefault(require("./JSTSHandler"));
const StaticFilesHandler_1 = __importDefault(require("./StaticFilesHandler"));
const RouterMethods_1 = require("./RouterMethods");
function* walkSync(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        if (file.isDirectory()) {
            yield* walkSync(path.join(dir, file.name));
        }
        else {
            yield path.join(dir, file.name);
        }
    }
}
async function getFiles(dir) {
    let files = [];
    for (const filePath of walkSync(dir)) {
        files.push(filePath);
    }
    return files;
}
class Router {
    constructor(options) {
        this.router = {};
        this.EXT_WEIGHTS = {
            '.ts': 100,
            '.js': 99
        };
        this.EXT_HANDLER = {
            '.ts': JSTSHandler_1.default,
            '.js': JSTSHandler_1.default,
            '.html': StaticFilesHandler_1.default,
            '.json': StaticFilesHandler_1.default,
        };
        this.config = {
            port: 3000,
            routesPath: './routes',
            assetsPath: './assets',
            customHandlers: {}
        };
        this.config = (0, deepmerge_ts_1.deepmerge)(this.config, options);
        this.config.routesPath = path.resolve(options.routesPath);
        if (!fs.existsSync(this.config.routesPath)) {
            throw new Error(`routesPath '${this.config.routesPath}' does not exist`);
        }
        this.EXT_HANDLER = { ...this.EXT_HANDLER, ...this.config.customHandlers };
        this.bake().then(r => this.listen());
    }
    replaceParams(route) {
        const regex = /\[(\w+)\]/gm;
        const subst = `(?<$1>[^\\/]+)`;
        return route.replace(regex, subst);
    }
    async bake() {
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
            routePath = this.replaceParams(routePath);
            if ((this.EXT_HANDLER[parsed.ext]?.withoutExtension) ?? false) {
                if (typeof routes[routePath] === 'undefined') {
                    routes[routePath] = [file];
                }
                else {
                    routes[routePath].push(file);
                }
            }
            if ((this.EXT_HANDLER[parsed.ext]?.withExtension) ?? false) {
                if (typeof routes[routePath + parsed.ext] === 'undefined') {
                    routes[routePath + parsed.ext] = [file];
                }
                else {
                    routes[routePath + parsed.ext].push(file);
                }
            }
            if (base === 'index') {
                basedir = this.replaceParams(basedir.substring(0, basedir.length - 1));
                if (basedir.length === 0)
                    basedir = '/';
                if (typeof routes[basedir] === 'undefined') {
                    routes[basedir] = [file];
                }
                else {
                    routes[basedir].push(file);
                }
            }
        });
        let keys = Object.keys(routes);
        for (let i = 0; i < keys.length; i++) {
            let route = keys[i];
            let files = routes[route];
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
    async listen() {
        Bun.serve({
            fetch: this.serve.bind(this),
            port: this.config.port,
        });
    }
    async serve(req) {
        const routes = Object.keys(this.router);
        const context = new Context_1.Context(req);
        if (context.path.startsWith('/assets/')) {
            let resFile = path.parse(context.path);
            let filePath = this.config.assetsPath + resFile.dir.substring('/assets'.length) + '/' + resFile.name;
            if (fs.existsSync(filePath)) {
                return new Response((0, bun_1.file)(filePath));
            }
            else {
                return new Response('File not found.', {
                    status: 404
                });
            }
        }
        let router = null;
        if (routes.indexOf(context.path) >= 0) {
            if (typeof this.router[context.path][context.method] !== 'undefined' || typeof this.router[context.path]['ANY'] !== 'undefined') {
                router = this.router[context.path][context.method] ?? this.router[context.path]['ANY'];
            }
            else {
                return new Response('Method not allowed', { status: 405 });
            }
        }
        else {
            for (let i = 0; i < routes.length; i++) {
                let route = routes[i];
                let regexp = new RegExp(`^${route}$`);
                let matcher = context.path.match(regexp);
                if (matcher) {
                    context.params = matcher.groups;
                    if (typeof this.router[route][context.method] !== 'undefined' || typeof this.router[route]['ANY'] !== 'undefined') {
                        router = this.router[route][context.method] ?? this.router[route]['ANY'];
                        break;
                    }
                    else {
                        return new Response('Method not allowed', { status: 405 });
                    }
                }
            }
        }
        if (router !== null) {
            await router(context);
            return context.response ?? new Response('Unknown error', { status: 500 });
        }
        return new Response('File not found.', {
            status: 404
        });
    }
}
exports.Router = Router;
Router.ALLOWED_METHODS = RouterMethods_1.RouterMethods;
