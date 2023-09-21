const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const read = require("fs-readdir-recursive");
const helper = require("../utils/helper");
const { template } = require("lodash");
const contentConfig = config.modules.contentTypes;
contentFolderPath = path.resolve(config.data, config.contenttypes) || {};


function readDirRecursively(currentPath, remainingPath) {
  const paths = [];
  const nextFolder = remainingPath?.shift();
  if (!nextFolder) {
    // If we've reached the end of our target path, read the file
    helper.readFile(currentPath);
  } else {
    // Otherwise, move to the next directory in the path
    const newPath = path.join(currentPath, nextFolder);
    if (fs.statSync(newPath).isDirectory()) {
      if (isNaN(parseInt(nextFolder, 10)) && !["en"]?.includes(nextFolder)) {
        // console.log("🚀 ~ file: template.js:19 ~ readDirRecursively ~ nextFolder:", newPath)
        paths?.push(nextFolder);
        if (nextFolder?.includes("{")) {
          // console.log("🚀 ~ file: template.js:23 ~ readDirRecursively ~ data:", newPath)
        }
      }
      readDirRecursively(newPath, remainingPath);
    } else {
      console.error('Expected a directory but found a file.');
    }
  }
  console.log(paths)
}

function ExtractTemplate() {
  const parentData = {};
  const contnet_folder = read(`${global.config.sitecore_folder}/master/sitecore/content/AlaskaAir/content`);
  if (contnet_folder?.length) {
    contnet_folder?.forEach((item) => {
      if (item?.includes("data.json")) {
        const data = helper.readFile(`${global.config.sitecore_folder}/master/sitecore/content/AlaskaAir/content/${item}`);
        if (parentData?.[data?.item?.$?.parentid]) {
          parentData[data?.item?.$?.parentid].child.push(data?.item?.$)
        } else {
          parentData[data?.item?.$?.parentid] = {
            child: [data?.item?.$]
          }
        }
      }
    })
  } else {
    console.log("Content Not Found.")
  }
  const newObj = {};
  for (const [key, value] of Object?.entries(parentData)) {
    const child = [];
    value?.child?.forEach((item) => {
      if (parentData?.[item?.id]) {
        child?.push(
          {
            child: parentData?.[item?.id]?.child?.map((key) => key?.template),
            ...item
          })
      } else {
        child?.push(item)
      }
    })
    newObj[key] = child
  }
  const onlyContent = {};
  for (const [key, value] of Object?.entries(newObj)) {
    let arrayAll = [];
    value?.forEach((item) => {
      if (item?.child?.length) {
        arrayAll = [item?.template, ...item?.child]
      } else {
        arrayAll?.push(item?.template)
      }
    })
    if (arrayAll?.length) {
      const data = arrayAll?.filter(function (item, pos) {
        return arrayAll?.indexOf(item) == pos;
      })
      console.log("🚀 ~ file: template.js:83 ~ ExtractTemplate ~ data:", data)
    }
  }
}

ExtractTemplate.prototype = {
  start: function () {
    successLogger(`exporting Template`);
  },
};

module.exports = ExtractTemplate;