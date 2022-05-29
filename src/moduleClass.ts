import { Low, JSONFile } from 'lowdb'

/**
 * The AuthConfig type is an object with two properties: auth and config. The auth property is an
 * object with four properties: username, password, authTokens, and lastupdated. The config property is
 * an object with three properties: cache_enabled, cachetime, and chList.
 * @property auth - This is the object that contains the username, password, authTokens, and
 * lastupdated properties.
 * @property config - This is the configuration object for the plugin.
 */
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

/* Extending the ModuleFunctions class with the ModuleType interface. */
export interface ModuleType extends ModuleFunctions {
    login(username: string, password: string): Promise<string[]>;
    liveChannels(id: string, authTokens: string[], authLastUpdate: Date): Promise<{stream: string, proxy?: string}>;
    getChannels(): Promise<string[]>;
    getVOD_List(authTokens: string[]): Promise<object[]>;
    getVOD(show: string, config: object): Promise<object | object[]>;
    getVOD_EP_List(url: string, config: object): Promise<object[]>;
    getVOD_EP(show: string, epid: string, authTokens: string[]): Promise<string>;
}

/* This class is used to create a new module, it contains all the functions that are required for a
module to work */
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

    /**
     * The constructor of the class.
     * @param {string} MODULE_ID - The name of the module. This is used to identify the module in the
     * config file.
     * @param {boolean} hasLive - boolean - Whether the module supports live channels
     * @param {boolean} hasVOD - boolean - Whether the module supports VOD or not.
     * @param {string[]} [chList] - An array of channel names. This is used to get the channel list
     * from the API.
     * @param {string[]} [qualitiesList] - An array of strings that represent the qualities that the
     * module supports.
     */
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

    /**
     * It creates a config file for the module.
     * @param {string[]} [chList] - An array of channel names to be used for the channel list.
     * @returns A promise that resolves when the config file is written to disk.
     */
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

    /**
     * > Reads the JSON file and returns the auth object
     * @returns The auth object from the JSON file
     */
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

    /**
     * It sets the auth object in the config file.
     * @param auth - { username: string, password: string, authTokens: string[], lastupdated: Date }
     * @returns a promise that resolves to nothing.
     */
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

    /**
     * It reads the JSON file, checks if it's valid, and returns the config object
     * @returns The config object from the JSON file
     */
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

    /**
     * It updates the config file for the module.
     * @param {string} key - string - the key of the config value you want to change
     * @param {any} value - any - this is the value you want to set the key to.
     * @returns A promise that resolves when the config file has been updated.
     */
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

    /**
     * The function takes in three parameters, the first two are required and the third is optional.
     * The function returns a string or an error
     * @param {string} id - This is the id of the module that is calling the logger.
     * @param {string} message - The message to be logged.
     * @param {boolean} [isError] - boolean - If true, the message will be returned as an Error object.
     * @returns A string or an error.
     */
    logger(id: string, message: string, isError?: boolean): string | Error {
        if (this.debug) {
            console.log(`${this.MODULE_ID} - ${id}: ${message}`);
        }
        return isError ? new Error(`${this.MODULE_ID} - ${id}: ${message}`) : `${this.MODULE_ID} - ${id}: ${message}`
    };
}

/* Exporting the ModuleFunctions class as the default export. */
export default ModuleFunctions;