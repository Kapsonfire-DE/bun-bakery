import {Context} from "./Context";

export type IMiddleware = {
    /**
     * This will be called before the router handles the request
     * @param ctx
     */
    onRequest?:(ctx: Context) => void|Promise<void>;
    /**
     * This will be called before the route function will be called
     * @param ctx
     */
    onRoute?:(ctx: Context) => void|Promise<void>;
    /**
     * This will be called after the route function finished
     * @param ctx
     */
    onResponse?:(ctx: Context) => void|Promise<void>;
}