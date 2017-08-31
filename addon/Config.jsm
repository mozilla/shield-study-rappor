/* 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

"use strict";

/* to use:

- Recall this file has chrome privileges
- Cu.import in this file will work for any 'general firefox things' (Services,etc)
  but NOT for addon-specific libs
*/

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "(config|EXPORTED_SYMBOLS)" }]*/
var EXPORTED_SYMBOLS = ["config"];

var config = {
  "study": {
    "studyName": "TelemetryRAPPOR",
    "variation": {
      "name": "eTLD+1",
    },
    // True if the addon is run for a simulation.
    "isSimulation": false,
    // Path containing the RAPPOR simulator.
    "rapporSimulatorPath": "",
    /** **endings**
      * - keys indicate the 'endStudy' even that opens these.
      * - urls should be static (data) or external, because they have to
      *   survive uninstall
      * - If there is no key for an endStudy reason, no url will open.
      * - usually surveys, orientations, explanations
      */
    "endings": {
      /** standard endings */
      "user-disable": {
        "baseUrl": null,
      },
      "ineligible": {
        "baseUrl": null,
      },
      "expired": {
        "baseUrl": null,
      },
      "a-non-url-opening-ending": {
        "study_state": "ended-neutral",
        "baseUrl":  null,
      },
    },
    "telemetry": {
      "send": true,
      // Shield study utils includes that in the telemetry payload
      // to exclude testing data from analysis at a later point.
      // Set to false for testing.
      "removeTestingFlag": true,
    },
    "studyUtilsPath": `./StudyUtils.jsm`,
  },
  "isEligible": async function() {
    // Everyone is elegible for this study. We want to get unbiased data
    // from the entire population.
    return true;
  },
  // addon-specific modules to load/unload during `startup`, `shutdown`.
  // If it doesn't exist, the addon crashes when Jsm.import is called.
  "modules": [],
  // sets the logging for BOTH the bootstrap file AND shield-study-utils
  "log": {
    // Fatal: 70, Error: 60, Warn: 50, Info: 40, Config: 30, Debug: 20, Trace: 10, All: 0,
    "bootstrap":  {
      "level": "Info",
    },
  },
};
