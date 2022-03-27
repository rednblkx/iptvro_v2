import Module from "./moduleClass";
import { readdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { extname } from 'path';
import { JSONFile, Low } from "lowdb";
import { readFile } from "fs/promises";

type cache = {
    name: string,
    link: string,
    module: string,
    lastupdated: Date
}

type config = {
    auth: {
        username: string;
        password: string;
        cookies: string[];
        lastupdated: Date;
    }
    config: {
        cache_enabled: boolean;
        cachetime: number;
        chList: string[];
    }
}

export async function sanityCheck(): Promise<string[]> {
    
    let files_list = readdirSync(process.cwd() + "/modules").filter(a => extname(a) === ".js" );
    var valid_list = [];
    console.log("Modules sanity check:\n");

    let modules : Module[] = await Promise.all(files_list.map(async (val) => (await import(`${process.cwd()}/modules/${val}`)).default || val));
    for (let val of modules) {
        try {
            if(val && val.MODULE_ID){
                let valid = true;
                //check if config file exists
                if(!existsSync(`${process.cwd()}/modules/${val.MODULE_ID}.json`)){
                    if(val.chList && val.chList.length > 0){
                        val.initializeConfig(val.chList);
                        console.log(` - Module '${val.MODULE_ID}' found`);
                    }else if(val.getChannels.constructor.name === "AsyncFunction") {
                        val.initializeConfig();
                        val.getChannels().then(ch => {
                            val.setConfig("chList", ch);
                        })
                        console.log(` - Module '${val.MODULE_ID}' found`);
                    } else {
                        val.initializeConfig();
                        console.log(` - Module '${val.MODULE_ID}' found`);
                        console.log(`\t${val.MODULE_ID} - Warning - getChannels is not valid, unable to update list!`);
                    }

                    // val.chList && val.chList.length > 0 ? val.initializeConfig(val.chList) : val.getChannels().then(ch => {
                    //     val.setConfig("chList", ch);
                    // })
                } else {
                    let auth = val.getAuth();
                    console.log(` - Module '${val.MODULE_ID}' found`);
                    ((auth.username && auth.password) === (null || undefined || "")) && console.log(`\t${val.MODULE_ID} - Warning - No Username/Password set`)
                    val.login.name === "dummy" && console.log(`\t${val.MODULE_ID} - ERROR login method not implemented`)
                    if(val.hasLive && val.liveChannels.name === "dummy"){
                        console.log(`\t${val.MODULE_ID} - ERROR hasLive true but liveChannels method not implemented`)
                        valid = false;
                    }
                    if(val.hasVOD && val.getVOD.name === "dummy"){
                        console.log(`\t${val.MODULE_ID} - ERROR hasVOD true but getVOD method not implemented`)
                        valid = false;
                    }
                }
                valid && console.log(`\t${val.MODULE_ID} - No issues found`);
                
                valid && valid_list.push(val.MODULE_ID)
            }else console.log(` - Module '${val}' failed sanity check`)
        } catch (error) {
            console.error(`${error?.message || error}`);
            // return Promise.reject(error.message || error)
        }
    }
    return Promise.resolve(valid_list);
}


async function cacheFind(id: string, module_id: string){
    try {
        const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
        const db = new Low(adapter)
        await db.read();

        const cache = db.data && db.data.find(a => a.name === id && a.module === module_id);
        // let cachetime = getConfig(module_id, 'cachetime')
        let file = existsSync(`${process.cwd()}/modules/${module_id}.json`) ? (await readFile(`${process.cwd()}/modules/${module_id}.json`)).toString() : null
        let parsed: config = file ? JSON.parse(file) : null;

        let cachetime = parsed.config.cachetime
        
        if(cache){
            if((((new Date()).getTime() - (new Date(cache.lastupdated)).getTime()) / (1000 * 3600)) <= (cachetime ? cachetime : 6)){
                let found = cache.link;
                if(process.env.DEBUG == ('true' || true)){
                    console.log(`cacheFind| Cached link found for '${id}', module '${module_id}', lastudpated on '${cache.lastupdated}', hours elapsed '${(((new Date()).getTime() - (new Date(cache.lastupdated)).getTime()) / (1000 * 3600))}'`);
                }
                return found
            }else return null
        } else return null
    } catch (error) {
        console.error(`cacheFind| ${error.message || error.toString().substring(0, 200)}`);
    }
}

async function cacheFill(id: string, module_id: string, link: string){
    try {
        const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
        const db = new Low(adapter)
        await db.read();
        const cache = db.data && db.data.findIndex(a => a.name === id && a.module === module_id);
        if(cache !== -1){
            db.data[cache].link = link;
            db.data[cache].lastupdated = new Date();
            await db.write();
        }else{
            db.data.push({
                name: id,
                link: link,
                module: module_id,
                lastupdated: new Date()
            })
            await db.write();
        }
    } catch (error) {
        console.error(`cacheFill| ${error.message || error.toString().substring(0, 200)}`);
    }
}

export function flushCache(module_id: string){
    try {
        const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
        const db = new Low(adapter)
        db.read().then(() => {
            db.data = db.data.filter(a => a.module !== module_id)
            db.write();
        })
        //log to console
        console.log(`flushCache| Flushed cache for module '${module_id}'`)
        return `flushCache| Flushed cache for module '${module_id}'`
    } catch (error) {
        console.error(`flushCache| ${error.message || error.toString().substring(0, 200)}`);
    }
}

export async function searchChannel(id: string, module_id: string, valid_modules: string[]){
    if(module_id){
        try {
            let module: Module = (await import(`${process.cwd()}/modules/${module_id}.js`)).default;
            // let file = existsSync(`${process.cwd()}/modules/${module_id}.json`) ? readFileSync(`${process.cwd()}/modules/${module_id}.json`).toString() : null;
            let config = module.getConfig()
            let auth = module.getAuth();
            if(config.chList[id] || config?.chList?.includes(id)){
                // let file = existsSync(`${process.cwd()}/modules/${module_id}.json`) ? readFileSync(`${process.cwd()}/modules/${module_id}.json`).toString() : null
                // let parsed: config = file ? JSON.parse(file) : null;
                let cache = await cacheFind(id, module_id)
                if(cache !== null && config.cache_enabled){
                    return await Promise.resolve(cache)
                }else {
                    let link = await module.liveChannels(id, auth.cookies, auth.lastupdated)
                    cacheFill(id, module_id, link)
                    return await Promise.resolve(link);
                }
                
            }else {
                let get_ch = await module.getChannels()
                if(get_ch.includes(id)){
                    module.setConfig("chList", get_ch)
                    let cache = cacheFind(id, module_id)
                    if(cache !== null && module.getConfig().cache_enabled){
                        return await Promise.resolve(cache)
                    }else {
                        let link = await module.liveChannels(id, auth.cookies, auth.lastupdated)
                        cacheFill(id, module_id, link)
                        return await Promise.resolve(link);
                    }
                }else return await Promise.reject(new Error(`searchChannel| Module ${module_id} doesn't have channel '${id}'`))
            }
        } catch (error) {
            return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
        }
    }else {
        return new Promise((resolve, reject) => {
            var tries = 0;
            valid_modules.forEach(async val => {
                try {
                    let module: Module = (await import(`${process.cwd()}/modules/${val}.js`)).default;
                    // let file = existsSync(`${process.cwd()}/modules/${val}.json`) ? readFileSync(`${process.cwd()}/modules/${val}.json`).toString() : null;
                    // let config = JSON.parse(file)
                    let config = module.getConfig()
                    let auth = module.getAuth();
                    if(config?.chList?.includes(id)){
                        let cache = await cacheFind(id, val)
                        if(cache !== null && config.cache_enabled){
                            resolve(cache)
                        }else {
                            let link = await module.liveChannels(id, auth.cookies, auth.lastupdated)
                            cacheFill(id, val, link)
                            resolve(link)
                        }
                    }else {
                        let get_ch = await module.getChannels()
                        if(get_ch.includes(id)){
                            module.setConfig("chList", get_ch)
                            let cache = await cacheFind(id, val)
                            if(cache !== null && config.cache_enabled){
                                resolve(cache)
                            }else {
                                let link = await module.liveChannels(id, auth.cookies, auth.lastupdated)
                                cacheFill(id, val, link)
                                resolve(link)
                            }
                        }else tries++;
                    }
                } catch (error) {
                    reject(new Error(`searchChannel| Something went wrong with the module ${val} - ${error.message || error.toString().substring(0, 200)}`))
                }
                if(tries === valid_modules.length){
                    reject(new Error(`searchChannel| No module has channel '${id}'`))
                }
            })
        })
    }
}
export async function getVODlist(module_id: string){
    if(module_id){
        try {
            let module: Module = (await import(`${process.cwd()}/modules/${module_id}.js`)).default;
            if(module.hasVOD){
                return await Promise.resolve(await module.getVOD_List(module.getAuth().cookies));
            }else return await Promise.reject(new Error(`getVODlist| Module ${module_id} doesn't have VOD available`))
        } catch (error) {
           return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
        }
    }else return await Promise.reject(new Error("No module id provided"))
}
export async function getVOD(module_id: string, show_id: string, year?: string, month?: string, season?: string, showfilters?: boolean){
    if(module_id){
        try {
            let module: Module = (await import(`${process.cwd()}/modules/${module_id}.js`)).default;
            if(module.hasVOD){
                let res = await module.getVOD(show_id, {cookies: module.getAuth().cookies, year, month, season, showfilters});
                return await Promise.resolve(res);
            }else return await Promise.reject(new Error(`getVOD| Module ${module_id} doesn't have VOD available`))
        } catch (error) {
            return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
        }
    }else return await Promise.reject(new Error("No module id provided"))
}
export async function getVOD_EP(module_id: string, show_id: string, epid: string){
    if(module_id){
        try {
            let module: Module = (await import(`${process.cwd()}/modules/${module_id}.js`)).default;
            if(module.hasVOD){
                let cache = await cacheFind(epid, module_id)
                if(cache !== null && module.getConfig().cache_enabled){
                    return await Promise.resolve(cache)
                }else {
                    let res = await module.getVOD_EP(show_id, epid, module.getAuth().cookies);
                    cacheFill(epid, module_id, res)
                    return await Promise.resolve(res);
                }
            }else return await Promise.reject(`getVOD_EP| Module ${module_id} doesn't have VOD available`)
        } catch (error) {
            return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
        }
    }else return await Promise.reject(new Error("No module id provided"))
}

export async function login(module_id: string, username: string, password: string){
    try {
        if(username && password){
            let module: Module = (await import(`${process.cwd()}/modules/${module_id}.js`)).default;
            return await Promise.resolve(await module.login(username, password))
        }else throw new Error("No Username/Password provided")
    } catch (error) {
        return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
    }
}

// module.exports = {sanityCheck, searchChannel, login, getVODlist, getVOD, getVOD_EP}