import express, {Request} from 'express';

import * as Loader from './loader.js';

import fs from 'fs';
import { AuthConfig, ModuleType } from './moduleClass.js';
import { JSONFile, Low } from 'lowdb';
import axios from 'axios';
import cors_proxy from 'cors-anywhere';
import { URL } from 'url'
import liveRoutes from './routes/liveChannels.js';

/* The below code is creating an instance of express. */
const app = express();

/* The below code is setting the port to 3000 if the environment variable PORT is not set. */
export const PORT = process.env.PORT || 3000;
const debug = process.env.DEBUG?.toLowerCase();

/* Telling the server to use the express.json() middleware. */
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.set("Access-Control-Allow-Origin", "*");
// try {
    /* Checking if the modules are valid. */
    export var valid_modules = await Loader.sanityCheck()
    await Loader.cacheCleanup(valid_modules);
    setInterval(async () => {
        await Loader.cacheCleanup(valid_modules);
    }, 1000 * 60 * 60);
// } catch (error) {
//     console.log(`${error.message || error}`);
// }

console.log(`\nValid modules: ${valid_modules}\n`);

if(debug === 'true') {
    console.log(`DEBUG env true, verbose enabled!\n`);
}

var moduleParam = (req: any, res, next) => {
    req.module = req.params.module;
    req.valid_modules = valid_modules;
    next();
}

/* The body_response class is a class that is used to create a response object that is sent back to the
client */
export class body_response {

    status: string;
    result: object | string;
    module: string;
    error: string;
    authTokens? : string[];

    constructor(status?: string, result?: object | string, error?: string, authTokens?: string[]){
        this.status = status;
        this.result = result;
        this.error = error;
        this.authTokens = authTokens;
    }
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
    if (debug === 'true') {
        console.log(`\x1b[47m\x1b[30mindex\x1b[0m - \x1b[35m${id}\x1b[0m: ${message}`);
    }
    return isError ? new Error(`\x1b[47m\x1b[30mindex\x1b[0m - \x1b[35m${id}\x1b[0m: ${message}`) : `\x1b[47m\x1b[30mindex\x1b[0m - \x1b[35m${id}\x1b[0m: ${message}`
};

/* A simple API that returns the cache of a module. */
app.get("/cache",async (req:Request<{}, {}, {}, {id: string, module: string}>, res) => {
    type cache = {
        name: string,
        link: string,
        module: string,
        lastupdated: Date
    };
    var body : body_response = new body_response();
    const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
    const db = new Low(adapter)
    await db.read();
    try {
        if(req.query.module){
            const module = new (await import(`./modules/${req.query.module}.js`)).default()
            logger("cache", req.query.id ? `cache requested for id '${req.query.id}' on module '${req.query.module}'` : `cache requested for module ${req.query.module}`);
            const cacheAll = db.data && db.data.filter(a => req.query.id ? a.name === req.query.id && a.module === module.MODULE_ID : a.module === module.MODULE_ID);
            logger("cache", `cacheAll: ${JSON.stringify(cacheAll)}`);
            body.status = "SUCCESS";
            body.result = cacheAll;
            res.json(body)
        }else {
            logger("cache", `cache requested for all modules`);
            let cacheid = req.query.id ? db.data.find(a => a.name === req.query.id) : db.data
            logger("cache", `cacheid: ${JSON.stringify(cacheid)}`);
            body.status = "SUCCESS";
            body.result = cacheid;
            res.json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.error = error.message || error.toString().substring(0, 200);
        res.status(500).json(body)
        
    }
})

app.use(`/:module(${valid_modules.join("|")})/live`, moduleParam, liveRoutes);

/* A simple API endpoint that returns a list of VODs for a given module. */
app.get(`/:module(${valid_modules.join("|")})/vod`,async (req,res) => {
    
    var body : body_response = new body_response();

    try {
        logger("vod", `VODs requested for module '${req.params.module}'`);
        body.status = "SUCCESS";
        body.result = await Loader.getVODlist(req.params.module)
        if(!body.result)
            throw "No data received from method!"
        res.json(body)
    } catch (error) {
        body.status = "ERROR"
        body.error = error.message || error.toString().substring(0, 200);
        res.status(500).json(body)
    }
})

/* A simple API endpoint that returns the episodes list for the VOD requested. */
app.get(`/:module(${valid_modules.join("|")})/vod/:show`, async (req:Request<{module: string, show: string}, {}, {}, {year: string, month: string, season: string, showfilters: boolean}>,res) => {
    var body : body_response = new body_response();

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            logger("vod", `VOD '${req.params.show}' requested for module '${req.params.module}'`);
            body.status = "SUCCESS";
            body.result = await Loader.getVOD(req.params.module, req.params.show, req.query.year, req.query.month, req.query.season, req.query.showfilters)
            if(!body.result)
                throw "No data received from method!"
            res.json(body)
        }else {
            body.status = "ERROR"
            body.error = `Module '${req.params.module}' not found`;
            res.status(400).json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.error = error.message || error.toString().substring(0, 200);
        res.status(500).json(body)
    }
})

/* A simple API endpoint that returns the episode for the VOD requested. */
app.get(`/:module(${valid_modules.join("|")})/vod/:show/:epid`, async (req,res) => {
    var body : body_response = new body_response();

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            logger("vod", `VOD '${req.params.show}' episode '${req.params.epid}' requested for module '${req.params.module}'`);
            body.status = "SUCCESS";
            body.result = await Loader.getVOD_EP(req.params.module, req.params.show , req.params.epid)
            if(!body.result)
                throw "No data received from method!"
            res.json(body)
        }else {
            body.status = "ERROR"
            body.result = null;
            body.error = `Module '${req.params.module}' not found`;
            res.status(400).json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.result = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.status(500).json(body)
    }
})

/* A login endpoint for the API. It is using the module login function to get the authTokens. */
app.post(`/:module(${valid_modules.join("|")})/login`, async (req: Request<{module: string}, {}, {username: string, password: string}, {}>,res) => {
    let authTokens = [];
    let body: body_response = new body_response();
    logger("login", `login request for module '${req.params.module}'`);
    try {
        let mod : ModuleType = new (await import(`./modules/${req.params.module}.js`)).default()
        let config = await mod.getAuth();
        logger("login", `'${req.params.module}' login attempt with username ${req.body.username ? req.body.username + "from request" : config.username + "from file (request empty)"}`)
        authTokens = await Loader.login(req.params.module, req.body.username || config.username, req.body.password || config.password)
        if(authTokens){
            logger("login", `'${req.params.module}' login success, got authTokens: ${authTokens}`)
            config.authTokens = authTokens;
            config.lastupdated = new Date();
            mod.setAuth(config);
            body.status = "SUCCESS";
            body.authTokens = authTokens;
            res.json(body);
        }else {
            body.status = "ERROR"
            body.authTokens = null;
            body.error = `Authentication failed for module '${req.params.module}'`;
            res.status(400).json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.authTokens = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.status(500).json(body)
    }
})

/* A route that will flush the cache of a module. */
app.get(`/:module(${valid_modules.join("|")})?/clearcache`, async (req,res) => {
    var body : body_response = new body_response();

    try {
        if(req.params.module){
            logger("clearcache", `Flush cache request for module '${req.params.module}'`);
            let module: ModuleType = new (await import(`./modules/${req.params.module}.js`)).default();
            body.status = "SUCCESS";
            body.result = await module.flushCache();
            res.json(body)
        } else {
            logger("flushcache", `Flush cache request for all modules`);
            let modules : ModuleType[] = await Promise.all(valid_modules.map(async mod => new (await import(`./modules/${mod}.js`)).default()))
            body.status = "SUCCESS";
            body.result = {};
            for(let module of modules){
                body.result[module.MODULE_ID] = await module.flushCache();
            }
            res.json(body)
        }
    } catch (error) {
        body.status = "ERROR"
        body.error = error.message || error.toString().substring(0, 200);
        res.status(500).json(body)
    }
})

/* A route that updates the channel list for a module. */
app.get(`/:module(${valid_modules.join("|")})?/updatechannels`, async (req,res) => {
    var body : body_response = new body_response();

    try {
        if(req.params.module){
            logger("updatechannels", `Update channels request for module '${req.params.module}'`);
            let mod: ModuleType = new (await import(`./modules/${req.params.module}.js`)).default();
            body.status = "SUCCESS";
            body.result = await mod.getChannels()
            if(!body.result)
                throw "No data received from method!"
            //save config
            await mod.setConfig('chList', body.result)
            //log to console
            logger("updatechannels", `Channels updated for module '${req.params.module}'`)
            res.json(body)
        }else {
            logger("updatechannels", `Update channels request for all modules`);
            let mod: ModuleType[] = await Promise.all(valid_modules.map(async val => new (await import(`./modules/${val}.js`)).default()))
            let updated = []
            for(let module of mod){
                let ch = await module.getChannels()
                ch && updated.push(module.MODULE_ID)
                //save config
                ch && await module.setConfig('chList', ch)
            }
            if(updated.length > 0){
                body.status = "SUCCESS";
                body.result = `Channel list updated for modules '${updated.join(',')}'`
                res.json(body)
            } else throw "Channel list could not be updated for all modules"
        }
    } catch (error) {
        body.status = "ERROR";
        body.error = error.message || error.substring(0, error.toString().indexOf("\n"))
        res.status(500).json(body);
    }
})

/* A simple API endpoint that returns the module's configuration. */
app.get(`/:module(${valid_modules.join("|")})`, async (req,res) => {
    var body : body_response = new body_response();
    try {
        let mod: ModuleType = new (await import(`./modules/${req.params.module}.js`)).default();
        body.result = {hasLive: mod.hasLive, hasVOD: mod.hasVOD, chList: (await mod.getConfig()).chList}
        res.json(body);
    } catch (error) {
        body.status = "ERROR"
        body.error = error.message || error.toString().substring(0, 200);
        res.status(400).json(body)
    }
})

/* A catch all route that will return a 404 error with a list of all available modules */
app.get("/**", (_,res) => {
    var body : body_response = new body_response();
    body.status = "ERROR"
    body.error = "Endpoint did not match any route, listing all available modules: " + valid_modules.join(", ");
    res.status(404).json(body)
})

/* The below code is creating a server that listens for requests on port 3000. */
app.listen(PORT, () => { console.log(`Listening for requests on port ${PORT}\n`)})


// Listen on a specific host via the HOST environment variable
var host = '0.0.0.0';
// Listen on a specific port via the PORT environment variable
var port = 8080;

cors_proxy.createServer({
    originWhitelist: [], // Allow all origins
    // requireHeader: ['referer'],
    // removeHeaders: ['cookie', 'cookie2']
    addHeaders: ["User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36"]
}).listen(port, host, function() {
   logger('cors_proxy','Running CORS Anywhere on ' + host + ':' + port);
});