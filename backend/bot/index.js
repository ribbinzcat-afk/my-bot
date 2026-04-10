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
import { getAIResponse, clearHistory, getAIEmbedResponse } from "./aiProviders.js";
import { initScheduler, reloadSchedules } from "./scheduler.js";
import db from "../database.js";

let client;

async function sendSplitMessage(target, content) {
  const maxLength = 1800; // ตั้งค่าเพดานไว้ที่ 1800 ตามต้องการ
  
  if (content.length <= maxLength) {
    if (target.editReply) return await target.editReply(content);
    return await target.reply(content);
  }

  const chunks = [];
  let currentText = content;

  while (currentText.length > 0) {
    if (currentText.length <= maxLength) {
      chunks.push(currentText);
      break;
    }

    // 1. พยายามตัดที่ 1800 ตัวอักษร
    let splitIndex = maxLength;
    let part = currentText.substring(0, maxLength);

    // 2. หาจุดตัดที่เป็นการขึ้นบรรทัดใหม่ (\n) หรือ ช่องว่าง (Space) 
    // โดยหาจากจุดที่ 1800 ย้อนกลับมา
    const lastNewline = part.lastIndexOf("\n");
    const lastSpace = part.lastIndexOf(" ");

    if (lastNewline > maxLength * 0.7) { 
      // ถ้าเจอขึ้นบรรทัดใหม่ในช่วง 30% ท้ายของก้อน ให้ตัดตรงนั้น
      splitIndex = lastNewline;
    } else if (lastSpace > maxLength * 0.7) {
      // ถ้าไม่เจอขึ้นบรรทัดใหม่ แต่เจอช่องว่าง ให้ตัดตรงช่องว่าง
      splitIndex = lastSpace;
    }

    // เก็บข้อความส่วนที่ตัดได้ลงใน chunks
    chunks.push(currentText.substring(0, splitIndex).trim());
    // ตัดส่วนที่ส่งแล้วออกจากตัวแปรหลักเพื่อวนลูปต่อ
    currentText = currentText.substring(splitIndex).trim();
  }

  // --- ส่วนการส่งข้อความออกไปที่ Discord ---
  for (let i = 0; i < chunks.length; i++) {
    try {
      if (i === 0) {
        if (target.editReply) await target.editReply(chunks[i]);
        else await target.reply(chunks[i]);
      } else {
        // ส่วนที่ 2 เป็นต้นไป ต้องใช้ followUp หรือ send
        if (target.followUp) await target.followUp(chunks[i]);
        else await target.channel.send(chunks[i]);
      }
    } catch (err) {
      console.error("Error sending chunk:", err);
    }
  }
}

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

        // --- เพิ่มคำสั่ง ai-embed ตรงนี้ ---
    if (interaction.commandName === "ai-embed") {
      const prompt = interaction.options.getString("prompt");
      await interaction.deferReply();

      try {
        const data = await getAIEmbedResponse(prompt);
        const embed = new EmbedBuilder()
          .setTitle(data.title || "AI Generated")
          .setDescription(data.description || "No description")
          .setColor(data.color || "#00ff88")
          .setFooter({ text: data.footer || "" })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        await interaction.editReply("❌ AI สร้าง Embed ไม่สำเร็จ (ลองเปลี่ยน Provider หรือใช้ภาษาอังกฤษสั้นๆ ดูนะคะ)");
      }
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
        new SlashCommandBuilder()
      .setName("ai-embed")
      .setDescription("ให้ AI ช่วยสร้าง Embed สวยๆ ให้")
      .addStringOption((opt) =>
        opt.setName("prompt")
          .setDescription("บอกลักษณะ Embed ที่ต้องการ (เช่น ประกาศกฎกลุ่ม สีฟ้า)")
          .setRequired(true),
                       )
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
