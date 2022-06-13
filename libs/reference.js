/**
 * External module Dependencies.
 */
var mkdirp = require("mkdirp"),
  path = require("path"),
  _ = require("lodash"),
  fs = require("fs"),
  parseString = require("xml2js").parseString,
  when = require("when");

/**
 * Internal module Dependencies.
 */
var helper = require("../utils/helper");

var referenceConfig = config.modules.references,
  referenceFolderPath = path.resolve(
    config.data,
    config.entryfolder,
    referenceConfig.dirName
  );

/**
 * Create folders and files
 */
if (!fs.existsSync(referenceFolderPath)) {
  mkdirp.sync(referenceFolderPath);
  helper.writeFile(path.join(referenceFolderPath, referenceConfig.fileName));
}

function ExtractReference() {
  if (!fs.existsSync(path.join(config.data, config.json_filename))) {
    var xml_data = helper.readXMLFile(config.xml_filename);
    parseString(xml_data, { explicitArray: false }, function (err, result) {
      if (err) {
        errorLogger("failed to parse xml: ", err);
      } else {
        helper.writeFile(
          path.join(config.data, config.json_filename),
          JSON.stringify(result, null, 4)
        );
      }
    });
  }
}

ExtractReference.prototype = {
  saveReference: function (referenceDetails) {
    return when.promise(function (resolve, reject) {
      var referenceData = helper.readFile(
        path.join(referenceFolderPath, referenceConfig.fileName)
      );

      referenceDetails.map(function (data, index) {
        var uid = data["id"];
        var slug = data["slug"];
        var content_type = data["content_type"] || "";
        // this is for reference purpose
        referenceData[uid] = {
          uid: uid,
          slug: slug,
          content_type: content_type,
        };
      });
      helper.writeFile(
        path.join(referenceFolderPath, referenceConfig.fileName),
        JSON.stringify(referenceData, null, 4)
      );

      resolve();
    });
  },
  getAllreference: function () {
    var self = this;
    return when.promise(function (resolve, reject) {
      var referencename;
      if (filePath) {
        //if user provide custom name of category
        if (fs.existsSync(filePath)) {
          referencename = fs.readFileSync(filePath, "utf-8");
        }
      }
      if (referencename) {
        referencename = referencename.split(",");
      }
      var alldata = helper.readFile(
        path.join(config.data, config.json_filename)
      );
      var referenceTags = alldata.rss.channel["wp:tag"];
      var referenceTerms = alldata.rss.channel["wp:term"];
      var referenceCategories = alldata.rss.channel["wp:category"];
      var referenceArrray = [];
      if (
        (referenceTags && referenceTags.length > 0) ||
        (referenceTerms && referenceTerms.length > 0) ||
        (referenceCategories && referenceCategories.length > 0)
      ) {
        referenceTags.map(function (taginfo) {
          referenceArrray.push({
            id: `tags_${taginfo["wp:term_id"]}`,
            slug: taginfo["wp:tag_slug"],
            content_type: "tag",
          });
        });
        referenceTerms.map(function (terminfo) {
          referenceArrray.push({
            id: `terms_${terminfo["wp:term_id"]}`,
            slug: terminfo["wp:term_slug"],
            content_type: "terms",
          });
        });
        referenceCategories.map(function (catinfo) {
          referenceArrray.push({
            id: `category_${catinfo["wp:term_id"]}`,
            slug: catinfo["wp:category_nicename"],
            content_type: "categories",
          });
        });
        if (referenceArrray.length > 0) {
          self.saveReference(referenceArrray);
          resolve();
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  },
  start: function () {
    var self = this;
    return when.promise(function (resolve, reject) {
      self
        .getAllreference()
        .then(function () {
          resolve();
        })
        .catch(function () {
          reject();
        });
    });
  },
};

module.exports = ExtractReference;
