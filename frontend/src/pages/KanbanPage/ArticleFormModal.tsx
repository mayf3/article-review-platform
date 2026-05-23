import React from 'react';
import { Modal, Form, Input, Select } from 'antd';
import type { Priority } from '../../types';

interface ArticleFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    title: string;
    slug?: string;
    priority?: Priority;
    target_platforms?: string[];
  }) => void;
  loading?: boolean;
}

const ArticleFormModal: React.FC<ArticleFormModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading,
}) => {
  const [form] = Form.useForm();

  const handleFinish = (values: {
    title: string;
    slug?: string;
    priority?: Priority;
    target_platforms?: string[];
  }) => {
    onSubmit(values);
    form.resetFields();
  };

  return (
    <Modal
      title="新建文章"
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="创建"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="title"
          label="文章标题"
          rules={[{ required: true, message: '请输入文章标题' }]}
        >
          <Input placeholder="请输入文章标题" />
        </Form.Item>
        <Form.Item name="slug" label="Slug（别名）">
          <Input placeholder="留空则自动生成" />
        </Form.Item>
        <Form.Item name="priority" label="优先级" initialValue="medium">
          <Select
            options={[
              { value: 'low', label: '低' },
              { value: 'medium', label: '中' },
              { value: 'high', label: '高' },
            ]}
          />
        </Form.Item>
        <Form.Item name="target_platforms" label="目标平台">
          <Select
            mode="multiple"
            placeholder="选择目标发布平台"
            options={[
              { value: 'github', label: 'GitHub' },
              { value: 'wechat', label: '微信' },
              { value: 'feishu', label: '飞书' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ArticleFormModal;
