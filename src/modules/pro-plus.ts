import axios from 'axios';
import ModuleClass, { AuthConfig } from '../moduleClass.js';
import { load } from 'cheerio';

/* A class that extends the Class class. */
class ModuleInstance extends ModuleClass {
    constructor(){
        /* It calls the constructor of the parent class, which is `ModuleClass`. */
        super('pro-plus', true, true, false);
    }

    /**
     * It logs in to the service and returns the access token.
     * @param {string} username - your username
     * @param {string} password - string - the password you use to login to the app
     * @returns The access token
    */
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
  
    /**
     * It gets the live stream of a channel.
     * @param {string} id - the channel id, you can get it from the channel list
     * @param {string[]} authTokens - The tokens you get from the login function.
     * @param {Date} authLastUpdate - Date - The date when the auth tokens were last updated.
     * @returns The stream url
    */
    async liveChannels(id: string, authTokens: string[], authLastUpdate: Date): Promise<{stream: string, proxy?: string}> {
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
        if(stream.data.url.includes("playlist-live_lq-live_mq-live_hq")){
            stream.data.url = stream.data.url.replace("playlist-live_lq-live_mq-live_hq", "playlist-live_lq-live_mq-live_hq-live_fullhd");
        }
        return Promise.resolve({stream: stream.data.url});
    } catch (error) {
        return Promise.reject(this.logger("liveChannels", error.message || error.toString().substring(0, error.findIndex("\n")), true));
    }
    }

    /**
     * It gets the HTML of the website, loads it into a cheerio object, then loops through all the channels
     * and adds them to an object
     * @returns A list of channels and their respective IDs
    */
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

/* It exports the class so it can be used in other files. */
export default ModuleInstance;