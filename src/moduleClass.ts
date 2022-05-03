import { existsSync, readFileSync, writeFile, writeFileSync } from "fs";
import { Low, JSONFile } from 'lowdb'

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
        this.logger("initializeConfig",'Config file created');
    };

    async getAuth(): Promise<AuthConfig['auth']> {
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/modules/${this.MODULE_ID}.json`)
        const db = new Low(adapter)

        // Read data from JSON file, this will set db.data content
        await db.read()

        if(!db.data){
            throw "getAuth - Config file is not valid"
        }else {
            return db.data.auth;
        }
    }

    async setAuth(auth: {username: string, password: string, authTokens: string[], lastupdated: Date}): Promise<void>{
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/modules/${this.MODULE_ID}.json`)
        const db = new Low(adapter)
        await db.read();
        
        if(!db.data){
            throw "setAuth - Config file is not valid"
        }else {
            db.data.auth = auth;
            db.write().then(() => this.logger('setAuth', 'config file updated - credentials changed'))
        }
    }

    async getConfig(): Promise<AuthConfig['config']> {
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/modules/${this.MODULE_ID}.json`)
        const db = new Low(adapter)
        await db.read();

        if(!db.data){
            throw "getConfig - Config file is not valid"
        }else {
            return db.data.config
        }
    };

    async setConfig(key: string, value: any){
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/modules/${this.MODULE_ID}.json`)
        const db = new Low(adapter)
        await db.read();
        if(!db.data){
            throw "setConfig - Config file is not valid"
        }else {
            db.data.config[key] = value;
            db.write().then(() => this.logger('setConfig', `config file updated - ${key} changed`))

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