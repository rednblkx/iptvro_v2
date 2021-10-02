const express = require('express');

const modules = require('./loader')

const app = express();


const PORT = 3000;


app.get("/live/:channel", async (req,res) => {

    var body = {status: "", link: ""}

    try {
        body.status = "OK"
        body.link = await modules.searchChannel(req.params.channel)
        res.json(body);
    } catch (error) {
        body.status = "ERROR"
        body.link = null;
        body.error = error;
        res.json(body)
    }


})
app.get("/:module/live/:channel", (req,res) => {

    var body = {status: "", link: ""}

    try {
        if(req.params.module && modules.modules.includes(req.params.module)){
            body.status = "OK"
            body.link = modules.searchChannel(req.params.channel, req.params.module)
            res.json(body)
        }else {
            body.status = "ERROR"
            body.link = null;
            body.error = `Module ${req.params.module} not found`;
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
    
    var body = {status: "", link: ""}

    try {
        if(req.params.module && modules.modules.includes(req.params.module)){
            body.status = "OK"
            body.data = await modules.getVODlist(req.params.module)
            res.json(body)
        }else {
            body.status = "ERROR"
            body.data = null;
            body.error = `Module ${req.params.module} not found`;
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
    var body = {status: "", link: ""}

    try {
        if(req.params.module && modules.modules.includes(req.params.module)){
            body.status = "OK"
            body.data = await modules.getVOD(req.params.module, req.params.show, req.query.year, req.query.month)
            res.json(body)
        }else {
            body.status = "ERROR"
            body.data = null;
            body.error = `Module ${req.params.module} not found`;
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
    var body = {status: "", link: ""}

    try {
        if(req.params.module && modules.modules.includes(req.params.module)){
            body.status = "OK"
            body.link = await modules.getVOD_EP(req.params.module, req.params.show , req.params.epid)
            res.json(body)
        }else {
            body.status = "ERROR"
            body.link = null;
            body.error = `Module ${req.params.module} not found`;
            res.json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.link = null;
        body.error = error;
        res.json(body)
    }
})

app.post("/:module/login", express.urlencoded({extended: false}), async (req,res) => {
    let cookies;
    let body = {status: "", cookies: ""}
    let fs = require('fs');
    let file = fs.existsSync(`./modules/${req.params.module}.json`) ? fs.readFileSync(`./modules/${req.params.module}.json`).toString() : {auth : {username: req.body.username, password: req.body.password, cookies: null}, config: {}}
    let config = JSON.parse(file)
    try {
        if(modules.modules.includes(req.params.module)){
            cookies = await modules.login(req.params.module, req.body.username, req.body.password)
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
            body.error = `Module ${req.params.module} not found`
            res.json(body);
        }
    } catch (error) {
        body.status = "ERROR"
        body.cookies = null;
        body.error = error
        res.json(body)
    }
})

app.listen(PORT, () => { console.log(`This is working on port ${PORT}`)})