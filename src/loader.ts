import { ModuleType, default as ModuleFunctions} from "./moduleClass.js";
import { readdirSync, existsSync } from "fs";
import { extname } from 'path';
import { JSONFile, Low } from "lowdb";
import moment from "moment";
import {Parser} from 'm3u8-parser';
import axios from "axios";

type cache = {
    name: string,
    data: {stream: string, proxy?: string},
    module: string,
    lastupdated: Date
}

export async function sanityCheck(): Promise<string[]> {
    
    let files_list = readdirSync(process.cwd() + "/src/modules").filter(a => extname(a) === ".js" );
    var valid_list = [];
    console.log("Modules sanity check:\n");
    let modules : ModuleType[] = await Promise.all(files_list.map(async (val) => {
        try {
            return new (await import(`${process.cwd()}/src/modules/${val}`)).default()
        } catch (error) {
            return {module: val.match(/^(.*)\.js$/)[1], error: error.message || error.toString().substring(0, 200)};
        }
    }));
    for (let val of modules) {
        try {
            if(val?.MODULE_ID){
                let valid = true;
                //check if config file exists
                if(!existsSync(`${process.cwd()}/src/modules/${val.MODULE_ID}.json`)){
                    if(val.chList && val.chList.length > 0){
                        await val.initializeConfig(val.chList);
                        console.log(` - Module '${val.MODULE_ID}' found`);
                        console.log(`\t${val.MODULE_ID} - initialised - Config file created!`);
                    }else if(val.getChannels.constructor.name === "AsyncFunction") {
                        console.log(` - Module '${val.MODULE_ID}' found`);
                        await val.initializeConfig()
                        console.log(`\t${val.MODULE_ID} - initialised - Config file created!`);
                        let ch = await val.getChannels()
                        await val.setConfig("chList", ch)
                    } else {
                        await val.initializeConfig();
                        console.log(` - Module '${val.MODULE_ID}' found`);
                        console.log(`\t${val.MODULE_ID} - initialised - Config file created!`);
                        console.log(`\t${val.MODULE_ID} - Warning - getChannels failed, unable to update list!`);
                    }

                    // val.chList && val.chList.length > 0 ? val.initializeConfig(val.chList) : val.getChannels().then(ch => {
                    //     val.setConfig("chList", ch);
                    // })
                } else {
                    let auth = await val.getAuth();
                    console.log(` - Module '${val.MODULE_ID}' found`);
                    ((auth.username && auth.password) === (null || undefined || "")) && console.log(`\t${val.MODULE_ID} - INFO - No Username/Password set`)
                    !val.login.name && val.logger('sanityCheck',`\t${val.MODULE_ID} - WARNING login method not implemented`)
                    if(val.hasLive && !val.liveChannels?.name){
                        val.logger('sanityCheck',`\t${val.MODULE_ID} - WARNING hasLive true but liveChannels method not implemented`)
                        valid = false;
                    }
                    if(val.hasVOD && !val.getVOD?.name){
                        val.logger('sanityCheck',`\t${val.MODULE_ID} - WARNING hasVOD true but getVOD method not implemented`)
                        valid = false;
                    }
                }
                valid && console.log(`\t${val.MODULE_ID} - No issues found\n`);
                
                valid && valid_list.push(val.MODULE_ID)
            }else console.log(` - Module '${val['module'] || val}' failed sanity check\n\t${val['error'] || `\0`}`);
        } catch (error) {
            console.error(`${error?.message || error}`);
            // return Promise.reject(error.message || error)
        }
    }
    await cacheCleanup(modules)
    return Promise.resolve(valid_list);
}

function m3u8Select(data, baseUrl){
    var parser = new Parser();
    
    parser.push(data);
    parser.end();
    
    var parsedManifest = parser.manifest;
    
    let highestBandwidth;
    
    parsedManifest.playlists.forEach(element => {
      if(!highestBandwidth)
        highestBandwidth = element.attributes.BANDWIDTH;
    
      if(element.attributes.BANDWIDTH > highestBandwidth)
        highestBandwidth = element.attributes.BANDWIDTH;
    });
    
    if(data.includes('http')){
      return parsedManifest.playlists.find(a => a.attributes.BANDWIDTH === highestBandwidth).uri
    }else return `${baseUrl}/${parsedManifest.playlists.find(a => a.attributes.BANDWIDTH === highestBandwidth).uri}`
    
}

function m3uFixURL(m3u, url) {
    m3u = m3u.split("\n");
    m3u.forEach((el, index, array) => {
      if (!el.includes("http") && el.match('URI="(.*)"') != null) {
        array[index] = el.replace(
          el.match('"(.*).key"')[0],
          `"${url}/${el.match('URI="(.*)"')[1]}"`
        );
      }
      if (el.match("(.*).ts") != null) {
        array[index] = `${url}/${el}`;
      }
    });
    return m3u.join("\n");
  }

export async function rewritePlaylist(link){
    let initData = (await axios.get(link)).data
    let initm3u8 = initData.includes("\n") ? initData : (initData.split(" ")).join("\n")
    if(initm3u8.includes(".m3u8")){
        let q_m3u8 = await axios.get(m3u8Select(initm3u8, link.match(/(.*)\/.*/)[1]))
        let finalP = m3uFixURL(q_m3u8.data, q_m3u8.config.url.match(/(.*)\/.*/)[1])
        return finalP
    }else return m3uFixURL(initm3u8, link.match(/(.*)\/.*/)[1])
}


async function cacheCleanup(modules: ModuleType[]){
    const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
    const db = new Low(adapter)
    await db.read();

    db.data ||= []

    let removed = [];

    let cache_config = {}

    try {
        for(let mod of modules){
            if(mod instanceof ModuleFunctions){
                cache_config[mod.MODULE_ID] = (await mod.getConfig()).cachetime
            }
        }
        for (let index = 0; index < db.data.length; index++) {
            if((((new Date()).getTime() - (new Date(db.data[index].lastupdated)).getTime()) / (1000 * 3600)) >= (cache_config[db.data[index].module] || 6)){
                if(process.env.DEBUG == ('true' || true)){
                    console.log(`cacheCleanup| Found cached link for '${db.data[index].name}' module '${db.data[index].module}' older than ${(cache_config[db.data[index].module] || 6)} hours, removing!`);
                }
                removed = db.data.splice(index, 1)
                index--;
            }
        }
        if(removed.length > 0)
            await db.write();
    } catch (error) {
        console.log(error);
    }

}


export async function cacheFind(module: ModuleType, id?: string){
    try {
        const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
        const db = new Low(adapter)
        await db.read();

        const cache = db.data && db.data.find(a => id ? a.name === id && a.module === module.MODULE_ID : a.module === module.MODULE_ID);
        let cachetime = (await module.getConfig()).cachetime
        // let file = existsSync(`${process.cwd()}/src/modules/${module_id}.json`) ? (await readFile(`${process.cwd()}/src/modules/${module_id}.json`)).toString() : null
        // let parsed: AuthConfig = file ? JSON.parse(file) : null;

        // let cachetime = parsed.config.cachetime
        
        
        if(cache){
            if((((new Date()).getTime() - (new Date(cache.lastupdated)).getTime()) / (1000 * 3600)) <= (cachetime ? cachetime : 6)){
                // let found = cache.link;
                if(process.env.DEBUG == ('true' || true)){
                    console.log(`cacheFind| Cached link found for '${id}', module '${module.MODULE_ID}', saved ${moment(cache.lastupdated).fromNow()}`);
                }
                return cache
            }else return null
        } else return null
    } catch (error) {
        console.error(`cacheFind| ${error.message || error.toString().substring(0, 200)}`);
    }
}

async function cacheFill(id: string, module_id: string, data: {stream: string, proxy?: string}){
    try {
        const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
        const db = new Low(adapter)
        await db.read();
        db.data ||= [];
        const cache = db.data && db.data.findIndex(a => a.name === id && a.module === module_id);
        if(cache && cache !== -1){
            db.data[cache].data = data;
            db.data[cache].lastupdated = new Date();
            await db.write();
        }else{
            db.data.push({
                name: id,
                data: data,
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

export async function searchChannel(id: string, module_id: string, valid_modules: string[]): Promise<cache['data']>{
    if(module_id){
        try {
            let module: ModuleType = new (await import(`${process.cwd()}/src/modules/${module_id}.js`)).default();
            // let file = existsSync(`${process.cwd()}/src/modules/${module_id}.json`) ? readFileSync(`${process.cwd()}/src/modules/${module_id}.json`).toString() : null;
            let config = await module.getConfig()
            let auth = await module.getAuth();
            if(config.chList[id]){
                // let file = existsSync(`${process.cwd()}/src/modules/${module_id}.json`) ? readFileSync(`${process.cwd()}/src/modules/${module_id}.json`).toString() : null
                // let parsed: config = file ? JSON.parse(file) : null;
                let cache = await cacheFind(module, id)
                if(cache !== null && config.cache_enabled){
                    return await Promise.resolve(cache.data)
                }else {
                    let data = await module.liveChannels(config.chList[id], auth.authTokens, auth.lastupdated)
                    cacheFill(id, module_id, data)
                    return await Promise.resolve(data);
                }
                
            }else {
                let get_ch = await module.getChannels()
                if(get_ch[id]){
                    module.setConfig("chList", get_ch)
                    let cache = await cacheFind(module, id)
                    if(cache !== null && (await module.getConfig()).cache_enabled){
                        return await Promise.resolve(cache.data)
                    }else {
                        let data  = await module.liveChannels(get_ch[id], auth.authTokens, auth.lastupdated)
                        cacheFill(id, module_id, data)
                        return await Promise.resolve(data);
                    }
                }else return await Promise.reject(new Error(`searchChannel| Module ${module_id} doesn't have channel '${id}'`))
            }
        } catch (error) {
            return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
        }
    }else {
        // return new Promise((resolve, reject) => {
            var tries = 0;
            let modules : ModuleType[] = await Promise.all(valid_modules.map(async mod => new (await import(`${process.cwd()}/src/modules/${mod}.js`)).default()))
            for(let module of modules){
                try {
                    let config = await module.getConfig()
                    let auth = await module.getAuth();
                    if(config?.chList[id]){
                        let cache = await cacheFind(module, id)
                        if(cache !== null && config.cache_enabled){
                            return Promise.resolve(cache.data)
                        }else {
                            let data = await module.liveChannels(config.chList[id], auth.authTokens, auth.lastupdated)
                            if(data){
                                cacheFill(id, module.MODULE_ID, data)
                                return Promise.resolve(data)
                            }
                        }
                    }
                } catch (error) {
                    return Promise.reject(new Error(`searchChannel - ${error.message || error.toString().substring(0, 200)}`))
                }
                if(tries === valid_modules.length){
                    return Promise.reject(new Error(`searchChannel - No module has channel '${id}'`))
                }
            }
        // })
    }
}
export async function getVODlist(module_id: string){
    if(module_id){
        try {
            let module: ModuleType = new (await import(`${process.cwd()}/src/modules/${module_id}.js`)).default();
            if(module.hasVOD){
                return await Promise.resolve(await module.getVOD_List((await module.getAuth()).authTokens));
            }else return await Promise.reject(new Error(`getVODlist| Module ${module_id} doesn't have VOD available`))
        } catch (error) {
           return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
        }
    }else return await Promise.reject(new Error("No module id provided"))
}
export async function getVOD(module_id: string, show_id: string, year?: string, month?: string, season?: string, showfilters?: boolean){
    if(module_id){
        try {
            let module: ModuleType = new (await import(`${process.cwd()}/src/modules/${module_id}.js`)).default();
            if(module.hasVOD){
                let res = await module.getVOD(show_id, {authTokens: (await module.getAuth()).authTokens, year, month, season, showfilters});
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
            let module: ModuleType = new (await import(`${process.cwd()}/src/modules/${module_id}.js`)).default();
            if(module.hasVOD){
                let cache = await cacheFind(module, epid)
                if(cache !== null && (await module.getConfig()).cache_enabled){
                    return await Promise.resolve(cache.data.stream)
                }else {
                    let res = await module.getVOD_EP(show_id, epid, (await module.getAuth()).authTokens);
                    cacheFill(epid, module_id, {stream: res})
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
            let module: ModuleType = new (await import(`${process.cwd()}/src/modules/${module_id}.js`)).default();
            return await Promise.resolve(await module.login(username, password))
        }else throw new Error("No Username/Password provided")
    } catch (error) {
        return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
    }
}

// module.exports = {sanityCheck, searchChannel, login, getVODlist, getVOD, getVOD_EP}