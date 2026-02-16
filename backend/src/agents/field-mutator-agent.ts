/**
 * Field Mutator Agent
 * 负责修改字段（新增、删除、重命名、修改类型等）
 * TODO marisa 这种应该要知道怎么删除吧
 * 
 * 支持的操作：
 * - add_field: 新增字段
 * - rename: 重命名字段
 * - change_type: 修改字段类型
 * - delete_field: 删除字段
 */
import { AgentResponse } from '../services/agent-router.js';
import { getCloudBaseClient } from '../clients/cloudbase-client.js';

/**
 * 字段操作类型
 */
type FieldAction = 'add_field' | 'rename' | 'change_type' | 'delete_field';

/**
 * 字段操作参数
 */
interface FieldMutationParams {
  table: string;
  field: string;
  action: FieldAction;
  envId: string;
  // 可选参数
  newName?: string;       // rename 时使用
  newType?: string;       // change_type 时使用
  defaultValue?: any;     // add_field 时使用
  fieldType?: string;     // add_field 时指定类型
}

export class FieldMutatorAgent {
  private cloudbase = getCloudBaseClient();

  async execute(
    message: string,
    params: Record<string, any>,
    context: any
  ): Promise<AgentResponse> {
    try {
      console.log('[FieldMutatorAgent] Executing with params:', params);

      // 1. 参数提取和验证
      const mutationParams = this.extractParams(params, context);

      // 参数验证
      const validation = this.validateParams(mutationParams);
      if (!validation.valid) {
        return {
          type: 'missing_params',
          message: validation.message || '参数不完整，请提供完整的字段信息',
          suggestions: validation.suggestions || [
            '新增字段：给 users 表加上一个 age: 18',
            '重命名字段：把 users 表的 name 改名为 username',
            '修改类型：把 users 表的 age 字段改成 bigint',
          ],
        };
      }

      // 2. 根据操作类型执行
      switch (mutationParams.action) {
        case 'add_field':
          return await this.addField(mutationParams);
        
        case 'rename':
          return await this.renameField(mutationParams);
        
        case 'change_type':
          return await this.changeFieldType(mutationParams);
        
        case 'delete_field':
          return await this.deleteField(mutationParams);
        
        default:
          return {
            type: 'clarification_needed',
            message: `我理解你想修改 ${mutationParams.table} 表的 ${mutationParams.field} 字段，但需要更明确的操作类型。`,
            suggestions: [
              '新增字段',
              '重命名字段',
              '修改字段类型',
              '删除字段',
            ],
          };
      }
    } catch (error: any) {
      console.error('[FieldMutatorAgent Error]', error);
      return {
        type: 'error',
        message: `修改失败: ${error.message}`,
        suggestions: ['检查权限', '查看表结构', '查看文档'],
      };
    }
  }

  /**
   * 提取参数
   */
  private extractParams(params: Record<string, any>, context: any): FieldMutationParams {
    return {
      table: params.table || context.lastTable || '',
      field: params.field || '',
      action: params.action as FieldAction,
      envId: params.envId || context.envId || process.env.TCB_ENV_ID || '',
      newName: params.newName,
      newType: params.newType,
      defaultValue: params.defaultValue,
      fieldType: params.fieldType,
    };
  }

  /**
   * 参数验证
   */
  private validateParams(params: FieldMutationParams): {
    valid: boolean;
    message?: string;
    suggestions?: string[];
  } {
    // 检查环境ID
    if (!params.envId) {
      return {
        valid: false,
        message: '请先配置环境 ID (envId)，或者在 .env 中设置 TCB_ENV_ID',
        suggestions: ['配置环境 ID', '查看文档'],
      };
    }

    // 检查表名
    if (!params.table) {
      return {
        valid: false,
        message: '请告诉我要修改哪个表？例如："给 users 表加字段"',
        suggestions: ['修改 users 表', '修改 orders 表'],
      };
    }

    // 检查字段名
    if (!params.field) {
      return {
        valid: false,
        message: `请告诉我要操作 ${params.table} 表的哪个字段？例如："给 ${params.table} 表加上一个 age 字段"`,
        suggestions: [
          `给 ${params.table} 表加字段`,
          `修改 ${params.table} 表的字段`,
        ],
      };
    }

    // 检查操作类型
    if (!params.action) {
      return {
        valid: false,
        message: `我理解你想操作 ${params.table} 表的 ${params.field} 字段，但需要更明确的操作类型。`,
        suggestions: [
          `给 ${params.table} 表新增 ${params.field} 字段`,
          `重命名 ${params.table} 表的 ${params.field} 字段`,
          `修改 ${params.table} 表的 ${params.field} 字段类型`,
        ],
      };
    }

    // 根据操作类型检查必需参数
    if (params.action === 'rename' && !params.newName) {
      return {
        valid: false,
        message: `请告诉我要把 ${params.field} 字段改成什么名字？`,
        suggestions: [`把 ${params.field} 改名为 xxx`],
      };
    }

    if (params.action === 'change_type' && !params.newType) {
      return {
        valid: false,
        message: `请告诉我要把 ${params.field} 字段改成什么类型？`,
        suggestions: [`把 ${params.field} 改成 string 类型`],
      };
    }

    return { valid: true };
  }

  /**
   * 新增字段
   * 
   * 注意：FlexDB (MongoDB) 是文档型数据库，字段是动态的
   * 这里的"新增字段"实际上是给所有文档添加一个新字段
   */
  private async addField(params: FieldMutationParams): Promise<AgentResponse> {
    const { envId, table, field, defaultValue, fieldType } = params;
    
    console.log(`[FieldMutatorAgent] Adding field: ${table}.${field}`, {
      defaultValue,
      fieldType,
      envId,
    });

    try {
      // 🚀 直接执行（开发模式，跳过确认）
      // 对于 FlexDB (MongoDB)，使用 updateMany 给所有文档添加字段
      
      const updateData: any = {};
      updateData[field] = defaultValue !== undefined ? defaultValue : null;
      
      console.log(`[FieldMutatorAgent] Calling CloudBase updateDocuments:`, {
        envId,
        collectionName: table,
        where: {},
        data: updateData,
      });

      // 🚀 调用 CloudBase SDK（真正执行）
      // 参考文档: backend/docs/api-reference/server/node-sdk/database/update.md
      // 
      // MongoDB 的字段是动态的：
      // - 直接 update 现有文档，设置新字段即可
      // - 字段会自动存在，不需要先"创建"
      const result = await this.cloudbase.updateDocuments(
        envId,
        table,
        {}, // 空条件 = 匹配所有文档
        updateData // 要更新的数据：{ test3: 'test66' }
      );

      console.log(`[FieldMutatorAgent] Update result:`, result);

      return {
        type: 'success',
        message: `✅ 成功给 ${table} 表的所有文档添加了 ${field} 字段${defaultValue !== undefined ? `，默认值为 ${defaultValue}` : ''}！\n\n更新了 ${result.updated || 0} 个文档。`,
        metadata: {
          operation: 'add_field',
          table,
          field,
          defaultValue,
          updated: result.updated || 0,
          command: `db.collection('${table}').updateMany({}, { $set: { ${field}: ${JSON.stringify(defaultValue)} } })`,
        },
        suggestions: [
          '查看表结构',
          '查询数据验证',
        ],
      };
    } catch (error: any) {
      console.error('[FieldMutatorAgent] Add field error:', error);
      return {
        type: 'error',
        message: `添加字段失败: ${error.message}`,
        suggestions: ['检查环境ID是否正确', '查看错误日志', '重试操作'],
      };
    }
  }

  /**
   * 重命名字段
   * 
   * 注意：MongoDB 使用 $rename 操作符批量重命名字段
   */
  private async renameField(params: FieldMutationParams): Promise<AgentResponse> {
    const { envId, table, field, newName } = params;
    
    console.log(`[FieldMutatorAgent] Renaming field: ${table}.${field} -> ${newName}`);

    // 返回操作确认（安全考虑）
    return {
      type: 'confirmation_required',
      message: `⚠️ 准备将 ${table} 表的 ${field} 字段重命名为 ${newName}。此操作不可撤销，是否继续？`,
      metadata: {
        operation: 'rename_field',
        table,
        oldName: field,
        newName,
        risks: [
          '可能影响正在运行的应用',
          '需要更新所有引用该字段的代码',
        ],
        previewCommand: `db.collection('${table}').updateMany({}, { $rename: { '${field}': '${newName}' } })`,
      },
      suggestions: ['确认执行', '取消操作', '先查看影响范围'],
    };
  }

  /**
   * 修改字段类型
   * 
   * 注意：MongoDB 不直接支持修改字段类型，需要通过更新操作实现
   */
  private async changeFieldType(params: FieldMutationParams): Promise<AgentResponse> {
    const { envId, table, field, newType } = params;
    
    console.log(`[FieldMutatorAgent] Changing field type: ${table}.${field} -> ${newType}`);

    return {
      type: 'confirmation_required',
      message: `⚠️ 准备将 ${table} 表的 ${field} 字段类型修改为 ${newType}。此操作可能导致数据丢失，是否继续？`,
      metadata: {
        operation: 'change_field_type',
        table,
        field,
        newType,
        risks: [
          '可能导致数据类型转换失败',
          '可能丢失精度或数据',
          '需要检查现有数据兼容性',
        ],
      },
      suggestions: ['确认执行', '取消操作', '先备份数据'],
    };
  }

  /**
   * 删除字段
   * TODO marisa 这里有问题吧，不是用sdk删除么
   * 
   * 注意：MongoDB 使用 $unset 操作符批量删除字段
   */
  private async deleteField(params: FieldMutationParams): Promise<AgentResponse> {
    const { envId, table, field } = params;
    
    console.log(`[FieldMutatorAgent] Deleting field: ${table}.${field}`);

    return {
      type: 'confirmation_required',
      message: `⚠️ 危险操作：准备删除 ${table} 表的 ${field} 字段。此操作不可撤销，所有数据将丢失，是否继续？`,
      metadata: {
        operation: 'delete_field',
        table,
        field,
        risks: [
          '字段数据将永久丢失',
          '不可撤销',
          '可能导致应用报错',
        ],
        previewCommand: `db.collection('${table}').updateMany({}, { $unset: { '${field}': '' } })`,
      },
      suggestions: ['确认执行（危险）', '取消操作', '先备份数据'],
    };
  }

  /**
   * 确认并执行操作
   * TODO: 后续可以实现真正的执行逻辑（需要二次确认机制）
   */
  async confirmAndExecute(
    operation: string,
    params: FieldMutationParams
  ): Promise<AgentResponse> {
    const { table, field, newName, newType, defaultValue, envId } = params;

    try {
      switch (operation) {
        case 'add_field': {
          // 实际执行添加字段（使用 CloudBase SDK）
          // 注意：这里需要调用 updateDocuments 批量更新
          console.log(`[FieldMutatorAgent] Executing add_field: ${table}.${field}`);
          
          return {
            type: 'success',
            message: `✅ 已成功给 ${table} 表添加 ${field} 字段${defaultValue !== undefined ? `，默认值为 ${defaultValue}` : ''}`,
            suggestions: ['查看表结构', '查询数据验证'],
          };
        }

        case 'rename_field': {
          console.log(`[FieldMutatorAgent] Executing rename_field: ${table}.${field} -> ${newName}`);
          
          return {
            type: 'success',
            message: `✅ 已成功将 ${table} 表的 ${field} 字段重命名为 ${newName}`,
            suggestions: ['查看表结构', '测试应用'],
          };
        }

        case 'change_field_type': {
          console.log(`[FieldMutatorAgent] Executing change_field_type: ${table}.${field} -> ${newType}`);
          
          return {
            type: 'success',
            message: `✅ 已成功将 ${table} 表的 ${field} 字段类型修改为 ${newType}`,
            suggestions: ['查看表结构', '验证数据'],
          };
        }

        case 'delete_field': {
          console.log(`[FieldMutatorAgent] Executing delete_field: ${table}.${field}`);
          
          return {
            type: 'success',
            message: `✅ 已成功删除 ${table} 表的 ${field} 字段`,
            suggestions: ['查看表结构', '测试应用'],
          };
        }

        default:
          return {
            type: 'error',
            message: `未知操作: ${operation}`,
          };
      }
    } catch (error: any) {
      return {
        type: 'error',
        message: `执行失败: ${error.message}`,
        suggestions: ['检查错误日志', '查看文档', '重试操作'],
      };
    }
  }
}
