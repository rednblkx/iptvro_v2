import axios from "https://deno.land/x/axiod@0.26.2/mod.ts";
import ModuleClass, {
  IChannelsList,
  ModuleType,
  StreamResponse,
  VODListResponse,
} from "../moduleClass.ts";

/* A class that extends the ModuleClass class. */
export default class ModuleInstance extends ModuleClass implements ModuleType {
  constructor() {
    /* It calls the constructor of the parent class, which is `ModuleClass`. */
    super({
      MODULE_ID: "digisport",
      hasLive: true,
      hasVOD: false,
      authReq: false,
      chList: {
        // No Longer Available
        // "digi24": {
        //   id: "digi24",
        //   name: "Digi 24",
        //   img:
        //     "https://do-static-03-cdn.rcs-rds.ro/digionline/mobile-content/v12/images/droid/logo_tv_channel_stiri_digi24.png",
        // },
        "digisport1": {
          id: "digisport1",
          name: "Digi Sport 1",
          img:
            "https://do-static-03-cdn.rcs-rds.ro/digionline/mobile-content/v12/images/droid/logo_tv_channel_sport_digisport1.png",
        },
        "digisport2": {
          id: "digisport2",
          name: "Digi Sport 2",
          img:
            "https://do-static-03-cdn.rcs-rds.ro/digionline/mobile-content/v12/images/droid/logo_tv_channel_sport_digisport2.png",
        },
        "digisport3": {
          id: "digisport3",
          name: "Digi Sport 3",
          img:
            "https://do-static-03-cdn.rcs-rds.ro/digionline/mobile-content/v12/images/droid/logo_tv_channel_sport_digisport3.png",
        },
        "digisport4": {
          id: "digisport4",
          name: "Digi Sport 4",
          img:
            "https://do-static-03-cdn.rcs-rds.ro/digionline/mobile-content/v12/images/droid/logo_tv_channel_sport_digisport4.png",
        },
      },
      logo:
        "https://do-static-03-cdn.rcs-rds.ro/digionline/mobile-content/v12/images/droid/logo_tv_channel_stiri_digi24.png",
    });
  }
  searchShow(_authTokens: string[], _string: string): Promise<VODListResponse> {
    throw new Error("Method not implemented.");
  }
  getChannels(): Promise<IChannelsList> {
    return Promise.resolve(
      {
        // "digi24": {
        //   id: "digi24",
        //   name: "Digi 24",
        //   img:
        //     "https://do-static-03-cdn.rcs-rds.ro/digionline/mobile-content/v12/images/droid/logo_tv_channel_stiri_digi24.png",
        // },
        "digisport1": {
          id: "digisport1",
          name: "Digi Sport 1",
          img:
            "https://do-static-03-cdn.rcs-rds.ro/digionline/mobile-content/v12/images/droid/logo_tv_channel_sport_digisport1.png",
        },
        "digisport2": {
          id: "digisport2",
          name: "Digi Sport 2",
          img:
            "https://do-static-03-cdn.rcs-rds.ro/digionline/mobile-content/v12/images/droid/logo_tv_channel_sport_digisport2.png",
        },
        "digisport3": {
          id: "digisport3",
          name: "Digi Sport 3",
          img:
            "https://do-static-03-cdn.rcs-rds.ro/digionline/mobile-content/v12/images/droid/logo_tv_channel_sport_digisport3.png",
        },
        "digisport4": {
          id: "digisport4",
          name: "Digi Sport 4",
          img:
            "https://do-static-03-cdn.rcs-rds.ro/digionline/mobile-content/v12/images/droid/logo_tv_channel_sport_digisport4.png",
        },
      },
    );
  }
  getVOD_List(
    _authTokens: string[],
    _options?: Record<string, unknown>,
  ): Promise<VODListResponse> {
    return Promise.reject(
      this.logger("getVOD_List", "Method not implemented", true),
    );
  }
  getVOD(
    _show: string,
    _authTokens: string[],
    _options?: Record<string, unknown>,
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    return Promise.reject(
      this.logger("getVOD", "Method not implemented", true),
    );
  }
  getVOD_EP(
    _show: string,
    _epid: string,
    _authTokens: string[],
  ): Promise<StreamResponse> {
    return Promise.reject(
      this.logger("getVOD_EP", "Method not implemented", true),
    );
  }

  /**
   * It logs in the user.
   * @param {string} _username - The username of the user
   * @param {string} _password - string - The password to be used for the login
   * @returns An array of strings
   */
  login(_username: string, _password: string): Promise<string[]> {
    try {
      return Promise.resolve(["Login not implemented, no use on this module"]);
    } catch (error) {
      return Promise.reject(
        this.logger(
          "login",
          error.message || error.toString().substring(0, error.findIndex("\n")),
          true,
        ),
      );
    }
  }

  /**
   * It gets the live stream of a channel.
   * @param {string} id - the channel id, you can get it from the channel list
   * @param {string[]} _authTokens - The tokens you get from the login function.
   * @param {Date} authLastUpdate - Date - The date when the auth tokens were last updated.
   * @returns The stream url
   */
  async liveChannels(
    id: string,
    _authTokens: string[],
    _authLastUpdate: Date,
  ): Promise<StreamResponse> {
    try {
      this.logger("liveChannels", "Getting token");
      const key = await axios.get(
        "https://balancer2.digi24.ro/streamer/make_key.php",
        {
          headers: {
            accept: "*/*",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "cache-control": "no-cache",
            pragma: "no-cache",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            referrer: "https://www.digi24.ro/",
            referrerPolicy: "origin-when-cross-origin",
          },
        },
      );
      key.status === 200 && this.logger("liveChannels", "Got token");
      const stream = await axios.get(
        `https://balancer2.digi24.ro/streamer.php?&scope=${id}&key=${key.data}&outputFormat=json&type=hq&quality=hq&drm=1&is=4&ns=${id}&pe=site&s=site&sn=${
          id.includes("sport") ? "digisport.ro" : "digi24.ro"
        }&p=browser&pd=linux`,
      );
      this.logger("liveChannels", stream.data);
      return Promise.resolve({
        stream: stream.data.file,
        drm: { url: stream.data.proxy },
      });
    } catch (error) {
      return Promise.reject(
        this.logger(
          "liveChannels",
          error.message || error.toString().substring(0, error.findIndex("\n")),
          true,
        ),
      );
    }
  }
}
