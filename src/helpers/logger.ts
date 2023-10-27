import caller from "https://raw.githubusercontent.com/apiel/caller/master/caller.ts";
type LoggerFunctions =
  | "sanityCheck"
  | "rewritePlaylist"
  | "cacheCleanup"
  | "searchChannel"
  | "getVODlist"
  | "getVOD"
  | "getVOD_EP"
  | "login"
  | "searchShow"
  | "oak"
  | "updatechannels"
  | "login"
  | "live"
  | "clearcache"
  | "cache"
  | "vod"
  | "modules";

/**
 * The function takes in three parameters, the first two are required and the third is optional
 * @param {string} id - This is the id of the function that is calling the logger.
 * @param {string} message - The message you want to log.
 * @param {boolean} [isError] - boolean - if true, the logger will return an Error object instead of a
 * string.
 * @returns a string or an error.
 */
export function logger(
  id: LoggerFunctions,
  message: unknown,
  isError?: boolean,
): string {
  const source = caller().match(/.*.\/(.*.)\.ts/)[1];
  if (Deno.env.get("DEBUG")?.toLowerCase() === "true") {
    if (isError) {
      if ((message as Error).message) {
        console.error(
          `${new Date().getHours()}:${
            new Date().getMinutes()
          } - \x1b[47m\x1b[30m${source}\x1b[0m - !\x1b[41m\x1b[30m${id}\x1b[0m!: ${
            (message as Error).message
          }`,
        );
      } else {
        console.error(
          `${new Date().getHours()}:${
            new Date().getMinutes()
          } - \x1b[47m\x1b[30m${source}\x1b[0m - !\x1b[41m\x1b[30m${id}\x1b[0m!: ${
            typeof message == "object"
              ? JSON.stringify(message).substring(0, 200)
              : message
          }`,
        );
      }
    } else {
      console.log(
        `${new Date().getHours()}:${
          new Date().getMinutes()
        } - \x1b[47m\x1b[30m${source}\x1b[0m - \x1b[35m${id}\x1b[0m: ${
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
        ? `${new Date().toLocaleString()} | ${source} - ${
          JSON.stringify(message, null, 2)
        }\n`
        : `${new Date().toLocaleString()} | ${source} - ${message} \n`,
      { append: true, create: true },
    ).then(() => {
      // console.log("Log wrote on dir!");
    }).catch((err) => {
      if (err instanceof Deno.errors.NotFound) {
        Deno.mkdir("logs").then(() => {
          Deno.writeTextFile(
            `logs/log${date}.txt`,
            typeof message == "object"
              ? `${new Date().toLocaleString()} | ${source} - ${
                JSON.stringify(message, null, 2)
              }\n`
              : `${new Date().toLocaleString()} | ${source} - ${message} \n`,
            { append: true, create: true },
          ).then(() => {
            // console.log("Log wrote on dir!");
          });
        });
      } else console.error(err);
    });
  }
  if ((message as Error).message) {
    return `index - ${id}: ${(message as Error).message.substring(0, 200)}`;
  }
  return `loader - ${id}: ${
    typeof message == "object"
      ? JSON.stringify(message).substring(0, 200)
      : (message as string).substring(0, 200)
  }`;
}
