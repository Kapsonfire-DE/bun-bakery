import {deepmerge} from "deepmerge-ts";


const replaceURL = /^.*\/\/[^\/]+/;
export class Context {


    request: Request;
    response: Response | null;
    params: { [key: string]: string|string[] } = {};
    websocketEndpoint = null;

    readonly method: string;
    readonly headers: Request["headers"];
    readonly host: string;
    readonly path: string;

    readonly server;


    private _url = null;
    get url() : URL {
        if(this._url === null) this._url = new URL(this.request.url);
        return this._url;
    }

    get host() : string {
        return this.url.host;
    }

    constructor(req: Request, srv) {
        this.server = srv;
        this.request = req;
        this.response = null;


        let pathname = req.url.replace(replaceURL, '');

        const index = pathname.lastIndexOf("?");
        if (index > -1) {
            pathname = pathname.substring(0, index);
        }


        this.method = req.method;
        this.headers = req.headers;
        this.path = pathname;

        if(this.path.length > 1 && this.path.endsWith('/')) {
            this.path = this.path.substring(0, this.path.length-1);
        }


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


    acceptWebsocketUpgrade({ data, headers} = {data:{}, headers:{}}) {
        this.server.upgrade(this.request, {
            data: {...data, request: this.request, __wsEndPoint: this.websocketEndpoint},
            headers
        });
    }
}