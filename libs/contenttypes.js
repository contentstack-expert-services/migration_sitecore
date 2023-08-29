const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const read = require("fs-readdir-recursive");
const helper = require("../utils/helper");
const contentConfig = config.modules.contentTypes;
const xml_folder = read(global.config.sitecore_folder);
contentFolderPath = path.resolve(config.data, config.contenttypes) || {};
const extraField = "title";


if (!fs.existsSync(contentFolderPath)) {
  mkdirp.sync(contentFolderPath);
  helper.writeFile(path.join(contentFolderPath, contentConfig.fileName));
}

const createTemplate = ({ path, basePath }) => {
  if (path?.[0]) {
    const components = helper.readFile(
      `${basePath}/${path?.[0]}`
    );
    components.item.$.field = components?.item?.fields?.field
    return components?.item?.$
  }
}

const uidCorrector = ({ uid }) => {
  return _.replace(uid, new RegExp(" ", "g"), '_').toLowerCase()
}


const templatesComponents = ({ path, basePath }) => {
  const fields = [];
  for (let i = 0; i < path?.length; i++) {
    const innerField = [];
    const components = helper.readFile(
      `${basePath}/${path?.[i]}`
    );
    const data = components?.item?.$;
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
      fields.push(data);
    }
  }
  return fields;
}

const templateStandardValues = ({ path, basePath }) => {
  if (path?.[0]) {
    const standardValues = [];
    const components = helper.readFile(
      `${basePath}/${path?.[0]}`
    );
    const data = components?.item?.$;
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
      "sitecoreMigrationData/MapperData",
      contentTypeKey
    ),
    JSON.stringify(keyMapper, null, 4),
    (err) => {
      if (err) throw err;
    }
  );
}

const ContentTypeSchema = ({ type, name, uid, default_value = "", description = "", id, choices = [], advanced }) => {
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
      return {
        id,
        "data_type": "text",
        "display_name": name,
        "uid": uid,
        "field_metadata": {
          "allow_rich_text": true,
          "description": description,
          "multiline": false,
          "rich_text_type": "advanced",
          "version": 3
        },
        "multiple": false,
        "mandatory": false,
        "unique": false
      }
    }
    case 'Droplist': {
      const data = {
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
          default_value,
        },
        "mandatory": false,
        "unique": false
      };
      if (advanced) {
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

    case "": {

    }
  }
}

const contentTypeMapper = ({ components, standardValues }) => {
  const source = helper.readFile(
    path.join(process.cwd(), "/sitecoreMigrationData/MapperData/configuration.json")
  );
  const schema = [];
  if (components?.length) {
    for (let i = 0; i < components?.length; i++) {
      const field = components?.[i];
      const appendStandardValues = standardValues?.fields?.find((item) => item?.key === field?.key)
      if (appendStandardValues) {
        field?.fields?.forEach((item) => {
          if (item?.content === appendStandardValues?.type) {
            item.standardValues = appendStandardValues
          }
        })
      }
      let compType = {};
      let sourceType = [];
      let advanced = false;
      let name = field?.name;
      field?.fields?.forEach((item) => {
        if (item?.key === "type") {
          compType = item;
        }
        if (item?.key === "source") {
          if (source) {
            sourceType = source[item?.content]
            if (sourceType?.[0]?.key !== undefined) {
              advanced = true;
            }
          }
        }
        if (item?.key === extraField) {
          if (item?.content && item?.content !== "") {
            name = item?.content
          }
        }
      })
      schema.push(ContentTypeSchema({
        name,
        uid: uidCorrector({ uid: field?.key }),
        type: compType?.content,
        default_value: compType?.standardValues?.content,
        id: field?.id,
        choices: sourceType,
        advanced,
      }));
    }
  }
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
  content_type.schema = contentTypeMapper({ components: template?.components, standardValues: template?.standardValues })
  return content_type;
}




function singleContentTypeCreate({ templatePaths }) {
  const newPath = read(templatePaths);
  const templatesComponentsPath = [];
  const templatesStandaedValuePath = [];
  const templatesMetaDataPath = [];
  for (let i = 0; i < newPath?.length; i++) {
    if (newPath?.[i]?.includes("data.json")) {
      if (newPath?.[i]?.includes("Data") || newPath?.[i]?.includes("Section") || newPath?.[i]?.includes("Translation")) {
        templatesComponentsPath.push(newPath?.[i])
      } else if (newPath?.[i]?.includes("__Standard Values")) {
        templatesStandaedValuePath.push(newPath?.[i])
      } else {
        templatesMetaDataPath.push(newPath?.[i])
      }
    }
  }
  const template = createTemplate({ path: templatesMetaDataPath, basePath: templatePaths });
  template.components = templatesComponents({ path: templatesComponentsPath, basePath: templatePaths });
  template.standardValues = templateStandardValues({ path: templatesStandaedValuePath, basePath: templatePaths })
  const contentType = contentTypeMaker({ template, basePath: templatePaths })
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
  contentTypeKeyMapper({ template, contentType })
  return true;
}

function ExtractContentTypes() {
  const folder = read(global.config.sitecore_folder);
  const templatePaths = [];
  for (let i = 0; i < folder?.length; i++) {
    if (folder?.[i]?.includes("/data.json") | folder?.[i]?.includes("/data.json.json")) {
      if (folder?.[i]?.includes("__Standard Values")) {
        const path = `${global.config.sitecore_folder}/${folder?.[i]?.split("__Standard Values")?.[0]}`
        singleContentTypeCreate({ templatePaths: path })
        console.log("step 5")
        templatePaths.push(path);
      }
    }
  }
  if (!templatePaths?.length) {
    throw { message: "Templates Not Found." }
  }
}

ExtractContentTypes.prototype = {
  start: function () {
    successLogger(`exporting content-types`);
  },
};

module.exports = ExtractContentTypes;