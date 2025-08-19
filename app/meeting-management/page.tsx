// app/meeting-management/page.tsx
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { Search, Filter, Plus, Calendar, Users, Clock, User, Edit, Eye, Trash2, ChevronLeft, ChevronRight, FilterX, ChevronDown, Target, Tag, Monitor, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth, withAuth } from '../../AuthContext';

// 型定義
interface Meeting {
  id: number;
  title: string;
  date: string;
  time: string;
  endTime?: string;
  participants: number;
  status: 'scheduled' | 'draft' | 'completed';
  agenda: string[];
  facilitator: string;
  facilitatorOrg?: string;
  meetingType?: string;
  meetingMode?: string;
  purpose?: string;
  createdBy?: string;
  ruleViolation?: boolean;
}

interface DepartmentMember {
  user_id: string;
  name: string;
  organization_name: string;
}

interface ApiMeetingItem {
  meeting_id: number;
  title: string;
  date_time: string;
  end_time?: string;
  participants?: number;
  status?: string;
  meeting_mode: string;
  meeting_type?: string;
  purpose?: string;
  agenda?: string[];
  name?: string;
  organization_name?: string;
  created_by?: string;
  rule_violation?: boolean;
}

// データキャッシュ用の型
interface CachedData {
  myMeetings: Meeting[];
  departmentMeetings: Meeting[];
  departmentMembers: DepartmentMember[];
  lastFetched: Date;
}

// APIエンドポイントを定義
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// 期間タイプ
type PeriodType = 'day' | 'week' | 'month';

// フィルタータイプ
type FilterType = 'my' | 'department' | 'member';

// 会議コスト計算関数
const calculateMeetingCost = (participantCount: number, startTime: string, endTime: string): number => {
  if (!startTime || !endTime || participantCount === 0) return 0;
  
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  
  if (durationHours <= 0) return 0;
  
  return participantCount * 5000 * durationHours;
};

// ユーティリティ関数
const getDynamicStatus = (meeting: Meeting): string => {
  if (meeting.status === 'draft') {
    return 'draft';
  }
  
  if (meeting.status === 'completed') {
    return 'completed';
  }
  
  if (meeting.status === 'scheduled') {
    const now = new Date();
    const meetingStart = new Date(`${meeting.date}T${meeting.time}`);
    const meetingEnd = new Date(meetingStart.getTime() + 60 * 60 * 1000);
    
    if (now < meetingStart) {
      return 'scheduled';
    } else if (now >= meetingStart && now < meetingEnd) {
      return 'scheduled';
    } else {
      return 'meeting_ended';
    }
  }
  
  return meeting.status;
};

const getStatusColor = (meeting: Meeting): string => {
  const dynamicStatus = getDynamicStatus(meeting);
  
  switch (dynamicStatus) {
    case 'scheduled': return 'bg-green-100 text-green-700';
    case 'meeting_ended': return 'bg-orange-100 text-orange-700';
    case 'completed': return 'bg-gray-100 text-gray-700';
    case 'draft': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusText = (meeting: Meeting): string => {
  const dynamicStatus = getDynamicStatus(meeting);
  
  switch (dynamicStatus) {
    case 'scheduled': return '予定';
    case 'meeting_ended': return '会議終了';
    case 'completed': return '完了';
    case 'draft': return '下書き';
    default: return '不明';
  }
};

const getStatusOrder = (meeting: Meeting): number => {
  const dynamicStatus = getDynamicStatus(meeting);
  
  switch (dynamicStatus) {
    case 'scheduled': return 1;
    case 'meeting_ended': return 2;
    case 'completed': return 3;
    case 'draft': return 4;
    default: return 5;
  }
};

const getMeetingTypeText = (meetingType?: string): string => {
  switch (meetingType) {
    case '意思決定会議': return '意思決定会議';
    case '情報共有型会議': return '情報共有型会議';
    case '課題解決会議': return '課題解決会議';
    case '企画構想型会議': return '企画構想型会議';
    case '育成評価型会議': return '育成評価型会議';
    case 'その他': return 'その他';
    default: return '未設定';
  }
};

// 日付ユーティリティ関数
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const getWeekEnd = (date: Date): Date => {
  const weekStart = getWeekStart(date);
  return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
};

const getMonthStart = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getMonthEnd = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const getDayStart = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getDayEnd = (date: Date): Date => {
  const dayStart = getDayStart(date);
  return new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
};

// 参加者数表示のヘルパー関数
const getParticipantCountText = (count: number): string => {
  if (count === 0) {
    return '参加者未設定';
  }
  return `${count}名`;
};

// APIデータのマッピング関数
const mapApiDataToMeeting = (item: ApiMeetingItem): Meeting => {
  const dateTime = new Date(item.date_time);
  const date = dateTime.toISOString().split('T')[0];
  const time = dateTime.toTimeString().slice(0, 5);
  const endTime = item.end_time || undefined;

  return {
    id: item.meeting_id,
    title: item.title,
    date: date,
    time: time,
    endTime: endTime,
    participants: item.participants ?? 0,
    status: (item.status || 'scheduled') as Meeting['status'],
    meetingType: item.meeting_type,
    meetingMode: item.meeting_mode,
    purpose: item.purpose || (item.agenda && item.agenda.length > 0 ? item.agenda[0] : ''),
    agenda: item.agenda || [],
    facilitator: item.name || '',
    facilitatorOrg: item.organization_name || '',
    createdBy: item.created_by,
    ruleViolation: item.rule_violation || false
  };
};

// メインコンポーネント
function MeetingManagement() {
  const { user } = useAuth();
  const router = useRouter();
  
  // キャッシュされたデータ
  const [cachedData, setCachedData] = useState<CachedData>({
    myMeetings: [],
    departmentMeetings: [],
    departmentMembers: [],
    lastFetched: new Date(0)
  });
  
  // 表示用の会議リスト
  const [displayMeetings, setDisplayMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  
  // UI状態
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // フィルター関連の状態
  const [filterType, setFilterType] = useState<FilterType>('my');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedMeetingType, setSelectedMeetingType] = useState<string>('all');
  
  // 期間選択の状態
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // フィルターセクションの開閉状態
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // 削除確認ダイアログの状態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);

  // API関数：初回データ一括取得
  const fetchAllInitialData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // 並列でデータ取得（データベースアクセスは各テーブル1回のみ）
      const [myMeetingsRes, deptMeetingsRes, deptMembersRes] = await Promise.all([
        // 自分の会議一覧
        fetch(`${API_BASE_URL}/meeting_list?user_id=${user.user_id}`),
        // 部内会議一覧
        fetch(`${API_BASE_URL}/department_meetings?organization_id=${user.organization_id}`),
        // 部内メンバー一覧
        fetch(`${API_BASE_URL}/department_members?organization_id=${user.organization_id}`)
      ]);

      if (!myMeetingsRes.ok || !deptMeetingsRes.ok || !deptMembersRes.ok) {
        throw new Error('データ取得に失敗しました');
      }

      const [myMeetingsData, deptMeetingsData, deptMembersData] = await Promise.all([
        myMeetingsRes.json() as Promise<ApiMeetingItem[]>,
        deptMeetingsRes.json() as Promise<ApiMeetingItem[]>,
        deptMembersRes.json() as Promise<DepartmentMember[]>
      ]);

      // データをマッピング
      const myMeetings = myMeetingsData.map(mapApiDataToMeeting);
      const departmentMeetings = deptMeetingsData.map(mapApiDataToMeeting);

      // キャッシュに保存
      setCachedData({
        myMeetings,
        departmentMeetings,
        departmentMembers: deptMembersData,
        lastFetched: new Date()
      });

      // 初期表示は「担当者（自分）」の会議
      setDisplayMeetings(myMeetings);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '会議データの取得に失敗しました';
      console.error('Data loading error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 会議削除API（削除時のみDBアクセス）
  const deleteMeeting = useCallback(async (meetingId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/meeting/${meetingId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`会議削除失敗: ${response.status}`);
    }
  }, []);

  // フィルタタイプ変更時の処理（キャッシュからデータ抽出、DBアクセスなし）
  const updateDisplayMeetings = useCallback(() => {
    let meetings: Meeting[] = [];

    switch (filterType) {
      case 'my':
        meetings = cachedData.myMeetings;
        break;
      case 'department':
        meetings = cachedData.departmentMeetings;
        break;
      case 'member':
        if (selectedMember) {
          // 選択されたメンバーが作成または参加している会議を抽出
          meetings = cachedData.departmentMeetings.filter(meeting => {
            // 作成者でフィルタ
            if (meeting.createdBy === selectedMember) return true;
            
            // ファシリテーター名でフィルタ
            const memberName = cachedData.departmentMembers.find(m => m.user_id === selectedMember)?.name;
            if (memberName && meeting.facilitator === memberName) return true;
            
            return false;
          });
        }
        break;
    }

    setDisplayMeetings(meetings);
  }, [filterType, selectedMember, cachedData]);

  // フィルタリング・ソート機能（フロントエンドで処理）
  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...displayMeetings];
    
    // 期間フィルタを適用
    let startDate: Date, endDate: Date;
    
    switch (periodType) {
      case 'day':
        startDate = getDayStart(currentDate);
        endDate = getDayEnd(currentDate);
        break;
      case 'week':
        startDate = getWeekStart(currentDate);
        endDate = getWeekEnd(currentDate);
        break;
      case 'month':
        startDate = getMonthStart(currentDate);
        endDate = getMonthEnd(currentDate);
        break;
    }

    filtered = filtered.filter(meeting => {
      const meetingDate = new Date(meeting.date);
      return meetingDate >= startDate && meetingDate <= endDate;
    });
    
    // 検索フィルタ
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(meeting =>
        meeting.title?.toLowerCase().includes(lowerQuery) ||
        meeting.purpose?.toLowerCase().includes(lowerQuery) ||
        meeting.facilitator?.toLowerCase().includes(lowerQuery) ||
        meeting.facilitatorOrg?.toLowerCase().includes(lowerQuery)
      );
    }
    
    // 会議種別フィルタ
    if (selectedMeetingType && selectedMeetingType !== 'all') {
      filtered = filtered.filter(meeting => meeting.meetingType === selectedMeetingType);
    }
    
    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime();
        case 'status':
          return getStatusOrder(a) - getStatusOrder(b);
        case 'facilitator':
          return a.facilitator.localeCompare(b.facilitator);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
    
    setFilteredMeetings(filtered);
  }, [displayMeetings, searchQuery, sortBy, selectedMeetingType, periodType, currentDate]);

  // 統計情報の計算（メモ化で最適化）
  const statistics = useMemo(() => {
    const periodMeetings = filteredMeetings;
    
    let scheduled = 0;
    let meetingEnded = 0;
    let completed = 0;
    let drafts = 0;
    
    periodMeetings.forEach(meeting => {
      const dynamicStatus = getDynamicStatus(meeting);
      
      switch (dynamicStatus) {
        case 'scheduled':
          scheduled++;
          break;
        case 'meeting_ended':
          meetingEnded++;
          break;
        case 'completed':
          completed++;
          break;
        case 'draft':
          drafts++;
          break;
      }
    });
    
    const totalMeetings = scheduled + meetingEnded + completed;
    
    return { totalMeetings, scheduled, meetingEnded, completed, drafts };
  }, [filteredMeetings]);

  // 初期データ取得（起動時1回のみ）
  useEffect(() => {
    if (user) {
      fetchAllInitialData();
    }
  }, [user, fetchAllInitialData]);

  // フィルタタイプ変更時の処理
  useEffect(() => {
    updateDisplayMeetings();
  }, [filterType, selectedMember, updateDisplayMeetings]);

  // フィルタリング・ソート処理
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // フィルター変更ハンドラ
  const handleFilterChange = (newFilterType: FilterType) => {
    setFilterType(newFilterType);
    if (newFilterType !== 'member') {
      setSelectedMember('');
    }
  };

  const handleMemberChange = (memberId: string) => {
    setSelectedMember(memberId);
  };

  const handleMeetingTypeChange = (meetingType: string) => {
    setSelectedMeetingType(meetingType);
  };

  // フィルターリセット
  const resetFilters = () => {
    setFilterType('my');
    setSelectedMember('');
    setSelectedMeetingType('all');
    setSearchQuery('');
    setSortBy('date');
  };

  // 期間変更ハンドラ
  const handlePeriodChange = (newPeriodType: PeriodType) => {
    setPeriodType(newPeriodType);
    setCurrentDate(new Date());
  };

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (periodType) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  // 現在の期間表示文字列を取得
  const getCurrentPeriodString = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const date = currentDate.getDate();
    
    switch (periodType) {
      case 'day':
        return `${year}年${month}月${date}日`;
      case 'week':
        const weekStart = getWeekStart(currentDate);
        const weekEnd = getWeekEnd(currentDate);
        return `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月${weekStart.getDate()}日 - ${weekEnd.getFullYear()}年${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;
      case 'month':
        return `${year}年${month}月`;
    }
  };

  // ナビゲーションハンドラ
  const handleEditMeeting = useCallback((meeting: Meeting) => {
    router.push(`/edit-meeting?id=${meeting.id}`);
  }, [router]);

  const handleViewDetails = useCallback((meetingId: number) => {
    router.push(`/meeting/${meetingId}`);
  }, [router]);

  const handleCreateMeeting = useCallback(() => {
    router.push('/create-meeting');
  }, [router]);

  // 削除処理
  const handleDeleteClick = (meeting: Meeting) => {
    setMeetingToDelete(meeting);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!meetingToDelete) return;
    
    try {
      await deleteMeeting(meetingToDelete.id);
      
      // キャッシュからも削除（DBアクセスなし）
      setCachedData(prev => ({
        ...prev,
        myMeetings: prev.myMeetings.filter(m => m.id !== meetingToDelete.id),
        departmentMeetings: prev.departmentMeetings.filter(m => m.id !== meetingToDelete.id)
      }));
      
      alert('会議を削除しました');
    } catch (error) {
      console.error('削除エラー:', error);
      alert('会議の削除に失敗しました');
    } finally {
      setDeleteDialogOpen(false);
      setMeetingToDelete(null);
    }
  };

  // ローディング状態
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">会議データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <Calendar className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-medium">エラーが発生しました</p>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            再読み込み
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">会議管理</h1>
          {user && (
            <p className="text-sm text-gray-600 mt-1">
              ユーザー: {user.name}（{user.organization_name}）
            </p>
          )}
        </div>
        <Button
          className="bg-orange-600 hover:bg-orange-700"
          onClick={handleCreateMeeting}
        >
          <Plus className="h-4 w-4 mr-2" />
          新しい会議の作成
        </Button>
      </div>

      {/* Filter and Period Selection Combined Section */}
      <Card className="bg-white border border-gray-200">
        <CardHeader className="cursor-pointer py-2" onClick={() => setIsFilterOpen(!isFilterOpen)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              フィルター・検索・期間設定
            </CardTitle>
            <ChevronDown 
              className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                isFilterOpen ? 'transform rotate-180' : ''
              }`}
            />
          </div>
        </CardHeader>
        {isFilterOpen && (
          <CardContent className="space-y-6">
            {/* 検索・並び順設定 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">検索・並び順</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 検索 */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">検索</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="会議を検索..."
                      className="pl-10 bg-white border-gray-300"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* 並び順 */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">並び順</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full border-gray-300 bg-white">
                      <SelectValue placeholder="並び順を選択" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="date">日時順</SelectItem>
                      <SelectItem value="title">タイトル順</SelectItem>
                      <SelectItem value="status">ステータス順</SelectItem>
                      <SelectItem value="facilitator">ファシリテーター順</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* フィルター設定 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">フィルター設定</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 基本フィルター */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">表示範囲</label>
                  <Select value={filterType} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-full bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      <SelectItem value="my">担当者（自分）</SelectItem>
                      <SelectItem value="department">部内</SelectItem>
                      <SelectItem value="member">担当者指定</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 担当者選択 */}
                {filterType === 'member' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">担当者</label>
                    <Select value={selectedMember} onValueChange={handleMemberChange}>
                      <SelectTrigger className="w-full bg-white border-gray-300">
                        <SelectValue placeholder="担当者を選択" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200">
                        {cachedData.departmentMembers.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 会議種別 */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">会議種別</label>
                  <Select value={selectedMeetingType} onValueChange={handleMeetingTypeChange}>
                    <SelectTrigger className="w-full bg-white border-gray-300">
                      <SelectValue placeholder="種別を選択" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="意思決定会議">意思決定会議</SelectItem>
                      <SelectItem value="情報共有型会議">情報共有型会議</SelectItem>
                      <SelectItem value="課題解決会議">課題解決会議</SelectItem>
                      <SelectItem value="企画構想型会議">企画構想型会議</SelectItem>
                      <SelectItem value="育成評価型会議">育成評価型会議</SelectItem>
                      <SelectItem value="その他">その他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 全体リセット */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="w-full"
                  >
                    <FilterX className="h-4 w-4 mr-2" />
                    全体リセット
                  </Button>
                </div>
              </div>
            </div>

            {/* 期間設定 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">期間設定</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Select value={periodType} onValueChange={handlePeriodChange}>
                    <SelectTrigger className="w-16 border-gray-300 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper"
                      align="start"
                      className="w-[var(--radix-select-trigger-width)] bg-white border border-gray-200"
                    >
                      <SelectItem value="day">日</SelectItem>
                      <SelectItem value="week">週</SelectItem>
                      <SelectItem value="month">月</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDateNavigation('prev')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[200px] text-center">
                      {getCurrentPeriodString()}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDateNavigation('next')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  今日
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* 期間表示セクション */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-semibold text-blue-900">
                  表示期間: {getCurrentPeriodString()}
                </span>
              </div>
              <div className="text-sm text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                {filteredMeetings.length}件の会議
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-blue-600">期間タイプ:</span>
              <span className="text-sm font-medium text-blue-800 bg-white px-2 py-1 rounded border">
                {periodType === 'day' ? '日別' : periodType === 'week' ? '週別' : '月別'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{statistics.totalMeetings}</p>
            <p className="text-sm text-gray-600">総会議数</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{statistics.scheduled}</p>
            <p className="text-sm text-gray-600">予定</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{statistics.meetingEnded || 0}</p>
            <p className="text-sm text-gray-600">会議終了</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-600">{statistics.completed}</p>
            <p className="text-sm text-gray-600">完了</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{statistics.drafts}</p>
            <p className="text-sm text-gray-600">下書き</p>
          </div>
        </div>
      </div>

      {/* Meetings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMeetings.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">会議が見つかりません</p>
              <p className="text-sm mt-1">
                {searchQuery || selectedMeetingType !== 'all' ? 
                  'フィルター条件を変更してください' : 
                  '指定した期間内に会議がありません'}
              </p>
              <p className="text-xs mt-2 text-gray-400">
                期間設定を変更するか、新しい会議を作成してください
              </p>
            </div>
          </div>
        ) : (
          filteredMeetings.map((meeting) => {
            // 会議コストの計算
            const meetingCost = meeting.endTime ? 
              calculateMeetingCost(meeting.participants, meeting.time, meeting.endTime) : 0;
            
            return (
              <Card key={meeting.id} className="bg-white hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-2">
                      <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                        {meeting.title}
                        {/* 会議コスト表示 */}
                        {meetingCost > 0 && (
                          <span className="ml-2 text-sm text-red-600 font-bold">
                            ¥{meetingCost.toLocaleString()}
                          </span>
                        )}
                      </CardTitle>
                      {/* 招集ルールチェック表示 */}
                      {meeting.ruleViolation && (
                        <div className="flex items-center mt-1">
                          <AlertTriangle className="h-3 w-3 text-red-600 mr-1" />
                          <span className="text-xs text-red-600 font-medium">招集ルールチェック</span>
                        </div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${getStatusColor(meeting)}`}>
                      {getStatusText(meeting)}
                    </span>
                  </div>
                  {/* 会議の目的をタイトルの下に表示 */}
                  {meeting.purpose && meeting.purpose.trim() !== '' && (
                    <div className="mt-2 flex items-center text-base text-gray-700">
                      <Target className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{meeting.purpose}</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* 日付と時間を横並び */}
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="flex items-center flex-1 mr-2">
                      <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{meeting.date}</span>
                    </div>
                    <div className="flex items-center flex-1">
                      <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{meeting.time}{meeting.endTime ? ` - ${meeting.endTime}` : ''}</span>
                    </div>
                  </div>
                  
                  {/* ファシリテータと参加人数を横並び */}
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="flex items-center flex-1 mr-2">
                      <User className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {(meeting.facilitator || meeting.facilitatorOrg) 
                          ? (meeting.facilitatorOrg && meeting.facilitator 
                              ? `${meeting.facilitatorOrg} ${meeting.facilitator}`
                              : meeting.facilitator || meeting.facilitatorOrg)
                          : '未設定'
                        }
                      </span>
                    </div>
                    <div className="flex items-center flex-1">
                      <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className={meeting.participants === 0 ? 'text-gray-400' : ''}>
                        {getParticipantCountText(meeting.participants)}
                      </span>
                    </div>
                  </div>
                  
                  {/* 会議種別を表示 */}
                  {meeting.meetingType && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Tag className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{getMeetingTypeText(meeting.meetingType)}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleEditMeeting(meeting)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        編集
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleViewDetails(meeting.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        会議サポート
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleDeleteClick(meeting)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        削除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle>会議の削除</DialogTitle>
            <DialogDescription>
              以下の会議を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          {meetingToDelete && (
            <div className="py-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium">{meetingToDelete.title}</p>
                <p className="text-sm text-gray-600">{meetingToDelete.date} {meetingToDelete.time}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              削除する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 認証保護を適用してコンポーネントをエクスポート
export default withAuth(MeetingManagement);
