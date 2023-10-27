import { helpers, Router } from "https://deno.land/x/oak@v10.6.0/mod.ts";
import { logger } from "../helpers/logger.ts";
import { Response } from "../helpers/ApiResponse.ts";
import { valid_modules } from "../helpers/checkModules.ts";
import { ModuleType, StreamResponse } from "../moduleClass.ts";
import * as Loader from "../loader.ts";

const router = new Router();

/* A simple API that returns a stream URL for a given channel. */
router.get(
  `/live/:playlist(index.m3u8)?`,
  async (context) => {
    logger(
      "live",
      `live channels requested for module '${context.params.module}'`,
    );
    const mod: ModuleType = new (await import(
      `${Deno.cwd()}/src/modules/${context.params.module}.ts`
    )).default();
    if (context.params.playlist == "index.m3u8") {
      const playlist = [];
      playlist.push(`#EXTM3U`);
      const ch = await mod.getChannels();
      for (const channel in ch) {
        playlist.push(
          `#EXTINF:-1,${ch[channel].name}`,
        );
        playlist.push(
          `http://${context.request.url.host}/live/${channel}/index.m3u8`,
        );
      }
      // playlist.push(`#EXT-X-ENDLIST`);
      playlist.push("\n");
      context.response.headers.set("Content-Type", "application/x-mpegURL");
      context.response.body = playlist.join("\n");
    } else {
      const mod: ModuleType = new (await import(
        `${Deno.cwd()}/src/modules/${context.params.module}.ts`
      )).default();
      const data = (await mod.getConfig()).chList;
      if (!mod.hasLive) {
        throw `Live not enabled for module '${mod.MODULE_ID}'`;
      }
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
  `/live/:channel/:playlist(index.m3u8)?/:player(player)?`,
  async (context) => {
    const query = helpers.getQuery(context);
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
      const data = await Loader.rewritePlaylist(
        stream.data,
        query.cors
          ? `${context.request.url.protocol}//${context.request.url.host}/cors/`
          : undefined,
      ) as StreamResponse;
      if (context.params.player == "player") {
        logger(
          "live",
          `live stream requested for channel '${context.params.channel}' with also parameter player`,
        );
        if (data.stream) {
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
        `live stream requested for channel '${context.params.channel}' ${
          context.params.module ? `on module ${context.params.module}` : ""
        }`,
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

export default router;
