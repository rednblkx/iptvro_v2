import axios from "https://deno.land/x/axiod/mod.ts";
import ModuleClass, { AuthConfig } from "../moduleClass.ts";
import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";

/* A class that extends the Class class. */
class ModuleInstance extends ModuleClass {
  constructor() {
    /* It calls the constructor of the parent class, which is `ModuleClass`. */
    super("pro-plus", true, true, false);
  }

  /**
   * It logs in to the service and returns the access token.
   * @param {string} username - your username
   * @param {string} password - string - the password you use to login to the app
   * @returns The access token
   */
  async login(username: string, password: string): Promise<string[]> {
    try {
      let step1 = await axios.post(
        "https://protvplus.ro/login",
        `email=${encodeURIComponent(username)}&password=${
          encodeURIComponent(password)
        }&login=Autentificare&_do=content11374-loginForm-form-submit`,
        {
          headers: {
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          responseType: "text",
          redirect: "manual",
          validateStatus: (status: number) => status === 302,
        },
      );
      if (step1 && step1.data) {
        this.logger(
          "login",
          `received response ${step1.data} , ${step1.headers}`,
        );
      }
      if (step1.headers.get("set-cookie")) {
        this.logger(
          "login",
          `received cookie ${step1.headers.get("set-cookie")}`,
        );
        this.setAuth({
          username,
          password,
          authTokens: step1.headers.get("set-cookie")?.split(";") || [],
          lastupdated: new Date(),
        });
        return Promise.resolve(
          step1.headers.get("set-cookie")?.split(";") || [],
        );
      } else throw "No cookie received";
    } catch (error) {
      this.logger(
        "login",
        error.message || error.toString().substring(0, error.findIndex("\n")),
      );
      return Promise.reject(
        error.message || error.toString().substring(0, error.findIndex("\n")),
      );
    }
  }

  /**
   * It gets the live stream of a channel.
   * @param {string} id - the channel id, you can get it from the channel list
   * @param {string[]} authTokens - The tokens you get from the login function.
   * @param {Date} authLastUpdate - Date - The date when the auth tokens were last updated.
   * @returns The stream url
   */
  async liveChannels(
    id: string,
    authTokens: string[],
    authLastUpdate: Date,
  ): Promise<{ stream: string; proxy?: string }> {
    try {
      if (!authTokens) {
        let auth = await this.getAuth();
        this.logger("liveChannels", "No tokens, trying login");
        authTokens = await this.login(auth.username, auth.password);
      }
      let channel = (await this.getConfig()).chList;
      let step1 = await axios.get(
        `https://protvplus.ro/tv-live/${id}-${
          Object.keys(channel).find((key) => channel[key] === id)
        }`,
        {
          headers: {
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            cookie: authTokens.join(";"),
          },
        },
      );
      this.logger(
        "liveChannels",
        `received response ${step1.status} , ${step1.statusText}`,
      );
      let $ = load(step1.data);
      // if(consoleL && $) console.log(`pro| getPlaylist: ${$(".live-iframe-wrapper.js-user-box")[0].attribs["data-url"]}`);
      this.logger(
        "liveChannels",
        `getPlaylist: ${
          $(".live-iframe-wrapper.js-user-box")[0].attribs["data-url"]
        }`,
      );
      // if(consoleL) console.log(`pro| getPlaylist: getting channel's second link`);
      this.logger("liveChannels", `getPlaylist: getting channel's second link`);
      let step2 = await axios.get(
        $(".live-iframe-wrapper.js-user-box")[0].attribs["data-url"],
        {
          headers: {
            accept: "*/*",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            authorization: `Bearer undefined`,
            "x-requested-with": "XMLHttpRequest",
            cookie: authTokens.join(";"),
            referrer: `https://protvplus.ro/tv-live/${id}-${
              Object.keys(channel).find((key) => channel[key] === id)
            }`,
          },
        },
      );
      // if(consoleL && step1.data) console.log(`pro| getPlaylist: got channel's second link`);
      this.logger("liveChannels", `getPlaylist: got channel's second link`);
      $ = load(step2.data);
      // if(consoleL && $) console.log(`pro| getPlaylist: ${$("iframe").attr("src")}`);
      this.logger("liveChannels", `getPlaylist: ${$("iframe").attr("src")}`);
      // if(consoleL) console.log(`pro| getPlaylist: getting channel's stream URL`);
      this.logger("liveChannels", `getPlaylist: getting channel's stream URL`);
      let step3 = await axios.get($("iframe").attr("src") || "", {
        headers: {
          cookie: authTokens.join(";"),
          referer: "https://protvplus.ro/tv-live/1-pro-tv",
        },
      });
      // if(consoleL && step3.data) console.log(`pro| getPlaylist: got channel's stream`);
      this.logger("liveChannels", `getPlaylist: got channel's stream`);
      // if(consoleL && step3.data) console.log(`pro| getPlaylist: ${step3.data}`);
      // if(consoleL && step3.data) console.log(`pro| getPlaylist: ${step3.data.match('{"HLS"(.*)}]}')}`);
      const regex = /"HLS":.+?\s*:\s*["\']?([^"\'\s>]+)["\']?/g;
      let stream = new URL(regex.exec(step3.data)?.[1] || "").href;
      this.logger("liveChannels", `getPlaylist: ${stream}`);
      // if(stream.includes("playlist-live_lq-live_mq-live_hq")){
      //     stream = stream.replace("playlist-live_lq-live_mq-live_hq", "playlist-live_lq-live_mq-live_hq-live_fullhd");
      // }
      // if(consoleL && step3.data) console.log(`pro| getPlaylist: ${JSON.parse(step3.data.match('{"HLS"(.*)}]}')[0]).HLS[0].src}`);
      // this.logger('liveChannels', `getPlaylist: ${stream}`)
      return Promise.resolve({ stream });
    } catch (error) {
      this.logger(
        "liveChannels",
        error.message || error.toString().substring(0, error.findIndex("\n")),
      );
      return Promise.reject(
        error.message || error.toString().substring(0, error.findIndex("\n")),
      );
    }
  }

  /**
   * It gets the HTML of the website, loads it into a cheerio object, then loops through all the channels
   * and adds them to an object
   * @returns A list of channels and their respective IDs
   */
  async getChannels(): Promise<object> {
    try {
      let getHTML = (await axios.get("https://protvplus.ro/")).data;
      let $ = load(getHTML);
      let channelList: { [k: string]: string } = {};
      $(".channels-main a").each(function (i, el) {
        let link = el.attribs["href"];
        channelList[link.match(/([0-9])-(.*)/)?.[2] || 0] =
          link.match(/([0-9])-(.*)/)?.[1] || "";
      });
      return Promise.resolve(channelList);
    } catch (error) {
      this.logger(
        "getChannels",
        error.message || error.toString().substring(0, error.findIndex("\n")),
      );
      return Promise.reject(
        error.message || error.toString().substring(0, error.findIndex("\n")),
      );
    }
  }
}

/* It exports the class so it can be used in other files. */
export default ModuleInstance;
