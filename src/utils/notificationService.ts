import User from '../models/User';
import { sendEmail } from './emailService';

type UserRole = 'admin' | 'staff';

interface NotificationOptions {
  title: string;
  message: string;
  data?: Record<string, unknown>;
  roles?: UserRole[];
  emailSubject?: string;
  emailHtml?: string;
}

const sendPushNotifications = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) => {
  const serverKey = process.env.FCM_SERVER_KEY;

  if (!serverKey || tokens.length === 0) {
    return;
  }

  try {
    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${serverKey}`
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: { title, body },
        data
      })
    });
  } catch (error) {
    console.error('Failed to send push notifications:', error);
  }
};

const sendEmailNotifications = async (
  emails: string[],
  subject: string,
  html: string
) => {
  if (!emails.length) {
    return;
  }

  try {
    await sendEmail({
      to: process.env.EMAIL_USER,
      bcc: emails,
      subject,
      html
    });
  } catch (error) {
    console.error('Failed to send email notifications:', error);
  }
};

export const notifyUsers = async ({
  title,
  message,
  data,
  roles,
  emailSubject,
  emailHtml
}: NotificationOptions) => {
  const filter: Record<string, unknown> = { isActive: true };
  if (roles?.length) {
    filter.role = { $in: roles };
  }

  const users = await User.find(filter).select('email noti role');

  const pushTokens = users
    .map(user => user.noti)
    .filter((token): token is string => Boolean(token));

  const emails = users
    .map(user => user.email)
    .filter((email): email is string => Boolean(email));

  await sendPushNotifications(pushTokens, title, message, data);

  if (emailSubject && emailHtml) {
    await sendEmailNotifications(emails, emailSubject, emailHtml);
  }
};

