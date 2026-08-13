// index.js

"use strict";

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

//
// Private module configuration state
//
let configuration = {};

//
// Load dotenv-compatible configuration file
//
function loadConfigFile(filename) {
  const fullPath = path.resolve(filename);

  if (!fs.existsSync(fullPath)) {
    return {};
  }

  const contents = fs.readFileSync(fullPath, "utf8");

  return dotenv.parse(contents);
}

//
// Validate NODE_ENV before using it as a filename
//
function sanitizeEnvironment(value) {
  value = String(value);

  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error(`"${value}" is not a valid NODE_ENV value.`);
  }

  return value;
}

//
// Expand ${VARIABLE} references
//
// Environment variables take precedence over configuration values.
//
// Example:
//
//   process.env.DB_HOST = "https://postgres-hosting.com"
//   configuration.DB_HOST = "${DB_HOST}"
//
// becomes:
//
//   configuration.DB_HOST = "https://postgres-hosting.com"
//
// Configuration values may also reference other configuration values.
//
// Circular references are detected and left unresolved rather than
// causing infinite recursion.
//
function expandVariables(config) {
  const pattern = /\$\{([^}]+)\}/g;
  const resolving = new Set();

  function resolveValue(key) {
    if (resolving.has(key)) {
      return config[key];
    }

    const value = config[key];

    if (typeof value !== "string") {
      return value;
    }

    resolving.add(key);

    const resolved = value.replace(pattern, (match, variable) => {
      //
      // Environment variables have priority.
      //
      if (process.env[variable] !== undefined) {
        return process.env[variable];
      }

      //
      // Then check configuration values.
      //
      if (config[variable] !== undefined) {
        if (variable === key || resolving.has(variable)) {
          return match;
        }

        const resolvedVariable = resolveValue(variable);

        if (resolvedVariable !== undefined) {
          return String(resolvedVariable);
        }
      }

      //
      // Leave unresolved references unchanged.
      //
      return match;
    });

    resolving.delete(key);

    config[key] = resolved;

    return resolved;
  }

  for (const key of Object.keys(config)) {
    resolveValue(key);
  }

  return config;
}

//
// Required value error
//
function throwRequiredError(name) {
  throw new Error(`"${name}" is required.`);
}

//
// Get raw configuration value
//
function getValue(name, defaultValue, options) {
  let value = configuration[name];

  if (value === undefined) {
    value = defaultValue;
  }

  if (value === undefined && !options.optional) {
    throwRequiredError(name);
  }

  return value;
}

//
// Boolean accessor
//
function bool(name, defaultValue = undefined, options = {}) {
  let value = getValue(name, defaultValue, options);

  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  switch (String(value).toLowerCase()) {
    case "true":
    case "1":
    case "yes":
    case "on":
      return true;

    case "false":
    case "0":
    case "no":
    case "off":
      return false;

    default:
      throw new Error(`"${name}" must be a valid boolean.`);
  }
}

//
// Integer accessor
//
function int(name, defaultValue = undefined, options = {}) {
  let value = getValue(name, defaultValue, options);

  if (value === undefined) {
    return undefined;
  }

  value = Number.parseInt(value, 10);

  if (Number.isNaN(value)) {
    throw new Error(`"${name}" must be a valid integer.`);
  }

  if (options.minValue !== undefined && value < options.minValue) {
    throw new Error(`"${name}" cannot be less than ${options.minValue}.`);
  }

  if (options.maxValue !== undefined && value > options.maxValue) {
    throw new Error(`"${name}" cannot be greater than ${options.maxValue}.`);
  }

  return value;
}

//
// Number accessor
//
function num(name, defaultValue = undefined, options = {}) {
  let value = getValue(name, defaultValue, options);

  if (value === undefined) {
    return undefined;
  }

  value = Number(value);

  if (Number.isNaN(value)) {
    throw new Error(`"${name}" must be a valid number.`);
  }

  if (options.minValue !== undefined && value < options.minValue) {
    throw new Error(`"${name}" cannot be less than ${options.minValue}.`);
  }

  if (options.maxValue !== undefined && value > options.maxValue) {
    throw new Error(`"${name}" cannot be greater than ${options.maxValue}.`);
  }

  return value;
}

//
// String accessor
//
function str(name, defaultValue = undefined, options = {}) {
  let value = getValue(name, defaultValue, options);

  if (value === undefined) {
    return undefined;
  }

  value = String(value);

  switch (options.trim ?? "both") {
    case "both":
      value = value.trim();
      break;

    case "left":
      value = value.trimStart();
      break;

    case "right":
      value = value.trimEnd();
      break;

    case "none":
      break;

    default:
      throw new Error(
        `"${name}" trim must be "both", "left", "right", or "none".`
      );
  }

  switch (options.case ?? "none") {
    case "none":
      break;

    case "lower":
      value = value.toLowerCase();
      break;

    case "upper":
      value = value.toUpperCase();
      break;

    case "title":
      value = value.replace(
        /\w\S*/g,
        (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      );
      break;

    default:
      throw new Error(
        `"${name}" case must be "none", "lower", "upper", or "title".`
      );
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    throw new Error(
      `"${name}" must be at least ${options.minLength} characters.`
    );
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    throw new Error(`"${name}" cannot exceed ${options.maxLength} characters.`);
  }

  return value;
}

//
// Utility accessors
//
function has(name) {
  return configuration[name] !== undefined;
}

function keys() {
  return Object.keys(configuration);
}

function toObject() {
  return Object.freeze({
    ...configuration,
  });
}

//
// Initialize configuration
//

// 1. Load base.config
Object.assign(configuration, loadConfigFile("./config/base.config"));

// 2. Determine runtime mode
const environment = sanitizeEnvironment(
  configuration.NODE_ENV || process.env.NODE_ENV || "dev"
);

// 3. Load runtime-specific configuration
Object.assign(configuration, loadConfigFile(`./config/${environment}.config`));

// 4. Normalize final NODE_ENV
configuration.NODE_ENV = environment;

// 5. Expand ${VARIABLE} references
expandVariables(configuration);

// 6. Display configuration when requested
if (process.argv.includes("--show-config")) {
  console.log("configuration");
  console.log(configuration);
  process.exit(0);
}

//
// Public API
//
module.exports = {
  bool,
  int,
  num,
  str,

  has,
  keys,
  toObject,
};
