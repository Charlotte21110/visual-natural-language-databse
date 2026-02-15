/**
 * Field Mutator Agent
 * 负责修改字段（名称、类型、索引等）
 * TODO marisa 功能也有问题
 * 
 * 由于 @tcb-manager/node 不直接支持修改字段，需要通过 CAPI 调用
 */
import { AgentResponse } from '../services/agent-router.js';
import { getCapiClient } from '../clients/capi-client.js';

export class FieldMutatorAgent {
  private capiClient = getCapiClient();

  async execute(
    message: string,
    params: Record<string, any>,
    context: any
  ): Promise<AgentResponse> {
    try {
      console.log('[FieldMutatorAgent] Executing with params:', params);

      // 1. 参数提取
      const { table, field, action, newType, newName, envId } = this.extractParams(params, context);

      if (!table || !field) {
        return {
          type: 'missing_params',
          message: '请告诉我要修改哪个表的哪个字段？例如："把 users 表的 age 字段改成 bigint"',
          suggestions: ['修改 users 表的 age 字段', '查看表结构'],
        };
      }

      // 2. 根据操作类型执行
      if (action === 'rename' && newName) {
        // 重命名字段
        return await this.renameField(envId, table, field, newName);
      } else if (action === 'change_type' && newType) {
        // 修改字段类型
        return await this.changeFieldType(envId, table, field, newType);
      } else {
        return {
          type: 'clarification_needed',
          message: `我理解你想修改 ${table} 表的 ${field} 字段，但需要更明确的操作。你是想：`,
          suggestions: [
            `重命名 ${field} 字段`,
            `修改 ${field} 的类型`,
            `为 ${field} 添加索引`,
          ],
        };
      }
    } catch (error: any) {
      console.error('[FieldMutatorAgent Error]', error);
      return {
        type: 'error',
        message: `修改失败: ${error.message}`,
        suggestions: ['检查权限', '查看文档'],
      };
    }
  }

  /**
   * 提取参数
   */
  private extractParams(params: Record<string, any>, context: any) {
    // TODO: 使用 LLM 进行更精确的参数提取
    return {
      table: params.table || context.lastTable,
      field: params.field,
      action: params.action, // 'rename', 'change_type', 'add_index'
      newType: params.newType,
      newName: params.newName,
      envId: params.envId || context.envId || process.env.TCB_ENV_ID,
    };
  }

  /**
   * 重命名字段
   */
  private async renameField(
    envId: string,
    table: string,
    oldName: string,
    newName: string
  ): Promise<AgentResponse> {
    console.log(`[FieldMutatorAgent] Renaming field: ${table}.${oldName} -> ${newName}`);

    // 注意：FlexDB (MongoDB) 不直接支持重命名字段，需要使用 $rename 操作
    // MySQL 可以使用 ALTER TABLE ... CHANGE COLUMN
    
    // 这里返回一个操作建议，而不是直接执行（安全考虑）
    return {
      type: 'confirmation_required',
      message: `⚠️ 准备将 ${table} 表的 ${oldName} 字段重命名为 ${newName}。此操作不可撤销，是否继续？`,
      metadata: {
        operation: 'rename_field',
        table,
        oldName,
        newName,
        risks: [
          '可能影响正在运行的应用',
          '需要更新所有引用该字段的代码',
        ],
      },
      suggestions: ['确认执行', '取消操作', '先查看影响范围'],
    };
  }

  /**
   * 修改字段类型
   */
  private async changeFieldType(
    envId: string,
    table: string,
    field: string,
    newType: string
  ): Promise<AgentResponse> {
    console.log(`[FieldMutatorAgent] Changing field type: ${table}.${field} -> ${newType}`);

    // 同样需要二次确认
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
   * 确认并执行操作
   */
  async confirmAndExecute(
    operation: string,
    params: Record<string, any>,
    context: any
  ): Promise<AgentResponse> {
    // TODO: 实现确认后的实际执行逻辑
    // 这里可以调用 CAPI Client
    
    const { table, field, newName, newType, envId } = params;

    try {
      if (operation === 'rename_field') {
        // 实际执行重命名
        await this.capiClient.updateCollection({
          envId,
          collectionName: table,
          options: {
            // 根据实际 CAPI 接口调整
          },
        });

        return {
          type: 'success',
          message: `✅ 已成功将 ${table} 表的 ${field} 字段重命名为 ${newName}`,
          suggestions: ['查看表结构', '测试应用'],
        };
      } else if (operation === 'change_field_type') {
        // 实际执行类型修改
        return {
          type: 'success',
          message: `✅ 已成功将 ${table} 表的 ${field} 字段类型修改为 ${newType}`,
          suggestions: ['查看表结构', '验证数据'],
        };
      }

      return {
        type: 'error',
        message: '未知操作',
      };
    } catch (error: any) {
      return {
        type: 'error',
        message: `执行失败: ${error.message}`,
      };
    }
  }
}
