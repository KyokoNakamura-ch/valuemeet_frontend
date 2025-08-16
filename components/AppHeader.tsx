'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { User as UserIcon, Lock, Eye, EyeOff } from 'lucide-react';
// 修正: 正しいAuthContextのパス
import { useAuth } from '../AuthContext';

// パスワード検証関数
const validatePassword = (password: string): boolean => {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(
    password);
  const hasNumber = /[0-9]/.test(password);
  return minLength && hasUpper && hasLower && hasNumber;
};

// パスワードハッシュ化関数
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ユーザーIDリスト生成
const generateUserIds = (): string[] => {
  const userIds = ['admin'];
  for (let i = 1; i <= 30; i++) {
    userIds.push(`A${i.toString().padStart(6, '0')}`);
  }
  return userIds;
};

const userIds = generateUserIds();
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://aps-n2-02.azurewebsites.net';

interface ResetPasswordFormData {
  targetUserId: string;
  newPassword: string;
  confirmPassword: string;
}

export default function AppHeader() {
  const { user, logout } = useAuth();
  
  // ユーザーメニューの状態
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  // パスワード初期化（admin専用）
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetForm, setResetForm] = useState<ResetPasswordFormData>({
    targetUserId: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ログアウト処理
  const handleLogout = () => {
    logout();
    setShowLogoutDialog(false);
    setShowUserMenu(false);
  };

  // パスワード初期化処理
  const handleResetPassword = async () => {
    setResetError('');
    setIsResetting(true);

    try {
      // 入力値検証
      if (!resetForm.targetUserId || !resetForm.newPassword || !resetForm.confirmPassword) {
        setResetError('すべての項目を入力してください');
        return;
      }

      if (resetForm.newPassword !== resetForm.confirmPassword) {
        setResetError('パスワードが一致しません');
        return;
      }

      if (!validatePassword(resetForm.newPassword)) {
        setResetError('パスワードは8桁以上で、大文字、小文字、数字を含む必要があります');
        return;
      }

      // パスワードをハッシュ化
      const hashedPassword = await hashPassword(resetForm.newPassword);

      // API呼び出し（パスワード初期化）
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_user_id: user?.user_id,
          target_user_id: resetForm.targetUserId,
          new_password: hashedPassword
        })
      });

      if (response.ok) {
        alert('パスワードを初期化しました');
        setResetForm({ targetUserId: '', newPassword: '', confirmPassword: '' });
        setShowResetDialog(false);
      } else {
        const errorData = await response.json();
        setResetError(errorData.detail || 'パスワード初期化に失敗しました');
      }
    } catch (error) {
      console.error('パスワード初期化エラー:', error);
      setResetError('パスワード初期化中にエラーが発生しました');
    } finally {
      setIsResetting(false);
    }
  };

  // 認証されていない場合は何も表示しない
  if (!user) {
    return null;
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">会議管理システム</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.name} さん
              </span>
              
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <UserIcon className="h-5 w-5 text-gray-600" />
                </Button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    {user.user_id === 'admin' && (
                      <button
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={() => {
                          setShowResetDialog(true);
                          setShowUserMenu(false);
                        }}
                      >
                        <Lock className="h-4 w-4 inline mr-2" />
                        パスワード初期化
                      </button>
                    )}
                    <button
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      onClick={() => {
                        setShowLogoutDialog(true);
                        setShowUserMenu(false);
                      }}
                    >
                      <UserIcon className="h-4 w-4 inline mr-2" />
                      ログアウト
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ログアウト確認ダイアログ */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ログアウト確認</DialogTitle>
            <DialogDescription>
              ログアウトしますか？
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700"
            >
              ログアウト
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* パスワード初期化ダイアログ（admin専用） */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2 text-orange-600" />
              パスワード初期化
            </DialogTitle>
            <DialogDescription>
              ユーザーのパスワードを初期化します。（管理者専用機能）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetUserId" className="text-sm font-medium text-gray-700">
                対象ユーザーID
              </Label>
              <Select 
                value={resetForm.targetUserId} 
                onValueChange={(value) => setResetForm(prev => ({ ...prev, targetUserId: value }))}
              >
                <SelectTrigger className="w-full bg-white border-gray-300">
                  <SelectValue placeholder="ユーザーIDを選択" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200">
                  {userIds.map((userId) => (
                    <SelectItem key={userId} value={userId}>
                      {userId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                新しいパスワード
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="新しいパスワード"
                  value={resetForm.newPassword}
                  onChange={(e) => setResetForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="bg-white border-gray-300 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                パスワード確認
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="パスワードを再入力"
                  value={resetForm.confirmPassword}
                  onChange={(e) => setResetForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="bg-white border-gray-300 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            
            {resetError && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {resetError}
              </div>
            )}
            
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              パスワードは8桁以上で、大文字、小文字、数字を含む必要があります。
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowResetDialog(false);
                setResetForm({ targetUserId: '', newPassword: '', confirmPassword: '' });
                setResetError('');
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isResetting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isResetting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  初期化中...
                </>
              ) : (
                'パスワード初期化'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}