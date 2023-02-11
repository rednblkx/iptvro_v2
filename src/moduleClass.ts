import { Low } from "npm:lowdb";
import { JSONFile } from "npm:lowdb/node";
import moment from "npm:moment";

/**
 * The AuthConfig type is an object with two properties: auth and config. The auth property is an
 * object with four properties: username, password, authTokens, and lastupdated. The config property is
 * an object with three properties: url_cache_enabled, url_update_interval, and chList.
 * @property auth - This is the object that contains the username, password, authTokens, and
 * lastupdated properties.
 * @property config - This is the configuration object for the plugin.
 */
export type ModuleConfig = {
  auth: {
    username: string;
    password: string;
    authTokens: string[];
    lastupdated: Date | null;
  };
  config: {
    [k: string]: unknown;
    url_cache_enabled: boolean;
    url_update_interval: number;
    auth_update_interval: number;
    chList: { [k: string]: string };
  };
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
  name: string;
  data: { stream: string; proxy?: string };
  module: string;
  lastupdated: Date;
};

type FunctionsList = 
  | "login"
  | "liveChannels"
  | "getChannels"
  | "getVOD_List"
  | "getVOD"
  | "getVOD_EP"
  | "initializeConfig"
  | "setAuth"
  | "setConfig"
  | "getConfig"
  | "getAuth"
  | "cacheFind"
  | "cacheFill"
  | "flushCache"

/* Extending the ModuleFunctions class with the ModuleType interface. */
export interface ModuleType extends ModuleFunctions {
  login(username: string, password: string): Promise<string[]>;
  liveChannels(
    id: string,
    authTokens: string[],
    authLastUpdate: Date | null,
  ): Promise<{ stream: string; drm?: { url: string, headers?: {name: string, value: string}[]} }>;
  getChannels(): Promise<Record<string, string>>;
  getVOD_List(
    authTokens: string[],
    page?: number,
  ): Promise<{data: unknown[], pagination?: {
    current_page: number;
    total_pages: number;
    per_page: number;
  }}>;
  getVOD(
    show: string,
    authTokens: string[],
    page?: number,
  ): Promise<Record<string, unknown> | Record<string, unknown>[]>;
  getVOD_EP(show: string, epid: string, authTokens: string[]): Promise<string>;
}

export interface IVOD {
  data: IVODData[];
  pagination?: {
    current_page: number;
    total_pages: number;
    per_page: number;
  };
}

export interface IVODData {
  name: string;
  link: string;
  img: string;
}

/* This class is used to create a new module, it contains all the functions that are required for a
module to work */
class ModuleFunctions {
  MODULE_ID: string;
  hasLive: boolean;
  hasVOD: boolean;
  chList: { [k: string]: string } | null;
  qualitiesList: string[] | null;
  authReq: boolean;
  private debug: boolean;
  private db: Low<ModuleConfig>;

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
  constructor(
    MODULE_ID: string,
    authReq: boolean,
    hasLive: boolean,
    hasVOD: boolean,
    chList?: { [k: string]: string },
    qualitiesList?: string[],
  ) {
    this.MODULE_ID = MODULE_ID;
    this.authReq = authReq;
    this.hasLive = hasLive;
    this.hasVOD = hasVOD;
    this.chList = chList || null;
    this.qualitiesList = qualitiesList || null;
    this.debug = Deno.env.get("DEBUG")?.toLowerCase() === "true";
    const adapter = new JSONFile<ModuleConfig>(
      `${Deno.cwd()}/configs/${this.MODULE_ID}.json`,
    );
    this.db = new Low(adapter);
  }

  /**
   * This function logs a message to the console if the environment variable DEBUG is set to true
   * @param {FunctionsList} id - The function name that is being logged.
   * @param {unknown} message - The message to be logged.
   * @param {boolean} [isError] - If the message is an error, set this to true.
   * @returns A string
   */
  logger(
    id: FunctionsList,
    message: unknown,
    isError?: boolean,
  ): string {
    if (Deno.env.get("DEBUG")?.toLowerCase() === "true") {
      if (isError) {
        if ((message as Error).message) {
          console.error(
            `\x1b[47m\x1b[30m${this.MODULE_ID}\x1b[0m - !\x1b[41m\x1b[30m${id}\x1b[0m!: ${
              (message as Error).message
            }`,
          );
        } else {
          console.error(
            `\x1b[47m\x1b[30m${this.MODULE_ID}\x1b[0m - !\x1b[41m\x1b[30m${id}\x1b[0m!: ${
              typeof message == "object" ? JSON.stringify(message).substring(0, 200) + "..." : message
            }`,
          );
        }
      } else {
        console.log(
          `\x1b[47m\x1b[30m${this.MODULE_ID}\x1b[0m - \x1b[35m${id}\x1b[0m: ${
            typeof message == "object" ? JSON.stringify(message).substring(0, 200) + "..." : message
          }`,
        );
      }
      Deno.writeTextFile("logs/log.txt", typeof message == "object" ? `${new Date().toLocaleString()} | ${this.MODULE_ID} - ${JSON.stringify(message, null, 2)}\n` : `${new Date().toLocaleString()} | ${this.MODULE_ID} - ${message} \n`, { append: true, create: true }).then(() => {
        // console.log("Log wrote on dir!");
      }).catch(err => {
        if (err instanceof Deno.errors.NotFound) {
          Deno.mkdir("logs").then(() => {
            Deno.writeTextFile("logs/log.txt", typeof message == "object" ? `${new Date().toLocaleString()} | ${this.MODULE_ID} - ${JSON.stringify(message, null, 2)}\n` : `${new Date().toLocaleString()} | ${this.MODULE_ID} - ${message} \n`, { append: true, create: true }).then(() => {
              // console.log("Log wrote on dir!");
              
            })
          })
        } else console.error(err)
      })
    }
    if ((message as Error).message) {
      return `${this.MODULE_ID} - ${id}: ${
        ((message as Error).message).substring(0, 200) + "..."
      }`;
    }
    return `${this.MODULE_ID} - ${id}: ${
      typeof message == "object"
        ? JSON.stringify(message).substring(0, 200) + "..."
        : (message as string).substring(0, 200)
    }`;
  }

  /**
   * It creates a config file for the module.
   * @param {string[]} [chList] - An array of channel names to be used for the channel list.
   * @returns A promise that resolves when the config file is written to disk.
   */
  async initializeConfig(chList?: { [k: string]: string }): Promise<void> {
    // existsSync(`${Deno.cwd()}/configs`) || mkdirSync(`${Deno.cwd()}/configs`)
    try {
      await Deno.mkdir(`${Deno.cwd()}/configs`);
    } catch (error) {
      if (error instanceof Deno.errors.AlreadyExists) {
        this.logger("initializeConfig", "configs dir already exists");
      } else throw error;
    }
    const config = {
      "auth": {
        "username": "",
        "password": "",
        "authTokens": [],
        "lastupdated": null,
      },
      "config": {
        "url_cache_enabled": true,
        "url_update_interval": 4,
        "auth_update_interval": 6,
        "chList": chList || {},
      },
    };
    try {
      // //write config to file
      // const adapter = new JSONFile<AuthConfig>(`${Deno.cwd()}/configs/${this.MODULE_ID}.json`)
      // const db = new Low(adapter)

      // Read data from JSON file, this will set db.data content
      await this.db.read();

      this.db.data = config;

      //write to file and log
      await this.db.write();

      this.logger("initializeConfig", "Config file created");
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }

  }

  /**
   * > Reads the JSON file and returns the auth object
   * @returns The auth object from the JSON file
   */
  async getAuth(): Promise<ModuleConfig["auth"]> {
    // const adapter = new JSONFile<AuthConfig>(`${Deno.cwd()}/configs/${this.MODULE_ID}.json`)
    // const db = new Low(adapter)

    // Read data from JSON file, this will set db.data content
    await this.db.read();

    if (!this.db.data) {
      throw new Deno.errors.NotFound("File empty or does not exist");
    } else {
      return this.db.data?.auth;
    }
  }

  /**
   * It sets the auth object in the config file.
   * @param auth - { username: string, password: string, authTokens: string[], lastupdated: Date }
   * @returns a promise that resolves to nothing.
   */
  async setAuth(
    auth: {
      username: string;
      password: string;
      authTokens: string[];
      lastupdated: Date | null;
    },
  ): Promise<ModuleConfig["auth"]> {
    try {
      await this.db.read();

      if (!this.db.data) {
        throw new Deno.errors.NotFound("File empty or does not exist");
      } else {
        this.db.data.auth = auth;
        await this.db.write();
        this.logger("setAuth", "config file updated");
      }
      return Promise.resolve(this.db.data.auth);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * It reads the JSON file, checks if it's valid, and returns the config object
   * @returns The config object from the JSON file
   */
  async getConfig(): Promise<ModuleConfig["config"]> {
    // const adapter = new JSONFile<AuthConfig>(`${Deno.cwd()}/configs/${this.MODULE_ID}.json`)
    // const db = new Low(adapter)
    await this.db.read();

    if (!this.db.data) {
      throw new Deno.errors.NotFound("File empty or does not exist");
    } else {
      return this.db.data.config;
    }
  }

  /**
   * It updates the config file for the module.
   * @param {string} key - string - the key of the config value you want to change
   * @param {unknown} value - unknown - this is the value you want to set the key to.
   * @returns A promise that resolves when the config file has been updated.
   */
  async setConfig(key: string, value: Record<string, unknown> | string) {
    // const adapter = new JSONFile<AuthConfig>(`${Deno.cwd()}/configs/${this.MODULE_ID}.json`)
    // const db = new Low(adapter)
    await this.db.read();
    if (!this.db.data) {
      throw new Deno.errors.NotFound("File empty or does not exist");
    } else {
      this.db.data.config[key] = value;
      await this.db.write();
      this.logger("setConfig", `config file updated - ${key} changed`);
    }
    return Promise.resolve();
  }

  /**
   * It checks if a cached link exists for a module, and if it does, it checks if it's older than the
   * url_update_interval, and if it is, it returns null, otherwise it returns the cached link
   * @param {ModuleType} module - The module you're using
   * @param {string} [id] - The id of the link you want to find.
   * @returns The cache object
   */
  async cacheFind(id?: string): Promise<cache | null> {
    try {
      const adapter = new JSONFile<cache[]>(`${Deno.cwd()}/cache.json`);
      const db = new Low(adapter);
      await db.read();

      const cache = db.data &&
        db.data.find((a) =>
          id
            ? a.name === id && a.module === this.MODULE_ID
            : a.module === this.MODULE_ID
        );
      const url_update_interval = (await this.getConfig()).url_update_interval;

      if (cache) {
        if (
          (((new Date()).getTime() - (new Date(cache.lastupdated)).getTime()) /
            (1000 * 3600)) <= (url_update_interval ? url_update_interval : 6)
        ) {
          // const found = cache.link;
          if (Deno.env.get("DEBUG") == ("true" || true)) {
            this.logger(
              "cacheFind",
              `Cached link found for '${id}', module '${this.MODULE_ID}', saved ${
                moment(cache.lastupdated).fromNow()
              }`,
            );
          }
          return cache;
        } else return null;
      } else return null;
    } catch (error) {
      this.logger("cacheFind", error, true)
    }
    return null;
  }

  /**
   * It takes in a string, a string, and an object, and then it tries to find the cache in the database,
   * and if it does, it updates it, and if it doesn't, it creates it
   * @param {string} id - The id of the cache.
   * @param {string} module_id - The name of the module you're using.
   * @param data - {stream: string, proxy?: string}
   */
  async cacheFill(
    id: string,
    data: { stream: string; proxy?: string },
  ): Promise<void> {
    try {
      const adapter = new JSONFile<cache[]>(`${Deno.cwd()}/cache.json`);
      const db = new Low(adapter);
      await db.read();
      db.data ||= [];
      const cache = db.data &&
        db.data.findIndex((a) => a.name === id && a.module === this.MODULE_ID);
      if (cache && cache !== -1) {
        db.data[cache].data = data;
        db.data[cache].lastupdated = new Date();
        return Promise.resolve(await db.write());
      } else {
        db.data.push({
          name: id,
          data: data,
          module: this.MODULE_ID,
          lastupdated: new Date(),
        });
        return Promise.resolve(await db.write());
      }
    } catch (error) {
      this.logger(
        "cacheFill",
        error,
        true,
      );
      return Promise.reject(error);
    }
  }

  /**
   * It deletes all the cache entries for this module
   * @returns result - A promise that resolves when the cache is deleted.
   */
  async flushCache(): Promise<string> {
    try {
      const adapter = new JSONFile<cache[]>(`${Deno.cwd()}/cache.json`);
      const db = new Low(adapter);
      await db.read();
      db.data = db.data?.filter((a) => a.module !== this.MODULE_ID) || null;
      await db.write();
      //log to console
      this.logger("flushCache", `Flushed cache for module '${this.MODULE_ID}'`);
      return Promise.resolve(`Flushed cache for module '${this.MODULE_ID}'`);
    } catch (error) {
      this.logger(
        "flushCache",
        error,
        true,
      );
      return Promise.reject(error);
    }
  }
}

/* Exporting the ModuleFunctions class as the default export. */
export default ModuleFunctions;
