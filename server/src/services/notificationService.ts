import cron, { ScheduledTask } from "node-cron";
import db from "../db/database";
import { formatInTimeZone } from "date-fns-tz";
import { sendSlackNotification } from "../utils/slack";

function getSystemTimezone(): string {
  try {
    const row = db
      .prepare("SELECT value FROM system_settings WHERE key = 'timezone'")
      .get() as { value: string } | undefined;
    return row?.value || "Asia/Seoul";
  } catch {
    return "Asia/Seoul";
  }
}

/** Escape Slack mrkdwn control characters in user-provided text. */
function escapeSlackText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Starts the notification scheduler and returns its handle for graceful shutdown.
 */
export function startNotificationService(): ScheduledTask {
  // Track notifications sent per day to avoid duplicate bursts within the same minute
  const sentToday = new Set<string>();
  let lastCheckedDay = "";

  const task = cron.schedule("* * * * *", async () => {
    try {
      const timezone = getSystemTimezone();
      const now = new Date();
      let currentTime: string;
      let todayStr: string;
      try {
        currentTime = formatInTimeZone(now, timezone, "HH:mm");
        todayStr = formatInTimeZone(now, timezone, "yyyy-MM-dd");
      } catch {
        // Fallback to Asia/Seoul if DB contains an invalid IANA timezone string
        currentTime = formatInTimeZone(now, "Asia/Seoul", "HH:mm");
        todayStr = formatInTimeZone(now, "Asia/Seoul", "yyyy-MM-dd");
      }

      if (todayStr !== lastCheckedDay) {
        sentToday.clear();
        lastCheckedDay = todayStr;
      }

      const query = `
        SELECT
          tg.id as groupId,
          tg.title,
          tg.description,
          tg.priority,
          t.dueDate,
          t.id as todoId
        FROM todo_groups tg
        JOIN todos t ON tg.id = t.groupId
        WHERE tg.slackEnabled = 1
          AND tg.slackNotificationTime = ?
          AND t.dueDate = ?
          AND t.status != 'DONE'
      `;

      const tasksToNotify = db
        .prepare(query)
        .all(currentTime, todayStr) as any[];

      let sentCount = 0;
      for (const item of tasksToNotify) {
        const dedupKey = `${item.todoId}:${todayStr}:${currentTime}`;
        if (sentToday.has(dedupKey)) continue;

        const priorityEmoji =
          item.priority === "HIGH"
            ? "🔴"
            : item.priority === "MEDIUM"
              ? "🟡"
              : "🟢";
        const priorityText =
          item.priority === "HIGH"
            ? "높음"
            : item.priority === "MEDIUM"
              ? "보통"
              : "낮음";

        const message = `[BigStone 알림] 오늘 할 일이 있습니다!`;
        const safeTitle = escapeSlackText(String(item.title ?? ""));
        const safeDesc = item.description
          ? `\n*설명:* ${escapeSlackText(String(item.description))}`
          : "";

        const blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${message}*\n*제목:* ${safeTitle}\n*우선순위:* ${priorityEmoji} ${priorityText}${safeDesc}`,
            },
          },
        ];

        const ok = await sendSlackNotification(message, blocks);
        if (ok) {
          sentToday.add(dedupKey);
          sentCount++;
        }
      }

      if (sentCount > 0) {
        console.log(
          `[Notification] Sent ${sentCount} Slack notification(s) at ${currentTime}`,
        );
      }
    } catch (error) {
      console.error("[Notification Error]", error);
    }
  });

  console.log("Notification service started (checking every minute).");
  return task;
}
