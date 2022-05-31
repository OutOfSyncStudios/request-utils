# request-utils

[![NPM](https://nodei.co/npm/@outofsync/request-utils.png?downloads=true)](https://nodei.co/npm/@outofsync/request-utils/)

[![Actual version published on npm](http://img.shields.io/npm/v/@outofsync/request-utils.svg)](https://www.npmjs.org/package/@outofsync/request-utils)
[![Build and Test Master](https://github.com/OutOfSyncStudios/request-utils/actions/workflows/build-master.yml/badge.svg)](https://github.com/OutOfSyncStudios/request-utils/actions/workflows/build-master.yml)
[![Total npm module downloads](http://img.shields.io/npm/dt/@outofsync/request-utils.svg)](https://www.npmjs.org/package/@outofsync/request-utils)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/062776002e3942a198f19da955bf1ac9)](https://www.codacy.com/gh/OutOfSyncStudios/request-utils/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=OutOfSyncStudios/request-utils&amp;utm_campaign=Badge_Grade)
[![Codacy Coverage Badge](https://app.codacy.com/project/badge/Coverage/062776002e3942a198f19da955bf1ac9)](https://www.codacy.com/gh/OutOfSyncStudios/request-utils/dashboard?utm_source=github.com&utm_medium=referral&utm_content=OutOfSyncStudios/request-utils&utm_campaign=Badge_Coverage)
[![Dependencies badge](https://david-dm.org/OutOfSyncStudios/request-utils/status.svg)](https://david-dm.org/OutOfSyncStudios/request-utils?view=list)


`request-utils` is simple framework designed to simplify HTTP Request handling and parameters parsing by abstracting commonly reused processing patterns. It can be used with any framework that creates and uses HTTPRequest objects.

# [Installation](#installation)
<a name="installation"></a>

```shell
npm install @outofsync/request-utils
```

# [Usage](#usage)
<a name="usage"></a>

```js
const ReqUtils = require('@outofsync/request-utils');
const reqUtils = new ReqUtils();

// Example Express.js handler and controller functions
function handler(locals, req, res, next) {
  console.log(locals.dataVal1);
  console.log(locals.dataVal2);
  next();
}

async function controller(req, res, next) {
  await reqUtils.handleRequest(
    {
      params: {
        dataVal1: {
          type: 'string',
          source: ['body', 'headers', 'query'],
          required: true
        },
        dataVal2: {
          type: 'string',
          source: ['body', 'headers', 'query'],
          required: true
        }
      },
      authContext: { super: true, server: true }
    },
    handler, 
    req, 
    res, 
    next
  );
}
```

# [Upgrading from v3 to v4](#upgrade)
If you are upgrading from v3 to v4 you need to be aware of the following breaking changes: 
* The `ctor` ReqUtils is no longer allows invoked with the `req` (HttpRequest) object as a parameter. 
* All methods are now stateless and require the `req` (HttpRequest) to be passed as the first parameter. Reordering parameters to the beginning of the function signature and now being required.
* The handleRequest and handleRequestAsync methods have been renamed to reflect a more promise-based design. 
  * The old `handleRequestAsync` is now just `handleRequest`.
  * The old `handleRequest` is now `handleRequestSync`.
* The handleRequest methods have had their parameters reordered so that they follow typical ordering in other libraries -- `req, res, next`
* The handler function signature for passed handler to the handleRequest methods all now have a function signature of `(locals, req, res, next)` where locals are the loaded variabls.
* The following paramters passed as a part of handleRequest methods have been changed:
  * `security` parameter option that previously performed rudimentary context checking of a request has been renamed `authContext`.
  * `secure` parameter option that previously performed a TLS protocol check, is now named `forceTls`.
* The `skipAuth` and `setSkipAuth` methods have been removed.
* New options have been added for 

***Existing codebases will need to be refactored to account for these changes.***

# [API Reference](#api)
<a name="api"></a>

## new ReqUtils([params]) &#x27fe; instanceof ReqUtils
Create an instance of ReqUtils. Additional configuration parameters may be passed in `params` map as follows:

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| checkPermissions | Function(HTTPRequest) &#x27fe; bool | `() => { return true; }` | A function to perform additional permission check which returns a boolean if the check passes |
| customErrorResponseCodes | [CustomCodes](#types-custom-codes) | See Below | A `CustomCodes` object to be used with handleCustomErrors, which checks an error message for the message and sets the appropriate code |
| customResponseMessages | [CustomMessages](#types-custom-messages) | See Below | A `CustomMessages` object which defines the error message details and status codes for various error codes |
| defaultAuthContext | [AuthContext](#types-auth-context) | `{ super: false, signed: false, server: false, client: false }` | A `AuthContext` object which defines the default AuthContext state |
| defaultLang | string | `'en'` | Language definition to use when looking up CustomCodes and CustomMessages string |
| debug | boolean | `false` | Enable debugging output |
| enableAuthContextCheck | boolean | `true` | handleRequest methods will check AuthContext provided when enabled |
| enableForceTlsCheck | boolean | `true` | handleRequest methods will check if request is over TLS when enabled |
| enablePermissionsCheck | boolean | `true` | handleRequest methods will run the permissions check function when enabled |

**Defaults**:
```js
  // These are the default options
  {
    checkPermissions: ((req) => {
      return true;
    ),
    customErrorResponseCodes: {},
    customResponseMessages: {
      [200000]: { summary: 'OK', message: '', status: 200 },
      [400000]: { summary: 'Bad Request', message: 'The request is malformed.', status: 400 },
      [400001]: { summary: 'Non-Existent Record', message: 'The record requested does not exist.', status: 400 },    
      [400002]: { summary: 'Missing Parameters', message: 'The request is missing required parameters.', status: 400 },
      [401000]: { summary: 'Unauthorized', message: 'This request is not authorized.', status: 401 },    
      [403000]: {
        summary: 'Forbidden',
        message: 'The credentials provided are not authorized for this request',
        status: 403
      },
      [403001]: { summary: 'Forbidden', message: 'Secure endpoints can only be accessed via HTTPS.', status: 403 },
      [404000]: {
        summary: 'Not Found',
        message: 'The requested resource does not exist or you are not authorized to access it.',
        status: 404
      },    
      [408000]: { summary: 'Timed Out', message: 'The request timed out.', status: 408 },
      [429000]: { summary: 'Rate Limit', message: 'Rate limit has been exceeded', status: 429 },    
      [500000]: { summary: 'Could Not Connect', message: 'The server connection timed out', status: 500 },
      [500001]: { summary: 'General Server Error', message: 'A fatal error has occurred on the server.', status: 500 }
    },
    defaultAuthContext: { super: false, signed: false, server: false, client: false }
  }
```

## Request Handling

### .handleRequest(params, handler, req, res, next) &#x27fe; Promise<void|Error>
### .handleRequestSync(params, handler, req, res, next) &#x27fe; void / Error
Using the `params` provides, performs the following, so long as the `req` has not already been processed.
1. When enabled, checks the current request AuthContext (as updated by the `setAuthContext` or `updateAuthContext` methods) of the request against `params.authContext`. Sets `403000` response code on failure.
2. When enabled, checks the TLS Protocol requirement (`params.forceTls`) of the request. (Was this request made over HTTPS when `req.secure === true`?). Sets `403001` response code on failure.
3. Retrieves all request parameters configured (`params.params`) from the request.
4. Checks for required HTTP Request parameters. Sets `400001` reponse code on failure.
5. Sets default values for optional request parameters that are unset
6. Validates that all request parameters are set to the expected data types. Sets `400002` response code on failure.
7. When enabled, runs `checkPermission`. Sets `403000` response code on failure.
8. If none of the above generates an error, then runs the `handler` function provided. If the handler throws an Exception, it then sets a `500001` error.

* `req` is the HTTP Request object.
* `res` is the HTTP Response object.
* `next` is the asynchronous handler used by [ExpressJS](), [SailsJS](), and other similar frameworks to continue execution or return errors. `res` is the HTTP Response object for the request. `req` is the HTTPRequest object.
* `params` are outlined in the [Request Handler Parameters](#type-handler-params) below.
* `handler` is a function with a function signature as follow:
```js
  (locals, req, res, next) => {
    // Do something ... 
    // locals stores the parameters that have been parsed 
    // from the request as passed to the handleRequest
    // method in `params.params`.
  }
```

**Example Usage**:
```js
function handler(locals, req, res, next) {
  console.log(locals);
  next()
}

reqUtils.handleRequestSync({
    params: { },
    authContext: {
      super: true,    // Only accessible by super-users
      server: true,   // Only accessible from a sever-based context
      client: false
    },
    forceTls: false
  },
  handler, 
  req, 
  res, 
  next
);
```

## Error Handling

### .getResponseMessage(code, lang, customMessages) &#x27fe; [ResponseMessage](#types-reponse-message) / null
Checks the `code` for a match in the merged `ReqUtils.customResponseMessages` dictionary for the given `lang`. If the language dictionary is found and a match exists, then the corresponding response message is returned. If no matching message is found for the language specified or the language can't be found, then the custom messsages are used to reconcile the message code.

### .handleCustomErrors(req, err, customCodes, customMessages) &#x27fe; object
`req` is the HTTP Request object. Checks `err.name` for a match in the merged `ReqUtils.customErrorResponseCodes` and `customCodes`. If a match is found, then the found code is looked up in the merged `ReqUtils.customResponseMessages` and `customMessages` for a summary message.  If no code is found, then the code is set to 500001. If no summary is found, then the summary message is set to 'An unexpected error has occurred -- {err.name}'. The code and error are then returned in a objects. If `err` is null, then the object returned contains a `null` message. If `err.name` is null, then it defaults to 'No details'.

```js
  // { msg: 'Something went wrong', code: 500001 }
```

## Utility

### .setTimedout(req)
Set the `req.timedout` flag to true and sets the `req.respCode` to 429000.

### .setError(req, code)
Set the `req.hasError` flag to true and sets the `req.respCode` to `code` provided.

### .setData(req, data)
Set the `req.hasData` flag to true and sets `req.data` to `data` provided, so that it can be processed downstream.

### .hasResponse(req) &#x27fe; boolean
Test the `req` to see if the `hasData`, `hasError` or `timedout` flags have been set

### .setAuthContext(req, authContext)
Set the `req.authContext` flags with fills from the `defaultAuthContext`.

### .updateAuthContext(req, authContext)
Merge `authContext` values into `req.authContext` values, overwriting any values currently set in `req.authContext`.

### .checkAuthContext(req, options) &#x27fe; boolean
Compares the `options` values against the `req.authContext` ensuring that any option set true is also true in the
`req.authContext`.  Any value set false in the options is ignored. Returns false if any option is true, but the
authContext is false.

### .checkPermissions(req) &#x27fe; boolean
Runs the configured `checkPermissions` function configured as a part of the initialization options for ReqUtils.

## Parameter Binding

### .retrieveParams(req, params)
Sets the `req.handler` from the `params` provided, then gathers, parses, and converts these values from the request and
places the values into both `req.handler.[key].value` `req.locals.[key]`.

### .compileRequiredParams(params) &#x27fe; object
Analyzes the `params` configured and creates a dictionary of required and optional parameters. This is used to validate
the request in the `handleRequest` method.

```js
  // { required: reqParams, optional: optParams }
```

### .hasRequiredParams(requiredParams) &#x27fe; array
Analyzes the key values in the `requiredParams` and checks that each of them have a value. Each key name with a missing
value is returned in an array. With an empty array being returned if there are no missing values. `requiredParams` is
the `.required` key from the object returned from `.compileRequiredParams`

### .handleDefaults(req, optionalParams)
Reviews the `optionalParameter` key values set and compares the keys with the values set in `req.locals`. If any
value is missing, then the `default` value is assigned to the key. `optionalParams` is the `.options` key from the
object returned from `.compileRequiredParams`

### .validateParams(params)
Validates all values in `req.locals` against the `type` specified for that key. Returns an array of field names where
the key value does not match the given type specified in the `params`.

# [Types](#types)
<a name="types"></a>

## Auth Context
<a name="types-auth-context"></a>
Auth Context is an object hash which contains key and boolean value pairs. It is left up to the system designer what
each of these contexts indicate.  For example, in one system `client` could mean that the request originated in such a
way that it is interpreted to be having come from a browser or mobile device, and `server` could mean the request
originated from another server. Any custom keys and specific logic is left to the system designer to implement.

```js
{
  super: false,
  signed: false,
  server: false,
  client: false
}
```

## Request Parameter
<a name="types-request-parameter"></a>
A Request Parameter provides a definition for values that may be sent as a part of the incoming request, where to parse
them from, their data type, whether they are required, a default value if they are missing, and optional validation
parameters.

```js
dataVal1: {
  type: 'string',
  required: true,
  source: ['body', 'headers', 'query'],
  default: (v) => { return(v); },
  options: {}
}

```
| Key | Type | Description | Required |
| --- | ---- | ----------- | -------- |
| type | string | The data type for this parameter. See below. | Y |
| required | boolean | Whether the parameter is required. | Y |
| source | array(string) | The locations to search for the parameters. Sources are searched in the order provided and the first source to find the value is the one used.  See below. | Y |
| default | value or function | The default value to use when the value can not be found. When passing a function, the existing value (including null and undefined) is passed into the function and the value returned is used as the default. | N |
| options | object | Additional validator.js options for the data type. See below. | N |

### Data Types and Validation options
The following data types are supported for parsing: `int`, `float`, `bool`, `email`, `currency`, `uuid`, `url`, `fqdn`, `apikey`, `string`, `any`. For more information, please see the [validation-helper README](https://www.npmjs.com/package/@outofsync/validation-helper#api)

### Sources
The following request sources are available:

| Source | Description |
| ------ | ----------- |
| `'params'` | Searched the request route parameters for the key. This is only supported in frameworks that perform route parameter binding to `req.params`. |
| `'header'` | Searches the request headers (lowercase) for the key. |
| `'body'` | Searches the form body (x-www-form-urlencoded) values for the key. |
| `'query'` | Searches the url query variables for the key. |

Additionally, all requests will search for a JSON string passed to `body.params`, and parse that object into the appropriate data fields.

## Request Parameter Collection
A collection of [Request Parameters](#types-request-parameter) in Key / Request Parameter pairs
<a name="types-request-parameter-collection"></a>
```js
const params = {
  ['Test1']: {
    type: 'int',
    source: ['body'],
    required: false
  },
  ['Test2']: {
    type: 'int',
    source: ['body'],
    required: false
  }
};
```

## Request Handler Parameters
<a name="types-hanlder-params"></a>

```js
{
  params: {
    ['Test1']: {
      type: 'int',
      source: ['body'],
      required: false
    }
  },
  security: {

  },
  forceTls: false
}
```

| Key | Type | Description | Required |
| --- | ---- | ----------- | -------- |
| params | [Request Parameter Collection](#types-request-parameter-collection) | The request parameters for this handler. | Y |
| security | [Auth Context](#) | The required Auth Context for this request | N |
| forceTls | boolean | Whether this request is required to be made over HTTPS. Default: `false`. | N |

## CustomCodes
<a name="types-custom-codes"></a>
CustomCodes are a collection of named key and integer value pairs representing the response code to use when a specific `err.name` matches a given key.

```js
{
  ['SequelizeUniqueConstraintError']: 400006,
  ['SequelizeDatabaseError']: 400103,
  ['SequelizeConnectionRefusedError']: 500002
}
```

## ResponseMessage
<a name="types-response-message"></a>

```js
  { summary: 'OK', message: '', status: 200 },
```

| Key | Type | Description | Required |
| --- | ---- | ----------- | -------- |
| summary | string | The response summary for the specific response code | Y |
| message | string | The response message for detailed error information | Y |
| status | int | The HTTP Response status code | Y |

## CustomMessages
<a name="types-custom-messages"></a>
A collection of [ResponseMessage](#types-reponse-message) objects, with a matching response code key.

```js
{
  [200000]: { summary: 'OK', message: '', status: 200 },
  [400000]: { summary: 'Bad Request', message: 'The request is malformed.', status: 400 },
  [400001]: { summary: 'Missing Parameters', message: 'The request is missing required parameters.', status: 400 }
}
```

# [License](#license)
<a name="license"></a>

Copyright (c) 2018, 2019 Jay Reardon
Copyright (c) 2019-2022 Out of Sync Studios LLC  -- Licensed under the MIT license.
