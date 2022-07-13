import * as fs from "fs";
import {Stats} from "fs";

export type IFileInfo = Stats & {
    weakEtag: string
};
export class FileInfo {
    private static cache : { [key: string]: IFileInfo } = {};

    public static getInfo(path: string) : IFileInfo|null {
        if(typeof this.cache[path] !== 'undefined') {
            return this.cache[path];
        }
        if(fs.existsSync(path)) {
            let info = (fs.statSync(path) as IFileInfo);
            info.weakEtag = `W/"${info.size}-${info.mtime.getTime()}"`;
            if(info.isDirectory()) {
                return null;
            }

            this.cache[path] = info;
            return info;
        }

        return null;
    }

}