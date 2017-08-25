/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {classes:Cc, interfaces: Ci, utils: Cu} = Components;

const EXPORTED_SYMBOLS = ["HomepageStudy"];

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Log.jsm");

const RAPPOR_PATH = `chrome://shield-study-rappor/content/TelemetryRappor.jsm`;
const { TelemetryRappor } = Cu.import(RAPPOR_PATH, {});

const PREF_HOMEPAGE = "browser.startup.homepage";

const log = createLog("HomepageStudy", "Info");

/**
 * Create the logger
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
 * Get the user's homepage. If the homepage is about:home, this value is returned.
 * If it's any other about page, about:pages is returned. If the return value is null,
 * there is a error with the homepage.
 * This function will fail if the host is an IP address or is empty when calling Services.eTLD.getBaseDomain.
 * @returns the eTLD+1 of the user's homeapage or null.
 */
function getHomepage() {
  let homepage;
  try {
    homepage = Services.prefs.getComplexValue(PREF_HOMEPAGE, Ci.nsIPrefLocalizedString).data;
  } catch (e) {
    log.error("Error obtaining the homepage: ", e);
    return null;
  }
  // Transform the homepage into a nsIURI. Neccesary to get the base domain.
  let homepageURI;
  try {
    let uriFixup = Cc["@mozilla.org/docshell/urifixup;1"].getService(Ci.nsIURIFixup);
    homepageURI = uriFixup.createFixupURI(homepage, Ci.nsIURIFixup.FIXUP_FLAG_NONE);
  } catch (e) {
    log.error("Error creating URI from homepage string: ", e);
    return null;
  }

  if (homepage.startsWith("about:")) {
    return (homepage === "about:home") ? homepage : "about:pages";
  }

  let eTLD;
  try {
    eTLD = Services.eTLD.getBaseDomain(homepageURI);
  } catch (e) {
    log.error("Error getting base domain: ", e);
    return null;
  }
  return eTLD;
}

var HomepageStudy = {
  /**
   * Returns the value encoded by RAPPOR or null if the homepage can't be obtained.
   * @param {string} studyName - Name of the study.
   *
   * @returns the encoded value returned by RAPPOR or null if the eTLD+1 can't be obtained.
   */
  reportValue(studyName) {
    let eTLDHomepage = getHomepage();
    if (!eTLDHomepage) {
      return null;
    }
    return TelemetryRappor.createReport(studyName, eTLDHomepage, {filterSize: 16, numHashFunctions: 2,
                                        cohorts: 100, f: 0.0, p: 0.35, q: 0.65});
  }
}
