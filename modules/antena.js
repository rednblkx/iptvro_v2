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

const Properties = new ModuleClass('antena', true, true, chList, qualitiesList)

const consoleL = true;

const {default: axios} = require('axios');
const cheerio = require('cheerio');

// function liveChannels(id){
//     return `${Properties.MODULE_ID}: here is your stream for ${id}`
// }

async function login(username, password) {

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

async function liveChannels(channel, cookies) {
  return new Promise(async (resolve, reject) => {
    try {
      // if(consoleL) console.log("antena| getStream: getting cookies");
      // let auth = await getLogin();
      // if(consoleL && auth) console.log("antena| getStream: got cookies");
      if(consoleL) console.log("antena| getStream: getting HTML");
      let html = await axios.get(`https://antenaplay.ro/live/${channel}`, {
        headers: {
          cookie: cookies.join("; "),
        },
        withCredentials: true,
        referrer: "https://antenaplay.ro/seriale",
        referrerPolicy: "no-referrer-when-downgrade",
        mode: "cors",
      });
      if(consoleL && html.data) console.log("antena| getStream: got HTML");
      // let setC = setCookies(html.headers['set-cookie']);
      // if(consoleL) console.log(setC)
      let $ = cheerio.load(html.data);
        $ ? resolve(
          $(".video-container script")
            .html()
            .match("streamURL: (.*)")[1]
            .replace('",', '"')
            .match('"(.*)"')[1]
        ): reject("antena| getStream: HTML not available");
      } catch (error) {
        reject("antena| getStream: " + error);
        if(consoleL)
          console.error(error);
    }
  });
}

// if(chList.length <= 0){
//     console.log("list is empty");
//     var ch = ['antena1', 'zu-tv', 'happy-channel']
//     require('fs').writeFileSync(`${__dirname}/${MODULE_ID}.json`, JSON.stringify(ch))
// }

module.exports = {Properties, liveChannels, login}