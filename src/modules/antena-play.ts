import ModuleClass, { IVOD, IVODData } from "../moduleClass.ts";

import axios from "https://deno.land/x/axiod/mod.ts";
import * as queryString from "https://deno.land/x/querystring@v1.0.2/mod.js";
import {
  IChannels,
  IVODEpisodes,
  IVODEpisodeStream,
  IVODList,
} from "./types/antena-play.d.ts";
// var Module = new Class('antena', true, true,)

/**
 * `VOD_config` is an object with a required property `authTokens` which is an array of strings, and
 * optional properties `year`, `season`, `month`, and `showfilters` which are all strings.
 * @property {string[]} authTokens - An array of strings that are the auth tokens for the VODs you want
 * to download.
 * @property {string} year - The year you want to get the VODs from.
 * @property {string} season - The season number you want to get the episodes for.
 * @property {string} month - The month of the year you want to get the VODs for.
 * @property {string} showfilters - This is a string that is used to filter the shows that are
 * returned.
 */

class ModuleInstance extends ModuleClass {
  constructor() {
    /* Creating a new instance of the class Antena. */
    super("antena-play", true, true, true);
  }
  /**
   * It logs in to the antenaplay.ro website and returns the authTokens required to access the live
   * stream.
   * @param {string} username - string - Your AntenaPlay account username
   * @param {string} password - string - Your AntenaPlay account password
   * @returns The authTokens
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
        queryString.stringify({ email: username, password }),
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
   * It gets the HTML of the live channel, checks if the cookies are older than 6 hours, if they are,
   * it updates them, then it gets the stream URL from the HTML and returns it
   * @param {string} channel - the channel name, for example: antena1
   * @param {string[]} authTokens - the authTokens you get from the login function
   * @param {string} lastupdated - the last time the cookies were updated
   * @returns The stream URL
   */
  async liveChannels(
    channel: string,
    authTokens: string[],
    _lastupdated: string,
  ): Promise<{ stream: string; proxy?: string }> {
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
      this.logger("liveChannel", channel_stream.data);

      return Promise.resolve({ stream: channel_stream.data.data.link });
    } catch (error) {
      return Promise.reject(this.logger("liveChannels", error, true));
    }
  }
  /**
   * It gets the channels from antenaplay.ro/live
   * @returns An object with all the channels
   */
  async getChannels(): Promise<Record<string, unknown>> {
    try {
      const authTokens = (await this.getAuth()).authTokens;
      if (!authTokens[0]) {
        throw "No tokens, cannot update channels list";
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
      const channels_list: { [k: string]: number } = {};
      channels.data.data.forEach((l) => {
        channels_list[l.slug] = l.id;
      });
      return channels_list;
    } catch (error) {
      // this.logger("getChannels", error, true)
      return Promise.reject(this.logger("getChannels", error, true));
    }
  }
  /**
   * It gets the list of shows from the website.
   * @param {string[]} authTokens - string[] - The authTokens that are used to authenticate the user.
   * @returns An array of objects containing the name, link and img of the shows
   */
  async getVOD_List(authTokens: string[], page?: number): Promise<IVOD> {
    try {
      if (!authTokens || typeof authTokens !== "object") {
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
          page || 1
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
   * It gets the VOD list of a show.
   * @param {string} show - The show you want to get the VOD from.
   * @param {VOD_config} config - {
   * @returns An array of objects containing the name, link and image of the episodes.
   */
  async getVOD(
    show: string,
    authTokens: string[],
    page: number,
  ): Promise<IVOD> {
    try {
      if (!authTokens || typeof authTokens !== "object") {
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
          page || 1
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
   * It gets the video URL for a specific episode of a show.
   * @param {string} show - The show's name, as it appears in the URL.
   * @param {string} epid - The episode's ID.
   * @param {string[]} authTokens - The authTokens are the cookies that you get after logging in.
   * @returns The URL of the video
   */
  async getVOD_EP(
    show: string,
    epid: string,
    authTokens: string[],
  ): Promise<string> {
    try {
      if (!show || !epid) {
        throw `Params Missing`;
      }
      if (!authTokens || typeof authTokens !== "object") {
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
        queryString.stringify({
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
      return Promise.resolve(episode_id.data.data.url);
    } catch (error) {
      return Promise.reject(this.logger("getVOD_EP", error, true));
    }
  }
}

/* Exporting the ModuleInstance class. */
export default ModuleInstance;
