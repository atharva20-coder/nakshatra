"use server";

import transporter from "@/lib/nodemailer";

const styles = {
  container: `
    max-width: 520px;
    margin: 20px auto;
    padding: 24px;
    border-radius: 8px;
    background-color: #ffffff;
    font-family: Arial, sans-serif;
    border: 1px solid #e0e0e0;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    text-align: center;
  `,
  logo: `
    max-width: 120px;
    margin-bottom: 20px;
  `,
  title: `
    font-size: 22px;
    color: #111827;
    margin-bottom: 12px;
  `,
  description: `
    font-size: 16px;
    color: #4b5563;
    line-height: 1.6;
    margin-bottom: 24px;
  `,
  button: `
    display: inline-block;
    padding: 12px 20px;
    background-color: #871F42;
    color: #ffffff;
    text-decoration: none;
    border-radius: 6px;
    font-size: 15px;
    font-weight: bold;
  `,
  footer: `
    font-size: 12px;
    color: #9ca3af;
    margin-top: 32px;
  `,
};

export async function sendEmailAction({
  to,
  subject,
  meta,
}: {
  to: string;
  subject: string;
  meta: {
    description: string;
    link: string;
  };
}) {
  const mailOptions = {
    from: process.env.NODEMAILER_USER,
    to,
    subject: `Axis Bank – ${subject}`,
    html: `
    <div style="${styles.container}">
      <img
        src="/nakshatra/public/logo.jpg"
        alt="Axis Bank Logo"
        style="${styles.logo}"
      />
      <h2 style="${styles.title}">🔐 Axis Bank – ${subject}</h2>
      <p style="${styles.description}">${meta.description}</p>
      <a href="${meta.link}" style="${styles.button}" target="_blank">Open Link</a>
      <div style="${styles.footer}">
        If you didn’t request this email, you can safely ignore it.
      </div>
    </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err) {
    console.error("[SendEmail]:", err);
    return { success: false };
  }
}
