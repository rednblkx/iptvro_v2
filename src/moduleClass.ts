import { writeFile } from "fs";
class Module {

    MODULE_ID: string;
    hasLive: boolean;
    hasVOD: boolean;
    chList: string[];
    qualitiesList: string[];
    initializeConfig: Function;
    liveChannels: Function;
    login: Function;
    getVOD: Function;
    getVOD_List: Function;
    getVOD_EP: Function;
    getVOD_EP_List: Function;
    getChannels: Function;
    
    constructor(MODULE_ID: string, hasLive: boolean, hasVOD: boolean, chList: string[], qualitiesList?: string[]){
        this.MODULE_ID = MODULE_ID;
        this.hasLive = hasLive;
        this.hasVOD = hasVOD;
        this.chList = chList;
        this.qualitiesList = qualitiesList;
        this.liveChannels = dummy;
        this.login = dummy;
        this.getVOD = dummy;
        this.getVOD_List = dummy;
        this.getVOD_EP = dummy;
        this.getVOD_EP_List = dummy;
        this.getChannels = dummy;
        this.initializeConfig = async function initializeConfig(){
            var config = {
              "auth": {
                  "username": "",
                  "password": "",
                  "cookies": null
              },
              "config": {
                  "cache_enabled": true,
                  "cachetime": 6,
                  "chList": null
              }
            }
            //write config to file
            writeFile(`${__dirname}/../modules/${MODULE_ID}.json`, JSON.stringify(config, null, 2), () => {
                console.log(`${MODULE_ID} config file created`);
                return config;
            });
        };

        function dummy(): string {
            return "dummy function"
        }

    }
}

export default Module;