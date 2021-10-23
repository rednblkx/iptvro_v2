import Module from "./moduleClass";
import { readdirSync, existsSync, readFileSync } from "fs";
import { extname } from 'path';
import Realm = require("realm");

class CacheSchema {
    public static schema: Realm.ObjectSchema = {
        name: "Cache",
        properties: {
          _id: "objectId",
          name: "string",
          link: "string",
          module: "string",
          lastupdated: "date"
        },
      };
    public _id: Realm.BSON.ObjectId;
    public name: string;
    public link: string;
    public module: string;
    public lastupdated: Date;
}

var instance: Realm = new Realm({
    path: "cache.realm",
    schema: [CacheSchema.schema]
});

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
    }
}

function getConfig(module_id: string, key: string){
    let file = existsSync(`${__dirname}/../modules/${module_id}.json`) ? readFileSync(`${__dirname}/../modules/${module_id}.json`).toString() : null
    let parsed: config = file ? JSON.parse(file) : null;
    if(parsed === null){
        throw "Config file is not valid"
    }else {
        return parsed.config[key]
    }
}

export function sanityCheck(){
    instance.close()
    
    let files_list = readdirSync(__dirname + "/../modules");
    var list = files_list.filter(a => extname(a) === ".js" );
    var valid = [];
    console.log("Modules sanity check:\n");

    list.forEach(val => {
        try {
            let module: Module = require(`../modules/${val}`);
            if(module.MODULE_ID){
                console.log(` - Module '${module.MODULE_ID}' is present`)
                valid.push(module.MODULE_ID)
            }else throw "Module not valid"
        } catch (error) {
            let n = error.toString().indexOf('\n')
            console.error(`sanityCheck | Something went wrong loading module ${val} - ${error.toString().substring(0, n != -1 ? n : error.length)}`);
        }
    })
    return valid;
}


function cacheFind(id, module_id){
    try {
        instance = new Realm({
            path: "cache.realm",
            schema: [CacheSchema.schema]
        });
        const cache: Realm.Results<CacheSchema> = instance.objects<CacheSchema>("Cache").filtered(`name == '${id}' and module == '${module_id}'`);
        // console.log(JSON.stringify(cache));
        let cachetime = getConfig(module_id, 'cachetime')
        if(cache[0]){
            if((((new Date()).getTime() - (new Date(cache[0].lastupdated)).getTime()) / (1000 * 3600)) <= cachetime ? cachetime : 6){
                let found = cache[0].link;
                if(process.env.DEBUG == ('true' || true)){
                    console.log(`cacheFind | Cached link found for '${id}', module '${module_id}', lastudpated on '${cache[0].lastupdated}'`);
                }
                instance.close();
                return found
            }else return null
        } else return null
    } catch (error) {
        let n = error.toString().indexOf('\n')
        console.error(`cacheFind | ${error.toString().substring(0, n != -1 ? n : error.length)}`);
    }
}

function cacheFill(id, module_id, link){
    try {
        instance = new Realm({
            path: "cache.realm",
            schema: [CacheSchema.schema]
        });
        
        let cache = instance.write(() => {
            const cache: Realm.Results<CacheSchema> = instance.objects<CacheSchema>("Cache").filtered(`name == '${id}' and module == '${module_id}'`);
            instance.delete(cache);
            instance.create("Cache", {
                _id: new Realm.BSON.ObjectID,
                name: id,
                link: link,
                module: module_id,
                lastupdated: new Date()
            })
        })
        instance.close();
        return cache
    } catch (error) {
        let n = error.toString().indexOf('\n')
        console.error(`cacheFill | ${error.toString().substring(0, n != -1 ? n : error.length)}`);
    }
}

export async function searchChannel(id: string, module_id: string, valid_modules: string[]){
    var tries = 0;
    if(module_id){
        try {
            let module: Module = require(`../modules/${module_id}`);
            if(module.chList.includes(id)){
                let file = existsSync(`${__dirname}/../modules/${module_id}.json`) ? readFileSync(`${__dirname}/../modules/${module_id}.json`).toString() : null
                let parsed: config = file ? JSON.parse(file) : null;
                let cache = cacheFind(id, module_id)
                if(cache !== null && getConfig(module_id, 'cache_enabled')){
                    return await Promise.resolve(cache)
                }else {
                    let link = await module.liveChannels(id, parsed ? parsed.auth.cookies : null, parsed ? parsed.auth.lastupdated : null)
                    cacheFill(id, module_id, link)
                    return await Promise.resolve(link);
                }
                
            }else return await Promise.reject(`Module ${module_id} doesn't have channel '${id}'`)
        } catch (error) {
            return await Promise.reject(`searchChannel| Something went wrong with the module ${module_id} - ${error.toString().substring(0, 200)}`)
        }
    }else {
        return new Promise((resolve, reject) => {
            valid_modules.some(async val => {
                try {
                    let module: Module = require(`${__dirname}/../modules/${val}`);
                    if(module.chList.includes(id)){
                        let file = existsSync(`${__dirname}/../modules/${val}.json`) ? readFileSync(`${__dirname}/../modules/${val}.json`).toString() : null
                        let parsed: config = file ? JSON.parse(file) : null
                        let cache = cacheFind(id, val)
                        if(cache !== null && getConfig(val, 'cache_enabled')){
                            resolve(cache)
                        }else {
                            let link = await module.liveChannels(id, parsed ? parsed.auth.cookies : null, parsed ? parsed.auth.lastupdated : null)
                            cacheFill(id, val, link)
                            resolve(link)
                        }
                        return true;
                    }else tries++
                } catch (error) {
                    reject(`searchChannel| Something went wrong with the module ${val} - ${error.toString().substring(0, 200)}`)
                }
            })
            if(tries === valid_modules.length){
                reject(`searchChannel| No module has channel '${id}'`)
            }
        })
    }
}
export async function getVODlist(module_id: string){
    if(module_id){
        try {
            let module: Module = require(`${__dirname}/../modules/${module_id}`);
            if(module.hasVOD){
                let file = readFileSync(`${__dirname}/../modules/${module_id}.json`).toString()
                let cookies: config = JSON.parse(file);
                return await Promise.resolve(await module.getVOD_List(cookies.auth.cookies));
            }else return await Promise.reject(`getVODlist| Module ${module_id} doesn't have VOD available`)
        } catch (error) {
           return await Promise.reject(`getVODlist| Something went wrong with the module ${module_id} - ${error.toString().substring(0, 200)}`)
        }
    }else return await Promise.reject("No module id provided")
}
export async function getVOD(module_id: string, show_id: string, year, month){
    if(module_id){
        try {
            let module: Module = require(`${__dirname}/../modules/${module_id}`);
            if(module.hasVOD){
                let file = readFileSync(`${__dirname}/../modules/${module_id}.json`).toString()
                let cookies: config = JSON.parse(file);
                let res = await module.getVOD(show_id, cookies.auth.cookies, year, month);
                return await Promise.resolve(res);
            }else return await Promise.reject(`getVOD| Module ${module_id} doesn't have VOD available`)
        } catch (error) {
            return await Promise.reject(`getVOD| Something went wrong with the module ${module_id} - ${error.toString().substring(0, 200)}`)
        }
    }else return await Promise.reject("No module id provided")
}
export async function getVOD_EP(module_id: string, show_id: string, epid: string){
    if(module_id){
        try {
            let module: Module = require(`${__dirname}/../modules/${module_id}`);
            if(module.hasVOD){
                let file = readFileSync(`${__dirname}/../modules/${module_id}.json`).toString()
                let cookies: config = JSON.parse(file);
                let cache = cacheFind(epid, module_id)
                if(cache !== null && getConfig(module_id, "cache_enabled")){
                    return await Promise.resolve(cache)
                }else {
                    let res = await module.getVOD_EP(show_id, epid, cookies.auth.cookies);
                    cacheFill(epid, module_id, res)
                    return await Promise.resolve(res);
                }
            }else return await Promise.reject(`getVOD_EP| Module ${module_id} doesn't have VOD available`)
        } catch (error) {
            return await Promise.reject(`getVOD_EP| Something went wrong with the module ${module_id} - ${error.toString().substring(0, 200)}`)
        }
    }else return await Promise.reject("No module id provided")
}

export async function login(module_id: string, username: string, password: string){
    try {
        if(username !== ('' || null || undefined) && password !== ('' || null || undefined)){
            let module: Module = require(`${__dirname}/../modules/${module_id}`);
            return await Promise.resolve(await module.login(username, password))
        }else throw "No Username/Password provided"
    } catch (error) {
        return await Promise.reject(`login| Something went wrong with the module ${module_id} - ${error.toString().substring(0, 200)}`)
    }
}


// module.exports = {sanityCheck, searchChannel, login, getVODlist, getVOD, getVOD_EP}