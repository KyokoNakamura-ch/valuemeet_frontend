'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, X, ArrowLeft, Search, Bot, Loader2, Save, Sparkles } from 'lucide-react';
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

interface Meeting {
  meeting_id: number;
  title: string;
  description?: string;
  meeting_type?: string;
  meeting_mode?: string;
  priority?: string;
  date_time: string;
  created_by: string;
  status?: string;
  purposes?: string[];
  topics?: string[];
  participants?: Participant[];
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

function EditMeetingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = searchParams.get('id');
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
    status: 'draft',
    purposes: [''],     // 目的（配列）
    topics: [''],       // トピック（配列）
    participants: [] as Participant[]
  });

  const [isLoading, setIsLoading] = useState(true);
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

  // 会議データの取得
  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!meetingId) {
        router.push('/meeting-management');
        return;
      }

      setIsLoading(true);
      try {
        // ステップ1: 会議詳細を取得
        console.log(`会議詳細を取得中: ${meetingId}`);
        const meetingResponse = await fetch(`${API_BASE_URL}/meeting/${meetingId}`);
        if (!meetingResponse.ok) {
          throw new Error('会議詳細の取得に失敗しました');
        }
        const meetingDetail = await meetingResponse.json();

        // ステップ2: 日時の分割
        const dateTime = new Date(meetingDetail.date_time);
        const date = dateTime.toISOString().split('T')[0];
        const startTime = dateTime.toTimeString().slice(0, 5);

        // 基本情報の設定
        setFormData(prev => ({
          ...prev,
          title: meetingDetail.title || '',
          description: meetingDetail.description || '',
          type: meetingDetail.meeting_type || '',
          mode: meetingDetail.meeting_mode || '',
          priority: meetingDetail.priority || '',
          date: date,
          startTime: startTime,
          endTime: meetingDetail.end_time || '',
          status: meetingDetail.status || 'draft'
        }));

        // ステップ3: 並行してアジェンダと参加者を取得
        await Promise.all([
          fetchMeetingAgenda(parseInt(meetingId)),
          fetchMeetingParticipants(parseInt(meetingId))
        ]);

      } catch (error) {
        console.error('会議データ取得エラー:', error);
        
        // フォールバック: 会議一覧APIから基本情報のみ取得
        try {
          console.log('フォールバック: 会議一覧APIから取得中...');
          const listResponse = await fetch(`${API_BASE_URL}/meeting_list?user_id=${user.user_id}`);
          if (listResponse.ok) {
            const meetingList = await listResponse.json();
            const meeting = meetingList.find((m: any) => m.meeting_id === parseInt(meetingId));
            
            if (meeting) {
              const dateTime = new Date(meeting.date_time);
              const date = dateTime.toISOString().split('T')[0];
              const time = dateTime.toTimeString().slice(0, 5);

              setFormData(prev => ({
                ...prev,
                title: meeting.title || '',
                type: meeting.meeting_type || '',
                mode: meeting.meeting_mode || '',
                date: date,
                startTime: time,
                status: 'scheduled'
              }));
            } else {
              throw new Error('会議が見つかりません');
            }
          } else {
            throw new Error('フォールバックAPIも失敗しました');
          }
        } catch (fallbackError) {
          console.error('フォールバックエラー:', fallbackError);
          alert('会議データの取得に失敗しました');
          router.push('/meeting-management');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetingData();
  }, [meetingId, user.user_id, router]);

  // 会議アジェンダの取得
  const fetchMeetingAgenda = async (id: number) => {
    try {
      console.log(`アジェンダを取得中: ${id}`);
      const response = await fetch(`${API_BASE_URL}/meeting/${id}/agenda`);
      if (response.ok) {
        const agenda = await response.json();
        
        // データベースから取得した目的とトピックを配列に変換
        let purposes = [''];
        let topics = [''];
        
        if (agenda.purpose) {
          // "||"区切りで分割
          const purposeArray = agenda.purpose.split('||').filter((p: string) => p.trim());
          purposes = purposeArray.length > 0 ? purposeArray : [''];
        }
        
        if (agenda.topic) {
          // "||"区切りで分割
          const topicArray = agenda.topic.split('||').filter((t: string) => t.trim());
          topics = topicArray.length > 0 ? topicArray : [''];
        }

        setFormData(prev => ({
          ...prev,
          purposes: purposes,
          topics: topics
        }));
        
        console.log('アジェンダ取得完了:', { purposes, topics });
      } else {
        console.log('アジェンダが見つかりません（新規会議の可能性）');
      }
    } catch (error) {
      console.error('アジェンダ取得エラー:', error);
    }
  };

  // 参加者情報の取得
  const fetchMeetingParticipants = async (id: number) => {
    try {
      console.log(`参加者を取得中: ${id}`);
      const response = await fetch(`${API_BASE_URL}/meeting/${id}/participants`);
      if (response.ok) {
        const participantsData = await response.json();
        
        // 参加者データを整形
        const participants = participantsData.map((p: any) => ({
          user_id: p.user_id,
          name: p.name,
          organization_name: p.organization_name || '',
          role: p.role_type || 'participant',
          email: p.email
        }));

        setFormData(prev => ({
          ...prev,
          participants: participants
        }));
        
        console.log('参加者取得完了:', participants);
      } else {
        console.log('参加者が見つかりません（新規会議の可能性）');
      }
    } catch (error) {
      console.error('参加者取得エラー:', error);
    }
  };

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
          role: 'participant',
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
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, {
          user_id: user.user_id,
          name: user.name,
          organization_name: user.organization_name,
          role: user.past_role || 'participant'
        }]
      }));
    }
  };

  // 会議更新・一時保存の共通処理（削除→再作成）
  const submitMeeting = async (isDraft: boolean = false) => {
    // バリデーション
    if (!formData.title || !formData.date || !formData.startTime) {
      alert('必須項目を入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      // 日時の組み立て
      const dateTime = `${formData.date}T${formData.startTime}:00`;

      // 認証されたユーザーIDを使用
      const currentUserId = user.user_id;

      // ステップ1: 既存会議を削除
      console.log(`既存会議を削除中: ${meetingId}`);
      const deleteResponse = await fetch(`${API_BASE_URL}/meeting/${meetingId}`, {
        method: 'DELETE'
      });

      if (!deleteResponse.ok) {
        throw new Error('既存会議の削除に失敗しました');
      }

      // ステップ2: 新しい会議を作成
      console.log('新しい会議を作成中...');
      const meetingResponse = await fetch(`${API_BASE_URL}/meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          meeting_type: formData.type || null,
          meeting_mode: formData.mode || null,
          priority: formData.priority,
          date_time: dateTime,
          end_time: formData.endTime, 
          created_by: currentUserId,
          status: isDraft ? 'draft' : 'scheduled'
        })
      });

      if (!meetingResponse.ok) {
        throw new Error('新しい会議の作成に失敗しました');
      }

      const meetingData = await meetingResponse.json();
      const newMeetingId = meetingData.meeting_id;
      console.log(`新しい会議が作成されました: ${newMeetingId}`);

      // ステップ3: アジェンダ登録
      const purposesFiltered = formData.purposes.filter(p => p.trim());
      const topicsFiltered = formData.topics.filter(t => t.trim());
      
      if (purposesFiltered.length > 0 || topicsFiltered.length > 0) {
        console.log('アジェンダを登録中...');
        const agendaResponse = await fetch(`${API_BASE_URL}/agenda`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meeting_id: newMeetingId,
            purposes: purposesFiltered,
            topics: topicsFiltered
          })
        });

        if (!agendaResponse.ok) {
          console.warn('アジェンダの登録に失敗しましたが、会議は作成されました');
        }
      }

      // ステップ4: タグ登録（生成済みタグがある場合）
      const tagsFiltered = generatedTags.filter(tag => tag.trim());
      if (tagsFiltered.length > 0) {
        console.log('タグを登録中...');
        const tagsResponse = await fetch(`${API_BASE_URL}/tags_register_batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meeting_id: newMeetingId,
            tags: tagsFiltered
          })
        });

        if (!tagsResponse.ok) {
          console.warn('タグの登録に失敗しましたが、会議は作成されました');
        }
      }

      // ステップ5: 参加者登録
      if (formData.participants.length > 0) {
        console.log('参加者を登録中...');
        const participantsResponse = await fetch(`${API_BASE_URL}/attend_batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meeting_id: newMeetingId,
            participants: formData.participants.map(p => ({
              user_id: p.user_id,
              role_type: p.role
            }))
          })
        });

        if (!participantsResponse.ok) {
          console.warn('参加者の登録に失敗しましたが、会議は作成されました');
        }
      }

      console.log('会議の更新（削除→再作成）が完了しました');
      alert(isDraft ? '会議を一時保存しました' : '会議を更新しました');
      router.push('/meeting-management');

    } catch (error) {
      console.error('会議更新エラー:', error);
      
      // エラーの詳細をユーザーに表示
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      alert(`${isDraft ? '会議の一時保存' : '会議更新'}に失敗しました: ${errorMessage}`);
      
      // 開発環境では詳細なエラー情報をコンソールに出力
      if (process.env.NODE_ENV === 'development') {
        console.error('詳細なエラー情報:', error);
        console.error('送信データ:', {
          title: formData.title,
          meeting_type: formData.type,
          meeting_mode: formData.mode,
          date_time: `${formData.date}T${formData.startTime}:00`,
          created_by: user.user_id,
          status: isDraft ? 'draft' : 'scheduled'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 会議更新
  const handleSubmit = () => submitMeeting(false);

  // 一時保存
  const handleSaveDraft = () => submitMeeting(true);

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">会議データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">会議を編集</h1>
            {user && (
              <p className="text-sm text-gray-600 mt-1">
                編集者: {user.name}（{user.organization_name}）
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* 基本情報 */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">基本情報</CardTitle>
              <p className="text-sm text-gray-600">会議の基本的な情報を編集してください</p>
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
                      <SelectItem value="企画想造型会議">企画想造型会議</SelectItem>
                      <SelectItem value="育成評価会議">育成評価会議</SelectItem>
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
              <p className="text-sm text-gray-600">会議の開催日時を編集してください</p>
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
              <p className="text-sm text-gray-600">この会議で達成したい目的を編集してください</p>
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
              <p className="text-sm text-gray-600">この会議で議論するトピックを編集してください</p>
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
              <p className="text-sm text-gray-600">会議に参加するメンバーを編集してください</p>
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
                        <SelectTrigger className="w-40 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent 
                          position="popper" 
                          align="start"
                          className="w-[var(--radix-select-trigger-width)] bg-white border border-gray-200"
                        >
                          <SelectItem value="host">主催者</SelectItem>
                          <SelectItem value="presenter">発表者</SelectItem>
                          <SelectItem value="participant">参加者</SelectItem>
                          <SelectItem value="observer">オブザーバー</SelectItem>
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
                更新中...
              </>
            ) : (
              '会議を更新'
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
export default withAuth(EditMeetingPage);