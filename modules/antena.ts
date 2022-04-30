import Class from '../src/moduleClass.js';

import axios from 'axios';
import {load as htmlload} from 'cheerio';

var Module = new Class('antena', true, true,)

type VOD_config = {
  authTokens: string[],
  year? : string,
  season? : string,
  month? : string,
  showfilters? : string,
}

Module.login = async function login(username: string, password: string): Promise<string[]> {
  try {

    Module.logger("login", "first step, getting login token")
    let tokens = await axios.get("https://antenaplay.ro/intra-in-cont", {
      headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Origin': 'https://antenaplay.ro',
          referer: "https://antenaplay.ro",
          'user-agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36",
      },
      transformResponse: [
        (data) => {
          return (htmlload(data))("input[name=_token]").val()
        }
      ]
    });

    if(tokens.data){
      Module.logger("login", "got login token, trying login")
    } else return Promise.reject(Module.logger("login", "login failed, could not retrieve login token", true))

    const login = await axios.post(
          'https://antenaplay.ro/intra-in-cont', 
      `email=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&_token=${tokens.data}`, 
      {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://antenaplay.ro',
        referer: "https://antenaplay.ro/intra-in-cont",
        cookie: tokens.headers["set-cookie"].map((a) => a.match(/[^;]*/)[0]).join(";"),
        'user-agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36",
      },
      maxRedirects: 0,
      validateStatus: (status) => status === 302,
    })

    if(login.headers.location === login.config.url){
      return Promise.reject(Module.logger("login", "login failed, Username/Password invalid", true))
    }else Module.logger("login", "login success, getting required authTokens")

    let live = await axios.get("https://antenaplay.ro/live/antena1", {
      headers: {
          Referer: "https://antenaplay.ro/live",
          Cookie: login.headers["set-cookie"].map((a) => a.match(/[^;]*/)[0]).join(";"),
          'User-Agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36"
      },
    });

    var authTokens = live.headers["set-cookie"].map((a) => a.match(/[^;]*/)[0])
    if (authTokens.some((a) => a.match(/[^=]*/)[0].includes("device"))) {
        Module.logger("login", "authTokens found")
        return await Promise.resolve(authTokens);
      } else {
        return await Promise.reject(new Error('Something went wrong'));
      }
    } catch (error) {
      return Promise.reject(Module.logger("login", error.message || error.toString().substring(0, error.findIndex("\n")), true));
    }
}

Module.liveChannels = async function liveChannels(channel: string, authTokens: string[], lastupdated: string) : Promise<string> {
  try {
    if(!authTokens || typeof authTokens !== 'object'){
      //get config
      var config = Module.getAuth();
      //get authTokens
      authTokens = await Module.login(config.username, config.password);
      //set authTokens
      Module.setAuth({username: config.username, password: config.password, authTokens: authTokens, lastupdated: new Date()});
    }
    Module.logger("liveChannels", "Acquiring HTML")
    let html = await axios.get(`https://antenaplay.ro/live/${channel}`, {
      headers: {
        cookie: authTokens.join("; "),
      },
      withCredentials: true,
      // referrer: "https://antenaplay.ro/seriale",
    });

    if((((new Date()).getTime() - (new Date(lastupdated)).getTime()) / (1000 * 3600)) >= 6){
      let newCookies = html.headers['set-cookie']
      let config = Module.getAuth();
      // let parsed = JSON.parse(config);
      config.authTokens[config.authTokens.findIndex(el => el.includes('XSRF-TOKEN'))] = newCookies[newCookies.findIndex(el => el.includes('XSRF-TOKEN'))];
      config.authTokens[config.authTokens.findIndex(el => el.includes('laravel_session'))] = newCookies[newCookies.findIndex(el => el.includes('laravel_session'))];
      config.lastupdated = new Date();
      //set authTokens
      Module.setAuth(config);
      Module.logger("liveChannels", "Cookies updated")
    }
    let $ = htmlload(html.data);
    if($){
      var link = $(".video-container script")
      .html()
      .match("streamURL: (.*)")[1]
      .replace('",', '"')
      .match('"(.*)"')[1]
      Module.logger("liveChannels", `got stream URL - ${link}`)
      return await Promise.resolve(link)
    }else return await Promise.reject(new Error('Something went wrong'));
    } catch (error) {
      return await Promise.reject(Module.logger("liveChannels", error.message || error.toString().substring(0, 200), true));
  }
}

Module.getChannels = async function getChannels(): Promise<string[]>{
  try {
    //axios get request to url https://antenaplay.ro/live
    var live = await axios.get('https://antenaplay.ro/live');
  
    //axios get response
    var $ = htmlload(live.data);
    //get section with class live-channels-listing and class item
    var channels = $('.live-channels-listing .item');
    //create array
    var channelList = [];
    //loop trough channels
    channels.each(function(i, elem) {
        //get channel href 
        var channel = $(this).attr('href');
        //cut "/live/" from channel href
        channel = channel.substring(6);
        //push channel to channelList
        channelList.push(channel);
    });
    //return channelList
    return channelList;
  } catch (error) {
    return Promise.reject(Module.logger("getChannels", error.message || error.toString().substring(0, 200), true));
  }
}

Module.getVOD_List = async function getVOD_List(authTokens: string[]): Promise<object[]> {
  try {
    if(!authTokens || typeof authTokens !== 'object'){
      // throw new Error(`Cookies Missing/Invalid`)
      //get config
      var config = Module.getAuth();
      //get authTokens
      authTokens = await Module.login(config.username, config.password);
      //set authTokens
      Module.setAuth({username: config.username, password: config.password, authTokens: authTokens, lastupdated: new Date()});
    }
    Module.logger("getVOD_List", "Acquiring HTML")
    let html = await axios.get(`https://antenaplay.ro/seriale`, {
      headers: {
        cookie: authTokens.join("; "),
      },
      // referrer: `https://antenaplay.ro/`,
    });
    let $ = htmlload(await html.data);
    let $$ = htmlload(
      $($(".slider-container")[$(".slider-container").length - 1]).html()
    );
    let shows = [];
    $$($$("a").each(function loop_vod_list(i, el) {
      Module.logger("loop_vod_list", `Appending show ${$$(el).children("h5").text()}`)
      Module.logger("loop_vod_list", `Appending show link ${'/show' + $$(el).attr("href")}`)
      Module.logger("loop_vod_list", `Appending show img ${$$(el).children('.container').children("img").attr('src')}`)
      shows.push({
        name: $$(el).children("h5").text(),
        link: '/' + Module.MODULE_ID + '/vod' + $$(el).attr("href"),
        img: $$(el).children('.container').children("img").attr('src')
      })
    }));
    return shows.length !== 0 ? await Promise.resolve(shows) : await Promise.reject(new Error("List is empty"));
  } catch (error) {
    return await Promise.reject(Module.logger("getVOD_List", error.message || error.toString().substring(0, 200), true));
  }
}

Module.getVOD = async function getVOD(show: string, config: VOD_config): Promise<object[] | object> {
  try {
    if(!config.authTokens || typeof config.authTokens !== 'object'){
      // throw `Cookies Missing/Invalid`
      //get auth
      var auth = Module.getAuth();
      //get authTokens
      config.authTokens = await Module.login(auth.username, auth.password);
      //set authTokens
      Module.setAuth({username: auth.username, password: auth.password, authTokens: config.authTokens, lastupdated: new Date()});
    }
    Module.logger("getVOD", "Acquiring HTML");
    let html = await axios.get(`https://antenaplay.ro/${show}`, {
      headers: {
        cookie: config.authTokens.join("; "),
      },
      // referrer: `https://antenaplay.ro/seriale`,
      maxRedirects: 0
    });
    let $ = htmlload(await html.data);
    if(!$(".selector-sezoane").length){
      var episodes = [];
      $(".slider-wrapper a").each(function loop_ep_list(i, el) {
        Module.logger("loop_ep_list", `Appending episode ${$(el).children("h5").text()}`)
        Module.logger("loop_ep_list", `Appending episode link ${$(el).attr("href")}`)
        Module.logger("loop_ep_list", `Appending episode img ${$(el).children(".container").children("img").attr('src')}`)
        episodes.push({
          name: $(el).children("h5").text(),
          link: $(el).attr("href"),
          img: $(el).children(".container").children("img").attr('src')
        })
      })
      return await Promise.resolve(episodes);
    }
    if(config.showfilters){
      let list = {};
      if($("#js-selector-year").length){
        list["type"] = "calendar"
        if($("#js-selector-year option:not([disabled])").length > 0){
          $("#js-selector-year option:not([disabled])").each(function loop_months(i, el) {
            Module.logger("loop_months", `Available month(s) of year ${$(el).attr('value')}: ${($(el).attr('data-months')).split(";")}`)
            $(el).attr('value') && (list[$(el).attr('value')] = ($(el).attr('data-months')).split(";"))
          })
        }else list[$("#js-selector-year option:not([disabled])").attr('value')] = ($("#js-selector-year option:not([disabled])").attr('data-months')).split(";")
      }else if($("#js-selector-season option").length){
        list["type"] = "seasons"
        $("#js-selector-season option").each(function loop_seasons(i, el) {
          Module.logger("loop_seasons", `Available season: ${$(el).text()}`)
          $(el).attr('value') && (list[$(el).attr('value')] = $(el).text())
        })
      }
      return await Promise.resolve(list);
    }else if($){
      if(config.season){
        return await Promise.resolve(Module.getVOD_EP_List(
          "https://antenaplay.ro" +
          $("button.js-selector").attr("data-url"), {authTokens: config.authTokens, year: null, month: null, season: config.season}
        ))
      }else if(config.year && config.month){
        return await Module.getVOD_EP_List(
          "https://antenaplay.ro" +
          $("button.js-selector").attr("data-url"), {authTokens: config.authTokens, year: config.year, month: config.month, season: null}
        )
      }else 
        return await Module.getVOD_EP_List(
          "https://antenaplay.ro" +
          $("button.js-selector").attr("data-url"), {authTokens: config.authTokens, year: null, month: null, season: $(".buton-adauga").attr("data-id")}
        )
    }
    else return await Promise.reject(new Error('Something went wrong'))
  } catch (error) {
    return await Promise.reject(Module.logger("getVOD", error.message || error.toString().substring(0, 200), true));
  }
}

Module.getVOD_EP_List = async function getVOD_EP_List(
  url: string,config: VOD_config
): Promise<object[]> {
  try {
    if(!config.authTokens || typeof config.authTokens !== 'object'){
      // throw `Cookies Missing/Invalid`
      //get config
      var auth = Module.getAuth();
      //get authTokens
      config.authTokens = await Module.login(auth.username, auth.password);
      //set authTokens
      Module.setAuth({username: auth.username, password: auth.password, authTokens: config.authTokens, lastupdated: new Date()});
    }
    Module.logger("getVOD_EP_List", `Getting Episodes List for ${config.year && config.month ? "year " + config.year + " and month " + config.month : config.season ? "season id" + config.season : 'latest'}`);
    let response = await axios.get(`${url}${config.year && config.month ? '&year=' + config.year + '&month=' + config.month : config.season ? `?show=${config.season}` : ""}`, {
      headers: {
        "x-newrelic-id": "VwMCV1VVGwEEXFdQDwIBVQ==",
        "x-requested-with": "XMLHttpRequest",
        cookie: config.authTokens.join("; "),
      },
      withCredentials: true, 
      // referrer: "https://antenaplay.ro/"
    });
    var $ = htmlload(response.data.view);
    let shows = [];
    $("a").each((i, url) => {
      $(url).prepend($($(url).children('.container').children('img')).attr("width", "200px")) 
      $(url).attr("href", `/${Module.MODULE_ID}/vod` + $(url).attr("href"));
      shows.push({"name": $(url).children("h5").text(), "link": $(url).attr("href"), "img": $(url).children("img").attr("src")});
    });
    $(".container").each((i, el) => {$(el).remove()});
    Module.logger("getVOD_EP_List", `Total episodes ${shows.length}`)
    return shows.length > 0 ? await Promise.resolve(shows) : await Promise.reject(new Error("Nothing in the list"));
  } catch (error) {
    return Promise.reject(Module.logger("getVOD_EP_List", error.message || error.toString().substring(0, 200), true));
  }
}

Module.getVOD_EP = async function getVOD_EP(show: string, epid: string, authTokens: string[]): Promise<string> {
  try {
    if(!show || !epid){
      throw `Params Missing`
    }
    if(!authTokens || typeof authTokens !== 'object'){
      // throw `Cookies Missing/Invalid`
      //get config
      var config = Module.getAuth();
      //get authTokens
      authTokens = await Module.login(config.username, config.password);
      //set authTokens
      Module.setAuth({username: config.username, password: config.password, authTokens: authTokens, lastupdated: new Date()});
    }
    Module.logger("getVOD_EP", "Acquiring HTML")
    let response = await axios.get(
      `https://antenaplay.ro/${show}/${epid}`,
      {
        headers: {
          "x-newrelic-id": "VwMCV1VVGwEEXFdQDwIBVQ==",
          "x-requested-with": "XMLHttpRequest",
          cookie: authTokens.join("; "),
        },
        // referrer: "https://antenaplay.ro/",
      }
    );
    Module.logger("getVOD_EP", "Acquiring Episode's URL")
    let link = await axios
      .get(
        "https:" +
        htmlload(response.data)(".video-container script")
            .html()
            .match("var playerSrc = '(.*)'")[1] +
          "no",
        {
          headers: {
            referer: "https://antenaplay.ro/",
          },
        }
      );
      Module.logger("getVOD_EP", `GOT IT - ${link.data.match('ivmSourceFile.src = "(.*)";')[1]}`)
      return await Promise.resolve(link.data.match('ivmSourceFile.src = "(.*)";')[1])
  } catch (error) {
    return await Promise.reject(Module.logger("getVOD_EP", error.message || error.toString().substring(0, 200), true));
  }
}

export default Module;