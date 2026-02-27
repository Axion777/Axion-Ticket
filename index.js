// index.js (النسخة المحدثة مع UI/UX المحسّن)

const {
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
    ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const express = require('express');

// ===============================================
// 1. المتغيرات والتهيئة
// ===============================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const MANAGER_ROLE_ID = process.env.MANAGER_ROLE_ID;
const LOGS_CHANNEL_ID = process.env.LOGS_CHANNEL_ID;
const PREFIX = '-';
const ARCHIVE_CATEGORY_ID = '1449459496144470056';

// رابط صورة التكت
const TICKET_IMAGE_URL = 'https://d.top4top.io/p_3710jchmp1.png';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

const SERVICE_OPTIONS = {
    'programming_services': {
        label: 'طلب خدمات برمجية',
        description: 'اطلب تطوير بوتات، مواقع، أو سكربتات خاصة.',
        emoji: '💻',
        categoryName: 'خدمات-برمجية',
        color: '#5865F2'
    },
    'account_installation': {
        label: 'تثبيت حسابات ديسكورد',
        description: 'اطلب تثبيت حسابك/حساباتك في ديسكورد.',
        emoji: '✅',
        categoryName: 'تثبيت-حسابات',
        color: '#57F287'
    },
    'general_ticket': {
        label: 'تكت عام/استفسار',
        description: 'للاستفسارات العامة أو الطلبات غير المدرجة.',
        emoji: '🎫',
        categoryName: 'تكت-عام',
        color: '#FEE75C'
    }
};

// تخزين وقت فتح التكت لحساب المدة
const ticketOpenTime = new Map();

// ===============================================
// 2. الدوال المساعدة
// ===============================================

function createSetupComponents() {
    // زر واحد يفتح المنيو بدل Select Menu مباشرة
    const openMenuButton = new ButtonBuilder()
        .setCustomId('open_ticket_menu')
        .setLabel('فتح تكت')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫');

    return [new ActionRowBuilder().addComponents(openMenuButton)];
}

function createSelectMenuComponents() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('service_select_menu')
        .setPlaceholder('اختر نوع الخدمة التي تحتاجها...')
        .addOptions(
            Object.keys(SERVICE_OPTIONS).map(key => ({
                label: SERVICE_OPTIONS[key].label,
                description: SERVICE_OPTIONS[key].description,
                value: key,
                emoji: SERVICE_OPTIONS[key].emoji
            }))
        );
    return [new ActionRowBuilder().addComponents(selectMenu)];
}

function createTicketComponents() {
    const claimButton = new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('تولي التكت')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✋');

    const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('إغلاق التكت')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

    return new ActionRowBuilder().addComponents(claimButton, closeButton);
}

function createRatingComponents() {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rate_1').setLabel('⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rate_2').setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rate_3').setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rate_4').setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rate_5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success)
    );
    return row;
}

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} يوم و ${hours % 24} ساعة`;
    if (hours > 0) return `${hours} ساعة و ${minutes % 60} دقيقة`;
    return `${minutes} دقيقة`;
}

// ===============================================
// 3. أحداث البوت
// ===============================================

client.on('ready', () => {
    console.log(`✅ البوت جاهز! تم تسجيل الدخول باسم: ${client.user.tag}`);
    client.user.setActivity(`فتح التكتات | ${PREFIX}setup`, { type: 3 });
});

// أمر -setup
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (commandName === 'setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: '❌ لا تملك صلاحية استخدام هذا الأمر (مطلوب: مسؤول).' });
        }

        try {
            const setupEmbed = new EmbedBuilder()
                .setImage(TICKET_IMAGE_URL)
                .setColor('#0099ff');

            await message.channel.send({
                embeds: [setupEmbed],
                components: createSetupComponents()
            });

            await message.delete().catch(() => {});
            await message.channel.send({ content: '✅ تم إرسال رسالة نظام التكتات!' })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        } catch (error) {
            console.error('فشل في إرسال رسالة الإعداد:', error);
            await message.reply({ content: '❌ حدث خطأ أثناء إرسال رسالة الإعداد.' });
        }
    }
});

// التفاعلات
client.on('interactionCreate', async interaction => {

    // زر فتح المنيو
    if (interaction.isButton() && interaction.customId === 'open_ticket_menu') {
        await interaction.reply({
            content: '👇 اختر نوع الخدمة:',
            components: createSelectMenuComponents(),
            ephemeral: true
        });
        return;
    }

    // اختيار نوع الخدمة → يفتح Modal
    if (interaction.isStringSelectMenu() && interaction.customId === 'service_select_menu') {
        const selectedValue = interaction.values[0];
        const serviceInfo = SERVICE_OPTIONS[selectedValue];

        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${selectedValue}`)
            .setTitle(`${serviceInfo.emoji} ${serviceInfo.label}`);

        const titleInput = new TextInputBuilder()
            .setCustomId('ticket_title')
            .setLabel('عنوان الطلب')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('اكتب عنواناً مختصراً لطلبك...')
            .setRequired(true)
            .setMaxLength(100);

        const descInput = new TextInputBuilder()
            .setCustomId('ticket_description')
            .setLabel('وصف الطلب بالتفصيل')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('اشرح طلبك بالتفصيل هنا...')
            .setRequired(true)
            .setMaxLength(1000);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput)
        );

        await interaction.showModal(modal);
        return;
    }

    // استقبال Modal
    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
        const serviceKey = interaction.customId.replace('ticket_modal_', '');
        const ticketTitle = interaction.fields.getTextInputValue('ticket_title');
        const ticketDescription = interaction.fields.getTextInputValue('ticket_description');
        await openTicket(interaction, serviceKey, ticketTitle, ticketDescription);
        return;
    }

    // أزرار التكت
    if (interaction.isButton()) {
        if (interaction.customId === 'close_ticket') {
            await handleTicketClose(interaction);
        } else if (interaction.customId === 'claim_ticket') {
            await handleTicketClaim(interaction);
        } else if (interaction.customId.startsWith('rate_')) {
            await handleRating(interaction);
        } else if (interaction.customId.startsWith('dm_note_')) {
            // زر الملاحظة من الـ DM
            const parts = interaction.customId.split('_');
            const channelId = parts[parts.length - 1];

            const noteModal = new ModalBuilder()
                .setCustomId(`note_modal_${channelId}`)
                .setTitle('📝 ملاحظة للإدارة');

            const noteInput = new TextInputBuilder()
                .setCustomId('note_text')
                .setLabel('ملاحظتك على الخدمة')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('اكتب ملاحظتك هنا...')
                .setRequired(true)
                .setMaxLength(500);

            noteModal.addComponents(new ActionRowBuilder().addComponents(noteInput));
            await interaction.showModal(noteModal);
        }
    }

    // استقبال ملاحظة من الـ DM
    if (interaction.isModalSubmit() && interaction.customId.startsWith('note_modal_')) {
        const channelId = interaction.customId.replace('note_modal_', '');
        const noteText = interaction.fields.getTextInputValue('note_text');

        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#57F287')
                .setDescription('✅ **تم إرسال ملاحظتك للإدارة بنجاح!**\nشكراً على وقتك. 😊')
            ],
            ephemeral: true
        });

        // إرسال الملاحظة للوق
        const guild = client.guilds.cache.first();
        const logsChannel = guild?.channels.cache.get(LOGS_CHANNEL_ID);
        if (logsChannel) {
            await logsChannel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#5865F2')
                    .setAuthor({
                        name: `ملاحظة من ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    })
                    .setTitle('📝 ملاحظة عضو على تكت')
                    .addFields(
                        { name: '👤 العضو', value: `${interaction.user} \`${interaction.user.tag}\``, inline: true },
                        { name: '📋 التكت', value: `\`${channelId}\``, inline: true },
                        { name: '💬 الملاحظة', value: noteText, inline: false }
                    )
                    .setTimestamp()
                ]
            });
        }
    }
});

// ===============================================
// 4. فتح التكت
// ===============================================

async function openTicket(interaction, serviceKey, ticketTitle, ticketDescription) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const member = interaction.member;
    const serviceInfo = SERVICE_OPTIONS[serviceKey];

    const existingTicket = guild.channels.cache.find(c =>
        c.topic === member.user.id &&
        !c.name.startsWith('closed-')
    );
    if (existingTicket) {
        return interaction.editReply({ content: `❌ لديك بالفعل تكت مفتوح: ${existingTicket}` });
    }

    const channelName = `${serviceInfo.categoryName}-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`.substring(0, 100);

    try {
        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            topic: member.user.id,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: MANAGER_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ],
        });

        ticketOpenTime.set(ticketChannel.id, Date.now());

        const ticketEmbed = new EmbedBuilder()
            .setColor(serviceInfo.color)
            .setTitle(`${serviceInfo.emoji} ${serviceInfo.label}`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 صاحب الطلب', value: `${member}`, inline: true },
                { name: '📋 نوع الخدمة', value: serviceInfo.label, inline: true },
                { name: '🕐 وقت الفتح', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                { name: '📌 عنوان الطلب', value: ticketTitle, inline: false },
                { name: '📝 التفاصيل', value: ticketDescription, inline: false }
            )
            .setFooter({ text: 'سيتم التواصل معك من قِبل المسؤولين قريباً' })
            .setTimestamp();

        await ticketChannel.send({
            content: `${member} | <@&${MANAGER_ROLE_ID}>`,
            embeds: [ticketEmbed],
            components: [createTicketComponents()]
        });

        await interaction.editReply({ content: `✅ تم فتح تكتك بنجاح! 👉 ${ticketChannel}` });

    } catch (error) {
        console.error('فشل في فتح التكت:', error);
        await interaction.editReply({ content: '❌ حدث خطأ أثناء فتح التكت.' });
    }
}

// ===============================================
// 5. إغلاق التكت
// ===============================================

async function handleTicketClose(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) {
        return interaction.editReply({ content: '❌ هذه الصلاحية للمسؤولين فقط.' });
    }

    const channel = interaction.channel;
    const ticketOwnerId = channel.topic;
    if (!ticketOwnerId) {
        return interaction.editReply({ content: '❌ هذه القناة ليست تكت صالح.' });
    }

    try {
        const ticketOwner = await interaction.guild.members.fetch(ticketOwnerId).catch(() => null);
        let dmSent = false;

        if (ticketOwner) {
            // Embed رئيسي احترافي
            const dmEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({
                    name: interaction.guild.name,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTitle('🔒 تم إغلاق تكتك')
                .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
                .setDescription(
                    `مرحباً **${ticketOwner.user.username}** 👋\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━\n` +
                    `شكراً جزيلاً على تواصلك معنا،\nلقد تم إغلاق تكتك بنجاح من قِبل فريق الدعم.\n` +
                    `━━━━━━━━━━━━━━━━━━━━━`
                )
                .addFields(
                    { name: '🏠 السيرفر', value: `\`${interaction.guild.name}\``, inline: true },
                    { name: '📋 اسم التكت', value: `\`${channel.name}\``, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                    { name: '🔒 أُغلق بواسطة', value: `${interaction.user} \`${interaction.user.tag}\``, inline: true },
                    { name: '🕐 وقت الإغلاق', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                    { name: '💡 هل تحتاج مساعدة أخرى؟', value: 'يسعدنا دائماً خدمتك! لا تتردد في فتح تكت جديد في أي وقت. 😊', inline: false }
                )
                .setImage('https://i.imgur.com/wSTFkRM.png') // خط فاصل جمالي
                .setFooter({
                    text: `${interaction.guild.name} • فريق الدعم`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // Embed التقييم في الـ DM
            const dmRatingEmbed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('⭐ كيف كانت تجربتك معنا؟')
                .setDescription(
                    `رأيك يهمنا كثيراً ويساعدنا على تحسين خدماتنا.\n\n` +
                    `**اختر تقييمك:**`
                )
                .setFooter({ text: 'يمكنك أيضاً إضافة ملاحظة للإدارة بالضغط على الزر أدناه' });

            const noteButton = new ButtonBuilder()
                .setCustomId(`dm_note_${ticketOwnerId}_${channel.id}`)
                .setLabel('إضافة ملاحظة للإدارة')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📝');

            const noteRow = new ActionRowBuilder().addComponents(noteButton);

            await ticketOwner.send({
                embeds: [dmEmbed, dmRatingEmbed],
                components: [createRatingComponents(), noteRow]
            })
            .then(() => { dmSent = true; })
            .catch(() => { dmSent = false; });
        }

        // إرسال للوق
        const logsChannel = interaction.guild.channels.cache.get(LOGS_CHANNEL_ID);
        if (logsChannel) {
            await logsChannel.send({
                embeds: [new EmbedBuilder()
                    .setColor(dmSent ? '#57F287' : '#ED4245')
                    .setAuthor({
                        name: `إغلاق تكت — ${channel.name}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    })
                    .setDescription(
                        `${dmSent ? '✅ تم إرسال رسالة DM بنجاح' : '❌ فشل الإرسال (الخاص مغلق)'}\n` +
                        `👤 صاحب التكت: <@${ticketOwnerId}>\n` +
                        `🔒 أُغلق بواسطة: ${interaction.user}`
                    )
                    .setTimestamp()
                ]
            });
        }

        // أرشفة بعد 30 ثانية
        setTimeout(async () => {
            await channel.permissionOverwrites.edit(ticketOwnerId, { ViewChannel: false }).catch(() => {});
            await archiveChannel(channel, interaction, ticketOwnerId);
        }, 30000);

        await interaction.editReply({
            content: `✅ سيتم إغلاق التكت خلال 30 ثانية.\n${dmSent ? '📨 تم إرسال رسالة خاصة للعضو مع التقييم.' : '⚠️ لم يتم إرسال رسالة خاصة (الخاص مغلق).'}`
        });

    } catch (error) {
        console.error('فشل في إغلاق التكت:', error);
        await interaction.editReply({ content: '❌ حدث خطأ أثناء الإغلاق.' });
    }
}

async function archiveChannel(channel, interaction, ticketOwnerId) {
    try {
        const openTime = ticketOpenTime.get(channel.id);
        const duration = openTime ? formatDuration(Date.now() - openTime) : 'غير معروف';
        ticketOpenTime.delete(channel.id);

        await channel.setParent(ARCHIVE_CATEGORY_ID, { lockPermissions: false });
        await channel.setName(`closed-${channel.name}`);

        const logsChannel = interaction.guild.channels.cache.get(LOGS_CHANNEL_ID);
        if (logsChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('📁 تكت مؤرشف')
                .addFields(
                    { name: '👤 صاحب التكت', value: `<@${ticketOwnerId}>`, inline: true },
                    { name: '🔒 أُغلق بواسطة', value: `${interaction.user}`, inline: true },
                    { name: '⏱️ مدة التكت', value: duration, inline: true },
                    { name: '📋 اسم القناة', value: channel.name, inline: false }
                )
                .setTimestamp();

            await logsChannel.send({ embeds: [logEmbed] });
        }
    } catch (err) {
        console.error('فشل في الأرشفة:', err);
    }
}

// ===============================================
// 6. تولي التكت
// ===============================================

async function handleTicketClaim(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) {
        return interaction.editReply({ content: '❌ هذه الصلاحية للمسؤولين فقط.' });
    }

    const channel = interaction.channel;
    const managerRole = interaction.guild.roles.cache.get(MANAGER_ROLE_ID);

    await channel.permissionOverwrites.edit(managerRole, { ViewChannel: false });
    await channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

    const newComponents = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('إغلاق التكت')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
    );

    await interaction.message.edit({ components: [newComponents] });

    const claimEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setDescription(`✋ **تم تولي هذا التكت بواسطة ${interaction.user}**\nسيتم التعامل مع طلبك قريباً.`);

    await channel.send({ embeds: [claimEmbed] }).then(m => m.pin().catch(() => {}));

    await interaction.editReply({ content: '✅ تم تولي التكت بنجاح.' });
}

// ===============================================
// 7. التقييم
// ===============================================

async function handleRating(interaction) {
    const stars = parseInt(interaction.customId.replace('rate_', ''));
    const starsText = '⭐'.repeat(stars);

    const ratingEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('✅ تم تسجيل تقييمك')
        .setDescription(`${starsText}\n\n**شكراً على تقييمك!**\nرأيك يساعدنا على تحسين خدماتنا باستمرار. 😊`)
        .setTimestamp();

    await interaction.update({ embeds: [interaction.message.embeds[0], ratingEmbed], components: [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(interaction.message.components[1]?.components[0]?.customId || 'dm_note_done')
                .setLabel('إضافة ملاحظة للإدارة')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📝')
        )
    ]});

    // إرسال التقييم للوق
    const guild = client.guilds.cache.first();
    const logsChannel = guild?.channels.cache.get(LOGS_CHANNEL_ID);
    if (logsChannel) {
        await logsChannel.send({
            embeds: [new EmbedBuilder()
                .setColor('#FEE75C')
                .setAuthor({
                    name: `تقييم من ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTitle('⭐ تقييم جديد')
                .addFields(
                    { name: '👤 المستخدم', value: `${interaction.user}`, inline: true },
                    { name: '⭐ التقييم', value: starsText, inline: true }
                )
                .setTimestamp()
            ]
        });
    }
}

// ===============================================
// 8. تسجيل الدخول
// ===============================================

client.login(BOT_TOKEN);

// ===============================================
// 9. خادم وهمي لـ Render
// ===============================================

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Discord Bot is running!'));
app.listen(port, () => console.log(`Web Server listening on port ${port}`));
