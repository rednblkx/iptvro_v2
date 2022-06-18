import express, {Request} from 'express';

import * as Loader from './loader.js';

import fs from 'fs';
import { AuthConfig, ModuleType } from './moduleClass.js';
import { JSONFile, Low } from 'lowdb';
import axios from 'axios';
import cors_proxy from 'cors-anywhere';
import {URL} from 'url'

/* The below code is creating an instance of express. */
const app = express();

/* The below code is setting the port to 3000 if the environment variable PORT is not set. */
const PORT = process.env.PORT || 3000;
const debug = process.env.DEBUG?.toLowerCase();

/* Telling the server to use the express.json() middleware. */
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));
// try {
    /* Checking if the modules are valid. */
    var valid_modules = await Loader.sanityCheck()
// } catch (error) {
//     console.log(`${error.message || error}`);
// }

console.log(`\nValid modules: ${valid_modules}\n`);

if(debug === 'true') {
    console.log(`DEBUG env true, verbose enabled!\n`);
}


/* The body_response class is a class that is used to create a response object that is sent back to the
client */
class body_response {

    status: string;
    result: object | string;
    module: string;
    error: string;
    authTokens? : string[];

    constructor(result?: object | string, error?: string, authTokens?: string[]){
        this.status = "SUCCESS";
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
            const module = new (await import(`${process.cwd()}/src/modules/${req.query.module}.js`)).default()
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
        res.status(502).json(body)
        
    }
})

/* A simple API that returns a stream URL for a given channel. */
app.get("/live/:channel/:player(player)?", async (req:Request<{channel: string, player?: string}, {}, {}, {module: string, proxy?: string}>,res) => {

    var body : body_response = new body_response();

    try {
        if(req.query.module){
            if(valid_modules.find(x => x == req.query.module) != undefined){
                if(req.query.proxy){
                    logger("live", `live stream requested for channel '${req.params.channel}' on module '${req.query.module}' with parameter proxy`);
                    let data = await Loader.searchChannel(req.params.channel, req.query.module, valid_modules);
                    logger("live", `data: ${JSON.stringify(data)}`);
                    let rewrite = await Loader.rewritePlaylist(data.data)
                    logger("live", `rewrite: ${JSON.stringify(rewrite)}`);
                    res.set("Content-Type", "application/x-mpegURL");
                    if(req.params.player == "player"){
                        logger("live", `live stream requested for channel '${req.params.channel}' with parameters player and proxy`);
                        let checkRedirect = await axios.get(data.data.stream);
                        let redir = checkRedirect.request.res.responseUrl !== data.data.stream ? checkRedirect.request.res.responseUrl : data.data.stream;
                        if(checkRedirect.request.res.responseUrl !== data.data.stream)
                            logger("live", `redirected to '${redir}' from '${data.data.stream}'`);
                        res.render('player', { stream: `http://localhost:8080/${redir}`, proxy: data.data.proxy, origin: (new URL(redir)).hostname })
                    }else {
                        res.send(rewrite)
                    }
                } else {
                    logger("live", `live stream requested for channel '${req.params.channel}' on module '${req.query.module}'`);
                    let data = await Loader.searchChannel(req.params.channel, req.query.module, valid_modules);
                    body.status = "SUCCESS";
                    body.result = data.data;
                    body.module = data.module;
                    if(!body.result)
                        throw "No data received from method!"
                    if(req.params.player == "player"){
                        let checkRedirect = await axios.get(data.data.stream);
                        let redir = checkRedirect.request.res.responseUrl !== data.data.stream ? checkRedirect.request.res.responseUrl : data.data.stream;
                        if(checkRedirect.request.res.responseUrl !== data.data.stream)
                            logger("live", `redirected to '${redir}' from '${data.data.stream}'`);
                        logger("live", `live stream requested for channel '${req.params.channel}' with parameter player`);
                        res.render('player', { stream: `http://localhost:8080/${redir}`, proxy: data.data.proxy, origin: (new URL(redir)).hostname })
                    }else {
                        res.json(body);
                    }
                }
            }else {
                body.status = "ERROR"
                body.error = `Module '${req.query.module}' not found`;
                res.status(400).json(body);
            }
        } else {
            try {
                if(req.query.proxy){
                    logger("live", `live stream requested for channel '${req.params.channel}' with parameter proxy`);
                    let data = await Loader.rewritePlaylist((await Loader.searchChannel(req.params.channel, null, valid_modules)).data);
                    if(req.params.player == "player"){
                        logger("live", `live stream requested for channel '${req.params.channel}' with parameter player and proxy`);
                        let checkRedirect = await axios.get(data.stream);
                        let redir = checkRedirect.request.res.responseUrl !== data.stream ? checkRedirect.request.res.responseUrl : data.stream;
                        if(checkRedirect.request.res.responseUrl !== data.stream)
                            logger("live", `redirected to '${redir}' from '${data.stream}'`);
                        res.render('player', { stream: `http://localhost:8080/${redir}`, proxy: data.data.proxy, origin: (new URL(redir)).hostname })
                    }else {
                        res.send(data.stream)
                    }
                } else {
                    logger("live", `live stream requested for channel '${req.params.channel}'`);
                    let data = await Loader.searchChannel(req.params.channel, null, valid_modules);
                    body.status = "SUCCESS";
                    body.result = data.data;
                    body.module = data.module;
                    if(!body.result)
                        throw "No data received from method!"
                    if(req.params.player == "player"){
                        logger("live", `live stream requested for channel '${req.params.channel}' with player`);
                        let checkRedirect = await axios.get(data.data.stream);
                        let redir = checkRedirect.request.res.responseUrl !== data.data.stream ? checkRedirect.request.res.responseUrl : data.data.stream;
                        if(checkRedirect.request.res.responseUrl !== data.data.stream)
                            logger("live", `redirected to '${redir}' from '${data.data.stream}'`);
                        res.render('player', { stream: `http://localhost:8080/${redir}`, proxy: data.data.proxy, origin: (new URL(redir)).hostname })
                    }else {
                        res.json(body);
                    }
                }
            } catch (error) {
                body.status = "ERROR"
                body.error = error.message || error.toString().substring(0, 200);
                res.status(400).json(body)
            }
        }
    } catch (error) {
        body.status = "ERROR"
        body.error = error.message || error.toString().substring(0, 200);
        res.status(502).json(body)
    }

})

/* A simple GET request that returns the live channels of a module. */
app.get("/:module/live", async (req,res) => {
    var body : body_response = new body_response();

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            logger("live", `live channels requested for module '${req.params.module}'`);
            let mod: ModuleType = new (await import(`${process.cwd()}/src/modules/${req.params.module}.js`)).default();
            body.status = "SUCCESS";
            body.result = (await mod.getConfig()).chList;
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
        res.status(502).json(body)
    }
})

/* A simple API endpoint that returns a list of VODs for a given module. */
app.get("/:module/vod", async (req,res) => {
    
    var body : body_response = new body_response();

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            logger("vod", `VODs requested for module '${req.params.module}'`);
            body.status = "SUCCESS";
            body.result = await Loader.getVODlist(req.params.module)
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
        res.status(502).json(body)
    }
})

/* A simple API endpoint that returns the episodes list for the VOD requested. */
app.get("/:module/vod/:show", async (req:Request<{module: string, show: string}, {}, {}, {year: string, month: string, season: string, showfilters: boolean}>,res) => {
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
        res.status(502).json(body)
    }
})

/* A simple API endpoint that returns the episode for the VOD requested. */
app.get("/:module/vod/:show/:epid", async (req,res) => {
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
        res.status(502).json(body)
    }
})

/* A login endpoint for the API. It is using the module login function to get the authTokens. */
app.post("/:module/login", async (req: Request<{module: string}, {}, {username: string, password: string}, {}>,res) => {
    let authTokens = [];
    let body: body_response = new body_response();
    try {
        logger("login", `login request for module '${req.params.module}'`);
        let file = fs.existsSync(`${process.cwd()}/src/modules/${req.params.module}.json`) ? fs.readFileSync(`${process.cwd()}/src/modules/${req.params.module}.json`).toString() : {auth : {username: req.body.username, password: req.body.password, authTokens: null}, config: {}}
        let config : AuthConfig = typeof file === "object" ? file : JSON.parse(file)
        req.body.username ? logger("login", `'${req.params.module}' login attempt with username "${req.body.username}" from request`) : logger("login", `'${req.params.module}' login attempt with username ${config.auth.username} from file (request empty)`)
        if(valid_modules.find(x => x == req.params.module) != undefined){
            authTokens = await Loader.login(req.params.module, req.body.username || config.auth.username, req.body.password || config.auth.password)
            if(authTokens){
                logger("login", `'${req.params.module}' login success, got authTokens: ${authTokens}`)
                body.status = "SUCCESS";
                body.authTokens = authTokens;
                config.auth.authTokens = authTokens;
                config.auth.lastupdated = new Date();
                fs.writeFileSync(`${process.cwd()}/src/modules/${req.params.module}.json`, JSON.stringify(config))
                res.json(body);
            }else {
                body.status = "ERROR"
                body.authTokens = null;
                body.error = `Authentication failed for module '${req.params.module}'`;
                res.status(400).json(body);
            }
        }else {
            body.status = "ERROR"
            body.authTokens = null;
            body.error = `Module '${req.params.module}' not found`
            res.status(400).json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.authTokens = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.status(502).json(body)
    }
})

/* A route that will flush the cache of a module. */
app.get("/flushcache", async (req,res) => {
    var body : body_response = new body_response();

    try {
        if(req.query.module){
            if(valid_modules.find(x => x == req.query.module) != undefined){
                logger("flushcache", `Flush cache request for module '${req.query.module}'`);
                let module: ModuleType = new (await import(`${process.cwd()}/src/modules/${req.query.module}.js`)).default();
                body.status = "SUCCESS";
                body.result = await module.flushCache();
                res.json(body)
            } else {
                body.status = "ERROR"
                body.error = `Module '${req.query.module}' not found`;
                res.status(400).json(body);
            }
        } else {
            logger("flushcache", `Flush cache request for all modules`);
            let modules : ModuleType[] = await Promise.all(valid_modules.map(async mod => new (await import(`${process.cwd()}/src/modules/${mod}.js`)).default()))
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
        res.status(502).json(body)
    }
})

/* A route that updates the channel list for a module. */
app.get("/updatechannels", async (req,res) => {
    var body : body_response = new body_response();

    try {
        if(req.query.module){
            if(valid_modules.find(x => x == req.query.module) != undefined){
                logger("updatechannels", `Update channels request for module '${req.query.module}'`);
                let mod: ModuleType = new (await import(`${process.cwd()}/src/modules/${req.query.module}.js`)).default();
                body.status = "SUCCESS";
                body.result = await mod.getChannels()
                if(!body.result)
                    throw "No data received from method!"
                //save config
                await mod.setConfig('chList', body.result)
                //log to console
                logger("updatechannels", `Channels updated for module '${req.query.module}'`)
                res.json(body)
            }else {
                body.status = "ERROR";
                body.error = `Module '${req.query.module}' not found`;
                res.status(400).json(body);
            }
        }else {
            try {
                logger("updatechannels", `Update channels request for all modules`);
                let mod: ModuleType[] = await Promise.all(valid_modules.map(async val => new (await import(`${process.cwd()}/src/modules/${val}.js`)).default()))
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
            } catch(err) {
                body.status = "ERROR";
                body.error = err;
                res.status(400).json(body);
            }
        }
    } catch (error) {
        let n = error.toString().indexOf('\n');
        body.status = "ERROR";
        body.error = error.message || error
        res.status(502).json(body)
    }
})

/* A simple API endpoint that returns the module's configuration. */
app.get("/:module", async (req,res) => {
    var body : body_response = new body_response();
    try {
        if(valid_modules.find(x => x == req.params.module) != undefined){
            let mod: ModuleType = new (await import(`${process.cwd()}/src/modules/${req.params.module}.js`)).default();
            body.result = {hasLive: mod.hasLive, hasVOD: mod.hasVOD, chList: (await mod.getConfig()).chList}
            res.json(body);
        } else throw "Invalid Module ID"
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
    // requireHeader: ['origin', 'x-requested-with'],
    // removeHeaders: ['cookie', 'cookie2']
}).listen(port, host, function() {
   logger('cors_proxy','Running CORS Anywhere on ' + host + ':' + port);
});