/**
 * Intent Types
 * 意图类型定义（独立文件，避免循环依赖）
 */

/**
 * 意图类型枚举
 */
export enum IntentType {
  QUERY_DATABASE = 'QUERY_DATABASE',           // 查询数据库
  MODIFY_FIELD = 'MODIFY_FIELD',               // 修改字段
  CREATE_COLLECTION = 'CREATE_COLLECTION',     // 创建集合/表
  DELETE_COLLECTION = 'DELETE_COLLECTION',     // 删除集合/表
  ANALYZE_DATA = 'ANALYZE_DATA',               // 分析数据
  DOC_QUESTION = 'DOC_QUESTION',               // 文档问答
  GENERAL_CHAT = 'GENERAL_CHAT',               // 普通对话
}

/**
 * 意图分类结果
 */
export interface IntentResult {
  type: IntentType;
  confidence: number;
  params: {
    dbType?: 'flexdb' | 'mysql' | 'mongodb';
    table?: string;
    database?: string;
    envId?: string;
    action?: 'add_field' | 'rename' | 'change_type' | 'delete_field';
    field?: string;
    newName?: string;
    newType?: string;
    defaultValue?: any;
    fieldType?: string;
    [key: string]: any;
  };
}
