import {Context} from "../../../lib";

export async function GET(ctx: Context) {
    return ctx.json({a:3})
}