package com.meetclone.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.base-url}")
    private String baseUrl;

    public void sendPasswordResetEmail(String toEmail, String token) {
        String resetLink = baseUrl + "/reset-password?token=" + token;

        String subject = "ConferMeet - Password Reset Request";

        String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; }
                        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
                        .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 40px 30px; text-align: center; }
                        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; }
                        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
                        .body { padding: 40px 30px; }
                        .body h2 { color: #1a1a2e; margin: 0 0 16px; font-size: 22px; }
                        .body p { color: #555; line-height: 1.7; margin: 0 0 20px; font-size: 15px; }
                        .btn-container { text-align: center; margin: 32px 0; }
                        .reset-btn { display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px; }
                        .link-fallback { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0; word-break: break-all; font-size: 13px; color: #667eea; border: 1px solid #e9ecef; }
                        .warning { background: #fff8e1; border-left: 4px solid #ffc107; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 24px 0; font-size: 13px; color: #856404; }
                        .footer { background: #f8f9fa; padding: 24px 30px; text-align: center; border-top: 1px solid #eee; }
                        .footer p { color: #999; font-size: 12px; margin: 4px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 ConferMeet</h1>
                            <p>Secure Password Reset</p>
                        </div>
                        <div class="body">
                            <h2>Password Reset Request</h2>
                            <p>Hello,</p>
                            <p>We received a request to reset your password for your ConferMeet account. Click the button below to create a new password:</p>
                            <div class="btn-container">
                                <a href="%s" class="reset-btn">Reset My Password</a>
                            </div>
                            <p>If the button doesn't work, copy and paste this link into your browser:</p>
                            <div class="link-fallback">%s</div>
                            <div class="warning">
                                ⚠️ This link will expire in <strong>15 minutes</strong>. If you didn't request this password reset, please ignore this email — your account remains secure.
                            </div>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 ConferMeet. All rights reserved.</p>
                            <p>This is an automated email. Please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
                """
                .formatted(resetLink, resetLink);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);

            System.out.println("===========================================");
            System.out.println("PASSWORD RESET EMAIL SENT");
            System.out.println("To: " + toEmail);
            System.out.println("Reset Link: " + resetLink);
            System.out.println("===========================================");

        } catch (MessagingException e) {
            System.err.println("Failed to send password reset email: " + e.getMessage());
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }
}
