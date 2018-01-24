// test/index.js

// Dependancies
const __ = require('@mediaxpost/lodashext');
const chai = require('chai');
const expect = chai.expect;
const ReqUtils = require('../');

const req = {
  hasData: false,
  params: { paramVar: 1234, resetValue: -2, badValidation: 'abcd' },
  body: { bodyVar: '1234', multiVar: 'abcd' },
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

let reqUtils;

describe('Request Utilities', () => {
  let sepParams;
  before((done) => {
    reqUtils = new ReqUtils(req);
    done();
  });

  it('constructor', () => {
    expect(reqUtils).to.be.instanceof(ReqUtils);
  });
  it('setError', () => {
    reqUtils.setError(12345);
    expect(req.hasError).to.equal(true);
    expect(req.respCode).to.equal(12345);
    req.hasError = false;
    req.respCode = null;
  });
  it('setData', () => {
    reqUtils.setData({ message: 'OK' });
    expect(req.hasData).to.equal(true);
    expect(req.data.message).to.equal('OK');
    req.data = null;
  });
  it('hasResponse', () => {
    expect(reqUtils.hasResponse()).to.equal(true);
  });
  it('skipAuth', () => {
    req.skipAuth = true;
    expect(reqUtils.skipAuth()).to.equal(true);
    req.skipAuth = false;
    expect(reqUtils.skipAuth()).to.equal(false);
  })
  it('setAuthContext', () => {
    reqUtils.setAuthContext({ super: false, signed: false, server: false, client: false });
    expect(req.securityContext).to.exist;
    expect(req.securityContext.super).to.equal(false);
    expect(req.securityContext.signed).to.equal(false);
    expect(req.securityContext.server).to.equal(false);
    expect(req.securityContext.client).to.equal(false);
  });
  it('updateAuthContext', () => {
    reqUtils.updateAuthContext({ super: true });
    expect(req.securityContext).to.exist;
    expect(req.securityContext.super).to.equal(true);
  });
  it('checkAuthContext', () => {
    reqUtils.setAuthContext({ super: false, signed: false, server: false, client: false });
    expect(reqUtils.checkAuthContext({ super: true })).to.equal(false);
    expect(reqUtils.checkAuthContext({ signed: true })).to.equal(false);
    expect(reqUtils.checkAuthContext({ server: true })).to.equal(false);
    expect(reqUtils.checkAuthContext({ client: true })).to.equal(false);
    reqUtils.updateAuthContext({ client: true });
    expect(reqUtils.checkAuthContext({ super: true })).to.equal(false);
    expect(reqUtils.checkAuthContext({ signed: true })).to.equal(false);
    expect(reqUtils.checkAuthContext({ server: true })).to.equal(false);
    expect(reqUtils.checkAuthContext({ client: true })).to.equal(true);
    reqUtils.updateAuthContext({ server: true, client: false });
    expect(reqUtils.checkAuthContext({ super: true })).to.equal(false);
    expect(reqUtils.checkAuthContext({ signed: true })).to.equal(false);
    expect(reqUtils.checkAuthContext({ server: true })).to.equal(true);
    expect(reqUtils.checkAuthContext({ client: true })).to.equal(false);
    reqUtils.updateAuthContext({ signed: true, server: false });
    expect(reqUtils.checkAuthContext({ super: true })).to.equal(false);
    expect(reqUtils.checkAuthContext({ signed: true })).to.equal(true);
    expect(reqUtils.checkAuthContext({ server: true })).to.equal(false);
    expect(reqUtils.checkAuthContext({ client: true })).to.equal(false);
    reqUtils.updateAuthContext({ super: true, signed: false });
    expect(reqUtils.checkAuthContext({ super: true })).to.equal(true);
    expect(reqUtils.checkAuthContext({ signed: true })).to.equal(false);
    expect(reqUtils.checkAuthContext({ server: true })).to.equal(false);
    expect(reqUtils.checkAuthContext({ client: true })).to.equal(false);
  });
  it('checkPermissions', () => {
    expect(reqUtils.checkPermissions()).to.equal(true);
    req.locals = {};
  });
  it('retrieveParams', () => {
    reqUtils.retrieveParams(reqParams);
    // This should move all the values to the req.locals
    expect(__.hasValue(req.locals)).to.equal(true);
    expect(__.hasValue(req.handler)).to.equal(true);
  });
  it('checking value retrieval from params', () => {
    expect(__.hasValue(req.locals.paramVar)).to.equal(true);
    expect(req.locals.paramVar).to.equal(1234);
  });
  it('checking value retrieval from body', () => {
    expect(__.hasValue(req.locals.bodyVar)).to.equal(true);
    expect(req.locals.bodyVar).to.equal('1234');
  });
  it('checking value retrieval from header', () => {
    expect(__.hasValue(req.locals.headerVar)).to.equal(true);
    expect(req.locals.headerVar).to.equal('1234');
  });
  it('checking value retrieval from query', () => {
    expect(__.hasValue(req.locals.queryVar)).to.equal(true);
    expect(req.locals.queryVar).to.equal('1234');
  });
  it('checking value retrieval priority where variable can come from multiple sources', () => {
    expect(__.hasValue(req.locals.multiVar)).to.equal(true);
    expect(req.locals.multiVar).to.equal('abcd');
  });
  it('checking that value that is not in the correct source is not retrieved', () => {
    expect(__.hasValue(req.locals.wrongSrcVar)).to.not.equal(true);
  });
  it('checking that missing value is not retrieved', () => {
    expect(__.hasValue(req.locals.missingRequiredVar)).to.not.equal(true);
  });
  it('compileRequiredParams', () => {
    sepParams = reqUtils.compileRequiredParams(req.handler);
    expect(__.hasValue(sepParams)).to.equal(true);
    expect(__.hasValue(sepParams.required)).to.equal(true);
    expect(__.hasValue(sepParams.optional)).to.equal(true);
  });
  it('hasRequiredParams', () => {
    const required = reqUtils.hasRequiredParams(sepParams.required);
    expect(required.length === 1); // There should be 1 missing parameter
  });
  it('handleDefaults', () => {
    reqUtils.handleDefaults(sepParams.optional);
    expect(__.hasValue(req.locals.resetValue)).to.equal(true);
    expect(req.locals.resetValue).to.equal(1);
    expect(__.hasValue(req.locals.defaultVar)).to.equal(true);
    expect(req.locals.defaultVar).to.equal('qwerty');
    expect(__.hasValue(req.locals.badDefaultValidation)).to.equal(true);
    expect(req.locals.badDefaultValidation).to.equal('default');
  });
  it('validateParams', () => {
    const invalidParams = reqUtils.validateParams(req.handler);
    expect(invalidParams.length).is.above(0);
    // There should be at least 1 missing parameter
    expect(invalidParams.find((elem) => {
      return elem.key === 'badDefaultValidation';
    })).to.exist;  // This should return true as badDefaultValidation should exist
  });
  it('handleRequest', (done) => {
    req.hasData = false;
    req.securityContext.super = true;
    reqUtils.handleRequest(
      {
        params: __.omit(reqParams, ['badValidation', 'badDefaultValidation', 'missingRequiredVar']),
        security: { super: true }
      },
      (_req) => {
        expect(__.hasValue(_req.locals)).to.equal(true);
      },
      done
    );
    done();
  });
  it('handleRequest with thrown error', (done) => {
    req.hasData = false;
    req.securityContext.super = true;
    reqUtils.handleRequest(
      {
        params: __.omit(reqParams, ['badValidation', 'badDefaultValidation', 'missingRequiredVar']),
        security: { super: true }
      },
      () => {
        throw new Error('This is an error');
      },
      () => {
        expect(req.respCode).to.equal(500001);
      }
    );
    done();
  });
  it('handleRequestAsync', (done) => {
    req.hasData = false;
    req.securityContext.super = true;
    reqUtils.handleRequestAsync(
      {
        params: __.omit(reqParams, ['badValidation', 'badDefaultValidation', 'missingRequiredVar']),
        security: { super: true }
      },
      (_req) => {
        expect(__.hasValue(_req.locals)).to.equal(true);
      }
    )
    .then(() => { done(); })
    .catch(() => { done(); });
  });
  it('handleRequestAsync with thrown error', (done) => {
    req.hasData = false;
    req.securityContext.super = true;
    reqUtils.handleRequestAsync(
      {
        params: __.omit(reqParams, ['badValidation', 'badDefaultValidation', 'missingRequiredVar']),
        security: { super: true }
      },
      () => {
        throw new Error('This is an error');
      },
      () => {
        expect(req.respCode).to.equal(500001);
      }
    )
    .then(() => { done(); })
    .catch(() => {
      expect(req.respCode).to.equal(500001);
      done();
    });
  });

  it('handleRequest with no permissions', (done) => {
    reqUtils.options.checkPermissions = ((req) => { return false; });
    req.hasData = false;
    req.securityContext.super = true;
    reqUtils.handleRequest(
      {
        params: __.omit(reqParams, ['badValidation', 'badDefaultValidation', 'missingRequiredVar']),
        security: { super: true }
      },
      () => { },
      done
    );
    expect(req.respCode).to.equal(403000);
    done();
  });
});
