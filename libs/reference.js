const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const read = require("fs-readdir-recursive");
const helper = require("../utils/helper");
const restrictedUid = require("../utils");
const contentConfig = config.modules.contentTypes;
const xml_folder = read(global.config.sitecore_folder);
contentFolderPath = path.resolve(config.data, config.contenttypes) || {};

function startsWithNumber(str) {
  return /^\d/.test(str);
}

const uidCorrector = ({ uid }) => {
  if (startsWithNumber(uid)) {
    return `${append}_${_.replace(uid, new RegExp("[ -]", "g"), '_')?.toLowerCase()}`
  }
  return _.replace(uid, new RegExp("[ -]", "g"), '_')?.toLowerCase()
}

const emptyGlobalFiled = () => {
  helper.writeFile(
    path.join(
      process.cwd(),
      "sitecoreMigrationData/global_fields",
      "globalfields"
    ),
    JSON.stringify([], null, 4),
    (err) => {
      if (err) throw err;
    }
  );
}

const writeSchemaJson = () => {
  const contentTypesPaths = read(contentFolderPath);
  if (contentTypesPaths?.length) {
    const schema = [];
    contentTypesPaths?.forEach((item) => {
      const contentType = helper.readFile(`${contentFolderPath}/${item}`)
      schema.push(contentType);
    })
    if (schema?.length) {
      helper.writeFile(
        path.join(
          process.cwd(),
          "sitecoreMigrationData/content_types",
          "schema"
        ),
        JSON.stringify(schema, null, 4),
        (err) => {
          if (err) throw err;
        }
      );
    }
  }
}

function ExtractRef() {
  emptyGlobalFiled()
  const basePages = helper.readFile(path.join(process.cwd(), "/sitecoreMigrationData/MapperData/base.json"));
  const contentTypeKeys = helper.readFile(path.join(process.cwd(), "/sitecoreMigrationData/MapperData/contentTypeKey.json"));
  const treeListRef = helper.readFile(path.join(process.cwd(), "/sitecoreMigrationData/MapperData/treeListRef.json"));
  const globalFieldUids = [];
  const contentTypesPaths = read(contentFolderPath);
  if (contentTypesPaths?.length && basePages && contentTypeKeys && treeListRef) {
    contentTypesPaths?.forEach((item) => {
      const contentType = helper.readFile(`${contentFolderPath}/${item}`)
      if (contentType?.id || contentType?.uid) {
        const refTree = treeListRef[contentType?.uid]
        if (refTree?.unique?.length) {
          const contentTypesPathsMaped = contentTypesPaths?.map((item) => item?.replace(".json", ""))
          refTree.unique = refTree?.unique?.map((item) => uidCorrector({ uid: item }))
          const uids = contentTypesPathsMaped?.filter((item) => refTree?.unique?.includes(item));
          if (uids?.length) {
            let newUid = uidCorrector({ uid: refTree?.uid });
            const isPresent = restrictedUid?.find((item) => item === newUid);
            if (isPresent) {
              newUid = `${newUid}_changed`
            }
            const schemaObject = {
              data_type: "reference",
              display_name: refTree?.name,
              reference_to: uids,
              field_metadata: {
                ref_multiple: true,
                ref_multiple_content_types: true
              },
              uid: newUid,
              mandatory: false,
              multiple: false,
              non_localizable: false,
              unique: false
            };
            contentType.schema.push(schemaObject)
          }
        }
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
            const newUid = contentType?.schema?.map((item) => item?.uid)
            if (uids?.length) {
              uids?.forEach((key) => {
                globalFieldUids?.push(key);
                let newKey = key;
                const isPresent = newUid?.find((item) => item === key)
                if (isPresent) {
                  newKey = `${isPresent}_changed`
                }
                const schemaObject = {
                  "data_type": "global_field",
                  "display_name": newKey,
                  "reference_to": key,
                  "field_metadata": {
                    "ref_multiple": true,
                    "ref_multiple_content_types": true
                  },
                  "uid": uidCorrector({ uid: newKey }),
                  "mandatory": false,
                  "multiple": false,
                  "non_localizable": false,
                  "unique": false
                };
                contentType.schema.push(schemaObject)
              })
            }
          }
        }
      }
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
    })
  }
  if (globalFieldUids?.length) {
    const unique = [...new Set(globalFieldUids)]
    const allGlobalFiels = [];
    const data = helper.readFile(path.join(
      process.cwd(),
      "sitecoreMigrationData/global_fields",
      "globalfields"
    ))
    if (data?.length) {
      allGlobalFiels.push(...data)
    }
    unique?.forEach((item) => {
      const content = helper.readFile(`${contentFolderPath}/${item}.json`)
      allGlobalFiels?.push(content);
    })
    if (allGlobalFiels?.length) {
      helper.writeFile(
        path.join(
          process.cwd(),
          "sitecoreMigrationData/global_fields",
          "globalfields"
        ),
        JSON.stringify(allGlobalFiels, null, 4),
        (err) => {
          if (err) throw err;
        }
      );
    }
    unique?.forEach((item) => {
      const message = fs.unlinkSync(`${contentFolderPath}/${item}.json`)
    })
  }
}


ExtractRef.prototype = {
  start: function () {
    successLogger(`exporting content-types`);
  },
};

module.exports = ExtractRef;