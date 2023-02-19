import ModuleClass, {
  IVOD,
  IVODData,
  ModuleType,
  StreamResponse,
  VODListResponse,
} from "../moduleClass.ts";

import axios from "https://deno.land/x/axiod/mod.ts";
import { stringify } from "https://deno.land/x/querystring@v1.0.2/mod.js";
import {
  IChannels,
  IVODEpisodes,
  IVODEpisodeStream,
  IVODList,
} from "./types/antena-play.d.ts";

class ModuleInstance extends ModuleClass implements ModuleType {
  constructor() {
    /* Creating a new instance of the class Antena. */
    super("antena-play", true, true, true);
  }

  /**
   * It takes a username and password, and returns a promise that resolves to an array of two strings
   * @param {string} username - The username you use to login to antenaplay.ro
   * @param {string} password - string - The password for the account
   * @returns The auth_token.data.data.token
   */
  async login(username: string, password: string): Promise<string[]> {
    if (!username || !password) {
      this.logger("login", "Username/Password not provided", true);
      throw "Username/Password not provided";
    }
    try {
      const auth_token = await axios.post<
        { data?: { token: string }; error?: string }
      >(
        "https://restapi.antenaplay.ro/v1/auth/login",
        stringify({ email: username, password }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "api-request-source": "ios",
            "user-agent":
              "AntenaPlay/3.2.5 (ro.antenaplay.app; build:88; iOS 12.5.1) Alamofire/4.9.1",
          },
          validateStatus: (status: number) => status == 200 || 401,
        },
      );
      this.logger("login", auth_token.data);
      const authTokens = [
        auth_token.data?.data?.token || "",
        auth_token.data?.data ? crypto.randomUUID() : "",
      ];
      if (!auth_token.data.error) {
        return Promise.resolve(authTokens);
      } else {
        return Promise.reject(auth_token.data.error);
      }
    } catch (error) {
      this.logger("login", error, true);
      return Promise.reject(
        error.message || error.toString().substring(0, 200),
      );
    }
  }
  /**
   * It gets the live stream URL for a channel
   * @param {string} channel - The channel ID
   * @param {string[]} authTokens - An array of 2 strings, the first one is the access token, the
   * second one is the device id.
   * @param {string} _lastupdated - This is the last time the authTokens were updated
   * @returns A promise that resolves to an object with a stream property.
   */
  async liveChannels(
    channel: string,
    authTokens: string[],
    _authLastUpdate: Date,
  ): Promise<StreamResponse> {
    type IStreamResponse = {
      data: {
        link: string;
        drmLink: string;
      };
    };

    try {
      this.logger(
        "liveChannels",
        `channel: ${channel}, authTokens: ${authTokens}`,
      );
      if (!(authTokens.length > 0) || typeof authTokens !== "object") {
        this.logger("liveChannels", "authTokens not provided, trying login");
        //get config
        const config = await this.getAuth();
        //get authTokens
        authTokens = await this.login(config.username, config.password);
        //set authTokens
        this.setAuth({
          username: config.username,
          password: config.password,
          authTokens: authTokens,
          lastupdated: new Date(),
        });
      }
      const channel_stream = await axios.post<IStreamResponse>(
        `https://restapi.antenaplay.ro/v1/channels/play?source=mobile&id=${channel}&device_type=iOS&device_name=Kodeative&device_id=${
          authTokens[1]
        }&free=Y`,
        {},
        {
          headers: {
            authorization: `Bearer ${authTokens[0]}`,
            "api-request-source": "ios",
            "user-agent":
              "AntenaPlay/3.2.5 (ro.antenaplay.app; build:88; iOS 12.5.1) Alamofire/4.9.1",
          },
        },
      );
      this.logger("liveChannels", channel_stream.data);

      return Promise.resolve({ stream: channel_stream.data.data.link });
    } catch (error) {
      return Promise.reject(this.logger("liveChannels", error, true));
    }
  }
  /**
   * It gets the auth tokens, then uses them to get a list of channels, then returns a list of channels
   * @returns A list of channels
   */
  async getChannels(): Promise<Record<string, string>> {
    try {
      const authTokens = (await this.getAuth()).authTokens;
      if (!authTokens[0]) {
        this.logger(
          "getChannels",
          "No tokens, cannot update channels list",
          true,
        );
        return Promise.resolve({});
      }
      const channels = await axios.get<IChannels>(
        "https://restapi.antenaplay.ro/v1/channels?_page=1&_per_page=20&_sort=id&active=Y",
        {
          headers: {
            authorization: `Bearer ${authTokens[0]}`,
            "api-request-source": "ios",
            "user-agent":
              "AntenaPlay/3.2.5 (ro.antenaplay.app; build:88; iOS 12.5.1) Alamofire/4.9.1",
          },
        },
      );
      this.logger("getChannels", channels.data);
      const channels_list: { [k: string]: string } = {};
      channels.data.data.forEach((l) => {
        channels_list[l.slug] = String(l.id);
      });
      return channels_list;
    } catch (error) {
      // this.logger("getChannels", error, true)
      return Promise.reject(this.logger("getChannels", error, true));
    }
  }
  /**
   * It gets the list of VODs from the AntenaPlay API.
   * @param {string[]} authTokens - string[]: The authTokens that you get from the login function.
   * @param {number} [page] - The page number of the VOD list.
   * @returns An object with the following structure:
   */
  async getVOD_List(
    authTokens: string[],
    options?: Record<string, unknown>,
  ): Promise<VODListResponse> {
    try {
      if (!(authTokens.length > 0) || typeof authTokens !== "object") {
        // throw new Error(`Cookies Missing/Invalid`)
        //get config
        const config = await this.getAuth();
        //get authTokens
        authTokens = await this.login(config.username, config.password);
        //set authTokens
        this.setAuth({
          username: config.username,
          password: config.password,
          authTokens: authTokens,
          lastupdated: new Date(),
        });
      }
      const shows = await axios.get<IVODList>(
        `https://restapi.antenaplay.ro/v1/shows?_per_page=20&_sort=last_video_date%3Adesc&active=Y&_page=${
          options?.page || 1
        }`,
        {
          headers: {
            authorization: `Bearer ${authTokens[0]}`,
            "api-request-source": "ios",
            "user-agent":
              "AntenaPlay/3.2.5 (ro.antenaplay.app; build:88; iOS 12.5.1) Alamofire/4.9.1",
          },
        },
      );
      this.logger("getVOD_List", shows.data);
      const list: IVODData[] = [];
      shows.data.data.forEach((l) => {
        list.push(
          {
            name: l.show_name,
            date: l.last_video_date,
            img: l.main_image,
            link: `/${this.MODULE_ID}/vod/${l.id}`,
          },
        );
      });
      const result: IVOD = {
        data: list,
        pagination: {
          current_page: shows.data.meta.pagination.current_page,
          per_page: shows.data.meta.pagination.per_page,
          total_pages: shows.data.meta.pagination.total_pages,
        },
      };
      return Promise.resolve(result);
    } catch (error) {
      this.logger(
        "getVOD_List",
        error.message || error.toString().substring(0, 200),
        true,
      );
      return Promise.reject(
        error.message || error.toString().substring(0, 200),
      );
    }
  }
  /**
   * It gets the VOD list for a given show
   * @param {string} show - The show ID.
   * @param {string[]} authTokens - The authTokens you get from the login function.
   * @param {number} page - number - the page number you want to get
   * @returns An object with the following structure:
   * ```
   * {
   *   data: [
   *     {
   *       name: string;
   *       img: string;
   *       link: string;
   *     }
   *   ];
   *   pagination: {
   *     current_page: number;
   *     per_page: number;
   *     total_pages: number;
   *   };
   * }
   */
  async getVOD(
    show: string,
    authTokens: string[],
    options?: Record<string, unknown>,
  ): Promise<{
    data: unknown[];
    pagination?: {
      current_page: number;
      total_pages: number;
      per_page: number;
    };
  }> {
    try {
      if (!(authTokens.length > 0) || typeof authTokens !== "object") {
        // throw `Cookies Missing/Invalid`
        //get auth
        const auth = await this.getAuth();
        //get authTokens
        authTokens = await this.login(auth.username, auth.password);
        //set authTokens
        this.setAuth({
          username: auth.username,
          password: auth.password,
          authTokens: authTokens,
          lastupdated: new Date(),
        });
      }
      const episodes = await axios.get<IVODEpisodes>(
        `https://restapi.antenaplay.ro/v1/videos?_page=${
          options?.page || 1
        }&_per_page=10&_sort=publish_date%3Adesc&active=Y&show_id=${show}`,
        {
          headers: {
            authorization: `Bearer ${authTokens[0]}`,
            "api-request-source": "ios",
            "user-agent":
              "AntenaPlay/3.2.5 (ro.antenaplay.app; build:88; iOS 12.5.1) Alamofire/4.9.1",
          },
        },
      );
      this.logger("getVOD", episodes.data);
      const list: IVODData[] = [];
      episodes.data.data.forEach((l) => {
        list.push(
          {
            name: l.video_title,
            date: l.publish_date,
            img: l.video_thumbnail,
            link: `/${this.MODULE_ID}/vod/${show}/${l.id}`,
          },
        );
      });
      const result: IVOD = {
        data: list,
        pagination: {
          current_page: episodes.data.meta.pagination.current_page,
          per_page: episodes.data.meta.pagination.per_page,
          total_pages: episodes.data.meta.pagination.total_pages,
        },
      };
      return Promise.resolve(result);
    } catch (error) {
      this.logger(
        "getVOD",
        error.message || error.toString().substring(0, 200),
        true,
      );
      return Promise.reject(
        error.message || error.toString().substring(0, 200),
      );
    }
  }

  /**
   * It gets the VOD episode stream url.
   * @param {string} show - The show name
   * @param {string} epid - The episode ID, which you can get from the getVOD_SHOW function.
   * @param {string[]} authTokens - This is an array of 2 strings, the first one is the access token,
   * the second one is the device id.
   * @returns The URL of the video
   */
  async getVOD_EP(
    show: string,
    epid: string,
    authTokens: string[],
  ): Promise<StreamResponse> {
    try {
      if (!show || !epid) {
        throw `Params Missing`;
      }
      if (!(authTokens.length > 0) || typeof authTokens !== "object") {
        // throw `Cookies Missing/Invalid`
        //get config
        const config = await this.getAuth();
        //get authTokens
        authTokens = await this.login(config.username, config.password);
        //set authTokens
        this.setAuth({
          username: config.username,
          password: config.password,
          authTokens: authTokens,
          lastupdated: new Date(),
        });
      }
      const episode_id = await axios.post<IVODEpisodeStream>(
        "https://restapi.antenaplay.ro/v1/videos/play",
        stringify({
          device_id: authTokens[1],
          device_name: "Kodeative",
          device_type: "iPhone",
          free: "Y",
          id: epid,
        }),
        {
          headers: {
            authorization: `Bearer ${authTokens[0]}`,
            "content-type": "application/x-www-form-urlencoded",
            "api-request-source": "ios",
            "user-agent":
              "AntenaPlay/3.2.5 (ro.antenaplay.app; build:88; iOS 12.5.1) Alamofire/4.9.1",
          },
        },
      );
      return Promise.resolve({ stream: episode_id.data.data.url });
    } catch (error) {
      return Promise.reject(this.logger("getVOD_EP", error, true));
    }
  }
}

/* Exporting the ModuleInstance class. */
export default ModuleInstance;
