const chList = ['pro-tv'];

const qualitiesList = [];

const ModuleClass = require('./moduleClass').default

const Module = new ModuleClass('pro', true, false, chList, qualitiesList)


module.exports = Module