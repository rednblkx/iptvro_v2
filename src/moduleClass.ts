import { existsSync, readFileSync, writeFile } from "fs";

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
        chList: string[];
    }
}
class Module {

    MODULE_ID: string;
    hasLive: boolean;
    hasVOD: boolean;
    chList: string[];
    qualitiesList: string[];
    initializeConfig: Function;
    liveChannels: Function;
    login: Function;
    getVOD: Function;
    getVOD_List: Function;
    getVOD_EP: Function;
    getVOD_EP_List: Function;
    getChannels: Function;
    getConfig: Function;
    setConfig: Function;
    getAuth: Function;
    setAuth: Function;
    
    constructor(MODULE_ID: string, hasLive: boolean, hasVOD: boolean, chList: string[], qualitiesList?: string[]){
        this.MODULE_ID = MODULE_ID;
        this.hasLive = hasLive;
        this.hasVOD = hasVOD;
        this.chList = chList;
        this.qualitiesList = qualitiesList;
        this.liveChannels = dummy;
        this.login = dummy;
        this.getVOD = dummy;
        this.getVOD_List = dummy;
        this.getVOD_EP = dummy;
        this.getVOD_EP_List = dummy;
        this.getChannels = dummy;
        this.initializeConfig = async function initializeConfig(){
            var config = {
              "auth": {
                  "username": "",
                  "password": "",
                  "cookies": null
              },
              "config": {
                  "cache_enabled": true,
                  "cachetime": 6,
                  "chList": null
              }
            }
            //write config to file
            writeFile(`${__dirname}/../modules/${MODULE_ID}.json`, JSON.stringify(config, null, 2), () => {
                console.log(`${MODULE_ID} config file created`);
                return config;
            });
        };

        this.getAuth = function getAuth(){
            let file = existsSync(`${__dirname}/../modules/${MODULE_ID}.json`) ? readFileSync(`${__dirname}/../modules/${MODULE_ID}.json`).toString() : null
            let parsed : config = file ? JSON.parse(file) : null;
            if(parsed === null){
                throw "Config file is not valid"
            }else {
                return parsed.auth;
            }
        }

        this.setAuth = function setAuth(auth: {username: string, password: string, cookies: string[], lastupdated: Date}){
            let file = existsSync(`${__dirname}/../modules/${MODULE_ID}.json`) ? readFileSync(`${__dirname}/../modules/${MODULE_ID}.json`).toString() : null
            let parsed : config = file ? JSON.parse(file) : null;
            if(parsed === null){
                throw "Config file is not valid"
            }else {
                parsed.auth = auth;
                writeFile(`${__dirname}/../modules/${MODULE_ID}.json`, JSON.stringify(parsed, null, 2), () => {
                    console.log(`${MODULE_ID} | config file updated - credentials changed`);
                });
            }
        }

        this.getConfig = function getConfig(key: string){
            let file = existsSync(`${__dirname}/../modules/${MODULE_ID}.json`) ? readFileSync(`${__dirname}/../modules/${MODULE_ID}.json`).toString() : null
            let parsed : config = file ? JSON.parse(file) : null;
            if(parsed === null){
                throw "Config file is not valid"
            }else {
                return parsed.config[key]
            }
        };

        this.setConfig = function setConfig(key: string, value: any){
            let file = existsSync(`${__dirname}/../modules/${MODULE_ID}.json`) ? readFileSync(`${__dirname}/../modules/${MODULE_ID}.json`).toString() : null
            let parsed : config = file ? JSON.parse(file) : null;
            if(parsed === null){
                throw "Config file is not valid"
            }else {
                parsed.config[key] = value;
                writeFile(`${__dirname}/../modules/${MODULE_ID}.json`, JSON.stringify(parsed, null, 2), () => {
                    console.log(`${MODULE_ID} | config file updated`);
                });
            }
        };

        function dummy(): string {
            return "dummy function"
        }

    }
}

export default Module;