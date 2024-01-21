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
const extraField = "title";
const AddTitleUrl = false;
const configChecker = "/content/Common/Configuration";
const append = "a"


if (!fs.existsSync(contentFolderPath)) {
  mkdirp.sync(contentFolderPath);
  helper.writeFile(path.join(contentFolderPath, contentConfig.fileName));
}

function isKeyPresent(keyToFind, timeZones) {
  return timeZones?.some?.(timeZone => Object?.keys?.(timeZone)?.includes?.(keyToFind));
}

const createTemplate = ({ components }) => {
  components.item.$.field = components?.item?.fields?.field
  return components?.item?.$
}

function startsWithNumber(str) {
  return /^\d/.test(str);
}

const uidCorrector = ({ uid }) => {
  // if (uid === "Geo Targeted Airports - Use if you want to override default user geo location") {
  // console.log(uid)
  if (startsWithNumber(uid)) {
    return `${append}_${_.replace(uid, new RegExp("[ -]", "g"), '_')?.toLowerCase()}`?.replace?.("$", "");
  }
  const newUid = _.replace(uid, new RegExp("[ -]", "g"), '_')?.toLowerCase()
  return newUid?.replace?.("$", "")
}


const templatesComponents = ({ path, basePath }) => {
  const fields = [];
  for (let i = 0; i < path?.length; i++) {
    const allFields = [];
    const allPaths = read(path?.[i]?.pth)
    for (let j = 0; j < allPaths?.length; j++) {
      if (allPaths?.[j]?.includes("/data.json") || allPaths?.[j]?.includes("/data.json.json")) {
        const innerField = [];
        const components = helper.readFile(
          `${path?.[i]?.pth}/${allPaths?.[j]}`
        );
        const data = components?.item?.$ ?? {};
        components?.item?.fields?.field.forEach((item) => {
          if (item?.$?.key === "type" || item?.$?.key === "source" || item?.$?.key === extraField) {
            innerField.push({
              content: item.content,
              ...item.$
            })
          }
        })
        if (innerField?.length) {
          data.fields = innerField;
          allFields.push(data);
        }
      }
    }
    fields?.push({ meta: path?.[0]?.obj?.item?.$, schema: allFields })
  }
  return fields;
}

const templateStandardValues = ({ components }) => {
  const standardValues = [];
  const data = components?.item?.$ ?? {};
  components?.item?.fields?.field.forEach((item) => {
    if (!item?.$?.key.includes("__")) {
      standardValues.push({
        content: item.content,
        ...item.$
      })
    }
  })
  data.fields = standardValues;
  return data;
}

const contentTypeKeyMapper = ({ template, contentType, contentTypeKey = "contentTypeKey" }) => {
  let keyMapper = {};
  const keys = helper.readFile(
    path.join(process.cwd(), `/sitecoreMigrationData/MapperData/${contentTypeKey}.json`)
  );
  if (keys) {
    keyMapper = keys;
  }
  keyMapper[template?.id] = contentType?.uid;
  helper.writeFile(
    path.join(
      process.cwd(),
      "sitecoreMigrationData/MapperData"
    ),
    JSON.stringify(keyMapper, null, 4),
    contentTypeKey,
    (err) => {
      if (err) throw err;
    }
  );
}

const ContentTypeSchema = ({ type, name, uid, default_value = "", description = "", id, choices = [{ value: "NF" }], advanced, sourLet }) => {
  const isPresent = restrictedUid?.find((item) => item === uid);
  if (isPresent) {
    uid = `${uid}_changed`
  }
  switch (type) {
    case 'Single-Line Text': {
      return {
        id,
        "data_type": "text",
        "display_name": name,
        uid,
        "field_metadata": {
          description,
          default_value
        },
        "format": "",
        "error_messages": {
          "format": ""
        },
        "multiple": false,
        "mandatory": false,
        "unique": false
      }
    }
    case 'Checkbox': {
      default_value = default_value === "1" ? true : false;
      return {
        id,
        "data_type": "boolean",
        "display_name": name,
        uid,
        "field_metadata": {
          description,
          default_value
        },
        "multiple": false,
        "mandatory": false,
        "unique": false
      }
    }
    case 'Rich Text': {
      // return {
      //   "data_type": "json",
      //   "display_name": name,
      //   "uid": uid,
      //   "field_metadata": {
      //     "allow_json_rte": true,
      //     "rich_text_type": "advanced",
      //     description,
      //     default_value
      //   },
      //   "reference_to": [],
      //   "non_localizable": false,
      //   "multiple": false,
      //   "mandatory": false,
      //   "unique": false
      // }
      return {
        "display_name": name,
        "extension_uid": "blta7be8bced92ddabe",
        "field_metadata": {
          "extension": true,
          "version": 3
        },
        uid,
        "mandatory": false,
        "non_localizable": false,
        "unique": false,
        "config": {},
        "data_type": "text",
        "multiple": false,
        "indexed": false,
        "inbuilt_model": false
      }
    }

    // case "":
    case 'Droplist': {
      const data = {
        id,
        "data_type": "text",
        "display_name": name,
        "display_type": "dropdown",
        "enum": {
          "advanced": advanced,
          choices: choices?.length ? choices : [{ value: "NF" }]
        },
        "multiple": false,
        uid,
        "field_metadata": {
          description,
        },
        "mandatory": false,
        "unique": false
      };
      if (default_value) {
        data.field_metadata.default_value = default_value
      }
      if (advanced && default_value) {
        data.field_metadata.default_key = default_value;
      }
      return data;
    }

    case "Image": {
      return {
        "data_type": "file",
        "display_name": name,
        uid,
        "extensions": [],
        "field_metadata": {
          description,
          "rich_text_type": "standard"
        },
        "multiple": false,
        "mandatory": false,
        "unique": false
      }
    }

    case "Internal Link": {
      return {
        "data_type": "link",
        "display_name": name,
        uid,
        "field_metadata": {
          description,
          "default_value": {
            "title": "",
            "url": default_value
          }
        },
        "multiple": false,
        "mandatory": false,
        "unique": false
      }
    }

    case "Multi-Line Text": {
      return {
        "data_type": "text",
        "display_name": name,
        uid,
        "field_metadata": {
          description,
          default_value,
          "multiline": true
        },
        "format": "",
        "error_messages": {
          "format": ""
        },
        "multiple": false,
        "mandatory": false,
        "unique": false
      }
    }

    case "General Link": {
      return {
        "display_name": name,
        uid,
        "data_type": "text",
        "mandatory": false,
        "field_metadata": {
          "_default": true,
          default_value
        },
        "multiple": false,
        "unique": false
      }
    }

    case "Integer":
    case "Number": {
      return {
        "data_type": "number",
        "display_name": name,
        uid,
        "field_metadata": {
          description,
          default_value
        },
        "multiple": false,
        "mandatory": false,
        "unique": false
      }
    }

    case "Date": {
      return {
        "data_type": "isodate",
        "display_name": name,
        uid,
        "startDate": null,
        "endDate": null,
        "field_metadata": {
          description,
          "default_value": {},
          "hide_time": true
        },
        "mandatory": false,
        "multiple": false,
        "non_localizable": false,
        "unique": false
      }
    }

    case "Time": {
      return {
        "data_type": "isodate",
        "display_name": name,
        uid,
        "startDate": null,
        "endDate": null,
        "field_metadata": {
          description,
          "default_value": {},
        },
        "mandatory": false,
        "multiple": false,
        "non_localizable": false,
        "unique": false
      }
    }

    case 'Grouped Droplist': {
      if (choices?.length) {
        return {
          id,
          "data_type": "text",
          "display_name": name,
          "display_type": "dropdown",
          "enum": {
            "advanced": advanced,
            choices
          },
          "multiple": false,
          uid,
          "field_metadata": {
            description,
          },
          "mandatory": false,
          "unique": false
        };
      }
    }
    case "Treelist": {
      if (sourLet?.key !== "source") {
        return {
          data_type: "reference",
          display_name: name,
          reference_to: [
            "tier_1_footer_link",
            "tier_2_footer_link",
            "tier_3_footer_link",
            "tier_1_header_link",
            "tier_2_header_link",
            "tier_3_header_link"
          ],
          field_metadata: {
            ref_multiple: true,
            ref_multiple_content_types: true
          },
          uid: uid,
          mandatory: false,
          multiple: false,
          non_localizable: false,
          unique: false
        };
      }

    }
    default: {
      return {
        "display_name": sourLet?.key === "source" ? `${name}_1` : name,
        "uid": sourLet?.key === "source" ? `${uid}_1` : uid,
        "data_type": "text",
        "mandatory": true,
        "unique": true,
        "field_metadata": {
          "_default": true
        },
        "multiple": false
      }
      console.log(name, "=>>", type)
    }
  }
}

function makeUnique({ data }) {
  const newData = data;
  let tempMapping = {};
  if (newData?.[0]?.key) {
    newData?.forEach(choice => {
      if (choice?.key) {
        if (!tempMapping?.[choice?.value]) {
          tempMapping[choice?.value] = [];
        }
        tempMapping[choice?.value].push(choice?.key);
      }
    });
    const result = Object?.entries(tempMapping).map(([value, keys]) => {
      return {
        key: keys?.join('/'),
        value: value
      };
    });
    const newValue = [];
    result?.forEach((item) => {
      if (item?.key === undefined) {
        newValue?.push({ ...item, key: item?.value })
      } else {
        newValue?.push(item)
      }
    })
    return newValue;
  } else {
    let uniqueValues = [];
    const result = data?.filter(item => {
      if (uniqueValues?.includes(item?.value)) {
        return false;
      } else {
        uniqueValues?.push(item?.value);
        return true;
      }
    });
    const newValue = [];
    result?.forEach((item) => {
      if (item?.key === undefined) {
        newValue?.push({ ...item, key: item?.value })
      } else {
        newValue?.push(item)
      }
    })
    return newValue;
  }
}


const contentTypeMapper = ({ components, standardValues, content_type }) => {
  const source = helper.readFile(
    path.join(process.cwd(), "/sitecoreMigrationData/MapperData/configuration.json")
  );
  const sourceTree = helper.readFile(
    path.join(process.cwd(), "/sitecoreMigrationData/MapperData/configurationTree.json")
  );
  let schema = [];
  let isTitle = false;
  let isUrl = false;
  components?.forEach((item) => {
    if (item?.schema?.length) {
      for (let i = 0; i < item?.schema?.length; i++) {
        const field = item?.schema?.[i];
        const appendStandardValues = standardValues?.fields?.find((item) => item?.key === field?.key)
        if (appendStandardValues) {
          field?.fields?.forEach((item) => {
            if (item?.content === appendStandardValues?.type) {
              item.standardValues = appendStandardValues
            }
          })
        }
        let compType = {};
        let sourLet = {};
        let sourceType = [];
        let advanced = false;
        let name = field?.name;
        if (field?.key === "title") {
          isTitle = true;
        }
        if (field?.key === "url") {
          isUrl = true;
        }
        field?.fields?.forEach((item) => {
          if (item?.key === "type") {
            compType = item;
          }
          if (item?.key === "source") {
            sourLet = item;
            if (compType?.content === "Droplink") {
              if (sourceTree) {
                if (item?.content?.includes(configChecker)) {
                  sourceType = makeUnique({ data: sourceTree?.[item?.content] })
                  compType.content = "Droplist"
                  if (isKeyPresent("key", sourceType)) {
                    advanced = true;
                  }
                } else {
                  console.log("🚀 ~ file: contenttypes.js:305 ~ field?.fields?.forEach ~ item?.content:", item?.content)
                }
              } else {
                console.log("🚀 ~ file: contenttypes.js:371 ~ field?.fields?.forEach ~ compType:", compType)
              }
            } else {
              if (source) {
                if (item?.content?.includes("datasource=")) {
                  const gUid = item?.content?.split("}")?.[0]?.replace("datasource={", "")
                  if (gUid) {
                    const dataSourcePaths = read(`${global.config.sitecore_folder}/master/sitecore/content/Common`)
                    let isDataSourcePresent = dataSourcePaths?.find((sur) => sur?.includes(`{${gUid}}`));
                    isDataSourcePresent = isDataSourcePresent?.split(`{${gUid}}`)?.[0]
                    if (isDataSourcePresent) {
                      const optionsPath = read(`${global.config.sitecore_folder}/master/sitecore/content/Common/${isDataSourcePresent}`)
                      const refName = [];
                      optionsPath?.forEach((newPath) => {
                        if (newPath?.includes("data.json.json") | newPath?.includes("data.json")) {
                          const data = helper.readFile(`${global.config.sitecore_folder}/master/sitecore/content/Common/${isDataSourcePresent}/${newPath}`)
                          if (data?.item?.$?.template) {
                            refName.push(data?.item?.$?.template)
                          }
                        }
                      })
                      if (refName?.length) {
                        const unique = [...new Set(refName)]
                        contentTypeKeyMapper({ template: { id: content_type?.uid }, contentType: { uid: { name, uid: field?.key, unique } }, contentTypeKey: "treeListRef" })
                      }
                    }
                  }
                } else {
                  sourceType = makeUnique({ data: source?.[item?.content] })
                  if (isKeyPresent("key", sourceType)) {
                    advanced = true;
                  }
                }
              }
            }
          }
          if (item?.key === extraField) {
            if (item?.content && item?.content !== "") {
              name = item?.content
            }
          }
        })
        if (compType?.content !== "Droptree") {
          schema.push(ContentTypeSchema({
            name,
            uid: uidCorrector({ uid: field?.key }),
            type: compType?.content,
            default_value: compType?.standardValues?.content,
            id: field?.id,
            choices: sourceType?.slice(0, 98),
            advanced,
            sourLet
          }));
        }
      }
    }
    const isUrlfound = schema?.find((rt) => rt?.uid?.toLowerCase?.() === "url")
    if (isUrlfound === undefined) {
      schema.unshift({
        "display_name": "Url",
        "uid": "url",
        "data_type": "text",
        "mandatory": true,
        "unique": true,
        "field_metadata": {
          "_default": true
        },
        "multiple": false
      })
    }
    const isPresent = schema?.find((item) =>
      item?.data_type === "text" && item?.uid?.toLowerCase?.() === "title"
    )
    if (content_type?.uid === "promocontent") {
      // console.log("🚀 ~ components?.forEach ~ content_type:", schema?.map((item) => item?.uid), content_type, isPresent)
    }
    if (isPresent === undefined) {
      schema.unshift({
        "display_name": "Title",
        "uid": "title",
        "data_type": "text",
        "mandatory": true,
        "unique": true,
        "field_metadata": {
          "_default": true
        },
        "multiple": false
      })
    }
  })
  schema = schema?.map?.((itl, index) => {
    const isPresent = schema?.filter((sch) => sch?.uid === itl?.uid)
    if (isPresent?.length > 1) {
      return {
        ...itl,
        display_name: `${itl.display_name} ${index}`,
        uid: `${itl.uid}_${index}`
      }
    }
    return itl;
  })
  return schema;
}

const contentTypeMaker = ({ template, basePath }) => {
  const content_type = {
    title: template?.name,
    uid: uidCorrector({ uid: template?.key }),
    id: template?.id
  }
  template?.field?.forEach((item) => {
    if (item?.$?.key === "__base template" && item?.$?.type === "tree list") {
      contentTypeKeyMapper({ template, contentType: { uid: { ...item?.$, content: item?.content } }, contentTypeKey: "base" })
    }
  })
  content_type.schema = contentTypeMapper({ components: template?.components, standardValues: template?.standardValues, content_type })
  return content_type;
}




function singleContentTypeCreate({ templatePaths }) {
  const newPath = read(templatePaths);
  const templatesComponentsPath = [];
  let templatesStandaedValuePath = {};
  let templatesMetaDataPath = {};
  for (let i = 0; i < newPath?.length; i++) {
    if (newPath?.[i]?.includes("data.json") || newPath?.[i]?.includes("/data.json.json")) {
      const data = helper?.readFile(`${templatePaths}/${newPath?.[i]}`);
      if (data?.item?.$?.template === "template section") {
        templatesComponentsPath?.push(
          {
            pth: `${templatePaths}/${newPath?.[i]}`?.split("/{")?.[0],
            obj: data
          }
        );
      } else if (data?.item?.$?.template === "template") {
        templatesMetaDataPath = data;
      } else if (data?.item?.$?.key?.includes?.("standard values")) {
        templatesStandaedValuePath = data;
      }
    }
  }
  const template = createTemplate({ components: templatesMetaDataPath });
  template.components = templatesComponents({ path: templatesComponentsPath, basePath: templatePaths });
  template.standardValues = templateStandardValues({ components: templatesStandaedValuePath })
  const contentType = contentTypeMaker({ template, basePath: templatePaths })
  if (contentType?.schema?.length) {
    helper.writeFile(
      path.join(
        process.cwd(),
        "sitecoreMigrationData/content_types",
      ),
      JSON.stringify(contentType, null, 4),
      contentType?.uid,
      (err) => {
        if (err) throw err;
      }
    );
    contentTypeKeyMapper({ template, contentType })
  }
  return true;
}


const removeLastSlash = (str) => {
  const parts = str?.split('/');
  parts?.pop();
  return parts?.join('/');
}

function ExtractContentTypes() {
  const folder = read(global.config.sitecore_folder);
  const templateWithOutStandard = [];
  const templatePaths = [];
  for (let i = 0; i < folder?.length; i++) {
    if (folder?.[i]?.includes("templates") && (folder?.[i]?.includes("/data.json") || folder?.[i]?.includes("/data.json.json"))) {
      const data = helper?.readFile(`${global.config.sitecore_folder}/${folder?.[i]}`)
      if (data?.item?.$?.template === "template") {
        templatePaths?.push(`${global.config.sitecore_folder}/${folder?.[i]}`?.split("/{")?.[0])
      }
    }
  }
  if (templatePaths?.length) {
    const unique = [...new Set(templatePaths)]
    unique?.forEach((item) => {
      singleContentTypeCreate({ templatePaths: item })
    })
  } else {
    throw { message: "Templates Not Found." }
  }
}

ExtractContentTypes.prototype = {
  start: function () {
    successLogger(`exporting ContentType`);
  },
};

module.exports = ExtractContentTypes;