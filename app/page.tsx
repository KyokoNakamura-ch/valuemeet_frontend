// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Users, TrendingUp, Plus, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '../AuthContext';

// 認証関連の型定義
interface User {
  user_id: string;
  name: string;
  email: string;
  organization_id: number;
  organization_name?: string;
}

interface LoginFormData {
  userId: string;
  password: string;
}

// APIエンドポイント
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// パスワード検証関数
const validatePassword = (password: string): boolean => {
  // 8桁以上、大文字、小文字、数字を必須
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return minLength && hasUpper && hasLower && hasNumber;
};

// パスワードハッシュ化関数（実際の実装では bcrypt など使用）
const hashPassword = async (password: string): Promise<string> => {
  // 簡易的なハッシュ化（実際の実装では適切なライブラリを使用）
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ダッシュボードのデータ
const statsCards = [
  { title: '今月の会議数', value: '24', icon: Calendar, color: 'text-blue-600' },
  { title: '平均効率性', value: '87%', icon: TrendingUp, color: 'text-green-600' },
  { title: '時間削減', value: '12h', icon: Clock, color: 'text-purple-600' },
  { title: '満足度', value: '4.2', icon: Users, color: 'text-orange-600' },
];

const todayMeetings = [
  { title: '週次チーム会議', time: '10:00-11:00', participants: 5, status: 'upcoming' },
  { title: 'プロジェクト進捗確認', time: '14:00-15:30', participants: 8, status: 'upcoming' },
  { title: '月次レビュー', time: '16:00-17:00', participants: 12, status: 'upcoming' },
];

const recentEvaluations = [
  { title: '企画会議', date: '2025-01-09', rating: 4.5, efficiency: '良好' },
  { title: 'チーム会議', date: '2025-01-08', rating: 3.8, efficiency: '普通' },
  { title: '進捗報告会', date: '2025-01-08', rating: 4.2, efficiency: '良好' },
];

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();
  
  // ログインフォーム
  const [loginForm, setLoginForm] = useState<LoginFormData>({
    userId: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ログイン処理
  const handleLogin = async () => {
    setLoginError('');
    setIsLoggingIn(true);

// 🔍 デバッグ: 環境変数の確認
  console.log('=== デバッグ開始 ===');
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('process.env.NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('NODE_ENV:', process.env.NODE_ENV);

    try {
      // 入力値検証
      if (!loginForm.userId || !loginForm.password) {
        setLoginError('ユーザーIDとパスワードを入力してください');
        return;
      }

      // パスワードをハッシュ化
      const hashedPassword = await hashPassword(loginForm.password);
      
      // API呼び出し（ログイン認証）
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: loginForm.userId,
          password: hashedPassword
        })
      });

    console.log('リクエストURL:', API_BASE_URL);
    console.log('リクエストボディ:', response);
    console.log('リクエスト送信開始...');
    

      if (response.ok) {
        const userData = await response.json();
        
        // AuthContextのlogin関数を使用
        login(userData);
        
        // フォームをリセット
        setLoginForm({ userId: '', password: '' });
      } else {
        const errorData = await response.json();
        setLoginError(errorData.message || 'ログインに失敗しました');
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      setLoginError('ログイン処理中にエラーが発生しました');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ローディング画面
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // ログインフォーム
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center">
              <Lock className="h-6 w-6 mr-2 text-orange-600" />
              会議管理システム Value Meet
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">ログインしてください</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-sm font-medium text-gray-700">
                ユーザーID
              </Label>
              <Input
                id="userId"
                placeholder="A000001 - A000030 または admin"
                value={loginForm.userId}
                onChange={(e) => setLoginForm(prev => ({ ...prev, userId: e.target.value }))}
                className="bg-white border-gray-300"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                パスワード
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="パスワードを入力"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="bg-white border-gray-300 pr-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            
            {loginError && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {loginError}
              </div>
            )}
            
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isLoggingIn ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ログイン中...
                </>
              ) : (
                'ログイン'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // メインダッシュボード（ログイン済み）
  return (
    <div className="min-h-screen bg-gray-50">
      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Welcome Message */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900">
              ようこそ、{user.name}さん
            </h2>
            <p className="text-sm text-gray-600">
              組織: {user.organization_name || '未設定'}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsCards.map((stat, index) => (
              <Card key={index} className="bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Meetings */}
            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">今日の会議</CardTitle>
                <Button 
                  size="sm" 
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => router.push('/create-meeting')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新規作成
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayMeetings.map((meeting, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{meeting.title}</h3>
                      <span className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded">
                        {meeting.status === 'upcoming' ? '予定' : '完了'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {meeting.time}
                      </span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {meeting.participants}名
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Evaluations */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">最近の会議評価</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentEvaluations.map((evaluation, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{evaluation.title}</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-yellow-600">★ {evaluation.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{evaluation.date}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        evaluation.efficiency === '良好' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {evaluation.efficiency}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="p-4 h-auto flex flex-col items-center space-y-2"
                onClick={() => router.push('/meeting-management')}
              >
                <Calendar className="h-6 w-6 text-orange-600" />
                <span>会議管理</span>
              </Button>
              <Button
                variant="outline"
                className="p-4 h-auto flex flex-col items-center space-y-2"
                onClick={() => router.push('/create-meeting')}
              >
                <Plus className="h-6 w-6 text-orange-600" />
                <span>新しい会議</span>
              </Button>
              <Button
                variant="outline"
                className="p-4 h-auto flex flex-col items-center space-y-2"
                onClick={() => router.push('/reports')}
              >
                <TrendingUp className="h-6 w-6 text-orange-600" />
                <span>レポート</span>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}