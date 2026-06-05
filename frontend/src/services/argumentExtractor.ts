import type {
  ArgumentAuditItem,
  ArgumentMap,
  ArgumentNode,
} from '../types/argumentMap';

export interface ArgumentExtractorInput {
  title?: string;
  text: string;
}

export interface IArgumentExtractor {
  extract(input: ArgumentExtractorInput): Promise<ArgumentMap>;
}

const FALLBACK_PARAGRAPHS = [
  '很多团队在引入 AI 写作工具后，第一反应是把它当成更快的键盘：让模型生成初稿，再由作者做润色。但这种用法只解决了速度问题，没有解决判断问题。',
  '本文的中心判断是：AI 写作系统真正的价值，不是替人写完文章，而是把人的判断过程显性化，让选题、论证、证据和风险都能被审阅。',
  '在内容团队中，最常见的损耗来自隐性的逻辑断点。作者认为某个结论显然成立，审稿人却无法看见它依赖了哪些证据、经验和默认前提。',
  '例如，一篇产品复盘常会说“用户增长来自新手引导优化”，但正文只给出两个访谈片段，没有说明这些访谈为什么足以代表更大规模用户。',
  '如果把文章拆成 thesis、claim、evidence、warrant 和 objection，审稿人可以直接看到哪些 claim 有证据，哪些只是作者的经验直觉。',
  '这种结构化地图也能提醒作者补齐 warrant：数据变化为什么能支持主张，个人经验为什么不能直接外推为行业趋势。',
  '有人会反对说，过度结构化会让写作变得机械，尤其是观点文章需要保留叙事节奏和语气。',
  '这个担心成立，但逻辑地图不应该替代最终文本。它更像审稿阶段的中间层，用来暴露风险，最终表达仍由作者决定。',
  '因此，更稳妥的表述是：AI 逻辑地图适合高风险、高影响、需要多人协作审阅的文章，不适合所有轻量随笔。',
  '从实践路径看，团队可以先在审稿页中加入自动抽取的论证图，再让审稿人标记缺证据、缺桥梁和转场突兀的位置。',
  '如果只把个人项目中的一次成功经验直接推到“所有团队都应该使用 AI 审稿系统”，这个结论就过强，需要增加限定条件。',
  '综上，AI 在文章审阅中的关键作用，是帮助团队看清逻辑结构，而不是用更流畅的句子掩盖推理缺口。',
];

const clampParagraph = (index: number, paragraphCount: number) => {
  if (paragraphCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), paragraphCount - 1);
};

const extractParagraphs = (text: string) => {
  const paragraphs = text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : FALLBACK_PARAGRAPHS;
};

const sourceText = (paragraphs: string[], index: number) => {
  return paragraphs[clampParagraph(index, paragraphs.length)] ?? '';
};

const span = (paragraphs: string[], start: number, end = start) => {
  const paragraphStart = clampParagraph(start, paragraphs.length);
  const paragraphEnd = clampParagraph(end, paragraphs.length);

  return {
    paragraphStart: Math.min(paragraphStart, paragraphEnd),
    paragraphEnd: Math.max(paragraphStart, paragraphEnd),
    text: sourceText(paragraphs, paragraphStart),
  };
};

const buildNodes = (paragraphs: string[]): ArgumentNode[] => [
  {
    id: 'thesis-main',
    type: 'thesis',
    text: 'AI 写作系统的核心价值是显性化人的判断过程，而不是替代作者完成文本。',
    source_span: span(paragraphs, 1),
    confidence: 0.94,
    notes: '中心判断清晰，但需要和标题中的“审阅平台”保持一致。',
  },
  {
    id: 'claim-hidden-breaks',
    type: 'claim',
    text: '内容团队的主要损耗来自隐性的逻辑断点。',
    source_span: span(paragraphs, 2),
    confidence: 0.86,
  },
  {
    id: 'claim-map-review',
    type: 'claim',
    text: '把文章拆成论证地图，可以帮助审稿人快速定位缺证据和缺桥梁的位置。',
    source_span: span(paragraphs, 4),
    confidence: 0.91,
  },
  {
    id: 'claim-ai-workflow',
    type: 'claim',
    text: '团队可以先在审稿页中加入自动抽取的论证图，再由审稿人做结构化标记。',
    source_span: span(paragraphs, 9),
    confidence: 0.82,
  },
  {
    id: 'claim-overgeneralized',
    type: 'claim',
    text: '所有团队都应该使用 AI 审稿系统。',
    source_span: span(paragraphs, 10),
    confidence: 0.62,
    notes: '这是故意保留的过强主张，用于展示限定条件不足和跨级推理风险。',
  },
  {
    id: 'evidence-review-friction',
    type: 'evidence',
    text: '作者经常默认结论成立，但审稿人看不见证据、经验和前提之间的连接。',
    source_span: span(paragraphs, 2),
    confidence: 0.78,
  },
  {
    id: 'evidence-product-retro',
    type: 'evidence',
    text: '产品复盘中常用两个访谈片段证明“新手引导带来用户增长”，样本代表性不足。',
    source_span: span(paragraphs, 3),
    confidence: 0.8,
  },
  {
    id: 'evidence-review-page',
    type: 'evidence',
    text: '审稿页可以让审稿人标记缺证据、缺桥梁和转场突兀的位置。',
    source_span: span(paragraphs, 9),
    confidence: 0.77,
  },
  {
    id: 'warrant-visible-structure',
    type: 'warrant',
    text: '当证据、前提和结论以节点与边呈现时，审稿人能把“读感问题”转化为可定位的结构问题。',
    source_span: span(paragraphs, 5),
    confidence: 0.88,
  },
  {
    id: 'warrant-no-direct-generalization',
    type: 'warrant',
    text: '单个项目经验不能直接外推为行业或所有团队层面的宏观结论。',
    source_span: span(paragraphs, 10),
    confidence: 0.9,
  },
  {
    id: 'objection-mechanical',
    type: 'objection',
    text: '过度结构化会让写作变得机械，削弱观点文章的叙事节奏和语气。',
    source_span: span(paragraphs, 6),
    confidence: 0.84,
  },
  {
    id: 'response-intermediate-layer',
    type: 'response',
    text: '逻辑地图只是审稿阶段的中间层，用来暴露风险，不替代最终文本表达。',
    source_span: span(paragraphs, 7),
    confidence: 0.87,
  },
  {
    id: 'qualifier-high-risk',
    type: 'qualifier',
    text: '适用范围应限定在高风险、高影响、需要多人协作审阅的文章。',
    source_span: span(paragraphs, 8),
    confidence: 0.9,
  },
  {
    id: 'transition-practice',
    type: 'transition',
    text: '从价值判断转向实践路径：先加入自动抽取的论证图，再进入人工审稿标记。',
    source_span: span(paragraphs, 9),
    confidence: 0.76,
  },
  {
    id: 'transition-summary',
    type: 'transition',
    text: '由适用范围回到结论，强调 AI 帮助看清逻辑结构，而不是掩盖推理缺口。',
    source_span: span(paragraphs, 11),
    confidence: 0.81,
  },
];

const buildAudit = (): ArgumentAuditItem[] => [
  {
    id: 'unsupported-claim',
    title: '是否存在没有 evidence 支撑的 claim',
    status: 'fail',
    severity: 'high',
    detail: '“所有团队都应该使用 AI 审稿系统”没有直接证据支撑，且与前文较谨慎的适用范围冲突。',
    relatedNodeIds: ['claim-overgeneralized'],
  },
  {
    id: 'missing-warrant',
    title: '是否存在 evidence→claim 之间缺 warrant 的跳跃',
    status: 'warn',
    severity: 'medium',
    detail: '“两个访谈片段”到“用户增长来自新手引导优化”的链路需要补充样本代表性或因果解释。',
    relatedNodeIds: ['evidence-product-retro', 'warrant-no-direct-generalization'],
  },
  {
    id: 'new-concept',
    title: '是否存在新概念突然出现，没有前文铺垫',
    status: 'pass',
    severity: 'low',
    detail: 'thesis、claim、evidence、warrant 等概念在拆解段落中集中引入，后续使用基本可追踪。',
    relatedNodeIds: ['claim-map-review', 'warrant-visible-structure'],
  },
  {
    id: 'rough-transition',
    title: '是否存在段落转场突兀',
    status: 'warn',
    severity: 'medium',
    detail: '从“结构化地图的价值”跳到“实践路径”时有转场，但还可以补一句说明为什么进入流程设计。',
    relatedNodeIds: ['transition-practice'],
  },
  {
    id: 'title-thesis',
    title: '是否存在标题和 thesis 不一致',
    status: 'warn',
    severity: 'medium',
    detail: '若标题强调“文章审阅平台”，thesis 应明确落到审阅协作，而不只是泛化为 AI 写作系统。',
    relatedNodeIds: ['thesis-main'],
  },
  {
    id: 'duplicate-expression',
    title: '是否存在重复表达同一个判断',
    status: 'pass',
    severity: 'low',
    detail: '结尾复述了中心判断，但承担总结功能；未发现无效重复。',
    relatedNodeIds: ['thesis-main', 'transition-summary'],
  },
  {
    id: 'cross-level-reasoning',
    title: '是否存在个人经验直接推到宏观结论（跨级推理）',
    status: 'fail',
    severity: 'high',
    detail: '个人项目成功经验不能直接推出“所有团队都应该使用”，需要增加样本、场景或限定条件。',
    relatedNodeIds: ['claim-overgeneralized', 'warrant-no-direct-generalization'],
  },
  {
    id: 'unanswered-objection',
    title: '是否存在 objection 但没有 response',
    status: 'pass',
    severity: 'low',
    detail: '关于“写作机械化”的 objection 有明确 response：逻辑地图是审稿中间层，不替代表达。',
    relatedNodeIds: ['objection-mechanical', 'response-intermediate-layer'],
  },
  {
    id: 'strong-claim-qualifier',
    title: '是否存在 claim 太强但 qualifier 不足',
    status: 'warn',
    severity: 'high',
    detail: '文章已有“高风险、高影响、多人协作”限定，但过强主张仍需删除或显式收窄。',
    relatedNodeIds: ['claim-overgeneralized', 'qualifier-high-risk'],
  },
];

export class MockArgumentExtractor implements IArgumentExtractor {
  async extract(input: ArgumentExtractorInput): Promise<ArgumentMap> {
    const paragraphs = extractParagraphs(input.text);
    const nodes = buildNodes(paragraphs);

    return {
      articleTitle: input.title || '未命名文章',
      generatedAt: new Date().toISOString(),
      nodes,
      edges: [
        {
          from: 'claim-hidden-breaks',
          to: 'thesis-main',
          relation: 'supports',
          reason: '说明为什么“显性化判断”有审稿价值',
        },
        {
          from: 'claim-map-review',
          to: 'thesis-main',
          relation: 'supports',
          reason: '把中心论题落到可执行的审稿方法',
        },
        {
          from: 'claim-ai-workflow',
          to: 'claim-map-review',
          relation: 'supports',
          reason: '提供产品化落地路径',
        },
        {
          from: 'evidence-review-friction',
          to: 'claim-hidden-breaks',
          relation: 'supports',
          reason: '审稿人无法看见前提连接，印证逻辑断点问题',
        },
        {
          from: 'evidence-product-retro',
          to: 'claim-hidden-breaks',
          relation: 'supports',
          reason: '展示隐性推理在具体文章中的表现',
        },
        {
          from: 'warrant-visible-structure',
          to: 'claim-map-review',
          relation: 'bridges',
          reason: '解释为什么结构化节点能改善审稿定位',
        },
        {
          from: 'evidence-review-page',
          to: 'claim-ai-workflow',
          relation: 'supports',
          reason: '审稿页标记动作支持流程设计',
        },
        {
          from: 'warrant-no-direct-generalization',
          to: 'claim-overgeneralized',
          relation: 'attacks',
          reason: '反对从个人经验直接推出所有团队适用',
        },
        {
          from: 'objection-mechanical',
          to: 'claim-map-review',
          relation: 'attacks',
          reason: '质疑结构化会损害文章表达',
        },
        {
          from: 'response-intermediate-layer',
          to: 'objection-mechanical',
          relation: 'responds_to',
          reason: '说明逻辑地图只服务审稿阶段',
        },
        {
          from: 'qualifier-high-risk',
          to: 'thesis-main',
          relation: 'qualifies',
          reason: '收窄适用范围，避免中心论题过强',
        },
        {
          from: 'transition-practice',
          to: 'claim-ai-workflow',
          relation: 'transitions_to',
          reason: '由价值判断过渡到平台流程',
        },
        {
          from: 'transition-summary',
          to: 'thesis-main',
          relation: 'transitions_to',
          reason: '回收全文结论',
        },
      ],
      audit: buildAudit(),
    };
  }
}

export class LLMArgumentExtractor implements IArgumentExtractor {
  async extract(): Promise<ArgumentMap> {
    throw new Error('LLMArgumentExtractor 尚未接入。当前版本请使用 MockArgumentExtractor。');
  }
}
