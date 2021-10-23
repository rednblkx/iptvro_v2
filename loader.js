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
var modules = ["antena", "pro"];
function sanityCheck() {
    var valid = [];
    console.log("Modules sanity check:\n");
    modules.forEach(function (val) {
        try {
            var module_1 = require("./modules/" + val);
            console.log(" - Module '" + module_1.MODULE_ID + "' is present");
            valid.push(val);
        }
        catch (error) {
            var n = error.toString().indexOf('\n');
            console.error("Loader| Something went wrong loading module " + val + " - " + error.toString().substring(0, n != -1 ? n : error.length));
        }
    });
    return valid;
}
function searchChannel(id, module_id, valid_modules) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                    var tries, module_2, file, parsed, _a, error_1;
                    var _this = this;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                tries = 0;
                                if (!module_id) return [3, 7];
                                _b.label = 1;
                            case 1:
                                _b.trys.push([1, 5, , 6]);
                                module_2 = require("./modules/" + module_id);
                                if (!module_2.chList.includes(id)) return [3, 3];
                                file = require('fs').existsSync("./modules/" + module_id + ".json") ? require('fs').readFileSync("./modules/" + module_id + ".json").toString() : null;
                                parsed = file ? JSON.parse(file) : null;
                                _a = resolve;
                                return [4, module_2.liveChannels(id, parsed ? parsed.auth.cookies : null, parsed ? parsed.auth.lastupdated : null)];
                            case 2:
                                _a.apply(void 0, [_b.sent()]);
                                return [3, 4];
                            case 3:
                                reject("Loader| Module " + module_id + " doesn't have channel '" + id + "'");
                                _b.label = 4;
                            case 4: return [3, 6];
                            case 5:
                                error_1 = _b.sent();
                                reject("Loader| Something went wrong with the module " + module_id + " - " + error_1.toString().substring(0, 200));
                                return [3, 6];
                            case 6: return [3, 8];
                            case 7:
                                valid_modules.forEach(function (val) { return __awaiter(_this, void 0, void 0, function () {
                                    var module_3, file, parsed, _a, error_2;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                _b.trys.push([0, 4, , 5]);
                                                module_3 = require("./modules/" + val);
                                                if (!module_3.chList.includes(id)) return [3, 2];
                                                file = require('fs').existsSync("./modules/" + val + ".json") ? require('fs').readFileSync("./modules/" + val + ".json").toString() : null;
                                                parsed = file ? JSON.parse(file) : null;
                                                _a = resolve;
                                                return [4, module_3.liveChannels(id, parsed ? parsed.auth.cookies : null)];
                                            case 1:
                                                _a.apply(void 0, [_b.sent()]);
                                                return [3, 3];
                                            case 2:
                                                tries++;
                                                _b.label = 3;
                                            case 3: return [3, 5];
                                            case 4:
                                                error_2 = _b.sent();
                                                reject("Loader| Something went wrong with the module " + val + " - " + error_2.toString().substring(0, 200));
                                                return [3, 5];
                                            case 5: return [2];
                                        }
                                    });
                                }); });
                                if (tries === valid_modules.length) {
                                    reject("Loader| No module has channel '" + id + "'");
                                }
                                _b.label = 8;
                            case 8: return [2];
                        }
                    });
                }); })];
        });
    });
}
function getVODlist(module_id) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                    var module_4, file, cookies, _a, error_3;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                if (!module_id) return [3, 7];
                                _b.label = 1;
                            case 1:
                                _b.trys.push([1, 5, , 6]);
                                module_4 = require("./modules/" + module_id);
                                if (!module_4.hasVOD) return [3, 3];
                                file = require('fs').readFileSync("./modules/" + module_id + ".json").toString();
                                cookies = JSON.parse(file);
                                _a = resolve;
                                return [4, module_4.getVOD_List(cookies.auth.cookies)];
                            case 2:
                                _a.apply(void 0, [_b.sent()]);
                                return [3, 4];
                            case 3:
                                reject("Loader| Module " + module_id + " doesn't have VOD available");
                                _b.label = 4;
                            case 4: return [3, 6];
                            case 5:
                                error_3 = _b.sent();
                                reject("Loader| Something went wrong with the module " + module_id + " - " + error_3.toString().substring(0, 200));
                                return [3, 6];
                            case 6: return [3, 8];
                            case 7:
                                reject("No module id provided");
                                _b.label = 8;
                            case 8: return [2];
                        }
                    });
                }); })];
        });
    });
}
function getVOD(module_id, show_id, year, month) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                    var module_5, file, cookies, res, error_4;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!module_id) return [3, 7];
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 5, , 6]);
                                module_5 = require("./modules/" + module_id);
                                if (!module_5.hasVOD) return [3, 3];
                                file = require('fs').readFileSync("./modules/" + module_id + ".json").toString();
                                cookies = JSON.parse(file);
                                return [4, module_5.getVOD(show_id, cookies.auth.cookies, year, month)];
                            case 2:
                                res = _a.sent();
                                resolve(res);
                                return [3, 4];
                            case 3:
                                reject("Loader| Module " + module_id + " doesn't have VOD available");
                                _a.label = 4;
                            case 4: return [3, 6];
                            case 5:
                                error_4 = _a.sent();
                                reject("Loader| Something went wrong with the module " + module_id + " - " + error_4.toString().substring(0, 200));
                                return [3, 6];
                            case 6: return [3, 8];
                            case 7:
                                reject("No module id provided");
                                _a.label = 8;
                            case 8: return [2];
                        }
                    });
                }); })];
        });
    });
}
function getVOD_EP(module_id, show_id, epid) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                    var module_6, file, cookies, res, error_5;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!module_id) return [3, 7];
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 5, , 6]);
                                module_6 = require("./modules/" + module_id);
                                if (!module_6.hasVOD) return [3, 3];
                                file = require('fs').readFileSync("./modules/" + module_id + ".json").toString();
                                cookies = JSON.parse(file);
                                return [4, module_6.getVOD_EP(show_id, epid, cookies.auth.cookies)];
                            case 2:
                                res = _a.sent();
                                resolve(res);
                                return [3, 4];
                            case 3:
                                reject("Loader| Module " + module_id + " doesn't have VOD available");
                                _a.label = 4;
                            case 4: return [3, 6];
                            case 5:
                                error_5 = _a.sent();
                                reject("Loader| Something went wrong with the module " + module_id + " - " + error_5.toString().substring(0, 200));
                                return [3, 6];
                            case 6: return [3, 8];
                            case 7:
                                reject("No module id provided");
                                _a.label = 8;
                            case 8: return [2];
                        }
                    });
                }); })];
        });
    });
}
function login(module_id, username, password) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                    var module_7, _a, error_6;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _b.trys.push([0, 2, , 3]);
                                module_7 = require("./modules/" + module_id);
                                _a = resolve;
                                return [4, module_7.login(username, password)];
                            case 1:
                                _a.apply(void 0, [_b.sent()]);
                                return [3, 3];
                            case 2:
                                error_6 = _b.sent();
                                reject("Loader| Something went wrong with the module " + module_id + " - " + error_6.toString().substring(0, 200));
                                return [3, 3];
                            case 3: return [2];
                        }
                    });
                }); })];
        });
    });
}
module.exports = { modules: modules, sanityCheck: sanityCheck, searchChannel: searchChannel, login: login, getVODlist: getVODlist, getVOD: getVOD, getVOD_EP: getVOD_EP };
//# sourceMappingURL=loader.js.map