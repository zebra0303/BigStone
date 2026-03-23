import db from "../db/database";

/**
 * Fetches the Slack Webhook URL from the database.
 */
function getSlackWebhookUrl(): string | null {
  try {
    const row = db
      .prepare(
        "SELECT value FROM system_settings WHERE key = 'slack_webhook_url'",
      )
      .get() as any;
    return row ? row.value : null;
  } catch (error) {
    console.error("Error fetching Slack Webhook URL from DB:", error);
    return null;
  }
}

/**
 * Sends a message to Slack via Webhook.
 * @param text The message content.
 * @param blocks Optional Slack blocks for richer formatting.
 */
export async function sendSlackNotification(text: string, blocks?: any[]) {
  const webhookUrl = getSlackWebhookUrl();

  if (!webhookUrl) {
    console.warn("Slack Webhook URL is not configured in settings.");
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        blocks,
      }),
    });

    if (!response.ok) {
      console.error(
        `Slack Webhook error: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.error("Error sending Slack notification:", error);
  }
}
