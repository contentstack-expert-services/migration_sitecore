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

if (!fs.existsSync(entriesFolderPath)) {
  mkdirp.sync(entriesFolderPath);
  helper.writeFile(path.join(entriesFolderPath, entriesConfig.fileName));
}

function unflatten(table) {
  var result = {};

  for (var path in table) {
    var cursor = result,
      length = path.length,
      property = "",
      index = 0;

    while (index < length) {
      var char = path.charAt(index);

      if (char === "[") {
        var start = index + 1,
          end = path.indexOf("]", start),
          cursor = (cursor[property] = cursor[property] || []),
          property = path.slice(start, end),
          index = end + 1;
      } else {
        var cursor = (cursor[property] = cursor[property] || {}),
          start = char === "." ? index + 1 : index,
          bracket = path.indexOf("[", start),
          dot = path.indexOf(".", start);

        if (bracket < 0 && dot < 0) var end = (index = length);
        else if (bracket < 0) var end = (index = dot);
        else if (dot < 0) var end = (index = bracket);
        else var end = (index = bracket < dot ? bracket : dot);

        var property = path.slice(start, end);
      }
    }

    cursor[property] = table[path];
  }

  return result[""];
}

function content_typeField(schema, path = "") {
  const pathsUid = [];
  for (let schemaPos = 0; schemaPos < schema?.length; schemaPos++) {
    if (schema?.[schemaPos]?.data_type === "blocks") {
      for (
        let modulerPos = 0;
        modulerPos < schema?.[schemaPos]?.blocks?.length;
        modulerPos++
      ) {
        let newPath =
          path !== ""
            ? `${path}.${schema?.[schemaPos]?.uid}[${modulerPos}].${schema?.[schemaPos]?.blocks?.[modulerPos]?.uid}`
            : `${schema?.[schemaPos]?.uid}[${modulerPos}].${schema?.[schemaPos]?.blocks?.[modulerPos]?.uid}`;
        const newUids = content_typeField(
          schema?.[schemaPos]?.blocks?.[modulerPos]?.schema,
          newPath
        );
        if (newUids?.length > 0) pathsUid?.push(...newUids);
      }
    } else if (
      schema?.[schemaPos]?.data_type === "global_field" ||
      schema?.[schemaPos]?.data_type === "group"
    ) {
      let newPath;
      if (schema?.[schemaPos]?.multiple) {
        newPath =
          path !== ""
            ? `${path}.${schema?.[schemaPos]?.uid}[0]`
            : `${schema?.[schemaPos]?.uid}`;
      } else {
        newPath =
          path !== ""
            ? `${path}.${schema?.[schemaPos]?.uid}`
            : `${schema?.[schemaPos]?.uid}`;
      }
      const newUids = content_typeField(schema?.[schemaPos]?.schema, newPath);
      if (newUids?.length > 0) pathsUid?.push(...newUids);
    } else {
      let newPath =
        path !== ""
          ? `${path}.${schema?.[schemaPos]?.uid}`
          : `${schema?.[schemaPos]?.uid}`;
      pathsUid?.push(newPath);
    }
  }
  return pathsUid;
}

const uidCorrector = ({ uid }) => {
  return _.replace(uid, new RegExp(" ", "g"), '_').toLowerCase()
}


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

function containsHTML(str) {
  const regex = /<[^>]+>/;
  return regex.test(str);
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

const makeUid = ({ uid }) => {
  if (uid?.length === 32) {
    return [
      uid?.substring(0, 8),
      uid?.substring(8, 12),
      uid?.substring(12, 16),
      uid?.substring(16, 20),
      uid?.substring(20, 32)
    ].join('-');
  }
}

const attachGlobalfiled = ({ schema }) => {
  const global_field = helper?.readFile(path.join(
    process.cwd(),
    `sitecoreMigrationData/global_fields`,
    `globalfields.json`
  ))
  schema?.forEach((item, index) => {
    if (item?.data_type === "global_field") {
      if (global_field?.length) {
        const isPresent = global_field?.find((gb) => gb?.uid === item?.uid)
        if (isPresent) {
          isPresent.data_type = "global_field"
          schema[index] = isPresent
        }
      }
    }
  })
  return schema;
}

const appendKey = ({ key, keys }) => {
  const newKey = uidCorrector({ uid: key })
  if (keys?.length) {
    const isKeyPresent = keys?.find((item) => item?.split?.(".")?.[1] === newKey)
    if (isKeyPresent) {
      return isKeyPresent;
    }
  }
  return newKey;
}

const findJsonRte = ({ schema }) => {
  const path = [];
  schema?.forEach((item) => {
    if (item?.data_type === 'json' && item?.field_metadata?.allow_json_rte) {
      path.push({ uid: item?.uid, default_value: item?.field_metadata?.default_value })
    }//baki
    if (item?.data_type === "global_field") {
      findJsonRte({ schema: item?.schema })
    }
  })
  return path;
}

const attachJsonRte = ({ content = "" }) => {
  const dom = new JSDOM(content);
  let htmlDoc = dom.window.document.querySelector("body");
  return htmlToJson(htmlDoc);
}


const idCorrector = ({ id }) => {
  const newId = id?.replace(/[-{}]/g, (match) => match === '-' ? '' : '')
  if (newId) {
    return newId?.toLowerCase()
  } else {
    return id?.toLowerCase()
  }
}

function isJsonString(str) {
  try {
    const cleanedStr = str.replace(/&nbsp;/g, ' ')
    JSON.parse(cleanedStr);
    return true;
  } catch (e) {
    return false;
  }
}


const renderEntry = ({ data, contentType }) => {
  const allAssetJSON = helper?.readFile(path.join(
    process.cwd(),
    `sitecoreMigrationData/assets`,
    "assets.json"
  ))
  const content_type = helper?.readFile(path.join(
    process.cwd(),
    `sitecoreMigrationData/content_types`,
    `${contentType}.json`
  ))
  if (content_type?.uid) {
    content_type.schema = attachGlobalfiled({ schema: content_type?.schema })
    const keys = content_typeField(content_type?.schema)
    const rteKeys = findJsonRte({ schema: content_type?.schema })
    const entry = {};
    data?.item?.fields?.field?.forEach?.((item) => {
      if (!item?.$?.key?.includes("__")) {
        item.$.key = appendKey({ key: item?.$?.key, keys })
        if (containsHTML(item?.content)) {
          const jsonValue = attachJsonRte({ content: item?.content });
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
          entry[item?.$?.key] = jsonValue;
        } else if (isNaN(item?.content * 1) && isJsonString(item?.content)) {
          const isKey = rteKeys?.find((pth) => pth?.uid === item?.$?.key)
          if (isKey?.uid) {
            entry[item?.$?.key] = attachJsonRte({ content: item?.content })
          }
        } else {
          const isKey = rteKeys?.find((pth) => pth?.uid === item?.$?.key)
          if (isKey?.uid) {
            entry[item?.$?.key] = attachJsonRte({ content: item?.content })
          } else {
            entry[item?.$?.key] = idCorrector({
              id: item?.content
            })
          }
        }
      }
    })
    if (rteKeys?.length) {
      rteKeys?.forEach((item) => {
        const data = _.get(entry, item?.uid)
        if (data === "" || data === "\n") {
          entry[item?.uid] = attachJsonRte({ content: item?.default_value ?? "" })
        }
      })
    }
    return unflatten(entry);
  }
}



function ExtractEntries() {
  for (let i = 0; i < xml_folder?.length; i++) {
    const folder = xml_folder?.[i];
    if ((folder?.includes("data.json") || folder?.includes("data.json.json")) && !folder?.includes("Common/Configuration/")) {
      const key = "/content";
      const url = folder?.split?.(key)?.[1]?.split?.("/{")?.[0];
      const data = helper?.readFile(`${global.config.sitecore_folder}/${folder}`)
      if (data) {
        const entry = renderEntry({ data, contentType: uidCorrector({ uid: data?.item?.$?.template }) })
        // data?.item?.$?.language
        if (entry) {
          entry.url = url;
          entry.title = url;
          entry.uid = idCorrector({ id: data?.item?.$?.id });
          handleFile({ locale: "en-us", contentType: uidCorrector({ uid: data?.item?.$?.template }), entry, uid: entry?.uid })
        }
      }
    }
  }
}

ExtractEntries.prototype = {
  start: function () {
    successLogger(`exporting entries`);
  },
};

module.exports = ExtractEntries;