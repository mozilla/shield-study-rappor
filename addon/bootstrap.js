/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

"use strict";

/* global  __SCRIPT_URI_SPEC__  */
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "(startup|shutdown|install|uninstall)" }]*/

const {classes:Cc, interfaces: Ci, utils: Cu} = Components;
const CONFIGPATH = `${__SCRIPT_URI_SPEC__}/../Config.jsm`;
const { config } = Cu.import(CONFIGPATH, {});
const studyConfig = config.study;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Log.jsm");

const STUDY_UTILS_PATH = `${__SCRIPT_URI_SPEC__}/../${studyConfig.studyUtilsPath}`;
const HOMEPAGE_STUDY_PATH = `${__SCRIPT_URI_SPEC__}/../HomepageStudy.jsm`;
const SIMULATOR_PATH = `${__SCRIPT_URI_SPEC__}/../Simulator.jsm`;

const { studyUtils } = Cu.import(STUDY_UTILS_PATH, {});

const log = createLog(studyConfig.studyName, config.log.bootstrap.level);

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

// Addon state change reasons.
const REASONS = {
  APP_STARTUP: 1,      // The application is starting up.
  APP_SHUTDOWN: 2,     // The application is shutting down.
  ADDON_ENABLE: 3,     // The add-on is being enabled.
  ADDON_DISABLE: 4,    // The add-on is being disabled. (Also sent during uninstallation)
  ADDON_INSTALL: 5,    // The add-on is being installed.
  ADDON_UNINSTALL: 6,  // The add-on is being uninstalled.
  ADDON_UPGRADE: 7,    // The add-on is being upgraded.
  ADDON_DOWNGRADE: 8,  // The add-on is being downgraded.
};

for (const r in REASONS) { REASONS[REASONS[r]] = r; }

// Jsm loader / unloader.
class Jsm {
  static import(modulesArray) {
    for (const module of modulesArray) {
      log.debug(`loading ${module}`);
      Cu.import(module);
    }
  }
  static unload(modulesArray) {
    for (const module of modulesArray) {
      log.debug(`Unloading ${module}`);
      Cu.unload(module);
    }
  }
}

async function startup(addonData, reason) {
  // NOTE: the chrome url registered in the manifest and used in the HomepageStudy.jsm
  // is only available once the addon has been started, deferring the jsm loading to be able to
  // use chrome urls to import all the other jsm.
  let study = studyConfig.isSimulation
    ? Cu.import(SIMULATOR_PATH, {}).Simulator
    : Cu.import(HOMEPAGE_STUDY_PATH, {}).HomepageStudy;
  Jsm.import(config.modules);

  studyUtils.setup({
    studyName: studyConfig.studyName,
    endings: studyConfig.endings,
    addon: {
      id: addonData.id,
      version: addonData.version
    },
    telemetry: studyConfig.telemetry,
  });
  studyUtils.setVariation(studyConfig.variation);

  if ((REASONS[reason]) === "ADDON_INSTALL") {
    // Sends telemetry "enter".
    studyUtils.firstSeen();
    const eligible = await config.isEligible();
    if (!eligible) {
      // Uses config.endings.ineligible.url if any.
      // Send a ping if the user is ineligible to run the study.
      // Then uninstalls addon.
      await studyUtils.endStudy({reason: "ineligible"});
      return;
    }
  }
  await studyUtils.startup({reason});

  log.debug(`info ${JSON.stringify(studyUtils.info())}`);

  let value = study.reportValue(studyConfig.studyName, studyConfig.isSimulation, studyConfig.rapporSimulatorPath);

  if (studyConfig.isSimulation || !value) {
    studyUtils.endStudy({reason: "ignored"});
    return;
  }

  // If it's not a simulation, send RAPPOR response to Telemetry.
  studyUtils.telemetry({
    cohort: value.cohort.toString(),
    report: value.report
  });

  studyUtils.endStudy({reason: "done"});
}

/**
 * This function unloads the modules when the addon is
 * uninstalled.
 */
function unload() {
  // Normal shutdown, or 2nd attempts.
  log.debug("Jsms unloading");
  Jsm.unload(config.modules);
  Jsm.unload([CONFIGPATH, STUDY_UTILS_PATH, HOMEPAGE_STUDY_PATH]);
}

function shutdown(addonData, reason) {
  log.debug("shutdown", REASONS[reason] || reason);
  // Are we uninstalling? if so, user or automatic?
  if (reason === REASONS.ADDON_UNINSTALL || reason === REASONS.ADDON_DISABLE) {
    log.debug("uninstall or disable");
    if (!studyUtils._isEnding) {
      // We are the first requestors, must be user action.
      log.debug("user requested shutdown");
      studyUtils.endStudy({reason: "user-disable"});
    }
  }
  unload();
}

function uninstall(addonData, reason) {
  log.debug("uninstall", REASONS[reason] || reason);
}

function install(addonData, reason) {
  // NOTE: the registered chrome url is not available in the install phase,
  // it is only available once the addon has been started.
  log.debug("install", REASONS[reason] || reason);
 }
