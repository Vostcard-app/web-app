// ✅ Netlify Function: Send Advertiser Application Notification Email

const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { 
      firstName, 
      lastName, 
      businessName, 
      email, 
      applicationId,
      timestamp 
    } = JSON.parse(event.body);

    // Validate required fields
    if (!email || !applicationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Create transporter using environment variables
    const transporter = nodemailer.createTransporter({
      service: 'gmail', // or your email service
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password or app password
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'info@vostcard.com', // Send to info@vostcard.com
      subject: '🏪 New Advertiser Application - Vōstcard',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #002B4D; border-bottom: 2px solid #002B4D; padding-bottom: 10px;">
            🏪 New Advertiser Application
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #002B4D; margin-top: 0;">Application Details:</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Applicant Name:</td>
                <td style="padding: 8px 0; color: #666;">${firstName && lastName ? `${firstName} ${lastName}` : 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Business Name:</td>
                <td style="padding: 8px 0; color: #666;">${businessName || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Email Address:</td>
                <td style="padding: 8px 0; color: #666;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Application ID:</td>
                <td style="padding: 8px 0; color: #666; font-family: monospace; font-size: 12px;">${applicationId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Submitted:</td>
                <td style="padding: 8px 0; color: #666;">${timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #e8f4ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007aff;">
            <h4 style="margin: 0 0 10px 0; color: #002B4D;">📋 Next Steps:</h4>
            <ol style="margin: 0; padding-left: 20px; color: #333;">
              <li>Review the application details above</li>
              <li>Log into the Vōstcard Admin Panel to approve or reject the application</li>
              <li>The applicant will be notified once you take action</li>
            </ol>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;">
              <strong>⚠️ Important:</strong> The applicant must verify their email address before their application can be fully processed.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://vostcard.com/admin-panel" 
               style="background: #002B4D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              🔧 Open Admin Panel
            </a>
          </div>

          <div style="font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p>This is an automated notification from the Vōstcard application system.</p>
            <p>Timestamp: ${new Date().toLocaleString()}</p>
            <p style="margin: 0;">© 2024 Vōstcard - All rights reserved</p>
          </div>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST',
      },
      body: JSON.stringify({ 
        message: 'Advertiser application notification sent successfully!',
        recipient: 'info@vostcard.com'
      }),
    };

  } catch (error) {
    console.error('❌ Error sending advertiser notification:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST',
      },
      body: JSON.stringify({ 
        error: 'Failed to send notification email',
        details: error.message
      }),
    };
  }
};