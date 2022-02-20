import Module from "./moduleClass";
import { readdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { extname } from 'path';
import { JSONFile, Low } from "lowdb";

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

// function getConfig(module_id: string, key: string){
//     let file = existsSync(`${process.cwd()}/modules/${module_id}.json`) ? readFileSync(`${process.cwd()}/modules/${module_id}.json`).toString() : null
//     let parsed: config = file ? JSON.parse(file) : null;
//     if(parsed === null){
//         throw "Config file is not valid"
//     }else {
//         return parsed.config[key]
//     }
// }

export async function sanityCheck(): Promise<string[]> {
    // instance.close()
    
    let files_list = readdirSync(process.cwd() + "/modules").filter(a => extname(a) === ".js" );
    var valid = [];
    console.log("Modules sanity check:\n");

    try {
        let modules : Module[] = await Promise.all(files_list.map(async (val) => (await import(`${process.cwd()}/modules/${val}`)).default || val));
        for (let val of modules) {
            if(val && val.MODULE_ID){
                //check if config file exists
                if(!existsSync(`${process.cwd()}/modules/${val.MODULE_ID}.json`)){
                    val.chList && val.chList.length > 0 ? val.initializeConfig(val.chList) : val.getChannels().then(ch => {
                        val.setConfig("chList", ch);
                    })
                }
                console.log(` - Module '${val.MODULE_ID}' is present`)
                valid.push(val.MODULE_ID)
            }else console.log(` - Module '${val}' failed sanity check`)
        }
    } catch (error) {
        // console.error(`${error.message || error}`);
        return Promise.reject(error.message || error)
        
    }
    return Promise.resolve(valid);
}


async function cacheFind(id: string, module_id: string){
    try {
        const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
        const db = new Low(adapter)
        await db.read();

        const cache = db.data && db.data.find(a => a.name === id && a.module === module_id);
        // let cachetime = getConfig(module_id, 'cachetime')
        let file = existsSync(`${process.cwd()}/modules/${module_id}.json`) ? readFileSync(`${process.cwd()}/modules/${module_id}.json`).toString() : null
        let parsed: config = file ? JSON.parse(file) : null;

        let cachetime = parsed.config.cachetime
        
        if(cache){
            if((((new Date()).getTime() - (new Date(cache.lastupdated)).getTime()) / (1000 * 3600)) <= (cachetime ? cachetime : 6)){
                let found = cache.link;
                if(process.env.DEBUG == ('true' || true)){
                    console.log(`cacheFind| Cached link found for '${id}', module '${module_id}', lastudpated on '${cache.lastupdated}', hours elapsed '${(((new Date()).getTime() - (new Date(cache.lastupdated)).getTime()) / (1000 * 3600))}'`);
                }
                // instance.close();
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

export function flushCache(module_id){
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
            let file = existsSync(`${process.cwd()}/modules/${module_id}.json`) ? readFileSync(`./modules/${module_id}.json`).toString() : null;
            let list_ch = JSON.parse(file)
            if(list_ch.hasOwnProperty('config') && list_ch.config.chList && list_ch.config.chList.includes(id)){
                let file = existsSync(`${process.cwd()}/modules/${module_id}.json`) ? readFileSync(`${process.cwd()}/modules/${module_id}.json`).toString() : null
                let parsed: config = file ? JSON.parse(file) : null;
                let cache = cacheFind(id, module_id)
                if(cache !== null && parsed.config.cache_enabled){
                    return await Promise.resolve(cache)
                }else {
                    let link = await module.liveChannels(id, parsed ? parsed.auth.cookies : null, parsed ? parsed.auth.lastupdated : null)
                    cacheFill(id, module_id, link)
                    return await Promise.resolve(link);
                }
                
            }else {
                let get_ch = await module.getChannels()
                if(get_ch.includes(id)){
                    let file = existsSync(`${process.cwd()}/modules/${module_id}.json`) ? readFileSync(`${process.cwd()}/modules/${module_id}.json`).toString() : null
                    let parsed: config = file ? JSON.parse(file) : null;
                    if(parsed.hasOwnProperty('config')){
                        parsed.config.chList = get_ch
                    }
                    //set parsed to file
                    writeFileSync(`${process.cwd()}/modules/${module_id}.json`, JSON.stringify(parsed))
                    let cache = cacheFind(id, module_id)
                    if(cache !== null && parsed.config.cache_enabled){
                        return await Promise.resolve(cache)
                    }else {
                        let link = await module.liveChannels(id, parsed ? parsed.auth.cookies : null, parsed ? parsed.auth.lastupdated : null)
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
                    let file = existsSync(`${process.cwd()}/modules/${val}.json`) ? readFileSync(`${process.cwd()}/modules/${val}.json`).toString() : null;
                    let list_ch = JSON.parse(file)
                    if(list_ch.hasOwnProperty('config') && list_ch.config.chList && list_ch.config.chList.includes(id)){
                        let file = existsSync(`${process.cwd()}/modules/${val}.json`) ? readFileSync(`${process.cwd()}/modules/${val}.json`).toString() : null
                        let parsed: config = file ? JSON.parse(file) : null
                        let cache = await cacheFind(id, val)
                        if(cache !== null && parsed.config.cache_enabled){
                            resolve(cache)
                        }else {
                            let link = await module.liveChannels(id, parsed ? parsed.auth.cookies : null, parsed ? parsed.auth.lastupdated : null)
                            cacheFill(id, val, link)
                            resolve(link)
                        }
                    }else {
                        let get_ch = await module.getChannels()
                        if(get_ch.includes(id)){
                            let file = existsSync(`${process.cwd()}/modules/${val}.json`) ? readFileSync(`${process.cwd()}/modules/${val}.json`).toString() : null
                            let parsed: config = file ? JSON.parse(file) : null
                            if(parsed.hasOwnProperty('config')){
                                parsed.config.chList = get_ch
                            }
                            //set parsed to file
                            writeFileSync(`${process.cwd()}/modules/${val}.json`, JSON.stringify(parsed))
                            let cache = await cacheFind(id, val)
                            if(cache !== null && parsed.config.cache_enabled){
                                resolve(cache)
                            }else {
                                let link = await module.liveChannels(id, parsed ? parsed.auth.cookies : null, parsed ? parsed.auth.lastupdated : null)
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
                let file = readFileSync(`${process.cwd()}/modules/${module_id}.json`).toString()
                let cookies: config = JSON.parse(file);
                return await Promise.resolve(await module.getVOD_List(cookies.auth.cookies));
            }else return await Promise.reject(new Error(`getVODlist| Module ${module_id} doesn't have VOD available`))
        } catch (error) {
           return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
        }
    }else return await Promise.reject(new Error("No module id provided"))
}
export async function getVOD(module_id: string, show_id: string, year, month, season, showfilters){
    if(module_id){
        try {
            let module: Module = (await import(`${process.cwd()}/modules/${module_id}.js`)).default;
            if(module.hasVOD){
                let file = readFileSync(`${process.cwd()}/modules/${module_id}.json`).toString()
                let cookies: config = JSON.parse(file);
                let res = await module.getVOD(show_id, {cookies: cookies.auth.cookies, year, month, season, showfilters});
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
                let file = readFileSync(`${process.cwd()}/modules/${module_id}.json`).toString()
                let config: config = JSON.parse(file);
                let cache = await cacheFind(epid, module_id)
                if(cache !== null && config.config.cache_enabled){
                    return await Promise.resolve(cache)
                }else {
                    let res = await module.getVOD_EP(show_id, epid, config.auth.cookies);
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