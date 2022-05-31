declare module '@outofsync/request-utils'

import {
  ClientRequest,
  ServerResponse,
} from 'http';
import Localize from '@outofsync/localize';

type ClosureFn = (...params: any) => void;
type ExpressHandlerFn = (locals: any, req: ClientRequest, res: ServerResponse, next: ClosureFn) => void;
type ReqUtilsCheckPermissionsFn = (req: ClientRequest) => boolean;
type ErrorOrUndef = Error | undefined;

type RequestUtilsAuthContext = {
  [key: string]: boolean;
}

interface RequestUtilsOptions {
  checkPermission?: ReqUtilsCheckPermissionsFn;
  customErrorResponseCodes?: any;
  customResponsMessageKeys?: any;
  defaultAuthContext?: RequestUtilsAuthContext;
  defaultLang?: string;
  i18n?: typeof Localize;
}

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
  source: string[];
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
  constructor(req: ClientRequest, options?: RequestUtilsOptions);
  setSkipAuth(value: any, req?: ClientRequest): void;
  skipAuth(req?: ClientRequest): void;
  setTimedout(req?: ClientRequest): void;
  setError(code: number, req?: ClientRequest): void;
  setData(data: any, req?: ClientRequest): void;
  hasResponse(req?: ClientRequest): void;
  setAuthContext(authContext: RequestUtilsAuthContext, req?: ClientRequest): void;
  updateAuthContext(authContext: RequestUtilsAuthContext, req?: ClientRequest): void;
  checkAuthContext(options?: RequestUtilsAuthContext, req?: ClientRequest): void;
  checkPermissions(req?: ClientRequest): void;
  retrieveParams(params: any, req?: ClientRequest): void;
  compileRequiredParams(params?: any): RequestUtilsRequiredParamsMap;
  hasRequiredParams(params: any): Array<any>;
  handleDefaults(params: any, req?: ClientRequest): void;
  validateParams(params: any): Array<any>;
  getResponseMessage(code: string | number, lang?: string, customMessageKeys?: any): RequestUtilsResponseMessage;
  handleCustomerErrors(err: Error | string, customCodes?: any, customMessageKeys?: any): RequestUtilsHandledError;
  handleRequest(handlerOptions: RequestUtilsHandleRequestOptions, closure: ExpressHandlerFn, next: ClosureFn, res: ServerResponse, req?: ClientRequest): ErrorOrUndef;
  handleRequestAsync(handlerOptions: RequestUtilsHandleRequestOptions, closure: ExpressHandlerFn, next: ClosureFn, res: ServerResponse, req?: ClientRequest): ErrorOrUndef;
}

declare const obj: RequestUtils;
export default obj;