# turbo-config

A lightweight Node.js configuration module for loading environment-specific configuration files, resolving environment-variable references, and providing typed configuration accessors.

`turbo-config` is designed to keep application configuration outside application source code while providing a simple API for retrieving configuration values as strings, integers, numbers, and booleans.

## Features

- Loads a common base configuration file.
- Loads an environment-specific configuration file.
- Uses `NODE_ENV` to select the runtime configuration.
- Defaults to the `dev` environment when `NODE_ENV` is not specified.
- Supports `${VARIABLE}` environment-variable substitution.
- Gives `process.env` values precedence over configuration values during substitution.
- Supports configuration values referencing other configuration values.
- Detects circular configuration references.
- Leaves unresolved `${VARIABLE}` references unchanged.
- Provides typed accessors:
  - `str()`
  - `int()`
  - `num()`
  - `bool()`
- Supports optional configuration values.
- Supports default values.
- Supports numeric minimum and maximum validation.
- Supports string trimming.
- Supports string case conversion.
- Supports string length validation.
- Provides configuration inspection utilities:
  - `has()`
  - `keys()`
  - `toObject()`
- Provides a `--show-config` command-line option for displaying the resolved configuration.

## Requirements

- Node.js 20 or newer

## Installation

Install the package with npm:

    npm install turbo-config

The package uses the `dotenv` package to parse configuration files.

## Configuration Directory

By default, `turbo-config` looks for configuration files in:

    ./config

The expected directory structure is:

    config/
    ├── base.config
    ├── dev.config
    ├── test.config
    └── prod.config

The `base.config` file is always loaded.

The environment-specific configuration file is selected using `NODE_ENV`.

For example:

    NODE_ENV=dev

causes:

    config/dev.config

to be loaded.

Similarly:

    NODE_ENV=test

loads:

    config/test.config

and:

    NODE_ENV=prod

loads:

    config/prod.config

## Configuration Loading

Configuration is loaded in two stages.

### 1. Base Configuration

The module first loads:

    ./config/base.config

If this file does not exist, an empty configuration is used.

For example:

    PUBLIC_PATH=./public
    VIEWS_PATH=./views
    SERVER_HOST=${HOST}
    SERVER_PORT=${PORT}
    DB_DRIVER=sqlite

### 2. Environment Configuration

The module determines the runtime environment.

The precedence is:

1. `NODE_ENV` defined in `base.config`
2. `process.env.NODE_ENV`
3. `dev`

Therefore:

    configuration.NODE_ENV
        ↓
    process.env.NODE_ENV
        ↓
    "dev"

The resulting value is sanitized before it is used as a filename.

For example:

    NODE_ENV=prod

causes:

    ./config/prod.config

to be loaded.

If the environment-specific configuration file does not exist, no error is generated. The configuration loaded from `base.config` remains in effect.

## NODE_ENV Validation

Before `NODE_ENV` is used to construct a configuration filename, it must contain only:

- letters
- numbers
- underscores
- hyphens

Valid examples include:

    dev
    test
    prod
    production
    development
    qa
    staging
    prod-us

Invalid values include values containing characters such as:

    /
    \
    .
    ..
    $
    ;

For example:

    NODE_ENV=../../secret

is rejected.

This prevents `NODE_ENV` from being used to construct an arbitrary filesystem path.

An invalid value produces an error similar to:

    "../../secret" is not a valid NODE_ENV value.

## Configuration Override Order

The environment-specific configuration is loaded after `base.config`.

Therefore, values in the environment-specific configuration override values with the same name in `base.config`.

For example, `base.config`:

    SERVER_PORT=3000
    DB_NAME=application
    DB_DRIVER=sqlite

and `prod.config`:

    SERVER_PORT=10000
    DB_NAME=prod
    DB_DRIVER=postgres

produce:

    SERVER_PORT=10000
    DB_NAME=prod
    DB_DRIVER=postgres

The effective loading order is:

    base.config
        ↓
    environment-specific config
        ↓
    variable expansion
        ↓
    final configuration

## Environment Variables

Configuration values can reference environment variables using:

    ${VARIABLE}

For example:

    DB_HOST=${DB_HOST}
    DB_PORT=${DB_PORT}
    DB_USERNAME=${DB_USERNAME}
    DB_PASSWORD=${DB_PASSWORD}

If the corresponding environment variables exist:

    DB_HOST=https://postgres-hosting.com
    DB_PORT=5432
    DB_USERNAME=myuser
    DB_PASSWORD=mypassword

the resulting configuration becomes:

    DB_HOST=https://postgres-hosting.com
    DB_PORT=5432
    DB_USERNAME=myuser
    DB_PASSWORD=mypassword

## Environment Variable Precedence

When resolving:

    ${VARIABLE}

`process.env` takes precedence over configuration values.

For example, suppose:

    process.env.DB_HOST=https://production.example.com

and the configuration contains:

    DB_HOST=https://configuration.example.com

A reference to:

    ${DB_HOST}

resolves to:

    https://production.example.com

The resolution precedence is:

    process.env
        ↓
    configuration
        ↓
    unresolved reference

This makes it possible to keep deployment-specific values outside configuration files.

## Configuration-to-Configuration References

Configuration values may reference other configuration values.

For example:

    SERVER_HOST=localhost
    SERVER_PORT=3000
    SERVER_URL=http://${SERVER_HOST}:${SERVER_PORT}

The resulting value of `SERVER_URL` becomes:

    http://localhost:3000

Configuration references may be chained.

For example:

    HOST=localhost
    PORT=3000
    BASE_URL=http://${HOST}:${PORT}
    API_URL=${BASE_URL}/api

The resulting configuration becomes:

    HOST=localhost
    PORT=3000
    BASE_URL=http://localhost:3000
    API_URL=http://localhost:3000/api

## Circular References

Circular references are detected.

For example:

    A=${B}
    B=${A}

does not cause infinite recursion.

The unresolved reference is left in place rather than causing the application to hang.

## Unresolved Variables

If a `${VARIABLE}` reference cannot be resolved from either:

    process.env

or:

    configuration

the reference is left unchanged.

For example:

    SERVER_HOST=${SERVER_HOST}

when `SERVER_HOST` does not exist in either source remains:

    SERVER_HOST=${SERVER_HOST}

This is intentional.

`turbo-config` does not automatically throw an error merely because a variable reference cannot be resolved.

If an application requires a value to exist, use one of the accessor methods to enforce that requirement.

For example:

    const host = str("SERVER_HOST");

will throw an error if the value is missing.

## Configuration Values Are Strings

Configuration files are parsed using `dotenv`.

As a result, values loaded from configuration files are normally strings.

For example:

    PORT=3000
    DEBUG=true
    PRICE=12.50

are initially represented as:

    PORT="3000"
    DEBUG="true"
    PRICE="12.50"

Use the appropriate accessor when a different JavaScript type is required.

# API

The public API consists of:

    const {
      str,
      int,
      num,
      bool,
      has,
      keys,
      toObject
    } = require("turbo-config");

## str()

Returns a configuration value as a string.

### Syntax

    str(name, defaultValue, options)

### Parameters

#### name

The configuration variable name.

Example:

    const host = str("SERVER_HOST");

#### defaultValue

An optional fallback value.

Example:

    const host = str("SERVER_HOST", "localhost");

The default is used only when the configuration value is `undefined`.

#### options

An optional options object.

Example:

    const host = str("SERVER_HOST", undefined, {
      trim: "both",
      case: "none"
    });

## str() Options

### optional

Allows the configuration value to be missing.

Example:

    const value = str("OPTIONAL_VALUE", undefined, {
      optional: true
    });

If the value does not exist, `undefined` is returned.

The default is:

    false

### trim

Controls whitespace removal.

Supported values:

    both
    left
    right
    none

The default is:

    both

Examples:

    str("NAME", undefined, {
      trim: "both"
    });

    str("NAME", undefined, {
      trim: "left"
    });

    str("NAME", undefined, {
      trim: "right"
    });

    str("NAME", undefined, {
      trim: "none"
    });

### case

Controls case conversion.

Supported values:

    none
    lower
    upper
    title

The default is:

    none

Examples:

    str("APP_NAME", undefined, {
      case: "lower"
    });

    str("APP_NAME", undefined, {
      case: "upper"
    });

    str("APP_NAME", undefined, {
      case: "title"
    });

### minLength

Requires the resulting string to contain at least the specified number of characters.

Example:

    const name = str("APP_NAME", undefined, {
      minLength: 3
    });

If the resulting value is too short:

    "APP_NAME" must be at least 3 characters.

### maxLength

Requires the resulting string to contain no more than the specified number of characters.

Example:

    const name = str("APP_NAME", undefined, {
      maxLength: 50
    });

If the value is too long:

    "APP_NAME" cannot exceed 50 characters.

### Complete str() Example

    const appName = str("APP_NAME", "My Application", {
      trim: "both",
      case: "title",
      minLength: 3,
      maxLength: 50
    });

## int()

Returns a configuration value as an integer.

### Syntax

    int(name, defaultValue, options)

Example:

    const port = int("SERVER_PORT");

If:

    SERVER_PORT=3000

then:

    port === 3000

and:

    typeof port === "number"

### int() Options

#### optional

Allows the configuration value to be missing.

Example:

    const value = int("OPTIONAL_VALUE", undefined, {
      optional: true
    });

#### minValue

Requires the integer to be greater than or equal to the specified value.

Example:

    const port = int("SERVER_PORT", undefined, {
      minValue: 1
    });

#### maxValue

Requires the integer to be less than or equal to the specified value.

Example:

    const port = int("SERVER_PORT", undefined, {
      maxValue: 65535
    });

A common use is:

    const port = int("SERVER_PORT", undefined, {
      minValue: 1,
      maxValue: 65535
    });

### Invalid Integer

If the value cannot be converted to an integer:

    int("SERVER_PORT");

throws:

    "SERVER_PORT" must be a valid integer.

## num()

Returns a configuration value as a JavaScript number.

### Syntax

    num(name, defaultValue, options)

Example:

    const timeout = num("REQUEST_TIMEOUT");

If:

    REQUEST_TIMEOUT=12.5

then:

    timeout === 12.5

### num() Options

#### optional

Allows the configuration value to be missing.

#### minValue

Requires the number to be greater than or equal to the specified value.

Example:

    const price = num("PRICE", undefined, {
      minValue: 0
    });

#### maxValue

Requires the number to be less than or equal to the specified value.

Example:

    const price = num("PRICE", undefined, {
      maxValue: 1000
    });

### Invalid Number

If the value cannot be converted to a number:

    num("PRICE");

throws:

    "PRICE" must be a valid number.

## bool()

Returns a configuration value as a JavaScript boolean.

### Syntax

    bool(name, defaultValue, options)

Example:

    const debug = bool("DEBUG");

### Accepted True Values

The following values are interpreted as `true`:

    true
    1
    yes
    on

Case is ignored.

Therefore these are all valid:

    true
    TRUE
    True
    yes
    YES
    on
    ON
    1

### Accepted False Values

The following values are interpreted as `false`:

    false
    0
    no
    off

Case is ignored.

### bool() Options

#### optional

Allows the configuration value to be missing.

Example:

    const value = bool("OPTIONAL_VALUE", undefined, {
      optional: true
    });

### Invalid Boolean

For example:

    DEBUG=maybe

causes:

    bool("DEBUG");

to throw:

    "DEBUG" must be a valid boolean.

# Default Values

All typed accessors support a default value.

For example:

    const host = str("SERVER_HOST", "localhost");

If `SERVER_HOST` is not configured, the result is:

    localhost

Similarly:

    const port = int("SERVER_PORT", 3000);

and:

    const debug = bool("DEBUG", false);

## Important Behavior

A default value is used only when the configuration property is `undefined`.

A default value does not replace an invalid configured value.

For example, if:

    SERVER_PORT=abc

then:

    int("SERVER_PORT", 3000);

throws an error rather than returning `3000`.

This ensures that invalid configuration is not silently hidden by a default.

# Optional Values

Accessors can be configured to allow missing values.

Example:

    const value = str("OPTIONAL_VALUE", undefined, {
      optional: true
    });

If the value does not exist, the result is:

    undefined

Without `optional: true`, a missing value causes an error.

For example:

    str("REQUIRED_VALUE");

throws:

    "REQUIRED_VALUE" is required.

# Required Values

By default, configuration values are required.

For example:

    const databaseHost = str("DB_HOST");

If `DB_HOST` does not exist, an error is thrown.

This provides a simple way to enforce required application configuration.

# has()

Determines whether a configuration property exists.

### Syntax

    has(name)

Example:

    if (has("DB_HOST")) {
      console.log("Database host is configured.");
    }

Returns:

    true

or:

    false

A property is considered present when its configuration value is not `undefined`.

# keys()

Returns an array containing the names of all configuration properties.

### Syntax

    keys()

Example:

    console.log(keys());

Possible result:

    [
      "PUBLIC_PATH",
      "VIEWS_PATH",
      "SERVER_HOST",
      "SERVER_PORT",
      "DB_DRIVER",
      "DB_HOST",
      "DB_PORT",
      "DB_NAME",
      "DB_USERNAME",
      "DB_PASSWORD",
      "NODE_ENV"
    ]

# toObject()

Returns a snapshot of the current configuration as a frozen object.

### Syntax

    toObject()

Example:

    const config = toObject();

    console.log(config.SERVER_HOST);
    console.log(config.SERVER_PORT);

The returned object is frozen:

    Object.isFrozen(config) === true

The returned object is a shallow copy of the module's internal configuration state.

Changes made to the returned object do not modify the module's internal configuration.

# Complete Application Example

A typical application can use `turbo-config` like this:

    "use strict";

    const {
      str,
      int,
      bool,
      num
    } = require("turbo-config");

    const serverHost = str("SERVER_HOST", "127.0.0.1");

    const serverPort = int("SERVER_PORT", 3000, {
      minValue: 1,
      maxValue: 65535
    });

    const debug = bool("DEBUG", false);

    const requestTimeout = num("REQUEST_TIMEOUT", 30, {
      minValue: 0
    });

    console.log({
      serverHost,
      serverPort,
      debug,
      requestTimeout
    });

# Example Configuration

## config/base.config

    PUBLIC_PATH=./public
    VIEWS_PATH=./views

    SERVER_HOST=${HOST}
    SERVER_PORT=${PORT}

    DB_DRIVER=sqlite
    DB_NAME=development

## config/prod.config

    DB_DRIVER=postgres
    DB_NAME=prod
    DB_HOST=${DB_HOST}
    DB_PORT=${DB_PORT}
    DB_USERNAME=${DB_USERNAME}
    DB_PASSWORD=${DB_PASSWORD}

# Production Environment

For production deployment, sensitive values should be supplied through the hosting platform's environment-variable system rather than committed to source control.

For example:

    DB_HOST=https://postgres-hosting.com
    DB_PORT=5432
    DB_USERNAME=production_user
    DB_PASSWORD=production_password

The configuration file can contain references:

    DB_HOST=${DB_HOST}
    DB_PORT=${DB_PORT}
    DB_USERNAME=${DB_USERNAME}
    DB_PASSWORD=${DB_PASSWORD}

This allows the same configuration files to be used across different environments without embedding credentials in source code.

# Render Deployment

`turbo-config` can be used with Render and similar hosting platforms.

A Render web service supplies a `PORT` environment variable to the application.

The application should listen on the port supplied by the hosting platform.

A production configuration can therefore contain:

    SERVER_HOST=${HOST}
    SERVER_PORT=${PORT}

The deployment environment can supply:

    HOST=0.0.0.0
    PORT=10000

The resulting configuration becomes:

    SERVER_HOST=0.0.0.0
    SERVER_PORT=10000

`SERVER_HOST` and `SERVER_PORT` are normally operational configuration values and are not considered secrets.

Values such as database passwords, API keys, encryption keys, authentication tokens, and private keys should be treated as secrets.

# Command-Line Configuration Display

`turbo-config` supports the `--show-config` command-line option.

Run:

    node index.js --show-config

The module checks:

    process.argv

for:

    --show-config

When the option is present, the resolved configuration is displayed and the process terminates.

Example:

    configuration
    {
      PUBLIC_PATH: './public',
      VIEWS_PATH: './views',
      SERVER_HOST: '0.0.0.0',
      SERVER_PORT: '10000',
      DB_DRIVER: 'postgres',
      DB_HOST: 'https://postgres-hosting.com',
      DB_PORT: '5432',
      DB_NAME: 'prod',
      DB_USERNAME: 'production_user',
      DB_PASSWORD: 'production_password',
      NODE_ENV: 'prod'
    }

## Security Warning

The `--show-config` option should normally be used only for local development and configuration troubleshooting.

The displayed configuration can contain sensitive values.

For example:

    DB_PASSWORD
    API_KEY
    SECRET_KEY
    TOKEN
    ENCRYPTION_KEY

Do not expose the output of `--show-config` through an HTTP endpoint, public log, or other publicly accessible mechanism.

# npm Script Examples

A package can define environment-specific scripts in `package.json`.

For example:

    {
      "scripts": {
        "show:dev": "NODE_ENV=dev node --env-file=.dev.env index.js --show-config",
        "show:test": "NODE_ENV=test node --env-file=.test.env index.js --show-config",
        "show:prod": "NODE_ENV=prod node --env-file=.prod.env index.js --show-config"
      }
    }

The scripts can then be run with:

    npm run show:dev

    npm run show:test

    npm run show:prod

# Configuration File Format

Configuration files use the format supported by `dotenv`.

The basic format is:

    NAME=value

For example:

    APP_NAME=My Application
    SERVER_PORT=3000
    DEBUG=true

Quoted values are also supported by the underlying `dotenv` parser.

# Missing Configuration Files

`turbo-config` does not throw an error when a configuration file does not exist.

For example, if:

    config/test.config

does not exist, the module continues using the configuration already loaded from:

    config/base.config

This makes environment-specific configuration files optional.

Applications that require particular values should enforce those requirements through the typed accessors.

For example:

    const port = int("SERVER_PORT");

will throw an error if `SERVER_PORT` is absent.

# Error Handling

The module can generate several types of configuration errors.

## Missing Required Value

    "DB_HOST" is required.

This is generated when a required configuration value does not exist.

## Invalid Boolean

    "DEBUG" must be a valid boolean.

This is generated when a boolean value is not one of the supported representations.

## Invalid Integer

    "PORT" must be a valid integer.

This is generated when an integer value cannot be converted to a valid number.

## Invalid Number

    "TIMEOUT" must be a valid number.

This is generated when a numeric value cannot be converted to a valid number.

## Integer/Number Range Errors

For a minimum violation:

    "PORT" cannot be less than 1.

For a maximum violation:

    "PORT" cannot be greater than 65535.

## String Length Errors

For a minimum length violation:

    "APP_NAME" must be at least 3 characters.

For a maximum length violation:

    "APP_NAME" cannot exceed 50 characters.

## Invalid NODE_ENV

An invalid environment name produces an error such as:

    "some/value" is not a valid NODE_ENV value.

# API Summary

| Function     | Purpose                                        |
| ------------ | ---------------------------------------------- |
| `str()`      | Return a configuration value as a string       |
| `int()`      | Return a configuration value as an integer     |
| `num()`      | Return a configuration value as a number       |
| `bool()`     | Return a configuration value as a boolean      |
| `has()`      | Determine whether a configuration value exists |
| `keys()`     | Return all configuration property names        |
| `toObject()` | Return a frozen configuration snapshot         |

# Accessor Options Summary

## str()

| Option      | Values                            | Default |
| ----------- | --------------------------------- | ------- |
| `optional`  | `true` / `false`                  | `false` |
| `trim`      | `both`, `left`, `right`, `none`   | `both`  |
| `case`      | `none`, `lower`, `upper`, `title` | `none`  |
| `minLength` | number                            | none    |
| `maxLength` | number                            | none    |

## int()

| Option     | Purpose                   |
| ---------- | ------------------------- |
| `optional` | Allow missing value       |
| `minValue` | Minimum permitted integer |
| `maxValue` | Maximum permitted integer |

## num()

| Option     | Purpose                  |
| ---------- | ------------------------ |
| `optional` | Allow missing value      |
| `minValue` | Minimum permitted number |
| `maxValue` | Maximum permitted number |

## bool()

| Option     | Purpose             |
| ---------- | ------------------- |
| `optional` | Allow missing value |

# Configuration Resolution Lifecycle

The complete initialization process is:

    1. Create empty configuration object
                     |
                     v
    2. Load ./config/base.config
                     |
                     v
    3. Determine NODE_ENV
                     |
                     v
    4. Validate NODE_ENV
                     |
                     v
    5. Load ./config/<NODE_ENV>.config
                     |
                     v
    6. Set configuration.NODE_ENV
                     |
                     v
    7. Expand ${VARIABLE} references
                     |
                     v
    8. Check for --show-config
                     |
                     v
    9. Export public API

Variable resolution follows:

    ${VARIABLE}
         |
         +---- process.env.VARIABLE exists?
         |             |
         |            yes
         |             |
         |             v
         |       use process.env value
         |
         +---- otherwise configuration.VARIABLE exists?
         |             |
         |            yes
         |             |
         |             v
         |       resolve configuration value
         |
         +---- otherwise
                       |
                       v
              leave ${VARIABLE}
              unchanged

# Design Philosophy

`turbo-config` intentionally keeps configuration management simple.

The module is not intended to be a complete configuration framework.

It provides a small layer between configuration files, environment variables, and application code.

Instead of repeatedly writing code such as:

    const port = Number.parseInt(
      process.env.SERVER_PORT || "3000",
      10
    );

an application can use:

    const port = int("SERVER_PORT", 3000);

This keeps configuration parsing, conversion, and validation in one place.

# Security Considerations

Configuration files may contain sensitive information.

Never commit production credentials to source control.

Avoid committing values such as:

    DB_PASSWORD
    API_KEY
    JWT_SECRET
    ENCRYPTION_KEY
    ACCESS_TOKEN
    PRIVATE_KEY

Use environment variables or your deployment platform's secret-management facilities instead.

Also avoid logging the complete `process.env` object.

The environment can contain:

- database passwords
- API keys
- cloud-provider credentials
- encryption keys
- session secrets
- deployment tokens
- authentication credentials

For the same reason, use `--show-config` carefully because the resolved configuration can also contain secrets.

# Best Practices

## Keep configuration out of application source code

Prefer:

    const port = int("SERVER_PORT");

over:

    const port = 3000;

when the value is deployment-specific.

## Keep secrets out of configuration files

Prefer:

    DB_PASSWORD=${DB_PASSWORD}

with the actual value supplied by the deployment environment.

Avoid:

    DB_PASSWORD=my-production-password

in a file committed to source control.

## Validate important values

For example:

    const port = int("SERVER_PORT", undefined, {
      minValue: 1,
      maxValue: 65535
    });

## Use appropriate accessors

Use:

    str()

for strings.

Use:

    int()

for integers.

Use:

    num()

for general numbers.

Use:

    bool()

for boolean values.

## Use defaults only where appropriate

Defaults are useful for values that have a sensible fallback:

    const host = str("SERVER_HOST", "127.0.0.1");

    const debug = bool("DEBUG", false);

Defaults should not be used to hide invalid configuration.

# Example Project Structure

A typical application using `turbo-config` might have:

    my-app/
    ├── config/
    │   ├── base.config
    │   ├── dev.config
    │   ├── test.config
    │   └── prod.config
    ├── src/
    │   ├── server.js
    │   └── ...
    ├── .dev.env
    ├── .test.env
    ├── .prod.env
    ├── package.json
    └── node_modules/

Environment files containing secrets should not be committed to source control.

# Example Server Configuration

A Node.js server might use:

    const {
      str,
      int
    } = require("turbo-config");

    const host = str("SERVER_HOST", "127.0.0.1");

    const port = int("SERVER_PORT", 3000, {
      minValue: 1,
      maxValue: 65535
    });

    server.listen(port, host, () => {
      console.log(`Server listening on ${host}:${port}`);
    });

For a Render deployment, the resolved values might be:

    SERVER_HOST=0.0.0.0
    SERVER_PORT=10000

The public URL presented to users is controlled by the hosting platform rather than by the application's internal listening address.

# Module Initialization

The configuration module initializes when it is first required.

For example:

    const config = require("turbo-config");

At initialization time, the module:

1. Loads `base.config`.
2. Determines `NODE_ENV`.
3. Validates `NODE_ENV`.
4. Loads the environment-specific configuration.
5. Normalizes `configuration.NODE_ENV`.
6. Resolves `${VARIABLE}` references.
7. Checks for `--show-config`.
8. Exposes the public API.

Because initialization occurs when the module is loaded, environment variables required by the configuration should be established before the application requires `turbo-config`.

# Public API

The module exports only the following functions:

    module.exports = {
      bool,
      int,
      num,
      str,
      has,
      keys,
      toObject
    };

The internal configuration object and configuration-loading functions are not exported.

# Version

The package version is maintained in `package.json`.

Example:

    {
      "name": "turbo-config",
      "version": "0.2.0"
    }

# License

Add the package license here.

For example:

    MIT

if the package is distributed under the MIT License.

# Author

Add the package author or organization here.

# Summary

`turbo-config` provides a simple configuration pipeline:

    Configuration Files
            +
    Environment Variables
            |
            v
    Variable Expansion
            |
            v
    Resolved Configuration
            |
            v
    Typed Accessors
            |
            v
        Application

The primary API is intentionally small:

    const {
      str,
      int,
      num,
      bool,
      has,
      keys,
      toObject
    } = require("turbo-config");

This provides the application with a centralized mechanism for loading, resolving, validating, converting, and accessing runtime configuration without coupling application code directly to `process.env`.
