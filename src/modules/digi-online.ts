import ModuleClass, {
  ModuleType,
  StreamResponse,
  VODListResponse,
} from "../moduleClass.ts";

import axios from "https://deno.land/x/axiod/mod.ts";
// import new Md5().update from 'blueimp-new Md5().update';
import { Md5 } from "https://deno.land/std@0.160.0/hash/md5.ts";

class ModuleInstance extends ModuleClass implements ModuleType {
  /**
   * A constructor function for the Digi class.
   */
  constructor() {
    /* Calling the constructor of the parent class, which is ModuleClass. */
    super("digi-online", true, true, false);
  }
  getVOD_List(
    authTokens: string[],
    options?: Record<string, unknown>,
  ): Promise<VODListResponse> {
    return Promise.reject(
      this.logger("getVOD_List", "Method not implemented", true),
    );
  }
  getVOD(
    show: string,
    authTokens: string[],
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    return Promise.reject(
      this.logger("getVOD", "Method not implemented", true),
    );
  }
  getVOD_EP(
    show: string,
    epid: string,
    authTokens: string[],
  ): Promise<StreamResponse> {
    return Promise.reject(
      this.logger("getVOD_EP", "Method not implemented", true),
    );
  }

  /**
   * It generates a random UUID.
   * @param number - The number of uuids you want to generate.
   * @param [uuid] - The uuid to be returned
   * @returns A string of random uuids
   */
  private uuidGen(number: number, uuid = ""): string {
    const gen = crypto.randomUUID().replace(/\-/g, "");
    if (number == 0) {
      return uuid;
    }
    return this.uuidGen(number - 1, uuid + gen);
  }

  /**
   * It takes a username, password, and a hash, and returns a device ID and a hash
   * @param username - Your username
   * @param password - The password you use to login to the website
   * @param uhash - This is the hash that is returned from the login request.
   * @returns An object with two properties, id and hash.
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
   * It generates a unique ID for the user and returns it.
   * @param {string} username - your digionline username
   * @param {string} password - The password you use to login to the Digi Online website
   * @returns a promise that resolves to an array of strings.
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
   * It gets the stream from the provider, if it fails it tries to login and then get the stream again
   * @param {string} id - the channel id
   * @param {string[]} authTokens - the tokens you get from the login function
   * @param {Date} authLastUpdate - Date - the date when the auth tokens were last updated
   * @returns The stream url and the proxy url
   */
  async liveChannels(
    id: string,
    authTokens: string[],
    _authLastUpdate: Date,
  ): Promise<StreamResponse> {
    try {
      if (!(authTokens.length > 0) || typeof authTokens !== "object") {
        const auth = await this.getAuth();
        this.logger("liveChannels", "No tokens, trying login");
        authTokens = await this.login(auth.username, auth.password);
      }
      this.logger("liveChannels", "getting the stream");
      const play = await axios.get(
        `https://digiapis.rcs-rds.ro/digionline/api/v13/streams_l_3.php?action=getStream&id_stream=${id}&platform=Android&version_app=release&i=${
          authTokens[0]
        }&sn=ro.rcsrds.digionline&s=app&quality=all`,
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
   * It gets a list of channels from the API and returns a promise with a list of channels
   * @returns A promise that resolves to an object containing the channel name and id.
   */
  async getChannels(): Promise<Record<string, string>> {
    try {
      const channels = await axios.get(
        "https://digiapis.rcs-rds.ro/digionline/api/v13/categorieschannels.php",
      );

      const chList: { [k: string]: string } = {};
      channels.data.data.channels_list.forEach(
        (element: { channel_name: string | number; id_channel: string }) => {
          // console.log(`${element.channel_name} - ${element.id_channel}`);
          chList[element.channel_name] = element.id_channel;
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
