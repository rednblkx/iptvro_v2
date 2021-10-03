const modules = ["antena", "pro"]
function sanityCheck(){
    var valid = [];
    console.log("Modules sanity check:\n");
    modules.forEach(val => {
        try {
            valid_modules = [];
            var module = require(`./modules/${val}`);
            console.log(` - Module '${module.MODULE_ID}' is present`)
            valid.push(val)
        } catch (error) {
            n = error.toString().indexOf('\n')
            console.error(`Loader| Something went wrong loading module ${val} - ${error.toString().substring(0, n != -1 ? n : error.length)}`);
        }
    })
    return valid;
}


async function searchChannel(id, module_id, valid_modules){
    return new Promise(async (resolve, reject) => {
        var tries = 0;
        if(module_id){
            try {
                let module = require(`./modules/${module_id}`);
                if(module.chList.includes(id)){
                    let file = require('fs').readFileSync(`./modules/${module_id}.json`).toString()
                    let cookies = JSON.parse(file);
                    resolve(await module.liveChannels(id, cookies.auth.cookies));
                }else reject(`Loader| Module ${module_id} doesn't have channel '${id}'`)
            } catch (error) {
                n = error.toString().indexOf('\n')
                reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, n != -1 ? n : error.length)}`)
            }
        }else {
            valid_modules.forEach(async val => {
                try {
                    let module = require(`./modules/${val}`);
                    if(module.chList.includes(id)){
                        let file = require('fs').existsSync(`./modules/${val}.json`) ? require('fs').readFileSync(`./modules/${val}.json`).toString() : null
                        let cookies = file ? JSON.parse(file) : null
                        resolve(await module.liveChannels(id, cookies ? cookies.auth.cookies : null))
                    }else tries++
                } catch (error) {
                    n = error.toString().indexOf('\n')
                    reject(`Loader| Something went wrong with the module ${val} - ${error.toString().substring(0, n != -1 ? n : error.length)}`)
                }
            })
            if(tries === valid_modules.length){
                reject(`Loader| No module has channel '${id}'`)
            }
        }
    })
}
async function getVODlist(module_id){
    return new Promise(async (resolve, reject) => {
        if(module_id){
            try {
                let module = require(`./modules/${module_id}`);
                if(module.hasVOD){
                    let file = require('fs').readFileSync(`./modules/${module_id}.json`).toString()
                    let cookies = JSON.parse(file);
                    resolve(await module.getVOD_List(cookies.auth.cookies));
                }else reject(`Loader| Module ${module_id} doesn't have VOD available`)
            } catch (error) {
                n = error.toString().indexOf('\n')
                reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, n != -1 ? n : error.length)}`)
            }
        }else reject("No module id provided")
    })
}
async function getVOD(module_id, show_id, year, month){
    return new Promise(async (resolve, reject) => {
        if(module_id){
            try {
                let module = require(`./modules/${module_id}`);
                if(module.hasVOD){
                    let file = require('fs').readFileSync(`./modules/${module_id}.json`).toString()
                    let cookies = JSON.parse(file);
                    let res = await module.getVOD(show_id, cookies.auth.cookies, year, month);
                    resolve(res);
                }else reject(`Loader| Module ${module_id} doesn't have VOD available`)
            } catch (error) {
                n = error.toString().indexOf('\n')
                reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, n != -1 ? n : error.length)}`)
            }
        }else reject("No module id provided")
    })
}
async function getVOD_EP(module_id, show_id, epid){
    return new Promise(async (resolve, reject) => {
        if(module_id){
            try {
                let module = require(`./modules/${module_id}`);
                if(module.hasVOD){
                    let file = require('fs').readFileSync(`./modules/${module_id}.json`).toString()
                    let cookies = JSON.parse(file);
                    let res = await module.getVOD_EP(show_id, epid, cookies.auth.cookies);
                    resolve(res);
                }else reject(`Loader| Module ${module_id} doesn't have VOD available`)
            } catch (error) {
                n = error.toString().indexOf('\n')
                reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, n != -1 ? n : error.length)}`)
            }
        }else reject("No module id provided")
    })
}

async function login(module_id, username, password){
    return new Promise(async (resolve, reject) => {
        try {
            let module = require(`./modules/${module_id}`);
            resolve(await module.login(username, password))
        } catch (error) {
            n = error.toString().indexOf('\n')
            reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, n != -1 ? n : error.length)}`)
        }
    })
}


module.exports = {modules, sanityCheck, searchChannel, login, getVODlist, getVOD, getVOD_EP}