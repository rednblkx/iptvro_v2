import ModuleClass, {
  IChannelsList,
  ModuleType,
  StreamResponse,
  VODListResponse,
} from "../moduleClass.ts";

import axios from "https://deno.land/x/axiod@0.26.2/mod.ts";
import { Md5 } from "https://deno.land/std@0.160.0/hash/md5.ts";

/* The `ModuleInstance` class is a TypeScript class that extends `ModuleClass` and implements
`ModuleType`, providing methods for searching shows, getting VOD lists, getting VODs, getting VOD
episodes, logging in, and retrieving live channels and their streams. */
class ModuleInstance extends ModuleClass implements ModuleType {
  constructor() {
    super({
      MODULE_ID: "digi-online",
      hasLive: true,
      hasVOD: false,
      authReq: true,
      logo:
        "https://www.digionline.ro/static/theme-ui-frontend/bin/images/logo-digi-online.png",
    });
  }
  /**
   * The function searchShow takes authentication tokens and a search string as parameters and returns
   * a Promise that resolves to a VODListResponse.
   * @param {string[]} _authTokens - The _authTokens parameter is an array of authentication tokens.
   * These tokens are used to authenticate the user and authorize access to certain resources or
   * actions.
   * @param {string} _string - The `_string` parameter is a string that represents the search query for
   * a show. It is the keyword or phrase that you want to use to search for a show.
   */
  searchShow(_authTokens: string[], _string: string): Promise<VODListResponse> {
    throw new Error("Method not implemented.");
  }
  /**
   * The function `getVOD_List` returns a rejected promise with an error message indicating that the
   * method is not implemented.
   * @param {string[]} _authTokens - An array of authentication tokens.
   * @param [_options] - The `_options` parameter is an optional parameter of type `Record<string,
   * unknown>`. It is used to pass additional options or configurations to the `getVOD_List` method.
   * The type `Record<string, unknown>` means that `_options` is an object with string keys and values
   * of unknown
   * @returns A rejected Promise with an error message.
   */
  getVOD_List(
    _authTokens: string[],
    _options?: Record<string, unknown>,
  ): Promise<VODListResponse> {
    return Promise.reject(
      this.logger("getVOD_List", "Method not implemented", true),
    );
  }
  /**
   * The function `getVOD` returns a rejected promise with an error message indicating that the method
   * is not implemented.
   * @param {string} _show - A string representing the name or identifier of the show for which you
   * want to get the video on demand (VOD) content.
   * @param {string[]} _authTokens - An array of authentication tokens.
   * @param [_options] - The `_options` parameter is an optional parameter of type `Record<string,
   * unknown>`. It is used to pass additional options or configurations to the `getVOD` method. The
   * type `Record<string, unknown>` means that `_options` is an object with string keys and values of
   * any type
   * @returns a rejected Promise with an error message.
   */
  getVOD(
    _show: string,
    _authTokens: string[],
    _options?: Record<string, unknown>,
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    return Promise.reject(
      this.logger("getVOD", "Method not implemented", true),
    );
  }
  /**
   * The function getVOD_EP is a TypeScript function that returns a rejected Promise with an error
   * message indicating that the method is not implemented.
   * @param {string} _show - A string representing the name or identifier of the show for which you
   * want to get the VOD (Video on Demand) episode.
   * @param {string} _epid - The `_epid` parameter is a string that represents the episode ID of a
   * show.
   * @param {string[]} _authTokens - The `_authTokens` parameter is an array of authentication tokens.
   * These tokens are used to authenticate the user and verify their access to the requested VOD (Video
   * on Demand) episode.
   * @returns A rejected Promise with an error message.
   */
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
   * The function generates a UUID by recursively concatenating random strings until a specified number
   * is reached.
   * @param {number} number - The `number` parameter is the number of UUIDs you want to generate.
   * @param [uuid] - The `uuid` parameter is a string that represents the generated UUID. It is
   * initially an empty string and gets concatenated with each generated UUID in the recursive function
   * call.
   * @returns a string.
   */
  private uuidGen(number: number, uuid = ""): string {
    const gen = crypto.randomUUID().replace(/\-/g, "");
    if (number == 0) {
      return uuid;
    }
    return this.uuidGen(number - 1, uuid + gen);
  }

  /**
   * The function generates an ID and hash based on the provided username, password, and uhash.
   * @param {string} username - The `username` parameter is a string that represents the username of a
   * user. It is used as input to generate an ID.
   * @param {string} password - The `password` parameter is a string that represents the user's
   * password.
   * @param {string} uhash - The parameter "uhash" is a string that is used as a part of the hash
   * generation process. It is concatenated with the username, password, deviceId, and a constant
   * string "KodeativeiptvroREL_12" before being hashed using the MD5 algorithm.
   * @returns an object with two properties: "id" and "hash". The "id" property contains the generated
   * deviceId, and the "hash" property contains the MD5 hash generated using the provided parameters.
   */
  private generateId(username: string, password: string, uhash: string) {
    const deviceStr = `Kodeative_iptvro_${
      BigInt(parseInt((new Date().getTime() / 1000).toString())).valueOf()
    }`;
    const deviceId = `${deviceStr}_${
      this.uuidGen(8).substring(0, (128 - deviceStr.length) + (-1))
    }`;
    const md5hash = new Md5().update(
      `${username}${password}${deviceId}KodeativeiptvroREL_12${uhash}`,
    ).toString();
    return { id: deviceId, hash: md5hash };
  }

  /**
   * The `login` function is an asynchronous function that takes a username and password as parameters,
   * performs a login request to a remote API, and returns a Promise that resolves to an array
   * containing the user's ID if the login is successful.
   * @param {string} username - The `username` parameter is a string that represents the username of
   * the user trying to log in. It is used to identify the user and authenticate their credentials.
   * @param {string} password - The `password` parameter is a string that represents the user's
   * password.
   * @returns The `login` function returns a Promise that resolves to an array of tokens.
   */
  async login(username: string, password: string): Promise<string[]> {
    if (!password || !username) {
      throw "Username/Password not provided";
    }
    // const auth = this.getAuth();
    const pwdHash = new Md5().update(password).toString();
    try {
      type login = {
        meta: {
          version: string;
          error: string;
        };
        result: {
          code: string;
          info: string;
          message: string;
        };
        data?: {
          response: string;
          message: string;
          h: string;
        };
      };
      type device_register = {
        meta: {
          version: number;
          error: number;
        };
        result: {
          code: number;
          info: string;
          message: string;
        };
        data?: {
          response: string;
          message: string;
          h: string;
        };
      };
      const login_res = await axios.get<login>(
        `https://digiapis.rcs-rds.ro/digionline/api/v13/user.php?pass=${pwdHash}&action=registerUser&user=${
          encodeURIComponent(username)
        }`,
        {
          headers: {
            "User-Agent": "okhttp/4.8.1",
            "authorization": "Basic YXBpLXdzLXdlYmFkbWluOmRldl90ZWFtX3Bhc3M=",
          },
        },
      );
      this.logger("login", login_res.data);
      if (login_res.data.meta.error != "0") {
        throw login_res.data.result.message;
      }
      const userHash = login_res.data?.data?.h;

      if (!userHash) {
        throw "Hash not received, something went wrong!";
      }

      const id = this.generateId(username, pwdHash, userHash);

      const register = await axios.get<device_register>(
        `https://digiapis.rcs-rds.ro/digionline/api/v13/devices.php?c=${id.hash}&pass=${pwdHash}&dmo=iptvro&action=registerDevice&i=${id.id}&dma=Kodeative&user=${
          encodeURIComponent(username)
        }&o=REL_12`,
        {
          headers: {
            "user-agent": "okhttp/4.8.1",
            "authorization": "Basic YXBpLXdzLXdlYmFkbWluOmRldl90ZWFtX3Bhc3M=",
          },
        },
      );
      this.logger("login", register.data);
      if (register.data.meta?.error == 0) {
        // this.setAuth({ username: username, password: password, authTokens: [id.id], lastupdated: new Date() })
        return Promise.resolve([id.id]);
      } else throw register.data.result.message;
    } catch (error) {
      this.logger(
        "login",
        error.message || error.toString().substring(0, 200),
        true,
      );
      return Promise.reject(
        error.message || error.toString().substring(0, 200),
      );
    }
  }

  /**
   * The `liveChannels` function retrieves a live stream from a provider using the provided ID and
   * authentication tokens.
   * @param {string} id - The `id` parameter is a string that represents the ID of the stream you want
   * to retrieve. It is used in the API request to specify which stream to fetch.
   * @param {string[]} authTokens - An array of authentication tokens used for authorization.
   * @param {Date} _authLastUpdate - _authLastUpdate is a Date object that represents the last time the
   * authentication tokens were updated.
   * @returns a Promise that resolves to a StreamResponse object. The StreamResponse object has two
   * properties: "stream" and "drm". The "stream" property contains the stream's abr (adaptive bitrate)
   * value, and the "drm" property contains the WV Proxy URL for the stream, if
   * available.
   */
  async liveChannels(
    id: string,
    authTokens: string[],
    _authLastUpdate: Date,
  ): Promise<StreamResponse> {
    try {
      this.logger("liveChannels", "getting the stream");
      const play = await axios.get(
        `https://digiapis.rcs-rds.ro/digionline/api/v13/streams_l_3.php?action=getStream&id_stream=${id}&platform=iOS&version_app=release&i=${
          authTokens[0]
        }&s=app&quality=all&iosStream=1`,
        {
          headers: {
            "authorization": "Basic YXBpLXdzLXdlYmFkbWluOmRldl90ZWFtX3Bhc3M=",
            "user-agent": "okhttp/4.8.1",
          },
        },
      );
      this.logger("liveChannels", play.data);
      play.data.stream?.abr && this.logger("liveChannels", "got the stream");
      if (play.data.error !== "") {
        return Promise.reject(
          this.logger(
            "liveChannels",
            `Error from provider '${play.data.error}'`,
            true,
          ),
        );
      }
      return Promise.resolve({
        stream: play.data.stream.abr,
        drm: { url: play.data.stream.proxy || undefined },
      });
    } catch (error) {
      this.logger("liveChannels", `Error from provider: ${error}`, true);
      return Promise.reject(error);
    }
  }

  /**
   * The function `getChannels` makes an asynchronous request to retrieve a list of channels from a
   * specific API endpoint and returns a promise that resolves with the list of channels.
   * @returns The function `getChannels` returns a Promise that resolves to an object of type
   * `IChannelsList`.
   */
  async getChannels(): Promise<IChannelsList> {
    try {
      const channels = await axios.get(
        "https://digiapis.rcs-rds.ro/digionline/api/v13/categorieschannels.php",
      );
      this.logger("getChannels", channels);
      const chList: IChannelsList = {};
      channels.data.data.channels_list.forEach(
        (
          element: {
            channel_name: string | number;
            channel_desc: string;
            id_channel: string;
            media_channel: { channel_logo_url: string };
          },
        ) => {
          // console.log(`${element.channel_name} - ${element.id_channel}`);
          chList[element.channel_name] = {
            id: element.id_channel,
            name: element.channel_desc,
            img: element.media_channel.channel_logo_url,
          };
        },
      );
      return Promise.resolve(chList);
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

/* It exports the class so it can be used in other files. */
export default ModuleInstance;
