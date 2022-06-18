import axios from 'axios';
import ModuleClass from '../moduleClass.js';

/* A class that extends the ModuleClass class. */
export default class ModuleInstance extends ModuleClass {
    constructor(){
        /* It calls the constructor of the parent class, which is `ModuleClass`. */
        super('digi24', false, true, false, {
            "digi24": "digi24",
            "digisport1": "digisport1",
            "digisport2": "digisport2",
            "digisport3": "digisport3",
            "digisport4": "digisport4",
        });
    }

    /**
     * It logs in to the service and returns the access token.
     * @param {string} username - your username
     * @param {string} password - string - the password you use to login to the app
     * @returns The access token
    */
    async login(username: string, password: string): Promise<string[]> {
    try {
        return Promise.resolve(["Login not implemented, no use on this module"])
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
        if(!authTokens && this.authReq){
            let auth = await this.getAuth(); 
            this.logger('liveChannels', "No tokens, trying login")
            authTokens = await this.login(auth.username, auth.password)
        }
        this.logger('liveChannels', "Getting token")
        let key = await axios.get(
            "https://balancer2.digi24.ro/streamer/make_key.php",
            {
            headers: {
                accept: "*/*",
                "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                "cache-control": "no-cache",
                pragma: "no-cache",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                referrer: "https://www.digi24.ro/",
                referrerPolicy: "origin-when-cross-origin",
            },
            }
        );
        key.status === 200 && this.logger('liveChannels', "Got token")
        let stream = await axios.get(
            `https://balancer2.digi24.ro/streamer.php?&scope=${id}&key=${
            key.data
            }&outputFormat=json&type=hq&quality=hq&is=4&ns=${id}&pe=site&s=site&sn=${
            id.includes("sport") ? "digisport.ro" : "digi24.ro"
            }&p=browser&pd=linux`
        );
        return Promise.resolve({stream: stream.data.file});
    } catch (error) {
        return Promise.reject(this.logger("liveChannels", error.message || error.toString().substring(0, error.findIndex("\n")), true));
    }
    }
}