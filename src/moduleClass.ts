import { existsSync, readFileSync, writeFile, writeFileSync } from "fs";

type AuthConfig = {
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
};

class ModuleFunctions {

    MODULE_ID: string;
    hasLive: boolean;
    hasVOD: boolean;
    chList: string[];
    qualitiesList: string[];
    liveChannels: Function;
    login: Function;
    getVOD: Function;
    getVOD_List: Function;
    getVOD_EP: Function;
    getVOD_EP_List: Function;
    getChannels: Function;
    debug: boolean;

    initializeConfig(chList?: string[]){
        var config = {
          "auth": {
              "username": "",
              "password": "",
              "authTokens": null
          },
          "config": {
              "cache_enabled": true,
              "cachetime": 6,
              "chList": chList || []
          }
        }
        //write config to file
        writeFileSync(`${process.cwd()}/modules/${this.MODULE_ID}.json`, JSON.stringify(config, null, 2));
        //log config
        console.log(`initializeConfig| Config file created for module '${this.MODULE_ID}'`);
    };

    getAuth(): AuthConfig['auth'] {
        let file = existsSync(`${process.cwd()}/modules/${this.MODULE_ID}.json`) ? readFileSync(`${process.cwd()}/modules/${this.MODULE_ID}.json`).toString() : null
        let parsed : AuthConfig = file ? JSON.parse(file) : null;
        if(!parsed){
            throw "getAuth - Config file is not valid"
        }else {
            return parsed.auth;
        }
    }

    setAuth(auth: {username: string, password: string, authTokens: string[], lastupdated: Date}){
        let file = existsSync(`${process.cwd()}/modules/${this.MODULE_ID}.json`) ? readFileSync(`${process.cwd()}/modules/${this.MODULE_ID}.json`).toString() : null
        let parsed : AuthConfig = file ? JSON.parse(file) : null;
        if(!parsed){
            throw "setAuth - Config file is not valid"
        }else {
            parsed.auth = auth;
            writeFile(`${process.cwd()}/modules/${this.MODULE_ID}.json`, JSON.stringify(parsed, null, 2), () => {
                console.log(`${this.MODULE_ID} | config file updated - credentials changed`);
            });
        }
    }

    getConfig(): AuthConfig['config'] {
        let file = existsSync(`${process.cwd()}/modules/${this.MODULE_ID}.json`) ? readFileSync(`${process.cwd()}/modules/${this.MODULE_ID}.json`).toString() : null
        let parsed : AuthConfig = file ? JSON.parse(file) : null;
        if(!parsed){
            throw "getConfig - Config file is not valid"
        }else {
            return parsed.config
        }
    };

    setConfig(key: string, value: any){
        let file = existsSync(`${process.cwd()}/modules/${this.MODULE_ID}.json`) ? readFileSync(`${process.cwd()}/modules/${this.MODULE_ID}.json`).toString() : null
        let parsed : AuthConfig = file ? JSON.parse(file) : null;
        if(!parsed){
            throw "setConfig - Config file is not valid"
        }else {
            parsed.config[key] = value;
            writeFile(`${process.cwd()}/modules/${this.MODULE_ID}.json`, JSON.stringify(parsed, null, 2), () => {
                console.log(`${this.MODULE_ID} | config file updated - ${key} changed`);
            });
        }
    };

    logger(id: string, message: string, isError?: boolean) : string | Error {
        if(this.debug){
          console.log(`${this.MODULE_ID} - ${id}: ${message}`);
        }
        return isError ? new Error(`${this.MODULE_ID} - ${id}: ${message}`) : `${this.MODULE_ID} - ${id}: ${message}`
      };
    
    constructor(MODULE_ID: string, hasLive: boolean, hasVOD: boolean, chList?: string[], qualitiesList?: string[]){
        this.MODULE_ID = MODULE_ID;
        this.hasLive = hasLive;
        this.hasVOD = hasVOD;
        this.chList = chList || null;
        this.qualitiesList = qualitiesList || null;
        this.liveChannels = dummy;
        this.login = dummy;
        this.getVOD = dummy;
        this.getVOD_List = dummy;
        this.getVOD_EP = dummy;
        this.getVOD_EP_List = dummy;
        this.getChannels = dummy;
        this.debug = (process.env.DEBUG?.toLowerCase() === 'true');

        function dummy(): string {
            return "dummy function"
        }

    }
}

export default ModuleFunctions;