import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import KanbanPage from './pages/KanbanPage';
import ErrorBoundary from './components/ErrorBoundary';

const ReviewQueuePage = lazy(() => import('./pages/ReviewQueuePage'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage'));
const ArgumentMapPage = lazy(() => import('./pages/ArgumentMapPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ErrorBoundary>
              <Layout>
                <Suspense fallback={
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <div style={{ fontSize: 14, color: '#999' }}>加载中...</div>
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<KanbanPage />} />
                    <Route path="/review-queue" element={<ReviewQueuePage />} />
                    <Route path="/articles/:id" element={<ArticleDetailPage />} />
                    <Route path="/articles/:id/argument-map" element={<ArgumentMapPage />} />
                  </Routes>
                </Suspense>
              </Layout>
            </ErrorBoundary>
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
