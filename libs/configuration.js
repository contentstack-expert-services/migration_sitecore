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
  const newPath = path.split(spliter)?.[1];
  return `${spliter}${newPath}`;
}

const idCorrector = ({ id }) => {
  const newId = id?.replace(/[-{}]/g, (match) => match === '-' ? '' : '')
  if (newId) {
    return newId?.toLowerCase()
  } else {
    return id?.toLowerCase()
  }
}


function ExtractConfiguration() {
  const obj = {};
  const treeObj = {};
  for (let i = 0; i < xml_folder?.length; i++) {
    if ((xml_folder?.[i]?.includes("data.json") || xml_folder?.[i]?.includes("data.json.json")) && !xml_folder?.[i]?.includes("undefined.json")) {
      const path = xml_folder?.[i]
      const data = helper?.readFile(`${global.config.sitecore_folder}/${xml_folder?.[i]}`)
      if (data?.item?.$?.template === "configuration group") {
        let newPath = path?.split("/{")?.[0];
        const groupPath = read(`${global.config.sitecore_folder}/${newPath}`)
        let arrayValue = [];
        let multiValueArrayTree = [];
        groupPath?.forEach((item) => {
          if ((item?.includes("data.json") || item?.includes("data.json.json")) && !item?.includes("undefined.json")) {
            const conf = helper?.readFile(`${global.config.sitecore_folder}/${newPath}/${item}`)
            const value = conf?.item?.fields?.field?.find((item) => item?.$?.key === "value")
            if (value) {
              arrayValue.push({ key: conf?.item?.$?.name, value: value?.content !== "" ? value?.content : conf?.item?.$?.name })
            } else {
              arrayValue.push({ value: conf?.item?.$?.name })
            }
            multiValueArrayTree.push({ key: conf?.item?.$?.name, value: conf?.item?.$?.id })
          }
        })
        obj[assignFolderName({ path: `${global.config.sitecore_folder}/${newPath}` })] = arrayValue;
        treeObj[assignFolderName({ path: `${global.config.sitecore_folder}/${newPath}` })] = multiValueArrayTree;
      }
    }
  }
  helper.writeFile(
    path.join(
      process.cwd(),
      "sitecoreMigrationData/MapperData",
    ),
    JSON.stringify(obj, null, 4),
    "configuration",
    (err) => {
      if (err) throw err;
    }
  );
  helper.writeFile(
    path.join(
      process.cwd(),
      "sitecoreMigrationData/MapperData",
    ),
    JSON.stringify(treeObj, null, 4),
    "configurationTree",
    (err) => {
      if (err) throw err;
    }
  );
  // const groupPath = 
  // const allBatch = [];
  // if (data?.length) {
  //   data?.forEach?.((item) => {
  //     const batch = xml_folder?.filter((pth) => pth?.includes?.(item) && pth?.includes("data.json"))
  //     allBatch?.push({ path: item, batch })
  //   })
  // }
  // const obj = {};
  // const treeObj = {};
  // if (allBatch?.length) {
  //   allBatch?.forEach((ptl, index) => {
  //     let pathName;
  //     const valueArray = [];
  //     const valueArrayTree = [];
  //     const multiValueArray = [];
  //     const multiValueArrayTree = [];
  //     ptl?.batch?.forEach((item) => {
  //       let newRpl = item.replace(ptl?.path, "")
  //       let firstTwoChars = newRpl?.substring(0, 2)
  //       if (firstTwoChars !== "/{") {
  //         const components = helper.readFile(
  //           `${global.config.sitecore_folder}/${item}`
  //         );
  //         if (components?.item?.$?.name === newRpl.split("/")?.[1]) {
  //           pathName = item?.split(components?.item?.$?.name)?.[0];
  //           const value = components?.item?.fields?.field?.find((item) => item?.$?.key === "value")
  //           if (value) {
  //             valueArray.push({ key: components?.item?.$?.name, value: value?.content !== "" ? value?.content : components?.item?.$?.name })
  //           } else {
  //             valueArray.push({ value: components?.item?.$?.name })
  //           }
  //           valueArrayTree.push({ key: components?.item?.$?.name, value: idCorrector({ id: components?.item?.$?.id }) })
  //         } else {
  //           const value = components?.item?.fields?.field?.find((item) => item?.$?.key === "value")
  //           if (value) {
  //             multiValueArray.push({
  //               path: item?.split(components?.item?.$?.name)?.[0],
  //               value: { key: components?.item?.$?.name, value: value?.content !== "" ? value?.content : components?.item?.$?.name }
  //             })
  //           } else {
  //             multiValueArray.push({
  //               path: item?.split(components?.item?.$?.name)?.[0],
  //               value: { value: components?.item?.$?.name }
  //             })
  //           }
  //           multiValueArrayTree.push({ key: components?.item?.$?.name, value: components?.item?.$?.id })
  //         }
  //       }
  //     })
  //     if (multiValueArray?.length) {
  //       const data = [];
  //       multiValueArray?.forEach((ele) => {
  //         const filterd = multiValueArray.filter((item) => item?.path === ele?.path)
  //         let grouped = {};
  //         filterd.forEach(item => {
  //           if (!grouped[item.path]) {
  //             grouped[item.path] = [];
  //           }
  //           grouped[item.path].push(item.value);
  //         });
  //         const result = Object.keys(grouped).map(path => ({
  //           path,
  //           values: grouped[path]
  //         }));
  //         if (result?.length) {
  //           data?.push(...result)
  //         }
  //       })
  //       const mergedArray = Array?.from(new Set(data?.map(item => item?.path))).map(path => {
  //         return {
  //           path,
  //           values: data?.find(item => item?.path === path)?.values
  //         };
  //       })
  //       if (mergedArray?.length) {
  //         mergedArray?.forEach((set) => {
  //           obj[assignFolderName({ path: set?.path })] = set?.values;
  //         })
  //       }
  //     }
  //     if (multiValueArrayTree?.length) {
  //       const data = [];
  //       multiValueArrayTree?.forEach((ele) => {
  //         const filterd = multiValueArrayTree.filter((item) => item?.path === ele?.path)
  //         let grouped = {};
  //         filterd.forEach(item => {
  //           if (!grouped[item.path]) {
  //             grouped[item.path] = [];
  //           }
  //           grouped[item.path].push(item.value);
  //         });
  //         const result = Object.keys(grouped).map(path => ({
  //           path,
  //           values: grouped[path]
  //         }));
  //         if (result?.length) {
  //           data?.push(...result)
  //         }
  //       })
  //       const mergedArray = Array?.from(new Set(data?.map(item => item?.path))).map(path => {
  //         return {
  //           path,
  //           values: data?.find(item => item?.path === path)?.values
  //         };
  //       })
  //       if (mergedArray?.length) {
  //         mergedArray?.forEach((set) => {
  //           treeObj[assignFolderName({ path: set?.path })] = set?.values;
  //         })
  //       }
  //     }
  //     treeObj[assignFolderName({ path: pathName })] = valueArrayTree;
  //     obj[assignFolderName({ path: pathName })] = valueArray;
  //   })
  // }

  // FolderMapper({ pathMeta, pathComp });
}

ExtractConfiguration.prototype = {
  start: function () {
    successLogger(`exporting content-types`);
  },
};

module.exports = ExtractConfiguration;