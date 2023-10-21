const axios = require("axios")
const mkdirp = require("mkdirp");
const path = require("path");
const _ = require("lodash");
const fs = require("fs");
const parseString = require("xml2js")?.parseString;
const when = require("when");
const read = require("fs-readdir-recursive");
const helper = require("../utils/helper");
const xml_folder = read(global.config.sitecore_folder)
const entriesConfig = config.modules.entries;
const entriesFolderPath = path.resolve(config.data, config.entryfolder) || {};
const { JSDOM } = require("jsdom");
const { htmlToJson, jsonToHtml } = require("@contentstack/json-rte-serializer");
const basePage = "https://www.alaskaair.com";
const cheerio = require('cheerio');
const { uid } = require('uid');


const writeEntry = ({ data, contentType, locale }) => {
  helper.writeFile(
    path.join(
      process.cwd(),
      `sitecoreMigrationData/entries/${contentType}`,
      locale
    ),
    JSON.stringify(data, null, 4),
    (err) => {
      if (err) throw err;
    }
  );
}

const entryUidCorrector = ({ uid }) => {
  return uid?.replace(/[{}]/g, "")
}

const handleFile = ({ locale, contentType, entry, uid }) => {
  let data = {};
  if (fs.existsSync(`sitecoreMigrationData/entries/${contentType}`)) {
    const prevEntries = helper?.readFile(path.join(
      process.cwd(),
      `sitecoreMigrationData/entries/${contentType}`,
      `${locale}.json`
    ))
    if (prevEntries) {
      data = prevEntries
    }
    data[uid] = entry;
    writeEntry({ data, contentType, locale })
  } else {
    fs.mkdirSync(path.join(
      process.cwd(),
      `sitecoreMigrationData/entries/${contentType}`
    ), { recursive: true });
    data[uid] = entry;
    writeEntry({ data, contentType, locale })
  }
}

const pages_to_crawl = [
  "/content/about-us/history",
  "/content/about-us/history/bob-ellis",
  "/content/about-us/history/carpet-pilots",
  "/content/about-us/history/history-by-decade",
  "/content/about-us/history/horizon-air-history",
  "/content/about-us/history/mac-mcgee",
  "/content/about-us/history/magic-carpet",
  "/content/about-us/history/mudhole-smith",
  "/content/about-us/history/pioneers",
  "/content/about-us/history/shell-simmons",
  "/content/about-us/history/star-air-service",
  "/content/about-us/history/wooten-magic-carpet"
]

const getAssetsUid = ({ url }) => {
  if (url?.includes("/media")) {
    if (url?.includes("?")) {
      url = url?.split("?")?.[0]?.replace(".jpg", "")
    }
    const newUrl = url?.match?.(/\/media\/(.*).ashx/)?.[1];
    if (newUrl !== undefined) {
      return newUrl;
    } else {
      return url?.match?.(/\/media\/(.*)/)?.[1];
    }
  } else {
    return url;
  }
}


const attachJsonRte = ({ content = "" }) => {
  const dom = new JSDOM(content);
  let htmlDoc = dom.window.document.querySelector("body");
  return htmlToJson(htmlDoc);
}


const getNameFromScript = ({ $, name }) => {
  let value;
  $('script').each((index, element) => {
    const scriptContent = $(element).html();
    if (scriptContent?.includes('utag_data')) {
      const regexPattern = new RegExp(`"${name}"\\s*:\\s*"([^"]+)"`);
      const match = regexPattern.exec(scriptContent);
      if (match) {
        value = match?.[1]
      }
    }
  });
  return value;
}

function flatten(data) {
  var result = {};
  function recurse(cur, prop) {
    if (Object(cur) !== cur) {
      result[prop] = cur;
    } else if (Array.isArray(cur)) {
      for (var i = 0, l = cur.length; i < l; i++)
        recurse(cur[i], prop + "[" + i + "]");
      if (l == 0) result[prop] = [];
    } else {
      var isEmpty = true;
      for (var p in cur) {
        isEmpty = false;
        recurse(cur[p], prop ? prop + "." + p : p);
      }
      if (isEmpty && prop) result[prop] = {};
    }
  }
  recurse(data, "");
  return result;
}

const getPageSource = async (page) => {
  try {
    const config = {
      method: "get",
      url: `${basePage}${page}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
        'Accept-Encoding': 'gzip, deflate, br',
        'js_render': 'true',
        'antibot': 'true',
        'premium_proxy': 'true'
      },
    };
    console.log("🚀 ~ file: staticHtml.js:107 ~ getPageSource ~ config:", config)
    const res = await axios(config)
    const $ = cheerio.load(res.data)
    const obj = {};
    obj.browser_title = $('head title').text()//Title
    obj.description = $('meta[name=description]').attr('content') //Description
    obj.keywords = $('meta[name=keywords]').attr('content')//Keywords
    obj.socialTitle = $('meta[name=twitter:title]').attr('content') //Social Title
    obj.socialDescription = $('meta[name=twitter:description]').attr('content') //Social Description
    obj.canonical_href = $('link[rel=canonical]').attr('href') // Canonical Href
    obj.channel = getNameFromScript({ $, name: "channel" }) //Channel
    obj.pageNameForTracking = getNameFromScript({ $, name: "page_name" }) //Page name
    obj.html = attachJsonRte({ content: $?.html('main')?.replace(/[\n\r]/g, '') }); //html
    return obj
  } catch (Err) {
    console.log("🚀 ~ file: staticHtml.js:39 ~ getPageSource ~ Err:", Err?.response)
  }
}

async function ExtractEntry(page) {
  const data = await getPageSource(page);
  const jsonValue = data?.html;
  const allAssetJSON = helper?.readFile(path.join(
    process.cwd(),
    `sitecoreMigrationData/assets`,
    "assets.json"
  ))
  const flattenHtml = flatten(jsonValue);
  for (const [key, value] of Object.entries(flattenHtml)) {
    if (value === "img") {
      const newKey = key?.replace(".type", "")
      const htmlData = _.get(jsonValue, newKey)
      if (htmlData?.type === "img" && htmlData?.attrs) {
        const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w.-]*)*\/?$/;
        const uid = getAssetsUid({ url: htmlData?.attrs?.url });
        if (!uid?.match(urlRegex)) {
          let asset = {};
          if (uid?.includes('/')) {
            for (const [key, value] of Object.entries(allAssetJSON)) {
              if (value?.assetPath === `${uid}/`) {
                asset = value;
              }
            }
          } else {
            const assetUid = idCorrector({ id: makeUid({ uid }) });
            asset = allAssetJSON?.[assetUid];
          }
          if (asset?.uid) {
            const updated = {
              "uid": htmlData?.uid,
              "type": "reference",
              "attrs": {
                "display-type": "display",
                "asset-uid": asset?.uid,
                "content-type-uid": "sys_assets",
                "asset-link": asset?.urlPath,
                "asset-name": asset?.title,
                "asset-type": asset?.content_type,
                "type": "asset",
                "class-name": "embedded-asset",
                "inline": false
              },
              "children": [
                {
                  "text": ""
                }
              ]
            }
            _.set(jsonValue, newKey, updated)
          }
        }
      }
    }
  }
  const dictionary = {
    "title": data?.browser_title,
    "seo_meta_data": {
      "seo": {
        "browser_title": data?.browser_title,
        "description": data?.description,
        "keywords": data?.keywords,
        "page_visibility": "All",
        "search_index": true
      },
      "social": {
        "social_share_title": data?.socialTitle,
        "social_share_description": data?.socialDescription,
        "social_share_image": ""
      },
      "tracking": {
        "canonical_href": data?.canonical_href,
        "channel": data?.channel,
        "page_name_for_tagging_tracking": data?.pageNameForTracking
      },
      "other": {
        "additional_data": "",
        "javascript_references": ""
      }
    },
    "page_components": [
      {
        "generic_text_rendering": {
          "name": "",
          "is_default": false,
          "feature_id": "",
          "group_id": "",
          "content_text": data?.html,
        }
      }
    ],
    "tags": ["sitecore 8", "static html"],
    "locale": "en-us",
    "_version": 1,
    "_in_progress": false,
    "url": page
  }
  handleFile({ locale: "en-us", contentType: "flex_page", entry: dictionary, uid: uid(19) })
  //if you want to chnage contentType change the contentType name
}

function ExtractTemplate() {
  pages_to_crawl?.forEach((page) => {
    ExtractEntry(page)
  })
}

module.exports = ExtractTemplate;