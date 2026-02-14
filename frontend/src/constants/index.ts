/**
 * 域名配置
 *
 * 和 dev-platform 保持一致
 */
export const EDomain = {
  /** Weda API 域名（国内站） */
  WEDA_API_DOMAIN: 'weda-api.cloud.tencent.com',

  /** Weda API 域名（国际站） */
  WEDA_API_DOMAIN_INTL: 'weda-api.tencentcloud.com',

  /** TCB API 域名（国内站） */
  TCB_API_DOMAIN: 'tcb-api.cloud.tencent.com',

  /** TCB API 域名（国际站） */
  TCB_API_DOMAIN_INTL: 'tcb-api.tencentcloud.com',

  /** LCAP 域名（国内站） */
  LCAP_DOMAIN: 'lcap.cloud.tencent.com',

  /** LCAP 域名（国际站） */
  LCAP_DOMAIN_INTL: 'lcap.tcb.tencentcloud.com',
} as const;

/**
 * CAPI 服务类型枚举
 *
 * 与 dev-platform 的 ECapiServiceType 完全一致
 */
export enum ECapiServiceType {
  LOWCODE = 'lowcode',
  TCB = 'tcb',
  VPC = 'vpc',
  SCF = 'scf',
  ACCOUNT = 'account',
  FLEXDB = 'flexdb',
  CDN = 'cdn',
  STS = 'sts',
  BILLING = 'billing',
  CAM = 'cam',
  CDB = 'cdb',
  CLS = 'cls',
  CYNOSDB = 'cynosdb',
  MONGODB = 'mongodb',
  TCBR = 'tcbr',
  TCR = 'tcr',
  SSL = 'ssl',
  TKE = 'tke',
  CVM = 'cvm',
  CLB = 'clb',
  LIGHTHOUSE = 'lighthouse',
  WEBIFY = 'webify',
  CONSOLE = 'console',
  BPAAS = 'bpaas',
  AGS = 'ags',
  TDAI = 'tdai',
}

/**
 * 服务类型与版本号的映射
 */
export const CAPI_SERVICE_VERSION: Record<string, string> = {
  [ECapiServiceType.LOWCODE]: '2021-01-08',
  [ECapiServiceType.TCB]: '2018-06-08',
  [ECapiServiceType.VPC]: '2017-03-12',
  [ECapiServiceType.SCF]: '2018-04-16',
  [ECapiServiceType.ACCOUNT]: '2018-12-25',
  [ECapiServiceType.FLEXDB]: '2018-11-27',
  [ECapiServiceType.CDN]: '2018-06-06',
  [ECapiServiceType.STS]: '2018-08-13',
  [ECapiServiceType.BILLING]: '2018-07-09',
  [ECapiServiceType.CAM]: '2019-01-16',
  [ECapiServiceType.CDB]: '2017-03-20',
  [ECapiServiceType.CLS]: '2020-10-16',
  [ECapiServiceType.CYNOSDB]: '2019-01-07',
  [ECapiServiceType.MONGODB]: '2019-07-25',
  [ECapiServiceType.TCBR]: '2022-02-17',
  [ECapiServiceType.TCR]: '2019-09-24',
  [ECapiServiceType.SSL]: '2019-12-05',
  [ECapiServiceType.TKE]: '2018-05-25',
  [ECapiServiceType.CVM]: '2017-03-12',
  [ECapiServiceType.CLB]: '2023-04-17',
  [ECapiServiceType.LIGHTHOUSE]: '2020-03-24',
  [ECapiServiceType.WEBIFY]: '2021-05-10',
  [ECapiServiceType.CONSOLE]: '2022-02-15',
  [ECapiServiceType.BPAAS]: '2018-12-17',
};
