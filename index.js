// reqUtils.js

const __ = require('@mediaxpost/lodashext');
const validator = require('@mediaxpost/validation-helper');

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
      checkPermissions: ((req) => { return true; }),
      customErrorCodes: {},
      customErrorMessages: {},
      defaultAuthContext: { super: false, signed: false, server: false, client: false }
    }
    this.req = req;
    __.merge(this.options, options || {});
  }

  skipAuth(req) {
    req = req || this.req;
    return req && req.skipAuth;
  }

  hasResponse(req) {
    req = req || this.req;
    return req && (req.hasData || req.hasError || req.timedout);
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

  setAuthContext(authContext, req) {
    req = req || this.req;

    if (__.isUnset(req.securityContext)) {
      req.securityContext = this.options.defaultAuthContext;
    }

    req.securityContext = __.merge(Object.assign({}, this.options.defaultAuthContext), authContext);
  }

  updateAuthContext(authContext, req) {
    req = req || this.req;

    if (__.isUnset(req.securityContext)) {
      req.securityContext = this.options.defaultAuthContext;
    }

    __.merge(req.securityContext, authContext);
  }

  checkAuthContext(options, req) {
    req = req || this.req;

    // Set defaults where empty
    options = __.merge(Object.assign({}, this.options.defaultAuthContext), options);
    const secCon = __.merge(Object.assign({}, this.options.defaultAuthContext), req.securityContext);

    let test = true;

    // Aggregate all the options and test equality with the security context
    for (var key in secCon) {
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

  handleCustomErrors(err, errorCodes, errorMessages) {
    let msg;
    let code = 5000001;

    let codes = __.merge(Object.assign({}, this.options.customErrorCodes), errorCodes || {});
    let messages = __.merge(Object.assign({}, this.options.customErrorMessages), errorMessages || {});

    if (err.name) {
      if (codes.hasOwnProperty(err.name)) {
        code = codes[err.name];
      }
    }

    this.setError(code);
    if (messages.hasOwnProperty(code)) {
      msg = messages[code];
    } else {
      msg = `An unexpected error has occured -- ${err.name}`;
    }

    return { msg: msg, code: code };
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
      if (!this.checkAuthContext(params.security, req)) {
        // Unauthorized user
        this.setError(403000, req);
        err = 'The API Provided is not authorized to access this resource';
        next(err);
        return err;
      }

      // Protocol check HTTP/HTTPS
      params.secure = params.secure || false;
      if (!__.implies(params.secure, req.secure)) {
        // Unauthorized protocol
        this.setError(403003, req);
        err = 'This endpoint is only available via HTTPS. Alter the protocol and try again.';
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
        this.setError(400003, req);
        // Return an error below
        err = `Required parameters [${reqParams}] are missing from this request.`;
        next(err);
        return err;
      }

      // Permissions Check
      if (!this.checkPermissions(req)) {
        // Unauthorized user
        this.setError(403000, req);
        err = 'You are not authorized to access this resource.';
        next(err);
        return err;
      }

      // Set default values for optional params
      this.handleDefaults(sepParams.optional, req);

      // Validate params
      const invalidParams = this.validateParams(req.handler);
      if (invalidParams.length > 0) {
        // We have invalid paramaters, report the error
        this.setError(400004, req);
        // Return an error below
        err = 'The parameter(s) ';
        let cnt = 0;
        for (const value of invalidParams) {
          if (cnt > 0) {
            err += ', ';
          }
          err += `'${value.key}' should be type '${value.type}'`;
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
        // TODO: Need to log stacktraces here
        this.setError(500001, req);
        next(innerErr);
      }
    } else {
      next();
    }

    return undefined;
  }

  handleRequestAsync(params, closure, next, res, req) {
    return new Promise((reject, resolve) => {
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
