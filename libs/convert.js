/**
 * External module Dependencies.
 */
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

/**
 * Create folders and files if they are not created
 */


function ExtractFiles() {
  if (!fs.existsSync(path.join(process.cwd(), config.data))) {
    mkdirp.sync(path.join(process.cwd(), config.data));
    for (let i = 0; i < xml_folder.length; i++) {
      const xml_data = `${global.config.sitecore_folder}/`.concat(xml_folder[i])
      const json_data = xml_data.replace('/xml', '')
      if (!fs.existsSync(path.resolve(json_data, config.json_filename))) {
        parseString(helper.readXMLFile(xml_data), { explicitArray: false }, function (err, result) {
          if (err) {
            errorLogger("failed to parse xml: ", err);
          } else {
            const filePath = path.join(json_data, cofig?.json_filename)
            fs.writeFileSync(`${filePath}.json`, JSON.stringify(result, null, 4), "utf-8");
          }
        })
      } else {
        fs.unlink(path.resolve(json_data, config.json_filename), (err) => {
          if (err) throw err;
        });
      }
    }
  } else {
    for (let i = 0; i < xml_folder.length; i++) {
      if (xml_folder?.[i]?.includes?.("/xml")) {
        const xml_data = `${global.config.sitecore_folder}/${xml_folder?.[i]}`
        const json_data = xml_data.replace('/xml', '')
        if (!fs.existsSync(path.resolve(json_data, config.json_filename))) {
          parseString(helper.readXMLFile(xml_data), { explicitArray: false }, function (err, result) {
            if (err) {
              errorLogger("failed to parse xml: ", err);
            } else {
              const filePath = path.join(json_data, config?.json_filename)
              fs.writeFileSync(filePath, JSON.stringify(result, null, 4), "utf-8");
            }
          })
        } else {
          fs.unlink(path.resolve(json_data, config.json_filename), (err) => {
            if (err) {
              console.log(err)
              throw err
            }
            console.log('File was deleted');
          });
        }
      }
    }
  }
}

ExtractFiles.prototype = {
  start: function () {
    var self = this;
    return when.promise(function (resolve, reject) {
      resolve()
    })
  },
}


module.exports = ExtractFiles;