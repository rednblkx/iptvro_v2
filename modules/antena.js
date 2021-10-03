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

const ModuleClass = require('./moduleClass')

const Module = new ModuleClass('antena', true, true, chList, qualitiesList)

const consoleL = process.env.DEBUG;

const {default: axios} = require('axios');
const cheerio = require('cheerio');

Module.login = async function login(username, password) {

    return new Promise(async (resolve, reject) => {
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
        if(consoleL) console.log("antena| login: cookies found ");
          resolve(cookies);
        } else {
          reject("antena| login: Username/Password incorrect");
        }
      } catch (error) {
        reject("antena| login: " + error);
        if(consoleL)
          console.error(error);
      }
    });
}

Module.liveChannels = async function liveChannels(channel, cookies) {
  return new Promise(async (resolve, reject) => {
    try {
      if(!cookies || typeof cookies !== 'object'){
        throw `Cookies Missing/Invalid`
      }
      if(consoleL) console.log(`${Module.MODULE_ID}| liveChannels: getting HTML`);
      let html = await axios.get(`https://antenaplay.ro/live/${channel}`, {
        headers: {
          cookie: cookies.join("; "),
        },
        withCredentials: true,
        referrer: "https://antenaplay.ro/seriale",
        referrerPolicy: "no-referrer-when-downgrade",
        mode: "cors",
      });
      if(consoleL && html.data) console.log(`${Module.MODULE_ID}| liveChannels: got HTML`);
      // let setC = setCookies(html.headers['set-cookie']);
      // if(consoleL) console.log(setC)
      let $ = cheerio.load(html.data);
        $ ? resolve(
          $(".video-container script")
            .html()
            .match("streamURL: (.*)")[1]
            .replace('",', '"')
            .match('"(.*)"')[1]
        ): reject(`${Module.MODULE_ID}| liveChannels: HTML not available`);
      } catch (error) {
        reject(`${Module.MODULE_ID}| liveChannels: ${error}`);
        if(consoleL)
          console.error(error);
    }
  });
}

Module.getVOD_List = async function getVOD_List(cookies) {
  return new Promise(async (resolve, reject) => {
    try {
      if(!cookies || typeof cookies !== 'object'){
        throw `Cookies Missing/Invalid`
      }
      if(consoleL) console.log(`${Module.MODULE_ID}| getVOD_List: Getting HTML`);
      let html = await axios.get(`https://antenaplay.ro/seriale`, {
        headers: {
          cookie: cookies.join("; "),
        },
        referrer: `https://antenaplay.ro/`,
        referrerPolicy: "no-referrer-when-downgrade",
        mode: "cors",
      });
      if(consoleL && html.data) console.log(`${Module.MODULE_ID}| getVOD_List: Got HTML`);
      if(consoleL) console.log(`${Module.MODULE_ID}| getVOD_List: loading into cheerio`);
      let $ = cheerio.load(await html.data);
      let $$ = cheerio.load(
        $($(".slider-container")[$(".slider-container").length - 1]).html()
      );
      let shows = [];
      $$($$("a").each((i, el) => {
        if(consoleL) console.log(`${Module.MODULE_ID}| getVOD_List: Appending show ${$$(el).children("h5").text()}`);
        if(consoleL) console.log(`${Module.MODULE_ID}| getVOD_List: Appending show link ${'/show' + $$(el).attr("href")}`);
        if(consoleL) console.log(`${Module.MODULE_ID}| getVOD_List: Appending show img ${$$(el).children('.container').children("img").attr('src')}`);
        shows.push({
          name: $$(el).children("h5").text(),
          link: '/' + Module.MODULE_ID + '/vod' + $$(el).attr("href"),
          img: $$(el).children('.container').children("img").attr('src')
        })
      }));
      shows.length !== 0 ? resolve(shows) : reject(`${Module.MODULE_ID}| getVOD_List: Nothing in the list`);
    } catch (error) {
      reject(`${Module.MODULE_ID}| getVOD_List: ${error}`);
      if(consoleL)
        console.error(error);
    }
  });
}

Module.getVOD = async function getVOD(show, cookies, year, month) {
  return new Promise(async (resolve, reject) => {
    try {
      if(!cookies || typeof cookies !== 'object'){
        throw `Cookies Missing/Invalid`
      }
      if(consoleL) console.log(`${Module.MODULE_ID}| getVOD: Getting HTML`);
      let html = await axios.get(`https://antenaplay.ro/${show}`, {
        headers: {
          cookie: cookies.join("; "),
        },
        referrer: `https://antenaplay.ro/seriale`,
        referrerPolicy: "no-referrer-when-downgrade",
        mode: "cors",
      });
      if(consoleL && html.data) console.log(`${Module.MODULE_ID}| getVOD: Got HTML`);
      let $ = cheerio.load(await html.data);
      let list = {};
      if($("#js-selector-year option:not([disabled])").length > 0){
        $("#js-selector-year option:not([disabled])").each((i, el) => {
          $(el).attr('value') && (list[$(el).attr('value')] = ($(el).attr('data-months')).split(";"))
        })
      }else list[$("#js-selector-year option:not([disabled])").attr('value')] = ($("#js-selector-year option:not([disabled])").attr('data-months')).split(";")
      !year || !month ? resolve(list) & console.log(`${Module.MODULE_ID}| getVOD: Year and month not provided, sending available dates`) : $ ? resolve(await getVOD_EP_List(
        "https://antenaplay.ro" +
          $(".js-slider-button.slide-right").attr("data-url"), year, month, cookies
      )) : reject('getShow: No HTML')
    } catch (error) {
      reject(`${Module.MODULE_ID}| getVOD: ${error}`);
      if(consoleL)
        console.error(error);
    }
  })
}

Module.getVOD_EP_List = async function getVOD_EP_List(
  url,
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
  cookies
) {
  return new Promise(async (resolve, reject) => {
    try {
      if(!cookies || typeof cookies !== 'object'){
        throw `Cookies Missing/Invalid`
      }
      if(consoleL) console.log(`${Module.MODULE_ID}| getVOD_EP_List: Getting Episodes List`);
      if(consoleL) console.log(`${Module.MODULE_ID}| getVOD_EP_List: Link used ${url}${year && month ? '&year=' + year + '&month=' + month : ''}`);
      let response = await axios.get(`${url}${year && month ? '&year=' + year + '&month=' + month : ''}`, {
        headers: {
          "x-newrelic-id": "VwMCV1VVGwEEXFdQDwIBVQ==",
          "x-requested-with": "XMLHttpRequest",
          cookie: cookies.join("; "),
        },
        withCredentials: true,
        referrer: "https://antenaplay.ro/"
      });
      if(consoleL && response.data) console.log(`${Module.MODULE_ID}| getVOD_EP_List: Got Episodes`);
      var $ = cheerio.load(response.data.view);
      let shows = [];
      $("a").each((i, url) => {
        $(url).prepend($($(url).children('.container').children('img')).attr("width", "200px")) 
        $(url).attr("href", `/${Module.MODULE_ID}/vod` + $(url).attr("href"));
        shows.push({"name": $(url).children("h5").text(), "link": $(url).attr("href"), "img": $(url).children("img").attr("src")});
      });
      $(".container").each((i, el) => $(el).remove());
      shows.length > 0 ? resolve(shows) : reject(`No Data`)
    } catch (error) {
      reject(`${Module.MODULE_ID}| getVOD_EP_List: ${error}`);
      if(consoleL)
        console.error(error);
    }
  });
}

Module.getVOD_EP = async function getVOD_EP(show, epid, cookies) {
  return new Promise(async (resolve, reject) => {
    try {
    if(!show || !epid){
      throw `${Module.MODULE_ID}| getVOD_EP: Params Missing`
    }
    if(!cookies || typeof cookies !== 'object'){
      throw `Cookies Missing/Invalid`
    }
    if(consoleL) console.log(`${Module.MODULE_ID}| getVOD_EP: Getting episode's HTML`);
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
    if(consoleL && response.data) console.log(`${Module.MODULE_ID}| getVOD_EP: Got HTML`);
    if(consoleL) console.log(`${Module.MODULE_ID}| getVOD_EP: Getting episode URL`);
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
      if(consoleL && link.data) console.log(`${Module.MODULE_ID}| getVOD_EP: Got episode URL ${link.data.match('ivmSourceFile.src = "(.*)";')[1]}`);
      resolve(link.data.match('ivmSourceFile.src = "(.*)";')[1])
  } catch (error) {
    reject(`${Module.MODULE_ID}| ${name}: ${error}`);
    if(consoleL)
      console.error(error);
  }
})
}
// if(chList.length <= 0){
//     console.log("list is empty");
//     var ch = ['antena1', 'zu-tv', 'happy-channel']
//     require('fs').writeFileSync(`${__dirname}/${MODULE_ID}.json`, JSON.stringify(ch))
// }

module.exports = Module