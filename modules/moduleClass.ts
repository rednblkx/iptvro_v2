class Module {

    MODULE_ID: string;
    hasLive: boolean;
    hasVOD: boolean;
    chList: string[];
    qualitiesList: string[];
    liveChannels: Function;
    login: Function;
    getVOD: Function;
    getVOD_List: Function;
    getVOD_EP: Function;
    getVOD_EP_List: Function;
    
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

        function dummy(): string {
            return "dummy function"
        }

    }
}

export default Module;