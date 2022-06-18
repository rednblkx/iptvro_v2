import { Low, JSONFile } from 'lowdb'
import moment from 'moment';

/**
 * The AuthConfig type is an object with two properties: auth and config. The auth property is an
 * object with four properties: username, password, authTokens, and lastupdated. The config property is
 * an object with three properties: url_cache_enabled, url_update_interval, and chList.
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
        url_cache_enabled: boolean;
        url_update_interval: number;
        auth_update_interval: number;
        chList: {};
    }
};

/**
 * `cache` is an object with a `name` property of type `string`, a `data` property of type `{stream:
 * string, proxy?: string}`, a `module` property of type `string`, and a `lastupdated` property of type
 * `Date`.
 * @property {string} name - The name of the stream.
 * @property data - This is the data that is returned from the module.
 * @property {string} module - The module that the stream is from.
 * @property {Date} lastupdated - The date the cache was last updated.
 */
 type cache = {
    name: string,
    data: {stream: string, proxy?: string},
    module: string,
    lastupdated: Date
}


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
    chList: object;
    qualitiesList: string[];
    debug: boolean;
    authReq: boolean;

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
    constructor(MODULE_ID: string, authReq: boolean, hasLive: boolean, hasVOD: boolean, chList?: object, qualitiesList?: string[]) {
        this.MODULE_ID = MODULE_ID;
        this.authReq = authReq;
        this.hasLive = hasLive;
        this.hasVOD = hasVOD;
        this.chList = chList || null;
        this.qualitiesList = qualitiesList || null;
        this.debug = (process.env.DEBUG?.toLowerCase() === 'true');
    }

    /**
     * The function takes in three parameters, the first two are required and the third is optional.
     * The function returns a string or an error
     * @param {string} id - This is the id of the module that is calling the logger.
     * @param {string} message - The message to be logged.
     * @param {boolean} [isError] - boolean - If true, the message will be returned as an Error object.
     * @returns A string or an error.
     */
    logger(id: string, message: string, isError?: boolean): string | Error {
        if (this.debug === true) {
            console.log(`\x1b[47m\x1b[30m${this.MODULE_ID}\x1b[0m - \x1b[35m${id}\x1b[0m: ${message}`);
        }
        return isError ? new Error(`\x1b[47m\x1b[30m${this.MODULE_ID}\x1b[0m - \x1b[35m${id}\x1b[0m: ${message}`) : `\x1b[47m\x1b[30m${this.MODULE_ID}\x1b[0m - \x1b[35m${id}\x1b[0m: ${message}`
    };

    /**
     * It creates a config file for the module.
     * @param {string[]} [chList] - An array of channel names to be used for the channel list.
     * @returns A promise that resolves when the config file is written to disk.
     */
    async initializeConfig(chList?: object): Promise<void> {
        var config = {
            "auth": {
                "username": "",
                "password": "",
                "authTokens": [],
                "lastupdated": new Date()
            },
            "config": {
                "url_cache_enabled": true,
                "url_update_interval": 6,
                "auth_update_interval": 6,
                "chList": chList || {}
            }
        }
        //write config to file
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/dist/modules/${this.MODULE_ID}.json`)
        const db = new Low(adapter)

        // Read data from JSON file, this will set db.data content
        await db.read()

        db.data = config;
        
        //write to file and log
        await db.write()

        this.logger('initializeConfig', 'Config file created')
        // .then(() => this.logger('initializeConfig', 'Config file created'))

        return Promise.resolve()
    };

    /**
     * > Reads the JSON file and returns the auth object
     * @returns The auth object from the JSON file
     */
    async getAuth(): Promise<AuthConfig['auth']> {
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/dist/modules/${this.MODULE_ID}.json`)
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
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/dist/modules/${this.MODULE_ID}.json`)
        const db = new Low(adapter)
        await db.read();

        if (!db.data) {
            throw "setAuth - Config file is not valid"
        } else {
            db.data.auth = auth;
            await db.write();
            this.logger('setAuth', 'config file updated')
        }
        return Promise.resolve()
    }

    /**
     * It reads the JSON file, checks if it's valid, and returns the config object
     * @returns The config object from the JSON file
     */
    async getConfig(): Promise<AuthConfig['config']> {
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/dist/modules/${this.MODULE_ID}.json`)
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
        const adapter = new JSONFile<AuthConfig>(`${process.cwd()}/dist/modules/${this.MODULE_ID}.json`)
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
     * It checks if a cached link exists for a module, and if it does, it checks if it's older than the
     * url_update_interval, and if it is, it returns null, otherwise it returns the cached link
     * @param {ModuleType} module - The module you're using
     * @param {string} [id] - The id of the link you want to find.
     * @returns The cache object
     */
    async cacheFind(id?: string): Promise<cache> {
        try {
            const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
            const db = new Low(adapter)
            await db.read();

            const cache = db.data && db.data.find(a => id ? a.name === id && a.module === this.MODULE_ID : a.module === this.MODULE_ID);
            let url_update_interval = (await this.getConfig()).url_update_interval

            if(cache){
                if((((new Date()).getTime() - (new Date(cache.lastupdated)).getTime()) / (1000 * 3600)) <= (url_update_interval ? url_update_interval : 6)){
                    // let found = cache.link;
                    if(process.env.DEBUG == ('true' || true)){
                        this.logger('cacheFind',`Cached link found for '${id}', module '${this.MODULE_ID}', saved ${moment(cache.lastupdated).fromNow()}`)
                    }
                    return cache
                }else return null
            } else return null
        } catch (error) {
            console.error(`cacheFind| ${error.message || error.toString().substring(0, 200)}`);
        }
    }

    /**
     * It takes in a string, a string, and an object, and then it tries to find the cache in the database,
     * and if it does, it updates it, and if it doesn't, it creates it
     * @param {string} id - The id of the cache.
     * @param {string} module_id - The name of the module you're using.
     * @param data - {stream: string, proxy?: string}
     */
    async cacheFill(id: string, data: {stream: string, proxy?: string}): Promise<void> {
        try {
            const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
            const db = new Low(adapter)
            await db.read();
            db.data ||= [];
            const cache = db.data && db.data.findIndex(a => a.name === id && a.module === this.MODULE_ID);
            if(cache && cache !== -1){
                db.data[cache].data = data;
                db.data[cache].lastupdated = new Date();
                return Promise.resolve(await db.write());
            }else{
                db.data.push({
                    name: id,
                    data: data,
                    module: this.MODULE_ID,
                    lastupdated: new Date()
                })
                return Promise.resolve(await db.write());
            }
        } catch (error) {
            this.logger('cacheFill', `${error.message || error.toString().substring(0, 200)}`, true)
            return Promise.reject(error)
        }
    }

    /**
     * It deletes all the cache entries for this module
     * @returns result - A promise that resolves when the cache is deleted.
     */
    async flushCache(): Promise<string> {
        try {
            const adapter = new JSONFile<cache[]>(`${process.cwd()}/cache.json`);
            const db = new Low(adapter)
            await db.read()
            db.data = db.data.filter(a => a.module !== this.MODULE_ID)
            await db.write();
            //log to console
            this.logger('flushCache',`Flushed cache for module '${this.MODULE_ID}'`)
            return Promise.resolve(`Flushed cache for module '${this.MODULE_ID}'`)
        } catch (error) {
            this.logger('flushCache',`Error flushing cache for module '${this.MODULE_ID}': ${error.message || error.toString().substring(0, 200)}`, true)
            return Promise.reject(error)
        }
    }
}

/* Exporting the ModuleFunctions class as the default export. */
export default ModuleFunctions;