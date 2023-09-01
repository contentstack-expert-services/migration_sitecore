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
const assetsSave = "sitecoreMigrationData/assets"




function ExtractAssets() {
  if (xml_folder?.length) {
    const allAssetJSON = {};
    xml_folder?.forEach((item) => {
      if (item?.includes("media library")) {
        if (item?.includes("/data.json") | item?.includes("/data.json.json")) {
          const assetMeta = helper.readFile(
            `${global.config.sitecore_folder}/${item}`
          );
          const mestaData = {}
          mestaData.uid = assetMeta?.item?.$?.id?.replace(/[{}]/g, "")
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
              title: assetMeta?.item?.$?.name
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