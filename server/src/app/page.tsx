export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>AyahFind API Server</h1>
      <p>Backend API for AyahFind mobile application</p>

      <h2>API Endpoints</h2>
      <ul>
        <li>
          <strong>Authentication</strong>
          <ul>
            <li>POST /api/auth/register - Register new user</li>
            <li>POST /api/auth/login - Login user</li>
            <li>POST /api/auth/verify - Verify email</li>
            <li>POST /api/auth/reset-password - Request password reset</li>
            <li>POST /api/auth/refresh - Refresh access token</li>
          </ul>
        </li>
        <li>
          <strong>Recognition</strong>
          <ul>
            <li>POST /api/recognize - Recognize Quran verse from audio</li>
          </ul>
        </li>
        <li>
          <strong>Usage</strong>
          <ul>
            <li>GET /api/usage/validate - Validate usage limits</li>
            <li>POST /api/usage/increment - Increment usage count</li>
            <li>GET /api/usage/stats - Get usage statistics</li>
          </ul>
        </li>
        <li>
          <strong>Quran</strong>
          <ul>
            <li>GET /api/quran/surahs - Get all surahs</li>
            <li>GET /api/quran/surahs/[id] - Get surah details</li>
            <li>GET /api/quran/ayahs/[surahId]/[ayahId] - Get specific ayah</li>
            <li>GET /api/quran/search - Search Quran</li>
          </ul>
        </li>
        <li>
          <strong>Subscriptions</strong>
          <ul>
            <li>GET /api/subscriptions/status - Get subscription status</li>
            <li>POST /api/subscriptions/manage - Manage subscription</li>
          </ul>
        </li>
        <li>
          <strong>Webhooks</strong>
          <ul>
            <li>POST /api/webhooks/revenuecat - RevenueCat webhook</li>
            <li>POST /api/webhooks/paystack - Paystack webhook</li>
          </ul>
        </li>
      </ul>

      <h2>Status</h2>
      <p>✅ Server is running</p>
      <p>Environment: {process.env.NODE_ENV}</p>
    </main>
  );
}
