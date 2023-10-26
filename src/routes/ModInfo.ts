import { Router } from "https://deno.land/x/oak@v10.6.0/mod.ts";
import { Response } from "../helpers/ApiResponse.ts";
import { ModuleType } from "../moduleClass.ts";

const router = new Router();

/* A simple API endpoint that returns the module's configuration. */
router.get(
  `/`,
  async (context) => {
    const mod: ModuleType = new (await import(
      `${Deno.cwd()}/src/modules/${context.params.module}.ts`
    )).default();
    context.response.body = new Response("SUCCESS", context.params.module, {
      hasLive: mod.hasLive,
      hasVOD: mod.hasVOD,
      chList: (await mod.getConfig()).chList,
      authReq: mod.authReq,
      searchEnabled: mod.searchEnabled,
    });
  },
);

export default router;
