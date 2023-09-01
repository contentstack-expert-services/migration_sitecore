/**
 * External module Dependencies.
 */
var mkdirp = require("mkdirp"),
  path = require("path"),
  _ = require("lodash"),
  parseString = require("xml2js").parseString,
  fs = require("fs"),
  when = require("when");
  axios = require("axios")
  chalk = require('chalk')
 read = require("fs-readdir-recursive");
/**
 * Internal module Dependencies .
 */
var helper = require("../utils/helper");
var json_file = []
var xml_folder = read(global.config.sitecore_folder)
for (let i = 0 ; i < xml_folder.length; i++) {
  if (xml_folder[i].includes('data.json')) {
    json_file.push(xml_folder[i])
  }
}

var assetConfig = config.modules.asset,
  assetFolderPath = path.resolve(config.data, assetConfig.dirName)
  assetMasterFolderPath = path.resolve(process.cwd(), "logs", "assets")

if (!fs.existsSync(assetFolderPath)) {
  mkdirp.sync(assetFolderPath);
  helper.writeFile(path.join(assetFolderPath, assetConfig.fileName));
  mkdirp.sync(assetMasterFolderPath);
  helper.writeFile(path.join(assetMasterFolderPath, "failed.json"));
} else {
  if (!fs.existsSync(path.join(assetFolderPath, assetConfig.fileName)))
    helper.writeFile(path.join(assetFolderPath, assetConfig.fileName));
    helper.writeFile(path.join(assetMasterFolderPath, "failed.json"));
}
//Reading a File
var assetData = helper.readFile(
  path.join(assetFolderPath, assetConfig.fileName)
);
var failedJSON = helper.readFile(path.join(assetMasterFolderPath, "failed.json")) || {};


// var assetMapping = helper.readFile(
//   path.join(assetMasterFolderPath, assetConfig.fileName)
// );
// var assetURLMapping = helper.readFile(
//   path.join(assetMasterFolderPath, assetConfig.masterfile)
// );

function ExtractAssets() {
}

ExtractAssets.prototype = {
  saveAsset: function (assets, retryCount) {
    var self = this;
    return when.promise(async function (resolve, reject) {
      var urlContent = assets["content"]
      var name = urlContent.includes('mediapath') &&  urlContent.split('"')[1].replace(/(\r\n|\n|\r)/gm, "").replace(/\s\s+/g, " ").replace(/\s/g, "-")
      var assetUid = urlContent.includes('mediapath') && urlContent.split('"')[3].replace(/{/g, "").replace(/}/g, "_")
      var url = name && !name?.includes('{') && `https://cdn.plaisio.gr/mms${name}.pdf`;
      name = name && name?.split('/')
      if (typeof url !== 'boolean') {
      url = url && encodeURI(url)
      if (
        fs.existsSync(
          path.resolve(assetFolderPath, assets?.$?.tfid.toString(), 'test.pdf')
        )
      ) {
        successLogger(
          "asset already present " + "'" + assets?.$?.tfid+ "'"
        );
        resolve(assets?.$?.tfid);
      } else {
        try {
          const response = await axios.get(url, {
            responseType: "arraybuffer",
          });
          mkdirp.sync(path.resolve(assetFolderPath, `assets_${assetUid}`));
          fs.writeFileSync(
            path.join(assetFolderPath, `assets_${assetUid}`, name[name.length - 1] + '.pdf'),
            response.data
          );
          assetData[`assets_${assetUid}`] = {
            uid: `assets_${assetUid}`,
            status: true,
            tag: [],
            filename: name[name.length - 1],
            url: url,
            is_dir: false,
            parent_uid: null,
            _version: 1,
            title: name[name.length - 1],
            publish_details: [],
          };

          // assetMapping[`assets_${assets?.$.tfid}`] = "";
          // assetURLMapping[url] = "";
          if (failedJSON[`assets_${assetUid}`]) {
            delete failedJSON[`assets_${assetUid}`];
          }
          helper.writeFile(
            path.join(assetFolderPath, assetConfig.fileName),
            JSON.stringify(assetData, null, 4)
          );
          console.log(
            "An asset with id",
            chalk.green(`${assetUid}`),
            "and name",
            chalk.green(`${name[name.length - 1]}`),
            "got downloaded successfully."
          );
        } catch (error) {
          // if (failedAssets.indexOf(`assets_${assets?.$.tfid}`) == -1) {
          //   self.retryFailedAssets(assets?.$.tfid);
          // }
          failedJSON[`assets_${assetUid}`] = {
            failedUid: assetUid,
            name: name[name.length - 1],
            url: url,
            // file_size: assets["filesize"],
            reason_for_error: error.message,
          };
          helper.writeFile(
            path.join(assetMasterFolderPath, "failed.json"),
            JSON.stringify(failedJSON, null, 4)
          );
          console.error(
            "Failed to download asset with id",
            chalk.red(`${assetUid.toString()}`),
            "and name",
            chalk.red(`${name[name.length - 1]}`),
            `: ${error}`
          );
        }
      }
      } 
    })
  },
  getAsset: function (attachments) {
    var self = this;
    return when.promise(function (resolve, reject) {
      var _getAsset = [];
      for (var i = 0; i < attachments.length; i++) {
        _getAsset.push(
          (function (data) {
            return self.saveAsset(data, 0);
          })(attachments[i])
        );
      }
      var taskResults = attachments
      taskResults
        .then(function (results) {
          helper.writeFile(
            path.join(assetFolderPath, assetConfig.fileName),
            JSON.stringify(assetData, null, 4)
          );
          resolve(results);
        })
        .catch(function (e) {
          errorLogger("failed to download assets: ", e);
          resolve();
        });
    });
  },
  getAllAssets: function () {
    var self = this;
    return when.promise(function (resolve, reject) {
          var assetDetails = [];
      for (var i = 0; i < xml_folder.length; i++) {
        if(xml_folder[i].includes('data.json')) {
          var filePath = path.join(global.config.sitecore_folder,xml_folder[i])
          var alldata = helper.readFile(filePath)
          var assets = alldata
          assets?.item?.fields?.field?.map((asset) => {
            if (asset?.$?.type == "File") {
              assetDetails.push(asset);
            } else {
              console.log(chalk.red('No Assets Found'));
            }
          });
        }} 
        self
          .getAsset(assetDetails, assetDetails.length)
          .then(function () {
            resolve();
          })
          .catch(function () {
            reject();
          });
    });
  },
  start: function () {
    var self = this;
    return when.promise(function (resolve, reject) {
      self
        .getAllAssets()
        .then(function () {
          resolve();
        })
        .catch(function () {
          reject();
        })
    });
  },
};

module.exports = ExtractAssets;
