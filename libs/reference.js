const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const read = require("fs-readdir-recursive");
const helper = require("../utils/helper");
const contentConfig = config.modules.contentTypes;
const xml_folder = read(global.config.sitecore_folder);
contentFolderPath = path.resolve(config.data, config.contenttypes) || {};


function ExtractRef() {
  const basePages = helper.readFile(path.join(process.cwd(), "/sitecoreMigrationData/MapperData/base.json"))
  const contentTypeKeys = helper.readFile(path.join(process.cwd(), "/sitecoreMigrationData/MapperData/contentTypeKey.json"))
  const contentTypesPaths = read(contentFolderPath);
  if (contentTypesPaths?.length && basePages && contentTypeKeys) {
    contentTypesPaths?.forEach((item) => {
      const contentType = helper.readFile(`${contentFolderPath}/${item}`)
      if (contentType?.id) {
        const itHasBasePresent = basePages[contentType?.id];
        if (itHasBasePresent?.content) {
          const references = itHasBasePresent?.content?.split("|");
          if (references?.length) {
            const uids = [];
            references?.forEach((ref) => {
              const singleRef = contentTypeKeys?.[ref];
              if (singleRef) {
                uids?.push(singleRef);
              }
            })
            if (uids?.length) {
              const schemaObject = {
                "data_type": "reference",
                "display_name": "Reference",
                "reference_to": uids,
                "field_metadata": {
                  "ref_multiple": true,
                  "ref_multiple_content_types": true
                },
                "uid": "reference",
                "mandatory": false,
                "multiple": false,
                "non_localizable": false,
                "unique": false
              };
              contentType.schema.push(schemaObject)
              helper.writeFile(
                path.join(
                  process.cwd(),
                  "sitecoreMigrationData/content_types",
                  contentType?.uid
                ),
                JSON.stringify(contentType, null, 4),
                (err) => {
                  if (err) throw err;
                }
              );
            }
          }
        }
      }
    })
  }
}


ExtractRef.prototype = {
  start: function () {
    successLogger(`exporting content-types`);
  },
};

module.exports = ExtractRef;