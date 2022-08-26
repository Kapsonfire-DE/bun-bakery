import {Context} from "../../../lib"

export async function GET(ctx: Context) {

    console.log(ctx.params);

    ctx.sendAsJson([]);
}