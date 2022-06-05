import express, {Request} from 'express';

import * as modules from './loader.js';

import fs from 'fs';
import { AuthConfig, ModuleType } from './moduleClass.js';
import { JSONFile, Low } from 'lowdb';

/* The below code is creating an instance of express. */
const app = express();

/* The below code is setting the port to 3000 if the environment variable PORT is not set. */
const PORT = process.env.PORT || 3000;

/* Telling the server to use the express.json() middleware. */
app.use(express.json());

// try {
    /* Checking if the modules are valid. */
    var valid_modules = await modules.sanityCheck()
// } catch (error) {
//     console.log(`${error.message || error}`);
// }


console.log(`\nValid modules: ${valid_modules}\n`);

if(process.env.DEBUG){
    console.log(`DEBUG env true, verbose enabled!\n`);
}

/* Checking if the environment variable DEBUG is set to true. */
const debug = process.env.DEBUG;

/* The body_response class is a class that is used to create a response object that is sent back to the
client */
class body_response {

    status: string;
    data: object | string;
    error: string;
    authTokens? : string[];

    constructor(status: string, data: object | string, error?: string, authTokens?: string[]){
        this.status = status;
        this.data = data;
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
function logger(id: string, message: string, isError?: boolean) {
    if(debug){
      console.log(`index - ${id}: ${message}`);
    }
    return isError ? new Error(`index - ${id}: ${message}`) : `index - ${id}: ${message}`
  };

/* A simple API that returns the cache of a module. */
app.get("/cache/:module?",async (req:Request<{module: string}, {}, {}, {id: string}>, res) => {
    type cache = {
        name: string,
        link: string,
        module: string,
        lastupdated: Date
    };
    const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
    const db = new Low(adapter)
    await db.read();
    if(req.params.module){
        const module = new (await import(`${process.cwd()}/src/modules/${req.params.module}.js`)).default()
        const cacheAll = db.data && db.data.filter(a => req.query.id ? a.name === req.query.id && a.module === module.MODULE_ID : a.module === module.MODULE_ID);
        res.json(cacheAll)
    }else {
        let cacheid = req.query.id ? db.data.find(a => a.name === req.query.id) : db.data
        res.json(cacheid);
    }
})

/* A simple API that returns a stream URL for a given channel. */
app.get("/:module?/live/:channel/:ts?", async (req:Request<{module?: string, channel: string, ts?: string}, {}, {}, {}>,res) => {

    var body : body_response = new body_response("OK", null);

    try {
        if(req.params.module){
            if(valid_modules.find(x => x == req.params.module) != undefined){
                if(req.params.ts){
                    res.send(await modules.rewritePlaylist((await modules.searchChannel(req.params.channel, req.params.module, valid_modules)).stream))
                } else {
                    body.data = await modules.searchChannel(req.params.channel, req.params.module, valid_modules)
                    if(!body.data)
                        throw "No data received from method!"
                    res.json(body)
                }
            }else {
                body.status = "ERROR"
                body.data = null;
                body.error = `Module '${req.params.module}' not found`;
                res.json(body);
            }
        } else {
            try {
                if(req.params.ts){
                    res.send(await modules.rewritePlaylist((await modules.searchChannel(req.params.channel, null, valid_modules)).stream))
                } else {
                    body.data = await modules.searchChannel(req.params.channel, null, valid_modules)
                    if(!body.data)
                        throw "No data received from method!"
                    res.json(body);
                }
            } catch (error) {
                body.status = "ERROR"
                body.data = null;
                body.error = error.message || error.toString().substring(0, 200);
                res.json(body)
            }
        }
    } catch (error) {
        body.status = "ERROR"
        body.data = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.json(body)
    }

})

/* A simple GET request that returns the live channels of a module. */
app.get("/:module/live", async (req,res) => {
    var body : body_response = new body_response("OK", null);

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            let file = fs.existsSync(`${process.cwd()}/src/modules/${req.params.module}.json`) && fs.readFileSync(`${process.cwd()}/src/modules/${req.params.module}.json`).toString()
            let parsed = JSON.parse(file)
            body.data = parsed.hasOwnProperty('config') && parsed.config.chList;
            if(!body.data)
                throw "No data received from method!"
            res.json(body)
        }else {
            body.status = "ERROR"
            body.data = null;
            body.error = `Module '${req.params.module}' not found`;
            res.json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.data = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.json(body)
    }
})

/* A simple API endpoint that returns a list of VODs for a given module. */
app.get("/:module/vod", async (req,res) => {
    
    var body : body_response = new body_response("OK", null);

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            body.data = await modules.getVODlist(req.params.module)
            if(!body.data)
                throw "No data received from method!"
            res.json(body)
        }else {
            body.status = "ERROR"
            body.data = null;
            body.error = `Module '${req.params.module}' not found`;
            res.json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.data = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.json(body)
    }
})

/* Defining an interface called QueryVOD. */
interface QueryVOD {
    year: string,
    month: string,
    season: string,
    showfilters: boolean
}

/* Defining an interface called ParamsVOD. */
interface ParamsVOD {
    module: string,
    show: string
}

/* A simple API endpoint that returns a JSON object. */
app.get("/:module/vod/:show", async (req:Request<ParamsVOD, {}, {}, QueryVOD>,res) => {
    var body : body_response = new body_response("OK", null);

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            body.data = await modules.getVOD(req.params.module, req.params.show, req.query.year, req.query.month, req.query.season, req.query.showfilters)
            if(!body.data)
                throw "No data received from method!"
            res.json(body)
        }else {
            body.status = "ERROR"
            body.data = null;
            body.error = `Module '${req.params.module}' not found`;
            res.json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.data = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.json(body)
    }
})
/* A route for the API. */
/* A route handler for the route /api/v1/vod/:module/:show/:epid */
app.get("/:module/vod/:show/:epid", async (req,res) => {
    var body : body_response = new body_response("OK", null);

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            body.data = await modules.getVOD_EP(req.params.module, req.params.show , req.params.epid)
            if(!body.data)
                throw "No data received from method!"
            res.json(body)
        }else {
            body.status = "ERROR"
            body.data = null;
            body.error = `Module '${req.params.module}' not found`;
            res.json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.data = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.json(body)
    }
})

/* A login endpoint for the API. It is using the module login function to get the authTokens. */
app.post("/:module/login", async (req,res) => {
    let authTokens = [];
    let body: body_response = new body_response("OK", null);
    try {
        let file = fs.existsSync(`${process.cwd()}/src/modules/${req.params.module}.json`) ? fs.readFileSync(`${process.cwd()}/src/modules/${req.params.module}.json`).toString() : {auth : {username: req.body.username, password: req.body.password, authTokens: null}, config: {}}
        let config : AuthConfig = typeof file === "object" ? file : JSON.parse(file)
        req.body.username ? logger("login", `'${req.params.module}' login attempt with username "${req.body.username}" from request`) : logger("login", `'${req.params.module}' login attempt with username ${config.auth.username} from file (request empty)`)
        if(valid_modules.find(x => x == req.params.module) != undefined){
            authTokens = await modules.login(req.params.module, req.body.username || config.auth.username, req.body.password || config.auth.password)
            if(authTokens){
                logger("login", `'${req.params.module}' login success, got authTokens`)
                body.authTokens = authTokens;
                config.auth.authTokens = authTokens;
                config.auth.lastupdated = new Date();
                fs.writeFileSync(`${process.cwd()}/src/modules/${req.params.module}.json`, JSON.stringify(config))
                res.json(body);
            }else {
                body.status = "ERROR"
                body.authTokens = null;
                body.error = `Authentication failed for module '${req.params.module}'`;
                res.json(body);
            }
        }else {
            body.status = "ERROR"
            body.authTokens = null;
            body.error = `Module '${req.params.module}' not found`
            res.json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.authTokens = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.json(body)
    }
})

/* A route that will flush the cache of a module. */
app.get("/:module/flushcache", async (req,res) => {
    var body : body_response = new body_response("OK", null);

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            body.data = modules.flushCache(req.params.module)
            res.json(body)
        }else {
            body.status = "ERROR"
            body.data = null;
            body.error = `Module '${req.params.module}' not found`;
            res.json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.data = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.json(body)
    }
})

/* A route that updates the channel list for a module. */
app.get("/:module?/updatechannels", async (req,res) => {
    var body : body_response = new body_response("OK", null);

    try {
        if(req.params.module){
            if(valid_modules.find(x => x == req.params.module) != undefined){
                let mod: ModuleType = new (await import(`${process.cwd()}/src/modules/${req.params.module}.js`)).default();
                body.data = await mod.getChannels()
                if(!body.data)
                    throw "No data received from method!"
                //save config
                mod.setConfig('chList', body.data)
                //log to console
                mod.logger("index - updatechannels", `Channels updated for module '${req.params.module}'`)
                res.json(body)
            }else {
                body.status = "ERROR"
                body.data = null;
                body.error = `Module '${req.params.module}' not found`;
                res.json(body);
            }
        }else {
            try {
                let mod: ModuleType[] = await Promise.all(valid_modules.map(async val => new (await import(`${process.cwd()}/src/modules/${val}.js`)).default()))
                let updated = []
                for(let module of mod){
                    let ch = await module.getChannels()
                    ch && updated.push(module.MODULE_ID)
                    //save config
                    ch && await module.setConfig('chList', ch)
                }
                if(updated.length > 0){
                    body.data = `Channel list updated for modules '${updated.join(',')}'`
                    //log to console
                    // console.log(`Channels updated for module '${req.params.module}'`)
                    res.json(body)
                } else throw "Channel list could not be updated for all modules"
            } catch(err) {
                body.status = "ERROR"
                body.data = null;
                body.error = err;
                res.json(body);
            }
        }
    } catch (error) {
        let n = error.toString().indexOf('\n');
        body.status = "ERROR"
        body.data = null;
        body.error = error.message || error
        res.json(body)
    }
})

/* A simple API endpoint that returns the module's configuration. */
app.get("/:module", async (req,res) => {
    var body : body_response = new body_response("OK", null);
    try {
        if(valid_modules.find(x => x == req.params.module) != undefined){
            let mod: ModuleType = new (await import(`${process.cwd()}/src/modules/${req.params.module}.js`)).default();
            // let file = fs.existsSync(`${process.cwd()}/src/modules/${req.params.module}.json`) && fs.readFileSync(`${process.cwd()}/src/modules/${req.params.module}.json`).toString();
            // let parsed = JSON.parse(file)
            // console.log(parsed);
            body.data = {hasLive: mod.hasLive, hasVOD: mod.hasVOD, chList: (await mod.getConfig()).chList}
            res.json(body);
        } else throw "Invalid Module ID"
    } catch (error) {
        body.status = "ERROR"
        body.data = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.json(body)
    }
})

/* A catch all route that will return a 404 error with a list of all available modules */
app.get("/**", (_,res) => {
    var body : body_response = new body_response("OK", null);
    body.status = "ERROR"
    body.error = "Endpoint did not match any route, listing all available modules: " + valid_modules.join(", ");
    res.status(404).json(body)
})

/* The below code is creating a server that listens for requests on port 3000. */
app.listen(PORT, () => { console.log(`Listening for requests on port ${PORT}`)})