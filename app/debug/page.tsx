export default function DebugPage() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '設定済み' : '未設定',
    NODE_ENV: process.env.NODE_ENV,
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">デバッグ情報</h1>
      <div className="space-y-2">
        <p>
          <strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {envVars.NEXT_PUBLIC_SUPABASE_URL}
        </p>
        <p>
          <strong>SUPABASE_SERVICE_ROLE_KEY:</strong> {envVars.SUPABASE_SERVICE_ROLE_KEY}
        </p>
        <p>
          <strong>NODE_ENV:</strong> {envVars.NODE_ENV}
        </p>
      </div>
    </div>
  );
}
