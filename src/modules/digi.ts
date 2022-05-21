import Class from '../moduleClass.js';

import axios from 'axios';
import md5 from 'blueimp-md5';
import crypto from 'crypto';

// var Module = new Class('digi', true, false)

class ModuleInstance extends Class {
  constructor(){
    super('digi', true, false);
  }

  private uuidGen(number, uuid = ""){
    let gen = crypto.randomUUID().replace(/\-/g, "")
    if(number == 0){
        return uuid
    } 
    return this.uuidGen(number - 1, uuid + gen)
  }
  
  private generateId(username, password, uhash){
    let deviceStr = `Kodeative_iptvro_${BigInt(parseInt((new Date().getTime() / 1000).toString())).valueOf()}`
    let deviceId = `${deviceStr}_${this.uuidGen(8).substring(0, (128 - deviceStr.length) + (-1))}`
    let md5hash = md5(`${username}${password}${deviceId}KodeativeiptvroREL_12${uhash}`)
    return {id: deviceId, hash: md5hash}
  }

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
  
  async liveChannels(id: string, authTokens: string[], authLastUpdate: Date): Promise<string> {
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
        play && this.logger("liveChannels", "got the stream");
        if(play.data.error !== ""){
            reject(this.logger("liveChannels", `Error from provider '${play.data.error}'`, true))
        }
        resolve(play.data.stream.abr);
      } catch (error) {
            
        //   let auth = this.getAuth();
        //   this.login(auth.authTokens).then(() => {
        //       getFromDigi(channel).then(stream => resolve(stream)).catch(er => reject(er))
        //   }).catch(er => reject(er))
        reject(this.logger("liveChannels", `Error from provider: ${error}`, true))
      }
    })
  }

  async getChannels(): Promise<object> {

    let channels = await axios.get('https://digiapis.rcs-rds.ro/digionline/api/v13/categorieschannels.php');

    let chList = {};
    channels.data.data.channels_list.forEach(element => {
        // console.log(`${element.channel_name} - ${element.id_channel}`);
        chList[element.channel_name] = element.id_channel;
    })
    return Promise.resolve(chList);
  }
}

export default ModuleInstance;