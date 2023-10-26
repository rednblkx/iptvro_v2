import { Router } from "https://deno.land/x/oak@v10.6.0/mod.ts";
import { logger } from "../helpers/logger.ts";
import { Response } from "../helpers/ApiResponse.ts";
import * as Loader from "../loader.ts";
import { ModuleType } from "../moduleClass.ts";

const router = new Router();

/* A login endpoint for the API. It is using the module login function to get the authTokens. */
router.post(
  `/login`,
  async (context) => {
    let authTokens = [];
    logger("login", `login request for module '${context.params.module}'`);
    const mod: ModuleType = new (await import(
      `${Deno.cwd()}/src/modules/${context.params.module}.ts`
    )).default();
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
      context.params.module!,
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

export default router;
