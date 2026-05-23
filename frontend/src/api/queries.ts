import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';
import type {
  Article,
  Comment,
  Complexity,
  Review,
  DraftContent,
  ArticleContent,
  ArticleStatus,
  Priority,
} from '../types';

// ===== Articles =====

interface ArticlesResponse {
  articles: Article[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useArticles(params?: {
  status?: ArticleStatus;
  priority?: Priority;
  complexity?: Complexity;
  platform?: string;
  q?: string;
  sort?: string;
  order?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ['articles', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ArticlesResponse>('/articles', { params });
      return data;
    },
  });
}

export function useArticle(id: number) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ article: Article }>(`/articles/${id}`);
      return data.article;
    },
    enabled: !!id,
  });
}

export function useArticleContent(id: number) {
  return useQuery({
    queryKey: ['article-content', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ArticleContent>(`/articles/${id}/content`);
      return data;
    },
    enabled: !!id,
  });
}

export function useArticleDraft(id: number) {
  return useQuery({
    queryKey: ['article-draft', id],
    queryFn: async () => {
      const { data } = await apiClient.get<DraftContent>(`/articles/${id}/draft`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Article> & { title: string }) => {
      const { data } = await apiClient.post<{ article: Article }>('/articles', values);
      return data.article;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['articles'] }),
  });
}

export function useUpdateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: number; values: Partial<Article> }) => {
      const { data } = await apiClient.put<{ article: Article }>(`/articles/${id}`, values);
      return data.article;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['articles'] });
      qc.invalidateQueries({ queryKey: ['article', variables.id] });
    },
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/articles/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['articles'] }),
  });
}

export function usePublishArticle(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/articles/${id}/publish`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['article', id] });
      qc.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}

// ===== Versions / Archives =====

interface ArchiveVersion {
  filename: string;
  path: string;
}

export function useArchiveVersions(id: number) {
  return useQuery({
    queryKey: ['archives', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ versions: ArchiveVersion[] }>(`/articles/${id}/archives`);
      return data.versions;
    },
    enabled: !!id,
  });
}

export function useVersionContent(articleId: number, version: string | null) {
  return useQuery({
    queryKey: ['version', articleId, version],
    queryFn: async () => {
      const { data } = await apiClient.get<{ articleId: number; version: string; markdown: string }>(
        `/articles/${articleId}/versions/${version}`,
      );
      return data;
    },
    enabled: !!articleId && !!version,
  });
}

export function useVersionDiff(articleId: number, from?: string, to?: string) {
  return useQuery({
    queryKey: ['diff', articleId, from, to],
    queryFn: async () => {
      const { data } = await apiClient.get<{ from: string; to: string; diff: Array<{ type: string; content: string }> }>(
        `/articles/${articleId}/diff`,
        { params: { from, to } },
      );
      return data;
    },
    enabled: !!articleId && !!from && !!to,
  });
}

// ===== Comments =====

export function useComments(articleId: number) {
  return useQuery({
    queryKey: ['comments', articleId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ comments: Comment[] }>(`/articles/${articleId}/comments`);
      return data.comments;
    },
    enabled: !!articleId,
  });
}

export function useCreateComment(articleId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      text: string;
      author?: string;
      paragraph_index?: number;
      line_start?: number;
      line_end?: number;
      type?: string;
      status?: string;
      reply_to?: number;
    }) => {
      const { data } = await apiClient.post<{ comment: Comment }>(`/articles/${articleId}/comments`, values);
      return data.comment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', articleId] }),
  });
}

export function useDeleteComment(articleId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/comments/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', articleId] }),
  });
}

// ===== Reviews =====

interface ReviewWithArticle extends Review {
  article?: Article;
}

export function useReviews(articleId: number) {
  return useQuery({
    queryKey: ['reviews', articleId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ reviews: ReviewWithArticle[] }>('/reviews', {
        params: { article_id: articleId },
      });
      return data.reviews;
    },
    enabled: !!articleId,
  });
}

export function useReviewQueue() {
  return useQuery({
    queryKey: ['review-queue'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ tasks: Array<{ article: Article; review: Review | null; round: number; previous_review_summary: string }> }>('/reviews/queue');
      return data.tasks;
    },
  });
}

export function useReviewIssues(articleId: number) {
  return useQuery({
    queryKey: ['review-issues', articleId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/reviews/issues/${articleId}`);
      return data;
    },
    enabled: !!articleId,
  });
}

export function useRespondToReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, responses }: { reviewId: number; responses: Array<{
      issue_index: number;
      action: 'accepted' | 'rejected' | 'partial';
      reason: string;
    }> }) => {
      const { data } = await apiClient.post(`/reviews/${reviewId}/respond`, { responses });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
}
