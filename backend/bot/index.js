import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
} from "discord.js";
import { getAIResponse, clearHistory } from "./aiProviders.js";
import { initScheduler, reloadSchedules } from "./scheduler.js";
import db from "../database.js";

let client;

export function createBot() {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  client.once("ready", async () => {
    console.log(`🤖 Bot logged in as ${client.user.tag}`);
    client.user.setActivity("chat with me!", { type: ActivityType.Listening });

    // Register slash commands
    await registerCommands();

    // Init scheduler
    initScheduler(client);
  });

  // ─── Mention or Reply triggers AI ───
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const isMentioned = message.mentions.has(client.user);
    const isReply =
      message.reference &&
      (await message.channel.messages
        .fetch(message.reference.messageId)
        .catch(() => null)
        ?.then((m) => m?.author?.id === client.user.id));

    if (!isMentioned && !isReply) return;

    // Clean mention from message
    const content = message.content
      .replace(/<@!?\d+>/g, "")
      .trim();

    if (!content) {
      return message.reply("สวัสดี! ถามอะไรได้เลยนะ 😊");
    }

    await message.channel.sendTyping();

    const reply = await getAIResponse(
      message.guildId || "DM",
      message.channelId,
      message.author.id,
      content
    );

    // Discord max 2000 chars — split if needed
    if (reply.length <= 2000) {
      await message.reply(reply);
    } else {
      const chunks = reply.match(/[\s\S]{1,2000}/g) || [];
      for (let i = 0; i < chunks.length; i++) {
        if (i === 0) await message.reply(chunks[i]);
        else await message.channel.send(chunks[i]);
      }
    }
  });

  // ─── Slash Commands ───
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "clear") {
      clearHistory(interaction.channelId);
      await interaction.reply({
        content: "🗑️ ล้างประวัติการสนทนาในแชนเนลนี้แล้ว!",
        ephemeral: true,
      });
    }

    if (interaction.commandName === "ai") {
      const prompt = interaction.options.getString("prompt");
      await interaction.deferReply();

      const reply = await getAIResponse(
        interaction.guildId || "DM",
        interaction.channelId,
        interaction.user.id,
        prompt
      );

      if (reply.length <= 2000) {
        await interaction.editReply(reply);
      } else {
        await interaction.editReply(reply.substring(0, 2000));
      }
    }

    if (interaction.commandName === "status") {
      const provider =
        db.prepare("SELECT value FROM settings WHERE key = 'active_provider'")
          .get()?.value || "N/A";
      const embed = new EmbedBuilder()
        .setTitle("🤖 Bot Status")
        .addFields(
          { name: "AI Provider", value: provider, inline: true },
          { name: "Ping", value: `${client.ws.ping}ms`, inline: true },
          {
            name: "Servers",
            value: `${client.guilds.cache.size}`,
            inline: true,
          }
        )
        .setColor("#00ff88")
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  });

  return client;
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("ai")
      .setDescription("Ask AI a question")
      .addStringOption((opt) =>
        opt.setName("prompt").setDescription("Your question").setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("clear")
      .setDescription("Clear conversation history in this channel"),
    new SlashCommandBuilder()
      .setName("status")
      .setDescription("Show bot status"),
  ].map((c) => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
      body: commands,
    });
    console.log("✅ Slash commands registered");
  } catch (err) {
    console.error("Failed to register commands:", err.message);
  }
}

export function getClient() {
  return client;
}

export function startBot() {
  const bot = createBot();
  bot.login(process.env.DISCORD_TOKEN);
  return bot;
}

export { reloadSchedules };
