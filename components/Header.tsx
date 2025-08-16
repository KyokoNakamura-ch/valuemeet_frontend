'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { useAuth } from '../AuthContext';
import { useState } from 'react';

const navigation = [
  { name: 'ダッシュボード', href: '/' },
  { name: '会議管理', href: '/meeting-management' },
  { name: 'ToDo管理', href: '/todo-management' },
  { name: '評価', href: '/evaluation' },
  { name: '分析', href: '/analytics' },
];

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  // ユーザーメニューの状態
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // ログアウト処理
  const handleLogout = () => {
    logout();
    setShowLogoutDialog(false);
    setShowUserMenu(false);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-orange-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="text-2xl font-bold text-orange-600">
                Value Meet
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Settings className="h-5 w-5" />
              </Button>
              
              {/* ユーザー情報とログアウト機能 */}
              {user && (
                <>
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
                      <User className="h-5 w-5" />
                    </Button>
                    
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                        <button
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          onClick={() => {
                            setShowLogoutDialog(true);
                            setShowUserMenu(false);
                          }}
                        >
                          <User className="h-4 w-4 inline mr-2" />
                          ログアウト
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {/* ログインしていない場合はUserアイコンのみ表示 */}
              {!user && (
                <Button variant="ghost" size="sm">
                  <User className="h-5 w-5" />
                </Button>
              )}
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
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              className="px-4 py-2"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="px-4 py-2"
            >
              ログアウト
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}