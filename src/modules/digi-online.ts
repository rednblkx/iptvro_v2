import ModuleClass from '../moduleClass.js';

import axios from 'axios';
import md5 from 'blueimp-md5';
import crypto from 'crypto';

// var Module = new Class('digi', true, false)

class ModuleInstance extends ModuleClass {
/**
 * A constructor function for the Digi class.
 */
  constructor(){
    /* Calling the constructor of the parent class, which is ModuleClass. */
    super('digi-online', true, true, false);
  }

  /**
   * It generates a random UUID.
   * @param number - The number of uuids you want to generate.
   * @param [uuid] - The uuid to be returned
   * @returns A string of random uuids
   */
  private uuidGen(number, uuid = ""){
    let gen = crypto.randomUUID().replace(/\-/g, "")
    if(number == 0){
        return uuid
    } 
    return this.uuidGen(number - 1, uuid + gen)
  }
  
  /**
   * It takes a username, password, and a hash, and returns a device ID and a hash
   * @param username - Your username
   * @param password - The password you use to login to the website
   * @param uhash - This is the hash that is returned from the login request.
   * @returns An object with two properties, id and hash.
   */
  private generateId(username, password, uhash){
    let deviceStr = `Kodeative_iptvro_${BigInt(parseInt((new Date().getTime() / 1000).toString())).valueOf()}`
    let deviceId = `${deviceStr}_${this.uuidGen(8).substring(0, (128 - deviceStr.length) + (-1))}`
    let md5hash = md5(`${username}${password}${deviceId}KodeativeiptvroREL_12${uhash}`)
    return {id: deviceId, hash: md5hash}
  }

/**
 * It generates a unique ID for the user and returns it.
 * @param {string} username - your digionline username
 * @param {string} password - The password you use to login to the Digi Online website
 * @returns a promise that resolves to an array of strings.
 */
  async login(username: string, password: string): Promise<string[]> {
      // let auth = this.getAuth();
      let pwdHash = md5(password)
      return new Promise(async (resolve, reject) => {
        try {
          if(!password || !username)
            throw "Username/Password not provided"
  
          let xhrResponse = await axios.get(`https://digiapis.rcs-rds.ro/digionline/api/v13/user.php?pass=${pwdHash}&action=registerUser&user=${encodeURIComponent(username)}`,
          {
            headers: {
              "User-Agent": "okhttp/4.8.1",
              "authorization": "Basic YXBpLXdzLXdlYmFkbWluOmRldl90ZWFtX3Bhc3M="
            }
          })
          this.logger('login', `got response ${xhrResponse.data}`)
          let userHash = xhrResponse.data?.data.h
      
          if(!userHash)
            throw "Hash not received, something went wrong!"
      
          let id = this.generateId(username, pwdHash, userHash)
      
          let register = await axios.get(`https://digiapis.rcs-rds.ro/digionline/api/v13/devices.php?c=${id.hash}&pass=${pwdHash}&dmo=iptvro&action=registerDevice&i=${id.id}&dma=Kodeative&user=${encodeURIComponent(username)}&o=REL_12`, {
            headers: {
              "user-agent": "okhttp/4.8.1",
              "authorization": "Basic YXBpLXdzLXdlYmFkbWluOmRldl90ZWFtX3Bhc3M="
            }
          })
          this.logger('login', `got response ${register.data}`)
          if(register.data.meta?.error == 0){
            this.setAuth({username: username, password: password, authTokens: [id.id], lastupdated: new Date()})
          } else throw "Authentication failed"
          
          resolve([id.id]);
        } catch (error) {
          reject(this.logger("login", error.message || error.toString().substring(0, error.findIndex("\n")), true));
        }
      });
  }
  
  /**
   * It gets the stream from the provider, if it fails it tries to login and then get the stream again
   * @param {string} id - the channel id
   * @param {string[]} authTokens - the tokens you get from the login function
   * @param {Date} authLastUpdate - Date - the date when the auth tokens were last updated
   * @returns The stream url and the proxy url
   */
  async liveChannels(id: string, authTokens: string[], authLastUpdate: Date): Promise<{stream: string, proxy?: string}> {
    let config = await this.getConfig();
    return new Promise(async (resolve, reject) => {
      if(!authTokens){
        let auth = await this.getAuth(); 
        this.logger('liveChannels', "No tokens, trying login")
        authTokens = await this.login(auth.username, auth.password)
      }
      try {
        this.logger('liveChannels',"getting the stream");
        let play = await axios.get(`https://digiapis.rcs-rds.ro/digionline/api/v13/streams_l_3.php?action=getStream&id_stream=${id}&platform=Android&version_app=release&i=${authTokens[0]}&sn=ro.rcsrds.digionline&s=app&quality=all`,
        {
          headers: {
            "authorization": "Basic YXBpLXdzLXdlYmFkbWluOmRldl90ZWFtX3Bhc3M=",
            "user-agent": "okhttp/4.8.1"
          },
        }
      );
        play.data.stream?.abr && this.logger("liveChannels", "got the stream");
        if(play.data.error !== ""){
            reject(this.logger("liveChannels", `Error from provider '${play.data.error}'`, true))
        }
        resolve({stream: play.data.stream.abr, proxy: play.data.stream.proxy || undefined});
      } catch (error) {
            
        //   let auth = this.getAuth();
        //   this.login(auth.authTokens).then(() => {
        //       getFromDigi(channel).then(stream => resolve(stream)).catch(er => reject(er))
        //   }).catch(er => reject(er))
        reject(this.logger("liveChannels", `Error from provider: ${error}`, true))
      }
    })
  }

/**
 * It gets a list of channels from the API and returns a promise with a list of channels
 * @returns A promise that resolves to an object containing the channel name and id.
 */
  async getChannels(): Promise<object> {
    try {
      let channels = await axios.get('https://digiapis.rcs-rds.ro/digionline/api/v13/categorieschannels.php');
  
      let chList = {};
      channels.data.data.channels_list.forEach(element => {
          // console.log(`${element.channel_name} - ${element.id_channel}`);
          chList[element.channel_name] = element.id_channel;
      })
      return Promise.resolve(chList);
    } catch (error) {
      return Promise.reject(this.logger("liveChannels", error.message || error.toString().substring(0, error.findIndex("\n")), true)); 
    }
  }
}

/* It exports the class so it can be used in other files. */
export default ModuleInstance;