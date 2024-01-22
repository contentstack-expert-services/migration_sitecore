const mkdirp = require("mkdirp");
const path = require("path");
const _ = require("lodash");
const parseString = require("xml2js").parseString;
const fs = require("fs");
const when = require("when");
const axios = require("axios");
const chalk = require('chalk');
const read = require("fs-readdir-recursive");
const helper = require("../utils/helper");
const json_file = []
const xml_folder = read(global.config.sitecore_folder)
const { uid } = require('uid');
const assetsSave = "sitecoreMigrationData/assets"
const exclude = ["1", "en", "2", "3", "4", "5", "6"]


function validFolderName(inputName) {
  let validName = inputName?.replace(/[^a-zA-Z0-9-_]/g, '_');
  return validName;
}

const getfolders = (folder, parenUid) => {
  const data = [];
  const presnet = folder?.filter((key) => parenUid === key?.parent_uid)
  if (presnet?.length) {
    presnet?.forEach((item) => {
      const newItem = {};
      const child = getfolders(folder, item?.uid);
      if (child?.length) {
        newItem.child = child;
      }
      newItem.uid = item?.uid;
      data?.push(newItem);
    })
  }
  return data;
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

const cutFiveFolders = (folder) => {
  const allData = [];
  folder?.forEach((item) => {
    if (item?.parent_uid === null) {
      const allFolder = getfolders(folder, item?.uid)
      allFolder?.forEach((item) => {
        const obj = flatten(item);
        for (const [key, value] of Object.entries(obj)) {
          if (key?.match(/child/g)?.length > 3) {
            const splitStr = key?.split?.('child');
            const result = splitStr?.slice(0, 3)?.join?.('child')?.slice(0, -1);
            console.log(result, key?.match(/child/g)?.length)
            const data = _.get(item, result)
            if (data?.uid) {
              allData?.push(data?.uid)
            }
          }
        }
      })
    }
  })
  if (allData?.length) {
    const newFolders = [];
    const unique = [... new Set(allData)]
    if (unique?.length) {
      folder?.forEach((item) => {
        if (unique?.includes(item?.parent_uid)) {
          item.parent_uid = null;
        }
        newFolders?.push(item)
      })
    }
    return newFolders;
  }
}


const idCorrector = ({ id }) => {
  const newId = id?.replace(/[-{}]/g, (match) => match === '-' ? '' : '')
  if (newId) {
    return newId?.toLowerCase()
  } else {
    return id?.toLowerCase()
  }
}

const createFolder = () => {
  if (xml_folder?.length) {
    const allFolderJSON = [];
    xml_folder?.forEach((item) => {
      if (item?.includes("media library")) {
        if (item?.includes("/data.json") | item?.includes("/data.json.json")) {
          const folderRaw = item?.split("media library")?.[1]
          if (folderRaw) {
            const folderSplite = folderRaw?.split("/");
            if (folderSplite) {
              folderSplite?.forEach?.((key, index) => {
                if (key !== "" && !key?.includes(".json") && !exclude?.includes(key)) {
                  if (index === 1) {
                    allFolderJSON?.push({ name: key, isAsseteUid: key?.includes?.("{"), parentName: null })
                  } else {
                    allFolderJSON?.push({ name: key, isAsseteUid: key?.includes?.("{"), parentName: folderSplite?.[index - 1] })
                  }
                }
              })
            }
          }
        }
      }
    })
    const obj = {};
    const uids = {};
    if (allFolderJSON?.length) {
      allFolderJSON?.forEach((item) => {
        if (!item?.isAsseteUid) {
          obj[item?.name] = {
            parentName: item?.parentName
          }
        } else {
          if (uids?.[item?.parentName]) {
            uids[item?.parentName]?.push(item?.name)
          } else {
            uids[item?.parentName] = [item?.name]
          }
        }
      })
    }
    const finalObject = [];
    if (Object?.keys(obj)?.length && Object?.keys(uids)?.length) {
      for (const [key, value] of Object?.entries(obj)) {
        finalObject?.push({
          name: key,
          assetsUids: uids?.[key] ?? [],
          uid: uid(19),
          ...value
        })
      }
    }
    const folders = [];
    if (finalObject?.length) {
      finalObject?.forEach((item) => {
        const obj = {
          "urlPath": `/assets/${item?.uid}`,
          "uid": item?.uid,
          "content_type": "application/vnd.contenstack.folder",
          "tags": [],
          "name": validFolderName(item?.name),
          "is_dir": true,
          "parent_uid": null
        }
        const isPresent = finalObject?.find((ele) => item?.parentName === ele?.name)
        if (isPresent) {
          obj.parent_uid = isPresent?.uid
        }
        folders?.push(obj)
      })
    }
    let newFolder = cutFiveFolders(folders);
    if (newFolder?.length === (0 || undefined)) {
      newFolder = folders
    }
    if (newFolder?.length) {
      if (!fs.existsSync(`sitecoreMigrationData/assets`)) {
        fs.mkdirSync(path.join(
          process.cwd(),
          `sitecoreMigrationData/assets`
        ), { recursive: true });
      }
      helper.writeFile(
        path.join(
          process.cwd(),
          "sitecoreMigrationData/assets"
        ),
        JSON.stringify(newFolder, null, 4),
        "folders",
        (err) => {
          if (err) throw err;
        }
      );
      return newFolder;
    } else {
      return [];
      console.log("folders are not found.")
    }
  }
}

const AssetsPathSpliter = ({ path, id }) => {
  let newPath = path?.split(id)?.[0]
  if (newPath?.includes("media library/")) {
    newPath = newPath?.split("media library/")?.[1]
  }
  return newPath;
}

const getFolderName = ({ assetPath }) => {
  const name = assetPath?.split("/")
  if (name?.length) {
    return name[name?.length - 2]
  }
}

function ExtractAssets() {
  // const folders = createFolder();
  if (xml_folder?.length) {
    const allAssetJSON = {};
    xml_folder?.forEach((item) => {
      if (item?.includes("media library")) {
        if (item?.includes("/data.json") | item?.includes("/data.json.json")) {
          const assetMeta = helper.readFile(
            `${global.config.sitecore_folder}/${item}`
          );
          const mestaData = {}
          const assetPath = AssetsPathSpliter({ path: item, id: assetMeta?.item?.$?.id })
          const folderName = getFolderName({ assetPath })
          mestaData.uid = idCorrector({ id: assetMeta?.item?.$?.id });
          assetMeta?.item?.fields?.field?.forEach?.((field) => {
            if (field?.$?.key === "blob" && field?.$?.type === "attachment") {
              mestaData.id = field?.content?.replace(/[{}]/g, "")?.toLowerCase();
            }
            if (field?.$?.key === "extension") {
              mestaData.extension = field?.content;
            }
            if (field?.$?.key === "mime type") {
              mestaData.content_type = field?.content;
            }
            if (field?.$?.key === "size") {
              mestaData.size = field?.content;
            }
          })
          if (mestaData?.id && mestaData?.uid) {
            const newPath = global.config.sitecore_folder?.replace("items", "blob");
            const assetsPath = read(newPath);
            if (assetsPath?.length) {
              const isIdPresent = assetsPath?.find((ast) => ast?.includes(mestaData?.id));
              if (isIdPresent) {
                try {
                  const assets = fs.readFileSync(`${newPath}/${isIdPresent}`);
                  fs.mkdirSync(`${assetsSave}/files/${mestaData?.uid}`, { recursive: true });
                  fs.writeFileSync(
                    path.join(
                      process.cwd(),
                      `${assetsSave}/files/${mestaData?.uid}`,
                      `${assetMeta?.item?.$?.name}.${mestaData?.extension}`
                    )
                    , assets)
                } catch (err) {
                  console.error("🚀 ~ file: assets.js:52 ~ xml_folder?.forEach ~ err:", err)
                }
              } else {
                console.log("asstes id not found.")
              }
            } else {
              console.log("folder not contain assets.")
            }
            allAssetJSON[mestaData?.uid] = {
              urlPath: `/assets/${mestaData?.uid}`,
              uid: mestaData?.uid,
              content_type: mestaData?.content_type,
              file_size: mestaData.size,
              tags: [],
              filename: `${assetMeta?.item?.$?.name}.${mestaData?.extension}`,
              is_dir: false,
              parent_uid: null,
              title: assetMeta?.item?.$?.name,
              publish_details: [],
              assetPath
            }
            // const parentUid = folders?.find((item) => item?.name === folderName)
            // if (parentUid) {
            // sitecore 9 folder create  uid
            allAssetJSON[mestaData?.uid].parent_uid = "2146b0cee522cc3a38d"
            // }
          }
        }
      }
    })
    const fileMeta = { "1": "index.json" }
    const assetsFolder = [
      {
        "urlPath": "/assets/2146b0cee522cc3a38d",
        "uid": "2146b0cee522cc3a38d",
        "content_type": "application/vnd.contenstack.folder",
        "tags": [],
        "name": "Sitecore 9",
        "is_dir": true,
        "parent_uid": null
      }
    ];
    helper.writeFile(
      path.join(
        process.cwd(),
        "sitecoreMigrationData/assets"
      ),
      JSON.stringify(fileMeta, null, 4),
      "assets",
      (err) => {
        if (err) throw err;
      }
    );
    helper.writeFile(
      path.join(
        process.cwd(),
        "sitecoreMigrationData/assets"
      ),
      JSON.stringify(allAssetJSON, null, 4),
      "index",
      (err) => {
        if (err) throw err;
      }
    );
    helper.writeFile(
      path.join(
        process.cwd(),
        "sitecoreMigrationData/assets"
      ),
      JSON.stringify(assetsFolder, null, 4),
      "folders",
      (err) => {
        if (err) throw err;
      }
    );
  } else {
    console.log("Media File Not Found.")
  }
}


ExtractAssets.prototype = {
  start: function () {
    successLogger(`exporting Assets`);
  },
};



module.exports = ExtractAssets;