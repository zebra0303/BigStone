import db from "../db/database";

function getSlackWebhookUrl(): string | null {
  try {
    const row = db
      .prepare(
        "SELECT value FROM system_settings WHERE key = 'slack_webhook_url'",
      )
      .get() as { value: string } | undefined;
    return row?.value || null;
  } catch (error) {
    console.error("Error fetching Slack Webhook URL from DB:", error);
    return null;
  }
}

function isAllowedSlackWebhook(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "hooks.slack.com" &&
      parsed.pathname.startsWith("/services/")
    );
  } catch {
    return false;
  }
}

/**
 * Sends a message to Slack via validated Incoming Webhook with timeout protection.
 */
export async function sendSlackNotification(
  text: string,
  blocks?: unknown[],
): Promise<boolean> {
  const webhookUrl = getSlackWebhookUrl();

  if (!webhookUrl) {
    return false;
  }

  // Defense-in-depth SSRF check before sending outbound request
  if (!isAllowedSlackWebhook(webhookUrl)) {
    console.warn("Blocked Slack notification to non-Slack webhook URL.");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, blocks }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(
        `Slack Webhook error: ${response.status} ${response.statusText}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending Slack notification:", error);
    return false;
  }
}
