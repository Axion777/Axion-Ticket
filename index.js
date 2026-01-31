// index.js (النسخة المطورة)

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');

// ===============================================
// 1. المتغيرات والتهيئة
// ===============================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const MANAGER_ROLE_ID = process.env.MANAGER_ROLE_ID;
const LOGS_CHANNEL_ID = process.env.LOGS_CHANNEL_ID; 
const PREFIX = '-';
const ARCHIVE_CATEGORY_ID = '1449459496144470056'; 
const IMAGE_URL = 'https://i.top4top.io/p_3683q7lu71.png';

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
        label: 'خدمات برمجية',
        description: 'تطوير بوتات، مواقع، وسكربتات مخصصة',
        categoryName: 'خدمات-برمجية'
    },
    'account_installation': {
        label: 'تثبيت حسابات ديسكورد',
        description: 'خدمة تثبيت الحسابات بشكل احترافي',
        categoryName: 'تثبيت-حسابات'
    },
    'general_ticket': { 
        label: 'استفسار عام',
        description: 'للاستفسارات والطلبات الأخرى',
        categoryName: 'تكت-عام'
    }
};

// ===============================================
// 2. الدوال المساعدة
// ===============================================

function createComponents() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('service_select_menu')
        .setPlaceholder('اختر نوع الخدمة')
        .addOptions(
            Object.keys(SERVICE_OPTIONS).map(key => ({
                label: SERVICE_OPTIONS[key].label,
                description: SERVICE_OPTIONS[key].description,
                value: key
            }))
        );

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);
    return [selectRow]; 
}

function createTicketComponents() {
    const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('إغلاق التكت')
        .setStyle(ButtonStyle.Danger);

    const claimButton = new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('تولي التكت')
        .setStyle(ButtonStyle.Success);

    return new ActionRowBuilder().addComponents(claimButton, closeButton);
}

function createApprovalComponents() {
    const approveButton = new ButtonBuilder()
        .setCustomId('approve_ticket')
        .setLabel('قبول')
        .setStyle(ButtonStyle.Success);

    const rejectButton = new ButtonBuilder()
        .setCustomId('reject_ticket')
        .setLabel('رفض')
        .setStyle(ButtonStyle.Danger);

    return new ActionRowBuilder().addComponents(approveButton, rejectButton);
}

// ===============================================
// 3. أحداث البوت
// ===============================================

client.on('ready', () => {
    console.log(`✅ البوت جاهز! تم تسجيل الدخول باسم: ${client.user.tag}`);
    client.user.setActivity(`نظام التكتات | ${PREFIX}setup`, { type: 3 });
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (commandName === 'setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: 'لا تملك صلاحية استخدام هذا الأمر.'});
        }

        try {
            const response = await axios.get(IMAGE_URL, { responseType: 'arraybuffer' });
            const attachment = new AttachmentBuilder(Buffer.from(response.data), { name: 'banner.png' });

            const setupEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('نظام التكتات')
                .setDescription('للحصول على خدماتنا، يرجى اختيار نوع الخدمة من القائمة أدناه.\n\nسيتم فتح قناة خاصة للتواصل مع فريق الدعم.')
                .setImage('attachment://banner.png')
                .setFooter({ text: 'نظام التكتات الاحترافي' });

            await message.channel.send({
                embeds: [setupEmbed],
                files: [attachment],
                components: createComponents()
            });
            
            await message.delete().catch(() => {});
            
        } catch (error) {
            console.error('فشل في إرسال رسالة الإعداد:', error);
            await message.reply({ content: 'حدث خطأ أثناء إرسال رسالة الإعداد.' });
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        if (interaction.customId === 'close_ticket') {
            await handleTicketClose(interaction);
        } else if (interaction.customId === 'claim_ticket') {
            await handleTicketClaim(interaction);
        } else if (interaction.customId === 'approve_ticket') {
            await handleTicketApproval(interaction, true);
        } else if (interaction.customId === 'reject_ticket') {
            await handleTicketApproval(interaction, false);
        }
    } else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'service_select_menu') {
            const selectedValue = interaction.values[0];
            await requestTicketApproval(interaction, selectedValue);
        }
    }
});

async function requestTicketApproval(interaction, serviceKey) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const member = interaction.member;

    const existingTicket = guild.channels.cache.find(c =>
        c.name.startsWith(`ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`) && c.topic === member.user.id
    );
    if (existingTicket) {
        return interaction.editReply({ content: `لديك بالفعل تكت مفتوح: ${existingTicket}`, ephemeral: true });
    }

    const serviceInfo = SERVICE_OPTIONS[serviceKey];

    try {
        const logsChannel = guild.channels.cache.get(LOGS_CHANNEL_ID);
        if (!logsChannel) {
            return interaction.editReply({ content: 'قناة السجلات غير موجودة.', ephemeral: true });
        }

        const approvalEmbed = new EmbedBuilder()
            .setColor('#ffa500')
            .setTitle('طلب فتح تكت جديد')
            .setDescription(`**المستخدم:** ${member}\n**نوع الخدمة:** ${serviceInfo.label}\n\nيرجى الموافقة أو الرفض على هذا الطلب.`)
            .setTimestamp();

        const approvalMsg = await logsChannel.send({
            content: `<@&${MANAGER_ROLE_ID}>`,
            embeds: [approvalEmbed],
            components: [createApprovalComponents()]
        });

        client.pendingTickets = client.pendingTickets || new Map();
        client.pendingTickets.set(approvalMsg.id, {
            userId: member.user.id,
            serviceKey: serviceKey,
            requesterId: interaction.user.id
        });

        await interaction.editReply({ content: 'تم إرسال طلبك للإدارة، يرجى الانتظار.', ephemeral: true });

    } catch (error) {
        console.error('فشل في إرسال طلب الموافقة:', error);
        await interaction.editReply({ content: 'حدث خطأ أثناء إرسال الطلب.', ephemeral: true });
    }
}

async function handleTicketApproval(interaction, approved) {
    await interaction.deferUpdate();

    if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) {
        return interaction.followUp({ content: 'لا تملك صلاحية الموافقة على الطلبات.', ephemeral: true });
    }

    client.pendingTickets = client.pendingTickets || new Map();
    const ticketData = client.pendingTickets.get(interaction.message.id);

    if (!ticketData) {
        return interaction.followUp({ content: 'بيانات الطلب غير موجودة.', ephemeral: true });
    }

    const guild = interaction.guild;
    const member = await guild.members.fetch(ticketData.userId).catch(() => null);

    if (!member) {
        await interaction.message.edit({ components: [] });
        client.pendingTickets.delete(interaction.message.id);
        return interaction.followUp({ content: 'المستخدم لم يعد موجوداً في السيرفر.', ephemeral: true });
    }

    if (approved) {
        const serviceInfo = SERVICE_OPTIONS[ticketData.serviceKey];
        const channelName = `${serviceInfo.categoryName.toLowerCase()}-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        try {
            const ticketChannel = await guild.channels.create({
                name: channelName.substring(0, 100),
                type: ChannelType.GuildText,
                topic: member.user.id,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: MANAGER_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ],
            });

            const ticketEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`تكت: ${serviceInfo.label}`)
                .setDescription(`مرحباً ${member}\n\nيرجى كتابة تفاصيل طلبك بوضوح.\nسيتم الرد عليك من قبل فريق الدعم قريباً.`)
                .setTimestamp();

            await ticketChannel.send({
                content: `${member} | <@&${MANAGER_ROLE_ID}>`,
                embeds: [ticketEmbed],
                components: [createTicketComponents()]
            });

            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('#00ff00')
                .setTitle('تم قبول الطلب')
                .addFields({ name: 'تمت الموافقة بواسطة', value: interaction.user.tag });

            await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

            const logEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('تم فتح تكت جديد')
                .addFields(
                    { name: 'المستخدم', value: `${member}`, inline: true },
                    { name: 'نوع الخدمة', value: serviceInfo.label, inline: true },
                    { name: 'تمت الموافقة بواسطة', value: interaction.user.tag, inline: true },
                    { name: 'القناة', value: `${ticketChannel}`, inline: false }
                )
                .setTimestamp();

            await interaction.message.channel.send({ embeds: [logEmbed] });

        } catch (error) {
            console.error('فشل في فتح التكت:', error);
            await interaction.followUp({ content: 'حدث خطأ أثناء فتح التكت.', ephemeral: true });
        }
    } else {
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor('#ff0000')
            .setTitle('تم رفض الطلب')
            .addFields({ name: 'تم الرفض بواسطة', value: interaction.user.tag });

        await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

        try {
            await member.send(`تم رفض طلب فتح التكت الخاص بك من قبل الإدارة.`);
        } catch (error) {
            console.log('تعذر إرسال رسالة خاصة للمستخدم.');
        }

        const logEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('تم رفض طلب تكت')
            .addFields(
                { name: 'المستخدم', value: `${member}`, inline: true },
                { name: 'تم الرفض بواسطة', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.message.channel.send({ embeds: [logEmbed] });
    }

    client.pendingTickets.delete(interaction.message.id);
}

async function handleTicketClose(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) {
        return interaction.editReply({ content: 'لا تملك صلاحية إغلاق التكت.', ephemeral: true });
    }

    const channel = interaction.channel;
    const ticketOwnerId = channel.topic;

    if (!ticketOwnerId) {
        return interaction.editReply({ content: 'هذه القناة ليست تكت صالح.', ephemeral: true });
    }

    try {
        await channel.send(`تم إغلاق التكت بواسطة ${interaction.user}\nجاري الأرشفة...`);
        
        await channel.permissionOverwrites.edit(ticketOwnerId, {
            ViewChannel: false
        }).catch(() => console.log('تعذر تعديل صلاحيات صاحب التكت.'));

        await channel.setParent(ARCHIVE_CATEGORY_ID, { lockPermissions: false });
        await channel.setName(`closed-${channel.name}`);

        const logsChannel = interaction.guild.channels.cache.get(LOGS_CHANNEL_ID);
        if (logsChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('تم إغلاق تكت')
                .addFields(
                    { name: 'صاحب التكت', value: `<@${ticketOwnerId}>`, inline: true },
                    { name: 'اسم التكت', value: channel.name, inline: true },
                    { name: 'تم الإغلاق بواسطة', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await logsChannel.send({ embeds: [logEmbed] });
        }
        
        await interaction.editReply({ content: 'تم إغلاق التكت وأرشفته بنجاح.', ephemeral: true });

    } catch (error) {
        console.error('فشل في إغلاق التكت:', error);
        await interaction.editReply({ content: 'حدث خطأ أثناء إغلاق التكت.', ephemeral: true });
    }
}

async function handleTicketClaim(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) {
        return interaction.editReply({ content: 'لا تملك صلاحية تولي التكت.', ephemeral: true });
    }

    const channel = interaction.channel;
    const managerRole = interaction.guild.roles.cache.get(MANAGER_ROLE_ID);

    await channel.permissionOverwrites.edit(managerRole, {
        ViewChannel: false
    });

    await channel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true,
        SendMessages: true
    });

    const newComponents = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('إغلاق التكت')
            .setStyle(ButtonStyle.Danger)
    );

    await interaction.message.edit({ components: [newComponents] });
    await channel.send(`تم تولي هذا التكت بواسطة ${interaction.user}`).then(m => m.pin());
    await interaction.editReply({ content: 'تم تولي التكت بنجاح.', ephemeral: true });
}

// ===============================================
// 4. تسجيل الدخول
// ===============================================

client.login(BOT_TOKEN);

// ===============================================
// 5. خادم Express
// ===============================================

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Discord Bot is running!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
