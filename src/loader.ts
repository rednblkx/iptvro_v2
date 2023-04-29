import {
  default as ModuleFunctions,
  ModuleType,
  StreamResponse,
} from "./moduleClass.ts";
import { extname } from "https://deno.land/std@0.172.0/path/mod.ts";
import { Low } from "npm:lowdb";
import { JSONFile } from "npm:lowdb/node";
import { Parser } from "npm:m3u8-parser";
import axios from "https://deno.land/x/axiod@0.26.2/mod.ts";
import { path } from "https://deno.land/x/eta@v1.12.3/file-methods.ts";
import { pathToFileURL } from "https://dev.jspm.io/npm:@jspm/core@2.0.1/nodelibs/url";
const __dirname = Deno.cwd();

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
  data: StreamResponse;
  module: string;
  lastupdated: Date;
};

type LoaderFunctions =
  | "sanityCheck"
  | "rewritePlaylist"
  | "cacheCleanup"
  | "searchChannel"
  | "getVODlist"
  | "getVOD"
  | "getVOD_EP"
  | "login";

/**
 * The function takes in three parameters, the first two are required and the third is optional
 * @param {string} id - This is the id of the function that is calling the logger.
 * @param {string} message - The message you want to log.
 * @param {boolean} [isError] - boolean - if true, the logger will return an Error object instead of a
 * string.
 * @returns a string or an error.
 */
function logger(
  id: LoaderFunctions,
  message: string | Error | Record<string, unknown>,
  isError?: boolean,
): string {
  if (Deno.env.get("DEBUG")?.toLowerCase() === "true") {
    if (isError) {
      if ((message as Error).message) {
        console.error(
          `\x1b[47m\x1b[30mloader\x1b[0m - !\x1b[41m\x1b[30m${id}\x1b[0m!: ${
            (message as Error).message
          }`,
        );
      } else {
        console.error(
          `\x1b[47m\x1b[30mloader\x1b[0m - !\x1b[41m\x1b[30m${id}\x1b[0m!: ${
            typeof message == "object"
              ? JSON.stringify(message).substring(0, 200)
              : message
          }`,
        );
      }
    } else {
      console.log(
        `\x1b[47m\x1b[30mloader\x1b[0m - \x1b[35m${id}\x1b[0m: ${
          typeof message == "object"
            ? JSON.stringify(message).substring(0, 200)
            : message
        }`,
      );
    }
    const nowDate = new Date();
    const date = nowDate.getFullYear() + "-" + (nowDate.getMonth() + 1) + "-" +
      nowDate.getDate();
    Deno.writeTextFile(
      `logs/log${date}.txt`,
      typeof message == "object"
        ? `${new Date().toLocaleString()} | loader - ${id} - ${
          JSON.stringify(message, null, 2)
        }\n`
        : `${new Date().toLocaleString()} | loader - ${id} ${message} \n`,
      { append: true, create: true },
    ).then(() => {
      // console.log("Log wrote on dir!");
    }).catch((err) => {
      if (err instanceof Deno.errors.NotFound) {
        console.log(err);

        Deno.mkdir("logs").then(() => {
          Deno.writeTextFile(
            `logs/log${date}.txt`,
            typeof message == "object"
              ? `${new Date().toLocaleString()} | loader - ${id} - ${
                JSON.stringify(message, null, 2)
              }\n`
              : `${
                new Date().toLocaleString()
              } | loader - ${id} - ${message} \n`,
            { append: true, create: true },
          ).then(() => {
            // console.log("Log wrote on dir!");
          });
        });
      } else console.error(err);
    });
  }
  if ((message as Error).message) {
    return `loader - ${id}: ${((message as Error).message).substring(0, 200)}`;
  }
  return `loader - ${id}: ${
    typeof message == "object"
      ? JSON.stringify(message).substring(0, 200)
      : message.substring(0, 200)
  }`;
}

/**
 * It reads all the files in the modules folder, imports them, checks if they are valid modules, and if
 * they are, it checks if they have a config file, if they don't, it creates one, and if they do, it
 * checks if the module has a login method, and if it does, it checks if the module has a username and
 * password set
 * @returns A list of valid modules
 */
export async function sanityCheck(): Promise<string[]> {
  const files_list: string[] = [];
  for await (
    const file of Deno.readDir(path.join(__dirname, "src", "modules"))
  ) {
    if (file.isFile && extname(file.name) === ".ts") {
      files_list.push(file.name);
    }
  }
  const valid_list = [];
  console.log("Modules sanity check:");
  const modules = await Promise.all<
    ModuleType & { module: string; error: string }
  >(files_list.map(async (val) => {
    try {
      return new (await import(`./modules/${val}`)).default();
    } catch (error) {
      return {
        module: val.slice(0, -2),
        error: error.message || error.toString().substring(0, 200),
      };
    }
  }));
  for (const val of modules) {
    try {
      if (val instanceof ModuleFunctions && val.MODULE_ID) {
        let valid = true;
        try {
          const auth = await val.getAuth();
          console.log(`\n - Module '${val.MODULE_ID}' found`);
          if (
            (!auth.username || !auth.password) &&
            val.authReq
          ) {
            console.log(
              `\t${val.MODULE_ID} - Username/Passsword required but not set`,
            );
            // throw `${val.MODULE_ID} - Username/Passsword required but not set`;
          }
          !val.login &&
            logger(
              "sanityCheck",
              `\t${val.MODULE_ID} - WARNING login method not implemented`,
            );
          if (val.hasLive && !val.liveChannels) {
            logger(
              "sanityCheck",
              `\t${val.MODULE_ID} - WARNING hasLive is enabled but liveChannels method not implemented`,
            );
            valid = false;
          }
          if (val.hasVOD && !val.getVOD) {
            logger(
              "sanityCheck",
              `\t${val.MODULE_ID} - WARNING hasVOD is enabled but getVOD method not implemented`,
            );
            valid = false;
          }
          if (!val.chList) {
            const ch = await val.getChannels();
            Object.keys(ch).length > 0 && await val.setConfig("chList", ch);
          }
        } catch (error) {
          if (error instanceof Error) {
            // console.log(`\n - Module '${val.MODULE_ID}' found`);
            logger("sanityCheck", "File empty or not found");
            await val.initializeConfig(val.chList || {});
            const auth = await val.getAuth();
            if (
              (!auth.username || !auth.password) &&
              val.authReq
            ) {
              console.log(
                `\t${val.MODULE_ID} - Username/Passsword required but not set`,
              );
              // throw `${val.MODULE_ID} - Username/Passsword required but not set`;
            }
          } else {
            throw error;
          }
        }
        // valid && console.log(`\t${val.MODULE_ID} - No issues found`);

        valid && valid_list.push(val.MODULE_ID);
      } else {
        console.log(
          ` - Module '${val.module || val}' failed sanity check\n\t${
            val.error || `\0`
          }`,
        );
      }
    } catch (error) {
      // console.error(`${error?.message || error}`);
      logger("sanityCheck", error, true);
      // return Promise.reject(error.message || error)
    }
  }
  return Promise.resolve(valid_list);
}

/**
 * It takes a m3u8 manifest and returns the highest bandwidth stream
 * @param data - The data from the m3u8 file
 * @param baseUrl - The base url of the m3u8 file.
 * @returns The highest bandwidth m3u8 file
 */
function m3u8Select(data: string | string[], baseUrl: string) {
  const parser = new Parser();

  parser.push(data);
  parser.end();

  const parsedManifest = parser.manifest;

  let highestBandwidth: number;

  parsedManifest.playlists.forEach(
    (element: { attributes: { BANDWIDTH: number } }) => {
      if (!highestBandwidth) {
        highestBandwidth = element.attributes.BANDWIDTH;
      }

      if (element.attributes.BANDWIDTH > highestBandwidth) {
        highestBandwidth = element.attributes.BANDWIDTH;
      }
    },
  );

  if (data.includes("http")) {
    return parsedManifest.playlists.find((
      a: { attributes: { BANDWIDTH: number } },
    ) => a.attributes.BANDWIDTH === highestBandwidth).uri;
  } else {
    return `${baseUrl}/${
      parsedManifest.playlists.find((
        a: { attributes: { BANDWIDTH: number } },
      ) => a.attributes.BANDWIDTH === highestBandwidth).uri
    }`;
  }
}

/**
 * It takes a m3u8 file and a url, and returns a m3u8 file with the urls fixed
 * @param m3u - The m3u8 file contents
 * @param url - The URL of the m3u8 file.
 * @returns the m3u file with the correct URLs.
 */
function m3uFixURL(
  m3u: string,
  url: string,
) {
  const m3u_arr = m3u.split("\n");
  m3u_arr.forEach(
    (el: string, index: number, array: string[]) => {
      if (!el.includes("http") && el.match('URI="(.*)"') != null) {
        console.log(el);
        const match = el.match(/(.*)\.key/);
        if (match !== null) {
          array[index] = el.replace(
            match[0],
            `"${url}/${el?.match('URI="(.*)"')?.[1]}"`,
          );
        }
      }
      if (el.match("(.*).ts") != null && !el.includes("http")) {
        array[index] = `${url}/${el}`;
      }
    },
  );
  return m3u_arr.join("\n");
}

/**
 * It takes a link to a playlist, and returns a playlist with all the links fixed
 * @param link - The link to the playlist
 * @returns A string of the playlist
 */
export async function rewritePlaylist(
  stream: StreamResponse,
  cors?: string,
): Promise<
  string | StreamResponse
> {
  try {
    const initData = (await axios.get(stream.stream)).data;
    if (initData.includes("#EXTM3U")) {
      const initm3u8 = initData.includes("\n")
        ? initData
        : (initData.split(" ")).join("\n");
      if (initm3u8.includes(".m3u8")) {
        const q_m3u8 = await axios.get(
          m3u8Select(
            initm3u8,
            cors
              ? `http://localhost:3000/cors/${stream.stream.match(/(.*)\/.*/)
                ?.[1]}`
              : stream.stream.match(/(.*)\/.*/)?.[1] || "",
          ),
        );
        const finalP = m3uFixURL(
          q_m3u8.data,
          cors
            ? `http://localhost:3000/cors/${q_m3u8.config.url?.match(/(.*)\/.*/)
              ?.[1]}`
            : q_m3u8.config.url?.match(/(.*)\/.*/)?.[1] || "",
        );
        return finalP;
      } else {
        return Promise.resolve(
          m3uFixURL(
            initm3u8,
            cors
              ? `http://localhost:3000/cors/${stream.stream.match(/(.*)\/.*/)
                ?.[1]}`
              : stream.stream.match(/(.*)\/.*/)?.[1] || "",
          ),
        );
      }
    } else {
      logger("rewritePlaylist", `"${stream.stream}" is not a HLS playlist`);
      return Promise.resolve(stream);
    }
  } catch (error) {
    return Promise.reject(
      logger(
        "rewritePlaylist",
        error,
        true,
      ),
    );
  }
}

/**
 * It removes all cached links that are older than the url_update_interval specified in the module's config
 * @param {string[]} valid_modules - string[] - This is an array of all the modules that are valid.
 */
export async function cacheCleanup(valid_modules: string[]): Promise<cache[]> {
  const modules: ModuleType[] = await Promise.all<ModuleType>(
    valid_modules.map(async (val) =>
      new (await import(`./modules/${val}.ts`)).default()
    ),
  );
  const adapter = new JSONFile<cache[]>(`${__dirname}../cache.json`);
  const db = new Low(adapter, []);
  await db.read();

  db.data ||= [];

  const removed: cache[] = [];

  const cache_config: { [l: string]: number } = {};

  try {
    for (const mod of modules) {
      if (mod instanceof ModuleFunctions) {
        cache_config[mod.MODULE_ID] =
          (await mod.getConfig()).url_update_interval;
      }
    }
    for (let index = 0; index < db.data.length; index++) {
      if (
        (((new Date()).getTime() -
          (new Date(db.data[index].lastupdated)).getTime()) / (1000 * 3600)) >=
          (cache_config[db.data[index].module] || 6)
      ) {
        if (Deno.env.get("DEBUG") == ("true" || true)) {
          logger(
            "cacheCleanup",
            `Found cached link for '${db.data[index].name}' module '${
              db.data[index].module
            }' older than ${(cache_config[db.data[index].module] ||
              6)} hours, removing!`,
          );
        }
        removed.push(db.data.splice(index, 1)[0]);
        index--;
      }
    }
    if (removed.length > 0) {
      await db.write();
      logger(
        "cacheCleanup",
        `Removed ${removed.length} cached links over configured time limit`,
      );
      return Promise.resolve(removed);
    }
  } catch (error) {
    return Promise.reject(logger(
      "cacheCleanup",
      error,
      true,
    ));
  }

  return Promise.resolve(removed);
}

/**
 * It searches for a channel in a module, if it doesn't find it, it searches for it in all modules
 * @param {string} id - The channel id
 * @param {string} module_id - The module ID of the module you want to search.
 * @param {string[]} valid_modules - An array of strings that are the names of the modules you want to
 * search through.
 * @returns A promise that resolves to a cache object
 */
export async function searchChannel(
  id: string,
  module_id: string,
  valid_modules: string[],
): Promise<{ data: cache["data"]; module: string; cache: boolean }> {
  if (valid_modules.includes(module_id || "")) {
    try {
      logger(
        "searchChannel",
        `Searching for channel '${id}' in module '${module_id}'`,
      );
      const module: ModuleType = new (await import(
        pathToFileURL(
          path.join(__dirname, "src", "modules", `${module_id}.ts`),
        ).toString()
      ))
        .default();
      const config = await module.getConfig();
      const auth = await module.getAuth();
      const cache = await module.cacheFind(id);
      if (config.chList[id]) {
        logger(
          "searchChannel",
          `Found channel '${id}' in module '${module_id}'`,
        );
        if (cache !== null && config.url_cache_enabled) {
          logger(
            "searchChannel",
            `Found cached link for channel '${id}' in module '${module_id}' - '${cache.data.stream}'`,
          );
          return Promise.resolve({
            data: cache.data,
            module: module_id,
            cache: config.url_cache_enabled,
          });
        } else {
          logger(
            "searchChannel",
            `${
              config.url_cache_enabled
                ? `No cached link found for channel '${id}' in`
                : "Cache not enabled for"
            } module '${module.MODULE_ID}'${
              config.url_cache_enabled ? `, trying to retrieve from module` : ""
            }`,
          );
          if (module.authReq && (!auth.username || !auth.password)) {
            throw "Not posssible, credentials not set!";
          }
          if (
            !(auth.authTokens.length > 0) || typeof auth.authTokens !== "object"
          ) {
            logger("searchChannel", "authTokens not provided, trying login");
            //get authTokens
            auth.authTokens = await module.login(auth.username, auth.password);
            //set authTokens
            module.setAuth({
              ...auth,
              authTokens: auth.authTokens,
              lastupdated: new Date(),
            });
          }
          const data = await module.liveChannels(
            config.chList[id].id,
            auth.authTokens,
            auth.lastupdated,
          );
          await module.cacheFill(id, data);
          return Promise.resolve({
            data: data,
            module: module_id,
            cache: config.url_cache_enabled,
          });
        }
      } else {
        logger(
          "searchChannel",
          `Channel '${id}' not found in module '${module_id}', updating list`,
        );
        const get_ch = await module.getChannels();
        await module.setConfig("chList", get_ch);
        if (get_ch[id]) {
          logger(
            "searchChannel",
            `Found channel '${id}' in module '${module_id}'`,
          );
          module.setConfig("chList", get_ch);
          if (cache !== null && config.url_cache_enabled) {
            logger(
              "searchChannel",
              `Found cached link for channel '${id}' in module '${module_id}' - '${cache.data.stream}'`,
            );
            return Promise.resolve({
              data: cache.data,
              module: module_id,
              cache: config.url_cache_enabled,
            });
          } else {
            logger(
              "searchChannel",
              `${
                config.url_cache_enabled
                  ? `No cached link found for channel '${id}' in`
                  : "Cache not enabled for"
              } module '${module.MODULE_ID}'${
                config.url_cache_enabled
                  ? `, trying to retrieve from module`
                  : ""
              }`,
            );
            if (module.authReq && (!auth.username || !auth.password)) {
              throw "Not posssible, credentials not set!";
            }
            if (
              !(auth.authTokens.length > 0) ||
              typeof auth.authTokens !== "object"
            ) {
              logger("searchChannel", "authTokens not provided, trying login");
              //get authTokens
              auth.authTokens = await module.login(
                auth.username,
                auth.password,
              );
              //set authTokens
              module.setAuth({
                ...auth,
                authTokens: auth.authTokens,
                lastupdated: new Date(),
              });
            }
            const data = await module.liveChannels(
              get_ch[id].id,
              auth.authTokens,
              auth.lastupdated,
            );
            await module.cacheFill(id, data);
            return Promise.resolve({
              data: data,
              module: module_id,
              cache: config.url_cache_enabled,
            });
          }
        } else {
          return Promise.reject(
            logger(
              "searchChannel",
              `Module ${module_id} doesn't have channel '${id}'`,
            ),
          );
        }
      }
    } catch (error) {
      return Promise.reject(
        logger("searchChannel", error, true),
      );
    }
  } else {
    const modules: ModuleType[] = await Promise.all(
      valid_modules.map(async (mod) =>
        new (await import(`./modules/${mod}.ts`)).default()
      ),
    );
    for (const module of modules) {
      try {
        if (!module.hasLive) continue;
        logger(
          "searchChannel",
          `Searching for channel '${id}' in module '${module.MODULE_ID}'`,
        );
        const config = await module.getConfig();
        const auth = await module.getAuth();
        if (config?.chList[id]) {
          logger(
            "searchChannel",
            `Found channel '${id}' in module '${module.MODULE_ID}'`,
          );
          const cache = await module.cacheFind(id);
          if (cache !== null && config.url_cache_enabled) {
            logger(
              "searchChannel",
              `Found cached link for channel '${id}' in module '${module.MODULE_ID}' - '${cache.data.stream}'`,
            );
            return Promise.resolve({
              data: cache.data,
              module: cache.module,
              cache: config.url_cache_enabled,
            });
          } else {
            logger(
              "searchChannel",
              `${
                config.url_cache_enabled
                  ? `No cached link found for channel '${id}' in`
                  : "Cache not enabled for"
              } module '${module.MODULE_ID}'${
                config.url_cache_enabled
                  ? `, trying to retrieve from module`
                  : ""
              }`,
            );
            if (module.authReq && (!auth.username || !auth.password)) {
              throw "Not posssible, credentials not set!";
            }
            if (
              !(auth.authTokens.length > 0) ||
              typeof auth.authTokens !== "object"
            ) {
              logger("searchChannel", "authTokens not provided, trying login");
              //get authTokens
              auth.authTokens = await module.login(
                auth.username,
                auth.password,
              );
              //set authTokens
              module.setAuth({
                ...auth,
                authTokens: auth.authTokens,
                lastupdated: new Date(),
              });
            }
            const data = await module.liveChannels(
              config.chList[id].id,
              auth.authTokens,
              auth.lastupdated,
            );
            await module.cacheFill(id, data);
            return Promise.resolve({
              data: data,
              module: module.MODULE_ID,
              cache: config.url_cache_enabled,
            });
          }
        }
      } catch (error) {
        logger(
          "searchChannel",
          `Error searching channel '${id}' in module '${module.MODULE_ID}'`,
          true,
        );
        logger(
          "searchChannel",
          error,
          true,
        );
        // return Promise.reject(new Error(`searchChannel - ${error.message || error.toString().substring(0, 200)}`))
      }
    }
    return Promise.reject(
      logger("searchChannel", `No module has channel '${id}'`),
    );
  }
}
/**
 * It takes a module id, imports the module, checks if it has VOD, and if it does, it returns the VOD
 * list
 * @param {string} module_id - The module id of the module you want to get the VOD list from.
 * @returns A promise that resolves to an array of VOD objects
 */
export async function getVODlist(
  module_id: string,
  options?: Record<string, unknown>,
) {
  if (module_id) {
    try {
      const module: ModuleType = new (await import(`./modules/${module_id}.ts`))
        .default();
      if (module.hasVOD) {
        const auth = await module.getAuth();
        if (module.authReq && (!auth.username || !auth.password)) {
          throw "Not posssible, credentials not set!";
        }
        if (
          !(auth.authTokens.length > 0) || typeof auth.authTokens !== "object"
        ) {
          logger("getVODlist", "authTokens not provided, trying login");
          //get authTokens
          auth.authTokens = await module.login(auth.username, auth.password);
          //set authTokens
          module.setAuth({
            ...auth,
            authTokens: auth.authTokens,
            lastupdated: new Date(),
          });
        }
        return Promise.resolve(
          await module.getVOD_List(
            auth.authTokens,
            options,
          ),
        );
      } else {
        return Promise.reject(
          logger(
            "getVODlist",
            `Module ${module_id} doesn't have VOD available`,
            true,
          ),
        );
      }
    } catch (error) {
      return Promise.reject(logger("getVODlist", error, true));
    }
  } else return Promise.reject(logger("getVODlist", "Module ID not provided"));
}

/**
 * It imports the module, checks if it has VOD enabled, and if it does, it calls the getVOD function
 * from the module
 * @param {string} module_id - The ID of the module you want to use.
 * @param {string} show_id - The ID of the show you want to get the VOD for.
 * @param [options] - {
 * @returns A promise that resolves to a VOD object or rejects with an error.
 */
export async function getVOD(
  module_id: string,
  show_id: string,
  options?: Record<string, unknown>,
) {
  if (module_id) {
    try {
      const module: ModuleType = new (await import(`./modules/${module_id}.ts`))
        .default();
      if (module.hasVOD) {
        const auth = await module.getAuth();
        if (module.authReq && (!auth.username || !auth.password)) {
          throw "Not posssible, credentials not set!";
        }
        if (
          !(auth.authTokens.length > 0) || typeof auth.authTokens !== "object"
        ) {
          logger("getVOD", "authTokens not provided, trying login");
          //get authTokens
          auth.authTokens = await module.login(auth.username, auth.password);
          //set authTokens
          module.setAuth({
            ...auth,
            authTokens: auth.authTokens,
            lastupdated: new Date(),
          });
        }
        const res = await module.getVOD(
          show_id,
          auth.authTokens,
          options,
        );
        return Promise.resolve(res);
      } else {
        return Promise.reject(
          logger(
            "getVOD",
            `Module ${module_id} doesn't have VOD enabled/implemented`,
          ),
        );
      }
    } catch (error) {
      return Promise.reject(logger("getVOD", error, true));
    }
  } else return Promise.reject(logger("getVOD", "Module ID not provided"));
}
/**
 * It gets the VOD episode from the module with the given module_id, show_id and epid
 * @param {string} module_id - The module id of the module you want to use.
 * @param {string} show_id - The show id of the show you want to get the episode from
 * @param {string} epid - The episode id
 * @returns A promise that resolves to a stream object
 */
export async function getVOD_EP(
  module_id: string,
  show_id: string,
  epid: string,
  playlist: boolean,
): Promise<{ data: StreamResponse | string; cache: boolean }> {
  if (module_id) {
    try {
      const module: ModuleType = new (await import(`./modules/${module_id}.ts`))
        .default();
      if (module.hasVOD) {
        const cache = await module.cacheFind(epid);
        const cache_enabled = (await module.getConfig()).url_cache_enabled;
        if (cache !== null && cache_enabled) {
          if (playlist) {
            const m3u8 = await rewritePlaylist(cache.data) as string;
            return Promise.resolve({ data: m3u8, cache: cache_enabled });
          }
          return Promise.resolve({
            data: cache.data,
            cache: cache_enabled,
          });
        } else {
          logger(
            "getVOD_EP",
            `${
              cache_enabled
                ? `No cached link found for episode '${epid}' in`
                : "Cache not enabled for"
            } module '${module.MODULE_ID}'${
              cache_enabled ? `, trying to retrieve from module` : ""
            }`,
          );
          const auth = await module.getAuth();
          if (module.authReq && (!auth.username || !auth.password)) {
            throw "Not posssible, credentials not set!";
          }
          if (
            !(auth.authTokens.length > 0) || typeof auth.authTokens !== "object"
          ) {
            logger("getVOD_EP", "authTokens not provided, trying login");
            //get authTokens
            auth.authTokens = await module.login(auth.username, auth.password);
            //set authTokens
            module.setAuth({
              ...auth,
              authTokens: auth.authTokens,
              lastupdated: new Date(),
            });
          }
          const res = await module.getVOD_EP(
            show_id,
            epid,
            auth.authTokens,
          );
          await module.cacheFill(epid, { ...res || {} });
          if (playlist) {
            const m3u8 = await rewritePlaylist({ ...res }) as string;
            return Promise.resolve({ data: m3u8, cache: cache_enabled });
          }
          return Promise.resolve({ data: res || {}, cache: cache_enabled });
        }
      } else {
        return Promise.reject(
          logger(
            "getVOD_EP",
            `Module ${module_id} doesn't have VOD enabled/implemented`,
          ),
        );
      }
    } catch (error) {
      return Promise.reject(logger("getVOD_EP", error, true));
    }
  } else return Promise.reject(logger("getVOD_EP", "Module ID not provided"));
}

/**
 * It takes in a module_id, username, and password, and returns a promise that resolves to the result
 * of the login function of the module with the given module_id
 * @param {string} module_id - The name of the module you want to use.
 * @param {string} username - The username of the account you want to login to
 * @param {string} password - The password of the user
 * @returns A promise that resolves to a boolean value.
 */
export async function login(
  module_id: string,
  username: string,
  password: string,
) {
  try {
    if (username && password) {
      const module: ModuleType = new (await import(`./modules/${module_id}.ts`))
        .default();
      return Promise.resolve(await module.login(username, password));
    } else {
      return Promise.reject(
        logger("login", "Username/Password not provided", true),
      );
    }
  } catch (error) {
    return Promise.reject(logger("login", error, true));
  }
}

// module.exports = {sanityCheck, searchChannel, login, getVODlist, getVOD, getVOD_EP}
