var mkdirp = require("mkdirp"),
  path = require("path"),
  _ = require("lodash"),
  fs = require("fs"),
  parseString = require("xml2js").parseString,
  when = require("when");

const read = require("fs-readdir-recursive");
/**
 * Internal module Dependencies.
 */
var helper = require("../utils/helper");
var xml_folder = read(global.config.sitecore_folder)

var entriesConfig = config.modules.entries,
  entriesFolderPath = path.resolve(config.data, config.entryfolder) || {};

/**
 * Create folders and files if they are not created
 */

if (!fs.existsSync(entriesFolderPath)) {
  mkdirp.sync(entriesFolderPath);
  helper.writeFile(path.join(entriesFolderPath, entriesConfig.fileName));
}

function ExtractEntries() {}

ExtractEntries.prototype = {
  getEntries: function (data) {
    var dataField =  data?.item?.fields?.field
    return when.promise(function (resolve, reject) {
      var entryData = helper.readFile(
        path.join(entriesFolderPath, entriesConfig.fileName)
      );
      console.log(dataField, 'dataField')
      dataField?.length > 0 &&
        dataField.map((el) => {
          var uid = 'group_structure'
          console.log(el?.$?.key == 'title', 'el?.$?.key')
            entryData[uid] = {
              uid : uid,
              title : el?.$?.key == 'title' ? el?.content : '',
              url:  `/ir/${uid}`,
            }
        // })

        helper.writeFile(
          path.join(entriesFolderPath, entriesConfig.fileName),
          JSON.stringify(entryData, null, 4)
        );
        resolve();
      });
    });
  },

  start: function () {
    var self = this;
    successLogger(`exporting entries`);
    return when.promise(function (resolve, reject) {
      for (var i = 0; i < xml_folder.length; i++) {
        if(xml_folder[i].includes('data.json')) {
          var filePath = path.join(global.config.sitecore_folder,xml_folder[i])
          var alldata = helper.readFile(filePath)
          var homeEntry = alldata?.item?.$.key === 'group structure' && alldata
          if (typeof homeEntry !== "boolean")
          self
          .getEntries(homeEntry)
          .then(function () {
            resolve();
          })
          .catch(function (error) {
            console.log("error", error);
            reject();
          });
        }} 
      // console.log(homeEntry, 'homeEntry')
    });
  },
};

module.exports = ExtractEntries