// test/index.js

// Dependancies
const __ = {
  isNil: require('lodash.isnil'),
  omit: require('lodash.omit'),
};
const chai = require('chai');
const expect = chai.expect;
const ReqUtils = require('../');

const req = {
  hasData: false,
  params: { paramVar: 1234, resetValue: -2, badValidation: 'abcd' },
  body: { bodyVar: '1234', multiVar: 'abcd', params: '{ "jsonData": "this is a string" }' },
  headers: { headervar: '1234' },
  query: { queryVar: '1234', multiVar: '1234', wrongSrcVar: '1234' }
};

const reqParams = {
  paramVar: { type: 'int', required: true, source: ['params'] },
  bodyVar: { type: 'string', required: true, source: ['body'] },
  headerVar: { type: 'string', required: true, source: ['headers'] },
  queryVar: { type: 'string', required: true, source: ['query'] },
  multiVar: { type: 'string', required: true, source: ['body', 'query'] },
  wrongSrcVar: { type: 'string', required: false, source: ['body'] },
  defaultVar: { type: 'string', required: false, source: ['body'], default: 'qwerty' },
  jsonData: { type: 'string', required: false, source: ['body'] },
  resetValue: {
    type: 'int',
    required: false,
    source: ['params'],
    default: (val) => {
      return Number(val < 1 ? 1 : val || 1);
    }
  },
  badDefaultValidation: {
    type: 'int',
    required: false,
    source: ['params'],
    default: () => {
      return 'default';
    }
  },
  badValidation: { type: 'int', required: true, source: ['params'] },
  missingRequiredVar: { type: 'string', required: true, source: ['body'] }
};

const basicDictionary = {
  TestSummary: 'Test1',
  TestMessage: 'Test message 1',
  OK: 'OK',
  _Blank: ''
};

const reqUtilOptions = {
  customErrorResponseCodes: {
    ['TestError']: 12345,
    ['OtherTestError']: 98765,
  },
  customResponseMessagesKeys: {
    [12345]: { summary: 'TestSummary', message: 'TestMessage' },
    [200000]: { summary: 'OK', message: '_Blank' }
  }
};

let reqUtils;

describe('Request Utilities', () => {
  let sepParams;
  before((done) => {
    reqUtils = new ReqUtils(reqUtilOptions);
    reqUtils.options.i18n.loadDictionary('en', basicDictionary);
    done();
  });

  it('ctor', () => {
    expect(reqUtils).to.be.instanceof(ReqUtils);
  });

  it('setTimedout', () => {
    reqUtils.setTimedout(req);
    expect(req.timedout).to.equal(true);
    expect(req.respCode).to.equal(429000);
    req.timedout = false;
    req.respCode = null;
  });

  it('setError', () => {
    reqUtils.setError(req, 12345);
    expect(req.hasError).to.equal(true);
    expect(req.respCode).to.equal(12345);
    req.hasError = false;
    req.respCode = null;
  });

  it('setData', () => {
    reqUtils.setData(req, { message: 'OK' });
    expect(req.hasData).to.equal(true);
    expect(req.data.message).to.equal('OK');
    req.data = null;
  });

  it('hasResponse', () => {
    expect(reqUtils.hasResponse(req)).to.equal(true);
  });

  it('setAuthContext', () => {
    reqUtils.setAuthContext(req, { super: false, signed: false, server: false, client: false });
    expect(req.authContext).to.exist;
    expect(req.authContext.super).to.equal(false);
    expect(req.authContext.signed).to.equal(false);
    expect(req.authContext.server).to.equal(false);
    expect(req.authContext.client).to.equal(false);
  });

  describe('updateAuthContext', () => {
    it('normal function', () => {
      reqUtils.updateAuthContext(req, { super: true });
      expect(req.authContext).to.exist;
      expect(req.authContext.super).to.equal(true);
    });
  
    it('with empty context', () => {
      req.authContext = null;
      reqUtils.updateAuthContext(req, { });
      expect(req.authContext).to.exist;
      expect(req.authContext.super).to.equal(false);
    }); 
  });

  it('checkAuthContext', () => {
    reqUtils.setAuthContext(req, { super: false, signed: false, server: false, client: false });
    expect(reqUtils.checkAuthContext(req, { super: true })).to.equal(false);
    expect(reqUtils.checkAuthContext(req, { signed: true })).to.equal(false);
    expect(reqUtils.checkAuthContext(req, { server: true })).to.equal(false);
    expect(reqUtils.checkAuthContext(req, { client: true })).to.equal(false);
    reqUtils.updateAuthContext(req, { client: true });
    expect(reqUtils.checkAuthContext(req, { super: true })).to.equal(false);
    expect(reqUtils.checkAuthContext(req, { signed: true })).to.equal(false);
    expect(reqUtils.checkAuthContext(req, { server: true })).to.equal(false);
    expect(reqUtils.checkAuthContext(req, { client: true })).to.equal(true);
    reqUtils.updateAuthContext(req, { server: true, client: false });
    expect(reqUtils.checkAuthContext(req, { super: true })).to.equal(false);
    expect(reqUtils.checkAuthContext(req, { signed: true })).to.equal(false);
    expect(reqUtils.checkAuthContext(req, { server: true })).to.equal(true);
    expect(reqUtils.checkAuthContext(req, { client: true })).to.equal(false);
    reqUtils.updateAuthContext(req, { signed: true, server: false });
    expect(reqUtils.checkAuthContext(req, { super: true })).to.equal(false);
    expect(reqUtils.checkAuthContext(req, { signed: true })).to.equal(true);
    expect(reqUtils.checkAuthContext(req, { server: true })).to.equal(false);
    expect(reqUtils.checkAuthContext(req, { client: true })).to.equal(false);
    reqUtils.updateAuthContext(req, { super: true, signed: false });
    expect(reqUtils.checkAuthContext(req, { super: true })).to.equal(true);
    expect(reqUtils.checkAuthContext(req, { signed: true })).to.equal(false);
    expect(reqUtils.checkAuthContext(req, { server: true })).to.equal(false);
    expect(reqUtils.checkAuthContext(req, { client: true })).to.equal(false);
  });

  it('checkPermissions', () => {
    expect(reqUtils.checkPermissions(req)).to.equal(true);
    req.locals = {};
  });

  describe('retrieveParams', () => {
    it('retrieveParams', () => {
      reqUtils.retrieveParams(req, reqParams);
      // This should move all the values to the req.locals
      expect(!__.isNil(req.locals)).to.equal(true);
      expect(!__.isNil(req.handler)).to.equal(true);
    });
  
    it('checking value retrieval from params', () => {
      expect(!__.isNil(req.locals.paramVar)).to.equal(true);
      expect(req.locals.paramVar).to.equal(1234);
    });
  
    it('checking value retrieval from body', () => {
      expect(!__.isNil(req.locals.bodyVar)).to.equal(true);
      expect(req.locals.bodyVar).to.equal('1234');
    });
  
    it('checking value retrieval from body \'params\' JSON string', () => {
      expect(!__.isNil(req.locals.jsonData)).to.equal(true);
      expect(req.locals.jsonData).to.equal('this is a string');
    });
  
    it('checking value retrieval from header', () => {
      expect(!__.isNil(req.locals.headerVar)).to.equal(true);
      expect(req.locals.headerVar).to.equal('1234');
    });
  
    it('checking value retrieval from query', () => {
      expect(!__.isNil(req.locals.queryVar)).to.equal(true);
      expect(req.locals.queryVar).to.equal('1234');
    });
  
    it('checking value retrieval priority where variable can come from multiple sources', () => {
      expect(!__.isNil(req.locals.multiVar)).to.equal(true);
      expect(req.locals.multiVar).to.equal('abcd');
    });
  
    it('checking that value that is not in the correct source is not retrieved', () => {
      expect(!__.isNil(req.locals.wrongSrcVar)).to.not.equal(true);
    });
  
    it('checking that missing value is not retrieved', () => {
      expect(!__.isNil(req.locals.missingRequiredVar)).to.not.equal(true);
    });
  });

  it('compileRequiredParams', () => {
    reqUtils.retrieveParams(req, reqParams);
    sepParams = reqUtils.compileRequiredParams(req.handler);
    expect(!__.isNil(sepParams)).to.equal(true);
    expect(!__.isNil(sepParams.required)).to.equal(true);
    expect(!__.isNil(sepParams.optional)).to.equal(true);
  });

  it('hasRequiredParams', () => {
    reqUtils.retrieveParams(req, reqParams);
    sepParams = reqUtils.compileRequiredParams(req.handler);
    const required = reqUtils.hasRequiredParams(sepParams.required);
    expect(required.length === 1); // There should be 1 missing parameter
  });

  it('handleDefaults', () => {
    reqUtils.retrieveParams(req, reqParams);
    sepParams = reqUtils.compileRequiredParams(req.handler);
    reqUtils.handleDefaults(req, sepParams.optional);
    expect(!__.isNil(req.locals.resetValue)).to.equal(true);
    expect(req.locals.resetValue).to.equal(1);
    expect(!__.isNil(req.locals.defaultVar)).to.equal(true);
    expect(req.locals.defaultVar).to.equal('qwerty');
    expect(!__.isNil(req.locals.badDefaultValidation)).to.equal(true);
    expect(req.locals.badDefaultValidation).to.equal('default');
  });

  it('validateParams', () => {
    const invalidParams = reqUtils.validateParams(req.handler);
    expect(invalidParams.length).is.above(0);
    // There should be at least 1 missing parameter
    expect(invalidParams.find((elem) => {
      return elem.key === 'badDefaultValidation';
    })).to.exist; // This should return true as badDefaultValidation should exist
  });

  describe('handleCustomError', () => {
    it('with null error', () => {
      const errorMessage = reqUtils.handleCustomErrors(req);
      expect(errorMessage.code).to.equal(500001);
      expect(errorMessage.msg).to.equal(null);
    });

    it('with empty error', () => {
      const errorMessage = reqUtils.handleCustomErrors(req, {});
      expect(errorMessage.code).to.equal(500001);
      expect(errorMessage.msg).to.have.string('General');
    });

    it('with matching error and code', () => {
      const errorMessage = reqUtils.handleCustomErrors(req, { name: 'TestError' });
      expect(errorMessage.code).to.equal(12345);
      expect(errorMessage.msg).to.have.string('Test1');
    });

    it('with matching error and but no code', () => {
      const errorMessage = reqUtils.handleCustomErrors(req, { name: 'OtherTestError' });
      expect(errorMessage.code).to.equal(98765);
      expect(errorMessage.msg).to.have.string('Other');
    });

    it('with Error class', () => {
      const errorMessage = reqUtils.handleCustomErrors(req, new Error('Error object'));
      expect(errorMessage.code).to.equal(500001);
      expect(errorMessage.msg).to.have.string('Error');
    });
  });

  describe('handleRequestSync', () => {
    it('normal function', (done) => {
      req.hasData = false;
      req.hasError = false;
      req.respCode = null;
      req.locals = null;
      req.authContext = { super: true };
      reqUtils.handleRequestSync(
        {
          params: __.omit(reqParams, ['badValidation', 'badDefaultValidation', 'missingRequiredVar']),
          authContext: { super: true }
        },
        (locals, _req, _res_, _next) => {
          expect(!__.isNil(_req.locals)).to.equal(true);
          expect(!__.isNil(locals)).to.equal(true);
          done();
        },
        req, {}, () => { }
      );
    });

    it('with thrown error', (done) => {
      req.hasData = false;
      req.hasError = false;
      req.respCode = null;
      req.locals = null;
      req.authContext = { super: true };
      reqUtils.handleRequestSync(
        {
          params: __.omit(reqParams, ['badValidation', 'badDefaultValidation', 'missingRequiredVar']),
          authContext: { super: true }
        },
        () => {
          throw new Error('This is an error');
        },
        req, {},
        () => {
          expect(req.respCode).to.equal(500001);
          done();
        }
      );
    });

    it('with incorrect auth context', (done) => {
      reqUtils.options.checkPermissions = ((_req) => { return false; });
      req.hasData = false;
      req.hasError = false;
      req.respCode = null;
      req.locals = null;
      req.authContext = { super: false };
      reqUtils.handleRequestSync(
        {
          params: __.omit(reqParams, ['badValidation', 'badDefaultValidation', 'missingRequiredVar']),
          authContext: { super: true }
        },
        () => { },
        req, {}, 
        (err) => {
          if (err) {
            expect(req.respCode).to.equal(403000);
          }
          done();
        }
      );
    });

    it('with incorrect protocol security (requires HTTPS)', (done) => {
      reqUtils.options.checkPermissions = ((_req) => { return false; });
      req.hasData = false;
      req.hasError = false;
      req.respCode = null;
      req.locals = null;
      req.authContext = { super: true };
      req.secure = false;
      reqUtils.handleRequestSync(
        {
          params: __.omit(reqParams, ['badValidation', 'badDefaultValidation', 'missingRequiredVar']),
          authContext: { super: true },
          forceTls: true
        },
        () => { },
        req, {},
        (err) => {
          if (err) {
            expect(req.respCode).to.equal(403001);
          }
          done();
        }
      );
    });

    it('with no permissions', (done) => {
      reqUtils.options.checkPermissions = ((_req) => { return false; });
      req.hasData = false;
      req.hasError = false;
      req.respCode = null;
      req.locals = null;
      req.authContext = { super: true };
      reqUtils.handleRequestSync(
        {
          params: __.omit(reqParams, ['badValidation', 'badDefaultValidation', 'missingRequiredVar']),
          authContext: { super: true }
        },
        () => { },
        req, {},
        (err) => {
          if (err) {
            expect(req.respCode).to.equal(403000);
          }
          done();
        }
      );
    });

    it('with invalid parameters', (done) => {
      reqUtils.options.checkPermissions = ((_req) => { return true; });
      req.hasData = false;
      req.hasError = false;
      req.respCode = null;
      req.locals = null;
      req.authContext = { super: true };
      reqUtils.handleRequestSync(
        {
          params: __.omit(reqParams, ['badDefaultValidation', 'missingRequiredVar']),
          authContext: { super: true }
        },
        () => { },
        req, {},
        (err) => {
          if (err) {
            expect(req.respCode).to.equal(400002);
          }
          done();
        }
      );
    });

    it('with missing required', (done) => {
      req.hasData = false;
      req.hasError = false;
      req.respCode = null;
      req.locals = null;
      req.authContext = { super: true };
      reqUtils.handleRequestSync(
        {
          params: __.omit(reqParams, ['badValidation', 'badDefaultValidation']),
          authContext: { super: true }
        },
        () => { },
        req, {},
        (err) => {
          if (err) {
            expect(req.respCode).to.equal(400001);
          }
          done();
        }
      );
    });
  });

  describe('handleRequest', () => {
    it('normal function', (done) => {
      req.hasData = false;
      req.hasError = false;
      req.respCode = null;
      req.locals = null;
      req.authContext = { super: true };
      reqUtils.handleRequest(
        {
          params: __.omit(reqParams, ['badValidation', 'badDefaultValidation', 'missingRequiredVar']),
          authContext: { super: true }
        },
        () => { },
        req, {},
        (_req) => {
          expect(!__.isNil(_req.locals)).to.equal(true);
        }
      )
        .then(() => { done(); })
        .catch((err) => { done(err); });
    });

    it('with thrown error', (done) => {
      req.hasData = false;
      req.hasError = false;
      req.respCode = null;
      req.locals = null;
      req.authContext = { super: true };
      reqUtils.handleRequest(
        {
          params: __.omit(reqParams, ['badValidation', 'badDefaultValidation', 'missingRequiredVar']),
          authContext: { super: true }
        },      
        () => {
          throw new Error('This is an error');
        },
        req, {},
        () => {
          expect(req.respCode).to.equal(500001);
        }
      )
        .then(() => { done(); })
        .catch((err) => { done(err); });
    });

    it('with missing required', (done) => {
      req.hasData = false;
      req.hasError = false;
      req.respCode = null;
      req.locals = null;
      req.authContext = { super: true };
      reqUtils.handleRequest(
        {
          params: __.omit(reqParams, ['badValidation', 'badDefaultValidation']),
          authContext: { super: true }
        },
        () => { },
        req, {},
        () => { }
      )
        .then(() => {})
        .catch(() => {
          expect(req.respCode).to.equal(400001);
          done();
        });
    });

    // it('handleRequestSync with multiple invalid parameters', (done) => {
    //   reqUtils.options.checkPermissions = ((_req) => { return true; });
    //   req.hasData = false;
    //   req.hasError = false;
    //   req.respCode = null;
    //   req.locals = null;
    //   req.authContext = { super: true };
    //   reqParams.missingRequiredVar2 = { type: 'string', required: true, source: ['body'] }
    //   reqUtils.handleRequest(
    //     {
    //       params: __.omit(reqParams, ['badDefaultValidation', 'missingRequiredVar']),
    //       authContext: { super: true }
    //     },
    //     () => { },
    //     (err) => {
    //       if (err) {
    //         expect(req.respCode).to.equal(400001);
    //       }
    //       done();
    //     }
    //   );
    // });

  });
});
