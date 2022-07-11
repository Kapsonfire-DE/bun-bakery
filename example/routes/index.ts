import {Context} from "bun-bakery";

export async function GET(ctx: Context) {
    ctx.sendResponse(new Response('index'));
}