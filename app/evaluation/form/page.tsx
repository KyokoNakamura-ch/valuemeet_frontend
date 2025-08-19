// 'use client';

// import { useState } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Star, ArrowLeft } from 'lucide-react';

// export default function EvaluationFormPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const meetingTitle = searchParams.get('title') || '会議';
//   const facilitator = searchParams.get('facilitator') || '田中太郎';

//   const [ratings, setRatings] = useState({
//     satisfaction: 0,
//     participation: 0,
//     contribution: 0,
//     facilitation: 0
//   });
//   const [feedback, setFeedback] = useState('');

//   const handleRatingChange = (question: keyof typeof ratings, rating: number) => {
//     setRatings(prev => ({
//       ...prev,
//       [question]: rating
//     }));
//   };

//   const handleSubmit = () => {
//     const evaluation = {
//       meetingTitle,
//       ratings,
//       feedback,
//       submittedAt: new Date().toISOString()
//     };
//     console.log('評価を送信:', evaluation);
//     // TODO: 評価データの送信処理
//     router.push('/evaluation');
//   };

//   const handleCancel = () => {
//     router.back();
//   };

//   const renderStars = (currentRating: number, onRatingChange: (rating: number) => void) => {
//     return (
//       <div className="flex space-x-1">
//         {Array.from({ length: 5 }, (_, i) => (
//           <Star
//             key={i}
//             className={`h-6 w-6 cursor-pointer transition-colors ${
//               i < currentRating 
//                 ? 'text-yellow-400 fill-current' 
//                 : 'text-gray-300 hover:text-yellow-200'
//             }`}
//             onClick={() => onRatingChange(i + 1)}
//           />
//         ))}
//       </div>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-[#FFEAE0] py-8">
//       <div className="container mx-auto px-4 max-w-4xl">
//         {/* Header */}
//         <div className="flex items-center mb-6">
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={handleCancel}
//             className="mr-4"
//           >
//             <ArrowLeft className="h-4 w-4 mr-2" />
//             戻る
//           </Button>
//           <h1 className="text-2xl font-bold text-gray-900">会議評価</h1>
//         </div>

//         <Card className="bg-white shadow-sm">
//           <CardHeader className="pb-6">
//             <CardTitle className="text-xl font-bold text-gray-900 text-center">
//               {meetingTitle}
//             </CardTitle>
//             <div className="text-center mt-4">
//               <h2 className="text-lg font-semibold text-gray-900">評価シート</h2>
//               <p className="text-gray-600 mt-1">参加した会議の評価を教えてください</p>
//             </div>
//           </CardHeader>

//           <CardContent className="space-y-6">
//             {/* Q1: 会議全体の満足度 */}
//             <div className="flex items-center justify-between">
//               <div className="flex-1">
//                 <p className="text-gray-900 font-medium">Q1. 会議全体の満足度を教えてください</p>
//               </div>
//               <div className="ml-4">
//                 {renderStars(ratings.satisfaction, (rating) => handleRatingChange('satisfaction', rating))}
//               </div>
//             </div>

//             {/* Q2: 次回参加意向 */}
//             <div className="flex items-center justify-between">
//               <div className="flex-1">
//                 <p className="text-gray-900 font-medium">Q2. 次回もこの会議に参加したいですか？</p>
//               </div>
//               <div className="ml-4">
//                 {renderStars(ratings.participation, (rating) => handleRatingChange('participation', rating))}
//               </div>
//             </div>

//             {/* Q3: 貢献度 */}
//             <div className="flex items-center justify-between">
//               <div className="flex-1">
//                 <p className="text-gray-900 font-medium">Q3. あなたはこの会議でどのくらい貢献できましたか？</p>
//               </div>
//               <div className="ml-4">
//                 {renderStars(ratings.contribution, (rating) => handleRatingChange('contribution', rating))}
//               </div>
//             </div>

//             {/* Q4: ファシリテーション */}
//             <div className="flex items-center justify-between">
//               <div className="flex-1">
//                 <p className="text-gray-900 font-medium">Q4. ファシリテーションはいかがでしたか？</p>
//                 <p className="text-[#BDBDBD] text-sm mt-1">ファシリテーター: {facilitator}</p>
//               </div>
//               <div className="ml-4">
//                 {renderStars(ratings.facilitation, (rating) => handleRatingChange('facilitation', rating))}
//               </div>
//             </div>

//             {/* Q5: 自由記述 */}
//             <div className="space-y-3">
//               <p className="text-gray-900 font-medium">Q5. 良かった点・改善点・気づいた点があれば記入してください</p>
//               <Textarea
//                 value={feedback}
//                 onChange={(e) => setFeedback(e.target.value)}
//                 placeholder="ご意見・ご感想をお聞かせください..."
//                 className="min-h-[100px] resize-none"
//                 rows={4}
//               />
//             </div>

//             {/* ボタン */}
//             <div className="flex justify-center space-x-4 pt-6 border-t border-gray-200">
//               <Button
//                 onClick={handleSubmit}
//                 className="bg-orange-600 hover:bg-orange-700 px-8"
//               >
//                 登録
//               </Button>
//               <Button
//                 variant="outline"
//                 onClick={handleCancel}
//                 className="px-8"
//               >
//                 戻る
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, ArrowLeft } from 'lucide-react';

export default function EvaluationFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const meetingTitle = searchParams.get('title') || '会議';
  const facilitator = searchParams.get('facilitator') || '田中太郎';

  // ★ 追加: Backendに渡すIDをクエリから取得（デフォルトはサンプルと同じ）
  const meetingId = Number(searchParams.get('meeting_id') ?? '1');
  const userId = searchParams.get('user_id') ?? 'A000001';

  const [ratings, setRatings] = useState({
    satisfaction: 0,
    participation: 0,
    contribution: 0,
    facilitation: 0
  });
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRatingChange = (question: keyof typeof ratings, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [question]: rating
    }));
  };

  // ★ 変更: 送信処理（Backendの期待JSONにマップしてPOST）
  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      meeting_id: meetingId,
      user_id: userId,
      satisfaction: Number(ratings.satisfaction),
      rejoin_intent: Number(ratings.participation),
      self_contribution: Number(ratings.contribution),
      facilitator_rating: Number(ratings.facilitation),
      comment: (feedback ?? '').trim()
    };

    try {
      const base = process.env.NEXT_PUBLIC_API_URL; // 例: https://api.example.com
      if (!base) throw new Error('NEXT_PUBLIC_API_URL が未設定です。');

      const res = await fetch(`${base}/evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 認証クッキー等が必要なら credentials: 'include' を追加
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text || '送信に失敗しました'}`);
      }

      // 成功時の遷移はお好みで
      router.push('/evaluation'); // 例: サンクス/一覧ページへ
    } catch (err: any) {
      setErrorMsg(err?.message || '不明なエラーです');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const renderStars = (currentRating: number, onRatingChange: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-6 w-6 cursor-pointer transition-colors ${
              i < currentRating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300 hover:text-yellow-200'
            }`}
            onClick={() => onRatingChange(i + 1)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FFEAE0] py-8">
      <div className="container mx-auto px-4 max-w-4xl">
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
          <h1 className="text-2xl font-bold text-gray-900">会議評価</h1>
        </div>

        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900 text-center">
              {meetingTitle}
            </CardTitle>
            <div className="text-center mt-2 text-sm text-gray-600">
              <span className="mr-2">ファシリテーター: {facilitator}</span>
              {/* ★ 追加: 送信対象のメタ表示 */}
              <span className="mx-2">／ Meeting ID: {meetingId}</span>
              <span className="mx-2">／ User ID: {userId}</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Q1: 会議全体の満足度 */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-900 font-medium">Q1. 会議全体の満足度を教えてください</p>
              </div>
              <div className="ml-4">
                {renderStars(ratings.satisfaction, (rating) => handleRatingChange('satisfaction', rating))}
              </div>
            </div>

            {/* Q2: 次回参加意向 */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-900 font-medium">Q2. 次回もこの会議に参加したいですか？</p>
              </div>
              <div className="ml-4">
                {renderStars(ratings.participation, (rating) => handleRatingChange('participation', rating))}
              </div>
            </div>

            {/* Q3: 貢献度 */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-900 font-medium">Q3. あなたはこの会議でどのくらい貢献できましたか？</p>
              </div>
              <div className="ml-4">
                {renderStars(ratings.contribution, (rating) => handleRatingChange('contribution', rating))}
              </div>
            </div>

            {/* Q4: ファシリテーション */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-900 font-medium">Q4. ファシリテーションはいかがでしたか？</p>
                <p className="text-[#BDBDBD] text-sm mt-1">ファシリテーター: {facilitator}</p>
              </div>
              <div className="ml-4">
                {renderStars(ratings.facilitation, (rating) => handleRatingChange('facilitation', rating))}
              </div>
            </div>

            {/* Q5: 自由記述 */}
            <div className="space-y-3">
              <p className="text-gray-900 font-medium">Q5. 良かった点・改善点・気づいた点があれば記入してください</p>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="ご意見・ご感想をお聞かせください..."
                className="min-h-[100px] resize-none"
                rows={4}
              />
            </div>

            {/* エラーメッセージ */}
            {errorMsg && (
              <div className="text-red-600 text-sm">
                {errorMsg}
              </div>
            )}

            {/* ボタン */}
            <div className="flex justify-center space-x-4 pt-6 border-t border-gray-200">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-orange-600 hover:bg-orange-700 px-8 disabled:opacity-60"
              >
                {submitting ? '送信中…' : '登録'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="px-8"
              >
                戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

