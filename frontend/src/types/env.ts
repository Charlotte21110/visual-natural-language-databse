/**
 * 环境相关类型定义
 */

export interface EnvDatabase {
  InstanceId: string;
  Status: string;
  Region: string;
  UpdateTime: string;
}

export interface EnvStorage {
  Region: string;
  Bucket: string;
  CdnDomain: string;
  AppId: string;
  CustomDomain: string;
  DomainType: string;
}

export interface EnvFunction {
  Namespace: string;
  Region: string;
}

export interface EnvStaticStorage {
  StaticDomain: string;
  DefaultDirName: string;
  Status: string;
  Region: string;
  Bucket: string;
  EnvId: string;
  DomainType: string;
}

export interface EnvPreference {
  Key: string;
  Value: string;
}

export interface EnvInfo {
  EnvId: string;
  Source: string;
  Alias: string;
  CreateTime: string;
  UpdateTime: string;
  Status: string;
  Databases: EnvDatabase[];
  Storages: EnvStorage[];
  Functions: EnvFunction[];
  PackageId: string;
  PackageName: string;
  LogServices: any[];
  StaticStorages: EnvStaticStorage[];
  IsAutoDegrade: boolean;
  EnvChannel: string;
  PayMode: string;
  IsDefault: boolean;
  Region: string;
  Tags: any[];
  CustomLogServices: any[];
  EnvType: string;
  PackageType: string;
  IsDauPackage: boolean;
  EnvStatus: string;
  EnvPreferences: EnvPreference[];
}

export interface DescribeEnvsResult {
  EnvList: EnvInfo[];
  RequestId: string;
  Total: number;
}

export interface DescribeEnvsResponse {
  code: string;
  result: DescribeEnvsResult;
  reqId: string;
}
