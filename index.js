const express = require('express');

const modules = require('./src/loader')

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

var valid_modules = modules.sanityCheck()

console.log(`\nValid modules: ${valid_modules}\n`);

if(process.env.DEBUG == ('true' || true)){
    console.log(`DEBUG env true, verbose enabled!\n`);
}

app.get("/live/:channel", async (req,res) => {

    var body = {};

    try {
        body.status = "OK"
        body.link = await modules.searchChannel(req.params.channel, null, valid_modules)
        res.json(body);
    } catch (error) {
        body.status = "ERROR"
        body.link = null;
        body.error = error;
        res.json(body)
    }


})
app.get("/:module/live/:channel", async (req,res) => {

    var body = {};

    try {
        if(req.params.module && valid_modules.includes(req.params.module)){
            body.status = "OK"
            body.link = await modules.searchChannel(req.params.channel, req.params.module)
            res.json(body)
        }else {
            body.status = "ERROR"
            body.link = null;
            body.error = `Module '${req.params.module}' not found`;
            res.json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.link = null;
        body.error = error;
        res.json(body)
    }

})

app.get("/:module/vod", async (req,res) => {
    
    var body = {};

    try {
        if(req.params.module && valid_modules.includes(req.params.module)){
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
        body.error = error;
        res.json(body)
    }
})
app.get("/:module/vod/:show", async (req,res) => {
    var body = {};

    try {
        if(req.params.module && valid_modules.includes(req.params.module)){
            body.status = "OK"
            body.data = await modules.getVOD(req.params.module, req.params.show, req.query.year, req.query.month)
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
        body.error = error;
        res.json(body)
    }
})
app.get("/:module/vod/:show/:epid", async (req,res) => {
    var body = {};

    try {
        if(req.params.module && valid_modules.includes(req.params.module)){
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
        body.error = error;
        res.json(body)
    }
})

app.post("/:module/login", async (req,res) => {
    let cookies;
    let body = {};
    let fs = require('fs');
    try {
        let file = fs.existsSync(`./modules/${req.params.module}.json`) ? fs.readFileSync(`./modules/${req.params.module}.json`).toString() : {auth : {username: req.body.username, password: req.body.password, cookies: null, lastupdated: new Date()}, config: {}}
        let config = typeof file === "object" ? file : JSON.parse(file)
        if(valid_modules.includes(req.params.module)){
            cookies = await modules.login(req.params.module, req.body.username ? req.body.username : config.auth.username, req.body.password ? req.body.password : config.auth.password)
            if(cookies){
                body.status = "OK";
                body.cookies = cookies;
                config.auth.cookies = cookies;
                require('fs').writeFileSync(`./modules/${req.params.module}.json`, JSON.stringify(config))
                res.json(body);
            }else {
                body.status = "ERROR"
                body.cookies = null;
                body.error = `Authentication cookies could not be retrieved for module ${req.params.module}`
                res.json(body);
            }
        }else {
            body.status = "ERROR"
            body.cookies = null;
            body.error = `Module '${req.params.module}' not found`
            res.json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.cookies = null;
        body.error = error.message ? error.message : error
        res.json(body)
    }
})

app.listen(PORT, () => { console.log(`Now accepting requests to API on port ${PORT}`)})