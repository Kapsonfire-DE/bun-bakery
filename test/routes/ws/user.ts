export const WEBSOCKET = {
    message: (ws, message)  => {
        console.log(typeof message);
        ws.send(Date.now().toString());
    }
}