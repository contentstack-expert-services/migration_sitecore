const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const read = require("fs-readdir-recursive");
const helper = require("../utils/helper");
const contentConfig = config.modules.contentTypes;
const xml_folder = read(global.config.sitecore_folder);
contentFolderPath = path.resolve(config.data, config.contenttypes) || {};


const getFolderNestedCount = ({ inputString, substringToCount }) => {
  return (inputString.match(new RegExp(substringToCount, "g")) || [])?.length;
}

const assignFolderName = ({ path }) => {
  const spliter = "/sitecore";
  const newPath = global.config.sitecore_folder.split(spliter)?.[1];
  return `${spliter}${newPath}/${path}`?.slice(0, -1);
}

const FolderMapper = ({ pathMeta, pathComp }) => {
  const data = {};
  for (let i = 0; i < pathMeta?.length; i++) {
    const path = pathMeta?.[i]?.split("{")?.[0]
    const comp = pathComp?.filter((item) => item?.includes(path))
    const valueArray = [];
    comp?.forEach((element) => {
      const components = helper.readFile(
        `${global.config.sitecore_folder}/${element}`
      );
      const value = components?.item?.fields?.field?.find((item) => item?.$?.key === "value")
      if (value) {
        valueArray.push({ key: components?.item?.$?.name, value: value?.content !== "" ? value?.content : components?.item?.$?.name })
      } else {
        valueArray.push({ value: components?.item?.$?.name })
      }
    })
    data[assignFolderName({ path })] = valueArray
  }
  helper.writeFile(
    path.join(
      process.cwd(),
      "sitecoreMigrationData/MapperData",
      "configuration"
    ),
    JSON.stringify(data, null, 4),
    (err) => {
      if (err) throw err;
    }
  );
}

function ExtractConfiguration() {
  const pathMeta = [];
  const pathComp = [];
  for (let i = 0; i < xml_folder?.length; i++) {
    if (xml_folder?.[i]?.includes("data.json")) {
      const path = xml_folder?.[i]
      const count = getFolderNestedCount({ inputString: path, substringToCount: "/" })
      if (count === 5) {
        pathMeta.push(path)
      }
      if (count >= 6) {
        pathComp.push(path)
      }
    }
  }
  FolderMapper({ pathMeta, pathComp });
}

ExtractConfiguration.prototype = {
  start: function () {
    successLogger(`exporting content-types`);
  },
};

module.exports = ExtractConfiguration;