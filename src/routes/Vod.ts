import { helpers, Router } from "https://deno.land/x/oak@v10.6.0/mod.ts";
import { logger } from "../helpers/logger.ts";
import { Response } from "../helpers/ApiResponse.ts";
import { StreamResponse } from "../moduleClass.ts";
import * as Loader from "../loader.ts";

const router = new Router();

/* A simple API endpoint that returns a list of VODs for a given module. */
router.get(
  `/vod`,
  async (context) => {
    const query = helpers.getQuery(context);
    logger("vod", `VOD list requested from module '${context.params.module}'`);
    // logger("vod", `query params: ${JSON.stringify(query)}`);
    const list = await Loader.getVODlist(
      context.params.module!,
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
router.get(`/vod/:show`, async (context) => {
  logger(
    "vod",
    `VOD '${context.params.show}' requested from module '${context.params.module}'`,
  );
  const query = helpers.getQuery(context);
  const data = await Loader.getVOD(
    context.params.module!,
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
});

/* A simple API endpoint that returns the episode for the VOD requested. */
router.get(`/vod/:show/:epid/:playlist?/:player(player)?`, async (context) => {
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
});

export default router;
