#!/usr/bin/env node

const _ = require("lodash")
const dedent = require("dedent")
const expat = require("node-expat")
const fs = require("fs")
const indentString = require("indent-string")
const turf = require("@turf/turf")
const csvparse = require("csv-parse/lib/sync")
const proj4 = require("proj4")
const titlecase = require("titlecase")

const KDBush = require("kdbush")
const geokdbush = require("geokdbush")

const WGS84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"
const EPSG2263 = "+proj=lcc +lat_1=41.03333333333333 +lat_2=40.66666666666666 +lat_0=40.16666666666666 +lon_0=-74 +x_0=300000.0000000001 +y_0=0 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs"

const argv = require("yargs")
  .option("input", {
    alias: "i",
    describe: "input CityGML file",
    demandOption: true
  })
  .option("output", {
    alias: "o",
    describe: "output CityGML file",
    demandOption: true
  })
  .option("pluto", {
    alias: "p",
    describe: "input PLUTO file",
    demandOption: true
  })
  .argv

function posListToCenter(posList) {
  let pointsStr = posList.split(/\s+/)
  let points = []
  for (let i = 0; i < pointsStr.length; i += 3) {
    let x = +pointsStr[i]
    let y = +pointsStr[i + 1]
    points.push(proj4(EPSG2263, WGS84, [x, y]))
  }

  // close polygon if necessary
  if (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1]) {
    points.push(points[0])
  }

  let polygon = turf.polygon([points])
  let center = turf.centerOfMass(polygon).geometry.coordinates

  return center
}

function processFile(inputFilename, outputFilename, plutoIndex, columns) {
  let parser = new expat.Parser("UTF-8")
  let writable = fs.createWriteStream(outputFilename)
  let inGroundSurface = false
  let inPosList = false
  let posList = ""
  let nearest

  parser.on("xmlDecl", (version, encoding, standalone) => {
    let str = `<?xml version="${version}" encoding="${encoding}"`
    if (!standalone) {
      str += ` standalone="false"`
    }
    str += "?>\n"
    writable.write(str)
  })

  parser.on("startElement", (name, attrs) => {
    let str = "<" + name
    for (let k of Object.keys(attrs)) {
      str += " " + k + "=" + JSON.stringify(attrs[k])
    }
    str += ">"
    writable.write(str)

    if (name.indexOf("GroundSurface") !== -1) {
      inGroundSurface = true
    } else if (name.indexOf("posList") !== -1) {
      inPosList = true
      posList = ""
    }
  })

  parser.on("endElement", name => {
    if (name.indexOf("Building") !== -1) {
      if (nearest !== undefined) {
        for (let i = 0; i < nearest.length; ++i) {
          let value = nearest[i]
          if (value !== undefined && value !== "") {
            let valueNoCtrl = value.replace(/[\000-\031]/g, "")
            if (valueNoCtrl !== value) {
              console.log("Replaced invalid control character in attribute")
              console.log(`Old value: ${value}`)
              console.log(`New value: ${valueNoCtrl}`)
              value = valueNoCtrl
            }
            let attr = dedent`<gen:stringAttribute name=${JSON.stringify(columns[i])}>
              <gen:value>${_.escape(value)}</gen:value>
            </gen:stringAttribute>\n`
            attr = indentString(attr, 6)
            if (i === 0) {
              attr = "  " + attr.replace(/^\s+/,"")
            }
            writable.write(attr)
          }
        }
        writable.write("    ")
        nearest = undefined
      }
    }

    let str = `</${name}>`
    writable.write(str)

    if (name.indexOf("GroundSurface") !== -1) {
      inGroundSurface = false
    } else if (name.indexOf("posList") !== -1) {
      inPosList = false
      if (inGroundSurface) {
        let center = posListToCenter(posList)
        nearest = geokdbush.around(plutoIndex, center[0], center[1], 1)
        if (nearest !== undefined && nearest.length >= 1) {
          nearest = nearest[0]
        }
      }
    } else if (name.indexOf("CityModel") !== -1) {
      writable.end()
    }
  })

  parser.on("text", str => {
    writable.write(str)
    if (inGroundSurface && inPosList) {
      posList += str
    }
  })

  let bytesRead = 0
  let bytesTotal = fs.statSync(inputFilename).size
  let readable = fs.createReadStream(inputFilename)
  let lastPercent = -1
  readable.on("data", chunk => {
    parser.write(chunk)
    bytesRead += chunk.length
    let percent = (bytesRead * 100 / bytesTotal).toFixed(0)
    if (percent !== lastPercent) {
      console.log(percent + "%")
      lastPercent = percent
    }
  })
}

function main(inputFilename, outputFilename, plutoFilename) {
  console.log("Reading PLUTO data file ...")
  let pluto = csvparse(fs.readFileSync(plutoFilename), {
    columns: false,
    skip_empty_lines: true
  })

  let columns = pluto.slice(0, 1)[0]
  pluto = pluto.slice(1)

  console.log(`${pluto.length} entries read.`)

  console.log("Prettifying entries ...")
  let iAddress = columns.indexOf("address")
  let iOwnername = columns.indexOf("ownername")
  for (p of pluto) {
    p[iAddress] = titlecase(p[iAddress].toLowerCase())
    p[iOwnername] = titlecase(p[iOwnername].toLowerCase())
  }

  console.log("Building index ...")
  let iLongitude = columns.indexOf("longitude")
  let iLatitude = columns.indexOf("latitude")
  let plutoIndex = new KDBush(pluto, p => p[iLongitude], p => p[iLatitude])

  console.log("Processing file ...")
  processFile(inputFilename, outputFilename, plutoIndex, columns)
}

main(argv.input, argv.output, argv.pluto)
