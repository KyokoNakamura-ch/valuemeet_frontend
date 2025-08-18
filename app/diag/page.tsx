// app/diag/page.tsx
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const API =
    process.env.NEXT_PUBLIC_API_URL ??
    (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : undefined);

  if (!API) {
    // 本番でここに来たら Vercel の Production に環境変数が入ってない
    return (
      <main style={{ padding: 20 }}>
        <h1>Diag</h1>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
{`NEXT_PUBLIC_API_URL is not set.
Vercel → Project → Settings → Environment Variables (Production) を確認してください。`}
        </pre>
      </main>
    );
  }

  const url = `${API}/api/todos/extract`;

  let result: any;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    result = {
      url,
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body: (await res.text()).slice(0, 500),
    };
  } catch (e: any) {
    result = { url, error: e.message || String(e) };
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Diag</h1>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </main>
  );
}
