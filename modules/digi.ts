import Class from '../src/moduleClass.js';

import axios from 'axios';
import cheerio from 'cheerio';
import puppeteer, {SerializableOrJSHandle} from 'puppeteer';
import http2 from 'http2';

var Module = new Class('digi', true, false)

Module.login = async function login(username, password) {
    let auth = Module.getAuth();
    let reusecookie = {deviceId: ""};
    auth.cookies && Module.logger('login',`reusing cookies ${auth.cookies}`);
    return new Promise(async (resolve, reject) => {
      try {
        const browser = await puppeteer.launch({headless: !Module.debug, args: ['--no-sandbox', '--disable-setuid-sandbox']});
        const page = await browser.newPage();
        await page.goto('https://www.digionline.ro/auth/login');
        await page.evaluate((auth) => {
            (<HTMLInputElement>document.getElementById("form-login-email")).value = auth.username;
            (<HTMLInputElement>document.getElementById("form-login-password")).value = auth.password;
            for(var a=0; a==document.getElementsByTagName("button").length - 1;a++){
                if(document.getElementsByTagName("button")[a].getAttribute("type") === "submit"){
                    document.getElementsByTagName("button")[a].click()
                }
                }
        }, <SerializableOrJSHandle>(<unknown>auth))
        if(auth.cookies){
          auth.cookies.forEach(b => {
            let aux = b.split("=");
            reusecookie[aux[0]] = aux[1]
          })
          await page.setCookie({name: "deviceId", value: reusecookie.deviceId, domain:".digionline.ro"})
        }    
        await page.waitForSelector("#form-login-mode-all");
        var pupcookie = await page.cookies();
  
        if(pupcookie.find(a => a.name == "deviceId")){
          auth.cookies = [];
          pupcookie.forEach(cookie => {
            auth.cookies.push(`${cookie.name}=${cookie.value}`)
          })
          browser.close();
          Module.setAuth({username: auth.username, password: auth.password, cookies: auth.cookies, lastupdated: new Date()})
        }
        else throw "No cookies found"
        resolve(auth.cookies);
      } catch (error) {
        reject("digi| login: " + error);
      }
    });
}

Module.liveChannels = async function getFromDigi(channel) {
    let config = Module.getConfig();
    return new Promise(async (resolve, reject) => {
      try {
        let auth = Module.getAuth();
        Module.logger('liveChannels',"getting the stream");
        let play = await axios.post(
          "https://www.digionline.ro/api/stream",
          `id_stream=${config.chList[channel]["id"]}&quality=hq`,
          {
            headers: {
              authority: "www.digionline.ro",
              pragma: "no-cache",
              "cache-control": "no-cache",
              accept: "application/json, text/javascript, */*; q=0.01",
              dnt: "1",
              "x-requested-with": "XMLHttpRequest",
              "user-agent":
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36",
              "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
              origin: "https:/www.digionline.ro",
              "sec-fetch-site": "same-origin",
              "sec-fetch-mode": "cors",
              "sec-fetch-dest": "empty",
              referer: `https:/www.digionline.ro/${config.chList[channel]["category"]}/${channel}`,
              "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
              cookie: auth.cookies.join("; "),
            },
          }
        );
        play && Module.logger("liveChannels", "got the stream");
        if(play.data.stream_errCode !== 0){
            reject(Module.logger("liveChannels", `Got error from provider '${play.data.stream_err}'`, true))
        }
        resolve(play.data.stream_url);
      } catch (error) {
            
        //   let auth = Module.getAuth();
        //   Module.login(auth.cookies).then(() => {
        //       getFromDigi(channel).then(stream => resolve(stream)).catch(er => reject(er))
        //   }).catch(er => reject(er))
      }
    })
  }

export default Module;