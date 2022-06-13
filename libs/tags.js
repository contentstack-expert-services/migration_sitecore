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

var tagsConfig = config.modules.tag,
  tagsFolderPath = path.resolve(
    config.data,
    config.entryfolder,
    tagsConfig.dirName
  ),
  masterFolderPath = path.resolve(config.data, "master", config.entryfolder);

/**
 * Create folders and files
 */
if (!fs.existsSync(tagsFolderPath)) {
  mkdirp.sync(tagsFolderPath);
  helper.writeFile(path.join(tagsFolderPath, tagsConfig.fileName));
  mkdirp.sync(masterFolderPath);
  helper.writeFile(
    path.join(masterFolderPath, tagsConfig.masterfile),
    '{"en-us":{}}'
  );
}

function ExtractTags() {
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

ExtractTags.prototype = {
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
  saveTags: function (tagDetails) {
    var self = this;
    return when.promise(function (resolve, reject) {
      self.customBar.start(tagDetails.length, 0, {
        title: "Migrating Tags       ",
      });
      var tagdata = helper.readFile(
        path.join(tagsFolderPath, tagsConfig.fileName)
      );
      var tagmaster = helper.readFile(
        path.join(masterFolderPath, tagsConfig.masterfile)
      );
      tagDetails.map(function (data, index) {
        var title = data["tag_name"];
        var uid = `tags_${data["id"]}`;
        var slug = data["tag_slug"];
        var description = data["description"] || "";
        var url = "/tags/" + uid;
        tagdata[uid] = {
          uid: uid,
          title: title,
          url: url,
          slug: slug,
          description: description,
        };
        self.customBar.increment();
      });
      helper.writeFile(
        path.join(tagsFolderPath, tagsConfig.fileName),
        JSON.stringify(tagdata, null, 4)
      );
      helper.writeFile(
        path.join(masterFolderPath, tagsConfig.masterfile),
        JSON.stringify(tagmaster, null, 4)
      );
      // console.log(
      //   chalk.green(`${tagDetails.length} Tags exported successfully`)
      // );
      resolve();
    });
  },
  getAllTags: function () {
    var self = this;
    return when.promise(function (resolve, reject) {
      var tagsname;
      if (filePath) {
        //if user provide custom name of category
        if (fs.existsSync(filePath)) {
          tagsname = fs.readFileSync(filePath, "utf-8");
        }
      }
      if (tagsname) {
        tagsname = tagsname.split(",");
      }
      var alldata = helper.readFile(
        path.join(config.data, config.json_filename)
      );
      var tags = alldata.rss.channel["wp:tag"];
      var tagsArrray = [];
      if (tags && tags.length > 0) {
        tags.map(function (taginfo) {
          tagsArrray.push({
            id: taginfo["wp:term_id"],
            tag_name: taginfo["wp:tag_name"],
            tag_slug: taginfo["wp:tag_slug"],
            description: taginfo["wp:tag_description"],
          });
        });
        if (tagsArrray.length > 0) {
          self.saveTags(tagsArrray);
          resolve();
        } else {
          console.log(chalk.red("\nno tags found"));
          resolve();
        }
      } else {
        console.log(chalk.red("\nno tags found"));
        resolve();
      }
    });
  },
  start: function () {
    var self = this;
    this.initalizeLoader();
    return when.promise(function (resolve, reject) {
      self
        .getAllTags()
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

module.exports = ExtractTags;
