import Class from '../src/moduleClass.js';

import axios from 'axios';
import md5 from 'blueimp-md5';
import crypto from 'crypto';

var Module = new Class('digi', true, false)

function uuidGen(number, uuid = ""){
  let gen = crypto.randomUUID().replace(/\-/g, "")
  if(number == 0){
      return uuid
  } 
  return uuidGen(number - 1, uuid + gen)
}

function generateId(username, password, uhash){
let deviceStr = `Kodeative_iptvro_${BigInt(parseInt((new Date().getTime() / 1000).toString())).valueOf()}`
let deviceId = `${deviceStr}_${uuidGen(8).substring(0, (128 - deviceStr.length) + (-1))}`
let md5hash = md5(`${username}${password}${deviceId}KodeativeiptvroREL_12${uhash}`)
return {id: deviceId, hash: md5hash}
}

Module.login = async function login() {
    let auth = Module.getAuth();
    let pwdHash = md5(auth.password)
    return new Promise(async (resolve, reject) => {
      try {
        if(!auth.password || !auth.username)
          throw "Username/Password not provided"

        let xhrResponse = await axios.get(`https://digiapis.rcs-rds.ro/digionline/api/v13/user.php?pass=${pwdHash}&action=registerUser&user=${encodeURIComponent(auth.username)}`,
        {
          headers: {
            "User-Agent": "okhttp/4.8.1",
            "authorization": "Basic YXBpLXdzLXdlYmFkbWluOmRldl90ZWFtX3Bhc3M="
          }
        })
        let userHash = xhrResponse.data?.data.h
    
        if(!userHash)
          throw "Hash not received, something went wrong!"
    
        let id = generateId(auth.username, pwdHash, userHash)
    
        let register = await axios.get(`https://digiapis.rcs-rds.ro/digionline/api/v13/devices.php?c=${id.hash}&pass=${pwdHash}&dmo=iptvro&action=registerDevice&i=${id.id}&dma=Kodeative&user=${encodeURIComponent(auth.username)}&o=REL_12`, {
          headers: {
            "user-agent": "okhttp/4.8.1",
            "authorization": "Basic YXBpLXdzLXdlYmFkbWluOmRldl90ZWFtX3Bhc3M="
          }
        })
    
        if(register.data.meta?.error == 0){
          Module.setAuth({username: auth.username, password: auth.password, authTokens: [id.id], lastupdated: new Date()})
        } else throw "Authentication failed"
        
        resolve(id.id);
      } catch (error) {
        reject("digi| login: " + error);
      }
    });
}

Module.liveChannels = async function getFromDigi(id, authTokens, authLastUpdate) {
    let config = Module.getConfig();
    return new Promise(async (resolve, reject) => {
      if(!authTokens){
        Module.logger('liveChannels', "No tokens, trying login")
        authTokens = await Module.login();
      }
      try {
        Module.logger('liveChannels',"getting the stream");
        let play = await axios.get(`https://digiapis.rcs-rds.ro/digionline/api/v13/streams_l_3.php?action=getStream&id_stream=${config.chList[id]['id']}&platform=Android&version_app=release&i=${authTokens}&sn=ro.rcsrds.digionline&s=app&quality=all`,
        {
          headers: {
            "authorization": "Basic YXBpLXdzLXdlYmFkbWluOmRldl90ZWFtX3Bhc3M=",
            "user-agent": "okhttp/4.8.1"
          },
        }
      );
        play && Module.logger("liveChannels", "got the stream");
        if(play.data.error !== ""){
            reject(Module.logger("liveChannels", `Error from provider '${play.data.error}'`, true))
        }
        resolve(play.data.stream.abr);
      } catch (error) {
            
        //   let auth = Module.getAuth();
        //   Module.login(auth.authTokens).then(() => {
        //       getFromDigi(channel).then(stream => resolve(stream)).catch(er => reject(er))
        //   }).catch(er => reject(er))
        reject(Module.logger("liveChannels", `Error from provider: ${error}`, true))
      }
    })
  }

export default Module;