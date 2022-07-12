"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
class Context {
    constructor(req) {
        this.request = req;
        this.response = null;
        const url = new URL(req.url);
        this.method = req.method;
        this.headers = req.headers;
        this.host = url.host;
        this.path = url.pathname;
        if (this.path.endsWith('/') && this.path.length > 1) {
            this.path = this.path.substring(0, this.path.length - 1);
        }
        this.url = url;
        // noinspection JSIgnoredPromiseFromCall
        this.request.blob();
    }
    sendResponse(res) {
        this.response = res;
    }
}
exports.Context = Context;
