/**
 * External module Dependencies.
 */
var mkdirp = require("mkdirp"),
  path = require("path"),
  fs = require("fs"),
  _ = require("lodash");

/**
 * Internal module Dependencies .
 */
var helper = require("../utils/helper");

var authorConfig = config.contentmodules.article,
  authorsFolderPath = path.resolve(config.data, config.contenttypes) || {};

/**
 * Create folders and files if they are not created
 */

if (!fs.existsSync(authorsFolderPath)) {
  mkdirp.sync(authorsFolderPath);
  helper.writeFile(path.join(authorsFolderPath, authorConfig.fileName));
}

function ExtractAuthors() {
  var authorsSchema = {
    "created_at": "2023-02-14T11:00:32.747Z",
    "updated_at": "2023-02-14T11:47:32.576Z",
    "title": "IR( From JSON file)",
    "uid": "ir_from_json_file",
    "_version": 4,
    "inbuilt_class": false,
    "schema": [
      {
        "data_type": "text",
        "display_name": "Title",
        "field_metadata": { "_default": true, "version": 3 },
        "mandatory": true,
        "uid": "title",
        "unique": true,
        "multiple": false,
        "non_localizable": false
      },
      {
        "data_type": "text",
        "display_name": "Single Line Textbox",
        "uid": "single_line",
        "field_metadata": {
          "description": "",
          "default_value": "",
          "version": 3
        },
        "format": "",
        "error_messages": { "format": "" },
        "mandatory": false,
        "multiple": false,
        "non_localizable": false,
        "unique": false
      },
      {
        "data_type": "isodate",
        "display_name": "Date",
        "uid": "date",
        "startDate": null,
        "endDate": null,
        "field_metadata": { "description": "", "default_value": {} },
        "mandatory": false,
        "multiple": false,
        "non_localizable": false,
        "unique": false
      },
      {
        "data_type": "file",
        "display_name": "File",
        "uid": "file",
        "extensions": [],
        "field_metadata": { "description": "", "rich_text_type": "standard" },
        "mandatory": false,
        "multiple": false,
        "non_localizable": false,
        "unique": false
      }
    ],
    "last_activity": {},
    "maintain_revisions": true,
    "description": "",
    "DEFAULT_ACL": [
      { "k": "others", "v": { "read": false, "create": false } },
      {
        "k": "users.blt080c5ca01d3982e6",
        "v": { "read": true, "sub_acl": { "read": true } }
      }
    ],
    "SYS_ACL": { "roles": [] },
    "options": {
      "is_page": false,
      "singleton": true,
      "sub_title": [],
      "title": "title"
    },
    "abilities": {
      "get_one_object": true,
      "get_all_objects": true,
      "create_object": true,
      "update_object": true,
      "delete_object": true,
      "delete_all_objects": true
    }
  };

  helper.writeFile(
    path.join(
      process.cwd(),
      "csMigrationData/content_types",
      authorConfig.fileName
    ),
    JSON.stringify(authorsSchema, null, 4),
    (err) => {
      if (err) throw err;
    }
  );
}

ExtractAuthors.prototype = {
  start: function () {},
};

module.exports = ExtractAuthors;
