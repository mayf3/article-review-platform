export type ArgumentNodeType =
  | 'thesis'
  | 'claim'
  | 'evidence'
  | 'warrant'
  | 'objection'
  | 'response'
  | 'qualifier'
  | 'transition';

export type ArgumentRelation =
  | 'supports'
  | 'attacks'
  | 'responds_to'
  | 'qualifies'
  | 'bridges'
  | 'transitions_to';

export type ArgumentAuditStatus = 'pass' | 'fail' | 'warn';

export type ArgumentAuditSeverity = 'low' | 'medium' | 'high';

export interface ArgumentSourceSpan {
  paragraphStart: number;
  paragraphEnd: number;
  text?: string;
}

export interface ArgumentNode {
  id: string;
  type: ArgumentNodeType;
  text: string;
  source_span: ArgumentSourceSpan;
  confidence: number;
  notes?: string;
}

export interface ArgumentEdge {
  from: string;
  to: string;
  relation: ArgumentRelation;
  reason: string;
}

export interface ArgumentAuditItem {
  id: string;
  title: string;
  status: ArgumentAuditStatus;
  detail: string;
  severity: ArgumentAuditSeverity;
  relatedNodeIds: string[];
}

export interface ArgumentMap {
  articleTitle: string;
  generatedAt: string;
  nodes: ArgumentNode[];
  edges: ArgumentEdge[];
  audit: ArgumentAuditItem[];
}

export const ARGUMENT_NODE_LABELS: Record<ArgumentNodeType, string> = {
  thesis: '中心论题',
  claim: '主张',
  evidence: '证据',
  warrant: '论证桥梁',
  objection: '反对意见',
  response: '回应',
  qualifier: '限定条件',
  transition: '转场',
};

export const ARGUMENT_RELATION_LABELS: Record<ArgumentRelation, string> = {
  supports: '支持',
  attacks: '攻击',
  responds_to: '回应',
  qualifies: '限定',
  bridges: '桥接',
  transitions_to: '转场',
};
