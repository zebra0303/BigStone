import cron from "node-cron";
import db from "../db/database";
import { formatInTimeZone } from "date-fns-tz";
import { sendSlackNotification } from "../utils/slack";

/**
 * Fetches the system timezone from settings.
 * Defaults to Asia/Seoul if not set.
 */
function getSystemTimezone(): string {
  try {
    const row = db
      .prepare("SELECT value FROM system_settings WHERE key = 'timezone'")
      .get() as any;
    return row ? row.value : "Asia/Seoul";
  } catch {
    return "Asia/Seoul";
  }
}

/**
 * Starts the notification scheduler.
 * Runs every minute to check if any tasks need a notification.
 */
export function startNotificationService() {
  cron.schedule("* * * * *", async () => {
    const timezone = getSystemTimezone();

    const now = new Date();
    const currentTime = formatInTimeZone(now, timezone, "HH:mm");
    const todayStr = formatInTimeZone(now, timezone, "yyyy-MM-dd");

    console.log(
      `[Notification Check] Checking at ${currentTime} for date ${todayStr} (TZ: ${timezone})`,
    );

    try {
      // Find tasks that:
      // 1. Have slackEnabled = 1
      // 2. Have notificationTime matching the current time
      // 3. Have dueDate matching today (dueDate is stored as local YYYY-MM-DD)
      // 4. Are not completed
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

      for (const task of tasksToNotify) {
        console.log(
          `[Notification] Sending Slack notification for task: ${task.title} (ID: ${task.todoId})`,
        );

        const priorityEmoji =
          task.priority === "HIGH"
            ? "❤️"
            : task.priority === "MEDIUM"
              ? "💛"
              : "💚";

        const priorityText =
          task.priority === "HIGH"
            ? "높음"
            : task.priority === "MEDIUM"
              ? "보통"
              : "낮음";

        const message = `[${priorityEmoji} BigStone 알림] 오늘 할 일이 있습니다!`;
        const blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${message}*\n*제목:* ${task.title}\n*우선순위:* ${priorityEmoji} ${priorityText}${task.description ? `\n*설명:* ${task.description}` : ""}`,
            },
          },
        ];

        await sendSlackNotification(message, blocks);
      }

      if (tasksToNotify.length > 0) {
        console.log(
          `[Notification] Sent ${tasksToNotify.length} Slack notifications at ${currentTime}`,
        );
      }
    } catch (error) {
      console.error("[Notification Error]", error);
    }
  });

  console.log("Notification service started (checking every minute).");
}
