// reqUtils.js

const __ = require('@outofsync/lodash-ex');
const validator = require('@outofsync/validation-helper');
const Localize = require('@outofsync/localize');

const defaultDictionary = {
  ResponseCodes: {
    200000: {
      Summary: 'OK',
      Message: ''
    },
    400000: {
      Summary: 'Bad Request',
      Message: 'The request is malformed.'
    },
    400001: {
      Summary: 'Missing Parameters',
      Message: 'The request is missing required parameters.'
    },
    400002: {
      Summary: 'Non-Existent Record',
      Message: 'The record requested does not exist.'
    },
    401000: {
      Summary: 'Unauthorized',
      Message: 'This request is not authorized.'
    },
    403000: {
      Summary: 'Forbidden',
      Message: 'The credentials provided are not authorized for this request.'
    },
    403001: {
      Summary: 'Forbidden',
      Message: 'Secure endpoints can only be accessed via HTTPS.'
    },
    408000: {
      Summary: 'Timed Out',
      Message: 'The request timed out.'
    },
    429000: {
      Summary: 'Rate Limit',
      Message: 'Rate limit has been exceeded'
    },
    500000: {
      Summary: 'Could Not Connect',
      Message: 'The server connection timed out'
    },
    500001: {
      Summary: 'General Server Error',
      Message: 'A fatal error has occurred on the server.'
    }
  },
  __RequestUtils: {
    NoDetails: 'No Details',
    UnexpectedPlusError: 'An unexpected error has occurred -- $1',
    UnauthorizedAPIAccess: 'The API Provided is not authorized to access this resource.',
    UnauthorizedProtocolNoHTTP: 'The endpoint is only available via HTTPS. Alter the protocol and try again.',
    BadRequestMissingParams: 'Required parameters [$1] are missing from this request.',
    UnauthorizedNoAccess: 'You are not authorized to access this resource.',
    Parameters: 'The parameter(s) ',
    KeyType: '\'$1\' should be type \'$2\'',
  }
};

/**
 * A utility class to process common HTTP request parameters and handling. This class exists to move repeated
 * functionality out of controllers to reduce repeated code
 * @class ReqUtils
 * @param {Request} req - The HTTP Request object (e.g. from `express` or some other HTTP handler)
 * @example
 * let reqUtils = new ReqUtils(req);
 */
class ReqUtils {
  constructor(req, options) {
    this.options = {
      checkPermissions: ((_req) => { return true; }),
      customErrorResponseCodes: {},
      customResponseMessagesKeys: {},
      defaultAuthContext: { super: false, signed: false, server: false, client: false },
      defaultLang: 'en'
    };
    this.req = req;
    __.merge(this.options, options || {});

    if (!this.options.i18n || !(this.options.i18n instanceof Localize)) {
      this.options.i18n = new Localize();
      this.options.i18n.loadDictionary('en', defaultDictionary);
    } else {
      this.options.i18n.dictionaries[this.options.defaultLang] = __.merge(__.assign({}, defaultDictionary), this.options.i18n.dictionaries[this.options.defaultLang]);
    }
  }

  setSkipAuth(value, req) {
    req = req || this.req;
    req.skipAuth = __.bool(value);
  }

  skipAuth(req) {
    req = req || this.req;
    return req && req.skipAuth;
  }

  setTimedout(req) {
    req = req || this.req;
    req.timedout = true;
    req.respCode = 429000;
  }

  setError(code, req) {
    req = req || this.req;
    req.hasError = true;
    req.respCode = code;
  }

  setData(data, req) {
    req = req || this.req;
    req.hasData = true;
    req.data = data;
  }

  hasResponse(req) {
    req = req || this.req;
    return req && (req.hasData || req.hasError || req.timedout);
  }

  setAuthContext(authContext, req) {
    req = req || this.req;

    if (__.isUnset(req.authContext)) {
      req.authContext = this.options.defaultAuthContext;
    }

    req.authContext = __.merge(Object.assign({}, this.options.defaultAuthContext), authContext);
  }

  updateAuthContext(authContext, req) {
    req = req || this.req;

    if (__.isUnset(req.authContext)) {
      req.authContext = this.options.defaultAuthContext;
    }

    __.merge(req.authContext, authContext);
  }

  checkAuthContext(options, req) {
    req = req || this.req;
    let test = true;

    // Set defaults where empty
    options = __.merge(Object.assign({}, this.options.defaultAuthContext), options);
    const secCon = __.merge(Object.assign({}, this.options.defaultAuthContext), req.authContext);

    // Aggregate all the options and test equality with the security context
    for (const key in secCon) {
      if (secCon.hasOwnProperty(key)) {
        test = test && __.implies(options[key], secCon[key]);
      }
    }
    return test;
  }

  // Checks the current request against permissions
  checkPermissions(req) {
    req = req || this.req;
    return this.options.checkPermissions(req);
  }

  retrieveParams(params, req) {
    req = req || this.req;
    req.handler = params;
    req.locals = {};
    let current;
    // Check for a body.params and merge it into req.locals
    if (req.body.params) {
      // Replace bad quotes so the value lints
      const toParse = req.body.params.replace(/'/g, '"');
      let linted;
      try {
        linted = JSON.parse(toParse);
      } catch (err) {}

      // Only merge if the params variable lints to an object
      if (typeof linted === 'object') {
        req.body = __.merge(req.body, linted);
      }
      delete req.body.params;
    }

    // loadeach key from its respective sources as provided
    for (const key in params) {
      // Skip 'params' key as it's a reserved body variable
      if (key !== 'params') {
        if (params.hasOwnProperty(key)) {
          current = params[key];
          let value;
          // Go through the possible sources in the request
          for (const source of current.source) {
            const val = source === 'headers' ? req[source][key.toLowerCase()] : req[source][key];
            if (__.isUnset(value) && __.hasValue(val)) {
              value = val;
            }
          }
          req.handler[key].value = value;
        }
      }
    }

    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        current = params[key];
        const value = req.handler[key].value;
        // Convert each key to its respective types for numbers
        req.locals[key] = validator.convert(value, current.type);
      }
    }
  }

  compileRequiredParams(params) {
    // Compile required parameters into a check array
    params = params || {};
    const reqParams = {};
    const optParams = {};
    let current;
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        current = params[key];
        if (current.required) {
          reqParams[key] = current.value;
        } else {
          optParams[key] = current.default;
        }
      }
    }
    return { required: reqParams, optional: optParams };
  }

  hasRequiredParams(params) {
    // Check Required parameters
    params = params || {};
    const reqParams = [];
    let current;
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        current = params[key];
        if (__.isUnset(current)) {
          reqParams.push(key);
        }
      }
    }
    return reqParams;
  }

  // Looks for keys in the req.locals, if they are not set then it sets a default value
  handleDefaults(params, req) {
    req = req || this.req;
    let current;
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        current = params[key];
        // Check if the default is a function
        if (typeof current === 'function') {
          const val = current(req.handler[key].value);
          req.handler[key].value = val;
          req.locals[key] = val;
        } else if (__.isUnset(req.handler[key].value)) {
          // Only set default if the value is unset
          req.handler[key].value = current;
          req.locals[key] = current;
        }
      }
    }
  }

  // Expects an object containing the value and types for each named key
  // e.g. { dealerID: { value: 100, type: 'int' } }
  // Returns the array of non-matching values
  validateParams(params) {
    const test = [];
    let current;
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        current = params[key];
        // Only validate when a value is present
        if (current.value && !validator.validate(current.value, current.type, current.options)) {
          current.key = key;
          test.push(current);
        }
      }
    }
    return test;
  }

  getResponseMessage(code, lang, customMessagesKeys) {
    lang = lang || this.options.defaultLang;
    const baseKey = `ResponseCodes.${code}`;
    const message = {
      summary: this.options.i18n.tr(`${baseKey}.Summary`, lang),
      message: this.options.i18n.tr(`${baseKey}.Message`, lang)
    };

    // If customMessagesKeys were provided use those instead to lookup summary and message
    if (customMessagesKeys && customMessagesKeys.hasOwnProperty(code)) {
      message.summary = this.options.i18n.tr(customMessagesKeys[code].summary);
      message.message = this.options.i18n.tr(customMessagesKeys[code].message);
    }

    return message;
  }

  handleCustomErrors(err, customCodes, customMessagesKeys) {
    let msg = null;
    let code = 500001;
    const retVal = {};

    if (err) {
      const codes = __.merge(__.assign({}, this.options.customErrorResponseCodes), customCodes);
      const messages = __.merge(__.assign({}, this.options.customResponseMessagesKeys), customMessagesKeys);

      // Match error.name to specific response code
      let name = err.name || err;

      if (err.respCode) {
        code = err.respCode;
      } else if (name && codes.hasOwnProperty(name)) {
        code = codes[name];
      } else {
        name = this.options.i18n.tr('__RequestUtils.NoDetails');
      }

      this.setError(code);
      const message = err.message || name || err;
      retVal.details = message;
      const custMsg = this.getResponseMessage(code, null, messages);
      if (custMsg && custMsg.summary) {
        msg = custMsg.summary;
      } else {
        msg = this.options.i18n.tr('__RequestUtils.UnexpectedPlusError', null, message);
      }
    }
    retVal.msg = msg;
    retVal.code = code;
    if (err instanceof Error || (typeof err === 'object' && err.hasOwnProperty('stack'))) {
      retVal.stack = err.stack;
    }
    return retVal;
  }

  // Expects an object containing paramater and security information
  // e.g. { params: {
  //          dealerID: { type: 'int', required: true, source: ['params', 'body', 'headers', 'query'] },
  //          limit: {
  //            type: 'int',
  //            required: false,
  //            source: ['params', 'body', 'headers', 'query'],
  //            default: (v) => { return Number((v < 1) ? 1 : (v || 1));}
  //          },
  //          page: { type: 'int', required: false, source: ['params', 'body', 'headers', 'query'], default: 1 }
  //        },
  //        security: { super: true, server: true, client: true },
  //        secure: false
  //      }
  // The possible sources are 'params', 'body', 'headers', 'query'.
  // The handler will will search the sources in the order they are provided for each variable and only return the first
  // instance found (if one exists). All retrieved parameters are placed in `req.locals`
  handleRequest(params, closure, next, res, req) {
    let err;
    req = req || this.req;
    // Check if this has already been handled
    if (!this.hasResponse(req)) {
      // AuthContext Check
      params.security = __.merge(Object.assign({}), params.security);
      if (!this.checkAuthContext(params.security, req)) {
        // Unauthorized user
        this.setError(403000, req);
        err = this.options.i18n.tr('__RequestUtils.UnauthorizedAPIAccess');
        next(err);
        return err;
      }

      // Protocol check HTTP/HTTPS
      params.secure = params.secure || false;
      if (!__.implies(params.secure, req.secure)) {
        // Unauthorized protocol
        this.setError(403001, req);
        err = this.options.i18n.tr('__RequestUtils.UnauthorizedProtocolNoHTTP');
        next(err);
        return err;
      }

      // Logic to get parameters
      this.retrieveParams(params.params, req);

      // Compile optional/required params
      const sepParams = this.compileRequiredParams(req.handler);
      // Check Required params
      const reqParams = this.hasRequiredParams(sepParams.required);
      if (reqParams.length > 0) {
        // We have missing parameters, report the error
        this.setError(400001, req);
        // Return an error below
        err = this.options.i18n.tr('__RequestUtils.BadRequestMissingParams', null, reqParams);
        next(err);
        return err;
      }

      // Permissions Check
      if (!this.checkPermissions(req)) {
        // Unauthorized user
        this.setError(403000, req);
        err = this.options.i18n.tr('__RequestUtils.UnauthorizedNoAccess');
        next(err);
        return err;
      }

      // Set default values for optional params
      this.handleDefaults(sepParams.optional, req);

      // Validate params
      const invalidParams = this.validateParams(req.handler);
      if (invalidParams.length > 0) {
        // We have invalid paramaters, report the error
        this.setError(400002, req);
        // Return an error below
        err = this.options.i18n.tr('__RequestUtils.Parameters');
        let cnt = 0;
        for (const value of invalidParams) {
          if (cnt > 0) {
            err += ', ';
          }
          err += this.options.i18n.tr('__RequestUtils.KeyType', null, value.key, value.type);
          cnt += 1;
        }
        err += '.';
        next(err);
        return err;
      }

      // Run closure function
      try {
        closure(req, res, next);
      } catch (innerErr) {
        this.setError(500001, req);
        next(innerErr);
      }
    } else {
      next();
    }

    return undefined;
  }

  handleRequestAsync(params, closure, next, res, req) {
    return new Promise((resolve, reject) => {
      const ret = this.handleRequest(params, closure, next, res, req);
      if (__.hasValue(ret)) {
        reject(ret);
      } else {
        resolve();
      }
    });
  }
}

module.exports = ReqUtils;
