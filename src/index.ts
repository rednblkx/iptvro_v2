import express, {Request} from 'express';

import * as modules from './loader.js';

import fs from 'fs';
import Module from './moduleClass.js';

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

try {
    var valid_modules = await modules.sanityCheck()
} catch (error) {
    console.log(`${error.message || error}`);
}


console.log(`\nValid modules: ${valid_modules}\n`);

if(process.env.DEBUG == ('true' || true)){
    console.log(`DEBUG env true, verbose enabled!\n`);
}

const debug = process.env.DEBUG;

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

type config = {
    auth: {
        username: string;
        password: string;
        authTokens: string[];
        lastupdated: Date;
    }
    config: {
        cache_enabled: boolean;
        cachetime: number;
        chList: string[];
    }
}

function logger(id, message, isError?) {
    if(debug){
      console.log(`index - ${id}: ${message}`);
    }
    return isError ? new Error(`index - ${id}: ${message}`) : `index - ${id}: ${message}`
  };

app.get("/:module", async (req,res) => {
    var body : body_response = new body_response("", "");
    try {
        if(valid_modules.find(x => x == req.params.module) != undefined){
            let mod: Module = (await import(`${process.cwd()}/modules/${req.params.module}.js`)).default;
            // let file = fs.existsSync(`${process.cwd()}/modules/${req.params.module}.json`) && fs.readFileSync(`${process.cwd()}/modules/${req.params.module}.json`).toString();
            // let parsed = JSON.parse(file)
            // console.log(parsed);
            body.status = "OK"
            body.data = {hasLive: mod.hasLive, hasVOD: mod.hasVOD, chList: mod.getConfig().chList}
            res.json(body);
        } else throw "Invalid Module ID"
    } catch (error) {
        body.status = "ERROR"
        body.data = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.json(body)
    }
})

app.get("/live/:channel", async (req,res) => {

    var body: body_response = new body_response("", "");

    try {
        body.status = "OK"
        body.data = await modules.searchChannel(req.params.channel, null, valid_modules)
        res.json(body);
    } catch (error) {
        body.status = "ERROR"
        body.data = null;
        body.error = error.message || error.toString().substring(0, 200);
        res.json(body)
    }


})
app.get("/:module/live/:channel", async (req,res) => {

    var body : body_response = new body_response("", "");

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            body.status = "OK"
            body.data = await modules.searchChannel(req.params.channel, req.params.module, valid_modules)
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

app.get("/:module/live", async (req,res) => {
    var body : body_response = new body_response("", "");

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            let file = fs.existsSync(`${process.cwd()}/modules/${req.params.module}.json`) && fs.readFileSync(`${process.cwd()}/modules/${req.params.module}.json`).toString()
            let parsed = JSON.parse(file)
            body.status = "OK"
            body.data = parsed.hasOwnProperty('config') && parsed.config.chList;
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

app.get("/:module/vod", async (req,res) => {
    
    var body : body_response = new body_response("", "");

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            body.status = "OK"
            body.data = await modules.getVODlist(req.params.module)
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

interface QueryVOD {
    year: string,
    month: string,
    season: string,
    showfilters: boolean
}

interface ParamsVOD {
    module: string,
    show: string
}

app.get("/:module/vod/:show", async (req:Request<ParamsVOD, {}, {}, QueryVOD>,res) => {
    var body : body_response = new body_response("", "");

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            body.status = "OK"
            body.data = await modules.getVOD(req.params.module, req.params.show, req.query.year, req.query.month, req.query.season, req.query.showfilters)
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
app.get("/:module/vod/:show/:epid", async (req,res) => {
    var body : body_response = new body_response("", "");

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            body.status = "OK"
            body.data = await modules.getVOD_EP(req.params.module, req.params.show , req.params.epid)
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

app.post("/:module/login", async (req,res) => {
    let authTokens;
    let body: body_response = new body_response("", "");
    try {
        let file = fs.existsSync(`${process.cwd()}/modules/${req.params.module}.json`) ? fs.readFileSync(`${process.cwd()}/modules/${req.params.module}.json`).toString() : {auth : {username: req.body.username, password: req.body.password, authTokens: null}, config: {}}
        let config : config = typeof file === "object" ? file : JSON.parse(file)
        req.body.username ? logger("login", `'${req.params.module}' login attempt with username "${req.body.username}" from request`) : logger("login", `'${req.params.module}' login attempt with username ${config.auth.username} from file (request empty)`)
        if(valid_modules.find(x => x == req.params.module) != undefined){
            authTokens = await modules.login(req.params.module, req.body.username || config.auth.username, req.body.password || config.auth.password)
            if(authTokens){
                logger("login", `'${req.params.module}' login success, got authTokens`)
                body.status = "OK";
                body.authTokens = authTokens;
                config.auth.authTokens = authTokens;
                config.auth.lastupdated = new Date();
                fs.writeFileSync(`${process.cwd()}/modules/${req.params.module}.json`, JSON.stringify(config))
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

app.get("/:module/flushcache", async (req,res) => {
    var body : body_response = new body_response("", "");

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            body.status = "OK"
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

app.get("/:module/updatechannels", async (req,res) => {
    var body : body_response = new body_response("", "");

    try {
        if(req.params.module && valid_modules.find(x => x == req.params.module) != undefined){
            let mod: Module = (await import(`${process.cwd()}/modules/${req.params.module}.js`)).default;
            body.status = "OK"
            body.data = await mod.getChannels()
            //save config
            mod.setConfig('chList', body.data)
            //log to console
            console.log(`Channels updated for module '${req.params.module}'`)
            res.json(body)
        }else {
            body.status = "ERROR"
            body.data = null;
            body.error = `Module '${req.params.module}' not found`;
            res.json(body);
        }
    } catch (error) {
        let n = error.toString().indexOf('\n');
        body.status = "ERROR"
        body.data = null;
        body.error = error.message || error
        res.json(body)
    }
})

app.get("/**", (_,res) => {
    var body : body_response = new body_response("", "");
    body.status = "ERROR"
    body.data = valid_modules;
    body.error = "Endpoint did not match any route, listing all available modules";
    res.status(404).json(body)
})

app.listen(PORT, () => { console.log(`Listening for requests on port ${PORT}`)})