// pages/api/version.js
// Temporary diagnostic endpoint - tells us what code version Vercel is running
export default function handler(req, res) {
  res.status(200).json({
    version: 'v4-printlink',
    timestamp: new Date().toISOString(),
    hasResendKey: !!process.env.RESEND_API_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET - using fallback',
    emailDomain: process.env.EMAIL_DOMAIN || 'NOT SET',
  })
}
