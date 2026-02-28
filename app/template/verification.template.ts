export const getBulkVerificationEmailTemplate = (
  name: string,
  message: string,
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NeuroTrack Update</title>
  <style>
    body {
      font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f4f9;
      margin: 0;
      padding: 0;
      color: #333333;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e1e1e1;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: #6C3BFF;
      padding: 32px;
      text-align: center;
      color: #ffffff;
    }
    .content {
      padding: 40px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 20px;
    }
    .message {
      line-height: 1.6;
      font-size: 16px;
      white-space: pre-wrap;
    }
    .footer {
      padding: 24px;
      text-align: center;
      font-size: 13px;
      color: #999;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">NeuroTrack Update</h1>
    </div>
    <div class="content">
      <p class="greeting">Hello ${name},</p>
      <div class="message">${message}</div>
    </div>
    <div class="footer">
      Sent with NeuroTrack Admin Panel.
    </div>
  </div>
</body>
</html>
`;
