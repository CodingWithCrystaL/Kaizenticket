// ✅ Dior $elling Tickets — FINAL BOT with all features

const {
  Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, ModalBuilder,
  Events, SlashCommandBuilder, REST, Routes
} = require("discord.js");
const express = require("express");
const config = require("./config.json");

const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000, () => console.log("✅ KeepAlive server running"));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const IMAGE_URL = "https://raw.githubusercontent.com/CodingWithCrystaL/Exchange/refs/heads/main/IMG_1574.jpeg";

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity("Tickets For Dior $elling", { type: 3 });

  const commands = [
    new SlashCommandBuilder().setName("sendpanel").setDescription("Send the main ticket creation panel"),
    new SlashCommandBuilder().setName("close").setDescription("Close the current ticket")
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN || config.token);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on(Events.InteractionCreate, async interaction => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "close") {
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("confirm-close").setLabel("Yes, Close").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("cancel-close").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({ content: "⚠️ Are you sure you want to close this ticket?", components: [confirmRow], ephemeral: true });
    }

    if (interaction.commandName === "sendpanel") {
      const embed = new EmbedBuilder()
        .setTitle("Shop & Support Tickets")
        .setDescription("To create a ticket, click the button below!")
        .setColor("#FFFFFF")
        .setImage(IMAGE_URL)
        .setFooter({ text: "Dior $elling" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket-panel-button").setLabel("Create Ticket").setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({ content: "✅ Panel sent!", ephemeral: true });
      await interaction.channel.send({ embeds: [embed], components: [row] });
    }
  }
    // Button interactions
  if (interaction.isButton()) {
    const { customId, channel, member, guild } = interaction;

    if (customId === "ticket-panel-button") {
      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("ticket-select")
          .setPlaceholder("Select a reason")
          .addOptions([
            { label: "Support", description: "Open a support ticket", value: "support" },
            { label: "Shop", description: "Open a shop ticket", value: "shop" }
          ])
      );

      const embed = new EmbedBuilder()
        .setTitle("Create a Ticket")
        .setDescription("Select a category below to open a ticket.")
        .setColor("#FFFFFF")
        .setImage(IMAGE_URL)
        .setFooter({ text: "Dior $elling" });

      await interaction.reply({ ephemeral: true, embeds: [embed], components: [menu] });
    }

    if (customId === "mark-delivered") {
      const user = channel.members.find(m => !m.user.bot);
      const role = guild.roles.cache.get(config.verifiedRole);
      if (user && role && !user.roles.cache.has(role.id)) {
        await user.roles.add(role);
      }

      const messages = await channel.messages.fetch({ limit: 100 });
      const transcript = messages.reverse().map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.cleanContent}`).join("\n");
      const buffer = Buffer.from(transcript, "utf-8");
      const file = { attachment: buffer, name: `transcript-${channel.name}.txt` };
      const log = await client.channels.fetch(config.deliveryLogChannel);
      await log.send({ content: `✅ Order Delivered: <@${user.id}> in ${channel.name}`, files: [file] });

      await channel.send("✅ Order marked as delivered. Closing ticket...");
      setTimeout(() => channel.delete(), 5000);
    }

    if (customId === "confirm-close") {
      const messages = await channel.messages.fetch({ limit: 100 });
      const transcript = messages.reverse().map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.cleanContent}`).join("\n");
      const buffer = Buffer.from(transcript, "utf-8");
      const file = { attachment: buffer, name: `transcript-${channel.name}.txt` };
      const log = await client.channels.fetch(config.transcriptChannel);
      await log.send({ content: `📄 Transcript for ${channel.name}`, files: [file] });

      await channel.send("✅ Ticket closed.");
      setTimeout(() => channel.delete(), 5000);
    }

    if (customId === "cancel-close") {
      await interaction.reply({ content: "❌ Ticket closure cancelled.", ephemeral: true });
    }
  }
    // Dropdown menu
  if (interaction.isStringSelectMenu() && interaction.customId === "ticket-select") {
    const type = interaction.values[0];
    const modal = new ModalBuilder().setCustomId(`${type}-ticket-modal`).setTitle(`${type === "shop" ? "Shop" : "Support"} Ticket`);

    if (type === "shop") {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("product").setLabel("Product Name").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("payment").setLabel("Payment Method").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("details").setLabel("Description").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );
    } else {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("issue").setLabel("Describe your issue").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );
    }

    await interaction.showModal(modal);
  }

  // Modal submission
  if (interaction.isModalSubmit()) {
    const type = interaction.customId.includes("shop") ? "shop" : "support";
    const member = interaction.member;
    const guild = interaction.guild;

    const product = type === "shop" ? interaction.fields.getTextInputValue("product") : null;
    const payment = type === "shop" ? interaction.fields.getTextInputValue("payment") : null;
    const details = interaction.fields.getTextInputValue(type === "shop" ? "details" : "issue");
    const orderId = type === "shop" ? `#GX${Math.floor(1000 + Math.random() * 9000)}` : null;

    const channelName = type === "shop"
      ? `shop-ticket-${member.user.username}-${product.toLowerCase().replace(/[^a-z0-9]/gi, "")}`
      : `support-ticket-${member.user.username}`;

    const existing = guild.channels.cache.find(c => c.name === channelName);
    if (existing) return interaction.reply({ content: "❌ You already have a ticket open.", ephemeral: true });

    const category = type === "shop" ? config.shopCategory : config.supportCategory;
    const channel = await guild.channels.create({
      name: channelName.slice(0, 90),
      type: ChannelType.GuildText,
      parent: category,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: config.supportRole, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });
        const embed = new EmbedBuilder()
      .setTitle("Ticket Opened")
      .setDescription(
        `Hey <@${member.id}>!\n• <@&${config.supportRole}> will be with you shortly\n• Don’t spam or ping or you may receive a warning.\n• By opening this ticket, you automatically agree with <#1357307547589152875>\n\n` +
        (type === "shop"
          ? `🛒 **Shop Ticket Summary**\n📦 Product: ${product}\n💳 Payment: ${payment}\n📝 Description: ${details}\n🧾 Order ID: ${orderId}`
          : `📝 **Issue**: ${details}`)
      )
      .setColor("#FFFFFF")
      .setImage(IMAGE_URL)
      .setFooter({ text: "Dior $elling" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm-close").setLabel("❌ Close Ticket").setStyle(ButtonStyle.Danger),
      ...(type === "shop"
        ? [new ButtonBuilder().setCustomId("mark-delivered").setLabel("✅ Mark as Delivered").setStyle(ButtonStyle.Success)]
        : [])
    );

    await channel.send({ content: `<@${member.id}> <@&${config.supportRole}>`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
  }
});

client.login(process.env.TOKEN || config.token);
