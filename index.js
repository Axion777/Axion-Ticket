const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const express = require('express');

// ===============================================
// 1. تهيئة المتغيرات من Render Env
// ===============================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const MANAGER_ROLE_ID = process.env.MANAGER_ROLE_ID;
const LOGS_CHANNEL_ID = process.env.LOGS_CHANNEL_ID; 
const REQUESTS_ROOM_ID = process.env.REQUESTS_ROOM_ID;
const ARCHIVE_CATEGORY_ID = process.env.ARCHIVE_CATEGORY_ID;
const IMAGE_URL = "https://i.top4top.io/p_3683q7lu71.png"; // رابط صورتك
const PREFIX = '-';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
    ]
});

// الأقسام المتاحة في المنيو
const SERVICE_OPTIONS = {
    'programming': { label: 'طلب خدمات برمجية', emoji: '💻', catName: 'dev' },
    'accounts': { label: 'تثبيت حسابات', emoji: '✅', catName: 'acc' },
    'general': { label: 'تكت عام / استفسار', emoji: '🎫', catName: 'gen' }
};

client.on('ready', () => {
    console.log(`✅ Don Mode Active: ${client.user.tag}`);
    client.user.setActivity(`${PREFIX}setup`, { type: 3 });
});

// ===============================================
// 2. أمر الإعداد (Setup)
// ===============================================
client.on('messageCreate', async message => {
    if (message.content === `${PREFIX}setup` && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('main_menu')
                .setPlaceholder('اختر القسم المطلوب لفتح تذكرة...')
                .addOptions(Object.keys(SERVICE_OPTIONS).map(k => ({
                    label: SERVICE_OPTIONS[k].label,
                    value: k,
                    emoji: SERVICE_OPTIONS[k].emoji
                })))
        );

        await message.channel.send({
            files: [IMAGE_URL],
            components: [row]
        });
        await message.delete().catch(() => {});
    }
});

// ===============================================
// 3. معالجة التفاعلات (Menu & Buttons)
// ===============================================
client.on('interactionCreate', async interaction => {
    
    // أ- اختيار من المنيو (إرسال طلب للإدارة)
    if (interaction.isStringSelectMenu() && interaction.customId === 'main_menu') {
        const selected = interaction.values[0];
        const service = SERVICE_OPTIONS[selected];
        const reqChannel = interaction.guild.channels.cache.get(REQUESTS_ROOM_ID);

        if (!reqChannel) return interaction.reply({ content: '❌ خطأ: روم الطلبات غير موجود.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('📩 طلب تكت جديد ينتظر الموافقة')
            .setColor('#f1c40f')
            .addFields(
                { name: 'المستخدم:', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                { name: 'القسم:', value: service.label, inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`approve_${interaction.user.id}_${selected}`).setLabel('قبول').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`deny_${interaction.user.id}`).setLabel('رفض').setStyle(ButtonStyle.Danger)
        );

        await reqChannel.send({ embeds: [embed], components: [buttons] });
        await interaction.reply({ content: '✅ تم إرسال طلبك للإدارة. ستتلقى إشعاراً عند القبول.', ephemeral: true });
    }

    // ب- أزرار القبول والرفض (للإدارة فقط)
    if (interaction.isButton()) {
        const [action, userId, serviceKey] = interaction.customId.split('_');
        
        if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الزر مخصص للإدارة فقط.', ephemeral: true });
        }

        const targetUser = await interaction.guild.members.fetch(userId).catch(() => null);

        if (action === 'approve') {
            const service = SERVICE_OPTIONS[serviceKey];
            const ticketChannel = await interaction.guild.channels.create({
                name: `${service.catName}-${targetUser ? targetUser.user.username : 'user'}`,
                type: ChannelType.GuildText,
                parent: interaction.channel.parentId, // يفتح في نفس الفئة أو حدد ID
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: MANAGER_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ]
            });

            const welcomeEmbed = new EmbedBuilder()
                .setTitle('✅ تم قبول طلبك')
                .setDescription(`مرحباً بك <@${userId}>، تفضل بطرح طلبك هنا وسيتم الرد عليك قريباً.`)
                .setColor('#2ecc71');

            const closeBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التكت').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await ticketChannel.send({ content: `<@${userId}> | <@&${MANAGER_ROLE_ID}>`, embeds: [welcomeEmbed], components: [closeBtn] });
            await interaction.message.edit({ content: `✅ تم قبول الطلب بواسطة ${interaction.user.tag}`, embeds: [], components: [] });
            
            // Log
            const logChan = interaction.guild.channels.cache.get(LOGS_CHANNEL_ID);
            if(logChan) logChan.send(`📝 تكت جديد فُتح لـ <@${userId}> بواسطة ${interaction.user.tag}`);
        }

        if (action === 'deny') {
            await interaction.message.edit({ content: `❌ تم رفض الطلب بواسطة ${interaction.user.tag}`, embeds: [], components: [] });
            if (targetUser) targetUser.send('❌ نأسف، لقد تم رفض طلبك لفتح تكت.').catch(() => {});
        }

        // ج- إغلاق التكت والأرشفة
        if (interaction.customId === 'close_ticket') {
            await interaction.channel.edit({
                name: `closed-${interaction.channel.name}`,
                parent: ARCHIVE_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: MANAGER_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
                ]
            });
            await interaction.reply('🔒 تم إغلاق التكت ونقله للأرشيف.');
            
            const logChan = interaction.guild.channels.cache.get(LOGS_CHANNEL_ID);
            if(logChan) logChan.send(`🔒 تم إغلاق تكت ${interaction.channel.name} بواسطة ${interaction.user.tag}`);
        }
    }
});

client.login(BOT_TOKEN);

// Server for Render
const app = express();
app.get('/', (req, res) => res.send('Don System Running 24/7'));
app.listen(process.env.PORT || 3000);
