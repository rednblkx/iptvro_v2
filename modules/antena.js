const chList = [
    "antena1",
    "happy-channel",
    "zu-tv",
    "antena-stars",
    "antena3",
    "mireasa",
    "antena-international",
    "comedy-play",
    "antena-monden",
    "cookplay"
];

const qualitiesList = []

const Class = require('../src/moduleClass').default;

let fs = require('fs');

var Module = new Class('antena', true, true, chList, qualitiesList)

const debug = process.env.DEBUG;

var axios = require('axios');
var cheerio = require('cheerio')

function logger(message){
  if(debug){
    console.log(`${Module.MODULE_ID} - ${logger.caller.name}: ${message}`);
  }
  return `${Module.MODULE_ID} - ${logger.caller.name}: ${message}`
};

Module.login = async function login(username, password) {
  try {
    let tokens = await axios.get("https://antenaplay.ro/intra-in-cont", {
      headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Origin': 'https://antenaplay.ro',
          referer: "https://antenaplay.ro",
          'user-agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36",
      },
    });
    let $ = cheerio.load(tokens.data);
      const login = await axios.post(
          'https://antenaplay.ro/intra-in-cont', 
      `email=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&_token=${$("input[name=_token]").val()}`, 
      {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Origin': 'https://antenaplay.ro',
        referer: "https://antenaplay.ro/intra-in-cont",
        cookie: tokens.headers["set-cookie"].map((a) => a.match(/[^;]*/)[0]).join(";"),
        'user-agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36",
      },
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    })
    let live = await axios.get("https://antenaplay.ro/live/antena1", {
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Origin': 'https://antenaplay.ro',
          referer: "https://antenaplay.ro",
          cookie: login.headers["set-cookie"].map((a) => a.match(/[^;]*/)[0]).join(";"),
          'user-agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36"
      },
    });
    var cookies = live.headers["set-cookie"].map((a) => a.match(/[^;]*/)[0])
    if (cookies.some((a) => a.match(/[^=]*/)[0].includes("device"))) {
        logger("cookies found")
        return await Promise.resolve(cookies);
      } else {
        return await Promise.reject('Username/Password invalid or something went wrong');
      }
    } catch (error) {
      if(debug)
        console.error(error);
      return Promise.reject(logger(error));
    }
}

Module.liveChannels = async function liveChannels(channel, cookies, lastupdated) {
  try {
    if(!cookies || typeof cookies !== 'object'){
      throw `Cookies Missing/Invalid`
    }
    logger("Acquiring HTML")
    let html = await axios.get(`https://antenaplay.ro/live/${channel}`, {
      headers: {
        cookie: cookies.join("; "),
      },
      withCredentials: true,
      referrer: "https://antenaplay.ro/seriale",
      referrerPolicy: "no-referrer-when-downgrade",
      mode: "cors",
    });

    if((((new Date()).getTime() - (new Date(lastupdated)).getTime()) / (1000 * 3600)) >= 6){
      let newCookies = html.headers['set-cookie']
      let config = fs.readFileSync(`./modules/${Module.MODULE_ID}.json`);
      let parsed = JSON.parse(config);
      parsed.auth.cookies[parsed.auth.cookies.findIndex(el => el.includes('XSRF-TOKEN'))] = newCookies[newCookies.findIndex(el => el.includes('XSRF-TOKEN'))];
      parsed.auth.cookies[parsed.auth.cookies.findIndex(el => el.includes('laravel_session'))] = newCookies[newCookies.findIndex(el => el.includes('laravel_session'))];
      parsed.auth.lastupdated = new Date();
      fs.writeFile(`./modules/${Module.MODULE_ID}.json`, JSON.stringify(parsed), () => {logger("Cookies Updated!")})
    }
    let $ = cheerio.load(html.data);
    if($){
      var link = $(".video-container script")
      .html()
      .match("streamURL: (.*)")[1]
      .replace('",', '"')
      .match('"(.*)"')[1]
      logger(`got stream URL - ${link}`)
      return await Promise.resolve(link)
    }else return await Promise.reject(logger('Something went wrong'));
    } catch (error) {
        if(debug)
        console.error(error);
        return await Promise.reject(logger(error));
  }
}

Module.getChannels = async function getChannels(){
    //axios get request to url https://antenaplay.ro/live
    var live = await axios.get('https://antenaplay.ro/live');
  
    //axios get response
    var $ = cheerio.load(live.data);
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
}

Module.getVOD_List = async function getVOD_List(cookies) {
  try {
    if(!cookies || typeof cookies !== 'object'){
      throw `Cookies Missing/Invalid`
    }
    logger("Acquiring HTML")
    let html = await axios.get(`https://antenaplay.ro/seriale`, {
      headers: {
        cookie: cookies.join("; "),
      },
      referrer: `https://antenaplay.ro/`,
      referrerPolicy: "no-referrer-when-downgrade",
      mode: "cors",
    });
    let $ = cheerio.load(await html.data);
    let $$ = cheerio.load(
      $($(".slider-container")[$(".slider-container").length - 1]).html()
    );
    let shows = [];
    $$($$("a").each(function loop_vod_list(i, el) {
      logger(`Appending show ${$$(el).children("h5").text()}`)
      logger(`Appending show link ${'/show' + $$(el).attr("href")}`)
      logger(`Appending show img ${$$(el).children('.container').children("img").attr('src')}`)
      shows.push({
        name: $$(el).children("h5").text(),
        link: '/' + Module.MODULE_ID + '/vod' + $$(el).attr("href"),
        img: $$(el).children('.container').children("img").attr('src')
      })
    }));
    return shows.length !== 0 ? await Promise.resolve(shows) : await Promise.reject(logger("List is empty"));
  } catch (error) {
    return await Promise.reject(logger(error));
  }
}

Module.getVOD = async function getVOD(show, cookies, year, month, season) {
  try {
    if(!cookies || typeof cookies !== 'object'){
      throw `Cookies Missing/Invalid`
    }
    logger("Acquiring HTML");
    let html = await axios.get(`https://antenaplay.ro/${show}`, {
      headers: {
        cookie: cookies.join("; "),
      },
      referrer: `https://antenaplay.ro/seriale`,
      referrerPolicy: "no-referrer-when-downgrade",
      mode: "cors",
      maxRedirects: 0
    });
    let $ = cheerio.load(await html.data);
    let list = {};
    if($("#js-selector-year").length){
      list.type = "calendar"
      if($("#js-selector-year option:not([disabled])").length > 0){
        $("#js-selector-year option:not([disabled])").each(function loop_months(i, el) {
          logger(`Available month(s) of year ${$(el).attr('value')}: ${($(el).attr('data-months')).split(";")}`)
          $(el).attr('value') && (list[$(el).attr('value')] = ($(el).attr('data-months')).split(";"))
        })
      }else list[$("#js-selector-year option:not([disabled])").attr('value')] = ($("#js-selector-year option:not([disabled])").attr('data-months')).split(";")
    }else if($("#js-selector-season option").length){
      list.type = "seasons"
      $("#js-selector-season option").each(function loop_seasons(i, el) {
        logger(`Available season: ${$(el).text()}`)
        $(el).attr('value') && (list[$(el).attr('value')] = $(el).text())
      })
    }

    if(!year && !month){
      if(season){
        return await Promise.resolve(Module.getVOD_EP_List(
          "https://antenaplay.ro" +
          $("button.js-selector").attr("data-url"), cookies, "", "", season
        ))
      }else {
        logger("Year and month or season not provided, sending available data")
        return await Promise.resolve(list)
      }
    }else if($){
      return await Module.getVOD_EP_List(
        "https://antenaplay.ro" +
        $("button.js-selector").attr("data-url"), cookies, year, month, ""
      )
    }else return await Promise.reject(logger('Something went wrong'))
  } catch (error) {
    return await Promise.reject(logger(error));
  }
}

Module.getVOD_EP_List = async function getVOD_EP_List(
  url,
  cookies,
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
  season
) {
  try {
    if(!cookies || typeof cookies !== 'object'){
      throw `Cookies Missing/Invalid`
    }
    logger(`Getting Episodes List for ${year && month ? "year " + year + " and " + month : "season id" + season}`)
    let response = await axios.get(`${url}${year && month ? '&year=' + year + '&month=' + month : season ? `?show=${season}` : ""}`, {
      headers: {
        "x-newrelic-id": "VwMCV1VVGwEEXFdQDwIBVQ==",
        "x-requested-with": "XMLHttpRequest",
        cookie: cookies.join("; "),
      },
      withCredentials: true, 
      referrer: "https://antenaplay.ro/"
    });
    var $ = cheerio.load(response.data.view);
    let shows = [];
    $("a").each((i, url) => {
      $(url).prepend($($(url).children('.container').children('img')).attr("width", "200px")) 
      $(url).attr("href", `/${Module.MODULE_ID}/vod` + $(url).attr("href"));
      shows.push({"name": $(url).children("h5").text(), "link": $(url).attr("href"), "img": $(url).children("img").attr("src")});
    });
    $(".container").each((i, el) => $(el).remove());
    logger(`Total episodes ${shows.length}`)
    return shows.length > 0 ? await Promise.resolve(shows) : await Promise.reject("Nothing in the list")
  } catch (error) {
    return Promise.reject(logger(error));
  }
}

Module.getVOD_EP = async function getVOD_EP(show, epid, cookies) {
  try {
    if(!show || !epid){
      throw `Params Missing`
    }
    if(!cookies || typeof cookies !== 'object'){
      throw `Cookies Missing/Invalid`
    }
    logger("Acquiring HTML")
    let response = await axios.get(
      `https://antenaplay.ro/${show}/${epid}`,
      {
        headers: {
          "x-newrelic-id": "VwMCV1VVGwEEXFdQDwIBVQ==",
          "x-requested-with": "XMLHttpRequest",
          cookie: cookies.join("; "),
        },
        referrer: "https://antenaplay.ro/",
        referrerPolicy: "no-referrer-when-downgrade",
        mode: "cors",
      }
    );
    logger("Acquiring Episode's URL")
    let link = await axios
      .get(
        "https:" +
        cheerio.load(response.data)(".video-container script")
            .html()
            .match("var playerSrc = '(.*)'")[1] +
          "no",
        {
          headers: {
            referer: "https://antenaplay.ro/",
          },
        }
      );
      logger(`GOT IT - ${link.data.match('ivmSourceFile.src = "(.*)";')[1]}`)
      return await Promise.resolve(link.data.match('ivmSourceFile.src = "(.*)";')[1])
  } catch (error) {
    return await Promise.reject(logger(error));
  }
}

module.exports = Module;