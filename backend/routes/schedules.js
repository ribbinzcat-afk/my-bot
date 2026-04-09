import { Router } from "express";
import db from "../database.js";
import { getClient, reloadSchedules } from "../bot/index.js";

const router = Router();

// Get all guilds/channels for dropdown
router.get("/channels", (req, res) => {
  const client = getClient();
  if (!client) return res.json([]);

  const guilds = client.guilds.cache.map((guild) => ({
    id: guild.id,
    name: guild.name,
    channels: guild.channels.cache
      .filter((ch) => ch.isTextBased() && !ch.isThread())
      .map((ch) => ({ id: ch.id, name: ch.name })),
  }));

  res.json(guilds);
});

// Get all schedules
router.get("/", (req, res) => {
  const schedules = db
    .prepare("SELECT * FROM scheduled_messages ORDER BY created_at DESC")
    .all();
  res.json(schedules);
});

// Create schedule
router.post("/", (req, res) => {
  const {
    guild_id,
    channel_id,
    title,
    description,
    color,
    cron_expression,
    scheduled_at,
    is_recurring,
    fields,
    footer,
    thumbnail,
    image,
  } = req.body;

  if (!channel_id || !title) {
    return res.status(400).json({ error: "Channel and title required" });
  }

  const result = db
    .prepare(
      `INSERT INTO scheduled_messages 
       (guild_id, channel_id, title, description, color, cron_expression, 
        scheduled_at, is_recurring, fields, footer, thumbnail, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      guild_id,
      channel_id,
      title,
      description || "",
      color || "#5865F2",
      cron_expression || null,
      scheduled_at || null,
      is_recurring ? 1 : 0,
      JSON.stringify(fields || []),
      footer || "",
      thumbnail || "",
      image || ""
    );

  reloadSchedules(getClient());
  res.json({ success: true, id: result.lastInsertRowid });
});

// Update schedule
router.put("/:id", (req, res) => {
  const {
    title,
    description,
    color,
    cron_expression,
    scheduled_at,
    is_recurring,
    is_active,
    fields,
    footer,
    thumbnail,
    image,
  } = req.body;

  db.prepare(
    `UPDATE scheduled_messages SET 
     title=?, description=?, color=?, cron_expression=?, scheduled_at=?,
     is_recurring=?, is_active=?, fields=?, footer=?, thumbnail=?, image=?
     WHERE id=?`
  ).run(
    title,
    description || "",
    color || "#5865F2",
    cron_expression || null,
    scheduled_at || null,
    is_recurring ? 1 : 0,
    is_active ? 1 : 0,
    JSON.stringify(fields || []),
    footer || "",
    thumbnail || "",
    image || "",
    req.params.id
  );

  reloadSchedules(getClient());
  res.json({ success: true });
});

// Delete schedule
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM scheduled_messages WHERE id = ?").run(req.params.id);
  reloadSchedules(getClient());
  res.json({ success: true });
});

// Send test embed
router.post("/:id/test", (req, res) => {
  const schedule = db
    .prepare("SELECT * FROM scheduled_messages WHERE id = ?")
    .get(req.params.id);

  if (!schedule) return res.status(404).json({ error: "Not found" });

  const client = getClient();
  const channel = client?.channels.cache.get(schedule.channel_id);
  if (!channel) return res.status(404).json({ error: "Channel not found" });

  const { EmbedBuilder } = require("discord.js");
  const embed = new EmbedBuilder()
    .setTitle(schedule.title)
    .setDescription(schedule.description)
    .setColor(schedule.color || "#5865F2")
    .setTimestamp();

  if (schedule.footer) embed.setFooter({ text: schedule.footer });
  if (schedule.thumbnail) embed.setThumbnail(schedule.thumbnail);
  if (schedule.image) embed.setImage(schedule.image);

  try {
    const fields = JSON.parse(schedule.fields || "[]");
    if (fields.length) embed.addFields(fields);
  } catch {}

  channel.send({ embeds: [embed] });
  res.json({ success: true });
});

export default router;
