# request-utils

[![NPM](https://nodei.co/npm/@mediaxpost/request-utils.png?downloads=true)](https://nodei.co/npm/@mediaxpost/request-utils/)

[![Actual version published on npm](http://img.shields.io/npm/v/@mediaxpost/request-utils.svg)](https://www.npmjs.org/package/@mediaxpost/request-utils)
[![Travis build status](https://travis-ci.org/MediaXPost/request-utils.svg)](https://www.npmjs.org/package/@mediaxpost/request-utils)
[![Total npm module downloads](http://img.shields.io/npm/dt/@mediaxpost/request-utils.svg)](https://www.npmjs.org/package/@mediaxpost/request-utils)
[![Package Quality](http://npm.packagequality.com/badge/@mediaxpost/request-utils.png)](http://packagequality.com/#?package=@mediaxpost/request-utils)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/43225424afb04627afd2e026712d5281)](https://www.codacy.com/app/chronosis/request-utils?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=MediaXPost/request-utils&amp;utm_campaign=Badge_Grade)
[![Codacy Coverage  Badge](https://api.codacy.com/project/badge/Coverage/43225424afb04627afd2e026712d5281)](https://www.codacy.com/app/chronosis/request-utils?utm_source=github.com&utm_medium=referral&utm_content=MediaXPost/request-utils&utm_campaign=Badge_Coverage)
[![Dependencies badge](https://david-dm.org/MediaXPost/request-utils/status.svg)](https://david-dm.org/MediaXPost/request-utils?view=list)


`request-utils` is library designed to simplify the processing of HTTP Request handling and parameters parsing by abstracting commonly reused processing patterns.

It can be used with any framework that creates and uses HTTPRequest objects.

# [Installation](#installation)
<a name="installation"></a>

```shell
npm install @mediaxpost/request-utils
```

# [Usage](#usage)
<a name="usage"></a>

```js
const ReqUtils = require('@mediaxpost/request-utils');

// Example Express.js handler
function handler(req, res, next) {
  const reqUtils = new ReqUtils(req);

  reqUtils.handleRequestAsync(
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
      security: { super: true, server: true }
    },
    // Closure function that does processing if the request passes initial inspection
    (_req, _res, _next) => {
      console.log(_req.locals.dataVal1);
      console.log(_req.locals.dataVal2);
      _next();
    },
    next,
    res
  )
  .catch(() => {});
}
```

# [API Reference](#api)
<a name="api"></a>

## ReqUtils constructor(req [, options]) ⇒ instanceof ReqUtils
Create an instance of ReqUtils with the `req` HTTP Request object provided. Additional configuration parameters may be passed in the `options`,

The `options` is a object why may contain any, all, or none of the following:

```js
{
  checkPermissions: ((req) => { return true; }),
  customErrorCodes: {},
  customErrorMessages: {}
}
```

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| checkPermissions | Function(req) ⇒ bool | ((req) => { return true; }) | A function to perform additional permission check which returns a boolean if the check passes |
| customErrorCodes | Object(CustomCodes) | {} |  A `CustomCodes` object to be used with handleCustomErrors, which checks an error message for the message and sets the appropriate code |
| customErrorMessages | Object(CustomMessages) | {} | A `CustomMessages` object which defines the error message details and status codes for various error codes |
| defaultAuthContext | Object(AuthContext) | { super: false, signed: false, server: false, client: false } | A `AuthContext` object which defines the default AuthContext state |

## ReqUtils.methodMan ⇒ object

# [Types](#types)
<a name="types"></a>

## Auth Context
```js
{
  super: false,
  signed: false,
  server: false,
  client: false
}
```

## Parameter
```js
dataVal1: {
  type: 'string',
  required: true,
  source: ['body', 'headers', 'query'],
  default: (v) => { return(v); },
  options: {}
},
```

## Parameter Collection

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
## CustomCodes

## CustomMessages

# [License](#license)
<a name="license"></a>

Copyright (c) 2018 Jay Reardon -- Licensed under the MIT license.
