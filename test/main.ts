import {Router} from "../lib"



new Router({
    port: 3333,
    assetsPath: import.meta.dir + '/assets/',
    routesPath: import.meta.dir + '/routes/'
})