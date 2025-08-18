import React from 'react';
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const API = process.env.NEXT_PUBLIC_API_URL;

async function serverProbe(path: string) {
  if (!API) return { where: 'server', error: 'NEXT_PUBLIC_API_URL not set' };
  const url = `${API}${path}`;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    const body = (await r.text()).slice(0, 600);
    return { where: 'server', url, status: r.status, statusText: r.statusText,
             headers: Object.fromEntries(r.headers.entries()), body };
  } catch (e:any) {
    return { where: 'server', url, error: e.message || String(e) };
  }
}

function ClientProbe({ path }: { path: string }) {
  const [out, setOut] = React.useState<any>(null);
  React.useEffect(() => {
    if (!API) return setOut({ where: 'client', error: 'NEXT_PUBLIC_API_URL not set' });
    const url = `${API}${path}`;
    (async () => {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        const body = (await r.text()).slice(0, 600);
        setOut({ where: 'client', url, status: r.status, statusText: r.statusText,
                 headers: Object.fromEntries(r.headers.entries()), body });
      } catch (e:any) { setOut({ where: 'client', url, error: e.message || String(e) }); }
    })();
  }, [path]);
  return <pre style={{whiteSpace:'pre-wrap', fontSize:12}}>{JSON.stringify(out, null, 2)}</pre>;
}

export default async function Page() {
  const target = '/api/todos/extract'; // 見たいパス
  const server = await serverProbe(target);
  return (
    <main style={{ padding: 16 }}>
      <h1>diag</h1>
      <div style={{fontFamily:'monospace'}}>API: {API ?? '(unset)'}</div>
      <h2>server</h2>
      <pre style={{whiteSpace:'pre-wrap', fontSize:12}}>{JSON.stringify(server, null, 2)}</pre>
      <h2>client</h2>
      <ClientProbe path={target} />
    </main>
  );
}