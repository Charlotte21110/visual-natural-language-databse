import { useState } from 'react';
import './style.less';

interface JsonViewerProps {
  data: unknown;
  name?: string;
  defaultExpanded?: boolean;
}

// 单个字段组件
const JsonField = ({ name, value, level = 0 }: { name?: string; value: unknown; level?: number }) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);

  // 基础类型渲染
  if (value === null) {
    return (
      <div className="json-field">
        {name && <span className="field-name">{name}:</span>}
        <span className="json-null">null</span>
      </div>
    );
  }

  if (value === undefined) {
    return (
      <div className="json-field">
        {name && <span className="field-name">{name}:</span>}
        <span className="json-undefined">undefined</span>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className="json-field">
        {name && <span className="field-name">{name}:</span>}
        <span className="json-boolean">{value.toString()}</span>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className="json-field">
        {name && <span className="field-name">{name}:</span>}
        <span className="json-number">{value}</span>
      </div>
    );
  }

  if (typeof value === 'string') {
    return (
      <div className="json-field">
        {name && <span className="field-name">{name}:</span>}
        <span className="json-string">"{value}"</span>
      </div>
    );
  }

  // 数组类型
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div className="json-field">
          {name && <span className="field-name">{name}:</span>}
          <span className="json-empty">[]</span>
        </div>
      );
    }

    return (
      <div className="json-field json-expandable">
        <div className="field-header" onClick={() => setIsExpanded(!isExpanded)}>
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          {name && <span className="field-name">{name}:</span>}
          <span className="field-type">Array ({value.length})</span>
        </div>
        {isExpanded && (
          <div className="field-children">
            {value.map((item, index) => (
              <JsonField key={index} name={`[${index}]`} value={item} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 对象类型
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return (
        <div className="json-field">
          {name && <span className="field-name">{name}:</span>}
          <span className="json-empty">{'{}'}</span>
        </div>
      );
    }

    return (
      <div className="json-field json-expandable">
        <div className="field-header" onClick={() => setIsExpanded(!isExpanded)}>
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          {name && <span className="field-name">{name}:</span>}
          <span className="field-type">Object ({entries.length})</span>
        </div>
        {isExpanded && (
          <div className="field-children">
            {entries.map(([key, val]) => (
              <JsonField key={key} name={key} value={val} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="json-field">
      {name && <span className="field-name">{name}:</span>}
      <span>{String(value)}</span>
    </div>
  );
};

// 主组件
const JsonViewer = ({ data, name, defaultExpanded = true }: JsonViewerProps) => {
  return (
    <div className="json-viewer">
      <JsonField name={name} value={data} level={0} />
    </div>
  );
};

export default JsonViewer;
