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
const dateConverter = require("../utils/dateChanger");

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
      if (schema?.[schemaPos]?.data_type === "reference") {
        newPath = `${newPath}-reference`;
      }
      if (schema?.[schemaPos]?.data_type === "number") {
        newPath = `${newPath}-number`;
      }
      if (schema?.[schemaPos]?.display_type === "dropdown") {
        newPath = `${newPath}-dropdown_${JSON.stringify(schema?.[schemaPos]?.enum)}`;
      }
      if (schema?.[schemaPos]?.data_type === "boolean") {
        newPath = `${newPath}-boolean`;
      }
      if (schema?.[schemaPos]?.data_type === "file") {
        newPath = `${newPath}-file`;
      }
      if (schema?.[schemaPos]?.data_type === "isodate") {
        newPath = `${newPath}-isodate`;
      }
      pathsUid?.push(newPath);
    }
  }
  return pathsUid;
}

function startsWithNumber(str) {
  return /^\d/.test(str);
}



const writeEntry = ({ data, contentType, locale }) => {
  helper.writeFile(
    path.join(
      process.cwd(),
      `sitecoreMigrationData/entries/${contentType}/${locale}`
    ),
    JSON.stringify(data, null, 4),
    "en-us",
    (err) => {
      if (err) throw err;
    }
  );
  const indexObj = { "1": `${locale}.json` }
  helper.writeFile(
    path.join(
      process.cwd(),
      `sitecoreMigrationData/entries/${contentType}/${locale}`
    ),
    JSON.stringify(indexObj, null, 4),
    "index",
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
      `sitecoreMigrationData/entries/${contentType}/${locale}`,
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
    if (url?.includes?.("mediaid")) {
      const match = url?.match(/mediaid="([^"]+)"/);
      if (match?.[1]) {
        const mediaId = match?.[1];
        return mediaId;
      } else {
        return null;
      }
    }
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
    return id
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

const uidCorrector = ({ uid }) => {
  if (startsWithNumber(uid)) {
    return `${append}_${_.replace(uid, new RegExp("[ -]", "g"), '_')?.toLowerCase()}`
  }
  return _.replace(uid, new RegExp("[ -]", "g"), '_')?.toLowerCase()
}




const renderEntry = ({ data, contentType }) => {
  const allAssetJSON = helper?.readFile(path.join(
    process.cwd(),
    `sitecoreMigrationData/assets`,
    "index.json"
  ))
  const content_type = helper?.readFile(path.join(
    process.cwd(),
    `sitecoreMigrationData/content_types`,
    `${contentType}.json`
  ))
  if (content_type?.uid) {
    content_type.schema = attachGlobalfiled({ schema: content_type?.schema })
    const keys = content_typeField(content_type?.schema)
    const entry = {};
    data?.item?.fields?.field?.forEach?.((item) => {
      if (!item?.$?.key?.includes("__")) {
        const csData = keys?.find((elt) => elt === `${item?.$?.key}-reference`)
        if (csData) {
          item.$.key = appendKey({ key: item?.$?.key, keys });
          const refsFound = item?.content?.split("|");
          const contentData = [];
          refsFound?.forEach((ref) => {
            xml_folder?.forEach((pt) => {
              if (pt?.includes?.(ref) && pt?.includes(".json")) {
                const entry = helper?.readFile(`${global.config.sitecore_folder}/${pt}`)
                contentData?.push({
                  _content_type_uid: uidCorrector({ uid: entry?.item?.$?.template }),
                  uid: idCorrector?.({ id: entry?.item?.$?.id })
                })
              }
            })
          })
          entry[item?.$?.key] = contentData;
        } else {
          item.$.key = appendKey({ key: item?.$?.key, keys })
          const isNumber = keys?.find((elt) => elt === `${item?.$?.key}-number`);
          const isDropDown = keys?.find((elt) => elt.includes(`${item?.$?.key}-dropdown_`));
          const isBoolean = keys?.find((elt) => elt === `${item?.$?.key}-boolean`);
          const isFile = keys?.find((elt) => elt === `${item?.$?.key}-file`);
          const isIsoDate = keys?.find((elt) => elt === `${item?.$?.key}-isodate`);
          if (isDropDown?.includes(_) && isDropDown?.split("_")?.length === 2) {
            const choices = isDropDown?.split("_")?.[1];
            if (typeof choices === "string") {
              try {
                const choicesParsed = JSON?.parse(choices)
                if (!choicesParsed?.advanced) {
                  if (choicesParsed?.choices?.[0]?.value === "NF") {
                    entry[item?.$?.key] = null;
                  } else {
                    entry[item?.$?.key] = item?.content;
                  }
                } else {
                  entry[item?.$?.key] = item?.content;
                }
              } catch (err) {
                console.log("🚀 ~ renderEntry ~ err:", err)
              }
            } else {
              console.log("Not string value.")
            }
          } else if (isBoolean) {
            entry[item?.$?.key] = item?.content === "1" ? true : false;
          } else if (isNumber) {
            entry[item?.$?.key] = _.toNumber(item?.content);
          } else if (isIsoDate) {
            entry[item?.$?.key] = dateConverter({ inputDate: item?.content });
          } else if (isFile) {
            const assetsUid = getAssetsUid({ url: item?.content });
            if (assetsUid) {
              const assetsIdCorrected = idCorrector({ id: assetsUid });
              if (allAssetJSON?.[assetsIdCorrected]) {
                entry[item?.$?.key] = allAssetJSON?.[assetsIdCorrected];
              } else {
                entry[item?.$?.key] = null;
              }
            } else {
              entry[item?.$?.key] = null;
            }
          } else {
            if (item.$.key !== "" && item?.content?.trim() !== "") {
              entry[item?.$?.key] = idCorrector({
                id: item?.content
              })
            }
          }
        }
      }
    })
    if (keys?.find?.((item) => item?.includes("."))) {
      return unflatten(entry);
    }
    return entry;
  }
}

function ExtractEntries() {
  const obj = {};
  const tempData = {};
  for (let i = 0; i < xml_folder?.length; i++) {
    const folder = xml_folder?.[i];
    if (
      (folder?.includes("data.json") || folder?.includes("data.json.json"))
      && folder?.includes("/content")
      && !folder?.includes("Common/Configuration/")
    ) {
      const key = "/content";
      const url = folder?.split?.(key)?.[1]?.split?.("/{")?.[0];
      const data = helper?.readFile(`${global.config.sitecore_folder}/${folder}`)
      const uid = uidCorrector({ uid: data?.item?.$?.template });
      data.item.$.template = uid;
      const id = idCorrector({ id: data?.item?.$?.id });
      tempData[id] = { url, ...data?.item?.$ };
      if (data?.item?.$?.key?.includes("_")) {
        const parentid = idCorrector({ id: data?.item?.$?.parentid });
        if (obj[parentid]) {
          obj[parentid]?.push({
            _content_type_uid: uid,
            uid: id
          })
        } else {
          obj[parentid] = [
            {
              _content_type_uid: uid,
              uid: id
            }
          ]
        }
      }
      if (data) {
        // if (uidCorrector({ uid: data?.item?.$?.template }) === "footer") {
        // console.log(data)
        const entry = renderEntry({ data, contentType: uidCorrector({ uid: data?.item?.$?.template }) })
        // console.log("=>>>>>>", entry === undefined ? uidCorrector({ uid: data?.item?.$?.template }) : "")
        if (entry) {
          entry.url = url;
          entry.title = data?.item?.$?.name;
          entry.uid = idCorrector({ id: data?.item?.$?.id });
          handleFile({ locale: "en-us", contentType: uidCorrector({ uid: data?.item?.$?.template }), entry, uid: entry?.uid })
        }
        // }
      }
    }
  }
  const TemplatesJson = helper?.readFile(path.join(
    process.cwd(),
    `sitecoreMigrationData/MapperData`,
    "template.json"
  ))
  for (const [key, value] of Object?.entries(obj)) {
    const refs = [];
    let entryData = {};
    if (tempData?.[key]) {
      refs?.push({
        _content_type_uid: tempData?.[key]?.template,
        uid: key
      })
      entryData = {
        title: tempData?.[key]?.name,
        url: tempData?.[key]?.url,
        uid: key
      }
    }
    if (value?.length) {
      refs?.push(...value)
    }
    if (refs?.length) {
      const uniqueData = refs?.filter((v, i, a) => a?.findIndex(t => t?.uid === v?.uid) === i);
      if (entryData?.title && uniqueData?.length) {
        const filtredData = [];
        const contentTypeData = [];
        uniqueData?.forEach((uid) => {
          const content_type = helper?.readFile(path.join(
            process.cwd(),
            `sitecoreMigrationData/content_types`,
            `${uid?._content_type_uid}.json`
          ))
          if (content_type?.uid) {
            filtredData?.push(uid);
            contentTypeData?.push(content_type);
          }
        })
        filtredData?.forEach((dat) => {
          const entry = helper?.readFile(path.join(
            process.cwd(),
            `sitecoreMigrationData/entries/${dat?._content_type_uid}/en-us`,
            `en-us.json`
          ))
          if (entry?.[dat?.uid]) {
            entryData[dat?._content_type_uid] = entry?.[dat?.uid]
          } else {
            console.log("entry not found")
          }
        })
        let foundTemp;
        TemplatesJson?.forEach((temp) => {
          const isPresent = temp?.ids?.find((item) => idCorrector({ id: item }) === key)
          if (isPresent) {
            foundTemp = temp
          }
        })
        handleFile({ locale: "en-us", contentType: foundTemp?.uid, entry: entryData, uid: entryData?.uid })
      }
    }
  }
  const schema = [];
  const contentTypeSchema = read(
    path.join(
      process.cwd(),
      `sitecoreMigrationData/content_types`
    )
  )
  contentTypeSchema?.forEach((ct) => {
    let ctData = helper?.readFile(path.join(
      process.cwd(),
      `sitecoreMigrationData/content_types`,
      ct
    ))
    ctData.schema = ctData?.schema?.map?.((itl, index) => {
      const isPresent = ctData?.schema?.filter((sch) => sch?.uid === itl?.uid)
      if (isPresent?.length > 1) {
        return {
          ...itl,
          display_name: `${itl.display_name} ${index}`,
          uid: `${itl.uid}_${index}`
        }
      }
      return itl;
    })
    helper.writeFile(
      path.join(
        process.cwd(),
        "sitecoreMigrationData/content_types",
      ),
      JSON.stringify(ctData, null, 4),
      ct?.replace(".json", ""),
      (err) => {
        if (err) throw err;
      }
    )
    schema?.push(ctData);
  })
  helper.writeFile(
    path.join(
      process.cwd(),
      "sitecoreMigrationData/content_types",
    ),
    JSON.stringify(schema, null, 4),
    "schema",
    (err) => {
      if (err) throw err;
    }
  )
}

ExtractEntries.prototype = {
  start: function () {
    successLogger(`exporting entries`);
  },
};

module.exports = ExtractEntries;