"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.login = exports.getVOD_EP = exports.getVOD = exports.getVODlist = exports.searchChannel = exports.sanityCheck = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var Realm = require("realm");
var CacheSchema = (function () {
    function CacheSchema() {
    }
    CacheSchema.schema = {
        name: "Cache",
        properties: {
            _id: "objectId",
            name: "string",
            link: "string",
            module: "string",
            lastupdated: "date"
        }
    };
    return CacheSchema;
}());
var instance = new Realm({
    path: "cache.realm",
    schema: [CacheSchema.schema]
});
function getConfig(module_id, key) {
    var file = (0, fs_1.existsSync)(__dirname + "/../modules/" + module_id + ".json") ? (0, fs_1.readFileSync)(__dirname + "/../modules/" + module_id + ".json").toString() : null;
    var parsed = file ? JSON.parse(file) : null;
    if (parsed === null) {
        throw "Config file is not valid";
    }
    else {
        return parsed.config[key];
    }
}
function sanityCheck() {
    instance.close();
    var files_list = (0, fs_1.readdirSync)(__dirname + "/../modules");
    var list = files_list.filter(function (a) { return (0, path_1.extname)(a) === ".js"; });
    var valid = [];
    console.log("Modules sanity check:\n");
    list.forEach(function (val) {
        try {
            var module_1 = require("../modules/" + val);
            if (module_1.MODULE_ID) {
                console.log(" - Module '" + module_1.MODULE_ID + "' is present");
                valid.push(module_1.MODULE_ID);
            }
            else
                throw "Module not valid";
        }
        catch (error) {
            var n = error.toString().indexOf('\n');
            console.error("sanityCheck | Something went wrong loading module " + val + " - " + error.toString().substring(0, n != -1 ? n : error.length));
        }
    });
    return valid;
}
exports.sanityCheck = sanityCheck;
function cacheFind(id, module_id) {
    try {
        instance = new Realm({
            path: "cache.realm",
            schema: [CacheSchema.schema]
        });
        var cache = instance.objects("Cache").filtered("name == '" + id + "' and module == '" + module_id + "'");
        var cachetime = getConfig(module_id, 'cachetime');
        if (cache[0]) {
            if ((((new Date()).getTime() - (new Date(cache[0].lastupdated)).getTime()) / (1000 * 3600)) <= cachetime ? cachetime : 6) {
                var found = cache[0].link;
                if (process.env.DEBUG == ('true' || true)) {
                    console.log("cacheFind | Cached link found for '" + id + "', module '" + module_id + "', lastudpated on '" + cache[0].lastupdated + "'");
                }
                instance.close();
                return found;
            }
            else
                return null;
        }
        else
            return null;
    }
    catch (error) {
        var n = error.toString().indexOf('\n');
        console.error("cacheFind | " + error.toString().substring(0, n != -1 ? n : error.length));
    }
}
function cacheFill(id, module_id, link) {
    try {
        instance = new Realm({
            path: "cache.realm",
            schema: [CacheSchema.schema]
        });
        var cache = instance.write(function () {
            var cache = instance.objects("Cache").filtered("name == '" + id + "' and module == '" + module_id + "'");
            instance["delete"](cache);
            instance.create("Cache", {
                _id: new Realm.BSON.ObjectID,
                name: id,
                link: link,
                module: module_id,
                lastupdated: new Date()
            });
        });
        instance.close();
        return cache;
    }
    catch (error) {
        var n = error.toString().indexOf('\n');
        console.error("cacheFill | " + error.toString().substring(0, n != -1 ? n : error.length));
    }
}
function searchChannel(id, module_id, valid_modules) {
    return __awaiter(this, void 0, void 0, function () {
        var tries, module_2, file, parsed, cache, link, error_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tries = 0;
                    if (!module_id) return [3, 13];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, , 12]);
                    module_2 = require("../modules/" + module_id);
                    if (!module_2.chList.includes(id)) return [3, 7];
                    file = (0, fs_1.existsSync)(__dirname + "/../modules/" + module_id + ".json") ? (0, fs_1.readFileSync)(__dirname + "/../modules/" + module_id + ".json").toString() : null;
                    parsed = file ? JSON.parse(file) : null;
                    cache = cacheFind(id, module_id);
                    if (!(cache !== null && getConfig(module_id, 'cache_enabled'))) return [3, 3];
                    return [4, Promise.resolve(cache)];
                case 2: return [2, _a.sent()];
                case 3: return [4, module_2.liveChannels(id, parsed ? parsed.auth.cookies : null, parsed ? parsed.auth.lastupdated : null)];
                case 4:
                    link = _a.sent();
                    cacheFill(id, module_id, link);
                    return [4, Promise.resolve(link)];
                case 5: return [2, _a.sent()];
                case 6: return [3, 9];
                case 7: return [4, Promise.reject("Module " + module_id + " doesn't have channel '" + id + "'")];
                case 8: return [2, _a.sent()];
                case 9: return [3, 12];
                case 10:
                    error_1 = _a.sent();
                    return [4, Promise.reject("searchChannel| Something went wrong with the module " + module_id + " - " + error_1.toString().substring(0, 200))];
                case 11: return [2, _a.sent()];
                case 12: return [3, 14];
                case 13: return [2, new Promise(function (resolve, reject) {
                        valid_modules.some(function (val) { return __awaiter(_this, void 0, void 0, function () {
                            var module_3, file, parsed;
                            return __generator(this, function (_a) {
                                try {
                                    module_3 = require(__dirname + "/../modules/" + val);
                                    if (module_3.chList.includes(id)) {
                                        file = (0, fs_1.existsSync)(__dirname + "/../modules/" + val + ".json") ? (0, fs_1.readFileSync)(__dirname + "/../modules/" + val + ".json").toString() : null;
                                        parsed = file ? JSON.parse(file) : null;
                                        resolve(module_3.liveChannels(id, parsed ? parsed.auth.cookies : null));
                                        return [2, true];
                                    }
                                    else
                                        tries++;
                                }
                                catch (error) {
                                    reject("searchChannel| Something went wrong with the module " + val + " - " + error.toString().substring(0, 200));
                                }
                                return [2];
                            });
                        }); });
                        if (tries === valid_modules.length) {
                            reject("searchChannel| No module has channel '" + id + "'");
                        }
                    })];
                case 14: return [2];
            }
        });
    });
}
exports.searchChannel = searchChannel;
function getVODlist(module_id) {
    return __awaiter(this, void 0, void 0, function () {
        var module_4, file, cookies, _a, _b, error_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!module_id) return [3, 10];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 7, , 9]);
                    module_4 = require(__dirname + "/../modules/" + module_id);
                    if (!module_4.hasVOD) return [3, 4];
                    file = (0, fs_1.readFileSync)(__dirname + "/../modules/" + module_id + ".json").toString();
                    cookies = JSON.parse(file);
                    _b = (_a = Promise).resolve;
                    return [4, module_4.getVOD_List(cookies.auth.cookies)];
                case 2: return [4, _b.apply(_a, [_c.sent()])];
                case 3: return [2, _c.sent()];
                case 4: return [4, Promise.reject("getVODlist| Module " + module_id + " doesn't have VOD available")];
                case 5: return [2, _c.sent()];
                case 6: return [3, 9];
                case 7:
                    error_2 = _c.sent();
                    return [4, Promise.reject("getVODlist| Something went wrong with the module " + module_id + " - " + error_2.toString().substring(0, 200))];
                case 8: return [2, _c.sent()];
                case 9: return [3, 12];
                case 10: return [4, Promise.reject("No module id provided")];
                case 11: return [2, _c.sent()];
                case 12: return [2];
            }
        });
    });
}
exports.getVODlist = getVODlist;
function getVOD(module_id, show_id, year, month) {
    return __awaiter(this, void 0, void 0, function () {
        var module_5, file, cookies, res, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!module_id) return [3, 10];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 9]);
                    module_5 = require(__dirname + "/../modules/" + module_id);
                    if (!module_5.hasVOD) return [3, 4];
                    file = (0, fs_1.readFileSync)(__dirname + "/../modules/" + module_id + ".json").toString();
                    cookies = JSON.parse(file);
                    return [4, module_5.getVOD(show_id, cookies.auth.cookies, year, month)];
                case 2:
                    res = _a.sent();
                    return [4, Promise.resolve(res)];
                case 3: return [2, _a.sent()];
                case 4: return [4, Promise.reject("getVOD| Module " + module_id + " doesn't have VOD available")];
                case 5: return [2, _a.sent()];
                case 6: return [3, 9];
                case 7:
                    error_3 = _a.sent();
                    return [4, Promise.reject("getVOD| Something went wrong with the module " + module_id + " - " + error_3.toString().substring(0, 200))];
                case 8: return [2, _a.sent()];
                case 9: return [3, 12];
                case 10: return [4, Promise.reject("No module id provided")];
                case 11: return [2, _a.sent()];
                case 12: return [2];
            }
        });
    });
}
exports.getVOD = getVOD;
function getVOD_EP(module_id, show_id, epid) {
    return __awaiter(this, void 0, void 0, function () {
        var module_6, file, cookies, cache, res, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!module_id) return [3, 13];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, , 12]);
                    module_6 = require(__dirname + "/../modules/" + module_id);
                    if (!module_6.hasVOD) return [3, 7];
                    file = (0, fs_1.readFileSync)(__dirname + "/../modules/" + module_id + ".json").toString();
                    cookies = JSON.parse(file);
                    cache = cacheFind(epid, module_id);
                    if (!(cache !== null && getConfig(module_id, "cache_enabled"))) return [3, 3];
                    return [4, Promise.resolve(cache)];
                case 2: return [2, _a.sent()];
                case 3: return [4, module_6.getVOD_EP(show_id, epid, cookies.auth.cookies)];
                case 4:
                    res = _a.sent();
                    cacheFill(epid, module_id, res);
                    return [4, Promise.resolve(res)];
                case 5: return [2, _a.sent()];
                case 6: return [3, 9];
                case 7: return [4, Promise.reject("getVOD_EP| Module " + module_id + " doesn't have VOD available")];
                case 8: return [2, _a.sent()];
                case 9: return [3, 12];
                case 10:
                    error_4 = _a.sent();
                    return [4, Promise.reject("getVOD_EP| Something went wrong with the module " + module_id + " - " + error_4.toString().substring(0, 200))];
                case 11: return [2, _a.sent()];
                case 12: return [3, 15];
                case 13: return [4, Promise.reject("No module id provided")];
                case 14: return [2, _a.sent()];
                case 15: return [2];
            }
        });
    });
}
exports.getVOD_EP = getVOD_EP;
function login(module_id, username, password) {
    return __awaiter(this, void 0, void 0, function () {
        var module_7, _a, _b, error_5;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 5, , 7]);
                    if (!(username !== ('' || null || undefined) && password !== ('' || null || undefined))) return [3, 3];
                    module_7 = require(__dirname + "/../modules/" + module_id);
                    _b = (_a = Promise).resolve;
                    return [4, module_7.login(username, password)];
                case 1: return [4, _b.apply(_a, [_c.sent()])];
                case 2: return [2, _c.sent()];
                case 3: throw "No Username/Password provided";
                case 4: return [3, 7];
                case 5:
                    error_5 = _c.sent();
                    return [4, Promise.reject("login| Something went wrong with the module " + module_id + " - " + error_5.toString().substring(0, 200))];
                case 6: return [2, _c.sent()];
                case 7: return [2];
            }
        });
    });
}
exports.login = login;
//# sourceMappingURL=loader.js.map