import { helpers, Router } from "https://deno.land/x/oak@v10.6.0/mod.ts";
import { Low } from "npm:lowdb";
import { JSONFile } from "npm:lowdb/node";
import { logger } from "../helpers/logger.ts";
import { Response } from "../helpers/ApiResponse.ts";
import { ModuleType } from "../moduleClass.ts";
import { valid_modules } from "../helpers/checkModules.ts";

const router = new Router();

/* A simple API that returns the cache of a module. */
router.get(
  `/cache`,
  async (context) => {
    type cache = {
      name: string;
      link: string;
      module: string;
      lastupdated: Date;
    };
    const query = helpers.getQuery(context);

    const adapter = new JSONFile<cache[]>(`${Deno.cwd()}/cache.json`);
    const db = new Low(adapter, []);
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
).get(
  /* A route that will flush the cache of a module. */
  `/clearcache`,
  async (context) => {
    if (context.params.module) {
      logger(
        "clearcache",
        `Flush cache request for module '${context.params.module}'`,
      );
      const module: ModuleType = new (await import(
        `${Deno.cwd()}/src/modules/${context.params.module}.ts`
      )).default();
      context.response.body = new Response(
        "SUCCESS",
        context.params.module,
        await module.flushCache(),
      );
    } else {
      logger("clearcache", `Flush cache request for all modules`);
      const modules: ModuleType[] = await Promise.all(
        valid_modules.map(async (mod) =>
          new (await import(`${Deno.cwd()}/src/modules/${mod}.ts`)).default()
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

export default router;
