// app/create-meeting/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, X, ArrowLeft, Search, Bot, Loader2, Save, Sparkles, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth, withAuth } from '../../AuthContext';

// API Base URL (環境に応じて変更してください)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// 型定義
interface Participant {
  user_id: string;
  name: string;
  organization_name: string;
  role: string;
  email?: string;
}

interface SearchResult {
  user_id: string;
  name: string;
  organization_name: string;
  email?: string;
}

interface RecommendedUser {
  user_id: string;
  name: string;
  organization_name: string;
  past_role?: string;
}

// 会議招集ルールチェック
interface RuleViolation {
  rule: string;
  message: string;
}

// 時間選択のオプションを生成（8:00-18:00、15分間隔）
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 18 && minute > 0) break; // 18:00で終了
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayString = `${hour}:${minute.toString().padStart(2, '0')}`;
      options.push({ value: timeString, label: displayString });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

// 会議コスト計算関数
const calculateMeetingCost = (participantCount: number, startTime: string, endTime: string): number => {
  if (!startTime || !endTime || participantCount === 0) return 0;
  
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  
  if (durationHours <= 0) return 0;
  
  return participantCount * 5000 * durationHours;
};

// 会議招集ルールチェック関数
const checkMeetingRules = (meetingType: string, participants: Participant[]): RuleViolation[] => {
  const violations: RuleViolation[] = [];
  
  // 役割別の参加者数をカウント
  const roleCounts = {
    '会議主催者': 0,
    '実行責任者': 0,
    '説明責任者': 0,
    '有識相談者': 0,
    '報告先': 0
  };
  
  participants.forEach(p => {
    if (roleCounts.hasOwnProperty(p.role)) {
      roleCounts[p.role as keyof typeof roleCounts]++;
    }
  });
  
  // ルール1: 課題解決会議では有識相談者が参加していること
  if (meetingType === '課題解決会議' && roleCounts['有識相談者'] === 0) {
    violations.push({
      rule: '課題解決会議ルール',
      message: '課題解決会議では「有識相談者」が参加している必要があります。'
    });
  }
  
  // ルール2: 意思決定会議、課題解決会議、企画構想型会議では実行責任者が参加していること
  const requiresExecutive = ['意思決定会議', '課題解決会議', '企画構想型会議'];
  if (requiresExecutive.includes(meetingType) && roleCounts['実行責任者'] === 0) {
    violations.push({
      rule: '実行責任者ルール',
      message: `${meetingType}では「実行責任者」が参加している必要があります。`
    });
  }
  
  // ルール3: 全ての会議において報告先は3人まで
  if (roleCounts['報告先'] > 3) {
    violations.push({
      rule: '報告先人数ルール',
      message: '「報告先」は3人までに制限されています。'
    });
  }
  
  // ルール4: 全ての会議において説明責任者は1人
  if (roleCounts['説明責任者'] !== 1) {
    violations.push({
      rule: '説明責任者ルール',
      message: '「説明責任者」は必ず1人である必要があります。'
    });
  }
  
  return violations;
};

function CreateMeetingPage() {
  const router = useRouter();
  const { user } = useAuth(); // 認証されたユーザー情報を取得
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    mode: '',
    priority: '',
    date: '',
    startTime: '',
    endTime: '',
    purposes: [''],     // 目的（配列）
    topics: [''],       // トピック（配列）
    participants: [] as Participant[]
  });

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false); // タグ生成専用
  const [isGeneratingAI, setIsGeneratingAI] = useState(false); // AI推薦専用
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 招集ルールチェック関連の状態
  const [ruleViolations, setRuleViolations] = useState<RuleViolation[]>([]);
  const [isRuleWarningOpen, setIsRuleWarningOpen] = useState(false);
  const [ignoreRules, setIgnoreRules] = useState(false);

  // ユーザー情報がない場合のローディング表示
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">ユーザー情報を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  // 目的の追加・削除・更新
  const addPurpose = () => {
    setFormData(prev => ({
      ...prev,
      purposes: [...prev.purposes, '']
    }));
  };

  const removePurpose = (index: number) => {
    setFormData(prev => ({
      ...prev,
      purposes: prev.purposes.filter((_, i) => i !== index)
    }));
  };

  const updatePurpose = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      purposes: prev.purposes.map((obj, i) => i === index ? value : obj)
    }));
  };

  // トピックの追加・削除・更新
  const addTopic = () => {
    setFormData(prev => ({
      ...prev,
      topics: [...prev.topics, '']
    }));
  };

  const removeTopic = (index: number) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index)
    }));
  };

  const updateTopic = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.map((item, i) => i === index ? value : item)
    }));
  };

  // タグの追加・削除・更新
  const addTag = () => {
    setGeneratedTags(prev => [...prev, '']);
  };

  const removeTag = (index: number) => {
    setGeneratedTags(prev => prev.filter((_, i) => i !== index));
  };

  const updateTag = (index: number, value: string) => {
    setGeneratedTags(prev => prev.map((tag, i) => i === index ? value : tag));
  };

  // 参加者の削除
  const removeParticipant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
    }));
  };

  // 参加者の役割更新
  const updateParticipantRole = (index: number, role: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map((p, i) => 
        i === index ? { ...p, role } : p
      )
    }));
  };

  // 名前検索
  const handleNameSearch = async () => {
    if (!searchQuery.trim()) {
      alert('氏名を入力してください');
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/name_search?name=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('検索に失敗');
      setSearchResults(await res.json());
    } catch (e) {
      console.error(e);
      alert('検索に失敗しました');
    } finally {
      setIsSearching(false);
    }
  };

  // 検索結果から参加者を追加
  const addParticipantFromSearch = (user: SearchResult) => {
    const exists = formData.participants.some(p => p.user_id === user.user_id);
    if (!exists) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, {
          user_id: user.user_id,
          name: user.name,
          organization_name: user.organization_name,
          role: '会議主催者', // デフォルト役割を更新
          email: user.email
        }]
      }));
    }
    setIsSearchModalOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // タグ生成機能（新規追加）
  const handleTagGeneration = async () => {
    const topicsText = formData.topics.filter(t => t.trim()).join(' ');
    if (!topicsText) {
      alert('トピックを入力してください');
      return;
    }

    setIsGeneratingTags(true);
    try {
      const tagResponse = await fetch(`${API_BASE_URL}/tag_generate?topic=${encodeURIComponent(topicsText)}`);
      if (!tagResponse.ok) throw new Error('タグ生成に失敗しました');
      
      const tagData = await tagResponse.json();
      setGeneratedTags(tagData.tags);

    } catch (error) {
      console.error('タグ生成エラー:', error);
      alert('タグ生成に失敗しました');
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // AI推薦機能（既存の機能、タグ生成から分離）
  const handleAIRecommendation = async () => {
    // 既にタグが生成されている場合はそれを使用、なければ生成
    let tagsToUse = generatedTags;
    
    if (tagsToUse.length === 0) {
      const topicsText = formData.topics.filter(t => t.trim()).join(' ');
      if (!topicsText) {
        alert('トピックを入力してください');
        return;
      }

      setIsGeneratingAI(true);
      try {
        // タグ生成
        const tagResponse = await fetch(`${API_BASE_URL}/tag_generate?topic=${encodeURIComponent(topicsText)}`);
        if (!tagResponse.ok) throw new Error('タグ生成に失敗しました');
        
        const tagData = await tagResponse.json();
        tagsToUse = tagData.tags;
        setGeneratedTags(tagData.tags);
      } catch (error) {
        console.error('AI推薦用タグ生成エラー:', error);
        alert('AI推薦に失敗しました');
        setIsGeneratingAI(false);
        return;
      }
    }

    setIsGeneratingAI(true);
    try {
      // おすすめ参加者取得
      const tagString = tagsToUse.join(' ');
      const recommendResponse = await fetch(
        `${API_BASE_URL}/recommend?tag=${encodeURIComponent(tagString)}&top_k=10`
      );
      if (!recommendResponse.ok) throw new Error('参加者推薦に失敗しました');
      
      const recommendData = await recommendResponse.json();
      setRecommendedUsers(recommendData);
      setIsRecommendModalOpen(true);

    } catch (error) {
      console.error('AI推薦エラー:', error);
      alert('AI推薦に失敗しました');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // 推薦結果から参加者を追加
  const addParticipantFromRecommendation = (user: RecommendedUser) => {
    const exists = formData.participants.some(p => p.user_id === user.user_id);
    if (!exists) {
      // 過去の役割を新しい役割体系にマッピング
      let mappedRole = '会議主催者';
      if (user.past_role) {
        switch (user.past_role) {
          case 'host': mappedRole = '会議主催者'; break;
          case 'presenter': mappedRole = '説明責任者'; break;
          case 'participant': mappedRole = '有識相談者'; break;
          case 'observer': mappedRole = '報告先'; break;
          default: mappedRole = '会議主催者';
        }
      }
      
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, {
          user_id: user.user_id,
          name: user.name,
          organization_name: user.organization_name,
          role: mappedRole
        }]
      }));
    }
  };

  // 会議コストの計算
  const getMeetingCost = () => {
    if (!formData.startTime || !formData.endTime || formData.participants.length === 0) {
      return 0;
    }
    return calculateMeetingCost(formData.participants.length + 1, formData.startTime, formData.endTime); // +1は作成者
  };

  // 会議作成・一時保存の共通処理（ルールチェック追加）
  const submitMeeting = async (isDraft: boolean = false) => {
    // バリデーション
    if (!formData.title || !formData.date || !formData.startTime) {
      alert('必須項目を入力してください');
      return;
    }

    // 招集ルールチェック（下書きでない場合のみ）
    if (!isDraft && formData.type && formData.participants.length > 0) {
      const violations = checkMeetingRules(formData.type, formData.participants);
      if (violations.length > 0 && !ignoreRules) {
        setRuleViolations(violations);
        setIsRuleWarningOpen(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 日時の組み立て
      const dateTime = `${formData.date}T${formData.startTime}:00`;

      // 認証されたユーザーIDを使用
      const currentUserId = user.user_id;

      // 1. 会議情報登録
      const meetingResponse = await fetch(`${API_BASE_URL}/meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          meeting_type: formData.type,
          meeting_mode: formData.mode,
          priority: formData.priority,
          date_time: dateTime,
          end_time: formData.endTime,
          created_by: currentUserId,
          status: isDraft ? 'draft' : 'scheduled', // ステータスを設定
          rule_violation: !isDraft && ruleViolations.length > 0 && ignoreRules // ルール違反フラグ
        })
      });

      if (!meetingResponse.ok) throw new Error('会議作成に失敗しました');
      const meetingData = await meetingResponse.json();
      const meetingId = meetingData.meeting_id;

      // 2. アジェンダ登録
      const purposesFiltered = formData.purposes.filter(p => p.trim());
      const topicsFiltered = formData.topics.filter(t => t.trim());
      
      if (purposesFiltered.length > 0 || topicsFiltered.length > 0) {
        await fetch(`${API_BASE_URL}/agenda`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meeting_id: meetingId,
            purposes: purposesFiltered,
            topics: topicsFiltered
          })
        });
      }

      // 3. タグ登録（生成済みタグがあり、一時保存でない場合のみ）
      if (!isDraft && generatedTags.length > 0) {
        const tagsFiltered = generatedTags.filter(tag => tag.trim());
        if (tagsFiltered.length > 0) {
          await fetch(`${API_BASE_URL}/tags_register_batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meeting_id: meetingId,
              tags: tagsFiltered
            })
          });
        }
      }

      // 4. 参加者登録
      if (formData.participants.length > 0) {
        await fetch(`${API_BASE_URL}/attend_batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meeting_id: meetingId,
            participants: formData.participants.map(p => ({
              user_id: p.user_id,
              role_type: p.role
            }))
          })
        });
      }

      alert(isDraft ? '会議を一時保存しました' : '会議を作成しました');
      router.push('/meeting-management');

    } catch (error) {
      console.error('会議作成エラー:', error);
      alert(isDraft ? '会議の一時保存に失敗しました' : '会議作成に失敗しました');
    } finally {
      setIsSubmitting(false);
      setIgnoreRules(false); // リセット
    }
  };

  // 会議作成
  const handleSubmit = () => submitMeeting(false);

  // 一時保存
  const handleSaveDraft = () => submitMeeting(true);

  // ルール違反警告での「理解の上登録」
  const handleAcceptRules = () => {
    setIgnoreRules(true);
    setIsRuleWarningOpen(false);
    submitMeeting(false);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-[#FFEAE0] py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">新しい会議の作成</h1>
            {user && (
              <p className="text-sm text-gray-600 mt-1">
                作成者: {user.name}（{user.organization_name}）
              </p>
            )}
          </div>
        </div>

        {/* 会議コスト表示 */}
        {getMeetingCost() > 0 && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-700 font-semibold">
              予想会議コスト: ¥{getMeetingCost().toLocaleString()}
              （参加者{formData.participants.length + 1}名 × ¥5,000 × {formData.startTime && formData.endTime ? 
                Math.round(((new Date(`2000-01-01T${formData.endTime}:00`).getTime() - 
                new Date(`2000-01-01T${formData.startTime}:00`).getTime()) / (1000 * 60 * 60)) * 10) / 10 : 0}時間）
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* 基本情報 */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">基本情報</CardTitle>
              <p className="text-sm text-gray-600">会議の基本的な情報を入力してください</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">会議タイトル *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="会議のタイトルを入力してください"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">会議概要</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="会議の概要を入力してください"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="type" className="text-sm font-medium text-gray-700">会議種別</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger className="mt-1 w-full bg-white">
                      <SelectValue placeholder="会議種別を選択" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      align="start"
                      className="w-[var(--radix-select-trigger-width)] bg-white border border-gray-200"
                    >
                      <SelectItem value="意思決定会議">意思決定会議</SelectItem>
                      <SelectItem value="情報共有型会議">情報共有型会議</SelectItem>
                      <SelectItem value="課題解決会議">課題解決会議</SelectItem>
                      <SelectItem value="企画構想型会議">企画構想型会議</SelectItem>
                      <SelectItem value="育成評価型会議">育成評価型会議</SelectItem>
                      <SelectItem value="その他">その他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mode" className="text-sm font-medium text-gray-700">会議形式</Label>
                  <Select value={formData.mode} onValueChange={(value) => setFormData(prev => ({ ...prev, mode: value }))}>
                    <SelectTrigger className="mt-1 w-full bg-white">
                      <SelectValue placeholder="会議形式を選択" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      align="start"
                      className="w-[var(--radix-select-trigger-width)] bg-white border border-gray-200"
                    >
                      <SelectItem value="対面会議（オフライン会議）">対面会議（オフライン会議）</SelectItem>
                      <SelectItem value="Web会議（オンライン会議）">Web会議（オンライン会議）</SelectItem>
                      <SelectItem value="ハイブリット会議（複合型会議）">ハイブリット会議（複合型会議）</SelectItem>
                      <SelectItem value="チャット会議（非同期会議）">チャット会議（非同期会議）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority" className="text-sm font-medium text-gray-700">優先度</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger className="mt-1 w-full bg-white">
                      <SelectValue placeholder="優先度を選択" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      align="start"
                      className="w-[var(--radix-select-trigger-width)] bg-white border border-gray-200"
                    >
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="low">低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 日程・時間 */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">日程・時間</CardTitle>
              <p className="text-sm text-gray-600">会議の開催日時を設定してください</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date" className="text-sm font-medium text-gray-700">開催日 *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="startTime" className="text-sm font-medium text-gray-700">開始時間 *</Label>
                  <Select value={formData.startTime} onValueChange={(value) => setFormData(prev => ({ ...prev, startTime: value }))}>
                    <SelectTrigger className="mt-1 w-full bg-white">
                      <SelectValue placeholder="開始時間を選択" />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper"
                      align="start"
                      className="w-[var(--radix-select-trigger-width)] bg-white border border-gray-200 max-h-60"
                    >
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="endTime" className="text-sm font-medium text-gray-700">終了時間</Label>
                  <Select value={formData.endTime} onValueChange={(value) => setFormData(prev => ({ ...prev, endTime: value }))}>
                    <SelectTrigger className="mt-1 w-full bg-white">
                      <SelectValue placeholder="終了時間を選択" />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper"
                      align="start"
                      className="w-[var(--radix-select-trigger-width)] bg-white border border-gray-200 max-h-60"
                    >
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 会議の目的 */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">会議の目的</CardTitle>
              <p className="text-sm text-gray-600">この会議で達成したい目的を設定してください</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.purposes.map((purpose, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={purpose}
                    onChange={(e) => updatePurpose(index, e.target.value)}
                    placeholder="目的を入力してください"
                    className="flex-1"
                  />
                  {formData.purposes.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePurpose(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addPurpose}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                追加
              </Button>
            </CardContent>
          </Card>

          {/* トピック */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">トピック</CardTitle>
              <p className="text-sm text-gray-600">この会議で議論するトピックを設定してください</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.topics.map((topic, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={topic}
                    onChange={(e) => updateTopic(index, e.target.value)}
                    placeholder="トピックを入力してください"
                    className="flex-1"
                  />
                  {formData.topics.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTopic(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTopic}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  追加
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTagGeneration}
                  disabled={isGeneratingTags}
                  className="flex-1 bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  {isGeneratingTags ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  タグ生成
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* タグ欄（新規追加） */}
          {generatedTags.length > 0 && (
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">タグ</CardTitle>
                <p className="text-sm text-gray-600">生成されたタグを確認・編集してください</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {generatedTags.map((tag, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={tag}
                        onChange={(e) => updateTag(index, e.target.value)}
                        placeholder="タグを入力してください"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeTag(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTag}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  タグを追加
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 参加者 */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">参加者</CardTitle>
              <p className="text-sm text-gray-600">会議に参加するメンバーを登録してください</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 参加者追加ボタン */}
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSearchModalOpen(true)}
                  className="flex-1"
                >
                  <Search className="h-4 w-4 mr-2" />
                  氏名から検索
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAIRecommendation}
                  disabled={isGeneratingAI}
                  className="flex-1"
                >
                  {isGeneratingAI ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bot className="h-4 w-4 mr-2" />
                  )}
                  AI推薦
                </Button>
              </div>

              {/* 参加者リスト */}
              {formData.participants.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">登録済み参加者</Label>
                  {formData.participants.map((participant, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{participant.name}</div>
                        <div className="text-sm text-gray-600">{participant.organization_name}</div>
                      </div>
                      <Select
                        value={participant.role}
                        onValueChange={(value) => updateParticipantRole(index, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="会議主催者">会議主催者</SelectItem>
                          <SelectItem value="実行責任者">実行責任者</SelectItem>
                          <SelectItem value="説明責任者">説明責任者</SelectItem>
                          <SelectItem value="有識相談者">有識相談者</SelectItem>
                          <SelectItem value="報告先">報告先</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeParticipant(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ボタン */}
        <div className="flex justify-center space-x-4 py-8">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-orange-600 hover:bg-orange-700 px-8"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                作成中...
              </>
            ) : (
              '会議を作成'
            )}
          </Button>
          <Button
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            variant="outline"
            className="px-8"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                一時保存
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-8"
          >
            キャンセル
          </Button>
        </div>
      </div>

      {/* 招集ルール違反警告モーダル */}
      <Dialog open={isRuleWarningOpen} onOpenChange={setIsRuleWarningOpen}>
        <DialogContent className="max-w-md fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-50">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              招集ルール違反
            </DialogTitle>
            <DialogDescription>
              以下の招集ルールに違反しています。理解の上で登録を継続しますか？
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3">
              {ruleViolations.map((violation, index) => (
                <div key={index} className="bg-red-50 border border-red-200 p-3 rounded">
                  <div className="font-medium text-red-800">{violation.rule}</div>
                  <div className="text-sm text-red-600 mt-1">{violation.message}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsRuleWarningOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleAcceptRules}
              className="bg-red-600 hover:bg-red-700"
            >
              理解の上登録
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 氏名検索モーダル */}
      <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <DialogHeader>
            <DialogTitle>参加者を検索</DialogTitle>
            <DialogDescription>
              氏名を入力して参加者を検索し、会議に追加できます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="氏名を入力してください"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleNameSearch();
                  }
                }}
                autoFocus
              />
              <Button 
                onClick={handleNameSearch} 
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.organization_name}</div>
                      {user.email && (
                        <div className="text-xs text-gray-500">{user.email}</div>
                      )}
                    </div>
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addParticipantFromSearch(user);
                      }}
                      disabled={formData.participants.some(p => p.user_id === user.user_id)}
                    >
                      {formData.participants.some(p => p.user_id === user.user_id) ? '追加済' : '追加'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {searchQuery.trim() && searchResults.length === 0 && !isSearching && (
              <div className="text-center text-gray-500 py-4">
                検索結果が見つかりません
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI推薦結果モーダル */}
      <Dialog open={isRecommendModalOpen} onOpenChange={setIsRecommendModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <DialogHeader>
            <DialogTitle>AI推薦による参加者候補</DialogTitle>
            <DialogDescription>
              トピックに基づいてAIが推薦した参加者候補です。適切な人を選択してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {recommendedUsers.length > 0 ? (
              recommendedUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-600">{user.organization_name}</div>
                    {user.past_role && (
                      <div className="text-xs text-blue-600">過去の役割: {user.past_role}</div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      addParticipantFromRecommendation(user);
                    }}
                    disabled={formData.participants.some(p => p.user_id === user.user_id)}
                  >
                    {formData.participants.some(p => p.user_id === user.user_id) ? '追加済' : '追加'}
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                推薦できる参加者が見つかりません
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 認証保護を適用してコンポーネントをエクスポート
export default withAuth(CreateMeetingPage);