const defaults = {
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

module.exports = defaults;