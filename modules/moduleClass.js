class Module {
    
    constructor(MODULE_ID, hasLive, hasVOD, chList, qualitiesList){
        this.MODULE_ID = MODULE_ID;
        this.hasLive = hasLive;
        this.hasVOD = hasVOD;
        this.chList = chList;
        this.qualitiesList = qualitiesList;
    }
}

module.exports = Module