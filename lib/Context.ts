import {deepmerge} from "deepmerge-ts";

export class Context {


    request: Request;
    response: Response | null;
    params: { [key: string]: string|string[] } = {};

    readonly method: string;
    readonly headers: Request["headers"];
    readonly host: string;
    readonly path: string;
    readonly url: URL;

    constructor(req: Request) {
        this.request = req;
        this.response = null;

        const url = new URL(req.url);
        this.method = req.method;
        this.headers = req.headers;
        this.host = url.host;
        this.path = url.pathname;
        if(this.path.endsWith('/') && this.path.length > 1) {
            this.path = this.path.substring(0, this.path.length-1);
        }
        this.url = url;

        // noinspection JSIgnoredPromiseFromCall
        this.request.blob();
    }

    sendResponse(res: Response): void {
        this.response = res;
    }

    sendHTML(htmlCode: string, init: ResponseInit = {}): void {
        this.response = new Response(htmlCode, deepmerge(init, { headers: {
                'Content-Type': 'text/html'
            }}));
    }

    sendAsJson(data: any, init: ResponseInit = {}): void {
        this.response = new Response(JSON.stringify(data), deepmerge(init, { headers: {
                'Content-Type': 'application/json'
            }}));
    }

    sendFile(path: string, init: ResponseInit = {}): void {
        this.response = new Response(Bun.file(path), init);
    }
}