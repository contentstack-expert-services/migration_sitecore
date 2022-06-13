/**
 * External module Dependencies.
 */
var mkdirp = require("mkdirp"),
  path = require("path"),
  _ = require("lodash"),
  fs = require("fs"),
  parseString = require("xml2js").parseString,
  when = require("when");

const cliProgress = require("cli-progress");
const colors = require("ansi-colors");
const chalk = require("chalk");

/**
 * Internal module Dependencies.
 */
var helper = require("../utils/helper");

var termsConfig = config.modules.terms,
  termsFolderPath = path.resolve(
    config.data,
    config.entryfolder,
    termsConfig.dirName
  ),
  masterFolderPath = path.resolve(config.data, "master", config.entryfolder);

/**
 * Create folders and files
 */
if (!fs.existsSync(termsFolderPath)) {
  mkdirp.sync(termsFolderPath);
  helper.writeFile(path.join(termsFolderPath, termsConfig.fileName));
  mkdirp.sync(masterFolderPath);
  helper.writeFile(
    path.join(masterFolderPath, termsConfig.masterfile),
    '{"en-us":{}}'
  );
}

function ExtractTerms() {
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

ExtractTerms.prototype = {
  customBar: null,
  initalizeLoader: function () {
    this.customBar = new cliProgress.SingleBar({
      format:
        "{title}|" +
        colors.cyan("{bar}") +
        "|  {percentage}%  || {value}/{total} completed",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    });
  },
  destroyLoader: function () {
    if (this.customBar) {
      this.customBar.stop();
    }
  },
  saveTerms: function (termsDetails) {
    var self = this;
    return when.promise(function (resolve, reject) {
      self.customBar.start(termsDetails.length, 0, {
        title: "Migrating Terms      ",
      });
      var termsdata = helper.readFile(
        path.join(termsFolderPath, termsConfig.fileName)
      );
      var termsmaster = helper.readFile(
        path.join(masterFolderPath, termsConfig.masterfile)
      );
      termsDetails.map(function (data, index) {
        var title = data["term_name"];
        var uid = `terms_${data["id"]}`;
        var taxonomy = data["term_taxonomy"] || "";
        var url = "/terms/" + uid;
        var slug = data["term_slug"];

        termsdata[uid] = {
          uid: uid,
          title: title,
          url: url,
          taxonomy: taxonomy,
          slug: slug,
        };
        self.customBar.increment();
      });
      helper.writeFile(
        path.join(termsFolderPath, termsConfig.fileName),
        JSON.stringify(termsdata, null, 4)
      );
      helper.writeFile(
        path.join(masterFolderPath, termsConfig.masterfile),
        JSON.stringify(termsmaster, null, 4)
      );
      // console.log(
      //   chalk.green(`${termsDetails.length} Terms exported successfully`)
      // );
      resolve();
    });
  },
  getAllTerms: function () {
    var self = this;
    return when.promise(function (resolve, reject) {
      var termsname;
      if (filePath) {
        //if user provide custom name of category
        if (fs.existsSync(filePath)) {
          termsname = fs.readFileSync(filePath, "utf-8");
        }
      }
      if (termsname) {
        termsname = termsname.split(",");
      }
      var alldata = helper.readFile(
        path.join(config.data, config.json_filename)
      );
      var terms = alldata.rss.channel["wp:term"];
      var termsArrray = [];
      if (terms && terms.length > 0) {
        terms.map(function (terminfo) {
          termsArrray.push({
            id: terminfo["wp:term_id"],
            term_name: terminfo["wp:term_name"],
            term_slug: terminfo["wp:term_slug"],
            term_taxonomy: terminfo["wp:term_taxonomy"],
          });
        });
        if (termsArrray.length > 0) {
          self.saveTerms(termsArrray);
          resolve();
        } else {
          console.log(chalk.red("\nno terms found"));
          resolve();
        }
      } else {
        console.log(chalk.red("\nno terms found"));
        resolve();
      }
    });
  },
  start: function () {
    var self = this;
    this.initalizeLoader();
    return when.promise(function (resolve, reject) {
      self
        .getAllTerms()
        .then(function () {
          resolve();
        })
        .catch(function () {
          reject();
        })
        .finally(function () {
          self.destroyLoader();
        });
    });
  },
};

module.exports = ExtractTerms;
