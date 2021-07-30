declare module '@outofsync/request-utils'

import Localize from '@outofsync/localize';

type ErrorOrUndef = Error | undefined;

type RequestUtilsAuthContext = {
  [key: string]: boolean;
}

interface RequestUtilsOptions {
  checkPermission?: function;
  customErrorResponseCodes?: any;
  customResponsMessageKeys?: any;
  defaultAuthContext?: RequestUtilsAuthContext;
  defaultLang?: string;
  i18n?: Localize;
};

interface RequestUtilsRequiredParamsMap {
  required: any;
  options: any;
}

interface RequestUtilsResponseMessage {
  summary: string;
  message: string;
}

interface RequestUtilsHandledError {
  msg: string;
  code: string;
  stack?: string;
}

interface RequestUtilsDataFieldOptions {
  type: string;
  required: boolean;
  source: array<string>;
}

type RequestUtilsDataHandlerParams = {
  [key: string]: RequestUtilsDataFieldOptions;
}

interface RequestUtilsHandleRequestOptions {
  params: RequestUtilsDataHandlerParams;
  security: any;
  secure?: boolean;
}

declare class RequestUtils {
  constructor(req: http.ClientRequest, options?: RequestUtilsOptions);
  setSkipAuth(value: any, req?: http.ClientRequest): void;
  skipAuth(req?: http.ClientRequest): void;
  setTimedout(req?: http.ClientRequest): void;
  setError(code: number, req?: http.ClientRequest): void;
  setData(data: any, req?: http.ClientRequest): void;
  hasResponse(req?: http.ClientRequest): void;
  setAuthContext(authContext: RequestUtilsAuthContext, req?: http.ClientRequest): void;
  updateAuthContext(authContext: RequestUtilsAuthContext, req?: http.ClientRequest): void;
  checkAuthContext(options?: RequestUtilsAuthContext, req?: http.ClientRequest): void;
  checkPermissions(req?: http.ClientRequest): void;
  retrieveParams(params: any, req?: http.ClientRequest): void;
  compileRequiredParams(params?: any): RequestUtilsRequiredParamsMap;
  hasRequiredParams(params: any): array<any>;
  handleDefaults(params: any, req?: http.ClientRequest): void;
  validateParams(params: any): array<any>;
  getResponseMessage(code: string | number, lang?: string, customMessageKeys?: any): RequestUtilsResponseMessage;
  handleCustomerErrors(err: Error | string, customCodes?: any, customMessageKeys?: any): RequestUtilsHandledError;
  handleRequest(handlerOptions: RequestUtilsHandleRequestOptions, closure: function, next: function, res: http.ServerResponse, req?: http.ClientRequest): ErrorOrUndef;
  handleRequestAsync(handlerOptions: RequestUtilsHandleRequestOptions, closure: function, next: function, res: http.ServerResponse, req?: http.ClientRequest): ErrorOrUndef;
};

declare const obj: RequestUtils;
export default obj;