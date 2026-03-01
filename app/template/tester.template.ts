export const getTesterWelcomeEmailTemplate = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to NeuroTrack Beta</title>
  <style>
    body {
      font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #0B0B1E;
      margin: 0;
      padding: 0;
      color: #E2E2E2;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #15152E;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid rgba(108, 59, 255, 0.2);
    }
    .header {
      background: linear-gradient(135deg, #6C3BFF, #00D4C8);
      padding: 48px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .content {
      padding: 48px 40px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 24px;
      color: #ffffff;
    }
    .text {
      line-height: 1.6;
      margin-bottom: 24px;
      color: #B0B0B0;
      font-size: 16px;
    }
    .highlight-box {
      background: rgba(108, 59, 255, 0.1);
      border: 1px dashed rgba(108, 59, 255, 0.4);
      padding: 24px;
      border-radius: 16px;
      margin-bottom: 32px;
    }
    .highlight-box p {
      margin: 0;
      color: #ffffff;
      font-weight: 600;
    }
    .cta-button {
      display: inline-block;
      padding: 16px 32px;
      background: linear-gradient(135deg, #6C3BFF, #5B2EE0);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      text-align: center;
      box-shadow: 0 10px 20px rgba(108, 59, 255, 0.3);
    }
    .footer {
      padding: 32px;
      text-align: center;
      font-size: 14px;
      color: #666;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>NeuroTrack</h1>
    </div>
    <div class="content">
      <p class="greeting">Hello ${name},</p>
      <p class="text">
        Thank you for applying to be a beta tester for NeuroTrack! We're excited to have you on board to help us shape the future of focus and productivity.
      </p>
      
      <div class="highlight-box">
        <p>What's Next?</p>
        <p style="font-weight: 400; font-size: 14px; margin-top: 8px; color: #B0B0B0;">
          We will notify you shortly with specific testing instructions. In the meantime, you can download our early-access build from the Play Store using the link below.
        </p>
      </div>

      <p class="text" style="margin-top: 40px; font-size: 14px;">
        If you have any questions, feel free to reply to this email.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} FocusAI - NeuroTrack Team. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
