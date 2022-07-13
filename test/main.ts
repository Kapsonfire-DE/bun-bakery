import {Context, Router} from "../lib"


const router = new Router({
    port: 3333,
    assetsPath: import.meta.dir + '/assets/',
    routesPath: import.meta.dir + '/routes/'
})

router.addMiddleware({
    onRequest: (ctx: Context) => { ctx.params.injected = "1"; console.log('onRequest', ctx) },
    onRoute: (ctx: Context) => console.log('onRoute', ctx),
    onResponse: (ctx: Context) => {
        ctx.response.headers.set('content-type', 'application/jsonx');
        console.log('onResponse', ctx)
    },
})