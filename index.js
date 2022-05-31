// reqUtils.js

const { implies } = require('implies');
const isNil = require('lodash.isnil');
const assign = require('lodash.assign');
const merge = require('lodash.merge');

const validator = require('@outofsync/validation-helper');
const Localize = require('@outofsync/localize');

const defaultDictionary = require('./src/lib/constants');

/**
 * A utility class to process common HTTP request parameters and handling. This class exists to move repeated
 * functionality out of controllers to reduce repeated code
 * @class ReqUtils
 * @param {*} options - The options to pass into the 
 * @example
 * let reqUtils = new ReqUtils(options);
 */
class ReqUtils {
  constructor(options) {
    this.options = {
      // eslint-disable-next-line no-unused-vars
      checkPermissions: ((_req) => { return true; }),
      customErrorResponseCodes: {},
      customResponseMessagesKeys: {},
      defaultAuthContext: { super: false, signed: false, server: false, client: false },
      defaultLang: 'en',
      debug: false,
      enableAuthContextCheck: true,
      enableForceTlsCheck: true,
      enablePermissionsCheck: true,
    };
    merge(this.options, options || {});

    if (!this.options.i18n || !(this.options.i18n instanceof Localize)) {
      this.options.i18n = new Localize();
      this.options.i18n.loadDictionary('en', defaultDictionary);
    } else {
      const defaultDic = assign({}, defaultDictionary);
      const defaultLang = this.options.defaultLang;
      this.options.i18n.dictionaries[defaultLang] = merge(defaultDic, this.options.i18n.dictionaries[defaultLang]);
    }
  }

  setTimedout(req) {
    req.timedout = true;
    req.respCode = 429000;
  }

  setError(req, code) {
    req.hasError = true;
    req.respCode = code;
  }

  setData(req, data) {
    req.hasData = true;
    req.data = data;
  }

  hasResponse(req) {
    return req && (req.hasData || req.hasError || req.timedout);
  }

  setAuthContext(req, authContext) {
    if (isNil(req.authContext)) {
      req.authContext = this.options.defaultAuthContext;
    }
    req.authContext = merge(Object.assign({}, this.options.defaultAuthContext), authContext);
  }

  updateAuthContext(req, authContext) {
    if (isNil(req.authContext)) {
      req.authContext = this.options.defaultAuthContext;
    }
    merge(req.authContext, authContext);
  }

  checkAuthContext(req, options) {
    let test = true;

    // Set defaults where empty
    options = merge(Object.assign({}, this.options.defaultAuthContext), options);
    const secCon = merge(Object.assign({}, this.options.defaultAuthContext), req.authContext);

    // Aggregate all the options and test equality with the security context
    for (const key in secCon) {
      if (secCon.hasOwnProperty(key)) {
        test = test && implies(options[key], secCon[key]);
      }
    }
    return test;
  }

  // Checks the current request against permissions
  checkPermissions(req) {
    return this.options.checkPermissions(req);
  }

  retrieveParams(req, params) {
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
        req.body = merge(req.body, linted);
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
            if (isNil(value) && !isNil(val)) {
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

    return req.locals;
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
        if (isNil(current)) {
          reqParams.push(key);
        }
      }
    }
    return reqParams;
  }

  // Looks for keys in the req.locals, if they are not set then it sets a default value
  handleDefaults(req, params) {
    let current;
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        current = params[key];
        // Check if the default is a function
        if (typeof current === 'function') {
          const val = current(req.handler[key].value);
          req.handler[key].value = val;
          req.locals[key] = val;
        } else if (isNil(req.handler[key].value)) {
          // Only set default if the value is unset
          req.handler[key].value = current;
          req.locals[key] = current;
        }
      }
    }
  }

  // Expects an object containing the value and types for each named key
  // e.g. { id: { value: 100, type: 'int' } }
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

  handleCustomErrors(req, err, customCodes, customMessagesKeys) {
    let msg = null;
    let code = 500001;
    const retVal = {};

    if (err) {
      const codes = merge(assign({}, this.options.customErrorResponseCodes), customCodes);
      const messages = merge(assign({}, this.options.customResponseMessagesKeys), customMessagesKeys);

      // Match error.name to specific response code
      let name = err.name || err;

      if (err.respCode) {
        code = err.respCode;
      } else if (name && codes.hasOwnProperty(name)) {
        code = codes[name];
      } else {
        name = this.options.i18n.tr('__RequestUtils.NoDetails');
      }

      this.setError(req, code);
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
  //          id: { type: 'int', required: true, source: ['params', 'body', 'headers', 'query'] },
  //          limit: {
  //            type: 'int',
  //            required: false,
  //            source: ['params', 'body', 'headers', 'query'],
  //            default: (v) => { return Number((v < 1) ? 1 : (v || 1));}
  //          },
  //          page: { type: 'int', required: false, source: ['params', 'body', 'headers', 'query'], default: 1 }
  //        },
  //        authContext: { super: true, server: true, client: true },
  //        forceTls: false
  //      }
  // The possible sources are 'params', 'body', 'headers', 'query'.
  // The handler will will search the sources in the order they are provided for each variable and only return the first
  // instance found (if one exists). All retrieved parameters are placed in `req.locals`
  handleRequestSync(handlerOptions, closure, req, res, next) {
    let err;
    
    // Check if this has already been handled
    if (this.hasResponse(req)) {
      next();
      return undefined;
    }

    // AuthContext Check
    if (this.options.enableAuthContextCheck) {
      handlerOptions.authContext = merge(Object.assign({}), handlerOptions.authContext);
      if (!this.checkAuthContext(req, handlerOptions.authContext)) {
        // Unauthorized user
        this.setError(req, 403000);
        err = this.options.i18n.tr('__RequestUtils.UnauthorizedAPIAccess');
        next(err);
        return err;
      }
    }

    // Protocol check HTTP/HTTPS
    if (this.options.enableForceTlsCheck) {
      handlerOptions.forceTls = handlerOptions.forceTls || false;
      if (!implies(handlerOptions.forceTls, req.secure)) {
        // Unauthorized protocol 
        this.setError(req, 403001);
        err = this.options.i18n.tr('__RequestUtils.UnauthorizedProtocolNoHTTP');
        next(err);
        return err;
      }
    }

    // Logic to get parameters
    const locals = this.retrieveParams(req, handlerOptions.params);

    // Compile optional/required params
    const sepParams = this.compileRequiredParams(req.handler);
    // Check Required params
    const reqParams = this.hasRequiredParams(sepParams.required);
    if (reqParams.length > 0) {
      // We have missing parameters, report the error
      this.setError(req, 400001);
      // Return an error below
      err = this.options.i18n.tr('__RequestUtils.BadRequestMissingParams', null, reqParams);
      next(err);
      return err;
    }

    // Permissions Check
    if (this.options.enablePermissionsCheck && !this.checkPermissions(req)) {
      // Unauthorized user
      this.setError(req, 403000);
      err = this.options.i18n.tr('__RequestUtils.UnauthorizedNoAccess');
      next(err);
      return err;
    }

    // Set default values for optional params
    this.handleDefaults(req, sepParams.optional);

    // Validate params
    const invalidParams = this.validateParams(req.handler);
    if (invalidParams.length > 0) {
      // We have invalid paramaters, report the error
      this.setError(req, 400002);
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
      closure(locals, req, res, next);
    } catch (innerErr) {
      this.setError(req, 500001);
      next(innerErr);
    }
    return undefined;
  }

  handleRequest(handlerOptions, closure, req, res, next) {
    return new Promise((resolve, reject) => {
      const ret = this.handleRequestSync(handlerOptions, closure, req, res, next);
      if (!isNil(ret)) {
        reject(ret);
      } else {
        resolve();
      }
    });
  }
}

module.exports = ReqUtils;
