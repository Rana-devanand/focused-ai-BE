export const getWelcomeEmailTemplate = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Focused AI</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #1a1a1a;
      padding: 40px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header img {
      max-width: 120px;
      margin-bottom: 20px;
      border-radius: 12px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 300;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 20px;
      margin-bottom: 20px;
      color: #333;
    }
    .intro {
      line-height: 1.6;
      margin-bottom: 30px;
      color: #555;
    }
    .feature-list {
      list-style: none;
      padding: 0;
      margin: 0 0 30px 0;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .feature-icon {
      background-color: #e0e7ff;
      color: #4f46e5;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-right: 15px;
      flex-shrink: 0;
    }
    .feature-text h3 {
      margin: 0 0 5px 0;
      font-size: 18px;
      color: #1f2937;
    }
    .feature-text p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.5;
    }
    .cta-button {
      display: block;
      width: fit-content;
      margin: 0 auto;
      padding: 12px 30px;
      background-color: #4f46e5;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      text-align: center;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="cid:appLogo" alt="Focused AI Logo">
      <h1>Welcome to Focused AI</h1>
    </div>
    <div class="content">
      <p class="greeting">Hello ${name || "there"},</p>
      <p class="intro">
        We're thrilled to have you on board! Focused AI is designed to help you reclaim your time and boost your productivity through passive intelligence. Here is what you can expect:
      </p>
      
      <ul class="feature-list">
        <li class="feature-item">
          <div class="feature-icon">🚀</div>
          <div class="feature-text">
            <h3>Passive Intelligence</h3>
            <p>Seamlessly integrates with your calendar and email to provide actionable insights without manual input.</p>
          </div>
        </li>
        <li class="feature-item">
          <div class="feature-icon">⚡</div>
          <div class="feature-text">
            <h3>AI-Powered Focus</h3>
            <p>Smart focus sessions that adapt to your energy levels and schedule to maximize deep work.</p>
          </div>
        </li>
        <li class="feature-item">
          <div class="feature-icon">📊</div>
          <div class="feature-text">
            <h3>Smart Analytics</h3>
            <p>Weekly reports and burnout warnings to keep you healthy and productive.</p>
          </div>
        </li>
        <li class="feature-item">
          <div class="feature-icon">🔒</div>
          <div class="feature-text">
            <h3>Privacy First</h3>
            <p>Your data is yours. We prioritize security and privacy in every feature we build.</p>
          </div>
        </li>
      </ul>

      <p class="intro">
        Ready to get started? Open the app and set up your preferences to begin your journey to better focus.
      </p>

      <a href="#" class="cta-button" style="color: white;">Open App</a>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Focused AI. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
