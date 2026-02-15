import { useState } from 'react';
import JsonViewer from '../JsonViewer';
import './style.less';

interface DocumentViewProps {
  documents: Array<Record<string, unknown>>;
}

const DocumentView = ({ documents }: DocumentViewProps) => {
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set([0]));

  const toggleDoc = (index: number) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDocs(newExpanded);
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="document-view-empty">
        <p>暂无数据</p>
      </div>
    );
  }

  return (
    <div className="document-view">
      {documents.map((doc, index) => {
        const isExpanded = expandedDocs.has(index);
        const docId = (doc._id as string) || `doc-${index}`;

        return (
          <div key={docId} className="document-item">
            <div className="document-header" onClick={() => toggleDoc(index)}>
              <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
              <span className="document-title">
                <span className="document-label">文档 #{index + 1}</span>
                <span className="document-id">{docId}</span>
              </span>
            </div>
            {isExpanded && (
              <div className="document-content">
                <JsonViewer data={doc} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DocumentView;
