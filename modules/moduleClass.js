class Module {
    
    constructor(MODULE_ID, hasLive, hasVOD, chList, qualitiesList){
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

        function dummy() {
            return "dummy function"
        }
    }
}

module.exports = Module