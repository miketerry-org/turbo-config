@hadem/cfg

A lightweight, zero-configuration configuration manager for Node.js applications.
@hadem/cfg provides a predictable configuration loading pipeline with support for:
.env files
shared configuration files
runtime-specific configuration files
environment variable substitution
typed configuration access
validation and default values
The package is designed around the idea that applications should consume configuration through validated accessors, rather than directly accessing raw environment variables.
Installation
npm install @hadem/cfg
Basic Usage
CommonJS:
const cfg = require("@hadem/cfg");

const port = cfg.int("SERVER_PORT", 3000, {
  minValue: 1024,
  maxValue: 65535
});

const host = cfg.str("SERVER_HOST", "localhost");

const debug = cfg.bool("DEBUG", false);
ES Modules:
import cfg from "@hadem/cfg";

const port = cfg.int("SERVER_PORT", 3000);
Internal Design
When @hadem/cfg is loaded, the module immediately initializes an internal configuration object.
The internal configuration object is private and is not exported directly.
The exported API contains only helper functions:
{
  int(),
  num(),
  bool(),
  str(),
  has(),
  keys(),
  toObject()
}
The normal application interaction model is:
const cfg = require("@hadem/cfg");

const databasePort = cfg.int("DB_PORT");
rather than:
process.env.DB_PORT
This provides:
consistent defaults
type conversion
validation
centralized configuration handling
Configuration Loading Pipeline
Configuration is loaded in the following order:
.env
   |
   v
cfg_files/common.cfg
   |
   v
cfg_files/{NODE_ENV}.cfg
   |
   v
variable expansion
   |
   v
internal configuration object
Each later source overrides values from earlier sources.
.env File
The first configuration source loaded is:
.env
Example:
NODE_ENV=development
DEBUG=true
APP_NAME=My Application
The .env file is normally used for:
developer-specific settings
local secrets
machine-specific configuration
Common Configuration
The second configuration source is:
./cfg_files/common.cfg
Example:
DB_DRIVER=postgres
DB_HOST=localhost
DB_PORT=5432
LOG_LEVEL=info
Values in common.cfg override values loaded from .env.
Runtime Configuration
The active runtime configuration file is selected using:
NODE_ENV
The value of NODE_ENV directly becomes the configuration filename.
Example:
NODE_ENV=production
loads:
./cfg_files/production.cfg
Example:
NODE_ENV=preview
loads:
./cfg_files/preview.cfg
No predefined environments exist.
Applications may create any runtime mode they need.
Examples:
cfg_files/
├── common.cfg
├── dev.cfg
├── preview.cfg
├── staging.cfg
├── production.cfg
└── customer_a.cfg
Default Runtime Mode
If NODE_ENV is not defined:
NODE_ENV=dev
is automatically assumed.
Therefore:
cfg_files/dev.cfg
will be loaded by default.
Configuration Precedence
The priority order is:
{NODE_ENV}.cfg
        >
common.cfg
        >
.env
Example:
.env
SERVER_PORT=3000
common.cfg
SERVER_PORT=4000
production.cfg
SERVER_PORT=8080
Final value:
cfg.int("SERVER_PORT")
returns:
8080
Variable Expansion
Configuration values may reference other variables.
Example:
production.cfg
DB_USERNAME=postgres
DB_PASSWORD=${PROD_DB_PASSWORD}
System environment:
export PROD_DB_PASSWORD=secret123
After initialization:
cfg.str("DB_PASSWORD")
returns:
secret123
Variable lookup checks:
Loaded configuration values
Existing process environment variables
Accessor API
cfg.int()
Reads an integer value.
Example:
const workers = cfg.int("WORKERS", 4, {
  minValue: 1,
  maxValue: 32
});
Supported options:
Option	Description
defaultValue	Value used if missing
optional	Allow missing values
minValue	Minimum allowed value
maxValue	Maximum allowed value
cfg.num()
Reads a floating-point number.
Example:
const timeout = cfg.num("TIMEOUT", 5.5, {
  minValue: 1,
  maxValue: 60
});
cfg.bool()
Reads a boolean value.
Supported values:
true
false
1
0
yes
no
on
off
Example:
const debug = cfg.bool("DEBUG", false);
cfg.str()
Reads a string value.
Example:
const name = cfg.str("APP_NAME", "Application", {
  trim: "both",
  case: "upper",
  minLength: 3,
  maxLength: 50
});
Options:
Option	Values
trim	both, left, right, none
case	none, lower, upper, title
minLength	minimum characters
maxLength	maximum characters
Utility Functions
cfg.has()
Checks whether a configuration value exists.
Example:
if (cfg.has("REDIS_HOST")) {
  startRedis();
}
cfg.keys()
Returns all available configuration names.
Example:
console.log(cfg.keys());
cfg.toObject()
Returns a read-only copy of the complete configuration.
Example:
const config = cfg.toObject();

console.log(config);
The returned object is frozen to prevent accidental modification of internal configuration state.
Recommended Project Structure
A typical project:
my-app/
|
├── .env
|
├── cfg_files/
│   |
│   ├── common.cfg
│   ├── dev.cfg
│   ├── staging.cfg
│   └── production.cfg
|
└── src/
    |
    └── app.js
Security Considerations
Configuration files may contain sensitive values.
Recommended practice:
commit common.cfg
commit non-sensitive runtime files
do not commit secrets
use .env or system environment variables for passwords and keys
Example:
DB_PASSWORD=${PRODUCTION_DATABASE_PASSWORD}
Design Goals
@hadem/cfg is built around these principles:
Configuration should be loaded once.
Configuration should have predictable precedence.
Runtime environments should be application-defined.
Applications should not depend directly on process.env.
Type conversion should happen at the point of use.
Invalid configuration should fail early.
Future Extensions
Possible future additions:
configuration schema validation
JSON/YAML/TOML loaders
nested configuration objects
secret providers
configuration watching for development
typed configuration generation
License
MIT