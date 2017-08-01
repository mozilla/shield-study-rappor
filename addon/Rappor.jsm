/* 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */
 
"use strict";

let TelemetryRappor = {
    createReport: function(name, v, k = 16, h = 2, cohorts = 128, f = 0.5, p = 0.5, q = 0.75) {
	// Retrieve (and generate if necessary) the RAPPOR secret. This secret
	// never leaves the client.
	let secret = null;
	try {
	    secret = Services.prefs.getCharPref(PREF_RAPPOR_SECRET);
	    if (secret.length != 64)
		secret = null;
	} catch (e) {}
	if (secret === null) {
	    secret = bytesToHex(getRandomBytes(32));
	    Services.prefs.setCharPref(PREF_RAPPOR_SECRET, secret);
	}
	// If we haven't self-selected a cohort yet for this measurement,
	// then do so now, otherwise retrieve the cohort.
	let cohort = null;
	try {
	    cohort = Services.prefs.getIntPref(PREF_RAPPOR_PATH + name + ".cohort");
	} catch (e) {}
	if (cohort === null) {
	    cohort = Math.floor(Math.random() * cohorts);
	    Services.prefs.setIntPref(PREF_RAPPOR_PATH + name + ".cohort", cohort);
	}
	Services.prefs.setCharPref(PREF_RAPPOR_PATH + name + ".value", v);
	return {
	    cohort: cohort,
	    report: bytesToHex(create_report(v, k, h, cohort, f, secret, name, p, q)),
	};
    },
    // Internals. Mostly exposed for testing.
    internal: {
	getRandomBytes: getRandomBytes,
	makePRNG: makePRNG,
	bf_random: bf_random,
	bf_signal: bf_signal,
	bf_prr: bf_prr,
	bf_irr: bf_irr,
    },
}
 
this.TelemetryRappor = TelemetryRappor;