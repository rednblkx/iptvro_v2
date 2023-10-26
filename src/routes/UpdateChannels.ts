import { Router } from "https://deno.land/x/oak@v10.6.0/mod.ts";
import { logger } from "../helpers/logger.ts";
import { Response } from "../helpers/ApiResponse.ts";
import { ModuleType } from "../moduleClass.ts";
import { valid_modules } from "../helpers/checkModules.ts";

const router = new Router();

/* A route that updates the channel list for a module. */
router.get(
  `/updatechannels`,
  async (context) => {
    if (context.params.module) {
      logger(
        "updatechannels",
        `Update channels request for module '${context.params.module}'`,
      );
      const mod: ModuleType = new (await import(
        `${Deno.cwd()}/src/modules/${context.params.module}.ts`
      )).default();
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
          new (await import(`${Deno.cwd()}/src/modules/${val}.ts`)).default()
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

export default router;
