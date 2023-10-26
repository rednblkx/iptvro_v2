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
import { ModuleType } from "./moduleClass.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { valid_modules } from "./helpers/checkModules.ts";
import CacheRouter from "./routes/Cache.ts";
import LiveRouter from "./routes/Live.ts";
import VodRouter from "./routes/Vod.ts";
import LoginRouter from "./routes/Login.ts";
import ChannelsRouter from "./routes/UpdateChannels.ts";
import ModInfo from "./routes/ModInfo.ts";
import { logger } from "./helpers/logger.ts";

/* The below code is setting the port to 3000 if the environment variable PORT is not set. */
export const PORT = Number(Deno.env.get("PORT")) || 3000;
const debug = Deno.env.get("DEBUG")?.toLowerCase();

if (debug === "true") {
  console.log(`DEBUG env true, verbose enabled!\n`);
}

const app = new Application({ logErrors: Boolean(debug) });

const router = new Router();

app.use(
  viewEngine(oakAdapter, dejsEngine, {
    viewRoot: `${Deno.cwd()}/views`,
  }),
);

app.use(oakCors());

app.use(async (ctx, next: () => Promise<unknown>) => {
  const body: { status: string; error: string } = {
    status: "",
    error: "",
  };
  try {
    const query = helpers.getQuery(ctx);
    logger("oak", `query params: ${JSON.stringify(query)}`);
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

const universalRoutes = new Router().use(
  `/:module(${valid_modules.join("|") || "null"})?`,
  CacheRouter.routes(),
  LiveRouter.routes(),
  ChannelsRouter.routes(),
);
const moduleRoutes = new Router().use(
  `/:module(${valid_modules.join("|") || "null"})`,
  VodRouter.routes(),
  LoginRouter.routes(),
  ModInfo.routes()
);

app.use(universalRoutes.routes());
app.use(moduleRoutes.routes());
app.use(router.routes());
app.use(router.allowedMethods());

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

router.get(
  `/modules`,
  async (ctx) => {
    const modules = await Promise.all<ModuleType>(
      valid_modules.map(async (val) =>
        new (await import(`./modules/${val}.ts`)).default()
      ),
    );
    const live_modules: { id: string; logo: string }[] = [];
    const vod_modules: { id: string; logo: string }[] = [];
    modules.forEach((mod) => {
      if (mod.hasLive) {
        live_modules.push({ id: mod.MODULE_ID, logo: mod.logo });
      }
      if (mod.hasVOD) {
        vod_modules.push({ id: mod.MODULE_ID, logo: mod.logo });
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
        `${ctx.request.url.protocol}//${ctx.request.url.host}/cors/`
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
