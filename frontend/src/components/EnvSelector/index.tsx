/**
 * 环境选择器组件
 */
import { useEffect } from 'react';
import { Select } from 'tea-component';
import { useEnvStore } from '../../store/env-store';
import './style.less';

const EnvSelector = () => {
  const {
    envList,
    currentEnv,
    loading,
    error,
    initEnvList,
    switchEnv,
  } = useEnvStore();

  // 初始化环境列表（只执行一次）
  useEffect(() => {
    initEnvList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 处理环境切换
  const handleEnvChange = (value: string) => {
    switchEnv(value);
  };

  // 加载中状态
  if (loading && envList.length === 0) {
    return (
      <div className="env-selector-loading">
        <span>加载环境中...</span>
      </div>
    );
  }

  // 错误状态
  if (error && envList.length === 0) {
    return (
      <div className="env-selector-error">
        <span className="error-icon">⚠️</span>
        <span className="error-text">{error}</span>
      </div>
    );
  }

  // 无环境状态
  if (envList.length === 0) {
    return (
      <div className="env-selector-empty">
        <span>暂无可用环境</span>
      </div>
    );
  }

  // 格式化选项
  const options = envList.map(env => ({
    value: env.EnvId,
    text: env.Alias || env.EnvId,
    // 显示环境类型和状态
    tooltip: `${env.PackageName} (${env.Region}) - ${env.EnvStatus}`,
  }));

  return (
    <div className="env-selector">
      <div className="env-selector-label">当前环境</div>
      <Select
        size="s"
        value={currentEnv?.EnvId || ''}
        options={options}
        onChange={handleEnvChange}
        placeholder="选择环境"
        searchable
        // appearance="button"
        className="env-select"
        boxClassName="env-select-box"
      />
      {currentEnv && (
        <div className="env-info">
          <span className="env-status" data-status={currentEnv.EnvStatus}>
            {currentEnv.EnvStatus === 'NORMAL' ? '🟢' : '🔴'}
          </span>
          <span className="env-package">{currentEnv.PackageName}</span>
        </div>
      )}
    </div>
  );
};

export default EnvSelector;
