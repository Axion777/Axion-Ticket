// index.js (النسخة النهائية الكاملة)

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

const ticketOpenTime = new Map();
// Map<adminId, { tag, total, count, history[] }>
const adminRatings = new Map();
// Map<channelId, { adminId, adminTag }>
const ticketClaimer = new Map();

// ===============================================
// 2. الدوال المساعدة
// ===============================================

function createSetupComponents() {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('open_ticket_menu')
            .setLabel('فتح تكت')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
    )];
}

function createSelectMenuComponents() {
    return [new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('service_select_menu')
            .setPlaceholder('اختر نوع الخدمة التي تحتاجها...')
            .addOptions(Object.keys(SERVICE_OPTIONS).map(key => ({
                label: SERVICE_OPTIONS[key].label,
                description: SERVICE_OPTIONS[key].description,
                value: key,
                emoji: SERVICE_OPTIONS[key].emoji
            })))
    )];
}

function createTicketComponents() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('تولي التكت').setStyle(ButtonStyle.Success).setEmoji('✋'),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التكت').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );
}

function createRatingComponents() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rate_1').setLabel('⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rate_2').setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rate_3').setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rate_4').setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rate_5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success)
    );
}

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} يوم و ${hours % 24} ساعة`;
    if (hours > 0) return `${hours} ساعة و ${minutes % 60} دقيقة`;
    return `${minutes} دقيقة`;
}

function storeRating(adminId, adminTag, stars, ticketName, memberTag) {
    if (!adminRatings.has(adminId)) {
        adminRatings.set(adminId, { tag: adminTag, total: 0, count: 0, history: [] });
    }
    const data = adminRatings.get(adminId);
    data.total += stars;
    data.count += 1;
    data.history.push({ stars, ticketName, memberTag, time: Date.now() });
    if (data.history.length > 20) data.history.shift();
}

// ===============================================
// 3. الأوامر
// ===============================================

client.on('ready', () => {
    console.log(`✅ البوت جاهز! تم تسجيل الدخول باسم: ${client.user.tag}`);
    client.user.setActivity(`فتح التكتات | ${PREFIX}setup`, { type: 3 });
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // ─── setup ───
    if (commandName === 'setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return message.reply({ content: '❌ لا تملك صلاحية استخدام هذا الأمر (مطلوب: مسؤول).' });
        try {
            // صورة سادة بدون Embed
            await message.channel.send({ content: TICKET_IMAGE_URL, components: createSetupComponents() });
            await message.delete().catch(() => {});
            await message.channel.send({ content: '✅ تم إرسال رسالة نظام التكتات!' })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        } catch (error) {
            console.error('فشل في إرسال رسالة الإعداد:', error);
            await message.reply({ content: '❌ حدث خطأ أثناء إرسال رسالة الإعداد.' });
        }
    }

    // ─── stats ───
    if (commandName === 'stats') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return message.reply({ content: '❌ هذا الأمر للمسؤولين فقط.' });

        let targetId = null;
        if (message.mentions.users.size > 0) {
            targetId = message.mentions.users.first().id;
        } else if (args[0] && /^\d+$/.test(args[0])) {
            targetId = args[0];
        }

        if (!targetId)
            return message.reply({ content: '❌ الاستخدام: `-stats @الاداري` أو `-stats ID`' });

        let targetUser;
        try { targetUser = await client.users.fetch(targetId); }
        catch { return message.reply({ content: '❌ لم يتم العثور على هذا المستخدم.' }); }

        const data = adminRatings.get(targetId);

        if (!data || data.count === 0) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription(`❌ لا توجد تقييمات مسجلة لـ **${targetUser.tag}** حتى الآن.`)
                ]
            });
        }

        const avg = (data.total / data.count).toFixed(1);
        const avgStars = '⭐'.repeat(Math.round(data.total / data.count));
        const recentHistory = data.history.slice(-5).reverse()
            .map((r, i) => `**${i + 1}.** ${'⭐'.repeat(r.stars)} — \`${r.ticketName}\` | بواسطة: \`${r.memberTag}\` | <t:${Math.floor(r.time / 1000)}:R>`)
            .join('\n');

        await message.reply({
            embeds: [new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: `إحصائيات ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .setTitle('📊 إحصائيات الإداري')
                .addFields(
                    { name: '👤 الإداري', value: `<@${targetId}> \`${targetUser.tag}\``, inline: true },
                    { name: '🪪 الـ ID', value: `\`${targetId}\``, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                    { name: '🎫 إجمالي التقييمات', value: `\`${data.count}\` تقييم`, inline: true },
                    { name: '⭐ متوسط التقييم', value: `\`${avg}/5\` ${avgStars}`, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                    { name: '🕐 آخر 5 تقييمات', value: recentHistory || 'لا يوجد', inline: false }
                )
                .setFooter({ text: `${message.guild.name} • نظام التكتات`, iconURL: message.guild.iconURL({ dynamic: true }) })
                .setTimestamp()
            ]
        });
    }
});

// ===============================================
// 4. التفاعلات
// ===============================================

client.on('interactionCreate', async interaction => {

    // زر فتح المنيو
    if (interaction.isButton() && interaction.customId === 'open_ticket_menu') {
        return interaction.reply({ content: '👇 اختر نوع الخدمة:', components: createSelectMenuComponents(), ephemeral: true });
    }

    // اختيار الخدمة → Modal
    if (interaction.isStringSelectMenu() && interaction.customId === 'service_select_menu') {
        const serviceInfo = SERVICE_OPTIONS[interaction.values[0]];
        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${interaction.values[0]}`)
            .setTitle(`${serviceInfo.emoji} ${serviceInfo.label}`)
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('ticket_title').setLabel('عنوان الطلب')
                        .setStyle(TextInputStyle.Short).setPlaceholder('اكتب عنواناً مختصراً...').setRequired(true).setMaxLength(100)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('ticket_description').setLabel('وصف الطلب بالتفصيل')
                        .setStyle(TextInputStyle.Paragraph).setPlaceholder('اشرح طلبك بالتفصيل...').setRequired(true).setMaxLength(1000)
                )
            );
        return interaction.showModal(modal);
    }

    // استقبال Modal التكت
    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
        return openTicket(
            interaction,
            interaction.customId.replace('ticket_modal_', ''),
            interaction.fields.getTextInputValue('ticket_title'),
            interaction.fields.getTextInputValue('ticket_description')
        );
    }

    // أزرار
    if (interaction.isButton()) {
        if (interaction.customId === 'close_ticket') return handleTicketClose(interaction);
        if (interaction.customId === 'claim_ticket') return handleTicketClaim(interaction);
        if (interaction.customId.startsWith('rate_')) return handleRating(interaction);
        if (interaction.customId.startsWith('dm_note_')) {
            const channelId = interaction.customId.split('_').pop();
            const noteModal = new ModalBuilder()
                .setCustomId(`note_modal_${channelId}`)
                .setTitle('📝 ملاحظة للإدارة')
                .addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('note_text').setLabel('ملاحظتك على الخدمة')
                        .setStyle(TextInputStyle.Paragraph).setPlaceholder('اكتب ملاحظتك هنا...').setRequired(true).setMaxLength(500)
                ));
            return interaction.showModal(noteModal);
        }
    }

    // استقبال ملاحظة من DM
    if (interaction.isModalSubmit() && interaction.customId.startsWith('note_modal_')) {
        const channelId = interaction.customId.replace('note_modal_', '');
        const noteText = interaction.fields.getTextInputValue('note_text');

        await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#57F287').setDescription('✅ **تم إرسال ملاحظتك للإدارة بنجاح!**\nشكراً على وقتك. 😊')],
            ephemeral: true
        });

        const logsChannel = client.guilds.cache.first()?.channels.cache.get(LOGS_CHANNEL_ID);
        if (logsChannel) {
            await logsChannel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#5865F2')
                    .setAuthor({ name: `ملاحظة من ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                    .setTitle('📝 ملاحظة عضو')
                    .addFields(
                        { name: '👤 العضو', value: `${interaction.user} \`${interaction.user.tag}\``, inline: true },
                        { name: '📋 قناة التكت', value: `\`${channelId}\``, inline: true },
                        { name: '💬 الملاحظة', value: noteText, inline: false }
                    )
                    .setTimestamp()
                ]
            });
        }
    }
});

// ===============================================
// 5. فتح التكت
// ===============================================

async function openTicket(interaction, serviceKey, ticketTitle, ticketDescription) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const member = interaction.member;
    const serviceInfo = SERVICE_OPTIONS[serviceKey];

    const existingTicket = guild.channels.cache.find(c => c.topic === member.user.id && !c.name.startsWith('closed-'));
    if (existingTicket) return interaction.editReply({ content: `❌ لديك بالفعل تكت مفتوح: ${existingTicket}` });

    try {
        const ticketChannel = await guild.channels.create({
            name: `${serviceInfo.categoryName}-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`.substring(0, 100),
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

        await ticketChannel.send({
            content: `${member} | <@&${MANAGER_ROLE_ID}>`,
            embeds: [new EmbedBuilder()
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
                .setTimestamp()
            ],
            components: [createTicketComponents()]
        });

        await interaction.editReply({ content: `✅ تم فتح تكتك بنجاح! 👉 ${ticketChannel}` });
    } catch (error) {
        console.error('فشل في فتح التكت:', error);
        await interaction.editReply({ content: '❌ حدث خطأ أثناء فتح التكت.' });
    }
}

// ===============================================
// 6. إغلاق التكت
// ===============================================

async function handleTicketClose(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID))
        return interaction.editReply({ content: '❌ هذه الصلاحية للمسؤولين فقط.' });

    const channel = interaction.channel;
    const ticketOwnerId = channel.topic;
    if (!ticketOwnerId)
        return interaction.editReply({ content: '❌ هذه القناة ليست تكت صالح.' });

    const claimer = ticketClaimer.get(channel.id);

    try {
        const ticketOwner = await interaction.guild.members.fetch(ticketOwnerId).catch(() => null);
        let dmSent = false;

        if (ticketOwner) {
            await ticketOwner.send({
                embeds: [
                    // Embed الإغلاق
                    new EmbedBuilder()
                        .setColor('#5865F2')
                        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                        .setTitle('🔒 تم إغلاق تكتك')
                        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
                        .setDescription(
                            `مرحباً **${ticketOwner.user.username}** 👋\n\n` +
                            `━━━━━━━━━━━━━━━━━━━━━\n` +
                            `شكراً جزيلاً على تواصلك معنا،\nتم إغلاق تكتك بنجاح من قِبل فريق الدعم.\n` +
                            `━━━━━━━━━━━━━━━━━━━━━`
                        )
                        .addFields(
                            { name: '🏠 السيرفر', value: `\`${interaction.guild.name}\``, inline: true },
                            { name: '📋 اسم التكت', value: `\`${channel.name}\``, inline: true },
                            { name: '\u200b', value: '\u200b', inline: true },
                            { name: '🔒 أُغلق بواسطة', value: `\`${interaction.user.tag}\``, inline: true },
                            { name: '🕐 وقت الإغلاق', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: '\u200b', value: '\u200b', inline: true },
                            { name: '💡 هل تحتاج مساعدة أخرى؟', value: 'يسعدنا دائماً خدمتك! لا تتردد في فتح تكت جديد في أي وقت. 😊', inline: false }
                        )
                        .setFooter({ text: `${interaction.guild.name} • فريق الدعم` })
                        .setTimestamp(),
                    // Embed التقييم
                    new EmbedBuilder()
                        .setColor('#FEE75C')
                        .setTitle('⭐ كيف كانت تجربتك معنا؟')
                        .setDescription(
                            `رأيك يهمنا كثيراً ويساعدنا على تحسين خدماتنا.\n\n` +
                            `${claimer ? `🛡️ **الإداري الذي تولى تكتك:** \`${claimer.adminTag}\`\n\n` : ''}` +
                            `**اختر تقييمك:**`
                        )
                        .setFooter({ text: 'يمكنك إضافة ملاحظة للإدارة بالضغط على الزر أدناه' })
                ],
                components: [
                    createRatingComponents(),
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`dm_note_${ticketOwnerId}_${channel.id}`)
                            .setLabel('إضافة ملاحظة للإدارة')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('📝')
                    )
                ]
            })
            .then(() => { dmSent = true; })
            .catch(() => { dmSent = false; });
        }

        // لوق الإغلاق
        const logsChannel = interaction.guild.channels.cache.get(LOGS_CHANNEL_ID);
        if (logsChannel) {
            await logsChannel.send({
                embeds: [new EmbedBuilder()
                    .setColor(dmSent ? '#57F287' : '#ED4245')
                    .setAuthor({ name: `إغلاق تكت — ${channel.name}`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setDescription(
                        `${dmSent ? '✅ تم إرسال رسالة DM بنجاح' : '❌ فشل الإرسال (الخاص مغلق)'}\n` +
                        `👤 صاحب التكت: <@${ticketOwnerId}>\n` +
                        `🔒 أُغلق بواسطة: \`${interaction.user.tag}\``
                    )
                    .setTimestamp()
                ]
            });
        }

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

// ===============================================
// 7. أرشفة التكت
// ===============================================

async function archiveChannel(channel, interaction, ticketOwnerId) {
    try {
        const openTime = ticketOpenTime.get(channel.id);
        const duration = openTime ? formatDuration(Date.now() - openTime) : 'غير معروف';
        ticketOpenTime.delete(channel.id);
        ticketClaimer.delete(channel.id);

        await channel.setParent(ARCHIVE_CATEGORY_ID, { lockPermissions: false });
        await channel.setName(`closed-${channel.name}`);

        const logsChannel = interaction.guild.channels.cache.get(LOGS_CHANNEL_ID);
        if (logsChannel) {
            await logsChannel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('📁 تكت مؤرشف')
                    .addFields(
                        { name: '👤 صاحب التكت', value: `<@${ticketOwnerId}>`, inline: true },
                        { name: '🔒 أُغلق بواسطة', value: `\`${interaction.user.tag}\``, inline: true },
                        { name: '⏱️ مدة التكت', value: duration, inline: true },
                        { name: '📋 اسم القناة', value: channel.name, inline: false }
                    )
                    .setTimestamp()
                ]
            });
        }
    } catch (err) {
        console.error('فشل في الأرشفة:', err);
    }
}

// ===============================================
// 8. تولي التكت
// ===============================================

async function handleTicketClaim(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID))
        return interaction.editReply({ content: '❌ هذه الصلاحية للمسؤولين فقط.' });

    const channel = interaction.channel;

    // حفظ الإداري الذي تولى
    ticketClaimer.set(channel.id, { adminId: interaction.user.id, adminTag: interaction.user.tag });

    await channel.permissionOverwrites.edit(interaction.guild.roles.cache.get(MANAGER_ROLE_ID), { ViewChannel: false });
    await channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

    await interaction.message.edit({
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التكت').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        )]
    });

    await channel.send({
        embeds: [new EmbedBuilder()
            .setColor('#57F287')
            .setDescription(`✋ **تم تولي هذا التكت بواسطة ${interaction.user}**\nسيتم التعامل مع طلبك قريباً.`)
        ]
    }).then(m => m.pin().catch(() => {}));

    await interaction.editReply({ content: '✅ تم تولي التكت بنجاح.' });
}

// ===============================================
// 9. التقييم
// ===============================================

async function handleRating(interaction) {
    const stars = parseInt(interaction.customId.replace('rate_', ''));
    const starsText = '⭐'.repeat(stars);

    // جلب اسم التكت من الـ embed الأول
    const ticketNameField = interaction.message.embeds[0]?.fields?.find(f => f.name.includes('اسم التكت'));
    const ticketName = ticketNameField?.value?.replace(/`/g, '') || 'غير معروف';

    // جلب تاق الإداري من الـ embed الثاني
    const claimerMatch = interaction.message.embeds[1]?.description?.match(/`([^`]+#\d{4}|[^`]+)`/);
    const claimerTag = claimerMatch?.[1];
    const guild = client.guilds.cache.first();
    let adminId = null;

    if (claimerTag) {
        const foundMember = guild?.members.cache.find(m => m.user.tag === claimerTag);
        if (foundMember) {
            adminId = foundMember.id;
            storeRating(adminId, claimerTag, stars, ticketName, interaction.user.tag);
        }
    }

    const noteCustomId = interaction.message.components[1]?.components[0]?.customId || 'dm_note_done';

    await interaction.update({
        embeds: [
            interaction.message.embeds[0],
            new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ تم تسجيل تقييمك')
                .setDescription(`${starsText}\n\n**شكراً على تقييمك!**\nرأيك يساعدنا على تحسين خدماتنا باستمرار. 😊`)
                .setTimestamp()
        ],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(noteCustomId).setLabel('إضافة ملاحظة للإدارة').setStyle(ButtonStyle.Secondary).setEmoji('📝')
        )]
    });

    const logsChannel = guild?.channels.cache.get(LOGS_CHANNEL_ID);
    if (logsChannel) {
        await logsChannel.send({
            embeds: [new EmbedBuilder()
                .setColor('#FEE75C')
                .setAuthor({ name: `تقييم من ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setTitle('⭐ تقييم جديد')
                .addFields(
                    { name: '👤 العضو', value: `\`${interaction.user.tag}\``, inline: true },
                    { name: '⭐ التقييم', value: `${starsText} (${stars}/5)`, inline: true },
                    { name: '📋 التكت', value: `\`${ticketName}\``, inline: true },
                    { name: '🛡️ الإداري المُقيَّم', value: adminId ? `<@${adminId}>` : `\`${claimerTag || 'غير محدد'}\``, inline: true }
                )
                .setTimestamp()
            ]
        });
    }
}

// ===============================================
// 10. تسجيل الدخول
// ===============================================

client.login(BOT_TOKEN);

// ===============================================
// 11. خادم وهمي لـ Render
// ===============================================

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Discord Bot is running!'));
app.listen(port, () => console.log(`Web Server listening on port ${port}`));
