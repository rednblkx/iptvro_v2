import { Low, JSONFile } from 'lowdb'

export type AuthConfig = {
    auth: {
        username: string;
        password: string;
        authTokens: string[];
        lastupdated: Date;
    }
    config: {
        cache_enabled: boolean;
        cachetime: number;
        chList: {};
    }
};

export interface ModuleType extends ModuleFunctions {
    login(username: string, password: string): Promise<string[]>;
    liveChannels(id: string, authTokens: string[], authLastUpdate: Date): Promise<string>;
    getChannels(): Promise<string[]>;
    getVOD_List(authTokens: string[]): Promise<object[]>;
    getVOD(show: string, config: object): Promise<object | object[]>;
    getVOD_EP_List(url: string, config: object): Promise<object[]>;
    getVOD_EP(show: string, epid: string, authTokens: string[]): Promise<string>;
}

class ModuleFunctions {

    MODULE_ID: string;
    hasLive: boolean;
    hasVOD: boolean;
    chList: string[];
    qualitiesList: string[];
    // liveChannels: Function;
    // login: Function;
    // getVOD: Function;
    // getVOD_List: Function;
    // getVOD_EP: Function;
    // getVOD_EP_List: Function;
    // getChannels: Function;
    debug: boolean;

    constructor(MODULE_ID: string, hasLive: boolean, hasVOD: boolean, chList?: string[], qualitiesList?: string[]) {
        this.MODULE_ID = MODULE_ID;
        this.hasLive = hasLive;
        this.hasVOD = hasVOD;
        this.chList = chList || null;
        this.qualitiesList = qualitiesList || null;
        // this.liveChannels = dummy;
        // this.login = dummy;
        // this.getVOD = dummy;
        // this.getVOD_List = dummy;
        // this.getVOD_EP = dummy;
        // this.getVOD_EP_List = dummy;
        // this.getChannels = dummy;
        this.debug = (process.env.DEBUG?.toLowerCase() === 'true');
    }

    async initializeConfig(chList?: string[]) {
        var config = {
            "auth": {
                "username": "",
                "password": "",
                "authTokens": [],
                "lastupdated": new Date()
            },
            "config": {
                "cache_enabled": true,
                "cachetime": 6,
                "chList": chList || {}
            }
        }
        //write config to file
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/src/modules/${this.MODULE_ID}.json`)
        const db = new Low(adapter)

        // Read data from JSON file, this will set db.data content
        await db.read()

        db.data = config;
        
        //write to file and log
        await db.write()
        // .then(() => this.logger('initializeConfig', 'Config file created'))

        return Promise.resolve()
    };

    async getAuth(): Promise<AuthConfig['auth']> {
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/src/modules/${this.MODULE_ID}.json`)
        const db = new Low(adapter)

        // Read data from JSON file, this will set db.data content
        await db.read()

        if (!db.data) {
            throw "getAuth - Config file is not valid"
        } else {
            return db.data.auth;
        }
    }

    async setAuth(auth: { username: string, password: string, authTokens: string[], lastupdated: Date }): Promise<void> {
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/src/modules/${this.MODULE_ID}.json`)
        const db = new Low(adapter)
        await db.read();

        if (!db.data) {
            throw "setAuth - Config file is not valid"
        } else {
            db.data.auth = auth;
            await db.write();
            this.logger('setAuth', 'config file updated - credentials changed')
        }
        return Promise.resolve()
    }

    async getConfig(): Promise<AuthConfig['config']> {
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/src/modules/${this.MODULE_ID}.json`)
        const db = new Low(adapter)
        await db.read();

        if (!db.data) {
            throw "getConfig - Config file is not valid"
        } else {
            return db.data.config
        }
    };

    async setConfig(key: string, value: any) {
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/src/modules/${this.MODULE_ID}.json`)
        const db = new Low(adapter)
        await db.read();
        if (!db.data) {
            throw "setConfig - Config file is not valid"
        } else {
            db.data.config[key] = value;
            await db.write()
            this.logger('setConfig', `config file updated - ${key} changed`)

        }
        return Promise.resolve()
    };

    logger(id: string, message: string, isError?: boolean): string | Error {
        if (this.debug) {
            console.log(`${this.MODULE_ID} - ${id}: ${message}`);
        }
        return isError ? new Error(`${this.MODULE_ID} - ${id}: ${message}`) : `${this.MODULE_ID} - ${id}: ${message}`
    };
}

export default ModuleFunctions;