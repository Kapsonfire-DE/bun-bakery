import {Context} from "../../../lib";


export const WEBSOCKET = {
    message: (ws, message)  => {
        console.log(ws.data);
        console.log('RCV:', message);
        let i = '';
        for(let j = 0; j < message.length; j++)
            i += 'A';
        ws.send(i);
    },
    upgrade: (ctx: Context) => {
        ctx.acceptWebsocketUpgrade({
            data: {}, headers: {'Set-Cookie': 'name=value'}
        });
    }
}