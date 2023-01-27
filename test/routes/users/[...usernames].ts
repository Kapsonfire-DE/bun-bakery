import {Context} from "../../../lib"

export async function GET(ctx: Context) {
   ctx.json(ctx.params.usernames);
}



export async function POST(ctx: Context) {
    ctx.json(await ctx.request.json());
}