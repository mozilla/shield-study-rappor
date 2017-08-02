/* 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */
 
"use strict";
const EXPORTED_SYMBOLS = ["TelemetryRappor"];

const PREF_RAPPOR_PATH = "toolkit.telemetry.rappor.";
const PREF_RAPPOR_SECRET = PREF_RAPPOR_PATH + "secret";


var TelemetryRappor = {

    createReport: function(name /*, k = 16, h = 2, cohorts = 128, f = 0.5, p = 0.5, q = 0.75*/) {
        console.log("TelemetryRappor");
    }
};