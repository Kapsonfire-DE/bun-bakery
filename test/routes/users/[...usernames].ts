import {Context} from "../../../lib"

export async function GET(ctx: Context) {
    ctx.sendResponse(new Response(JSON.stringify(ctx.params)));
}