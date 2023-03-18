import axios from "https://deno.land/x/axiod@0.26.2/mod.ts";
import ModuleClass, {
  IVOD,
  IVODData,
  ModuleType,
  StreamResponse,
  VODListResponse,
} from "../moduleClass.ts";
import * as mod from "https://deno.land/std@0.91.0/encoding/base64.ts";
import {
  crypto,
  toHashString,
} from "https://deno.land/std@0.170.0/crypto/mod.ts";
import {
  ChannelsList,
  IEpisode,
  IVODEpisodes,
  LiveStreamResponse,
  LoginResponse,
  VODList,
} from "./types/pro-plus.d.ts";
import moment from "https://deno.land/x/momentjs@2.29.1-deno/mod.ts";

/* A class that extends the Class class. */
class ModuleInstance extends ModuleClass implements ModuleType {
  constructor() {
    /* It calls the constructor of the parent class, which is `ModuleClass`. */
    super("pro-plus", true, false, true);
  }

  /**
   * It takes a username and password, generates a random UUID, and then sends a POST request to the
   * provider's login endpoint. If the response contains an access token, it saves the username,
   * password, access token, and UUID to the database. If the response contains an error message, it
   * throws an error
   * @param {string} username - Your username
   * @param {string} password - The password you use to login to the provider's website.
   * @returns The access token and the uuid
   */
  async login(username: string, password: string): Promise<string[]> {
    try {
      const uuid = crypto.randomUUID();
      const login_res = await axios.post<
        LoginResponse & { message: string; code: string }
      >(
        "https://apiprotvplus.cms.protvplus.ro/api/v2/auth-sessions",
        { username, password },
        {
          headers: {
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "Content-Type": "application/json",
            "X-Api-Key":
              "e09ea8e36e2726d04104d06216da2d3d9bc6c36d6aa200b6e14f68137c832a8369f268e89324fdc9",
            "X-Device-Id": uuid,
            "User-Agent":
              "PRO TV PLUS/1.15.0 (com.protvromania; build:2180; Android 12; Model:moto g(7) power okhttp/4.9.1)",
            "X-AppBuildNumber": "2180",
            "X-Version": "1.15.0",
            "X-DeviceName": "Moto G7 Power",
            "X-DeviceModel": "moto g(7) power",
            "X-DeviceManufacturer": "motorola",
            "X-DeviceOSVersion": "32",
            "X-DeviceOS": "Android",
            "X-DeviceType": "mobile",
          },
          responseType: "json",
        },
      );
      this.logger("login", login_res.data);
      if (login_res.data.credentials?.accessToken) {
        this.setAuth({
          username,
          password,
          authTokens: [login_res.data.credentials.accessToken, uuid],
          lastupdated: new Date(),
        });
        return Promise.resolve(
          [login_res.data.credentials.accessToken, uuid],
        );
      } else if (login_res.data.message) {
        throw `Error from provider: ${login_res.data.message}`;
      }
      return Promise.resolve([]);
    } catch (error) {
      return Promise.reject(this.logger(
        "login",
        error,
        true,
      ));
    }
  }

  /**
   * It takes the channel id, the auth tokens and the last time the auth tokens were updated and
   * returns a promise that resolves to an object containing the stream url and the drm url and headers
   * @param {string} id - The channel id
   * @param {string[]} authTokens - The tokens returned by the login function.
   * @param {Date} _authLastUpdate - Date - The date of the last time the auth tokens were updated.
   * @returns A promise that resolves to an object with a stream and drm property.
   */
  async liveChannels(
    id: string,
    authTokens: string[],
    _authLastUpdate: Date,
  ): Promise<StreamResponse> {
    try {
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
      const headers = {
        "Authorization": `Bearer ${authTokens[0]}`,
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Content-Type": "application/json",
        "X-Api-Key":
          "e09ea8e36e2726d04104d06216da2d3d9bc6c36d6aa200b6e14f68137c832a8369f268e89324fdc9",
        "X-Device-Id": authTokens[1],
        "User-Agent":
          "PRO TV PLUS/1.15.0 (com.protvromania; build:2180; Android 12; Model:moto g(7) power okhttp/4.9.1)",
        "X-AppBuildNumber": "2180",
        "X-Version": "1.15.0",
        "X-DeviceName": "Moto G7 Power",
        "X-DeviceModel": "moto g(7) power",
        "X-DeviceManufacturer": "motorola",
        "X-DeviceOSVersion": "32",
        "X-DeviceOS": "Android",
        "X-DeviceType": "mobile",
      };
      const server_time = await axios.get<
        { localTime: string; encoded: string }
      >("https://apiprotvplus.cms.protvplus.ro/api/v2/server/time", {
        headers,
      });
      this.logger("liveChannels", server_time);
      const enc_string = new TextDecoder().decode(
        mod.decode(
          "ZGtkZjM1ZzYhIHtjb250ZW50fXxwbGF5c3xuZzhyNWUzMSF8e3NlcnZlclRpbWV9ISNpM2R0JjQzQA==",
        ),
      ).replace("{content}", id).replace(
        "{serverTime}",
        server_time.data.localTime,
      );
      const hash = await crypto.subtle.digest(
        "MD5",
        new TextEncoder().encode(enc_string),
      );
      const live_channel = await axios.post<
        LiveStreamResponse & { message?: string; code?: string }
      >(
        `https://apiprotvplus.cms.protvplus.ro/api/v2/content/${id}/plays?acceptVideo=hls%2Cdai%2Cdash%2Cdrm-widevine&t=${server_time.data.encoded}&s=${
          toHashString(hash)
        }`,
        "",
        {
          headers,
        },
      );
      this.logger("liveChannels", live_channel);
      if (live_channel.data.message) {
        return Promise.reject(
          this.logger("liveChannels", live_channel.data.message, true),
        );
      }
      return Promise.resolve({
        stream: live_channel.data.url,
        drm: {
          url: live_channel.data.drm.licenseUrl,
          headers: live_channel.data.drm.licenseRequestHeaders.reduce(
            (acc, { name, value }) => ({ ...acc, [name]: value }),
            {},
          ),
        },
      });
    } catch (error) {
      return Promise.reject(this.logger(
        "liveChannels",
        error,
        true,
      ));
    }
  }

  /**
   * It fetches the list of channels from the API and returns a dictionary of channel names and their
   * respective IDs
   * @returns A list of channels with their respective ids.
   */
  async getChannels(): Promise<Record<string, string>> {
    try {
      const channels = await axios.get<ChannelsList>(
        "https://apiprotvplus.cms.protvplus.ro/api/v2/overview?category=livetv",
        {
          headers: {
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "Content-Type": "application/json",
            "X-Api-Key":
              "e09ea8e36e2726d04104d06216da2d3d9bc6c36d6aa200b6e14f68137c832a8369f268e89324fdc9",
            "X-Device-Id": crypto.randomUUID(),
            "User-Agent":
              "PRO TV PLUS/1.15.0 (com.protvromania; build:2180; Android 12; Model:moto g(7) power okhttp/4.9.1)",
            "X-AppBuildNumber": "2180",
            "X-Version": "1.15.0",
            "X-DeviceName": "Moto G7 Power",
            "X-DeviceModel": "moto g(7) power",
            "X-DeviceManufacturer": "motorola",
            "X-DeviceOSVersion": "32",
            "X-DeviceOS": "Android",
            "X-DeviceType": "mobile",
          },
        },
      );
      this.logger("getChannels", channels.data);
      const list: { [k: string]: string } = {};
      channels.data.liveTvs.forEach((obj) => {
        list[
          obj.name.normalize("NFKD").replace(/[^\w]/g, " ").trim().replace(
            " ",
            "-",
          ).replace(" ", "").toLowerCase()
        ] = obj.id;
      });
      return Promise.resolve(list);
    } catch (error) {
      return Promise.reject(
        this.logger(
          "getChannels",
          error,
          true,
        ),
      );
    }
  }

  async getVOD_List(
    _authTokens: string[],
    _options?: Record<string, unknown>,
  ): Promise<VODListResponse> {
    try {
      const vod_res = await axios.get<VODList>(
        "https://apiprotvplus.cms.protvplus.ro/api/v2/overview",
        {
          headers: {
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "Content-Type": "application/json",
            "X-Api-Key":
              "e09ea8e36e2726d04104d06216da2d3d9bc6c36d6aa200b6e14f68137c832a8369f268e89324fdc9",
            "X-Device-Id": crypto.randomUUID(),
            "User-Agent":
              "PRO TV PLUS/1.15.0 (com.protvromania; build:2180; Android 12; Model:moto g(7) power okhttp/4.9.1)",
            "X-AppBuildNumber": "2180",
            "X-Version": "1.15.0",
            "X-DeviceName": "Moto G7 Power",
            "X-DeviceModel": "moto g(7) power",
            "X-DeviceManufacturer": "motorola",
            "X-DeviceOSVersion": "32",
            "X-DeviceOS": "Android",
            "X-DeviceType": "mobile",
          },
        },
      );
      this.logger("getVOD_List", vod_res.data);
      const data: IVODData[] = [];
      vod_res.data.sections.forEach((obj) => {
        // data.push({ name: obj.name, link: `/${this.MODULE_ID}/vod/${obj.id}`, img: "" })
        obj.content.forEach((ep) => {
          ep.content.type === "tvshow" &&
            data.push({
              id: ep.content.id,
              name: ep.content.title,
              link: `/${this.MODULE_ID}/vod/${ep.content.id}`,
              img: ep.content.image.replace("{WIDTH}x{HEIGHT}", "1920x1080"),
            });
        });
      });

      const result: IVOD = {
        data: data,
        pagination: {
          current_page: 1,
          per_page: data.length,
          total_pages: 1,
        },
      };
      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(
        this.logger(
          "getVOD_List",
          error,
          true,
        ),
      );
    }
  }
  async getVOD(
    show: string,
    authTokens: string[],
    _options?: Record<string, unknown>,
  ): Promise<VODListResponse> {
    try {
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
      const vod_res = await axios.get<IVODEpisodes>(
        `https://apiprotvplus.cms.protvplus.ro/api/v2/tvshow/${show}`,
        {
          headers: {
            "Authorization": `Bearer ${authTokens[0]}`,
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "Content-Type": "application/json",
            "X-Api-Key":
              "e09ea8e36e2726d04104d06216da2d3d9bc6c36d6aa200b6e14f68137c832a8369f268e89324fdc9",
            "X-Device-Id": authTokens[1],
            "User-Agent":
              "PRO TV PLUS/1.15.0 (com.protvromania; build:2180; Android 12; Model:moto g(7) power okhttp/4.9.1)",
            "X-AppBuildNumber": "2180",
            "X-Version": "1.15.0",
            "X-DeviceName": "Moto G7 Power",
            "X-DeviceModel": "moto g(7) power",
            "X-DeviceManufacturer": "motorola",
            "X-DeviceOSVersion": "32",
            "X-DeviceOS": "Android",
            "X-DeviceType": "mobile",
          },
        },
      );
      this.logger("getVOD_List", vod_res.data);

      const data: IVODData[] = [];

      vod_res.data.sections[0].content.forEach((obj) => {
        data.push({
          id: obj.id,
          name: obj.title,
          link: `/${this.MODULE_ID}/vod/${show}/${obj.id}`,
          date: moment(obj.releaseDateLabel.replaceAll(" ", ""), "DD.MM.YYYY")
            .format(),
          img: obj.image.replace("{WIDTH}x{HEIGHT}", "1920x1080"),
        });
      });

      const result: IVOD = {
        data: data,
        pagination: {
          current_page: 1,
          per_page: data.length,
          total_pages: 1,
        },
      };
      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(
        this.logger(
          "getVOD",
          error,
          true,
        ),
      );
    }
  }
  async getVOD_EP(
    _show: string,
    epid: string,
    authTokens: string[],
  ): Promise<StreamResponse> {
    try {
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
      const headers = {
        "Authorization": `Bearer ${authTokens[0]}`,
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Content-Type": "application/json",
        "X-Api-Key":
          "e09ea8e36e2726d04104d06216da2d3d9bc6c36d6aa200b6e14f68137c832a8369f268e89324fdc9",
        "X-Device-Id": authTokens[1],
        "User-Agent":
          "PRO TV PLUS/1.15.0 (com.protvromania; build:2180; Android 12; Model:moto g(7) power okhttp/4.9.1)",
        "X-AppBuildNumber": "2180",
        "X-Version": "1.15.0",
        "X-DeviceName": "Moto G7 Power",
        "X-DeviceModel": "moto g(7) power",
        "X-DeviceManufacturer": "motorola",
        "X-DeviceOSVersion": "32",
        "X-DeviceOS": "Android",
        "X-DeviceType": "mobile",
      };
      const server_time = await axios.get<
        { localTime: string; encoded: string }
      >("https://apiprotvplus.cms.protvplus.ro/api/v2/server/time", {
        headers,
      });
      this.logger("liveChannels", server_time);
      const enc_string = new TextDecoder().decode(
        mod.decode(
          "ZGtkZjM1ZzYhIHtjb250ZW50fXxwbGF5c3xuZzhyNWUzMSF8e3NlcnZlclRpbWV9ISNpM2R0JjQzQA==",
        ),
      ).replace("{content}", epid).replace(
        "{serverTime}",
        server_time.data.localTime,
      );
      const hash = await crypto.subtle.digest(
        "MD5",
        new TextEncoder().encode(enc_string),
      );
      const vod_res = await axios.get<IEpisode>(
        `https://apiprotvplus.cms.protvplus.ro/api/v2/content/${epid}/plays?acceptVideo=hls%2Cdai%2Cdash&t=${server_time.data.encoded}&s=${
          toHashString(hash)
        }`,
        {
          headers,
        },
      );
      this.logger("getVOD_EP", vod_res.data);

      return Promise.resolve({ stream: vod_res.data.url });
    } catch (error) {
      this.logger(
        "getVOD_EP",
        error,
        true,
      );
      return Promise.reject(
        error?.response?.data?.message || error,
      );
    }
  }
}

/* It exports the class so it can be used in other files. */
export default ModuleInstance;
