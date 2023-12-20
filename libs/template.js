const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const read = require("fs-readdir-recursive");
const helper = require("../utils/helper");
const { template, filter } = require("lodash");
const contentConfig = config.modules.contentTypes;
contentFolderPath = path.resolve(config.data, config.contenttypes) || {};

function areArraysEquivalent(arr1, arr2) {
  if (arr1?.length !== arr2?.length) {
    return false;
  }
  const sortedArr1 = arr1?.slice()?.sort();
  const sortedArr2 = arr2?.slice()?.sort();
  for (let i = 0; i < sortedArr1?.length; i++) {
    if (sortedArr1?.[i] !== sortedArr2?.[i]) {
      return false;
    }
  }
  return true;
}

function startsWithNumber(str) {
  return /^\d/.test(str);
}

const uidCorrector = ({ uid }) => {
  if (startsWithNumber(uid)) {
    return `${append}_${_.replace(uid, new RegExp("[ -]", "g"), '_')?.toLowerCase()}`
  }
  return _.replace(uid, new RegExp("[ -]", "g"), '_')?.toLowerCase()
}


function createContentType(finalMapped) {
  finalMapped?.forEach((item) => {
    const uidThere = [];
    const contentSchema = [];
    item?.contentTypes?.forEach((ele) => {
      const contentType = helper.readFile(`${contentFolderPath}/${uidCorrector({ uid: ele })}.json`)
      if (contentType) {
        uidThere?.push(contentType?.uid);
        contentSchema?.push(contentType);
      }
    })
    if (uidThere?.length) {
      const obj = {
        title: item?.title,
        uid: item?.uid,
      };
      obj.schema = [{
        "display_name": "Title",
        "uid": "title",
        "data_type": "text",
        "mandatory": true,
        "field_metadata": {
          "_default": true
        },
        "multiple": false,
        "unique": false
      },
      {
        "display_name": "URL",
        "uid": "url",
        "data_type": "text",
        "mandatory": true,
        "field_metadata": {
          "_default": true
        },
        "multiple": false,
        "unique": false
      }]
      const groups = []
      contentSchema?.forEach((item) => {
        const data = {
          "data_type": "group",
          "display_name": item?.title,
          "field_metadata": {
            "description": "",
            "instruction": ""
          },
          "schema": item?.schema,
          "uid": item?.uid,
          "mandatory": false,
          "multiple": false,
          "non_localizable": false,
          "unique": false
        }
        groups?.push(data)
      })
      obj.schema?.push(...groups)
      helper.writeFile(
        path.join(
          process.cwd(),
          "sitecoreMigrationData/content_types"
        ),
        JSON.stringify(obj, null, 4),
        obj?.uid,
        (err) => {
          if (err) throw err;
        }
      );
    }
  })
}


function ExtractTemplate() {
  const parentData = {};
  const contnet_folder = read(`${global.config.sitecore_folder}/master/sitecore/content/API`);
  if (contnet_folder?.length) {
    contnet_folder?.forEach((item) => {
      if (item?.includes("data.json")) {
        const data = helper.readFile(`${global.config.sitecore_folder}/master/sitecore/content/API/${item}`);
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
            childId: parentData?.[item?.id]?.child?.map((key) => key?.id),
            ...item
          })
      } else {
        child?.push(item)
      }
    })
    newObj[key] = child
  }
  const onlyContent = [];
  for (const [key, value] of Object?.entries(newObj)) {
    let arrayAll = [];
    let childIdAll = [];
    value?.forEach((item) => {
      if (item?.child?.length) {
        arrayAll = [item?.template, ...item?.child]
      } else {
        arrayAll?.push(item?.template)
      }
      if (item?.childId?.length) {
        childIdAll = [item?.id, ...item?.childId];
      } else {
        childIdAll?.push(item?.id)
      }
    })
    const allData = {};
    if (arrayAll?.length) {
      const data = arrayAll?.filter(function (item, pos) {
        return arrayAll?.indexOf(item) == pos;
      })
      allData.contentTypes = data;
    }
    if (childIdAll?.length) {
      const data = childIdAll?.filter(function (item, pos) {
        return childIdAll?.indexOf(item) == pos;
      })
      allData.ids = data;
    }
    onlyContent?.push(allData);
  }
  let idsMapped = [];
  onlyContent?.forEach((item) => {
    if (item?.contentTypes?.length) {
      const isPresent = idsMapped?.find((id) => areArraysEquivalent(item?.contentTypes, id?.contentTypes));
      if (isPresent === undefined) {
        const ids = [];
        onlyContent?.forEach((key) => {
          const filtredIds = areArraysEquivalent(item?.contentTypes, key?.contentTypes)
          if (filtredIds) {
            ids?.push(...key?.ids)
          }
        })
        idsMapped?.push({
          contentTypes: item?.contentTypes,
          ids
        })
      } else {
        console.log("All ready created")
      }
    }
  })
  const finalMapped = [];
  idsMapped = idsMapped?.sort((a, b) => b?.contentTypes?.length - a?.contentTypes?.length);
  const usedCT = [];
  idsMapped?.forEach((item, i) => {
    const ids = [];
    const isPresent = usedCT?.find((ft) => areArraysEquivalent(item?.contentTypes, ft))
    if (isPresent === undefined) {
      idsMapped?.forEach((nst) => {
        const data = item?.contentTypes?.filter((pts) => nst?.contentTypes?.includes(pts))
        const nest = usedCT?.find((ft) => areArraysEquivalent(nst?.contentTypes, ft))
        if (nest === undefined) {
          if (data?.length === nst?.contentTypes?.length) {
            ids?.push(...nst?.ids);
            usedCT?.push(nst?.contentTypes);
          }
        }
      })
      finalMapped.push({
        contentTypes: item?.contentTypes,
        ids,
        title: `Template ${i > 0 ? i : ""}`,
        uid: `template${i > 0 ? `_${i}` : ""}`,
      })
    }
  })
  helper.writeFile(
    path.join(
      process.cwd(),
      "sitecoreMigrationData/MapperData",
    ),
    JSON.stringify(finalMapped, null, 4),
    "template",
    (err) => {
      if (err) throw err;
    }
  );
  createContentType(finalMapped)
}

ExtractTemplate.prototype = {
  start: function () {
    successLogger(`exporting Template`);
  },
};

module.exports = ExtractTemplate;