import ModuleClass, {ModuleType} from '../moduleClass.js';

import axios from 'axios';
import {load as htmlload} from 'cheerio';

// var Module = new Class('antena', true, true,)

/**
 * `VOD_config` is an object with a required property `authTokens` which is an array of strings, and
 * optional properties `year`, `season`, `month`, and `showfilters` which are all strings.
 * @property {string[]} authTokens - An array of strings that are the auth tokens for the VODs you want
 * to download.
 * @property {string} year - The year you want to get the VODs from.
 * @property {string} season - The season number you want to get the episodes for.
 * @property {string} month - The month of the year you want to get the VODs for.
 * @property {string} showfilters - This is a string that is used to filter the shows that are
 * returned.
 */
type VOD_config = {
  authTokens: string[],
  year? : string,
  season? : string,
  month? : string,
  showfilters? : string,
}

class ModuleInstance extends ModuleClass {
  constructor(){
    /* Creating a new instance of the class Antena. */
    super('antena', true, true);
  }
  /**
   * It logs in to the antenaplay.ro website and returns the authTokens required to access the live
   * stream.
   * @param {string} username - string - Your AntenaPlay account username
   * @param {string} password - string - Your AntenaPlay account password
   * @returns The authTokens
   */
  async login(username: string, password: string): Promise<string[]> {
    try {
      this.logger("login", "first step, getting login token")
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
        this.logger("login", "got login token, trying login")
      } else return Promise.reject(this.logger("login", "login failed, could not retrieve login token", true))
  
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
        return Promise.reject(this.logger("login", "login failed, Username/Password invalid", true))
      }else this.logger("login", "login success, getting required authTokens")
  
      let live = await axios.get("https://antenaplay.ro/live/antena1", {
        headers: {
            Referer: "https://antenaplay.ro/live",
            Cookie: login.headers["set-cookie"].map((a) => a.match(/[^;]*/)[0]).join(";"),
            'User-Agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36"
        },
      });
  
      var authTokens = live.headers["set-cookie"].map((a) => a.match(/[^;]*/)[0])
      if (authTokens.some((a) => a.match(/[^=]*/)[0].includes("device"))) {
          this.logger("login", "authTokens found")
          return await Promise.resolve(authTokens);
        } else {
          return await Promise.reject(new Error('Something went wrong'));
        }
      } catch (error) {
        return Promise.reject(this.logger("login", error.message || error.toString().substring(0, error.findIndex("\n")), true));
      }
  }
  /**
   * It gets the HTML of the live channel, checks if the cookies are older than 6 hours, if they are,
   * it updates them, then it gets the stream URL from the HTML and returns it
   * @param {string} channel - the channel name, for example: antena1
   * @param {string[]} authTokens - the authTokens you get from the login function
   * @param {string} lastupdated - the last time the cookies were updated
   * @returns The stream URL
   */
  async liveChannels(channel: string, authTokens: string[], lastupdated: string) : Promise<{stream: string, proxy?: string}> {
    try {
    if(!authTokens || typeof authTokens !== 'object'){
      //get config
      var config = await this.getAuth();
      //get authTokens
      authTokens = await this.login(config.username, config.password);
      //set authTokens
      this.setAuth({username: config.username, password: config.password, authTokens: authTokens, lastupdated: new Date()});
    }
    this.logger("liveChannels", "Acquiring HTML")
    let html = await axios.get(`https://antenaplay.ro/live/${channel}`, {
      headers: {
        cookie: authTokens.join("; "),
      },
      withCredentials: true,
      // referrer: "https://antenaplay.ro/seriale",
    });

    if((((new Date()).getTime() - (new Date(lastupdated)).getTime()) / (1000 * 3600)) >= 6){
      let newCookies = html.headers['set-cookie']
      let config = await this.getAuth();
      // let parsed = JSON.parse(config);
      config.authTokens[config.authTokens.findIndex(el => el.includes('XSRF-TOKEN'))] = newCookies[newCookies.findIndex(el => el.includes('XSRF-TOKEN'))];
      config.authTokens[config.authTokens.findIndex(el => el.includes('laravel_session'))] = newCookies[newCookies.findIndex(el => el.includes('laravel_session'))];
      config.lastupdated = new Date();
      //set authTokens
      this.setAuth(config);
      this.logger("liveChannels", "Cookies updated")
    }
    let $ = htmlload(html.data);
    if($){
      var stream = $(".video-container script")
      .html()
      .match("streamURL: (.*)")[1]
      .replace('",', '"')
      .match('"(.*)"')[1]
      this.logger("liveChannels", `got stream URL - ${stream}`)      
      var proxy = $(".video-container script")
      .html()
      .match("proxyURL: (.*)")[1]
      .replace('",', '"')
      .match('"(.*)"')[1]
      this.logger("liveChannels", `got proxy URL - ${proxy}`)
      return await Promise.resolve({stream, proxy})
    }else return await Promise.reject(new Error('Something went wrong'));
    } catch (error) {
      return await Promise.reject(this.logger("liveChannels", error.message || error.toString().substring(0, 200), true));
    }
  }
  /**
   * It gets the channels from antenaplay.ro/live
   * @returns An object with all the channels
   */
  async getChannels(): Promise<object>{
    try {
      //axios get request to url https://antenaplay.ro/live
      var live = await axios.get('https://antenaplay.ro/live');
    
      //axios get response
      var $ = htmlload(live.data);
      //get section with class live-channels-listing and class item
      var channels = $('.live-channels-listing .item');
      //create array
      var channelList = {};
      //loop trough channels
      channels.each(function(i, elem) {
          //get channel href 
          var channel = $(this).attr('href');
          //cut "/live/" from channel href
          channel = channel.substring(6);
          //push channel to channelList
          // channelList.push(channel);
          channelList[channel] = channel;
      });
      return channelList;
    } catch (error) {
      return Promise.reject(this.logger("getChannels", error.message || error.toString().substring(0, 200), true));
    }
  }
  /**
   * It gets the list of shows from the website.
   * @param {string[]} authTokens - string[] - The authTokens that are used to authenticate the user.
   * @returns An array of objects containing the name, link and img of the shows
   */
  async getVOD_List(authTokens: string[]): Promise<object[]> {
    try {
      if(!authTokens || typeof authTokens !== 'object'){
        // throw new Error(`Cookies Missing/Invalid`)
        //get config
        var config = await this.getAuth();
        //get authTokens
        authTokens = await this.login(config.username, config.password);
        //set authTokens
        this.setAuth({username: config.username, password: config.password, authTokens: authTokens, lastupdated: new Date()});
      }
      this.logger("getVOD_List", "Acquiring HTML")
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
      $$($$("a").each((i, el) => {
        this.logger("loop_vod_list", `Appending show ${$$(el).children("h5").text()}`)
        this.logger("loop_vod_list", `Appending show link ${'/show' + $$(el).attr("href")}`)
        this.logger("loop_vod_list", `Appending show img ${$$(el).children('.container').children("img").attr('src')}`)
        shows.push({
          name: $$(el).children("h5").text(),
          link: '/' + this.MODULE_ID + '/vod' + $$(el).attr("href"),
          img: $$(el).children('.container').children("img").attr('src')
        })
      }));
      return shows.length !== 0 ? await Promise.resolve(shows) : await Promise.reject(new Error("List is empty"));
    } catch (error) {
      return await Promise.reject(this.logger("getVOD_List", error.message || error.toString().substring(0, 200), true));
    }
  }
  /**
   * It gets the VOD list of a show.
   * @param {string} show - The show you want to get the VOD from.
   * @param {VOD_config} config - {
   * @returns An array of objects containing the name, link and image of the episodes.
   */
  async getVOD(show: string, config: VOD_config): Promise<object[] | object> {
    try {
      if(!config.authTokens || typeof config.authTokens !== 'object'){
        // throw `Cookies Missing/Invalid`
        //get auth
        var auth = await this.getAuth();
        //get authTokens
        config.authTokens = await this.login(auth.username, auth.password);
        //set authTokens
        this.setAuth({username: auth.username, password: auth.password, authTokens: config.authTokens, lastupdated: new Date()});
      }
      this.logger("getVOD", "Acquiring HTML");
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
        $(".slider-wrapper a").each((i, el) => {
          this.logger("loop_ep_list", `Appending episode ${$(el).children("h5").text()}`)
          this.logger("loop_ep_list", `Appending episode link ${$(el).attr("href")}`)
          this.logger("loop_ep_list", `Appending episode img ${$(el).children(".container").children("img").attr('src')}`)
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
            $("#js-selector-year option:not([disabled])").each((i, el) => {
              this.logger("loop_months", `Available month(s) of year ${$(el).attr('value')}: ${($(el).attr('data-months')).split(";")}`)
              $(el).attr('value') && (list[$(el).attr('value')] = ($(el).attr('data-months')).split(";"))
            })
          }else list[$("#js-selector-year option:not([disabled])").attr('value')] = ($("#js-selector-year option:not([disabled])").attr('data-months')).split(";")
        }else if($("#js-selector-season option").length){
          list["type"] = "seasons"
          $("#js-selector-season option").each((i, el) => {
            this.logger("loop_seasons", `Available season: ${$(el).text()}`)
            $(el).attr('value') && (list[$(el).attr('value')] = $(el).text())
          })
        }
        return await Promise.resolve(list);
      }else if($){
        if(config.season){
          return await Promise.resolve(this.getVOD_EP_List(
            "https://antenaplay.ro" +
            $("button.js-selector").attr("data-url"), {authTokens: config.authTokens, year: null, month: null, season: config.season}
          ))
        }else if(config.year && config.month){
          return await this.getVOD_EP_List(
            "https://antenaplay.ro" +
            $("button.js-selector").attr("data-url"), {authTokens: config.authTokens, year: config.year, month: config.month, season: null}
          )
        }else 
          return await this.getVOD_EP_List(
            "https://antenaplay.ro" +
            $("button.js-selector").attr("data-url"), {authTokens: config.authTokens, year: null, month: null, season: $(".buton-adauga").attr("data-id")}
          )
      }
      else return await Promise.reject(new Error('Something went wrong'))
    } catch (error) {
      return await Promise.reject(this.logger("getVOD", error.message || error.toString().substring(0, 200), true));
    }
  }
  /**
   * It gets the list of episodes for a given show.
   * @param {string} url - the url to the page you want to scrape
   * @param {VOD_config} config - {
   * @returns An array of objects containing the name, link and image of the episodes.
   */
  async getVOD_EP_List(url: string,config: VOD_config): Promise<object[]> {
    try {
      if(!config.authTokens || typeof config.authTokens !== 'object'){
        // throw `Cookies Missing/Invalid`
        //get config
        var auth = await this.getAuth();
        //get authTokens
        config.authTokens = await this.login(auth.username, auth.password);
        //set authTokens
        this.setAuth({username: auth.username, password: auth.password, authTokens: config.authTokens, lastupdated: new Date()});
      }
      this.logger("getVOD_EP_List", `Getting Episodes List for ${config.year && config.month ? "year " + config.year + " and month " + config.month : config.season ? "season id " + config.season : 'latest'}`);
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
        $(url).attr("href", `/${this.MODULE_ID}/vod` + $(url).attr("href"));
        shows.push({"name": $(url).children("h5").text(), "link": $(url).attr("href"), "img": $(url).children("img").attr("src")});
      });
      $(".container").each((i, el) => {$(el).remove()});
      this.logger("getVOD_EP_List", `Total episodes ${shows.length}`)
      return shows.length > 0 ? await Promise.resolve(shows) : await Promise.reject(new Error("Nothing in the list"));
    } catch (error) {
      return Promise.reject(this.logger("getVOD_EP_List", error.message || error.toString().substring(0, 200), true));
    }
  }
  /**
   * It gets the video URL for a specific episode of a show.
   * @param {string} show - The show's name, as it appears in the URL.
   * @param {string} epid - The episode's ID.
   * @param {string[]} authTokens - The authTokens are the cookies that you get after logging in.
   * @returns The URL of the video
   */
  async getVOD_EP(show: string, epid: string, authTokens: string[]): Promise<string> {
    try {
      if(!show || !epid){
        throw `Params Missing`
      }
      if(!authTokens || typeof authTokens !== 'object'){
        // throw `Cookies Missing/Invalid`
        //get config
        var config = await this.getAuth();
        //get authTokens
        authTokens = await this.login(config.username, config.password);
        //set authTokens
        this.setAuth({username: config.username, password: config.password, authTokens: authTokens, lastupdated: new Date()});
      }
      this.logger("getVOD_EP", "Acquiring HTML")
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
      this.logger("getVOD_EP", "Acquiring Episode's URL")
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
        this.logger("getVOD_EP", `GOT IT - ${link.data.match('ivmSourceFile.src = "(.*)";')[1]}`)
        return await Promise.resolve(link.data.match('ivmSourceFile.src = "(.*)";')[1])
    } catch (error) {
      return await Promise.reject(this.logger("getVOD_EP", error.message || error.toString().substring(0, 200), true));
    }
  }
}

/* Exporting the ModuleInstance class. */
export default ModuleInstance;