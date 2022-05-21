import axios from 'axios';
import Class, { AuthConfig } from '../moduleClass.js';
import { load } from 'cheerio';

class ModuleInstance extends Class {
  constructor(){
    super('pro', true, false);
  }

  async login(username: string, password: string): Promise<string[]> {
    try {
        let step1 = await axios.post(
            "https://apiprotvplus.cms.protvplus.ro/api/v2/auth-sessions",
            `{"username":"${username}","password":"${password}"}`,
            {
            headers: {
                "X-DeviceType": "mobile",
                "X-DeviceOS": "Android",
                "User-Agent": "PRO TV PLUS/1.8.1 (com.protvromania; build:1648; Android 10; Model:Android SDK built for x86_64) okhttp/4.9.1",
                "X-Api-Key": "e09ea8e36e2726d04104d06216da2d3d9bc6c36d6aa200b6e14f68137c832a8369f268e89324fdc9",
                "Content-Type": "application/json"
            },
            maxRedirects: 0,
            validateStatus: (status) => status === 200
            })
        this.logger("login", `got response ${step1.data}`)
        if (step1.data?.credentials) {
            this.logger("login", `got accessToken = ${step1.data?.credentials.accessToken}`)
            let auth : AuthConfig['auth'] = {username, password, authTokens: [<string>step1.data?.credentials.accessToken], lastupdated: new Date()}
            this.setAuth(auth)
            return Promise.resolve(auth.authTokens)
        } else return Promise.reject(this.logger("login", "Authentication Failed", true));

    } catch (error) {
        return Promise.reject(this.logger("login", error.message || error.toString().substring(0, error.findIndex("\n")), true));
    }
  }
  
  async liveChannels(id: string, authTokens: string[], authLastUpdate: Date): Promise<string> {
    try {
        if(!authTokens){
            let auth = await this.getAuth(); 
            this.logger('liveChannels', "No tokens, trying login")
            authTokens = await this.login(auth.username, auth.password)
          }
        let ch = (await this.getConfig()).chList
        let stream = await axios.get(`https://apiprotvplus.cms.protvplus.ro/api/v2/content/channel-${id}/plays?acceptVideo=hls`,{
            headers: {
                "X-DeviceType": "mobile",
                "X-DeviceOS": "Android",
                "User-Agent": "PRO TV PLUS/1.8.1 (com.protvromania; build:1648; Android 10; Model:Android SDK built for x86_64) okhttp/4.9.1",
                "X-Api-Key": "e09ea8e36e2726d04104d06216da2d3d9bc6c36d6aa200b6e14f68137c832a8369f268e89324fdc9",
                "Authorization": `Bearer ${authTokens[0]}`
            }
        })
        this.logger("liveChannels", `got response ${JSON.stringify(stream.data)}`)
        return Promise.resolve(stream.data.url);
    } catch (error) {
        return Promise.reject(this.logger("login", error.message || error.toString().substring(0, error.findIndex("\n")), true));
    }
}

    async getChannels(): Promise<object> {
        let getHTML = (await axios.get("https://protvplus.ro/")).data
        let $ = load(getHTML);
        let channelList = {}
        $('.channels-main a').each(function(i, el) {
            let link = el.attribs['href'];
            channelList[link.match(/([0-9])-(.*)/)[2]] = link.match(/([0-9])-(.*)/)[1]
        })
        return Promise.resolve(channelList)
    }
}

export default ModuleInstance;