const chList = ['pro-tv'];

const qualitiesList = [];

const ModuleClass = require('./moduleClass')

const Properties = new ModuleClass('pro', true, false, chList, qualitiesList)

function liveChannels(id){
    return `${MODULE_ID}: here is your stream for ${id}`
}

// publish a topic asynchronously
// PubSub.publish('MY TOPIC', 'hello im test2');


module.exports = {Properties, liveChannels}