/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {classes:Cc, interfaces: Ci, utils: Cu} = Components;

const EXPORTED_SYMBOLS = ["Simulator"];

Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/Log.jsm");

const TELEMETRY_RAPPOR_PATH = `chrome://shield-study-rappor/content/TelemetryRappor.jsm`;
const { TelemetryRappor } = Cu.import(TELEMETRY_RAPPOR_PATH, {});

const log = createLog("Simulator", "Info");

/**
 * Create the logger.
 * @param {string} name - Name to show in the logs.
 * @param {string} level - Log level.
 */
function createLog(name, level) {
  var logger = Log.repository.getLogger(name);
  logger.level = Log.Level[level] || Log.Level.Debug;
  logger.addAppender(new Log.ConsoleAppender(new Log.BasicFormatter()));
  return logger;
}

/**
 * Runs the simulation and writes the data into case_reports.csv.
 * For running the simulation, the true values from case_true_values.csv
 * are read, and RAPPOR is executed.
 * The case_true_value.csv is expected to have multiple lines with the following
 * format {client, cohort, value}.
 * It contains the true values used for the simulation, the client that submits
 * the value and the cohort this client belongs to.
 * The case_reports.csv is expected to have multiple lines with the following
 * format {client, cohort, bloom, prr, irr}. This values
 * are needed to run the analysis.
 * @param {string} studyName - Name of the study.
 * @param {string} rapporPath - Path where the RAPPOR simulator lives.
 * @param {object} params - Object containing the algorithm parameters.\
 * @param {constant} method  - Method used to encode. Supported: nsICryptoHash.MD5 and nsICryptoHash.SHA256
 * @param {string} instance - Simulation instance.
 */
function runRapporSimulation(studyName, rapporPath, params, method, instance) {
  let data = read(new FileUtils.File(rapporPath + "_tmp/python/" + instance + "/1/case_true_values.csv"));
  let caseReportsFile = new FileUtils.File(rapporPath + "_tmp/python/" + instance + "/1/case_reports.csv");
  write(caseReportsFile, "client, cohort, bloom, prr, irr\n");
  // Iterate over each line of the file getting the client, cohort and value.
  // Each line represents a candidate sample that will be used to test the rappor implementation.
  for (let i = 1; i < data.length; i++) {
    let line = data[i].split(",");
    let report = TelemetryRappor.createReport(studyName, line[2], params, method, line[1]);
    // The expected format is {client, cohort, bloom, prr, irr}.
    write(caseReportsFile, line[0] + ","+ line[1] + "," + convertToBin(report.internalBloom) +
          "," + convertToBin(report.internalPrr) + "," + convertToBin(report.report) + "\n");
  }
}

/**
 * Read the cohort and the true value from a file. {client, cohort, value}.
 * @param {nsFile} file - file containing the true values.
 * 
 * @return a list containig the lines of the file.
 */
function read(file) {
  // open an input stream from file
  var istream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
  istream.init(file, FileUtils.MODE_RDONLY, FileUtils.PERMS_FILE, 0);
  istream.QueryInterface(Ci.nsILineInputStream);
  // read lines into array
  var line = {}, lines = [], hasMore;
  do {
    hasMore = istream.readLine(line);
    lines.push(line.value);
  } while(hasMore);

  istream.close();

  return lines;
}

/**
 * Write in a CSV {client, cohort, bloom, prr, irr}.
 * @param {nsIFile} file - File to write in.
 * @param {string} data - String containing the client, cohort, bloom, prr and irr.
 */
function write(file, data) {
  var foStream = FileUtils.openFileOutputStream(file, FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE | FileUtils.MODE_APPEND);
  var converter = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
  converter.init(foStream, "UTF-8", 0, 0);
  converter.writeString(data);
  converter.close();
  foStream.close();
}

/**
 * Convert an string representing hex into a binary string.
 * @param hex - hex string to convert.
 */
function convertToBin(hex) {
  let str = parseInt(hex, 16).toString(2);
  let expected = hex.toString().length * 4;
  let real = str.length;
  while (real < expected) {
    str = '0' + str;
    real++;
  }
  return str;
}

var Simulator = {
  /**
   * Returns the value encoded by RAPPOR or null if the homepage can't be obtained.
   * @param {string} studyName - Name of the study.
   * @param {boolean} isSimulation - Boolean indicating whether the execution is for a simulation.
   * @param {string} rapporPath - Path where the RAPPOR simulator is located.
   */
  reportValue(studyName, isSimulation, rapporPath) {
    let instance = read(new FileUtils.File(rapporPath + "_tmp/python/test-instances.txt"))[0].split(" ")[0];

    let params = read(new FileUtils.File(rapporPath + "_tmp/python/" + instance + "/case_params.csv"));
    // In the file, the filterSize (k) value is in bits, but here we use bytes.
    let filterSize = parseInt(params[1].split(",")[0], 10) / 8;
    let numHashFunctions = parseInt(params[1].split(",")[1], 10);
    let cohorts = parseInt(params[1].split(",")[2], 10);
    let p = parseFloat(params[1].split(",")[3]);
    let q = parseFloat(params[1].split(",")[4]);
    let f = parseFloat(params[1].split(",")[5]);

    runRapporSimulation(studyName, rapporPath,
                        {filterSize: filterSize, numHashFunctions: numHashFunctions, cohorts: cohorts, f: f, p: p, q: q},
                        Ci.nsICryptoHash.MD5, instance);
  },
}

