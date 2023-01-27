import {Context, Router} from "../lib"


const router = new Router({
    port: 3333,
    assetsPath: import.meta.dir + '/assets/',
    routesPath: import.meta.dir + '/routes/',
    autoListen: false
});
export default router.getListenConfig();