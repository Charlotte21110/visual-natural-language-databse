/**
 * 请求层统一入口
 *
 * 对应 dev-platform: src/framework/request/request.ts
 */
export {
  capiRequest,
  tcbCapiRequest,
  lowcodeCapiRequest,
  scfCapiRequest,
  flexdbCapiRequest,
  camCapiRequest,
  accountCapiRequest,
  setQcloudToken,
  getQcloudToken,
  ApiCallError,
  type ICapiRequestParams,
  type ICapiRequestOpts,
} from './capi-request';

export {
  lcapRequest,
  type IMethod,
  type ILcapRequestOpts,
} from './lcap-request';
