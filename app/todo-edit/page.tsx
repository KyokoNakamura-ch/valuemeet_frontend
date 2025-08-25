'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function TodoEditPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const todoId = sp.get('todoId') ?? '';

  // 仮の編集フォーム（必要に応じてAPI連携に差し替え）
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');

  return (
    <div className="min-h-screen bg-[#FFEAE0] py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-2xl font-bold ml-2">Todo編集</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todo #{todoId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm mb-1">タイトル</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル" />
            </div>
            <div>
              <label className="block text-sm mb-1">担当者</label>
              <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="担当者" />
            </div>
            <div>
              <label className="block text-sm mb-1">期限</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => router.back()}>キャンセル</Button>
              <Button
                onClick={() => {
                  // TODO: 保存APIに差し替え
                  alert('保存（ダミー）しました');
                  router.push('/todo-management');
                }}
              >
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
