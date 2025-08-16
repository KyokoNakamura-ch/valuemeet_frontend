'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Play, 
  Pause,
  Star, 
  Download, 
  FileText, 
  MessageSquare, 
  Target, 
  Clock, 
  Users,
  Loader2
} from 'lucide-react';
import { useAuth, withAuth } from '../../../AuthContext';

// API Base URL (環境に応じて変更してください)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// UIコンポーネントのインポートを追加
type ButtonVariant = 'default' | 'outline' | 'ghost';
type ButtonSize = 'default' | 'sm';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  [key: string]: any;
}

const Button = ({ children, onClick, variant = 'default', size = 'default', className = '', disabled = false, ...props }: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variants: Record<ButtonVariant, string> = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };
  const sizes: Record<ButtonSize, string> = {
    default: 'h-10 py-2 px-4',
    sm: 'h-9 px-3 rounded-md',
  };
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', ...props }: any) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '', ...props }: any) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '', ...props }: any) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

const CardContent = ({ children, className = '', ...props }: any) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);

const Badge = ({ children, className = '', ...props }: any) => (
  <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`} {...props}>
    {children}
  </div>
);

// 型定義
interface Meeting {
  meeting_id: number;
  title: string;
  description?: string;
  meeting_type?: string;
  meeting_mode?: string;
  priority?: string;
  date_time: string;
  end_time?: string;
  created_by: string;
  status?: string;
}

interface Participant {
  user_id: string;
  name: string;
  organization_name: string;
  role_type: string;
  email?: string;
}

interface Agenda {
  agenda_id: number;
  meeting_id: number;
  purpose?: string;
  topic?: string;
}

interface Minute {
  time: string;
  speaker: string;
  content: string;
}

function MeetingFacilitation() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth(); // 認証されたユーザー情報を取得
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [agendaItems, setAgendaItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 会議進行状態
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [currentAgenda, setCurrentAgenda] = useState(0);

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
      const meetingId = params.id as string;
      if (!meetingId) {
        router.push('/meeting-management');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 並行して会議詳細、参加者、アジェンダを取得
        const [meetingResponse, participantsResponse, agendaResponse] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/meeting/${meetingId}`),
          fetch(`${API_BASE_URL}/meeting/${meetingId}/participants`),
          fetch(`${API_BASE_URL}/meeting/${meetingId}/agenda`)
        ]);

        // 会議詳細の処理
        if (meetingResponse.status === 'fulfilled' && meetingResponse.value.ok) {
          const meetingData = await meetingResponse.value.json();
          setMeeting(meetingData);
        } else {
          throw new Error('会議詳細の取得に失敗しました');
        }

        // 参加者の処理
        if (participantsResponse.status === 'fulfilled' && participantsResponse.value.ok) {
          const participantsData = await participantsResponse.value.json();
          setParticipants(participantsData);
        } else {
          console.warn('参加者情報の取得に失敗しました');
          setParticipants([]);
        }

        // アジェンダの処理
        if (agendaResponse.status === 'fulfilled' && agendaResponse.value.ok) {
          const agendaData = await agendaResponse.value.json();
          setAgenda(agendaData);
          
          // アジェンダからアイテムリストを作成
          const items = [];
          if (agendaData.purpose) {
            const purposes = agendaData.purpose.split('||').filter((p: string) => p.trim());
            items.push(...purposes.map((p: string) => `目的: ${p.trim()}`));
          }
          if (agendaData.topic) {
            const topics = agendaData.topic.split('||').filter((t: string) => t.trim());
            items.push(...topics.map((t: string) => `トピック: ${t.trim()}`));
          }
          
          if (items.length === 0) {
            items.push('アジェンダが設定されていません');
          }
          
          setAgendaItems(items);
        } else {
          console.warn('アジェンダ情報の取得に失敗しました');
          setAgendaItems(['アジェンダが設定されていません']);
        }

      } catch (error) {
        console.error('会議データ取得エラー:', error);
        setError('会議データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetingData();
  }, [params.id, router]);

  // ローディング表示
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

  // エラー表示
  if (error || !meeting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || '会議が見つかりません'}
          </h2>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
        </div>
      </div>
    );
  }

  // 日時のフォーマット
  const formatDateTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      }) + ' ' + date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateTimeString;
    }
  };

  const handleStartMeeting = () => {
    if (!isStarted) {
      // 初回開始
      setIsStarted(true);
      setIsPaused(false);
      
      // 開始時の議事録を追加
      const startMinute: Minute = {
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        speaker: 'システム',
        content: `${meeting.title} を開始しました。`
      };
      setMinutes([startMinute]);
    } else {
      // 開始後は停止/再開を切り替え
      setIsPaused(!isPaused);
      
      const actionMinute: Minute = {
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        speaker: 'システム',
        content: isPaused ? '会議を再開しました。' : '会議を一時停止しました。'
      };
      setMinutes(prev => [...prev, actionMinute]);
    }
  };

  const handleOpenEvaluation = () => {
    router.push(`/evaluation/form?title=${encodeURIComponent(meeting.title)}&facilitator=${encodeURIComponent(user.name)}`);
  };

  const handleOpenTodoExtraction = () => {
    router.push('/todo-extraction');
  };

  const handleFacilitationAction = (action: string) => {
    const newMinute: Minute = {
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      speaker: 'ファシリテーター',
      content: `${action}を実行しました。`
    };
    setMinutes(prev => [...prev, newMinute]);
  };

  const handleExport = (format: 'pdf' | 'txt') => {
    // Mock export functionality
    const content = minutes.map(m => `[${m.time}] ${m.speaker}: ${m.content}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title}_議事録.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#FFEAE0] py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
              <p className="text-gray-600">
                {formatDateTime(meeting.date_time)}
                {meeting.meeting_mode && ` | ${meeting.meeting_mode}`}
              </p>
              {meeting.description && (
                <p className="text-sm text-gray-600 mt-1">{meeting.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={handleStartMeeting}
              className={`${
                !isStarted 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : isPaused 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {!isStarted ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  開始
                </>
              ) : isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  再開
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  停止
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleOpenEvaluation}>
              <Star className="h-4 w-4 mr-2" />
              評価
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Top Row - Agenda and Facilitation Tools */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Agenda */}
            <Card className="bg-white h-fit">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">アジェンダ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {agendaItems.map((item: string, index: number) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      index === currentAgenda 
                        ? 'bg-orange-50 border-orange-200' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => setCurrentAgenda(index)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{item}</span>
                      {index === currentAgenda && (
                        <Badge className="bg-orange-600 text-white">進行中</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Right Column - Facilitation Tools */}
            <Card className="bg-white h-fit">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">ファシリテーションツール</CardTitle>
                <p className="text-sm text-gray-600">会議進行をサポートするツールです</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => handleFacilitationAction('発言を促す')}
                  className="w-full justify-start bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                  variant="outline"
                >
                  <MessageSquare className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">発言を促す</div>
                    <div className="text-xs text-blue-600">参加者の意見を引き出します</div>
                  </div>
                </Button>

                <Button 
                  onClick={() => handleFacilitationAction('論点整理')}
                  className="w-full justify-start bg-green-50 hover:bg-green-100 text-green-700 border border-green-200"
                  variant="outline"
                >
                  <Target className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">論点整理</div>
                    <div className="text-xs text-green-600">議論の要点をまとめます</div>
                  </div>
                </Button>

                <Button 
                  onClick={() => handleFacilitationAction('決定事項記録')}
                  className="w-full justify-start bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200"
                  variant="outline"
                >
                  <FileText className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">決定事項記録</div>
                    <div className="text-xs text-purple-600">重要な決定を記録します</div>
                  </div>
                </Button>

                <Button 
                  onClick={() => handleFacilitationAction('時間管理')}
                  className="w-full justify-start bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200"
                  variant="outline"
                >
                  <Clock className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">時間管理</div>
                    <div className="text-xs text-orange-600">時間配分を調整します</div>
                  </div>
                </Button>

                {/* Meeting Info */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">会議情報</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      参加者: {participants.length}名
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      時間: {formatDateTime(meeting.date_time)}
                      {meeting.end_time && ` - ${meeting.end_time}`}
                    </div>
                    {meeting.meeting_type && (
                      <div>
                        <span className="font-medium">会議種別:</span> {meeting.meeting_type}
                      </div>
                    )}
                    {meeting.priority && (
                      <div>
                        <span className="font-medium">優先度:</span> {meeting.priority}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">主催者:</span> {user.name}（{user.organization_name}）
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row - Real-time Minutes (Full Width) */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">リアルタイム議事録</CardTitle>
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleExport('pdf')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleExport('txt')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  TXT
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenTodoExtraction}>
                  抽出
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {minutes.length > 0 ? (
                  minutes.map((minute, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <span className="text-xs text-gray-500 font-mono bg-white px-2 py-1 rounded">
                          {minute.time}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900 mb-1">
                            {minute.speaker}
                          </div>
                          <div className="text-sm text-gray-700">
                            {minute.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    会議を開始すると議事録が表示されます
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Participants Section */}
          {participants.length > 0 && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">参加者一覧</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {participants.map((participant, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">{participant.name}</div>
                      <div className="text-sm text-gray-600">{participant.organization_name}</div>
                      <div className="text-xs text-blue-600 mt-1">{participant.role_type}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// 認証保護を適用してコンポーネントをエクスポート
export default withAuth(MeetingFacilitation);