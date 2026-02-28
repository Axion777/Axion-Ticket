// index.js (النسخة المحدثة الكاملة)

const {
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
    ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder,
    TextInputStyle, ActivityType, MessageFlags
} = require('discord.js');
const express = require('express');
const fs = require('fs');

// ===============================================
// 1. المتغيرات والتهيئة
// ===============================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const MANAGER_ROLE_ID = process.env.MANAGER_ROLE_ID;
const PREFIX = '-';

const LOGS_CHANNEL_ID       = '1449444036824797334';
const ARCHIVE_CATEGORY_ID   = '1449459496144470056';
const REQUESTS_CHANNEL_ID   = '1477338804502266079';
const STATS_CHANNEL_ID      = '1477339013663822037';

const TICKET_IMAGE_URL = 'https://d.top4top.io/p_3710jchmp1.png';
const DATA_FILE = './data.json';

// ───── تحميل/حفظ البيانات ─────
function loadData() {
    if (!fs.existsSync(DATA_FILE)) return { ratings: {}, points: {}, absents: [] };
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
    catch { return { ratings: {}, points: {}, absents: [] }; }
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

let db = loadData();

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

const PRIORITY_OPTIONS = {
    normal:   { label: 'عادي',  emoji: '🟢', color: '#57F287' },
    urgent:   { label: 'عاجل', emoji: '🟡', color: '#FEE75C' },
    critical: { label: 'حرج',  emoji: '🔴', color: '#ED4245' }
};

// Maps
const ticketOpenTime  = new Map(); // channelId → timestamp
const ticketClaimer   = new Map(); // channelId → { adminId, adminTag }
const pendingTickets  = new Map(); // requestMsgId → { userId, serviceKey, title, desc, priority, guildId, requestedAt }
const ticketOwnerMap  = new Map(); // channelId → ownerId
const firstTicketSet  = new Set(); // userIds سبق لهم تكت

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

function createPriorityComponents() {
    return [new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('priority_select_menu')
            .setPlaceholder('اختر مستوى الأهمية...')
            .addOptions([
                { label: 'عادي',  value: 'normal',   emoji: '🟢', description: 'طلب عادي بدون استعجال' },
                { label: 'عاجل', value: 'urgent',   emoji: '🟡', description: 'يحتاج رد سريع نسبياً' },
                { label: 'حرج',  value: 'critical', emoji: '🔴', description: 'أمر مستعجل جداً' }
            ])
    )];
}

function createTicketComponents() {
    return new ActionRowBuilder().addComponents(
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
    const hours   = Math.floor(minutes / 60);
    const days    = Math.floor(hours / 24);
    if (days > 0)    return `${days} يوم و ${hours % 24} ساعة`;
    if (hours > 0)   return `${hours} ساعة و ${minutes % 60} دقيقة`;
    return `${minutes} دقيقة`;
}

function storeRating(adminId, adminTag, stars, ticketName, memberTag) {
    if (!db.ratings[adminId]) db.ratings[adminId] = { tag: adminTag, total: 0, count: 0, history: [] };
    const d = db.ratings[adminId];
    d.total += stars;
    d.count += 1;
    d.history.push({ stars, ticketName, memberTag, time: Date.now() });
    if (d.history.length > 20) d.history.shift();
    saveData(db);
}

function addPoint(adminId, adminTag) {
    if (!db.points[adminId]) db.points[adminId] = { tag: adminTag, count: 0 };
    db.points[adminId].count += 1;
    db.points[adminId].tag = adminTag;
    saveData(db);
}

function isAbsent(adminId) {
    return db.absents && db.absents.includes(adminId);
}

async function sendLog(guild, embedData) {
    const ch = guild.channels.cache.get(LOGS_CHANNEL_ID);
    if (ch) await ch.send({ embeds: [embedData] }).catch(() => {});
}

// ===============================================
// 3. الجدولة التلقائية
// ===============================================

// إحصائيات يومية — كل منتصف ليل
function scheduleDailyStats() {
    const now = new Date();
    const next = new Date();
    next.setHours(24, 0, 0, 0);
    const diff = next - now;

    setTimeout(async () => {
        await sendDailyReport();
        setInterval(sendDailyReport, 24 * 60 * 60 * 1000);
    }, diff);
}

async function sendDailyReport() {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    const ch = guild.channels.cache.get(LOGS_CHANNEL_ID);
    if (!ch) return;

    const openCount   = guild.channels.cache.filter(c => c.topic && !c.name.startsWith('closed-')).size;
    const closedToday = guild.channels.cache.filter(c => c.name.startsWith('closed-')).size;

    // أفضل إداري حسب النقاط
    const sorted = Object.entries(db.points).sort((a, b) => b[1].count - a[1].count);
    const topAdmin = sorted[0] ? `<@${sorted[0][0]}> — ${sorted[0][1].count} تكت` : 'لا يوجد بعد';

    await ch.send({
        embeds: [new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📊 التقرير اليومي')
            .setDescription(`تقرير نهاية اليوم | <t:${Math.floor(Date.now() / 1000)}:D>`)
            .addFields(
                { name: '📂 تكتات مفتوحة الآن', value: `\`${openCount}\``, inline: true },
                { name: '📁 تكتات مغلقة اليوم', value: `\`${closedToday}\``, inline: true },
                { name: '🏆 أفضل إداري', value: topAdmin, inline: false }
            )
            .setFooter({ text: 'تقرير يومي تلقائي' })
            .setTimestamp()
        ]
    }).catch(() => {});
}

// تقرير أسبوعي — كل جمعة
function scheduleWeeklyReport() {
    function msUntilFriday() {
        const now = new Date();
        const day = now.getDay(); // 0=أحد, 5=جمعة
        const daysUntil = (5 - day + 7) % 7 || 7;
        const next = new Date(now);
        next.setDate(now.getDate() + daysUntil);
        next.setHours(20, 0, 0, 0);
        return next - now;
    }
    setTimeout(async () => {
        await sendWeeklyReport();
        setInterval(sendWeeklyReport, 7 * 24 * 60 * 60 * 1000);
    }, msUntilFriday());
}

async function sendWeeklyReport() {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    const ch = guild.channels.cache.get(LOGS_CHANNEL_ID);
    if (!ch) return;

    const sorted = Object.entries(db.points).sort((a, b) => b[1].count - a[1].count);
    const topList = sorted.slice(0, 5)
        .map((e, i) => `**${i + 1}.** <@${e[0]}> — \`${e[1].count}\` تكت`)
        .join('\n') || 'لا توجد بيانات';

    const avgRatings = Object.entries(db.ratings)
        .map(([id, d]) => ({ id, avg: d.total / d.count }))
        .sort((a, b) => b.avg - a.avg);
    const topRated = avgRatings[0]
        ? `<@${avgRatings[0].id}> — ${'⭐'.repeat(Math.round(avgRatings[0].avg))} (${avgRatings[0].avg.toFixed(1)})`
        : 'لا يوجد بعد';

    await ch.send({
        embeds: [new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('📅 التقرير الأسبوعي')
            .setDescription(`ملخص أداء الأسبوع — <t:${Math.floor(Date.now() / 1000)}:D>`)
            .addFields(
                { name: '🏆 أكثر الإداريين نشاطاً', value: topList, inline: false },
                { name: '⭐ أعلى تقييم', value: topRated, inline: false }
            )
            .setFooter({ text: 'تقرير أسبوعي تلقائي — كل جمعة' })
            .setTimestamp()
        ]
    }).catch(() => {});
}

// إحصائيات حية — كل ساعة
let statsMessageId = null;
async function updateLiveStats() {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    const ch = guild.channels.cache.get(STATS_CHANNEL_ID);
    if (!ch) return;

    const openTickets   = guild.channels.cache.filter(c => c.topic && !c.name.startsWith('closed-'));
    const closedTickets = guild.channels.cache.filter(c => c.name.startsWith('closed-'));

    const sorted   = Object.entries(db.points).sort((a, b) => b[1].count - a[1].count);
    const topAdmin = sorted[0] ? `<@${sorted[0][0]}> — ${sorted[0][1].count} تكت` : 'لا يوجد بعد';

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📊 إحصائيات السيرفر الحية')
        .addFields(
            { name: '📂 تكتات مفتوحة الآن', value: `\`${openTickets.size}\``, inline: true },
            { name: '📁 تكتات مؤرشفة', value: `\`${closedTickets.size}\``, inline: true },
            { name: '👥 إجمالي الإداريين', value: `\`${Object.keys(db.points).length}\``, inline: true },
            { name: '🏆 أفضل إداري', value: topAdmin, inline: false }
        )
        .setFooter({ text: 'يتحدث كل ساعة تلقائياً' })
        .setTimestamp();

    try {
        if (statsMessageId) {
            const msg = await ch.messages.fetch(statsMessageId).catch(() => null);
            if (msg) { await msg.edit({ embeds: [embed] }); return; }
        }
        const sent = await ch.send({ embeds: [embed] });
        statsMessageId = sent.id;
    } catch {}
}

// تنبيه التكتات المهجورة — كل ساعة
async function checkAbandonedTickets() {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    const logsChannel = guild.channels.cache.get(LOGS_CHANNEL_ID);
    if (!logsChannel) return;

    const sixHours = 6 * 60 * 60 * 1000;
    for (const [channelId, openTime] of ticketOpenTime.entries()) {
        if (Date.now() - openTime > sixHours) {
            const ch = guild.channels.cache.get(channelId);
            if (!ch || ch.name.startsWith('closed-')) {
                ticketOpenTime.delete(channelId);
                continue;
            }
            await logsChannel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('⚠️ تكت مهجور!')
                    .setDescription(`التكت ${ch} مفتوح منذ أكثر من **6 ساعات** دون رد!`)
                    .addFields({ name: '⏱️ مدة الانتظار', value: formatDuration(Date.now() - openTime), inline: true })
                    .setTimestamp()
                ]
            }).catch(() => {});
        }
    }
}

// ===============================================
// 4. الجاهزية
// ===============================================

client.on('ready', () => {
    console.log(`✅ البوت جاهز! تم تسجيل الدخول باسم: ${client.user.tag}`);
    client.user.setActivity(`فتح التكتات | ${PREFIX}setup`, { type: ActivityType.Watching });

    scheduleDailyStats();
    scheduleWeeklyReport();
    setInterval(updateLiveStats, 60 * 60 * 1000);
    setInterval(checkAbandonedTickets, 60 * 60 * 1000);
    setTimeout(updateLiveStats, 5000);
});

// ===============================================
// 5. الأوامر
// ===============================================

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;

    const args        = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const isManager   = message.member.roles.cache.has(MANAGER_ROLE_ID);
    const isAdmin     = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // ─── setup ───
    if (commandName === 'setup') {
        if (!isAdmin) return message.reply({ content: '❌ لا تملك صلاحية استخدام هذا الأمر.' });
        try {
            await message.channel.send({ content: TICKET_IMAGE_URL, components: createSetupComponents() });
            await message.delete().catch(() => {});
        } catch (e) {
            await message.reply({ content: '❌ حدث خطأ أثناء الإعداد.' });
        }
    }

    // ─── إحصائيات ───
    if (commandName === 'إحصائيات') {
        if (!isAdmin) return message.reply({ content: '❌ هذا الأمر للمسؤولين فقط.' });

        let targetId = message.mentions.users.size > 0
            ? message.mentions.users.first().id
            : (args[0] && /^\d+$/.test(args[0]) ? args[0] : null);

        if (!targetId) return message.reply({ content: '❌ الاستخدام: `-إحصائيات @الاداري`' });

        let targetUser;
        try { targetUser = await client.users.fetch(targetId); }
        catch { return message.reply({ content: '❌ لم يتم العثور على هذا المستخدم.' }); }

        const data = db.ratings[targetId];
        if (!data || data.count === 0)
            return message.reply({
                embeds: [new EmbedBuilder().setColor('#ED4245')
                    .setDescription(`❌ لا توجد تقييمات مسجلة لـ **${targetUser.tag}** حتى الآن.`)]
            });

        const avg     = (data.total / data.count).toFixed(1);
        const history = data.history.slice(-5).reverse()
            .map((r, i) => `**${i + 1}.** ${'⭐'.repeat(r.stars)} — \`${r.ticketName}\` | ${r.memberTag} | <t:${Math.floor(r.time / 1000)}:R>`)
            .join('\n');

        await message.reply({
            embeds: [new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: `إحصائيات ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .setTitle('📊 إحصائيات الإداري')
                .addFields(
                    { name: '👤 الإداري', value: `<@${targetId}>`, inline: true },
                    { name: '🎫 إجمالي التقييمات', value: `\`${data.count}\``, inline: true },
                    { name: '⭐ متوسط التقييم', value: `\`${avg}/5\``, inline: true },
                    { name: '🕐 آخر 5 تقييمات', value: history || 'لا يوجد', inline: false }
                )
                .setFooter({ text: `${message.guild.name} • نظام التكتات` })
                .setTimestamp()
            ]
        });
    }

    // ─── نقاط ───
    if (commandName === 'نقاط') {
        if (!isManager && !isAdmin) return message.reply({ content: '❌ هذا الأمر للمسؤولين فقط.' });

        const sorted = Object.entries(db.points).sort((a, b) => b[1].count - a[1].count);
        if (sorted.length === 0)
            return message.reply({ content: '❌ لا توجد نقاط مسجلة بعد.' });

        const list = sorted
            .map((e, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
                return `${medal} <@${e[0]}> — \`${e[1].count}\` تكت`;
            })
            .join('\n');

        await message.reply({
            embeds: [new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('🏆 لوحة نقاط الإداريين')
                .setDescription(list)
                .setFooter({ text: `${message.guild.name} • نظام التكتات` })
                .setTimestamp()
            ]
        });
    }

    // ─── تكتي (للعضو) ───
    if (commandName === 'تكتي') {
        const userTicket = message.guild.channels.cache.find(
            c => c.topic === message.author.id && !c.name.startsWith('closed-')
        );
        if (!userTicket)
            return message.reply({
                embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('❌ ليس لديك أي تكت مفتوح حالياً.')]
            });

        const openTime = ticketOpenTime.get(userTicket.id);
        const claimer  = ticketClaimer.get(userTicket.id);
        const duration = openTime ? formatDuration(Date.now() - openTime) : 'غير معروف';

        await message.reply({
            embeds: [new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎫 تكتك الحالي')
                .addFields(
                    { name: '📋 القناة', value: `${userTicket}`, inline: true },
                    { name: '⏱️ مدة الانتظار', value: duration, inline: true },
                    { name: '🛡️ الإداري المتولي', value: claimer ? `<@${claimer.adminId}>` : 'لم يُتولى بعد', inline: true }
                )
                .setTimestamp()
            ],
            ephemeral: false
        });
    }

    // ─── إلغاء (للعضو — قبل القبول) ───
    if (commandName === 'إلغاء') {
        const pendingEntry = [...pendingTickets.entries()].find(([, v]) => v.userId === message.author.id);
        if (!pendingEntry)
            return message.reply({ content: '❌ ليس لديك طلب تكت في الانتظار يمكن إلغاؤه.' });

        const [msgId, ticketData] = pendingEntry;
        pendingTickets.delete(msgId);

        // تحديث رسالة الطلب في روم الإدارة
        const reqChannel = message.guild.channels.cache.get(REQUESTS_CHANNEL_ID);
        if (reqChannel) {
            const reqMsg = await reqChannel.messages.fetch(msgId).catch(() => null);
            if (reqMsg) {
                await reqMsg.edit({
                    embeds: [new EmbedBuilder()
                        .setColor('#747F8D')
                        .setTitle('🚫 تم إلغاء الطلب من العضو')
                        .setDescription(`قام ${message.author} بإلغاء طلبه.`)
                        .setTimestamp()
                    ],
                    components: []
                }).catch(() => {});
            }
        }

        await message.reply({
            embeds: [new EmbedBuilder().setColor('#57F287').setDescription('✅ تم إلغاء طلبك بنجاح.')]
        });
    }

    // ─── ترك (للإداري داخل التكت) ───
    if (commandName === 'ترك') {
        if (!isManager && !isAdmin)
            return message.reply({ content: '❌ هذا الأمر للمسؤولين فقط.' });

        const channel  = message.channel;
        const ownerId  = channel.topic;
        const claimer  = ticketClaimer.get(channel.id);

        if (!ownerId || !claimer || claimer.adminId !== message.author.id)
            return message.reply({ content: '❌ لا يمكنك استخدام هذا الأمر هنا.' });

        ticketClaimer.delete(channel.id);

        // إعادة صلاحيات رول المانجر
        await channel.permissionOverwrites.edit(
            message.guild.roles.cache.get(MANAGER_ROLE_ID),
            { ViewChannel: true, SendMessages: true }
        ).catch(() => {});
        // إزالة صلاحية الإداري الخاص
        await channel.permissionOverwrites.delete(message.author.id).catch(() => {});

        await channel.send({
            embeds: [new EmbedBuilder()
                .setColor('#FEE75C')
                .setDescription(`⚠️ **${message.author} ترك هذا التكت.**\nسيُعاد فتحه لبقية الإداريين.`)
            ]
        });

        await sendLog(message.guild, new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('↩️ إداري ترك تكتاً')
            .addFields(
                { name: '🛡️ الإداري', value: `${message.author} \`${message.author.tag}\``, inline: true },
                { name: '📋 التكت', value: `${channel}`, inline: true },
                { name: '👤 صاحب التكت', value: `<@${ownerId}>`, inline: true }
            )
            .setTimestamp()
        );

        // إرسال إشعار لروم الطلبات مجدداً
        const reqChannel = message.guild.channels.cache.get(REQUESTS_CHANNEL_ID);
        if (reqChannel) {
            const priority = PRIORITY_OPTIONS['normal'];
            await reqChannel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('🔁 تكت بحاجة لإداري جديد')
                    .setDescription(`التكت ${channel} تُرك من قِبل الإداري السابق وبحاجة لمن يتولاه.`)
                    .addFields({ name: '👤 صاحب التكت', value: `<@${ownerId}>`, inline: true })
                    .setTimestamp()
                ],
                components: [new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`accept_ticket_${channel.id}_${ownerId}`)
                        .setLabel('تولي التكت')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✋')
                )]
            });
        }

        await message.delete().catch(() => {});
    }

    // ─── إضافة (للإداري) ───
    if (commandName === 'إضافة') {
        if (!isManager && !isAdmin)
            return message.reply({ content: '❌ هذا الأمر للمسؤولين فقط.' });

        const channel = message.channel;
        const ownerId = channel.topic;
        if (!ownerId)
            return message.reply({ content: '❌ هذه القناة ليست تكت.' });

        const target = message.mentions.members.first();
        if (!target)
            return message.reply({ content: '❌ الاستخدام: `-إضافة @شخص`' });

        await channel.permissionOverwrites.edit(target.id, {
            ViewChannel: true, SendMessages: true
        });

        await channel.send({
            embeds: [new EmbedBuilder()
                .setColor('#57F287')
                .setDescription(`✅ **تمت إضافة ${target} إلى هذا التكت** بواسطة ${message.author}.`)
            ]
        });

        await sendLog(message.guild, new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('➕ إضافة عضو للتكت')
            .addFields(
                { name: '🛡️ الإداري', value: `${message.author}`, inline: true },
                { name: '👤 العضو المضاف', value: `${target}`, inline: true },
                { name: '📋 التكت', value: `${channel}`, inline: true }
            )
            .setTimestamp()
        );

        await message.delete().catch(() => {});
    }

    // ─── تعليق (للإداري — داخلي) ───
    if (commandName === 'تعليق') {
        if (!isManager && !isAdmin)
            return message.reply({ content: '❌ هذا الأمر للمسؤولين فقط.' });

        const channel = message.channel;
        if (!channel.topic)
            return message.reply({ content: '❌ هذه القناة ليست تكت.' });

        const noteText = args.join(' ');
        if (!noteText)
            return message.reply({ content: '❌ الاستخدام: `-تعليق نص الملاحظة`' });

        await message.delete().catch(() => {});

        await channel.send({
            embeds: [new EmbedBuilder()
                .setColor('#747F8D')
                .setTitle('📝 ملاحظة داخلية')
                .setDescription(noteText)
                .setFooter({ text: `بواسطة ${message.author.tag} — مرئي للإداريين فقط` })
                .setTimestamp()
            ]
        });

        // حذف الملاحظة بعد دقيقة لإبقائها سرية
        // (اختياري — يمكن حذف السطرين التاليين)
        // const sent = await channel.send({...});
        // setTimeout(() => sent.delete().catch(() => {}), 60000);
    }

    // ─── غائب ───
    if (commandName === 'غائب') {
        if (!isManager && !isAdmin)
            return message.reply({ content: '❌ هذا الأمر للمسؤولين فقط.' });

        if (!db.absents) db.absents = [];
        if (!db.absents.includes(message.author.id)) {
            db.absents.push(message.author.id);
            saveData(db);
        }

        await message.reply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription(`🔴 **${message.author.username}** الآن في وضع **غائب** — لن تصلك طلبات التكتات.\nاكتب \`-متاح\` للعودة.`)
            ]
        });
    }

    // ─── متاح ───
    if (commandName === 'متاح') {
        if (!isManager && !isAdmin)
            return message.reply({ content: '❌ هذا الأمر للمسؤولين فقط.' });

        if (db.absents) {
            db.absents = db.absents.filter(id => id !== message.author.id);
            saveData(db);
        }

        await message.reply({
            embeds: [new EmbedBuilder()
                .setColor('#57F287')
                .setDescription(`🟢 **${message.author.username}** الآن **متاح** — ستصلك طلبات التكتات.`)
            ]
        });
    }

    // ─── حالة (للإداري والأدمن) ───
    if (commandName === 'حالة') {
        if (!isManager && !isAdmin)
            return message.reply({ content: '❌ هذا الأمر للمسؤولين فقط.' });

        const sub = args[0]?.toLowerCase();
        const text = args.slice(1).join(' ');

        const STATUS_MAP = {
            'online':    { status: 'online',    label: '🟢 أونلاين' },
            'idle':      { status: 'idle',       label: '🟡 غير نشط' },
            'dnd':       { status: 'dnd',        label: '🔴 لا تزعج' },
            'invisible': { status: 'invisible',  label: '⚫ غير مرئي' },
            'offline':   { status: 'invisible',  label: '⚫ أوفلاين' }
        };

        const ACTIVITY_MAP = {
            'playing':   ActivityType.Playing,
            'watching':  ActivityType.Watching,
            'listening': ActivityType.Listening,
            'competing': ActivityType.Competing
        };

        if (STATUS_MAP[sub]) {
            await client.user.setStatus(STATUS_MAP[sub].status);
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#5865F2')
                    .setDescription(`✅ تم تغيير حالة البوت إلى **${STATUS_MAP[sub].label}**`)
                ]
            });
        }

        if (ACTIVITY_MAP[sub]) {
            if (!text) return message.reply({ content: '❌ أدخل نص النشاط بعد نوعه.' });
            await client.user.setActivity(text, { type: ACTIVITY_MAP[sub] });
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#5865F2')
                    .setDescription(`✅ تم تغيير نشاط البوت إلى **${sub}** | \`${text}\``)
                ]
            });
        }

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('📖 طريقة استخدام أمر الحالة')
                .addFields(
                    { name: '🟢 الحالات', value: '`-حالة online`\n`-حالة idle`\n`-حالة dnd`\n`-حالة invisible`', inline: true },
                    { name: '🎮 الأنشطة', value: '`-حالة playing نص`\n`-حالة watching نص`\n`-حالة listening نص`\n`-حالة competing نص`', inline: true }
                )
            ]
        });
    }
});

// ===============================================
// 6. التفاعلات
// ===============================================

client.on('interactionCreate', async interaction => {
  try {

    // زر فتح المنيو
    if (interaction.isButton() && interaction.customId === 'open_ticket_menu') {
        // رسالة ترحيب للعضو الجديد
        if (!firstTicketSet.has(interaction.user.id)) {
            firstTicketSet.add(interaction.user.id);
            await interaction.user.send({
                embeds: [new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('👋 مرحباً بك في نظام التكتات!')
                    .setDescription(
                        `أهلاً **${interaction.user.username}**!\n\n` +
                        `**كيف يعمل النظام؟**\n` +
                        `1️⃣ اختر نوع الخدمة\n` +
                        `2️⃣ حدد مستوى الأهمية\n` +
                        `3️⃣ املأ تفاصيل طلبك\n` +
                        `4️⃣ انتظر قبول أحد الإداريين\n\n` +
                        `⚡ **متوسط وقت الرد:** دقائق معدودة\n` +
                        `📌 يمكنك استخدام \`-تكتي\` لمعرفة حالة تكتك في أي وقت`
                    )
                ]
            }).catch(() => {});
        }
        return interaction.reply({ content: '👇 اختر نوع الخدمة:', components: createSelectMenuComponents(), flags: MessageFlags.Ephemeral });
    }

    // اختيار الخدمة → اختيار الأولوية
    if (interaction.isStringSelectMenu() && interaction.customId === 'service_select_menu') {
        // حفظ الخدمة المختارة مؤقتاً
        await interaction.update({
            content: `✅ اخترت: **${SERVICE_OPTIONS[interaction.values[0]].label}**\n\n👇 الآن حدد مستوى الأهمية:`,
            components: [
                ...createPriorityComponents(),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`back_service_${interaction.values[0]}`)
                        .setLabel('تغيير الخدمة')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('↩️')
                )
            ]
        });
    }

    // اختيار الأولوية → Modal
    if (interaction.isStringSelectMenu() && interaction.customId === 'priority_select_menu') {
        // استخراج الخدمة من الزر الخلفي
        const backBtn = interaction.message.components[1]?.components[0];
        const serviceKey = backBtn?.customId?.replace('back_service_', '') || 'general_ticket';
        const serviceInfo = SERVICE_OPTIONS[serviceKey];
        const priorityKey = interaction.values[0];

        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${serviceKey}_${priorityKey}`)
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

    // زر الرجوع لاختيار الخدمة
    if (interaction.isButton() && interaction.customId.startsWith('back_service_')) {
        return interaction.update({ content: '👇 اختر نوع الخدمة:', components: createSelectMenuComponents() });
    }

    // استقبال Modal التكت
    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
        const parts       = interaction.customId.replace('ticket_modal_', '').split('_');
        const priorityKey = parts.pop();
        const serviceKey  = parts.join('_');
        return sendTicketRequest(
            interaction,
            serviceKey,
            priorityKey,
            interaction.fields.getTextInputValue('ticket_title'),
            interaction.fields.getTextInputValue('ticket_description')
        );
    }

    // ─── قبول التكت ───
    if (interaction.isButton() && interaction.customId.startsWith('accept_ticket_')) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return interaction.editReply({ content: '❌ هذه الصلاحية للمسؤولين فقط.' });

        if (isAbsent(interaction.user.id))
            return interaction.editReply({ content: '❌ أنت في وضع غائب! اكتب `-متاح` أولاً.' });

        const parts = interaction.customId.split('_');
        // accept_ticket_MSGID_USERID  أو  accept_ticket_CHANNELID_OWNERID
        const msgId  = parts[2];
        const userId = parts[3];

        const ticketData = pendingTickets.get(msgId);

        // حالة "تولي تكت مُترك"
        if (!ticketData) {
            const channelId = msgId;
            const ownerId   = userId;
            const ch        = interaction.guild.channels.cache.get(channelId);
            if (!ch) return interaction.editReply({ content: '❌ القناة لم تعد موجودة.' });

            ticketClaimer.set(ch.id, { adminId: interaction.user.id, adminTag: interaction.user.tag });

            await ch.permissionOverwrites.edit(interaction.guild.roles.cache.get(MANAGER_ROLE_ID), { ViewChannel: false });
            await ch.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

            await ch.send({
                embeds: [new EmbedBuilder()
                    .setColor('#57F287')
                    .setDescription(`✋ **تم تولي هذا التكت بواسطة ${interaction.user}**`)
                ]
            });

            await interaction.message.edit({ components: [] }).catch(() => {});
            return interaction.editReply({ content: '✅ تم تولي التكت بنجاح.' });
        }

        pendingTickets.delete(msgId);

        // تحديث رسالة الطلب
        await interaction.message.edit({
            embeds: [new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ تم قبول الطلب')
                .setDescription(`قبل ${interaction.user} هذا الطلب وجارٍ فتح التكت...`)
                .setTimestamp()
            ],
            components: []
        }).catch(() => {});

        await openTicket(interaction, ticketData, interaction.user);
    }

    // ─── رفض التكت ───
    if (interaction.isButton() && interaction.customId.startsWith('reject_ticket_')) {
        const msgId = interaction.customId.split('_')[2];
        if (!pendingTickets.has(msgId))
            return interaction.reply({ content: '❌ هذا الطلب لم يعد متاحاً.', flags: MessageFlags.Ephemeral });

        const modal = new ModalBuilder()
            .setCustomId(`reject_modal_${msgId}`)
            .setTitle('سبب الرفض')
            .addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('reject_reason').setLabel('سبب الرفض')
                    .setStyle(TextInputStyle.Paragraph).setPlaceholder('اكتب سبب الرفض...').setRequired(true).setMaxLength(300)
            ));
        return interaction.showModal(modal);
    }

    // استقبال سبب الرفض
    if (interaction.isModalSubmit() && interaction.customId.startsWith('reject_modal_')) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const msgId  = interaction.customId.replace('reject_modal_', '');
        const reason = interaction.fields.getTextInputValue('reject_reason');
        const data   = pendingTickets.get(msgId);

        if (!data) return interaction.editReply({ content: '❌ انتهت صلاحية هذا الطلب.' });
        pendingTickets.delete(msgId);

        // تحديث رسالة الطلب
        await interaction.message.edit({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ تم رفض الطلب')
                .setDescription(`رفض ${interaction.user} هذا الطلب.\n**السبب:** ${reason}`)
                .setTimestamp()
            ],
            components: []
        }).catch(() => {});

        // DM للعضو
        const member = await interaction.guild.members.fetch(data.userId).catch(() => null);
        if (member) {
            await member.send({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ تم رفض طلبك')
                    .setDescription(`مرحباً **${member.user.username}**،\n\nللأسف تم رفض طلبك من قِبل فريق الإدارة.`)
                    .addFields(
                        { name: '📌 عنوان الطلب', value: data.title, inline: false },
                        { name: '💬 السبب', value: reason, inline: false },
                        { name: '💡 ماذا الآن؟', value: 'يمكنك فتح تكت جديد مع تعديل طلبك، أو التواصل مع الإدارة.', inline: false }
                    )
                    .setTimestamp()
                ]
            }).catch(() => {});
        }

        await sendLog(interaction.guild, new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('❌ طلب تكت مرفوض')
            .addFields(
                { name: '👤 العضو', value: `<@${data.userId}>`, inline: true },
                { name: '🛡️ رُفض بواسطة', value: `${interaction.user}`, inline: true },
                { name: '📌 العنوان', value: data.title, inline: false },
                { name: '💬 السبب', value: reason, inline: false }
            )
            .setTimestamp()
        );

        await interaction.editReply({ content: '✅ تم رفض الطلب وإبلاغ العضو.' });
    }

    // ─── إغلاق التكت ───
    if (interaction.isButton() && interaction.customId === 'close_ticket') return handleTicketClose(interaction);

    // ─── التقييم ───
    if (interaction.isButton() && interaction.customId.startsWith('rate_')) return handleRating(interaction);

    // ─── ملاحظة DM ───
    if (interaction.isButton() && interaction.customId.startsWith('dm_note_')) {
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

    // استقبال ملاحظة DM
    if (interaction.isModalSubmit() && interaction.customId.startsWith('note_modal_')) {
        const channelId = interaction.customId.replace('note_modal_', '');
        const noteText  = interaction.fields.getTextInputValue('note_text');

        await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#57F287').setDescription('✅ **تم إرسال ملاحظتك للإدارة بنجاح!** شكراً 😊')],
            flags: MessageFlags.Ephemeral
        });

        const guild = client.guilds.cache.first();
        await sendLog(guild, new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: `ملاحظة من ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setTitle('📝 ملاحظة عضو')
            .addFields(
                { name: '👤 العضو', value: `${interaction.user} \`${interaction.user.tag}\``, inline: true },
                { name: '📋 قناة التكت', value: `\`${channelId}\``, inline: true },
                { name: '💬 الملاحظة', value: noteText, inline: false }
            )
            .setTimestamp()
        );
    }

  } catch (err) {
    if (err?.code === 10062) return; // interaction انتهت صلاحيتها — تجاهل
    console.error('Interaction error:', err);
  }
});

// ===============================================
// 7. إرسال طلب التكت لروم الإدارة
// ===============================================

async function sendTicketRequest(interaction, serviceKey, priorityKey, ticketTitle, ticketDescription) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild      = interaction.guild;
    const member     = interaction.member;
    const serviceInfo  = SERVICE_OPTIONS[serviceKey] || SERVICE_OPTIONS['general_ticket'];
    const priorityInfo = PRIORITY_OPTIONS[priorityKey] || PRIORITY_OPTIONS['normal'];

    // التحقق من تكت مفتوح مسبقاً
    const existingTicket = guild.channels.cache.find(c => c.topic === member.user.id && !c.name.startsWith('closed-'));
    if (existingTicket)
        return interaction.editReply({ content: `❌ لديك تكت مفتوح بالفعل: ${existingTicket}` });

    // التحقق من طلب معلق
    const hasPending = [...pendingTickets.values()].some(v => v.userId === member.user.id);
    if (hasPending)
        return interaction.editReply({ content: '❌ لديك طلب معلق في انتظار القبول. اكتب `-إلغاء` لإلغائه.' });

    const reqChannel = guild.channels.cache.get(REQUESTS_CHANNEL_ID);
    if (!reqChannel)
        return interaction.editReply({ content: '❌ لم يتم العثور على روم الطلبات.' });

    try {
        // إرسال الرسالة أولاً بدون أزرار لنحصل على الـ ID
        const reqMsg = await reqChannel.send({
            content: `<@&${MANAGER_ROLE_ID}>`,
            embeds: [new EmbedBuilder()
                .setColor(priorityInfo.color)
                .setAuthor({ name: `طلب تكت جديد — ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                .setTitle(`${serviceInfo.emoji} ${serviceInfo.label}`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '👤 العضو', value: `${member}`, inline: true },
                    { name: `${priorityInfo.emoji} الأولوية`, value: priorityInfo.label, inline: true },
                    { name: '🕐 وقت الطلب', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: '📌 العنوان', value: ticketTitle, inline: false },
                    { name: '📝 التفاصيل', value: ticketDescription, inline: false }
                )
                .setFooter({ text: 'قبول أو رفض الطلب باستخدام الأزرار أدناه' })
                .setTimestamp()
            ]
        });

        // الآن نعرف الـ ID — نضيف الأزرار
        await reqMsg.edit({
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_ticket_${reqMsg.id}_${member.user.id}`)
                    .setLabel('قبول')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`reject_ticket_${reqMsg.id}_${member.user.id}`)
                    .setLabel('رفض')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            )]
        });

        pendingTickets.set(reqMsg.id, {
            userId: member.user.id,
            serviceKey,
            priorityKey,
            title: ticketTitle,
            description: ticketDescription,
            guildId: guild.id,
            requestedAt: Date.now()
        });

        // تنبيه بعد 15 دقيقة لو ما أحد قبل
        setTimeout(async () => {
            if (!pendingTickets.has(reqMsg.id)) return;
            const logsChannel = guild.channels.cache.get(LOGS_CHANNEL_ID);
            if (logsChannel) {
                await logsChannel.send({
                    content: `<@&${MANAGER_ROLE_ID}>`,
                    embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('⏰ طلب تكت لم يُقبل!')
                        .setDescription(`طلب ${member} لم يُقبل منذ **15 دقيقة**!`)
                        .addFields({ name: '📌 العنوان', value: ticketTitle, inline: false })
                        .setTimestamp()
                    ]
                }).catch(() => {});
            }
        }, 15 * 60 * 1000);

        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ تم إرسال طلبك!')
                .setDescription(
                    `**طلبك وصل للإدارة وفي انتظار القبول.**\n\n` +
                    `⏱️ متوسط وقت الرد: **دقائق معدودة**\n` +
                    `📌 يمكنك كتابة \`-تكتي\` لمعرفة الحالة\n` +
                    `🚫 كتابة \`-إلغاء\` لإلغاء الطلب`
                )
            ]
        });

        await sendLog(guild, new EmbedBuilder()
            .setColor(priorityInfo.color)
            .setTitle('📥 طلب تكت جديد')
            .addFields(
                { name: '👤 العضو', value: `${member} \`${member.user.tag}\``, inline: true },
                { name: '🛎️ الخدمة', value: serviceInfo.label, inline: true },
                { name: `${priorityInfo.emoji} الأولوية`, value: priorityInfo.label, inline: true },
                { name: '📌 العنوان', value: ticketTitle, inline: false }
            )
            .setTimestamp()
        );

    } catch (error) {
        console.error('فشل في إرسال طلب التكت:', error);
        await interaction.editReply({ content: '❌ حدث خطأ أثناء إرسال الطلب.' });
    }
}

// ===============================================
// 8. فتح التكت بعد القبول
// ===============================================

async function openTicket(interaction, ticketData, adminUser) {
    const guild      = interaction.guild;
    const serviceInfo  = SERVICE_OPTIONS[ticketData.serviceKey] || SERVICE_OPTIONS['general_ticket'];
    const priorityInfo = PRIORITY_OPTIONS[ticketData.priorityKey] || PRIORITY_OPTIONS['normal'];

    let member;
    try { member = await guild.members.fetch(ticketData.userId); }
    catch { return interaction.editReply({ content: '❌ لم يتم العثور على صاحب الطلب.' }); }

    try {
        const channelName = `${priorityInfo.emoji}${serviceInfo.categoryName}-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`.substring(0, 100);

        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            topic: member.user.id,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: adminUser.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                // MANAGER_ROLE_ID مخفي عمداً — فقط الإداري القابل يرى التكت
            ],
        });

        ticketOpenTime.set(ticketChannel.id, Date.now());
        ticketClaimer.set(ticketChannel.id, { adminId: adminUser.id, adminTag: adminUser.tag });
        ticketOwnerMap.set(ticketChannel.id, member.user.id);
        addPoint(adminUser.id, adminUser.tag);

        await ticketChannel.send({
            content: `${member} | ${adminUser}`,
            embeds: [new EmbedBuilder()
                .setColor(priorityInfo.color)
                .setTitle(`${serviceInfo.emoji} ${serviceInfo.label}`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 صاحب الطلب', value: `${member}`, inline: true },
                    { name: '🛡️ الإداري المتولي', value: `${adminUser}`, inline: true },
                    { name: `${priorityInfo.emoji} الأولوية`, value: priorityInfo.label, inline: true },
                    { name: '📌 عنوان الطلب', value: ticketData.title, inline: false },
                    { name: '📝 التفاصيل', value: ticketData.description, inline: false },
                    { name: '🕐 وقت الفتح', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setFooter({ text: 'الإداري يمكنه كتابة -ترك للخروج أو -إضافة @شخص لإضافة أعضاء' })
                .setTimestamp()
            ],
            components: [createTicketComponents()]
        });

        await interaction.editReply({ content: `✅ تم فتح التكت! ${ticketChannel}` });

        await sendLog(guild, new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ تكت مفتوح')
            .addFields(
                { name: '👤 العضو', value: `${member} \`${member.user.tag}\``, inline: true },
                { name: '🛡️ الإداري', value: `${adminUser} \`${adminUser.tag}\``, inline: true },
                { name: `${priorityInfo.emoji} الأولوية`, value: priorityInfo.label, inline: true },
                { name: '📋 القناة', value: `${ticketChannel}`, inline: false }
            )
            .setTimestamp()
        );

    } catch (error) {
        console.error('فشل في فتح التكت:', error);
        await interaction.editReply({ content: '❌ حدث خطأ أثناء فتح التكت.' });
    }
}

// ===============================================
// 9. إغلاق التكت
// ===============================================

async function handleTicketClose(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const isManager = interaction.member.roles.cache.has(MANAGER_ROLE_ID);
    const isAdmin   = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (!isManager && !isAdmin)
        return interaction.editReply({ content: '❌ هذه الصلاحية للمسؤولين فقط.' });

    const channel      = interaction.channel;
    const ticketOwnerId = channel.topic;
    if (!ticketOwnerId)
        return interaction.editReply({ content: '❌ هذه القناة ليست تكت صالح.' });

    const claimer  = ticketClaimer.get(channel.id);
    const openTime = ticketOpenTime.get(channel.id);
    const duration = openTime ? formatDuration(Date.now() - openTime) : 'غير معروف';

    try {
        const ticketOwner = await interaction.guild.members.fetch(ticketOwnerId).catch(() => null);
        let dmSent = false;

        if (ticketOwner) {
            // إرسال DM فوري بالإغلاق
            await ticketOwner.send({
                embeds: [new EmbedBuilder()
                    .setColor('#5865F2')
                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setTitle('🔒 تم إغلاق تكتك')
                    .setDescription(`مرحباً **${ticketOwner.user.username}** 👋\n\nتم إغلاق تكتك بنجاح من قِبل فريق الدعم.\nشكراً جزيلاً على تواصلك معنا!`)
                    .addFields(
                        { name: '📋 اسم التكت', value: `\`${channel.name}\``, inline: true },
                        { name: '🔒 أُغلق بواسطة', value: `\`${interaction.user.tag}\``, inline: true },
                        { name: '⏱️ مدة التكت', value: duration, inline: true },
                        { name: '💡 هل تحتاج مساعدة أخرى؟', value: 'يسعدنا دائماً خدمتك! لا تتردد في فتح تكت جديد.', inline: false }
                    )
                    .setTimestamp()
                ]
            })
            .then(() => { dmSent = true; })
            .catch(() => {});

            // إرسال التقييم بعد 30 دقيقة
            setTimeout(async () => {
                await ticketOwner.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#FEE75C')
                        .setTitle('⭐ كيف كانت تجربتك معنا؟')
                        .setDescription(
                            `رأيك يهمنا ويساعدنا على التطوير المستمر.\n\n` +
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
                }).catch(() => {});
            }, 30 * 60 * 1000); // 30 دقيقة
        }

        // لوق الإغلاق
        await sendLog(interaction.guild, new EmbedBuilder()
            .setColor(dmSent ? '#57F287' : '#ED4245')
            .setTitle('🔒 تكت مُغلق')
            .addFields(
                { name: '👤 صاحب التكت', value: `<@${ticketOwnerId}>`, inline: true },
                { name: '🔒 أُغلق بواسطة', value: `\`${interaction.user.tag}\``, inline: true },
                { name: '⏱️ مدة التكت', value: duration, inline: true },
                { name: '📋 اسم القناة', value: `\`${channel.name}\``, inline: true },
                { name: '🛡️ الإداري المتولي', value: claimer ? `\`${claimer.adminTag}\`` : 'لم يُتولى', inline: true },
                { name: '📨 رسالة DM', value: dmSent ? '✅ أُرسلت' : '❌ الخاص مغلق', inline: true }
            )
            .setTimestamp()
        );

        setTimeout(async () => {
            await channel.permissionOverwrites.edit(ticketOwnerId, { ViewChannel: false }).catch(() => {});
            await archiveChannel(channel, interaction, ticketOwnerId, duration);
        }, 30000);

        await interaction.editReply({
            content: `✅ سيتم أرشفة التكت خلال 30 ثانية.\n${dmSent ? '📨 تم إرسال رسالة خاصة للعضو.' : '⚠️ الخاص مغلق، لم يصل للعضو.'}`
        });

    } catch (error) {
        console.error('فشل في إغلاق التكت:', error);
        await interaction.editReply({ content: '❌ حدث خطأ أثناء الإغلاق.' });
    }
}

// ===============================================
// 10. أرشفة التكت
// ===============================================

async function archiveChannel(channel, interaction, ticketOwnerId, duration) {
    try {
        ticketOpenTime.delete(channel.id);
        ticketClaimer.delete(channel.id);
        ticketOwnerMap.delete(channel.id);

        await channel.setParent(ARCHIVE_CATEGORY_ID, { lockPermissions: false });
        await channel.setName(`closed-${channel.name.replace(/^[🟢🟡🔴]/, '')}`);
        await channel.permissionOverwrites.set([
            { id: channel.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]);

        await sendLog(interaction.guild, new EmbedBuilder()
            .setColor('#747F8D')
            .setTitle('📁 تكت مؤرشف')
            .addFields(
                { name: '👤 صاحب التكت', value: `<@${ticketOwnerId}>`, inline: true },
                { name: '🔒 أُغلق بواسطة', value: `\`${interaction.user.tag}\``, inline: true },
                { name: '⏱️ مدة التكت', value: duration || 'غير معروف', inline: true },
                { name: '📋 اسم القناة', value: `\`${channel.name}\``, inline: false }
            )
            .setTimestamp()
        );
    } catch (err) {
        console.error('فشل في الأرشفة:', err);
    }
}

// ===============================================
// 11. التقييم
// ===============================================

async function handleRating(interaction) {
    const stars      = parseInt(interaction.customId.replace('rate_', ''));
    const starsText  = '⭐'.repeat(stars);

    const ticketNameField = interaction.message.embeds[0]?.fields?.find(f => f.name.includes('اسم التكت'));
    const ticketName      = ticketNameField?.value?.replace(/`/g, '') || 'غير معروف';

    const claimerMatch = interaction.message.embeds[0]?.description?.match(/`([^`]+)`/);
    const claimerTag   = claimerMatch?.[1];
    const guild        = client.guilds.cache.first();
    let adminId        = null;

    if (claimerTag) {
        const foundMember = guild?.members.cache.find(m => m.user.tag === claimerTag);
        if (foundMember) {
            adminId = foundMember.id;
            storeRating(adminId, claimerTag, stars, ticketName, interaction.user.tag);
        }
    }

    const noteCustomId = interaction.message.components[1]?.components[0]?.customId || 'dm_note_done';

    await interaction.update({
        embeds: [new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ تم تسجيل تقييمك')
            .setDescription(`${starsText}\n\n**شكراً على تقييمك!**\nرأيك يساعدنا على التحسين المستمر. 😊`)
            .setTimestamp()
        ],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(noteCustomId).setLabel('إضافة ملاحظة للإدارة').setStyle(ButtonStyle.Secondary).setEmoji('📝')
        )]
    });

    await sendLog(guild, new EmbedBuilder()
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
    );
}

// ===============================================
// 12. تسجيل الدخول + خادم Render
// ===============================================

// منع انهيار البوت من أي خطأ غير متوقع
process.on('unhandledRejection', err => {
    if (err?.code === 10062) return; // Unknown interaction — طبيعي بعد restart
    console.error('Unhandled rejection:', err);
});

client.login(BOT_TOKEN);

const app  = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Discord Bot is running!'));
app.listen(port, () => console.log(`Web Server listening on port ${port}`));
