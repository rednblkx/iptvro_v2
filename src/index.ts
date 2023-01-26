import {
  Application,
  helpers,
  Router,
} from "https://deno.land/x/oak@v10.6.0/mod.ts";

import {
  dejsEngine,
  oakAdapter,
  viewEngine,
} from "https://deno.land/x/view_engine@v10.6.0/mod.ts";

const app = new Application();

app.use(
  viewEngine(oakAdapter, dejsEngine, {
    viewRoot: `${Deno.cwd()}/views`,
  }),
);
const router = new Router();
app.use(router.routes());
app.use(router.allowedMethods());

import * as Loader from "./loader.ts";

import { ModuleType } from "./moduleClass.ts";
import { Low } from "npm:lowdb";
import { JSONFile } from "npm:lowdb/node";
import axios from "https://deno.land/x/axiod/mod.ts";

/* The below code is setting the port to 3000 if the environment variable PORT is not set. */
export const PORT = Number(Deno.env.get("PORT")) || 3000;
const debug = Deno.env.get("DEBUG")?.toLowerCase();

/* Checking if the modules are valid. */
export const valid_modules = await Loader.sanityCheck();
await Loader.cacheCleanup(valid_modules);
setInterval(async () => {
  await Loader.cacheCleanup(valid_modules);
}, 1000 * 60 * 60);

console.log(`\nValid modules: ${valid_modules}\n`);

if (debug === "true") {
  console.log(`DEBUG env true, verbose enabled!\n`);
}

/* The body_response class is a class that is used to create a response object that is sent back to the
client */
export class body_response {
  [k: string]: unknown;
  status: string;
  module: string;
  error?: string;
  authTokens?: string[] | null;

  constructor(module: string) {
    this.status = "SUCCESS";
    this.module = module;
  }
}

/**
 * The function takes in three parameters, the first two are required and the third is optional
 * @param {string} id - This is the id of the function that is calling the logger.
 * @param {string} message - The message you want to log.
 * @param {boolean} [isError] - boolean - if true, the logger will return an Error object instead of a
 * string.
 * @returns a string or an error.
 */
function logger(
  id: string,
  message: string | Error | Record<string, unknown>,
  isError?: boolean,
): string {
  if (Deno.env.get("DEBUG")?.toLowerCase() === "true") {
    if (isError) {
      if ((message as Error).message) {
        console.log(
          `\x1b[47m\x1b[30mindex\x1b[0m - !\x1b[41m\x1b[30m${id}\x1b[0m!: ${
            (message as Error).message
          }`,
        );
      } else {
        console.log(
          `\x1b[47m\x1b[30mindex\x1b[0m - !\x1b[41m\x1b[30m${id}\x1b[0m!: ${
            typeof message == "object" ? JSON.stringify(message) : message
          }`,
        );
      }
    } else {
      console.log(
        `\x1b[47m\x1b[30mindex\x1b[0m - \x1b[35m${id}\x1b[0m: ${
          typeof message == "object" ? JSON.stringify(message) : message
        }`,
      );
    }
  }
  if ((message as Error).message) {
    return `index - ${id}: ${((message as Error).message).substring(0, 200)}`;
  }
  return `loader - ${id}: ${
    typeof message == "object"
      ? JSON.stringify(message).substring(0, 200)
      : message.substring(0, 200)
  }`;
}

/* A simple API that returns the cache of a module. */
router.get("/cache", async (context) => {
  type cache = {
    name: string;
    link: string;
    module: string;
    lastupdated: Date;
  };
  const query = helpers.getQuery(context);
  const body: body_response & { result: cache | cache[] | null | undefined } = {
    ...new body_response(query.module),
    result: null,
  };
  const adapter = new JSONFile<cache[]>(`${Deno.cwd}/cache.json`);
  const db = new Low(adapter);
  await db.read();
  try {
    if (query.module) {
      const module = new (await import(`./modules/${query.module}.ts`))
        .default();
      logger(
        "cache",
        query.id
          ? `cache requested for id '${query.id}' on module '${query.module}'`
          : `cache requested for module ${query.module}`,
      );
      const cacheAll = db.data &&
        db.data.filter((a) =>
          query.id
            ? a.name === query.id && a.module === module.MODULE_ID
            : a.module === module.MODULE_ID
        );
      logger("cache", `cacheAll: ${JSON.stringify(cacheAll)}`);
      body.status = "SUCCESS";
      body.result = cacheAll;
      context.response.body = body;
    } else {
      logger("cache", `cache requested for all modules`);
      const cacheid = query.id
        ? db.data?.find((a) => a.name === query.id)
        : db.data;
      logger("cache", `cacheid: ${JSON.stringify(cacheid)}`);
      body.status = "SUCCESS";
      body.result = cacheid;
      context.response.body = body;
    }
  } catch (error) {
    body.status = "ERROR";
    body.error = error.message || error.toString().substring(0, 200);
    context.response.status = 500;
    context.response.body = body;
  }
});

/* A simple API that returns a stream URL for a given channel. */
router.get(
  "/live/:channel/:playlist(index.m3u8)?/:player(player)?",
  async (context) => {
    const query = helpers.getQuery(context);
    const body: body_response & {
      result: { stream: string; proxy?: string | undefined } | null | undefined;
    } = { ...new body_response(query.module), result: null };
    context.response.headers.set("Access-Control-Allow-Origin", "*");
    try {
      if (context.params.playlist == "index.m3u8") {
        logger(
          "live",
          `live stream requested for channel '${context.params.channel}' with parameter proxy`,
        );
        const stream = await Loader.searchChannel(
          context.params.channel,
          "",
          valid_modules,
        );
        const data = await Loader.rewritePlaylist(stream.data) as {
          stream: string;
          proxy?: string;
        };
        if (context.params.player == "player") {
          logger(
            "live",
            `live stream requested for channel '${context.params.channel}' with parameter player and proxy`,
          );
          if (data.stream) {
            // const checkRedirect = await axios.get(data.stream, {
            //   redirect: "follow",
            // });
            // const redir = checkRedirect.config.url !== data.stream
            //   ? checkRedirect.config.url
            //   : data.stream;
            // if (checkRedirect.config.url !== data.stream) {
            //   logger("live", `redirected to '${redir}' from '${data.stream}'`);
            // }
            context.render("player.ejs", {
              stream: `http://localhost:${PORT}/cors/${data.stream}`,
              proxy: data.proxy,
              origin: (new URL(data.stream)).hostname,
            });
          } else {
            context.render("player.ejs", {
              stream:
                `http://localhost:${PORT}/live/${context.params.channel}/index.m3u8`,
              proxy: "",
            });
          }
        } else {
          if (data.stream) {
            context.response.body = data.stream;
          } else {
            context.response.headers.set(
              "Content-Type",
              "application/vnd.apple.mpegurl",
            );
            context.response.body = data;
          }
        }
      } else {
        logger(
          "live",
          `live stream requested for channel '${context.params.channel}'`,
        );
        const data = await Loader.searchChannel(
          context.params.channel,
          "",
          valid_modules,
        );
        body.status = "SUCCESS";
        body.result = data.data;
        body.module = data.module;
        if (!body.result) {
          throw "No data received from method!";
        }
        if (context.params.player == "player") {
          logger(
            "live",
            `live stream requested for channel '${context.params.channel}' with player`,
          );
          const checkRedirect = await axios.get(data.data.stream, {
            redirect: "follow",
          });
          const redir = checkRedirect.config.url !== data.data.stream
            ? checkRedirect.config.url
            : data.data.stream;
          if (checkRedirect.config.url !== data.data.stream) {
            logger(
              "live",
              `redirected to '${redir}' from '${data.data.stream}'`,
            );
          }
          context.render("player.ejs", {
            stream: `http://localhost:${PORT}/cors/${redir}`,
            proxy: data.data.proxy,
            origin: (new URL(redir || "")).hostname,
          });
        } else {
          context.response.body = body;
        }
      }
    } catch (error) {
      body.status = "ERROR";
      body.error = error.message || error.toString().substring(0, 200);
      // context.status(400).json(body)
      context.response.status = 400;
      context.response.body = body;
    }
  },
);

/* A simple GET request that returns the live channels of a module. */
router.get("/:module/live/:playlist(index.m3u8)?", async (context, next) => {
  const body: body_response = new body_response(context.params.module);
  try {
    if (
      context.params.module &&
      valid_modules.find((x) => x == context.params.module) != undefined
    ) {
      logger(
        "live",
        `live channels requested for module '${context.params.module}'`,
      );
      const mod: ModuleType =
        new (await import(`./modules/${context.params.module}.ts`)).default();
      if (context.params.playlist == "index.m3u8") {
        const playlist = [];
        playlist.push(`#EXTM3U`);
        for (const channel in await mod.getChannels()) {
          playlist.push(
            `#EXTINF:-1,${
              (channel.split("-")).map((a) =>
                a[0].toUpperCase() + a.substring(1)
              ).join(" ")
            }`,
          );
          playlist.push(`http://localhost:${PORT}/live/${channel}/index.m3u8`);
        }
        // playlist.push(`#EXT-X-ENDLIST`);
        playlist.push("\n");
        context.response.headers.set("Access-Control-Allow-Origin", "*");
        context.response.headers.set("Content-Type", "application/x-mpegURL");
        context.response.body = playlist.join("\n");
      } else await next();
    } else {
      body.status = "ERROR";
      body.error = `Module '${context.params.module}' not found`;
      // res.status(400).json(body);
      context.response.status = 400;
      context.response.body = body;
    }
  } catch (error) {
    body.status = "ERROR";
    body.error = error.message || error.toString().substring(0, 200);
    // res.status(502).json(body)
    context.response.status = 500;
    context.response.body = body;
  }
}, async (ctx) => {
  const body: body_response & { result: string[] } = {
    ...new body_response(ctx.params.module),
    result: [],
  };

  try {
    if (
      ctx.params.module &&
      valid_modules.find((x) => x == ctx.params.module) != undefined
    ) {
      logger(
        "live",
        `live channels requested for module '${ctx.params.module}'`,
      );
      const mod: ModuleType =
        new (await import(`./modules/${ctx.params.module}.ts`)).default();
      body.status = "SUCCESS";
      body.result = Object.keys((await mod.getConfig()).chList);
      if (!body.result) {
        throw "No data received from method!";
      }
      // res.json(body)
      ctx.response.body = body;
    } else {
      body.status = "ERROR";
      body.error = `Module '${ctx.params.module}' not found`;
      // res.status(400).json(body);
      ctx.response.status = 400;
      ctx.response.body = body;
    }
  } catch (error) {
    logger("index", body);
    logger("index", error);
    body.status = "ERROR";
    body.error = error;
    // res.status(502).json(body)
    // ctx.response.status = 500;
    ctx.response.body = "";
  }
});

router.get(
  "/:module/live/:channel/:playlist(index.m3u8)?/:player(player)?",
  async (context) => {
    const body: body_response & {
      result?: { stream: string; proxy?: string | undefined };
    } = { ...new body_response(context.params.module) };
    if (context.params.module) {
      if (valid_modules.find((x) => x == context.params.module) != undefined) {
        if (context.params.playlist == "index.m3u8") {
          try {
            logger(
              "live",
              `live stream requested for channel '${context.params.channel}' with parameter proxy`,
            );
            const stream = await Loader.searchChannel(
              context.params.channel,
              context.params.module,
              valid_modules,
            );
            const data = await Loader.rewritePlaylist(stream.data) as {
              stream: string;
              proxy?: string;
            };
            if (context.params.player == "player") {
              logger(
                "live",
                `live stream requested for channel '${context.params.channel}' with also parameter player`,
              );
              if (data.stream) {
                // const checkRedirect = await axios.get(data.stream);
                // const redir = checkRedirect.config.url !== data.stream
                //   ? checkRedirect.config.url
                //   : data.stream;
                // if (checkRedirect.config.url !== data.stream) {
                //   logger(
                //     "live",
                //     `redirected to '${redir}' from '${data.stream}'`,
                //   );
                // }
                context.render("player.ejs", {
                  stream: `http://localhost:${PORT}/cors/${data.stream}`,
                  proxy: data.proxy,
                  origin: (new URL(data.stream)).hostname,
                });
              } else {
                context.render("player.ejs", {
                  stream:
                    `http://localhost:${PORT}/live/${context.params.channel}/index.m3u8`,
                  proxy: "",
                });
              }
            } else {
              // data.stream ? res.send(data.stream) : res.set("Content-Type", "application/vnd.apple.mpegurl").send(data);
              if (data.stream) {
                context.response.body = data.stream;
              } else {
                context.response.headers.set(
                  "Content-Type",
                  "application/vnd.apple.mpegurl",
                );
                context.response.body = data;
              }
            }
          } catch (error) {
            body.status = "ERROR";
            body.error = error;
            // res.status(500).json(body);
            context.response.status = 500;
            context.response.body = body;
          }
        } else {
          try {
            logger(
              "live",
              `live stream requested for channel '${context.params.channel}' on module '${context.params.module}'`,
            );
            const data = await Loader.searchChannel(
              context.params.channel,
              context.params.module,
              valid_modules,
            );
            body.status = "SUCCESS";
            body.result = data.data;
            body.module = data.module;
            if (!body.result) {
              throw "No data received from method!";
            }
            if (context.params.player == "player") {
              const checkRedirect = await axios.get(data.data.stream);
              const redir = checkRedirect.config.url !== data.data.stream
                ? checkRedirect.config.url
                : data.data.stream;
              if (checkRedirect.config.url !== data.data.stream) {
                logger(
                  "live",
                  `redirected to '${redir}' from '${data.data.stream}'`,
                );
              }
              logger(
                "live",
                `live stream requested for channel '${context.params.channel}' with parameter player`,
              );
              context.render("player.ejs", {
                stream: `http://localhost:${PORT}/cors/${redir}`,
                proxy: `http://localhost:${PORT}/cors/${data.data.proxy}`,
                origin: (new URL(redir || "")).hostname,
              });
            } else {
              context.response.body = data;
            }
          } catch (error) {
            body.status = "ERROR";
            body.error = error.message || error;
            // res.status(500).json(body);
            context.response.status = 500;
            context.response.body = body;
          }
        }
      } else {
        body.status = "ERROR";
        body.error = `Module '${context.params.module}' not found`;
        // res.status(400).json(body);
        context.response.status = 400;
        context.response.body = body;
      }
    }
  },
);

/* A simple API endpoint that returns a list of VODs for a given module. */
router.get(`/:module(${valid_modules.join("|")})/vod`, async (context) => {
  const body: body_response & { result?: Record<string, unknown>[] } = {
    ...new body_response(context.params.module),
  };
  const query = helpers.getQuery(context);
  try {
    logger("vod", `VOD list requested from module '${context.params.module}'`);
    body.status = "SUCCESS";
    body.result = await Loader.getVODlist(
      context.params.module,
      Number(query.page),
    );
    if (!body.result) {
      throw "No data received from method!";
    }
    // res.json(body)
    context.response.body = body;
  } catch (error) {
    body.status = "ERROR";
    body.error = error.message || error.toString().substring(0, 200);
    // res.status(500).json(body)
    context.response.status = 500;
    context.response.body = body;
  }
});

/* A simple API endpoint that returns the episodes list for the VOD requested. */
router.get(
  `/:module(${valid_modules.join("|")})/vod/:show`,
  async (context) => {
    const body: body_response & {
      result?: Record<string, unknown> | Record<string, unknown>[];
    } = {
      ...new body_response(context.params.module),
    };
    try {
      if (
        context.params.module &&
        valid_modules.find((x) => x == context.params.module) != undefined
      ) {
        logger(
          "vod",
          `VOD '${context.params.show}' requested from module '${context.params.module}'`,
        );
        const query = helpers.getQuery(context);
        body.status = "SUCCESS";
        body.result = await Loader.getVOD(
          context.params.module,
          context.params.show,
          Number(query.page),
        );
        if (!body.result) {
          throw "No data received from method!";
        }
        // res.json(body)
        context.response.body = body;
      } else {
        body.status = "ERROR";
        body.error = `Module '${context.params.module}' not found`;
        // res.status(400).json(body);
        context.response.status = 400;
        context.response.body = body;
      }
    } catch (error) {
      body.status = "ERROR";
      body.error = error.message || error.toString().substring(0, 200);
      // res.status(500).json(body)
      context.response.status = 500;
      context.response.body = body;
    }
  },
);

/* A simple API endpoint that returns the episode for the VOD requested. */
router.get(
  `/:module(${valid_modules.join("|")})/vod/:show/:epid`,
  async (context) => {
    const body: body_response & { result?: string | null } = {
      ...new body_response(context.params.module),
    };

    try {
      if (
        context.params.module &&
        valid_modules.find((x) => x == context.params.module) != undefined
      ) {
        logger(
          "vod",
          `VOD '${context.params.show}' episode '${context.params.epid}' requested from module '${context.params.module}'`,
        );
        body.status = "SUCCESS";
        body.result = await Loader.getVOD_EP(
          context.params.module,
          context.params.show,
          context.params.epid,
        );
        if (!body.result) {
          throw "No data received from method!";
        }
        // res.json(body)
        context.response.body = body;
      } else {
        body.status = "ERROR";
        body.result = null;
        body.error = `Module '${context.params.module}' not found`;
        // res.status(400).json(body);
        context.response.status = 400;
        context.response.body = body;
      }
    } catch (error) {
      body.status = "ERROR";
      body.result = null;
      body.error = error.message || error.toString().substring(0, 200);
      // res.status(500).json(body)
      context.response.status = 500;
      context.response.body = body;
    }
  },
);

/* A login endpoint for the API. It is using the module login function to get the authTokens. */
router.post(`/:module(${valid_modules.join("|")})/login`, async (context) => {
  let authTokens = [];
  const body: body_response & {
    result?: Record<string | number | symbol, never> | null;
  } = {
    ...new body_response(context.params.module),
  };
  logger("login", `login request for module '${context.params.module}'`);
  try {
    const mod: ModuleType =
      new (await import(`./modules/${context.params.module}.ts`)).default();
    const config = await mod.getAuth();
    const result = await (context.request.body({ type: "json" })).value;

    logger(
      "login",
      `'${context.params.module}' login attempt with username ${
        result.username
          ? result.username + " from request"
          : config.username + " from file (request empty)"
      }`,
    );
    authTokens = await Loader.login(
      context.params.module,
      result.username || config.username,
      result.password || config.password,
    );
    if (authTokens) {
      logger(
        "login",
        `'${context.params.module}' login success, got authTokens: ${authTokens}`,
      );
      config.authTokens = authTokens;
      config.lastupdated = new Date();
      await mod.setAuth(config);
      body.status = "SUCCESS";
      body.authTokens = authTokens;
      // res.json(body);
      context.response.body = body;
    } else {
      body.status = "ERROR";
      body.authTokens = null;
      body.error =
        `Authentication failed for module '${context.params.module}'`;
      // res.status(400).json(body);
      context.response.status = 400;
      context.response.body = body;
    }
  } catch (error) {
    body.status = "ERROR";
    body.authTokens = null;
    body.error = error.message || error.toString().substring(0, 200);
    // res.status(500).json(body)
    context.response.status = 500;
    context.response.body = body;
  }
});

/* A route that will flush the cache of a module. */
router.get(
  `/:module(${valid_modules.join("|")})?/clearcache`,
  async (context) => {
    const body: body_response & {
      result?: { [k: string]: string } | string | null;
    } = { ...new body_response(context.params.module) };

    try {
      if (context.params.module) {
        logger(
          "clearcache",
          `Flush cache request for module '${context.params.module}'`,
        );
        const module: ModuleType =
          new (await import(`./modules/${context.params.module}.ts`)).default();
        body.status = "SUCCESS";
        body.result = await module.flushCache();
        // res.json(body)
        context.response.body = body;
      } else {
        logger("flushcache", `Flush cache request for all modules`);
        const modules: ModuleType[] = await Promise.all(
          valid_modules.map(async (mod) =>
            new (await import(`./modules/${mod}.ts`)).default()
          ),
        );
        body.status = "SUCCESS";
        body.result = {};
        for (const module of modules) {
          body.result[module.MODULE_ID] = await module.flushCache();
        }
        // res.json(body)
        context.response.body = body;
      }
    } catch (error) {
      body.status = "ERROR";
      body.error = error.message || error.toString().substring(0, 200);
      // res.status(500).json(body)
      context.response.status = 500;
      context.response.body = body;
    }
  },
);

/* A route that updates the channel list for a module. */
router.get(
  `/:module(${valid_modules.join("|")})?/updatechannels`,
  async (context) => {
    const body: body_response & {
      result?: Record<string, unknown> | string | null;
    } = {
      ...new body_response(context.params.module),
    };

    try {
      if (context.params.module) {
        logger(
          "updatechannels",
          `Update channels request for module '${context.params.module}'`,
        );
        const mod: ModuleType =
          new (await import(`./modules/${context.params.module}.ts`)).default();
        body.status = "SUCCESS";
        body.result = await mod.getChannels();
        if (!body.result) {
          throw "No data received from method!";
        }
        //save config
        await mod.setConfig("chList", body.result);
        //log to console
        logger(
          "updatechannels",
          `Channels updated for module '${context.params.module}'`,
        );
        // res.json(body)
        context.response.body = body;
      } else {
        logger("updatechannels", `Update channels request for all modules`);
        const mod: ModuleType[] = await Promise.all(
          valid_modules.map(async (val) =>
            new (await import(`./modules/${val}.ts`)).default()
          ),
        );
        const updated = [];
        for (const module of mod) {
          const ch = await module.getChannels();
          ch && updated.push(module.MODULE_ID);
          //save config
          ch && await module.setConfig("chList", ch);
        }
        if (updated.length > 0) {
          body.status = "SUCCESS";
          body.result = `Channel list updated for modules '${
            updated.join(",")
          }'`;
          // res.json(body)
          context.response.body = body;
        } else throw "Channel list could not be updated for all modules";
      }
    } catch (error) {
      body.status = "ERROR";
      body.error = error.message ||
        error.substring(0, error.toString().indexOf("\n"));
      // res.status(500).json(body);
      context.response.status = 500;
      context.response.body = body;
    }
  },
);

/* A simple API endpoint that returns the module's configuration. */
router.get(`/:module(${valid_modules.join("|")})`, async (context) => {
  const body: body_response & {
    result?: Record<string, unknown> | string | null;
  } = {
    ...new body_response(context.params.module),
  };
  try {
    const mod: ModuleType =
      new (await import(`./modules/${context.params.module}.ts`)).default();
    body.result = {
      hasLive: mod.hasLive,
      hasVOD: mod.hasVOD,
      chList: (await mod.getConfig()).chList,
    };
    // res.json(body);
    context.response.body = body;
  } catch (error) {
    body.status = "ERROR";
    body.error = error.message || error.toString().substring(0, 200);
    // res.status(400).json(body)
    context.response.status = 400;
    context.response.body = body;
  }
});

/**
 * Checks whether cors proxy server should serve the url
 * @param url URL to check
 * @param rules Comma separated list of rules (e.g. "https://duck.com,https://example.com")
 */
export function isUrlAllowed(
  url: string,
  rules: string,
): boolean {
  if (rules !== "") {
    const rulesList = rules.split(",");
    return rulesList.some((rule) => {
      /**
       * * a) rule without trailing slash matches exactly with url (e.g. rule: https://duck.com/, url: https://duck.com)
       * * b1) url starts with rule (including trailing slash; e.g. rule: https://example.com, url: https://example.com/path1)
       * * b2) url starts with rule without trailing slash (only if rule contains at least one slash for path
       * *        (to avoid using rule as subdomain, e.g. https://duck.com.example.com/)
       * *        e.g. rule: https://example.com/path1, url: https://example.com/path123)
       */
      const ruleWithoutTrailingSlash = rule.endsWith("/")
        ? rule.substr(0, rule.length - 1)
        : rule;
      const ruleContainsPath = (rule.match(/\//g) || []).length >= 3;
      return (
        url === ruleWithoutTrailingSlash ||
        url.startsWith(
          rule + (ruleContainsPath || rule.endsWith("/") ? "" : "/"),
        )
      );
    });
  }
  return true;
}

app.use(async (ctx, next) => {
  try {
    if (ctx.request.url.toString().includes("/cors/")) {
      const url = ctx.request.url.toString().slice(
        `${ctx.request.url.protocol}//${ctx.request.headers.get("host")}/cors/`
          .length,
      );
      if (!isUrlAllowed(url, "")) {
        ctx.response.body = "403 Forbidden";
        ctx.response.status = 403;
      }
      const response = await fetch(url, {
        method: ctx.request.method,
        body: await ctx.request.body().value,
      });
      const text = await response.arrayBuffer();
      const headers = new Headers();
      headers.set("Access-Control-Allow-Origin", "");
      ctx.response.body = text;
      ctx.response.headers = headers;
    } else {
      // ctx.response.body = "404 Not Found";
      // ctx.response.status = 404;
      next();
    }
  } catch {
    ctx.response.body = "500 Internal Server Error";
    ctx.response.status = 500;
  }
});

/* A catch all route that will return a 404 error with a list of all available modules */
app.use((context) => {
  const body: { status: string; error: string } = {
    status: "ERROR",
    error: "Endpoint did not match any route, listing all available modules: " +
      valid_modules.join(", "),
  };
  context.response.status = 404;
  context.response.body = body;
});

// createServer(8080, "/cors/", "", "");

app.addEventListener("listen", () => {
  logger("oak", `Listening on localhost:${PORT}`);
});

await app.listen({ port: PORT });
