// index.js:

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

//
// The config module loads these files immediately when it is required:
//
//   ./config/base.config
//   ./config/<NODE_ENV>.config
//
// Therefore, create controlled configuration files before requiring it.
//

const configDirectory = path.resolve("./config");
const baseConfigFile = path.join(configDirectory, "base.config");
const devConfigFile = path.join(configDirectory, "dev.config");

const baseConfig = `
APP_NAME=Turbo Configuration Test

BOOL_TRUE=true
BOOL_FALSE=false

BOOL_STRING_TRUE=yes
BOOL_STRING_FALSE=no

INVALID_BOOLEAN=maybe

INTEGER_VALUE=42
INTEGER_STRING=123

INVALID_INTEGER=abc

NUMBER_VALUE=12.5
NUMBER_STRING=99.75

INVALID_NUMBER=not-a-number

TRIM_BOTH="   trim me   "
TRIM_LEFT="   trim-left   "
TRIM_RIGHT="trim-right   "
TRIM_NONE="   no trim   "

CASE_VALUE="Hello WORLD test"

MIN_LENGTH_VALUE=abcdef
MAX_LENGTH_VALUE=abc

COMMON_VALUE=from-common
COMMON_NUMBER=200
COMMON_BOOLEAN=true
COMMON_ONLY=common
COMMON_EXPANDED=\${APP_NAME}
`;

const devConfig = `
NODE_ENV=dev

RUNTIME_VALUE=from-dev
RUNTIME_NUMBER=300
RUNTIME_BOOLEAN=false
RUNTIME_EXPANDED=\${APP_NAME}
`;

//
// Preserve any existing configuration files so the test suite does not
// permanently overwrite the developer's files.
//

let originalBaseConfig = null;
let originalDevConfig = null;
let baseConfigExisted = false;
let devConfigExisted = false;

function writeTestConfiguration() {
  fs.mkdirSync(configDirectory, { recursive: true });

  baseConfigExisted = fs.existsSync(baseConfigFile);
  devConfigExisted = fs.existsSync(devConfigFile);

  if (baseConfigExisted) {
    originalBaseConfig = fs.readFileSync(baseConfigFile);
  }

  if (devConfigExisted) {
    originalDevConfig = fs.readFileSync(devConfigFile);
  }

  fs.writeFileSync(baseConfigFile, baseConfig.trimStart());
  fs.writeFileSync(devConfigFile, devConfig.trimStart());
}

function restoreConfiguration() {
  if (baseConfigExisted) {
    fs.writeFileSync(baseConfigFile, originalBaseConfig);
  } else if (fs.existsSync(baseConfigFile)) {
    fs.unlinkSync(baseConfigFile);
  }

  if (devConfigExisted) {
    fs.writeFileSync(devConfigFile, originalDevConfig);
  } else if (fs.existsSync(devConfigFile)) {
    fs.unlinkSync(devConfigFile);
  }

  try {
    if (fs.existsSync(configDirectory)) {
      const entries = fs.readdirSync(configDirectory);

      if (entries.length === 0) {
        fs.rmdirSync(configDirectory);
      }
    }
  } catch {
    // Cleanup should never cause the test suite itself to fail.
  }
}

//
// Create fixtures before index.js is loaded.
//

writeTestConfiguration();

//
// Load the module under test only after the configuration files exist.
//

const config = require("../index.js");

//
// Boolean accessor tests
//

test("bool() returns true for a boolean configuration value", () => {
  assert.equal(config.bool("BOOL_TRUE"), true);
});

test("bool() returns false for a boolean configuration value", () => {
  assert.equal(config.bool("BOOL_FALSE"), false);
});

test("bool() accepts true string values", () => {
  assert.equal(config.bool("BOOL_STRING_TRUE"), true);
});

test("bool() accepts false string values", () => {
  assert.equal(config.bool("BOOL_STRING_FALSE"), false);
});

test("bool() supports 1 and 0", () => {
  assert.equal(config.bool("TRUE_ONE", "1"), true);
  assert.equal(config.bool("FALSE_ZERO", "0"), false);
});

test("bool() supports on and off", () => {
  assert.equal(config.bool("TRUE_ON", "on"), true);
  assert.equal(config.bool("FALSE_OFF", "off"), false);
});

test("bool() is case insensitive", () => {
  assert.equal(config.bool("TRUE_MIXED", "TrUe"), true);
  assert.equal(config.bool("FALSE_MIXED", "FaLsE"), false);
});

test("bool() supports default values", () => {
  assert.equal(config.bool("MISSING_BOOLEAN", true), true);
  assert.equal(config.bool("MISSING_BOOLEAN_2", false), false);
});

test("bool() returns undefined for optional missing values", () => {
  assert.equal(
    config.bool("MISSING_OPTIONAL_BOOLEAN", undefined, {
      optional: true,
    }),
    undefined
  );
});

test("bool() throws for an invalid boolean", () => {
  assert.throws(
    () => config.bool("INVALID_BOOLEAN"),
    /must be a valid boolean/
  );
});

test("bool() throws when a required value is missing", () => {
  assert.throws(
    () => config.bool("MISSING_REQUIRED_BOOLEAN"),
    /"MISSING_REQUIRED_BOOLEAN" is required/
  );
});

//
// Integer accessor tests
//

test("int() returns an integer", () => {
  assert.equal(config.int("INTEGER_VALUE"), 42);
});

test("int() parses an integer string", () => {
  assert.equal(config.int("INTEGER_STRING"), 123);
});

test("int() supports minimum values", () => {
  assert.equal(
    config.int("INTEGER_VALUE", undefined, {
      minValue: 40,
    }),
    42
  );
});

test("int() rejects values below minValue", () => {
  assert.throws(
    () =>
      config.int("INTEGER_VALUE", undefined, {
        minValue: 100,
      }),
    /cannot be less than 100/
  );
});

test("int() supports maximum values", () => {
  assert.equal(
    config.int("INTEGER_VALUE", undefined, {
      maxValue: 50,
    }),
    42
  );
});

test("int() rejects values above maxValue", () => {
  assert.throws(
    () =>
      config.int("INTEGER_VALUE", undefined, {
        maxValue: 40,
      }),
    /cannot be greater than 40/
  );
});

test("int() throws for an invalid integer", () => {
  assert.throws(() => config.int("INVALID_INTEGER"), /must be a valid integer/);
});

test("int() supports default values", () => {
  assert.equal(config.int("MISSING_INTEGER", 55), 55);
});

test("int() returns undefined for optional missing values", () => {
  assert.equal(
    config.int("MISSING_OPTIONAL_INTEGER", undefined, {
      optional: true,
    }),
    undefined
  );
});

test("int() throws when a required value is missing", () => {
  assert.throws(
    () => config.int("MISSING_REQUIRED_INTEGER"),
    /"MISSING_REQUIRED_INTEGER" is required/
  );
});

//
// Number accessor tests
//

test("num() returns a number", () => {
  assert.equal(config.num("NUMBER_VALUE"), 12.5);
});

test("num() converts numeric strings", () => {
  assert.equal(config.num("NUMBER_STRING"), 99.75);
});

test("num() supports minimum values", () => {
  assert.equal(
    config.num("NUMBER_VALUE", undefined, {
      minValue: 10,
    }),
    12.5
  );
});

test("num() rejects values below minValue", () => {
  assert.throws(
    () =>
      config.num("NUMBER_VALUE", undefined, {
        minValue: 20,
      }),
    /cannot be less than 20/
  );
});

test("num() supports maximum values", () => {
  assert.equal(
    config.num("NUMBER_VALUE", undefined, {
      maxValue: 20,
    }),
    12.5
  );
});

test("num() rejects values above maxValue", () => {
  assert.throws(
    () =>
      config.num("NUMBER_VALUE", undefined, {
        maxValue: 10,
      }),
    /cannot be greater than 10/
  );
});

test("num() throws for an invalid number", () => {
  assert.throws(() => config.num("INVALID_NUMBER"), /must be a valid number/);
});

test("num() supports default values", () => {
  assert.equal(config.num("MISSING_NUMBER", 25.5), 25.5);
});

test("num() returns undefined for optional missing values", () => {
  assert.equal(
    config.num("MISSING_OPTIONAL_NUMBER", undefined, {
      optional: true,
    }),
    undefined
  );
});

test("num() throws when a required value is missing", () => {
  assert.throws(
    () => config.num("MISSING_REQUIRED_NUMBER"),
    /"MISSING_REQUIRED_NUMBER" is required/
  );
});

//
// String accessor tests
//

test("str() returns a string", () => {
  assert.equal(config.str("APP_NAME"), "Turbo Configuration Test");
});

test("str() trims whitespace by default", () => {
  assert.equal(config.str("TRIM_BOTH"), "trim me");
});

test("str() supports left trimming", () => {
  assert.equal(
    config.str("TRIM_LEFT", undefined, {
      trim: "left",
    }),
    "trim-left   "
  );
});

test("str() supports right trimming", () => {
  assert.equal(
    config.str("TRIM_RIGHT", undefined, {
      trim: "right",
    }),
    "trim-right"
  );
});

test("str() supports no trimming", () => {
  assert.equal(
    config.str("TRIM_NONE", undefined, {
      trim: "none",
    }),
    "   no trim   "
  );
});

test("str() supports lower-case conversion", () => {
  assert.equal(
    config.str("CASE_VALUE", undefined, {
      case: "lower",
    }),
    "hello world test"
  );
});

test("str() supports upper-case conversion", () => {
  assert.equal(
    config.str("CASE_VALUE", undefined, {
      case: "upper",
    }),
    "HELLO WORLD TEST"
  );
});

test("str() supports title-case conversion", () => {
  assert.equal(
    config.str("CASE_VALUE", undefined, {
      case: "title",
    }),
    "Hello World Test"
  );
});

test("str() supports minimum length", () => {
  assert.equal(
    config.str("MIN_LENGTH_VALUE", undefined, {
      minLength: 5,
    }),
    "abcdef"
  );
});

test("str() rejects strings shorter than minLength", () => {
  assert.throws(
    () =>
      config.str("MIN_LENGTH_VALUE", undefined, {
        minLength: 100,
      }),
    /must be at least 100 characters/
  );
});

test("str() supports maximum length", () => {
  assert.equal(
    config.str("MAX_LENGTH_VALUE", undefined, {
      maxLength: 5,
    }),
    "abc"
  );
});

test("str() rejects strings longer than maxLength", () => {
  assert.throws(
    () =>
      config.str("MAX_LENGTH_VALUE", undefined, {
        maxLength: 2,
      }),
    /cannot exceed 2 characters/
  );
});

test("str() supports default values", () => {
  assert.equal(config.str("MISSING_STRING", "default value"), "default value");
});

test("str() returns undefined for optional missing values", () => {
  assert.equal(
    config.str("MISSING_OPTIONAL_STRING", undefined, {
      optional: true,
    }),
    undefined
  );
});

test("str() throws when a required value is missing", () => {
  assert.throws(
    () => config.str("MISSING_REQUIRED_STRING"),
    /"MISSING_REQUIRED_STRING" is required/
  );
});

test("str() rejects an invalid trim option", () => {
  assert.throws(
    () =>
      config.str("APP_NAME", undefined, {
        trim: "invalid",
      }),
    /trim must be/
  );
});

test("str() rejects an invalid case option", () => {
  assert.throws(
    () =>
      config.str("APP_NAME", undefined, {
        case: "invalid",
      }),
    /case must be/
  );
});

//
// Utility accessor tests
//

test("has() returns true for an existing configuration value", () => {
  assert.equal(config.has("APP_NAME"), true);
});

test("has() returns true for a value inherited from base.config", () => {
  assert.equal(config.has("COMMON_VALUE"), true);
});

test("has() returns true for a runtime configuration value", () => {
  assert.equal(config.has("RUNTIME_VALUE"), true);
});

test("has() returns false for a missing configuration value", () => {
  assert.equal(config.has("DOES_NOT_EXIST"), false);
});

test("keys() returns configuration keys", () => {
  const keys = config.keys();

  assert.ok(Array.isArray(keys));
  assert.ok(keys.includes("APP_NAME"));
  assert.ok(keys.includes("COMMON_VALUE"));
  assert.ok(keys.includes("RUNTIME_VALUE"));
  assert.ok(keys.includes("NODE_ENV"));
});

test("toObject() returns a configuration object", () => {
  const object = config.toObject();

  assert.equal(object.APP_NAME, "Turbo Configuration Test");
  assert.equal(object.COMMON_VALUE, "from-common");
  assert.equal(object.RUNTIME_VALUE, "from-dev");
  assert.equal(object.NODE_ENV, "dev");
});

test("toObject() returns a frozen object", () => {
  const object = config.toObject();

  assert.equal(Object.isFrozen(object), true);
});

test("toObject() returns a copy rather than the private configuration object", () => {
  const first = config.toObject();
  const second = config.toObject();

  assert.notEqual(first, second);
  assert.deepEqual(first, second);
});

//
// Configuration loading tests
//

test("runtime configuration overrides base configuration", () => {
  assert.equal(config.str("RUNTIME_VALUE"), "from-dev");
});

test("base configuration values remain available", () => {
  assert.equal(config.str("COMMON_ONLY"), "common");
});

test("runtime configuration values are available", () => {
  assert.equal(config.str("RUNTIME_VALUE"), "from-dev");
  assert.equal(config.num("RUNTIME_NUMBER"), 300);
  assert.equal(config.bool("RUNTIME_BOOLEAN"), false);
});

test("NODE_ENV is normalized to the selected environment", () => {
  assert.equal(config.str("NODE_ENV"), "dev");
});

//
// Variable expansion tests
//

test("variables are expanded from configuration", () => {
  assert.equal(config.str("COMMON_EXPANDED"), "Turbo Configuration Test");
});

test("runtime variables are expanded from configuration", () => {
  assert.equal(config.str("RUNTIME_EXPANDED"), "Turbo Configuration Test");
});

//
// Cleanup
//

test.after(() => {
  restoreConfiguration();
});
