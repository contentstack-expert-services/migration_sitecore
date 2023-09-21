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

const cutFiveFolders = (folder) => {
  folder?.forEach((item) => {
    if (item?.parent_uid === null) {
      const allFolder = getfolders(folder, item?.uid)
      console.log("🚀 ~ file: assets.js:38 ~ folder?.forEach ~ allFolder:", allFolder)
    }
  })
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
          "name": item?.name,
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
    cutFiveFolders(folders);
    if (folders?.length) {
      helper.writeFile(
        path.join(
          process.cwd(),
          "sitecoreMigrationData/assets",
          "folders"
        ),
        JSON.stringify(folders, null, 4),
        (err) => {
          if (err) throw err;
        }
      );
      return folders;
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
  const folders = createFolder();
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
                  fs.mkdirSync(`${assetsSave}/${mestaData?.uid}`, { recursive: true });
                  fs.writeFileSync(
                    path.join(
                      process.cwd(),
                      `${assetsSave}/${mestaData?.uid}`,
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
            const parentUid = folders?.find((item) => item?.name === folderName)
            if (parentUid) {
              allAssetJSON[mestaData?.uid].parent_uid = parentUid?.uid
            }
          }
        }
      }
    })
    helper.writeFile(
      path.join(
        process.cwd(),
        "sitecoreMigrationData/assets",
        "assets"
      ),
      JSON.stringify(allAssetJSON, null, 4),
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