import ModuleClass, {
  IChannelsList,
  IVOD,
  IVODData,
  ModuleType,
  StreamResponse,
  VODListResponse,
} from "../moduleClass.ts";

import axios from "https://deno.land/x/axiod@0.26.2/mod.ts";
import { stringify } from "https://deno.land/x/querystring@v1.0.2/mod.js";
import {
  IChannels,
  IVODEpisodes,
  IVODEpisodeStream,
  IVODList,
} from "./types/antena-play.d.ts";

/* The `ModuleInstance` class is a TypeScript class that extends `ModuleClass` and implements
`ModuleType`, providing methods for authentication, retrieving live channels and video-on-demand
shows, and retrieving stream URLs for specific episodes. */
class ModuleInstance extends ModuleClass implements ModuleType {
  constructor() {
    super({
      MODULE_ID: "antena-play",
      hasLive: true,
      hasVOD: true,
      authReq: true,
      searchEnabled: true,
      logo: "https://antenaplay.ro/images/logoV2.svg",
    });
    this.getConfig().then(data => {
      if (data?.chList) {
        this.chList = data.chList;
      }
    })
  }

  /**
   * The `login` function is an asynchronous function that takes a username and password as parameters,
   * sends a POST request to a login endpoint with the provided credentials, and returns a promise that
   * resolves to an array of authentication tokens if the login is successful, or rejects with an error
   * message if the login fails.
   * @param {string} username - The `username` parameter is a string that represents the user's username
   * or email address used for authentication.
   * @param {string} password - The password parameter is a string that represents the user's password
   * for authentication.
   * @returns The `login` function returns a Promise that resolves to an array of the acces tokens.
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
   * The `liveChannels` function is an asynchronous function that takes in a channel name, an array of
   * authentication tokens, and the last update date of the authentication tokens, and returns a promise
   * that resolves to a `StreamResponse` object.
   * @param {string} channel - The `channel` parameter is a string that represents the ID of the channel
   * you want to retrieve the live stream for.
   * @param {string[]} authTokens - The `authTokens` parameter is an array of two strings. The first
   * string is the authentication token, and the second string is the device ID.
   * @param {Date} _authLastUpdate - _authLastUpdate is a Date object that represents the last time the
   * authentication tokens were updated.
   * @returns a Promise that resolves to a StreamResponse object. The StreamResponse object has a
   * property called "stream" which contains the link to the live channel stream.
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
      return Promise.resolve({ channel_name: Object.values(this.chList).find(ch => ch.id == channel)?.name, stream: channel_stream.data.data.link });
    } catch (error) {
      return Promise.reject(this.logger("liveChannels", error, true));
    }
  }

  /**
   * The function `getChannels` makes an asynchronous request to retrieve a list of channels from a REST
   * API and returns a promise that resolves to an object containing the channel information.
   * @returns a Promise that resolves to an object of type IChannelsList.
   */
  async getChannels(): Promise<IChannelsList> {
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
      const channels_list: IChannelsList = {};
      channels.data.data.forEach((l) => {
        channels_list[l.slug] = {
          id: String(l.id),
          name: l.channel_name,
          img: l.logoV2,
        };
      });
      return channels_list;
    } catch (error) {
      // this.logger("getChannels", error, true)
      return Promise.reject(this.logger("getChannels", error, true));
    }
  }

  /**
   * The `searchShow` function is an asynchronous function that searches for shows based on a given
   * string and returns a promise that resolves to a response containing a list of shows and pagination
   * information.
   * @param {string[]} authTokens - An array of authentication tokens used for authorization.
   * @param {string} string - The `string` parameter is a search query string that is used to search for
   * shows. It is used in the API request to filter the shows based on the search query.
   * @returns The function `searchShow` returns a Promise that resolves to a `VODListResponse` object.
   */
  async searchShow(
    authTokens: string[],
    string: string,
  ): Promise<VODListResponse> {
    try {
      const shows = await axios.get<IVODList>(
        `https://restapi.antenaplay.ro/v1/shows?_sort=last_video_date%3Adesc&active=Y&_scope=search%3A${string}`,
        {
          headers: {
            authorization: `Bearer ${authTokens[0]}`,
            "api-request-source": "ios",
            "user-agent":
              "AntenaPlay/3.2.5 (ro.antenaplay.app; build:88; iOS 12.5.1) Alamofire/4.9.1",
          },
        },
      );
      this.logger("searchShow", shows.data);
      const list: IVODData[] = [];
      shows.data.data.forEach((l) => {
        list.push(
          {
            id: l.id.toString(),
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
        "searchShow",
        error.message || error.toString().substring(0, 200),
        true,
      );
      return Promise.reject(
        error.message || error.toString().substring(0, 200),
      );
    }
  }

  /**
   * The `getVOD_List` function is an asynchronous function that retrieves a list of VOD (Video on
   * Demand) shows, with the option to search for specific shows, using authentication tokens and
   * additional options.
   * @param {string[]} authTokens - An array of authentication tokens used for authorization.
   * @param [options] - The `options` parameter is an optional object that can contain additional
   * parameters for the API request. In this code snippet, it is used to pass the `search` and `page`
   * parameters.
   * @returns The `getVOD_List` function returns a Promise that resolves to a `VODListResponse` object.
   */
  async getVOD_List(
    authTokens: string[],
    options?: Record<string, string>,
  ): Promise<VODListResponse> {
    try {
      if (options?.search) {
        const result = this.searchShow(authTokens, options?.search);

        return Promise.resolve(result);
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
            id: l.id.toString(),
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
   * The `getVOD` function is an asynchronous function that retrieves a list of video-on-demand episodes
   * for a given show using authentication tokens and optional additional options.
   * @param {string} show - The "show" parameter is a string that represents the ID of a show. It is used
   * to filter the VOD (Video on Demand) episodes based on the specified show.
   * @param {string[]} authTokens - An array of authentication tokens used for authorization.
   * @param [options] - The `options` parameter is an optional object that can contain additional
   * configuration options for the API request. It can include properties such as `page` to specify the
   * page number of the results to retrieve. If `options` is not provided, the default value for `page`
   * is 1.
   * @returns The `getVOD` function returns a Promise that resolves to a `VODListResponse` object.
   */
  async getVOD(
    show: string,
    authTokens: string[],
    options?: Record<string, unknown>,
  ): Promise<VODListResponse> {
    try {
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
            id: l.id.toString(),
            name: l.video_title,
            date: l.publish_date,
            img: l.video_thumbnail,
            link: `/${this.MODULE_ID}/vod/${show}/${l.id}`,
          },
        );
      });
      const show_name = (await axios.get<IVODList>(
        `https://restapi.antenaplay.ro/v1/shows?id=${show}}`,
        {
          headers: {
            authorization: `Bearer ${authTokens[0]}`,
            "api-request-source": "ios",
            "user-agent":
              "AntenaPlay/3.2.5 (ro.antenaplay.app; build:88; iOS 12.5.1) Alamofire/4.9.1",
          },
        },
      )).data.data[0].show_name;
      const result: IVOD = {
        show_name,
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
   * The function `getVOD_EP` is an asynchronous function that retrieves the stream URL for a specific
   * episode of a show using authentication tokens.
   * @param {string} show - The `show` parameter is a string that represents the ID of the show.
   * @param {string} epid - The `epid` parameter is the ID of the episode you want to retrieve the VOD
   * (Video on Demand) stream for.
   * @param {string[]} authTokens - An array of authentication tokens. The first element is the bearer
   * token used for authorization, and the second element is the device ID.
   * @returns a Promise that resolves to a StreamResponse object.
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
      const show_name = (await axios.get<IVODList>(
        `https://restapi.antenaplay.ro/v1/shows?id=${show}}`,
        {
          headers: {
            authorization: `Bearer ${authTokens[0]}`,
            "api-request-source": "ios",
            "user-agent":
              "AntenaPlay/3.2.5 (ro.antenaplay.app; build:88; iOS 12.5.1) Alamofire/4.9.1",
          },
        },
      )).data.data[0].show_name;
      const ep_name = (await axios.get<IVODEpisodes>(
        `https://restapi.antenaplay.ro/v1/videos?show_id=${show}&id=${epid}`,
        {
          headers: {
            authorization: `Bearer ${authTokens[0]}`,
            "api-request-source": "ios",
            "user-agent":
              "AntenaPlay/3.2.5 (ro.antenaplay.app; build:88; iOS 12.5.1) Alamofire/4.9.1",
          },
        },
      )).data.data[0].video_title;
      return Promise.resolve({
        show_name,
        ep_name,
        stream: episode_id.data.data.url,
      });
    } catch (error) {
      return Promise.reject(this.logger("getVOD_EP", error, true));
    }
  }
}

/* Exporting the ModuleInstance class. */
export default ModuleInstance;
