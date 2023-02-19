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
  LicenseRequestHeader,
  LiveStreamResponse,
  LoginResponse,
} from "./types/pro-plus.d.ts";
import moment from "https://deno.land/x/momentjs@2.29.1-deno/mod.ts";
import { IVODEpisodes, IVODList, IVODListFilter } from "./types/voyo.d.ts";

/* A class that extends the Class class. */
class ModuleInstance extends ModuleClass implements ModuleType {
  constructor() {
    /* It calls the constructor of the parent class, which is `ModuleClass`. */
    super("voyo", true, true, true);
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
        "https://apivoyo.cms.protvplus.ro/api/v1/auth-sessions",
        { username, password },
        {
          headers: {
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "Content-Type": "application/json",
            "X-Device-Id": uuid,
            "User-Agent":
              "Voyo/5.18.5 (net.cme.voyo.ro; build:2295; Android 12; Model:moto g(7) power) okhttp/4.9.1",
            "X-AppBuildNumber": "2295",
            "X-Version": "5.18.5",
            "X-DeviceName": "IPTV_RO",
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
        "X-Device-Id": authTokens[1],
        "User-Agent":
          "Voyo/5.18.5 (net.cme.voyo.ro; build:2295; Android 12; Model:moto g(7) power) okhttp/4.9.1",
        "X-AppBuildNumber": "2295",
        "X-Version": "5.18.5",
        "X-DeviceName": "IPTV_RO",
        "X-DeviceModel": "moto g(7) power",
        "X-DeviceManufacturer": "motorola",
        "X-DeviceOSVersion": "32",
        "X-DeviceOS": "Android",
        "X-DeviceType": "mobile",
      };
      const server_time = await axios.get<
        { localTime: string; encoded: string }
      >("https://apivoyo.cms.protvplus.ro/api/v1/server/time", {
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
        `https://apivoyo.cms.protvplus.ro/api/v1/content/${id}/plays?acceptVideo=hls%2Cdai%2Cdash%2Cdrm-widevine&t=${server_time.data.encoded}&s=${
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
      if (live_channel.data.videoType === "hls") {
        return Promise.resolve({ stream: live_channel.data.url });
      }
      return Promise.resolve({
        stream: live_channel.data.url,
        drm: {
          url: live_channel.data.drm.licenseUrl,
          headers: live_channel.data.drm.licenseRequestHeaders,
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
      const authTokens = (await this.getAuth()).authTokens;
      if (!authTokens[0]) {
        throw "No tokens, cannot update channels list";
      }
      const channels = await axios.get<ChannelsList>(
        "https://apivoyo.cms.protvplus.ro/api/v1/overview?category=livetv",
        {
          headers: {
            "Authorization": `Bearer ${authTokens[0]}`,
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "Content-Type": "application/json",
            "X-Device-Id": authTokens[1],
            "User-Agent":
              "Voyo/5.18.5 (net.cme.voyo.ro; build:2295; Android 12; Model:moto g(7) power) okhttp/4.9.1",
            "X-AppBuildNumber": "2295",
            "X-Version": "5.18.5",
            "X-DeviceName": "IPTV_RO",
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
          obj.name.normalize("NFKD").replace(/[^\w]/g, " ").trim().replaceAll(
            " ",
            "-",
          ).replace("--", "-").toLowerCase()
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
    authTokens: string[],
    options?: Record<string, unknown>,
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
      const headers = {
        "Authorization": `Bearer ${authTokens[0]}`,
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Content-Type": "application/json",
        "X-Device-Id": authTokens[1],
        "User-Agent":
          "Voyo/5.18.5 (net.cme.voyo.ro; build:2295; Android 12; Model:moto g(7) power) okhttp/4.9.1",
        "X-AppBuildNumber": "2295",
        "X-Version": "5.18.5",
        "X-DeviceName": "IPTV_RO",
        "X-DeviceModel": "moto g(7) power",
        "X-DeviceManufacturer": "motorola",
        "X-DeviceOSVersion": "32",
        "X-DeviceOS": "Android",
        "X-DeviceType": "mobile",
      };

      if (Object.keys(options || {}).length !== 0) {
        const vod_res = await axios.get<IVODListFilter>(
          `https://apivoyo.cms.protvplus.ro/api/v1/content/filter?page=${
            options?.page || 1
          }&category=${options?.category || 2}`,
          {
            headers,
          },
        );
        this.logger("getVOD_List", vod_res.data);
        const list: IVODData[] = [];
        vod_res.data.items.forEach((l) => {
          list.push(
            {
              name: l.title,
              date: l.releaseDateLabel,
              img: l.image.replace("{WIDTH}x{HEIGHT}", "1920x1080"),
              link: `/${this.MODULE_ID}/vod/${l.id}`,
            },
          );
        });

        const result: IVOD = {
          data: list,
          pagination: {
            current_page: Number(
              vod_res.data.availableListingModifiers.find((obj) =>
                obj.name === "currentpage"
              )?.options[0].value,
            ),
            per_page: Number(
              vod_res.data.availableListingModifiers.find((obj) =>
                obj.name === "pagesize"
              )?.options[0].value,
            ),
            total_pages: Number(
              vod_res.data.availableListingModifiers.find((obj) =>
                obj.name === "page"
              )?.options?.at(-1)?.value,
            ),
          },
        };
        return Promise.resolve(result);
      }
      const vod_res = await axios.get<IVODList>(
        `https://apivoyo.cms.protvplus.ro/api/v1/overview`,
        {
          headers,
        },
      );
      this.logger("getVOD_List", vod_res.data);
      const data: IVODData[] = vod_res.data.categories.map((obj) => {
        return {
          name: obj.category.name,
          link: `/${this.MODULE_ID}/vod?category=${obj.category.id}`,
          img: "",
        };
      });
      // vod_res.data.sections.forEach(obj => {
      //   // data.push({ name: obj.name, link: `/${this.MODULE_ID}/vod/${obj.id}`, img: "" })
      //   obj?.content?.forEach(ep => {
      //     ep.content.type === "tvshow" && data.push({ name: ep.content.title, link: `/${this.MODULE_ID}/vod/${ep.content.id}`, img: ep.content.image.replace("{WIDTH}x{HEIGHT}", "1920x1080") })
      //   })
      // })

      return Promise.resolve({ data });
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
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> {
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
      if (Object.keys(options || {}).length !== 0) {
        const vod_res = await axios.get<IVODEpisodes>(
          `https://apivoyo.cms.protvplus.ro/api/v1/tvshow/${show}${
            options?.season ? `?season=${options?.season}` : ""
          }`,
          {
            headers: {
              "Authorization": `Bearer ${authTokens[0]}`,
              "Accept":
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
              "Content-Type": "application/json",
              "X-Device-Id": authTokens[1],
              "User-Agent":
                "Voyo/5.18.5 (net.cme.voyo.ro; build:2295; Android 12; Model:moto g(7) power) okhttp/4.9.1",
              "X-AppBuildNumber": "2295",
              "X-Version": "5.18.5",
              "X-DeviceName": "IPTV_RO",
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

        vod_res.data.sections[0].content?.forEach((obj) => {
          data.push({
            name: obj.title,
            link: `/${this.MODULE_ID}/vod/${show}/${obj.id}`,
            date: moment(obj.releaseDateLabel.replaceAll(" ", ""), "DD.MM.YYYY")
              .format(),
            img: obj.image.replace("{WIDTH}x{HEIGHT}", "1920x1080"),
          });
        });

        return Promise.resolve({ data });
      }
      const vod_res = await axios.get<IVODEpisodes>(
        `https://apivoyo.cms.protvplus.ro/api/v1/tvshow/${show}`,
        {
          headers: {
            "Authorization": `Bearer ${authTokens[0]}`,
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "Content-Type": "application/json",
            "X-Device-Id": authTokens[1],
            "User-Agent":
              "Voyo/5.18.5 (net.cme.voyo.ro; build:2295; Android 12; Model:moto g(7) power) okhttp/4.9.1",
            "X-AppBuildNumber": "2295",
            "X-Version": "5.18.5",
            "X-DeviceName": "IPTV_RO",
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

      if (vod_res.data.seasons.length > 0) {
        vod_res.data.seasons.forEach((obj) => {
          data.push({
            name: obj.name,
            link: `/${this.MODULE_ID}/vod/${show}?season=${obj.id}`,
            img: "",
          });
        });
      } else {
        vod_res.data.sections[0].content?.forEach((obj) => {
          data.push({
            name: obj.title,
            link: `/${this.MODULE_ID}/vod/${show}/${obj.id}`,
            date: moment(obj.releaseDateLabel.replaceAll(" ", ""), "DD.MM.YYYY")
              .format(),
            img: obj.image.replace("{WIDTH}x{HEIGHT}", "1920x1080"),
          });
        });
      }

      return Promise.resolve({ data });
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
    show: string,
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
        "User-Agent":
          "Voyo/5.18.5 (net.cme.voyo.ro; build:2295; Android 12; Model:moto g(7) power) okhttp/4.9.1",
        "X-Device-Id": authTokens[1],
        "X-AppBuildNumber": "2295",
        "X-Version": "5.18.5",
        "X-DeviceName": "IPTV_RO",
        "X-DeviceModel": "moto g(7) power",
        "X-DeviceManufacturer": "motorola",
        "X-DeviceOSVersion": "32",
        "X-DeviceOS": "Android",
        "X-DeviceType": "mobile",
      };
      const server_time = await axios.get<
        { localTime: string; encoded: string }
      >("https://apivoyo.cms.protvplus.ro/api/v1/server/time", {
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
      const vod_res = await axios.post<IEpisode>(
        `https://apivoyo.cms.protvplus.ro/api/v1/content/${epid}/plays?acceptVideo=hls%2Cdai%2Cdash%2Cdrm-widevine&t=${server_time.data.encoded}&s=${
          toHashString(hash)
        }`,
        "",
        {
          headers,
        },
      );
      this.logger("getVOD_EP", vod_res.data);

      return Promise.resolve({
        stream: vod_res.data.url,
        drm: {
          url: vod_res.data.drm.licenseUrl,
          headers: vod_res.data.drm.licenseRequestHeaders,
        },
        subtitles: vod_res.data.subtitles,
      });
    } catch (error) {
      return Promise.reject(
        this.logger(
          "getVOD_EP",
          error,
          true,
        ),
      );
    }
  }
}

/* It exports the class so it can be used in other files. */
export default ModuleInstance;
