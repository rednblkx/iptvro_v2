import axios from 'axios';
import express, { Request, Response } from 'express';
import { PORT, body_response } from '../index.js';
import * as Loader from '../loader.js';
import { ModuleType } from '../moduleClass.js';

const Router = express.Router();

const debug = process.env.DEBUG?.toLowerCase();

interface TypedResponseBody extends Response {
    stream_data: {stream: string, proxy?: string};
    proxied: string & {stream: string, proxy?: string};
}
interface TypedRequestBody extends Request {
    module: string;
    params: { playlist: string, channel: string, player: string };
    valid_modules: string[];
}

/**
 * The function takes in three parameters, the first two are required and the third is optional
 * @param {string} id - This is the id of the function that is calling the logger.
 * @param {string} message - The message you want to log.
 * @param {boolean} [isError] - boolean - if true, the logger will return an Error object instead of a
 * string.
 * @returns a string or an error.
 */
 function logger(id: string, message: string, isError?: boolean): string | Error {
    if (debug === 'true') {
        console.log(`\x1b[47m\x1b[30mliveRoute\x1b[0m - \x1b[35m${id}\x1b[0m: ${message}`);
    }
    return isError ? new Error(`\x1b[47m\x1b[30mliveRoute\x1b[0m - \x1b[35m${id}\x1b[0m: ${message}`) : `\x1b[47m\x1b[30mliveRoute\x1b[0m - \x1b[35m${id}\x1b[0m: ${message}`
};
let getChannel = async (req: TypedRequestBody, res: TypedResponseBody, next: () => void) => {
    try {
        let stream = await Loader.searchChannel(req.params.channel, req.module, req.valid_modules);
        res.stream_data = stream.data;
        next();
    } catch (error) {
        let result = new body_response("ERROR", null, error.message || error)
        res.json(result);
    }
}

let checkm3u8 = async (req: TypedRequestBody, res: TypedResponseBody, next: () => void) => {
    try {
        if (req.params.playlist == "index.m3u8") {
            logger("live", `live stream requested for channel '${req.params.channel}' direct m3u8 playlist`);
            let data = await Loader.rewritePlaylist(res.stream_data);
            res.proxied = data;
            next();
        } else { next() }
    } catch (error) {
        let result = new body_response("ERROR", null, error.message || error)
        res.json(result);
    }
}

let checkPlayer = async (req: TypedRequestBody, res: TypedResponseBody, next: () => void) => {
    try {
        if (req.params.player == "player") { 
            logger("live", `live stream requested for channel '${req.params.channel}' with parameter player and proxy`);
            if(res.proxied.stream){
                let checkRedirect = await axios.get(res.proxied.stream);
                let redir = checkRedirect.request.res.responseUrl !== res.proxied.stream ? checkRedirect.request.res.responseUrl : res.proxied.stream;
                if (checkRedirect.request.res.responseUrl !== res.proxied.stream)
                    logger("live", `redirected to '${redir}' from '${res.proxied.stream}'`);
                res.render('player', { stream: `http://localhost:8080/${redir}`, proxy: res.proxied.proxy, origin: (new URL(redir)).hostname });
            }else {
                res.render('player', { stream: `http://localhost:${PORT}/live/${req.params.channel}/index.m3u8`, proxy: "" });
            }
        } else { next(); }
    } catch (error) {
        let result = new body_response("ERROR", null, error.message || error)
        res.json(result);
    }
}

let provideChannel = async (_req: any, res: TypedResponseBody) => {
    if (res.proxied && !res.proxied.stream) {
        res.set("Content-Type", "application/vnd.apple.mpegurl").send(res.proxied)
    } else {
        let result = res.stream_data;
        let response = new body_response("SUCCESS", result);
        res.json(response);
    }
}

let modulePlaylist = async (req: TypedRequestBody, res: TypedResponseBody, next: () => void) => {
    if(req.params.playlist != "index.m3u8"){
        try {
            logger("live", `live channels requested for module '${req.module}'`);
            /* Importing the module class from the module file. */
            let mod: ModuleType = new (await import(`../modules/${req.module}.js`)).default();
            let playlist = [];
            playlist.push(`#EXTM3U`);
            for(let channel in await mod.getChannels()){
                playlist.push(`#EXTINF:-1,${(channel.split("-")).map(a => a[0].toUpperCase() + a.substring(1)).join(" ")}`);
                playlist.push(`http://localhost:${PORT}/live/${channel}/index.m3u8`);
            }
            // playlist.push(`#EXT-X-ENDLIST`); 
            playlist.push("\n");
            res.set("Access-Control-Allow-Origin", "*");
            res.set("Content-Type", "application/x-mpegURL").send(playlist.join("\n"));
        } catch (error) {
            let result = new body_response("ERROR", null, error.message || error)
            res.json(result);
        }
    } else {
        next();
    }
}
Router.get("/:playlist(index.m3u8)", modulePlaylist)

Router.get("/:channel/:playlist(index.m3u8)?/:player(player)?", getChannel, checkm3u8, checkPlayer, provideChannel)


export default Router;