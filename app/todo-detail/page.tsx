'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TodoDetailPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const todoId = sp.get('todoId') ?? '';

  // TODO: 実際はここで API から todoId の詳細を fetch して表示
  return (
    <div className="min-h-screen bg-[#FFEAE0] py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-2xl font-bold ml-2">Todo詳細</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todo #{todoId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>ここに詳細情報を表示します（ダミー）。</p>
            <div className="flex justify-end">
              <Button onClick={() => router.push(`/todo-edit?todoId=${todoId}`)}>編集へ</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
