import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Environment, BaseLoader
from typing import Optional

from ..config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails."""
    
    def __init__(self):
        self.settings = get_settings()
    
    async def send_email(
        self,
        to: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email via Resend API (preferred) or SMTP (fallback)."""
        # Try Resend API first if key is configured
        if self.settings.resend_api_key:
            try:
                import httpx
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.resend.com/emails",
                        json={
                            "from": self.settings.from_email,  # Use configured verified domain
                            "to": [to],
                            "subject": subject,
                            "html": html_content,
                            "text": text_content
                        },
                        headers={
                            "Authorization": f"Bearer {self.settings.resend_api_key}",
                            "Content-Type": "application/json"
                        }
                    )
                    
                    if response.status_code >= 400:
                        logger.warning(f"Resend API Error: {response.text}")
                        # Fallback to SMTP only if Resend fails? Or just return False?
                        # For now, let's log and return False if Resend was intended but failed.
                        return False
                        
                    return True
            except Exception as e:
                logger.error(f"Failed to send email via Resend: {e}")
                return False

        # Fallback to SMTP
        try:
            message = MIMEMultipart("alternative")
            message["From"] = self.settings.from_email
            message["To"] = to
            message["Subject"] = subject
            
            # Add text version
            if text_content:
                message.attach(MIMEText(text_content, "plain"))
            
            # Add HTML version
            message.attach(MIMEText(html_content, "html"))
            
            # Send email
            # Determine TLS settings based on port
            port = self.settings.smtp_port
            use_implicit_tls = (port == 465)
            use_start_tls = (port == 587) and bool(self.settings.smtp_user)
            
            await aiosmtplib.send(
                message,
                hostname=self.settings.smtp_host,
                port=port,
                username=self.settings.smtp_user or None,
                password=self.settings.smtp_password or None,
                use_tls=use_implicit_tls,
                start_tls=use_start_tls,
            )
            
            return True
        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {e}")
            return False
    
    async def send_verification_otp(self, to: str, username: str, otp: str) -> bool:
        """Send email verification OTP."""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .otp {{ font-size: 32px; font-weight: bold; color: white; text-align: center; padding: 20px; background: #005FFF; border-radius: 8px; letter-spacing: 8px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #888; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Verify Your Email</h1>
                </div>
                <div class="content">
                    <p>Hi {username},</p>
                    <p>Welcome to AIV! Please use the following code to verify your email address:</p>
                    <div class="otp">{otp}</div>
                    <p>This code expires in 15 minutes.</p>
                    <p>If you didn't create an account, you can safely ignore this email.</p>
                </div>
                <div class="footer">
                    <p>© 2024 AIV Platform. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text = f"""
        Hi {username},
        
        Welcome to AIV! Please use the following code to verify your email address:
        
        {otp}
        
        This code expires in 15 minutes.
        
        If you didn't create an account, you can safely ignore this email.
        """
        
        return await self.send_email(
            to=to,
            subject="Verify your email - AIV",
            html_content=html,
            text_content=text
        )
    
    async def send_password_reset_otp(self, to: str, username: str, otp: str) -> bool:
        """Send password reset OTP."""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .otp {{ font-size: 32px; font-weight: bold; color: #f5576c; text-align: center; padding: 20px; background: white; border-radius: 8px; letter-spacing: 8px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #888; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset</h1>
                </div>
                <div class="content">
                    <p>Hi {username},</p>
                    <p>You requested to reset your password. Use the following code:</p>
                    <div class="otp">{otp}</div>
                    <p>This code expires in 15 minutes.</p>
                    <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
                </div>
                <div class="footer">
                    <p>© 2024 AIV Platform. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text = f"""
        Hi {username},
        
        You requested to reset your password. Use the following code:
        
        {otp}
        
        This code expires in 15 minutes.
        
        If you didn't request this, please ignore this email.
        """
        
        return await self.send_email(
            to=to,
            subject="Password Reset - AIV",
            html_content=html,
            text_content=text
        )

    async def send_clone_ready(self, to: str, username: str, clone_name: str) -> bool:
        """Send clone ready notification."""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .cta {{ display: inline-block; padding: 12px 24px; background: #00b09b; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #888; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Clone Ready!</h1>
                </div>
                <div class="content">
                    <p>Hi {username},</p>
                    <p>Great news! Your digital clone <strong>{clone_name}</strong> has finished processing.</p>
                    <p>It has analyzed your voice, personality, and data to create a unique digital twin.</p>
                    <center>
                        <a href="https://aiv-platform.com" class="cta">Start Chatting</a>
                    </center>
                    <p>Login to your dashboard to start interacting with your new clone.</p>
                </div>
                <div class="footer">
                    <p>© 2024 AIV Platform. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text = f"""
        Hi {username},
        
        Great news! Your digital clone {clone_name} has finished processing.
        
        It has analyzed your voice, personality, and data to create a unique digital twin.
        
        Login to your dashboard to start interacting with your new clone:
        https://aiv-platform.com
        """
        
        return await self.send_email(
            to=to,
            subject="Your Clone is Ready! - AIV",
            html_content=html,
            text_content=text
        )


    # ── Deal & Business Event Emails ──────────────────────

    async def send_deal_notification(self, to: str, subject_line: str, body_text: str, cta_url: str = "", cta_label: str = "View Deal") -> bool:
        """Send a business event notification email with consistent AIV branding."""
        html = f"""<!DOCTYPE html>
<html><head><style>
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #e2e8f0; background: #0a0a1a; }}
.container {{ max-width: 560px; margin: 0 auto; padding: 32px 24px; }}
.header {{ text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 24px; }}
.logo {{ font-size: 20px; font-weight: 700; color: #fff; letter-spacing: 1px; }}
.content {{ color: #94a3b8; font-size: 15px; }}
.content p {{ margin: 12px 0; }}
.cta {{ display: inline-block; padding: 12px 28px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; margin-top: 20px; }}
.footer {{ text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); color: #475569; font-size: 12px; }}
</style></head>
<body><div class="container">
<div class="header"><div class="logo">AIV</div></div>
<div class="content">
<p style="color:#f1f5f9;font-size:17px;font-weight:600;">{subject_line}</p>
<p>{body_text}</p>
{f'<center><a href="{cta_url}" class="cta">{cta_label}</a></center>' if cta_url else ''}
</div>
<div class="footer">AIV — Identity Infrastructure<br>This is an automated notification from the AIV platform.</div>
</div></body></html>"""
        return await self.send_email(to=to, subject=f"AIV — {subject_line}", html_content=html, text_content=body_text)

    async def send_deal_submitted(self, to: str, deal_type: str, deal_value: float, deal_url: str) -> bool:
        return await self.send_deal_notification(to, "New Deal Inquiry", f"A new {deal_type.replace('_', ' ')} licensing inquiry has been submitted for ${deal_value:,.0f}. Review the terms and respond.", deal_url, "Review Inquiry")

    async def send_deal_executed(self, to: str, deal_type: str, deal_value: float, deal_url: str) -> bool:
        return await self.send_deal_notification(to, "Deal Executed", f"Your {deal_type.replace('_', ' ')} licensing deal for ${deal_value:,.0f} has been executed. The identity package is being delivered to the client.", deal_url, "View Deal")

    async def send_contract_sent(self, to: str, deal_type: str) -> bool:
        return await self.send_deal_notification(to, "Contract Sent for Signature", f"A licensing agreement for your {deal_type.replace('_', ' ')} deal has been sent for signature. Please review and sign to proceed.", "", "")

    async def send_contract_signed(self, to: str, signer_name: str) -> bool:
        return await self.send_deal_notification(to, "Contract Signed", f"{signer_name} has signed the licensing agreement. Waiting for the remaining party to complete signing.", "", "")

    async def send_payment_received(self, to: str, amount: float, deal_type: str) -> bool:
        return await self.send_deal_notification(to, "Payment Received", f"A payment of ${amount:,.0f} has been received for your {deal_type.replace('_', ' ')} licensing deal.", "", "")

    async def send_payment_failed(self, to: str, amount: float) -> bool:
        return await self.send_deal_notification(to, "Payment Issue", f"A payment of ${amount:,.0f} could not be processed. Please update your payment method to avoid service interruption.", "/settings/billing", "Update Payment Method")

    async def send_fee_free_expiring(self, to: str, days_left: int) -> bool:
        return await self.send_deal_notification(to, f"Fee-Free Period Ending in {days_left} Days", f"Your fee-free period ends in {days_left} day{'s' if days_left != 1 else ''}. The $997/month platform partnership fee will activate after this period. Close your first deal or ensure your payment method is on file.", "/settings/billing", "View Billing")

    async def send_payout_processed(self, to: str, amount: float) -> bool:
        return await self.send_deal_notification(to, "Payout Processed", f"A payout of ${amount:,.0f} has been transferred to your connected bank account. It should arrive within 2-3 business days.", "/settings/billing", "View Payout History")


# Singleton instance
email_service = EmailService()
