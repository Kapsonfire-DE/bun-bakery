import {Context} from "../../lib"

export async function GET(ctx: Context) {
    ctx.json({a: 1});
}