// deno-lint-ignore-file
import ModuleClass, {
  IChannelsList,
  ModuleType,
  StreamResponse,
  VODListResponse,
} from "../moduleClass.ts";

/* The `ModuleInstance` class is a TypeScript class that extends `ModuleClass` and implements
`ModuleType`, providing methods for searching shows, logging in, retrieving live channels, getting a
list of channels, retrieving VOD lists, and retrieving VOD episodes. */
class ModuleInstance extends ModuleClass implements ModuleType {
  constructor() {
    /* The `super()` function is used to call the constructor of the parent class, `ModuleClass`. In this
    case, it is passing an object as an argument to the parent class constructor. */
    super({
      MODULE_ID: "dummy",
      hasLive: false,
      hasVOD: false,
      authReq: false,
    });
  }

  /**
   * The function "searchShow" is a TypeScript function that takes in an array of authentication tokens
   * and a string as parameters, and returns a Promise of type VODListResponse.
   * @param {string[]} authTokens - An array of authentication tokens that are required to access the
   * search functionality.
   * @param {string} string - The `string` parameter is a string that represents the search query for a
   * show. It is the input that will be used to search for a show in the VOD (Video on Demand) list.
   */
  searchShow(authTokens: string[], string: string): Promise<VODListResponse> {
    throw new Error("Method not implemented.");
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
    throw new Error("Method not implemented.");
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
    throw new Error("Method not implemented.");
  }

  /**
   * It fetches the list of channels from the API and returns a dictionary of channel names and their
   * respective IDs
   * @returns A list of channels with their respective ids, names and logos.
   */
  async getChannels(): Promise<IChannelsList> {
    throw new Error("Method not implemented.");
  }

  /**
   * The function `getVOD_List` is an asynchronous function that returns a promise of type
   * `VODListResponse` and throws an error indicating that the method is not implemented.
   * @param {string[]} _authTokens - The `_authTokens` parameter is an array of strings that represents
   * the authentication tokens required to access the VOD list. These tokens are used to authenticate the
   * user and ensure that they have the necessary permissions to retrieve the VOD list.
   * @param [_options] - The _options parameter is an optional object that can contain additional
   * configuration options for the getVOD_List method. It is of type Record<string, unknown>, which means
   * it can have any number of properties of any type.
   */

  async getVOD_List(
    _authTokens: string[],
    _options?: Record<string, unknown>,
  ): Promise<VODListResponse> {
    throw new Error("Method not implemented.");
  }
  /**
   * The function `getVOD` is an asynchronous function that takes in a show name, an array of
   * authentication tokens, and an optional options object, and returns a promise that resolves to a
   * `VODListResponse` object.
   * @param {string} show - A string representing the name or identifier of the show for which you want
   * to retrieve VODs.
   * @param {string[]} authTokens - The `authTokens` parameter is an array of strings that represents the
   * authentication tokens required to access the VOD (Video on Demand) service. These tokens are used to
   * authenticate the user and ensure that they have the necessary permissions to retrieve the VOD
   * content.
   * @param [_options] - The `_options` parameter is an optional parameter of type `Record<string,
   * unknown>`. It is a generic object that can contain any key-value pairs. The purpose of this
   * parameter is to provide additional options or configuration settings for the `getVOD` method.
   */
  async getVOD(
    show: string,
    authTokens: string[],
    _options?: Record<string, unknown>,
  ): Promise<VODListResponse> {
    throw new Error("Method not implemented.");
  }
  /**
   * The function getVOD_EP is an asynchronous function that takes in a show name, episode ID, and an
   * array of authentication tokens, and returns a Promise that resolves to a StreamResponse.
   * @param {string} _show - A string representing the name or identifier of the show for which you want
   * to get the VOD (Video on Demand) episode.
   * @param {string} epid - The `epid` parameter is a string that represents the ID of the episode you
   * want to retrieve the VOD (Video on Demand) for.
   * @param {string[]} authTokens - The `authTokens` parameter is an array of authentication tokens.
   * These tokens are used to authenticate the user and verify their access permissions before retrieving
   * the VOD (Video on Demand) episode.
   */
  async getVOD_EP(
    _show: string,
    epid: string,
    authTokens: string[],
  ): Promise<StreamResponse> {
    throw new Error("Method not implemented.");
  }
}

/* It exports the class so it can be used in other files. */
export default ModuleInstance;
