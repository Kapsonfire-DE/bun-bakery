[![](https://img.shields.io/npm/l/@kapsonfire/bun-bakery?color=red&style=flat-square)](https://www.npmjs.com/package/@kapsonfire/bun-bakery)
[![](https://img.shields.io/npm/v/@kapsonfire/bun-bakery?color=red&style=flat-square)](https://www.npmjs.com/package/@kapsonfire/bun-bakery)
[![](https://img.shields.io/npm/dw/@kapsonfire/bun-bakery?color=red&style=flat-square)](https://www.npmjs.com/package/@kapsonfire/bun-bakery)
[![](https://img.shields.io/npm/dt/@kapsonfire/bun-bakery?color=red&style=flat-square)](https://www.npmjs.com/package/@kapsonfire/bun-bakery)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=Kapsonfire-DE_bun-bakery&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=Kapsonfire-DE_bun-bakery)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Kapsonfire-DE_bun-bakery&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=Kapsonfire-DE_bun-bakery)
<div align="center">

![](https://user-images.githubusercontent.com/67053124/178574093-60d51387-0f65-4c64-a29b-b8c5baefde7e.png)

</div>

# Bun Bakery

**Bun-Bakery** is a web framework for [Bun](https://github.com/oven-sh/bun). It uses a file based router in style like svelte-kit. No need to define routes during runtime.


## Quick Start
```bash
bun add @kapsonfire/bun-bakery
```

On your main script import Router from bun-bakery and define your pathes. i.e. `main.ts`
```typescript
import {Router} from "@kapsonfire/bun-bakery"

new Router({
    assetsPath: import.meta.dir + '/assets/',
    routesPath: import.meta.dir + '/routes/'
})
```

After that run the server and open your browser `http://localhost:3000`
```bash
bun main.ts
```

## Routing
Routes are added automatically when creating files inside your `routesPath` when exporting functions with the corresponding Method Names.
Given example above create `index.ts` inside `routes/` and export a `GET` function calling `ctx.sendResponse()`.

```typescript
import {Context} from "@kapsonfire/bun-bakery"

export async function GET(ctx: Context) {
    ctx.sendResponse(new Response('hello world!'));
}
```

### Parameters
Routes can have parameters inside dirname and/or filename. Just put the parameter name inside brackets and it will be added to `ctx.params`.
In example: given `routes/user/[username].ts` and open `http://localhost:3000/user/kapsonfire` 
```typescript
import {Context} from "@kapsonfire/bun-bakery"

export async function GET(ctx: Context) {
    ctx.sendResponse(new Response('hello '+ ctx.params.username +'!'));
}
``` 
will output `hello kapsonfire!`

### Spread Paramaters
Routes can also have wildcard/spread paramaters.
In example: given `routes/users/[...usernames].ts` and open `http://localhost:3000/users/kapsonfire/jarred/tricked`
```typescript
import {Context} from "@kapsonfire/bun-bakery"

export async function GET(ctx: Context) {
    ctx.sendAsJson(JSON.stringify(ctx.params));
}
``` 

will output 
```json
{"usernames":["kapsonfire","jarred","tricked"]}
``` 



### Handlers
Inside the context variable you can access the native bun `Request` object inside `ctx.request`.
`ctx.sendResponse` expects a native bun `Response` object.


## Middlewares
bun-bakery supports some life-cycles to add middleware
* **onRequest** `will be called before the router handles the request`
* **onRoute** `will be called before the route function will be called`
* **onResponse** `will be called after the route function finished`

```typescript
router.addMiddleware({
    onRequest: (ctx: Context) => { ctx.params.injected = "1"; console.log('onRequest', ctx) },
    onRoute: (ctx: Context) => console.log('onRoute', ctx),
    onResponse: (ctx: Context) => {
        ctx.response.headers.set('content-type', 'application/jsonx');
        console.log('onResponse', ctx)
    },
});
```