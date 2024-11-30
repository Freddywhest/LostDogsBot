const app = require("../config/app");

const headers = {
  "sec-ch-ua-platform": '"Android"',
  "sec-ch-ua":
    '"Chromium";v="130", "Android WebView";v="130", "Not?A_Brand";v="99"',
  "sec-ch-ua-mobile": "?1",
  "x-gg-client": "v:1 l:en",
  accept: "*/*",
  "content-type": "application/json",
  "user-agent":
    "Mozilla/5.0 (Linux; Android 13; SM-G925F Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36",
  origin: "https://dog-ways.newcoolproject.io",
  "sec-fetch-site": "cross-site",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  referer: "https://dog-ways.newcoolproject.io/",
  "accept-encoding": "gzip, deflate, br, zstd",
  "accept-language": "en,en-US;q=0.9",
  priority: "u=1, i",
};

module.exports = headers;
