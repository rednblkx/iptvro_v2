import { ModuleType, default as ModuleFunctions} from "./moduleClass.js";
import { readdirSync, existsSync } from "fs";
import { extname } from 'path';
import { JSONFile, Low } from "lowdb";
import {Parser} from 'm3u8-parser';
import axios from "axios";

/**
 * `cache` is an object with a `name` property of type `string`, a `data` property of type `{stream:
 * string, proxy?: string}`, a `module` property of type `string`, and a `lastupdated` property of type
 * `Date`.
 * @property {string} name - The name of the stream.
 * @property data - This is the data that is returned from the module.
 * @property {string} module - The module that the stream is from.
 * @property {Date} lastupdated - The date the cache was last updated.
 */
type cache = {
    name: string,
    data: {stream: string, proxy?: string},
    module: string,
    lastupdated: Date
}

/**
 * The function takes in three parameters, the first two are required and the third is optional
 * @param {string} id - This is the id of the function that is calling the logger.
 * @param {string} message - The message you want to log.
 * @param {boolean} [isError] - boolean - if true, the logger will return an Error object instead of a
 * string.
 * @returns a string or an error.
 */
 function logger(id: string, message: string, isError?: boolean): string | Error {
    if (process.env.DEBUG?.toLowerCase() === 'true') {
        console.log(`\x1b[47m\x1b[30mindex\x1b[0m - \x1b[35m${id}\x1b[0m: ${message}`);
    }
    return isError ? new Error(`\x1b[47m\x1b[30mindex\x1b[0m - \x1b[35m${id}\x1b[0m: ${message}`) : `\x1b[47m\x1b[30mindex\x1b[0m - \x1b[35m${id}\x1b[0m: ${message}`
};

/**
 * It reads all the files in the modules folder, imports them, checks if they are valid modules, and if
 * they are, it checks if they have a config file, if they don't, it creates one, and if they do, it
 * checks if the module has a login method, and if it does, it checks if the module has a username and
 * password set
 * @returns A list of valid modules
 */
export async function sanityCheck(): Promise<string[]> {
    
    let files_list = readdirSync(`${process.cwd()}/src/modules`).filter(a => extname(a) === ".ts" ).map(a => a.replace(".ts", ".js"));
    var valid_list = [];
    console.log("Modules sanity check:\n");
    let modules = await Promise.all<ModuleType & {module: string, error: string}>(files_list.map(async (val) => {
        try {
            return new (await import(`./modules/${val}`)).default()
        } catch (error) {
            return {module: val.match(/^(.*)\.js$/)[1], error: error.message || error.toString().substring(0, 200)};
        }
    }));
    for (let val of modules) {
        try {
            if(val instanceof ModuleFunctions && val.MODULE_ID){
                let valid = true;
                //check if config file exists
                if(!existsSync(`${process.cwd()}/configs/${val.MODULE_ID}.json`)){
                    if(val.chList){
                        await val.initializeConfig(val.chList);
                        console.log(`\n - Module '${val.MODULE_ID}' found`);
                        console.log(`\t${val.MODULE_ID} - initialised - Config file created!`);
                    }else if(val.getChannels?.constructor.name === "AsyncFunction") {
                        console.log(`\n - Module '${val.MODULE_ID}' found`);
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
                    console.log(`\n - Module '${val.MODULE_ID}' found`);
                    let auth = await val.getAuth();
                    ((auth.username && auth.password) === (null || undefined || "") && val.authReq) && console.log(`\t${val.MODULE_ID} - INFO - No Username/Password set`)
                    !val.login && val.logger('sanityCheck',`\t${val.MODULE_ID} - WARNING login method not implemented`)
                    if(val.hasLive && !val.liveChannels){
                        val.logger('sanityCheck',`\t${val.MODULE_ID} - WARNING hasLive true but liveChannels method not implemented`)
                        valid = false;
                    }
                    if(val.hasVOD && !val.getVOD){
                        val.logger('sanityCheck',`\t${val.MODULE_ID} - WARNING hasVOD true but getVOD method not implemented`)
                        valid = false;
                    }
                }
                valid && console.log(`\t${val.MODULE_ID} - No issues found`);
                
                valid && valid_list.push(val.MODULE_ID)
            }else console.log(` - Module '${val.module || val}' failed sanity check\n\t${val.error || `\0`}`);
        } catch (error) {
            console.error(`${error?.message || error}`);
            // return Promise.reject(error.message || error)
        }
    }
    return Promise.resolve(valid_list);
}

/**
 * It takes a m3u8 manifest and returns the highest bandwidth stream
 * @param data - The data from the m3u8 file
 * @param baseUrl - The base url of the m3u8 file.
 * @returns The highest bandwidth m3u8 file
 */
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

/**
 * It takes a m3u8 file and a url, and returns a m3u8 file with the urls fixed
 * @param m3u - The m3u8 file contents
 * @param url - The URL of the m3u8 file.
 * @returns the m3u file with the correct URLs.
 */
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

/**
 * It takes a link to a playlist, and returns a playlist with all the links fixed
 * @param link - The link to the playlist
 * @returns A string of the playlist
 */
export async function rewritePlaylist(stream: {stream: string, proxy?: string}): Promise<any> {
    let initData = (await axios.get(stream.stream)).data
    if(initData.includes('#EXTM3U')){
        let initm3u8 = initData.includes("\n") ? initData : (initData.split(" ")).join("\n")
        if(initm3u8.includes(".m3u8")){
            let q_m3u8 = await axios.get(m3u8Select(initm3u8, stream.stream.match(/(.*)\/.*/)[1]))
            let finalP = m3uFixURL(q_m3u8.data, q_m3u8.config.url.match(/(.*)\/.*/)[1])
            return finalP
        }else return m3uFixURL(initm3u8, stream.stream.match(/(.*)\/.*/)[1])
    }else {
        logger('rewritePlaylist',`"${stream.stream}" is not a HLS playlist`)
        return stream
    }
}


/**
 * It removes all cached links that are older than the url_update_interval specified in the module's config
 * @param {string[]} valid_modules - string[] - This is an array of all the modules that are valid.
 */
 export async function cacheCleanup(valid_modules: string[]): Promise<cache[]> {
    let modules: ModuleType[] = await Promise.all<ModuleType>(valid_modules.map(async val => new (await import(`./modules/${val}.js`)).default()));
    const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
    const db = new Low(adapter)
    await db.read();

    db.data ||= []

    let removed : cache[] = [];

    let cache_config = {}

    try {
        for(let mod of modules){
            if(mod instanceof ModuleFunctions){
                cache_config[mod.MODULE_ID] = (await mod.getConfig()).url_update_interval
            }
        }
        for (let index = 0; index < db.data.length; index++) {
            if((((new Date()).getTime() - (new Date(db.data[index].lastupdated)).getTime()) / (1000 * 3600)) >= (cache_config[db.data[index].module] || 6)){
                if(process.env.DEBUG == ('true' || true)){
                    logger('cacheCleanup',`Found cached link for '${db.data[index].name}' module '${db.data[index].module}' older than ${(cache_config[db.data[index].module] || 6)} hours, removing!`)
                }
                removed.push(db.data.splice(index, 1)[0])
                index--;
            }
        }
        if(removed.length > 0){
            await db.write();
            logger('cacheCleanup',`Removed ${removed.length} cached links over configured time limit`);
            return Promise.resolve(removed);
        }
    } catch (error) {
        logger('cacheCleanup',`Error cleaning up cache: ${error.message || error}`, true)
    }

}

/**
 * It searches for a channel in a module, if it doesn't find it, it searches for it in all modules
 * @param {string} id - The channel id
 * @param {string} module_id - The module ID of the module you want to search.
 * @param {string[]} valid_modules - An array of strings that are the names of the modules you want to
 * search through.
 * @returns A promise that resolves to a cache object
 */
export async function searchChannel(id: string, module_id: string, valid_modules: string[]): Promise<{data: cache['data'], module: string, cache: boolean}>{
    if(valid_modules.includes(module_id)){
        try {
            logger('searchChannel',`Searching for channel '${id}' in module '${module_id}'`)
            let module: ModuleType = new (await import(`./modules/${module_id}.js`)).default();
            // let file = existsSync(`${process.cwd()}/src/modules/${module_id}.json`) ? readFileSync(`${process.cwd()}/src/modules/${module_id}.json`).toString() : null;
            let config = await module.getConfig()
            let auth = await module.getAuth();
            if(config.chList[id]){
                logger('searchChannel',`Found channel '${id}' in module '${module_id}'`)
                // let file = existsSync(`${process.cwd()}/src/modules/${module_id}.json`) ? readFileSync(`${process.cwd()}/src/modules/${module_id}.json`).toString() : null
                // let parsed: config = file ? JSON.parse(file) : null;
                let cache = await module.cacheFind(id)
                if(cache !== null && config.url_cache_enabled){
                    logger('searchChannel',`Found cached link for channel '${id}' in module '${module_id}'`)
                    logger('searchChannel',`Cached link for channel '${id}' in module '${module_id}' is '${cache.data.stream}'`)
                    return await Promise.resolve({data: cache.data, module: module_id, cache: true})
                }else {
                    logger('searchChannel',`No cached link found for channel '${id}' in module '${module_id}', trying to retrieve from module`)
                    let data = await module.liveChannels(config.chList[id], auth.authTokens, auth.lastupdated)
                    await module.cacheFill(id, data)
                    return await Promise.resolve({data: data, module: module_id, cache: false});
                }
                
            }else {
                logger('searchChannel',`Channel '${id}' not found in module '${module_id}', updating list`)
                let get_ch = await module.getChannels()
                if(get_ch[id]){
                    logger('searchChannel',`Found channel '${id}' in module '${module_id}'`)
                    module.setConfig("chList", get_ch)
                    let cache = await module.cacheFind(id)
                    if(cache !== null && (await module.getConfig()).url_cache_enabled){
                        logger('searchChannel',`Found cached link for channel '${id}' in module '${module_id}'`)    
                        logger('searchChannel',`Cached link for channel '${id}' in module '${module_id}' is '${cache.data.stream}'`)
                        return await Promise.resolve({data: cache.data, module: module_id, cache: true})
                    }else {
                        logger('searchChannel',`No cached link found for channel '${id}' in module '${module_id}', trying to retrieve from module`)
                        let data  = await module.liveChannels(get_ch[id], auth.authTokens, auth.lastupdated)
                        await module.cacheFill(id, data)
                        return await Promise.resolve({data: data, module: module_id, cache: false});
                    }
                }else return await Promise.reject(new Error(`searchChannel| Module ${module_id} doesn't have channel '${id}'`))
            }
        } catch (error) {
            return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
        }
    }else {
        let modules : ModuleType[] = await Promise.all(valid_modules.map(async mod => new (await import(`./modules/${mod}.js`)).default()))
        for(let module of modules){
            try {
                logger('searchChannel',`Searching for channel '${id}' in module '${module.MODULE_ID}'`)
                let config = await module.getConfig()
                let auth = await module.getAuth();
                if(config?.chList[id]){
                    logger('searchChannel',`Found channel '${id}' in module '${module.MODULE_ID}'`)
                    let cache = await module.cacheFind(id)
                    if(cache !== null && config.url_cache_enabled){
                        logger('searchChannel',`Found cached link for channel '${id}' in module '${module.MODULE_ID}'`)
                        logger('searchChannel',`Cached link for channel '${id}' in module '${module.MODULE_ID}' is '${cache.data.stream}'`)
                        return Promise.resolve({data: cache.data, module: cache.module, cache: true})
                    }else {
                        logger('searchChannel',`${config.url_cache_enabled ? `No cached link found for channel '${id}' in` : "Cache not enabled for"} module '${module.MODULE_ID}'${config.url_cache_enabled ? `, trying to retrieve from module` : ""}`)
                        let data = await module.liveChannels(config.chList[id], auth.authTokens, auth.lastupdated)
                        await module.cacheFill(id, data)
                        return Promise.resolve({data: data, module: module.MODULE_ID, cache: false})
                    }
                }
            } catch (error) {
                logger('searchChannel',`Error searching channel '${id}' in module '${module.MODULE_ID}': ${error.message || error.toString().substring(0, 200)}`, true)
                // return Promise.reject(new Error(`searchChannel - ${error.message || error.toString().substring(0, 200)}`))
            }
        }
        return Promise.reject(new Error(`searchChannel - No module has channel '${id}'`))
    }
}
/**
 * It takes a module id, imports the module, checks if it has VOD, and if it does, it returns the VOD
 * list
 * @param {string} module_id - The module id of the module you want to get the VOD list from.
 * @returns A promise that resolves to an array of VOD objects
 */
export async function getVODlist(module_id: string){
    if(module_id){
        try {
            let module: ModuleType = new (await import(`./modules/${module_id}.js`)).default();
            if(module.hasVOD){
                return await Promise.resolve(await module.getVOD_List((await module.getAuth()).authTokens));
            }else return await Promise.reject(new Error(`getVODlist| Module ${module_id} doesn't have VOD available`))
        } catch (error) {
           return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
        }
    }else return await Promise.reject(new Error("No module id provided"))
}
/**
 * It gets the VOD of a show from a module
 * @param {string} module_id - The module id of the module you want to use.
 * @param {string} show_id - The show id of the show you want to get the VOD for
 * @param {string} [year] - The year of the VOD you want to get.
 * @param {string} [month] - The month of the year you want to get the VOD for.
 * @param {string} [season] - The season number of the show
 * @param {boolean} [showfilters] - boolean - If true, the module will return a list of filters that
 * can be used to filter the VOD.
 * @returns A promise that resolves to an VOD link
 */
export async function getVOD(module_id: string, show_id: string, year?: string, month?: string, season?: string, showfilters?: boolean){
    if(module_id){
        try {
            let module: ModuleType = new (await import(`./modules/${module_id}.js`)).default();
            if(module.hasVOD){
                let res = await module.getVOD(show_id, {authTokens: (await module.getAuth()).authTokens, year, month, season, showfilters});
                return await Promise.resolve(res);
            }else return await Promise.reject(new Error(`getVOD| Module ${module_id} doesn't have VOD available`))
        } catch (error) {
            return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
        }
    }else return await Promise.reject(new Error("No module id provided"))
}
/**
 * It gets the VOD episode from the module with the given module_id, show_id and epid
 * @param {string} module_id - The module id of the module you want to use.
 * @param {string} show_id - The show id of the show you want to get the episode from
 * @param {string} epid - The episode id
 * @returns A promise that resolves to a stream object
 */
export async function getVOD_EP(module_id: string, show_id: string, epid: string){
    if(module_id){
        try {
            let module: ModuleType = new (await import(`./modules/${module_id}.js`)).default();
            if(module.hasVOD){
                let cache = await module.cacheFind(epid)
                if(cache !== null && (await module.getConfig()).url_cache_enabled){
                    return await Promise.resolve(cache.data.stream)
                }else {
                    let res = await module.getVOD_EP(show_id, epid, (await module.getAuth()).authTokens);
                    await module.cacheFill(epid, {stream: res})
                    return await Promise.resolve(res);
                }
            }else return await Promise.reject(`getVOD_EP| Module ${module_id} doesn't have VOD available`)
        } catch (error) {
            return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
        }
    }else return await Promise.reject(new Error("No module id provided"))
}

/**
 * It takes in a module_id, username, and password, and returns a promise that resolves to the result
 * of the login function of the module with the given module_id
 * @param {string} module_id - The name of the module you want to use.
 * @param {string} username - The username of the account you want to login to
 * @param {string} password - The password of the user
 * @returns A promise that resolves to a boolean value.
 */
export async function login(module_id: string, username: string, password: string){
    try {
        if(username && password){
            let module: ModuleType = new (await import(`./modules/${module_id}.js`)).default();
            return await Promise.resolve(await module.login(username, password))
        }else throw new Error("No Username/Password provided")
    } catch (error) {
        return await Promise.reject(new Error(`${error.message || error.toString().substring(0, 200)}`))
    }
}

// module.exports = {sanityCheck, searchChannel, login, getVODlist, getVOD, getVOD_EP}