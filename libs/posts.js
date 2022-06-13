/**
 * External module Dependencies.
 */
var mkdirp = require("mkdirp"),
  path = require("path"),
  _ = require("lodash"),
  fs = require("fs"),
  parseString = require("xml2js").parseString,
  when = require("when");
const { JSDOM } = require("jsdom");
const { htmlToJson } = require("@contentstack/json-rte-serializer");

const cliProgress = require("cli-progress");
const colors = require("ansi-colors");
const chalk = require("chalk");
/**
 * Internal module Dependencies.
 */
var helper = require("../utils/helper");

var postConfig = config.modules.posts,
  postFolderPath = path.resolve(
    config.data,
    config.entryfolder,
    postConfig.dirName
  ),
  folderpath = path.resolve(config.data, config.modules.asset.dirName),
  masterFolderPath = path.resolve(config.data, "master", config.entryfolder);

//Creating a asset folder if we run this first
if (!fs.existsSync(folderpath)) {
  mkdirp.sync(folderpath);
}
helper.writeFile(path.join(folderpath, config.modules.asset.featuredfileName));

if (!fs.existsSync(postFolderPath)) {
  mkdirp.sync(postFolderPath);
  helper.writeFile(path.join(postFolderPath, postConfig.fileName));
  mkdirp.sync(masterFolderPath);
  helper.writeFile(
    path.join(masterFolderPath, postConfig.masterfile),
    '{"en-us":{}}'
  );
}
function ExtractPosts() {
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

ExtractPosts.prototype = {
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
  featuredImageMapping: function (postid, post, postdata) {
    var assetsId = helper.readFile(
      path.join(process.cwd(), "csMigrationData/assets/assets.json")
    );
    let assetsDetails = [];
    if (post["wp:postmeta"]) {
      var postmeta = post["wp:postmeta"];
      if (Array.isArray(postmeta)) {
        postmeta.map(function (meta, index) {
          if (meta["wp:meta_key"] == "_thumbnail_id") {
            var attachmentid = `assets_${meta["wp:meta_value"]}`;
            // to match the asset id from the asset json and the attachementid
            Object.keys(assetsId).forEach((key) => {
              if (attachmentid === assetsId[key].uid) {
                assetsDetails.push(assetsId[key]); // to push the key which we got from match
              }
            });
            var data = helper.readFile(
              path.join(folderpath, config.modules.asset.featuredfileName)
            );

            data[postid] = attachmentid;
            helper.writeFile(
              path.join(folderpath, config.modules.asset.featuredfileName),
              JSON.stringify(data, null, 4)
            );
            postdata[postid]["featured_image"] = assetsDetails;
          }
        });
      } else {
        if (postmeta["wp:meta_key"]) {
          if (postmeta["wp:meta_key"] == "_thumbnail_id") {
            var attachmentid = postmeta["wp:meta_value"];
            // to match the asset id from the asset json and the attachementid
            Object.keys(assetsId).forEach((key) => {
              if (attachmentid === assetsId[key].uid) {
                assetsDetails.push(assetsId[key]); // to push the key which we got from match
              }
            });
            var data = helper.readFile(
              path.join(folderpath, config.modules.asset.featuredfileName)
            );
            data[postid] = attachmentid;
            helper.writeFile(
              path.join(folderpath, config.modules.asset.featuredfileName),
              JSON.stringify(data, null, 4)
            );
            postdata[postid]["featured_image"] = assetsDetails;
          }
        }
      }
    }
  },
  savePosts: function (postsDetails, blog_base_url) {
    var self = this;
    return when.promise(function (resolve, reject) {
      self.customBar.start(postsDetails.length, 0, {
        title: "Migrating Posts      ",
      });
      var authorId = helper.readFile(
        path.join(process.cwd(), "csMigrationData/entries/authors/en-us.json")
      );

      var referenceId = helper.readFile(
        path.join(process.cwd(), "csMigrationData/entries/reference/en-us.json")
      );

      var postdata = helper.readFile(
        path.join(postFolderPath, postConfig.fileName)
      );
      var postmaster = helper.readFile(
        path.join(masterFolderPath, postConfig.masterfile)
      );
      postsDetails.map(function (data, index) {
        let typeArray = ["post", "attachment", "nav_menu_item"];
        if (typeArray.includes(data["wp:post_type"])) {
          let statusArray = ["publish", "inherit"];
          if (statusArray.includes(data["wp:status"])) {
            var postAuthor = [],
              postCategories = [],
              postTags = [],
              postTerms = [];
            var categories = data["category"];
            if (Array.isArray(categories)) {
              // to match the referenceId with the nicename
              Object.keys(referenceId).forEach((key) => {
                if (
                  data["category"].find(
                    (el) => el["$"]["nicename"] === referenceId[key].slug
                  )
                ) {
                  if (referenceId[key].content_type === "terms") {
                    postTerms.push({
                      uid: key,
                      _content_type_uid: referenceId[key].content_type,
                    });
                  } else if (referenceId[key].content_type === "tag") {
                    postTags.push({
                      uid: key,
                      _content_type_uid: referenceId[key].content_type,
                    });
                  } else {
                    postCategories.push({
                      uid: key,
                      _content_type_uid: referenceId[key].content_type,
                    });
                  }
                }
              });
            } else {
              if (categories !== undefined)
                if (categories["$"]["domain"] !== "category") {
                  Object.keys(referenceId).forEach((key) => {
                    if (categories["$"]["nicename"] === referenceId[key].slug) {
                      if (referenceId[key].content_type === "terms") {
                        postTerms.push({
                          uid: key,
                          _content_type_uid: referenceId[key].content_type,
                        });
                      } else if (referenceId[key].content_type === "tag") {
                        postTags.push({
                          uid: key,
                          _content_type_uid: referenceId[key].content_type,
                        });
                      } else {
                        postCategories.push({
                          uid: key,
                          _content_type_uid: referenceId[key].content_type,
                        });
                      }
                    }
                  });
                }
            }

            Object.keys(authorId).forEach((key) => {
              if (
                data["dc:creator"].split(",").join("") === authorId[key].title
              ) {
                postAuthor.push({ uid: key, _content_type_uid: "authors" });
              }
            });

            // for HTML RTE to JSON RTE convert
            const dom = new JSDOM(
              data["content:encoded"]
                .replace(/<!--.*?-->/g, "")
                .replace(/&lt;!--?\s+\/?wp:.*?--&gt;/g, "")
              // .replace(/<\/?fragment*?>/g, "")
            );
            let htmlDoc = dom.window.document.querySelector("body");
            const jsonValue = htmlToJson(htmlDoc);
            var date = new Date(data["wp:post_date_gmt"]);
            //to calculate url
            var base = blog_base_url.split("/");
            var len = base.length;
            var blogname;

            if (base[len - 1] == "") {
              blogname = base[len - 2];
            } else {
              blogname = base[len - 1];
            }
            var url = data["link"];
            var index = url.indexOf(blogname);
            url = url.split(blogname);
            url = url[1];
            postdata[`posts_${data["wp:post_id"]}`] = {
              title: data["title"],
              uid: `posts_${data["wp:post_id"]}`,
              url: url,
              author: postAuthor,
              category: postCategories,
              date: date.toISOString(),
              full_description: jsonValue,
              excerpt: data["excerpt:encoded"]
                .replace(/<!--.*?-->/g, "")
                .replace(/&lt;!--?\s+\/?wp:.*?--&gt;/g, ""),
              tag: postTags,
              terms: postTerms,
            };
            postmaster["en-us"][data["wp:post_id"]] = "";
            self.featuredImageMapping(
              `posts_${data["wp:post_id"]}`,
              data,
              postdata
            );
          }
        }
        self.customBar.increment();
      });
      helper.writeFile(
        path.join(postFolderPath, postConfig.fileName),
        JSON.stringify(postdata, null, 4)
      );
      helper.writeFile(
        path.join(masterFolderPath, postConfig.masterfile),
        JSON.stringify(postmaster, null, 4)
      );
      // console.log(
      //   chalk.green(`${postsDetails.length} Posts exported successfully`)
      // );
      resolve();
    });
  },
  getAllPosts: function () {
    var self = this;
    return when.promise(function (resolve, reject) {
      var alldata = helper.readFile(
        path.join(config.data, config.json_filename)
      );
      var blog_base_url = alldata.rss.channel["wp:base_blog_url"];
      var posts = alldata.rss.channel["item"];
      if (posts) {
        if (posts.length > 0) {
          if (!filePath) {
            self.savePosts(posts, blog_base_url);
            resolve();
          } else {
            var postids = [];
            if (fs.existsSync(filePath)) {
              postids = fs.readFileSync(filePath, "utf-8").split(",");
            }
            if (postids.length > 0) {
              var postsdetails = [];
              postids.map(function (post, index) {
                var index = _.findIndex(posts, { "wp:post_id": post });
                if (index != -1) postsdetails.push(posts[index]);
              });
              if (postsdetails.length > 0) {
                self.savePosts(postsdetails, blog_base_url);
                resolve();
              } else {
                resolve();
              }
            } else {
              resolve();
            }
          }
        } else {
          console.log(chalk.red("\nno posts found"));
          resolve();
        }
      } else {
        console.log(chalk.red("\nno posts found"));
        resolve();
      }
    });
  },
  start: function () {
    // successLogger("exporting posts...");
    var self = this;
    this.initalizeLoader();
    return when.promise(function (resolve, reject) {
      self
        .getAllPosts()
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

module.exports = ExtractPosts;
