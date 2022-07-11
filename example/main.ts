import {Router} from "@kapsonfire/bun-bakery"
import MarkdownHandler from "./lib/MarkdownHandler";
import MustacheHandler from "./lib/MustacheHandler";


new Router({
    port: 2999,
    customHandlers: {
        '.md': MarkdownHandler,
        '.mustache': MustacheHandler,
    },
    assetsPath: import.meta.dir + '/assets/',
    routesPath: import.meta.dir + '/routes/'
})