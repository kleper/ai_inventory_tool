from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings
from pathlib import Path

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=settings.USE_CREDENTIALS,
    VALIDATE_CERTS=settings.VALIDATE_CERTS
)

class EmailService:
    @staticmethod
    async def send_invitation_email(email_to: str, token: str):
        link = f"{settings.DOMAIN}/register?token={token}"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
                .content {{ margin-bottom: 30px; line-height: 1.6; color: #374151; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white !important; text-decoration: none; border-radius: 6px; font-weight: bold; }}
                .footer {{ font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">SmartInventory AI</div>
                </div>
                <div class="content">
                    <h2>Has sido invitado a colaborar en SmartInventory</h2>
                    <p>Hola,</p>
                    <p>El administrador te ha invitado a unirte a la plataforma para gestionar inventarios de forma inteligente.</p>
                    <p>Haz clic en el siguiente botón para completar tu registro:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{link}" class="button">Aceptar Invitación</a>
                    </div>
                    <p>Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
                    <p style="word-break: break-all;"><a href="{link}">{link}</a></p>
                </div>
                <div class="footer">
                    <p>Si no esperabas este correo, puedes ignorarlo.</p>
                    <p>&copy; 2025 SmartInventory AI. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """

        message = MessageSchema(
            subject="Invitación a SmartInventory AI",
            recipients=[email_to],
            body=html,
            subtype=MessageType.html
        )

        fm = FastMail(conf)
        await fm.send_message(message)
