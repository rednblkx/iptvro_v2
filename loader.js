const modules = ["antena", "pro"]

// modules.forEach(val => {
//     var module = require(`./modules/${val}`);
//     console.log(`${module.MODULE_ID} is present`)
// })

async function searchChannel(id, module){
    var module_id;
    return new Promise(async (resolve, reject) => {
        if(module){
            try {
                let module = require(`./modules/${module}`);
                module_id = module.Properties.MODULE_ID;
                if(module.Properties.chList.includes(id)){
                    let file = require('fs').readFileSync(`./modules/${module_id}.json`).toString()
                    let cookies = JSON.parse(file);
                    resolve(await module.liveChannels(id, cookies.auth.cookies));
                }
            } catch (error) {
                n = error.toString().indexOf('\n')
                reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, n != -1 ? n : error.length)}`)
            }
        }else {
            modules.forEach(async val => {
                try {
                    let module = require(`./modules/${val}`);
                    module_id = module.Properties.MODULE_ID;
                    if(module.Properties.chList.includes(id)){
                        let file = require('fs').readFileSync(`./modules/${module_id}.json`).toString()
                        let cookies = JSON.parse(file)
                        resolve(await module.liveChannels(id, cookies.auth.cookies))
                    }
                } catch (error) {
                    n = error.toString().indexOf('\n')
                    reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, n != -1 ? n : error.length)}`)
                }
            })
        }
    })
}
async function getVODlist(module_id){
    // var module_id;
    return new Promise(async (resolve, reject) => {
        if(module){
            try {
                let module = require(`./modules/${module_id}`);
                // module_id = module.Properties.MODULE_ID;
                if(module.Properties.hasVOD){
                    let file = require('fs').readFileSync(`./modules/${module_id}.json`).toString()
                    let cookies = JSON.parse(file);
                    resolve(await module.getVOD(cookies.auth.cookies));
                }
            } catch (error) {
                n = error.toString().indexOf('\n')
                reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, n != -1 ? n : error.length)}`)
            }
        }else reject("No module id provided")
    })
}
async function getVOD(module_id, show_id, year, month){
    // var module_id;
    return new Promise(async (resolve, reject) => {
        if(module){
            try {
                let module = require(`./modules/${module_id}`);
                // module_id = module.Properties.MODULE_ID;
                if(module.Properties.hasVOD){
                    let file = require('fs').readFileSync(`./modules/${module_id}.json`).toString()
                    let cookies = JSON.parse(file);
                    let res = await module.getShow(show_id, cookies.auth.cookies, year, month);
                    resolve(res);
                }
            } catch (error) {
                n = error.toString().indexOf('\n')
                reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, n != -1 ? n : error.length)}`)
            }
        }else reject("No module id provided")
    })
}
async function getVOD_EP(module_id, show_id, epid){
    // var module_id;
    return new Promise(async (resolve, reject) => {
        if(module){
            try {
                let module = require(`./modules/${module_id}`);
                // module_id = module.Properties.MODULE_ID;
                if(module.Properties.hasVOD){
                    let file = require('fs').readFileSync(`./modules/${module_id}.json`).toString()
                    let cookies = JSON.parse(file);
                    let res = await module.getEpisode(show_id, epid, cookies.auth.cookies);
                    resolve(res);
                }
            } catch (error) {
                n = error.toString().indexOf('\n')
                reject(`Loader| Something went wrong with the module ${module_id} - ${error.toString().substring(0, n != -1 ? n : error.length)}`)
            }
        }else reject("No module id provided")
    })
}

async function login(module_id, username, password){
    var module;

    return new Promise(async (resolve, reject) => {
        try {
            module = require(`./modules/${module_id}`);
            // module_id = module.Properties.MODULE_ID;
            resolve(await module.login(username, password))
        } catch (error) {
            n = error.toString().indexOf('\n')
            reject(`Loader| Something went wrong with the module ${module.Properties.MODULE_ID} - ${error.toString().substring(0, n != -1 ? n : error.length)}`)
        }
    })
}


module.exports = {modules,searchChannel, login, getVODlist, getVOD, getVOD_EP}