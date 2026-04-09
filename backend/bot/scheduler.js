import cron from "node-cron";
import { EmbedBuilder } from "discord.js";
import db from "../database.js";

const activeJobs = new Map();

export function initScheduler(client) {
  loadScheduledMessages(client);
  // Check one-time schedules every 30 seconds
  setInterval(() => checkOneTimeSchedules(client), 30000);
  console.log("✅ Scheduler initialized");
}

export function loadScheduledMessages(client) {
  // Clear existing jobs
  for (const [id, job] of activeJobs) {
    job.stop();
  }
  activeJobs.clear();

  // Load recurring jobs
  const recurring = db
    .prepare(
      "SELECT * FROM scheduled_messages WHERE is_recurring = 1 AND is_active = 1"
    )
    .all();

  for (const schedule of recurring) {
    if (schedule.cron_expression && cron.validate(schedule.cron_expression)) {
      const job = cron.schedule(schedule.cron_expression, () => {
        sendScheduledEmbed(client, schedule);
      });
      activeJobs.set(schedule.id, job);
    }
  }

  console.log(`📅 Loaded ${activeJobs.size} recurring schedules`);
}

function checkOneTimeSchedules(client) {
  const now = new Date().toISOString();
  const pending = db
    .prepare(
      `SELECT * FROM scheduled_messages 
       WHERE is_recurring = 0 AND is_active = 1 AND scheduled_at <= ?`
    )
    .all(now);

  for (const schedule of pending) {
    sendScheduledEmbed(client, schedule);
    db.prepare("UPDATE scheduled_messages SET is_active = 0 WHERE id = ?").run(
      schedule.id
    );
  }
}

function sendScheduledEmbed(client, schedule) {
  try {
    const channel = client.channels.cache.get(schedule.channel_id);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(schedule.title)
      .setDescription(schedule.description)
      .setColor(schedule.color || "#5865F2")
      .setTimestamp();

    if (schedule.footer) embed.setFooter({ text: schedule.footer });
    if (schedule.thumbnail) embed.setThumbnail(schedule.thumbnail);
    if (schedule.image) embed.setImage(schedule.image);

    // Parse fields JSON
    try {
      const fields = JSON.parse(schedule.fields || "[]");
      if (fields.length > 0) embed.addFields(fields);
    } catch {}

    channel.send({ embeds: [embed] });
    console.log(`📨 Sent scheduled embed: ${schedule.title}`);
  } catch (err) {
    console.error("Scheduler send error:", err.message);
  }
}

export function reloadSchedules(client) {
  loadScheduledMessages(client);
}
