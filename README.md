# RAPPOR shield study prototype
This is a research prototype built as part of an internship project. See the Mozilla Governance
[thread](https://groups.google.com/forum/#!msg/mozilla.governance/81gMQeMEL0w/diyeJRFxAgAJ) for context.

## Introduction
This addon is a SHIELD Study that collects the eTLD+1 of the user's homepage
and applies [RAPPOR](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/42852.pdf),
a [Differential Privacy](https://en.wikipedia.org/wiki/Differential_privacy) algorithm, to encode and obfuscate it.
The result is sent in a custom ping with no [clientId](https://firefox-source-docs.mozilla.org/toolkit/components/telemetry/telemetry/data/common-ping.html)
 or [environment](https://firefox-source-docs.mozilla.org/toolkit/components/telemetry/telemetry/data/environment.html) information.

The purpose of this study is to confirm that we can get representative data, preserving indivudual
user privacy, for the Firefox population.
Using RAPPOR we collect aggregate data on the most common domain value users set their homepage to (e.g. foo.com)
or the value of "about:home".

## Addon Behaviour
The addon extracts the eTLD+1 from the value stored in the `browser.startup.homepage` 
preference and applies RAPPOR ([bug 1379195](https://bugzilla.mozilla.org/show_bug.cgi?id=1379195)) to make it anonymous. 
It can fail if the host is an IP address or is empty when calling `Services.eTLD.getBaseDomain`.
In such case, the study ends. For example, if the value stored in the preference is `foo.bar.com` 
the addon applies RAPPOR to `bar.com` and then sends the anonymized bit field out.
Other possiblity is that the user's homepage is `about:home` or other `about:` page.
In the case of `about:home`, this is the value we use. In the case of other `about:`
page, the reported value is `about:pages`.

The algorithm returns two values, the cohort and the encoded input value. This is sent
in a custom ping.

The cohort is stored in a preference if more than one value needs to be reported.

## Data format
This opt-out ping is sent from the addon when RAPPOR is successfully applied to the extracted eTLD+1 value.

### Structure

```JS
{
  "type": "shield-study-addon",
  ... common ping data
  },
  "payload": {
    "version": <int> // 3,
    "study_name": <string> // "TelemetryRAPPOR",
    "branch": <string> // "eTLD+1",
    "addon_version": <string> // "1.0.0",
    "shield_version": <string> // "4.0.0",
    "type": <string> // "shield-study-addon",
    "data": {
      "attributes": {
        "cohort": <string> // "6",
        "report": <string> // "180504828f142c0204000004010346c0"
      }
    },
    "testing": false
  },
  ... ping data
}
```

### payload.version
This field contains the version of the payload.

### payload.study_name
This field contains the name of the study, as set in `Config.jsm`.

### payload.branch
This field contains the branch of the experiment. In this case,
the experiment has only one branch.

### payload.addon_version
This field contains the version of the adddon, as set in `package.json`.

### payload.shield_version
This field contains the version of the Shield study addons library.

### payload.type
This field contains the type of the payload. In this case, 
`shield-study-addon`.

### payload.data.attributes.cohort
This field contains the cohort to which a client belongs to.

### payload.data.attributes.report
This field contains the RAPPOR value of the user's homepage.

## Development

### Install

`npm install`
`npm run build`

At second shell/prompt, watch files for changes to rebuild:

`npm run watch`


### In Firefox:

1. `about:debugging > [load temporary addon] >` choose `dist/addon.xpi`
2. `tools > Web Developer > Browser Toolbox`.

### Description of the files

- `HomepageStudy.jsm`: implements the logic to extract the eTLD+1 from the preference and apply RAPPOR.
- `TelemetryRappor.jsm`: implements the RAPPOR algorithm and the related utility functions.
- `StudyUtils.jsm`: miscellaneous SHIELD utils.
- `bootstrap.js`: contains addon specific boilerplate code.

### Description of architecture

This addon is structured as a restartless (`bootstrap.js`) extension.

During `bootstrap.js:startup(data, reason)`:

1. `shieldUtils` imports and sets configuration from `Config.jsm`.
2. Modules are imported.
3. Study is setted up.
4. RAPPOR is executed.
4. `boostrap.js` waits for requests from `HomepageStudy.jsm` the that 
are study related:  `["info", "telemetry", "endStudy"]`.
5. Data is sent to Telemetry.
7. The study ends and the addon is uninstalled.

## Simulations
To validate using the simulator, the addon can be set to work in *simulation* mode:
1. Clone the RAPPOR simulator repository:

```git clone https://github.com/Alexrs95/rappor```

2. Follow the instructions to install the dependencies.

3. Generate data (You can find the list of possible data distributions in [`tests/regtest_spec.py`](https://github.com/Alexrs95/rappor/blob/master/tests/regtest_spec.py):

```./regtest.sh gen-values 'zipf1.5-tiny2-sim_final2'```

4. Set the option `isSimulation` to `true` in `addon/Config.jsm`.

5. Set the option `rapporSimulatorPath` to the location of the RAPPOR simulator in `addon/Config.jsm`.

6. Build the addon with `npm run build`.

7. Run the addon. In Firefox: `about:debugging > [load temporary addon] >` choose `dist/addon.xpi`.

8. Perform the analysis:

```./regtest.sh analysis 'r-zipf1.5-tiny2-sim_final2' 1 'python'```

