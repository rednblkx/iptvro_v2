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

import * as Loader from "./loader.ts";

import { ModuleType, StreamResponse } from "./moduleClass.ts";
import { Low } from "npm:lowdb";
import { JSONFile } from "npm:lowdb/node";
import axios from "https://deno.land/x/axiod@0.26.2/mod.ts";

/* The below code is setting the port to 3000 if the environment variable PORT is not set. */
export const PORT = Number(Deno.env.get("PORT")) || 3000;
const debug = Deno.env.get("DEBUG")?.toLowerCase();

const app = new Application({ logErrors: Boolean(debug) });
const router = new Router();

app.use(
  viewEngine(oakAdapter, dejsEngine, {
    viewRoot: `${Deno.cwd()}/views`,
  }),
);

app.use(async (ctx, next) => {
  if (ctx.request.method === "OPTIONS") {
    ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    ctx.response.headers.set(
      "Access-Control-Allow-Methods",
      "POST, GET, OPTIONS",
    );
    ctx.response.status = 200;
  } else await next();
});

app.use(async (ctx, next: () => Promise<unknown>) => {
  const body: { status: string; error: string } = {
    status: "",
    error: "",
  };
  try {
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    await next();
  } catch (error) {
    body.status = "ERROR";
    body.error = error.message || error.toString().substring(0, 200);
    ctx.response.status = 500;
    ctx.response.body = body;
  }
});

app.use(async (ctx, next) => {
  if (valid_modules.includes(ctx.request.url.pathname.slice(1))) {
    const module: ModuleType =
      new (await import(`./modules/${ctx.request.url.pathname.slice(1)}.ts`))
        .default();
    const auth = await module.getAuth();
    if ((!auth.username || !auth.password) && module.authReq) {
      throw "Username/Password not set but required";
    }
  }
  await next();
});

app.use(router.routes());
app.use(router.allowedMethods());

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

class Response {
  status: "SUCCESS" | "ERROR";
  module: string | undefined;
  data: string | Record<string, unknown> | unknown[] | null;
  cache?: boolean;
  error?: string;

  constructor(
    status: "SUCCESS" | "ERROR",
    module: string | undefined,
    data: string | Record<string, unknown> | unknown[] | null,
    cache?: boolean,
    error?: string,
  ) {
    this.status = status;
    this.module = module;
    this.data = data;
    this.cache = cache;
    this.error = error;
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
  message: unknown,
  isError?: boolean,
): string {
  if (Deno.env.get("DEBUG")?.toLowerCase() === "true") {
    if (isError) {
      if ((message as Error).message) {
        console.error(
          `\x1b[47m\x1b[30mindex\x1b[0m - !\x1b[41m\x1b[30m${id}\x1b[0m!: ${
            (message as Error).message
          }`,
        );
      } else {
        console.error(
          `\x1b[47m\x1b[30mindex\x1b[0m - !\x1b[41m\x1b[30m${id}\x1b[0m!: ${
            typeof message == "object"
              ? JSON.stringify(message).substring(0, 200)
              : message
          }`,
        );
      }
    } else {
      console.log(
        `\x1b[47m\x1b[30mindex\x1b[0m - \x1b[35m${id}\x1b[0m: ${
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
        ? `${new Date().toLocaleString()} | index - ${
          JSON.stringify(message, null, 2)
        }\n`
        : `${new Date().toLocaleString()} | index - ${message} \n`,
      { append: true, create: true },
    ).then(() => {
      // console.log("Log wrote on dir!");
    }).catch((err) => {
      if (err instanceof Deno.errors.NotFound) {
        Deno.mkdir("logs").then(() => {
          Deno.writeTextFile(
            `logs/log${date}.txt`,
            typeof message == "object"
              ? `${new Date().toLocaleString()} | index - ${
                JSON.stringify(message, null, 2)
              }\n`
              : `${new Date().toLocaleString()} | index - ${message} \n`,
            { append: true, create: true },
          ).then(() => {
            // console.log("Log wrote on dir!");
          });
        });
      } else console.error(err);
    });
  }
  if ((message as Error).message) {
    return `index - ${id}: ${((message as Error).message).substring(0, 200)}`;
  }
  return `loader - ${id}: ${
    typeof message == "object"
      ? JSON.stringify(message).substring(0, 200)
      : (message as string).substring(0, 200)
  }`;
}

/* A simple API that returns the cache of a module. */
router.get(
  `/:module(${valid_modules.join("|") || "null"})?/cache`,
  async (context) => {
    type cache = {
      name: string;
      link: string;
      module: string;
      lastupdated: Date;
    };
    const query = helpers.getQuery(context);
    const adapter = new JSONFile<cache[]>(`${Deno.cwd}/cache.json`);
    const db = new Low(adapter);
    await db.read();
    if (context.params.module) {
      logger(
        "cache",
        query.id
          ? `cache requested for id '${query.id}' on module '${context.params.module}'`
          : `cache requested for module ${context.params.module}`,
      );
      const cacheAll = db.data &&
        db.data.filter((a) =>
          query.id
            ? a.name === query.id && a.module === context.params.module
            : a.module === context.params.module
        );
      logger("cache", `cacheAll: ${JSON.stringify(cacheAll)}`);
      context.response.body = new Response(
        "SUCCESS",
        context.params.module,
        cacheAll,
      );
    } else {
      logger("cache", `cache requested for all modules`);
      const cacheid = query.id
        ? db.data?.find((a) => a.name === query.id)
        : db.data;
      logger("cache", `cacheid: ${JSON.stringify(cacheid)}`);
      context.response.body = new Response(
        "SUCCESS",
        context.params.module,
        cacheid || null,
      );
    }
  },
);

/* A simple API that returns a stream URL for a given channel. */
router.get(
  "/live/:channel/:playlist(index.m3u8)?/:player(player)?",
  async (context) => {
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
      const data = await Loader.rewritePlaylist(stream.data) as StreamResponse;
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
            stream: `//${context.request.url.host}/cors/${data.stream}`,
            proxy: `//${context.request.url.host}/cors/${data.drm?.url}`,
            headers: data.drm?.headers || null,
          });
        } else {
          context.render("player.ejs", {
            stream:
              `//${context.request.url.host}/live/${context.params.channel}/index.m3u8`,
            proxy: "",
            headers: data.drm?.headers || null,
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
      if (!data.data) {
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
          stream: `//${context.request.url.host}/cors/${redir}`,
          proxy: data.data.drm?.url,
          headers: data.data.drm?.headers || null,
        });
      } else {
        context.response.body = new Response(
          "SUCCESS",
          data.module,
          data.data,
          data.cache,
        );
      }
    }
  },
);

/* A simple GET request that returns the live channels of a module. */
router.get(
  `/:module(${valid_modules.join("|") || "null"})/live/:playlist(index.m3u8)?`,
  async (context) => {
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
            (channel.split("-")).map((a) => a[0].toUpperCase() + a.substring(1))
              .join(" ")
          }`,
        );
        playlist.push(`//localhost:${PORT}/live/${channel}/index.m3u8`);
      }
      // playlist.push(`#EXT-X-ENDLIST`);
      playlist.push("\n");
      context.response.headers.set("Content-Type", "application/x-mpegURL");
      context.response.body = playlist.join("\n");
    } else {
      const mod: ModuleType =
        new (await import(`./modules/${context.params.module}.ts`)).default();
      const data = Object.keys((await mod.getConfig()).chList);
      if (!data) {
        throw "No data received from method!";
      }
      // res.json(body)
      context.response.body = new Response(
        "SUCCESS",
        context.params.module,
        data,
      );
    }
  },
);

router.get(
  `/:module(${
    valid_modules.join("|") || "null"
  })/live/:channel/:playlist(index.m3u8)?/:player(player)?`,
  async (context) => {
    if (context.params.playlist == "index.m3u8") {
      logger(
        "live",
        `live stream requested for channel '${context.params.channel}' with parameter proxy`,
      );
      const stream = await Loader.searchChannel(
        context.params.channel,
        context.params.module,
        valid_modules,
      );
      const data = await Loader.rewritePlaylist(stream.data) as StreamResponse;
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
            stream: `//${context.request.url.host}/cors/${data.stream}`,
            proxy: data.drm?.url,
            headers: data.drm?.headers || null,
          });
        } else {
          context.render("player.ejs", {
            stream:
              `//${context.request.url.host}/live/${context.params.channel}/index.m3u8`,
            proxy: "",
            headers: null,
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
    } else {
      logger(
        "live",
        `live stream requested for channel '${context.params.channel}' on module '${context.params.module}'`,
      );
      const data = await Loader.searchChannel(
        context.params.channel,
        context.params.module,
        valid_modules,
      );
      if (!data.data) {
        throw "No data received from method!";
      }
      if (context.params.player == "player") {
        // const checkRedirect = await axios.get(data.data.stream);
        // const redir = checkRedirect.config.url !== data.data.stream
        //   ? checkRedirect.config.url
        //   : data.data.stream;
        // if (checkRedirect.config.url !== data.data.stream) {
        //   logger(
        //     "live",
        //     `redirected to '${redir}' from '${data.data.stream}'`,
        //   );
        // }
        logger(
          "live",
          `live stream requested for channel '${context.params.channel}' with parameter player`,
        );
        context.render("player.ejs", {
          stream: `//${context.request.url.host}/cors/${data.data.stream}`,
          proxy: `//${context.request.url.host}/cors/${data.data.drm?.url}`,
          headers: data.data.drm?.headers || null,
        });
      } else {
        context.response.body = new Response(
          "SUCCESS",
          data.module,
          data.data,
          data.cache,
        );
      }
    }
  },
);

/* A simple API endpoint that returns a list of VODs for a given module. */
router.get(
  `/:module(${valid_modules.join("|") || "null"})/vod`,
  async (context) => {
    const query = helpers.getQuery(context);
    logger("vod", `VOD list requested from module '${context.params.module}'`);
    const list = await Loader.getVODlist(
      context.params.module,
      { ...query },
    );
    if (!list?.data) {
      throw "No data received from method!";
    }
    context.response.body = new Response(
      "SUCCESS",
      context.params.module,
      list,
    );
  },
);

/* A simple API endpoint that returns the episodes list for the VOD requested. */
router.get(
  `/:module(${valid_modules.join("|") || "null"})/vod/:show`,
  async (context) => {
    logger(
      "vod",
      `VOD '${context.params.show}' requested from module '${context.params.module}'`,
    );
    const query = helpers.getQuery(context);
    const data = await Loader.getVOD(
      context.params.module,
      context.params.show,
      query,
    );
    if (!data) {
      throw "No data received from method!";
    }
    // res.json(body)
    context.response.body = new Response(
      "SUCCESS",
      context.params.module,
      data,
    );
  },
);

/* A simple API endpoint that returns the episode for the VOD requested. */
router.get(
  `/:module(${
    valid_modules.join("|") || "null"
  })/vod/:show/:epid/:playlist?/:player(player)?`,
  async (context) => {
    logger(
      "vod",
      `VOD '${context.params.show}' episode '${context.params.epid}' requested from module '${context.params.module}'`,
    );
    const data = await Loader.getVOD_EP(
      context.params.module,
      context.params.show,
      context.params.epid,
      context.params.playlist ? true : false,
    );
    if (!data) {
      throw "No data received from method!";
    }
    if (context.params.playlist) {
      if (context.params.player) {
        context.render("player.ejs", {
          stream: typeof data.data === "string"
            ? `//${context.request.url.host}/${context.params.module}/vod/${context.params.show}/${context.params.epid}/index.m3u8`
            : (data.data as Record<string, unknown>).stream,
          proxy: (data.data as StreamResponse).drm?.url,
          headers: (data.data as StreamResponse).drm?.headers,
        });
      } else {
        context.response.headers.set("Content-Type", "application/x-mpegURL");
        context.response.body = typeof data.data === "string"
          ? data.data
          : new Response(
            "SUCCESS",
            context.params.module,
            data.data,
            data.cache,
          );
      }
    } else {
      context.response.body = new Response(
        "SUCCESS",
        context.params.module,
        data.data,
        data.cache,
      );
    }
  },
);

/* A login endpoint for the API. It is using the module login function to get the authTokens. */
router.post(
  `/:module(${valid_modules.join("|") || "null"})/login`,
  async (context) => {
    let authTokens = [];
    logger("login", `login request for module '${context.params.module}'`);
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
      context.response.body = new Response(
        "SUCCESS",
        context.params.module,
        authTokens,
      );
    } else {
      context.response.status = 400;
      context.response.body = new Response(
        "ERROR",
        context.params.module,
        null,
        undefined,
        `Authentication failed for module '${context.params.module}'`,
      );
    }
  },
);

/* A route that will flush the cache of a module. */
router.get(
  `/:module(${valid_modules.join("|") || "null"})?/clearcache`,
  async (context) => {
    if (context.params.module) {
      logger(
        "clearcache",
        `Flush cache request for module '${context.params.module}'`,
      );
      const module: ModuleType =
        new (await import(`./modules/${context.params.module}.ts`)).default();
      context.response.body = new Response(
        "SUCCESS",
        context.params.module,
        await module.flushCache(),
      );
    } else {
      logger("flushcache", `Flush cache request for all modules`);
      const modules: ModuleType[] = await Promise.all(
        valid_modules.map(async (mod) =>
          new (await import(`./modules/${mod}.ts`)).default()
        ),
      );
      const data: { [k: string]: string } = {};
      for (const module of modules) {
        data[module.MODULE_ID] = await module.flushCache();
      }
      context.response.body = new Response("SUCCESS", undefined, data);
    }
  },
);

/* A route that updates the channel list for a module. */
router.get(
  `/:module(${valid_modules.join("|") || "null"})?/updatechannels`,
  async (context) => {
    if (context.params.module) {
      logger(
        "updatechannels",
        `Update channels request for module '${context.params.module}'`,
      );
      const mod: ModuleType =
        new (await import(`./modules/${context.params.module}.ts`)).default();
      const channels = await mod.getChannels();
      if (!channels) {
        throw "No data received from method!";
      }
      //save config
      await mod.setConfig("chList", channels);
      //log to console
      logger(
        "updatechannels",
        `Channels updated for module '${context.params.module}'`,
      );
      // res.json(body)
      context.response.body = new Response(
        "SUCCESS",
        context.params.module,
        channels,
      );
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
        context.response.body = new Response(
          "SUCCESS",
          undefined,
          `Channel list updated for modules '${updated.join(",")}'`,
        );
      } else throw "Channel list could not be updated for all modules";
    }
  },
);

/* A simple API endpoint that returns the module's configuration. */
router.get(
  `/:module(${valid_modules.join("|") || "null"})`,
  async (context) => {
    const mod: ModuleType =
      new (await import(`./modules/${context.params.module}.ts`)).default();
    context.response.body = new Response("SUCCESS", context.params.module, {
      hasLive: mod.hasLive,
      hasVOD: mod.hasVOD,
      chList: (await mod.getConfig()).chList,
      authReq: mod.authReq,
    });
  },
);

router.get(
  `/modules`,
  async (ctx) => {
    const modules = await Promise.all<ModuleType>(
      valid_modules.map(async (val) =>
        new (await import(`./modules/${val}.ts`)).default()
      ),
    );
    const live_modules: string[] = [];
    const vod_modules: string[] = [];
    modules.forEach((mod) => {
      if (mod.hasLive) {
        live_modules.push(mod.MODULE_ID);
      }
      if (mod.hasVOD) {
        vod_modules.push(mod.MODULE_ID);
      }
    });

    ctx.response.body = new Response("SUCCESS", undefined, {
      live: live_modules,
      vod: vod_modules,
    });
  },
);

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
      headers.set("Access-Control-Allow-Origin", "*");
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

app.addEventListener("listen", () => {
  logger("oak", `Listening on localhost:${PORT}`);
});

await app.listen({
  port: PORT,
});
