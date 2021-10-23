import Module from "./modules/moduleClass";

const modules = ["antena", "pro"]
function sanityCheck(){
    var valid = [];
    console.log("Modules sanity check:\n");
    modules.forEach(val => {
        try {
            let module: Module = require(`./modules/${val}`);
            console.log(` - Module '${module.MODULE_ID}' is present`)
            valid.push(val)
        } catch (error) {
            let n = error.toString().indexOf('\n')
            console.error(`Loader| Something went wrong loading module ${val} - ${error.toString().substring(0, n != -1 ? n : error.length)}`);
        }
    })
    return valid;
}


async function searchChannel(id: string, module_id: string, valid_modules: [string]){
    var tries = 0;
    if(module_id){
        try {
            let module: Module = require(`./modules/${module_id}`);
            if(module.chList.includes(id)){
                let file = require('fs').existsSync(`./modules/${module_id}.json`) ? require('fs').readFileSync(`./modules/${module_id}.json`).toString() : null
                let parsed = file ? JSON.parse(file) : null;
                return await Promise.resolve(await module.liveChannels(id, parsed ? parsed.auth.cookies : null, parsed ? parsed.auth.lastupdated : null));
            }else return await Promise.reject(`Loader| Module ${module_id} doesn't have channel '${id}'`)
        } catch (error) {
            return await Promise.reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, 200)}`)
        }
    }else {
        valid_modules.forEach(async val => {
            try {
                let module: Module = require(`./modules/${val}`);
                if(module.chList.includes(id)){
                    let file = require('fs').existsSync(`./modules/${val}.json`) ? require('fs').readFileSync(`./modules/${val}.json`).toString() : null
                    let parsed = file ? JSON.parse(file) : null
                    return await Promise.resolve(await module.liveChannels(id, parsed ? parsed.auth.cookies : null))
                }else tries++
            } catch (error) {
                return await Promise.reject(`Loader| Something went wrong with the module ${val} - ${error.toString().substring(0, 200)}`)
            }
        })
        if(tries === valid_modules.length){
            return await Promise.reject(`Loader| No module has channel '${id}'`)
        }
    }
}
async function getVODlist(module_id: string){
    if(module_id){
        try {
            let module: Module = require(`./modules/${module_id}`);
            if(module.hasVOD){
                let file = require('fs').readFileSync(`./modules/${module_id}.json`).toString()
                let cookies = JSON.parse(file);
                return await Promise.resolve(await module.getVOD_List(cookies.auth.cookies));
            }else return await Promise.reject(`Loader| Module ${module_id} doesn't have VOD available`)
        } catch (error) {
           return await Promise.reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, 200)}`)
        }
    }else return await Promise.reject("No module id provided")
}
async function getVOD(module_id: string, show_id: string, year, month){
    if(module_id){
        try {
            let module: Module = require(`./modules/${module_id}`);
            if(module.hasVOD){
                let file = require('fs').readFileSync(`./modules/${module_id}.json`).toString()
                let cookies = JSON.parse(file);
                let res = await module.getVOD(show_id, cookies.auth.cookies, year, month);
                return await Promise.resolve(res);
            }else return await Promise.reject(`Loader| Module ${module_id} doesn't have VOD available`)
        } catch (error) {
            return await Promise.reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, 200)}`)
        }
    }else return await Promise.reject("No module id provided")
}
async function getVOD_EP(module_id: string, show_id: string, epid: string){
    if(module_id){
        try {
            let module: Module = require(`./modules/${module_id}`);
            if(module.hasVOD){
                let file = require('fs').readFileSync(`./modules/${module_id}.json`).toString()
                let cookies = JSON.parse(file);
                let res = await module.getVOD_EP(show_id, epid, cookies.auth.cookies);
                return await Promise.resolve(res);
            }else return await Promise.reject(`Loader| Module ${module_id} doesn't have VOD available`)
        } catch (error) {
            return await Promise.reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, 200)}`)
        }
    }else return await Promise.reject("No module id provided")
}

async function login(module_id: string, username: string, password: string){
    try {
        let module: Module = require(`./modules/${module_id}`);
        return await Promise.resolve(await module.login(username, password))
    } catch (error) {
        return await Promise.reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, 200)}`)
    }
}


module.exports = {modules, sanityCheck, searchChannel, login, getVODlist, getVOD, getVOD_EP}