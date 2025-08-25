'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download, CheckCircle, Circle, AlertCircle, Check } from 'lucide-react';

const initialTodos = [
  {
    id: 1,
    title: '資料作成（企画書）',
    description: '新プロジェクトの企画書を作成する',
    assignee: '田中太郎',
    dueDate: '2025-01-20',
    priority: 'high',
    status: 'pending',
    meetingTitle: '企画会議',
    createdAt: '2025-01-10'
  },
  {
    id: 2,
    title: 'クライアント連絡',
    description: '進捗状況をクライアントに報告',
    assignee: '佐藤花子',
    dueDate: '2025-01-18',
    priority: 'medium',
    status: 'in_progress',
    meetingTitle: 'プロジェクト進捗確認',
    createdAt: '2025-01-12'
  },
  {
    id: 3,
    title: 'システム要件定義',
    description: 'システムの詳細要件を定義する',
    assignee: '山田一郎',
    dueDate: '2025-01-25',
    priority: 'high',
    status: 'pending',
    meetingTitle: '技術検討会議',
    createdAt: '2025-01-11'
  },
  {
    id: 4,
    title: '予算計画書更新',
    description: 'Q1の予算計画書を最新版に更新',
    assignee: '鈴木次郎',
    dueDate: '2025-01-22',
    priority: 'medium',
    status: 'completed',
    meetingTitle: '月次レビュー',
    createdAt: '2025-01-09'
  },
  {
    id: 5,
    title: 'テストケース作成',
    description: 'ユーザビリティテストのケースを作成',
    assignee: '高橋三郎',
    dueDate: '2025-01-30',
    priority: 'low',
    status: 'pending',
    meetingTitle: '品質管理会議',
    createdAt: '2025-01-13'
  }
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'low': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getPriorityText = (priority: string) => {
  switch (priority) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return '不明';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'in_progress': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    case 'pending': return <Circle className="h-5 w-5 text-gray-400" />;
    default: return <Circle className="h-5 w-5 text-gray-400" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return '完了';
    case 'in_progress': return '進行中';
    case 'pending': return '未着手';
    default: return '不明';
  }
};

export default function TodoManagement() {
  const router = useRouter();
  const [todos, setTodos] = useState(initialTodos);
  const [filteredTodos, setFilteredTodos] = useState(initialTodos);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('dueDate');

  // 検索とソート機能
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applySearchAndSort(todos, query, sortBy);
  };

  const handleSort = (sortOption: string) => {
    console.log('ソートオプション変更:', sortOption); // デバッグ用
    setSortBy(sortOption);
    applySearchAndSort(todos, searchQuery, sortOption);
  };

  const applySearchAndSort = (todoList: any[], query: string, sortOption: string) => {
    console.log('ソート処理開始:', { query, sortOption, todoCount: todoList.length }); // デバッグ用
    let filtered = todoList;

    // 検索フィルター
    if (query) {
      filtered = filtered.filter(todo => 
        todo.title.toLowerCase().includes(query.toLowerCase()) ||
        todo.description.toLowerCase().includes(query.toLowerCase()) ||
        todo.assignee.toLowerCase().includes(query.toLowerCase()) ||
        todo.meetingTitle.toLowerCase().includes(query.toLowerCase())
      );
    }

    // ソート
    filtered = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'assignee':
          return a.assignee.localeCompare(b.assignee);
        case 'dueDate':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'meeting':
          return a.meetingTitle.localeCompare(b.meetingTitle);
        case 'status':
          const statusOrder: { [key: string]: number } = { 
            pending: 1, 
            in_progress: 2, 
            completed: 3 
          };
          return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
        default:
          return 0;
      }
    });

    console.log('ソート結果:', filtered.map(todo => ({ 
      title: todo.title, 
      assignee: todo.assignee, 
      dueDate: todo.dueDate, 
      status: todo.status 
    }))); // デバッグ用
    
    setFilteredTodos(filtered);
  };

  // 初期化時にソートを適用
  React.useEffect(() => {
    applySearchAndSort(todos, searchQuery, sortBy);
  }, [todos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Todo管理</h1>
        <Button 
          className="bg-orange-600 hover:bg-orange-700"
          onClick={() => router.push('/todo-extraction')}
        >
          <Download className="h-4 w-4 mr-2" />
          Todoの抽出
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Todoを検索..."
            className="pl-10 bg-white border-gray-300"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={handleSort}>
          <SelectTrigger className="w-48 border-gray-300 bg-white flex-shrink-0">
            <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
            <SelectValue placeholder="並び順を選択" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 shadow-lg">
            <SelectItem 
              value="assignee" 
              className={`hover:bg-gray-50 ${sortBy === 'assignee' ? 'bg-orange-50' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-gray-900">担当者順</span>
                {sortBy === 'assignee' && (
                  <Check className="h-4 w-4 text-orange-600 ml-2" />
                )}
              </div>
            </SelectItem>
            <SelectItem 
              value="dueDate" 
              className={`hover:bg-gray-50 ${sortBy === 'dueDate' ? 'bg-orange-50' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-gray-900">期限順</span>
                {sortBy === 'dueDate' && (
                  <Check className="h-4 w-4 text-orange-600 ml-2" />
                )}
              </div>
            </SelectItem>
            <SelectItem 
              value="meeting" 
              className={`hover:bg-gray-50 ${sortBy === 'meeting' ? 'bg-orange-50' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-gray-900">会議順</span>
                {sortBy === 'meeting' && (
                  <Check className="h-4 w-4 text-orange-600 ml-2" />
                )}
              </div>
            </SelectItem>
            <SelectItem 
              value="status" 
              className={`hover:bg-gray-50 ${sortBy === 'status' ? 'bg-orange-50' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-gray-900">ステータス順</span>
                {sortBy === 'status' && (
                  <Check className="h-4 w-4 text-orange-600 ml-2" />
                )}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Todo List */}
      <div className="space-y-4">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Todoが見つかりません</p>
              <p className="text-sm mt-1">
                {searchQuery ? '検索条件を変更してください' : 'Todoを抽出してください'}
              </p>
            </div>
          </div>
        ) : (
          filteredTodos.map((todo) => (
          <Card key={todo.id} className="bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 pt-1">
                  {getStatusIcon(todo.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{todo.title}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(todo.priority)}>
                        優先度: {getPriorityText(todo.priority)}
                      </Badge>
                      <Badge variant="outline">
                        {getStatusText(todo.status)}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{todo.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">担当者:</span> {todo.assignee}
                    </div>
                    <div>
                      <span className="font-medium">期限:</span> {todo.dueDate}
                    </div>
                    <div>
                      <span className="font-medium">会議:</span> {todo.meetingTitle}
                    </div>
                    <div>
                      <span className="font-medium">作成日:</span> {todo.createdAt}
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-4 space-x-2">
                    {/* 編集 */}
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); router.push(`/todo-edit?todoId=${todo.id}`); }}
                    >
                      編集
                    </Button>

                    {/* 詳細 */}
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); router.push(`/todo-detail?todoId=${todo.id}`); }}
                    >
                      詳細
                    </Button>

                    {/* 完了 */}
                    {todo.status !== 'completed' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // いまはフロント側だけで完了に更新（APIできたら差し替え）
                          setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: 'completed' } : t));
                          // 例：await fetch(`${API_BASE}/api/todos/${todo.id}/complete`, { method: 'POST', credentials: 'include' });
                        }}
                      >
                        完了
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </div>
  );
}