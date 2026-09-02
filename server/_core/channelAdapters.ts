import crypto from "node:crypto";
import {
  registerChannelAdapter,
  type ChannelAdapter,
  type InboundMessage,
  type OutboundMessage,
} from "./channelAdapter";

/* ───────────── WhatsApp Business Adapter ───────────── */

const whatsappAdapter: ChannelAdapter = {
  type: "whatsapp",
  name: "WhatsApp Business",

  validateConfig(config) {
    return !!(
      config.phoneNumberId &&
      config.accessToken &&
      config.verifyToken
    );
  },

  async handleInbound(payload, config) {
    // WhatsApp Cloud API webhook format
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    if (!changes) return null;

    const value = changes.value;
    if (!value?.messages?.length) return null;

    const msg = value.messages[0];
    const contact = value.contacts?.[0];

    // Only handle text messages for now
    if (msg.type !== "text") {
      return {
        channelType: "whatsapp",
        workspaceId: 0,
        senderId: msg.from,
        senderName: contact?.profile?.name,
        content: `[${msg.type}] Received ${msg.type} message`,
        contentType: "text",
        channelMessageId: msg.id,
      };
    }

    return {
      channelType: "whatsapp",
      workspaceId: 0,
      senderId: msg.from,
      senderName: contact?.profile?.name,
      content: msg.text.body,
      contentType: "text",
      channelMessageId: msg.id,
    };
  },

  async sendOutbound(message, config) {
    const phoneNumberId = config.phoneNumberId as string;
    const accessToken = config.accessToken as string;
    const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.recipientId,
          type: "text",
          text: { body: message.content },
        }),
      });

      const data = await response.json() as {
        messages?: Array<{ id: string }>;
        error?: { message: string };
      };

      if (data.error) {
        return { success: false, error: data.error.message };
      }

      return {
        success: true,
        channelMessageId: data.messages?.[0]?.id,
      };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  async verifyWebhook(query, config) {
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    if (mode === "subscribe" && token === config.verifyToken) {
      return challenge;
    }

    return null;
  },
};

/* ───────────── Email Adapter ───────────── */

const emailAdapter: ChannelAdapter = {
  type: "email",
  name: "Email",

  validateConfig(config) {
    return !!(config.inboundDomain || config.resendApiKey);
  },

  async handleInbound(payload, config) {
    // Generic inbound email webhook format
    // Supports Resend, SendGrid, Mailgun-style webhooks
    const from = payload.from ?? payload.sender ?? "";
    const subject = payload.subject ?? "";
    const text = payload.text ?? payload.body ?? payload.html ?? "";
    const messageId = payload.messageId ?? payload.message_id ?? payload.id;

    if (!from || !text) return null;

    // Extract email address from "Name <email>" format
    const emailMatch = from.match(/<([^>]+)>/) ?? [null, from];
    const email = emailMatch[1] ?? from;

    return {
      channelType: "email",
      workspaceId: 0,
      senderId: email,
      senderName: from.replace(/<[^>]+>/, "").trim(),
      content: subject ? `Subject: ${subject}\n\n${text}` : text,
      contentType: "text",
      channelMessageId: messageId,
    };
  },

  async sendOutbound(message, config) {
    const resendApiKey = config.resendApiKey as string;
    const fromAddress = (config.fromAddress as string) ?? "agent@sopranova.ai";

    if (!resendApiKey) {
      return { success: false, error: "Resend API key not configured" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [message.recipientId],
          subject: message.metadata?.subject as string ?? "Re: Your message",
          text: message.content,
        }),
      });

      const data = await response.json() as { id?: string; error?: { message: string } };

      if (data.error) {
        return { success: false, error: data.error.message };
      }

      return { success: true, channelMessageId: data.id };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};

/* ───────────── SMS Adapter (Twilio) ───────────── */

const smsAdapter: ChannelAdapter = {
  type: "sms",
  name: "SMS (Twilio)",

  validateConfig(config) {
    return !!(config.twilioAccountSid && config.twilioAuthToken && config.twilioPhoneNumber);
  },

  async handleInbound(payload, config) {
    // Twilio webhook format (form-encoded)
    const from = payload.From ?? payload.from ?? "";
    const body = payload.Body ?? payload.body ?? "";
    const messageSid = payload.MessageSid ?? payload.message_sid ?? "";

    if (!from || !body) return null;

    return {
      channelType: "sms",
      workspaceId: 0,
      senderId: from,
      content: body,
      contentType: "text",
      channelMessageId: messageSid,
    };
  },

  async sendOutbound(message, config) {
    const accountSid = config.twilioAccountSid as string;
    const authToken = config.twilioAuthToken as string;
    const fromNumber = config.twilioPhoneNumber as string;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: message.recipientId,
          From: fromNumber,
          Body: message.content,
        }).toString(),
      });

      const data = await response.json() as { sid?: string; error_code?: number; error_message?: string };

      if (data.error_code) {
        return { success: false, error: data.error_message };
      }

      return { success: true, channelMessageId: data.sid };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};

/* ───────────── Register All Adapters ───────────── */

export function registerAllChannelAdapters(): void {
  registerChannelAdapter(whatsappAdapter);
  registerChannelAdapter(emailAdapter);
  registerChannelAdapter(smsAdapter);
}
