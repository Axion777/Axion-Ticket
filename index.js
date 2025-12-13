// index.js

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionsBitField } = require('discord.js');

// ===============================================
// 1. المتغيرات والتهيئة - يعتمد على متغيرات Render
// ===============================================

// البوت سيقرأ التوكن والمعرفات من قسم Environment Variables في Render
const BOT_TOKEN = process.env.BOT_TOKEN;
const MANAGER_ROLE_ID = process.env.MANAGER_ROLE_ID; // 1449429074585063446
const LOGS_CHANNEL_ID = process.env.LOGS_CHANNEL_ID; 

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
        label: '💻 طلب خدمات برمجية',
        description: 'اطلب تطوير بوتات، مواقع، أو سكربتات خاصة.',
        emoji: '💻',
        categoryName: 'خدمات-برمجية'
    },
    'account_installation': {
        label: '✅ تثبيت حسابات ديسكورد',
        description: 'اطلب تثبيت حسابك/حساباتك في ديسكورد.',
        emoji: '✅',
        categoryName: 'تثبيت-حسابات'
    },
};

// ===============================================
// 2. الدوال المساعدة
// ===============================================

function createComponents() {
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

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const button = new ButtonBuilder()
        .setCustomId('open_ticket_button')
        .setLabel('فتح تكت جديد')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫');

    const buttonRow = new ActionRowBuilder().addComponents(button);

    return [selectRow, buttonRow];
}

function createTicketComponents() {
    const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('إغلاق التكت')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

    const claimButton = new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('تولي التكت')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✋');

    return new ActionRowBuilder().addComponents(claimButton, closeButton);
}

// ===============================================
// 3. أحداث البوت
// ===============================================

client.on('ready', () => {
    console.log(`✅ البوت جاهز! تم تسجيل الدخول باسم: ${client.user.tag}`);
    client.user.setActivity('فتح التكتات | /setup', { type: 3 });
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ لا تملك صلاحية استخدام هذا الأمر (مطلوب: مسؤول).', ephemeral: true });
        }

        const setupEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎫 نظام التكتات والخدمات')
            .setDescription('**مرحباً بك!**\n\nلطلب إحدى خدماتنا، يرجى اختيار نوع الخدمة المطلوبة من القائمة المنسدلة أدناه، أو الضغط على زر **"فتح تكت جديد"** لفتح تكت عام.\n\nسيتم فتح قناة خاصة لك وللمسؤولين للحديث حول طلبك.')
            .addFields(
                { name: '💻 خدماتنا المتاحة:', value: Object.values(SERVICE_OPTIONS).map(opt => `${opt.emoji} ${opt.label}`).join('\n'), inline: false },
                { name: '⚠️ ملاحظة:', value: 'الرجاء توضيح طلبك بتفصيل بمجرد فتح التكت لتسريع عملية التنفيذ.', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() });

        try {
            await interaction.channel.send({
                embeds: [setupEmbed],
                components: createComponents()
            });
            await interaction.reply({ content: '✅ تم إرسال رسالة إعداد نظام التكتات بنجاح!', ephemeral: true });
        } catch (error) {
            console.error('فشل في إرسال رسالة الإعداد:', error);
            await interaction.reply({ content: '❌ حدث خطأ أثناء إرسال رسالة الإعداد.', ephemeral: true });
        }
    } else if (interaction.isButton()) {
        if (interaction.customId === 'open_ticket_button') {
            await openTicket(interaction, 'general_ticket');
        } else if (interaction.customId === 'close_ticket') {
            await handleTicketClose(interaction);
        } else if (interaction.customId === 'claim_ticket') {
            await handleTicketClaim(interaction);
        }
    } else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'service_select_menu') {
            const selectedValue = interaction.values[0];
            await openTicket(interaction, selectedValue);
        }
    }
});

async function openTicket(interaction, serviceKey) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const member = interaction.member;

    const existingTicket = guild.channels.cache.find(c =>
        c.name.startsWith(`ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`) && c.topic === member.user.id
    );
    if (existingTicket) {
        return interaction.editReply({ content: `❌ لديك بالفعل تكت مفتوح: ${existingTicket}`, ephemeral: true });
    }

    const serviceInfo = SERVICE_OPTIONS[serviceKey];
    const channelName = serviceInfo ? `${serviceInfo.categoryName.toLowerCase()}-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}` : `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

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
            .setColor(serviceInfo ? '#00ff00' : '#ffff00')
            .setTitle(`🎫 تكت جديد: ${serviceInfo ? serviceInfo.label : 'تكت عام'}`)
            .setDescription(`**مرحباً بك يا ${member}!**\n\nيرجى وصف طلبك بالتفصيل هنا. سيتم التواصل معك من قِبل المسؤولين قريباً.\n\n${serviceInfo ? `**نوع الخدمة المطلوبة:** ${serviceInfo.label}` : ''}`)
            .setTimestamp();

        await ticketChannel.send({
            content: `${member} | منشن المسؤولين: <@&${MANAGER_ROLE_ID}>`,
            embeds: [ticketEmbed],
            components: [createTicketComponents()]
        });

        await interaction.editReply({ content: `✅ تم فتح التكت بنجاح! تفضل بالذهاب إليه: ${ticketChannel}`, ephemeral: true });

    } catch (error) {
        console.error('فشل في فتح التكت:', error);
        await interaction.editReply({ content: '❌ حدث خطأ أثناء محاولة فتح التكت.', ephemeral: true });
    }
}

async function handleTicketClose(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) {
        return interaction.editReply({ content: '❌ لا تملك صلاحية إغلاق التكت. هذه الصلاحية للمسؤولين فقط.', ephemeral: true });
    }

    const channel = interaction.channel;
    const ticketOwnerId = channel.topic;

    if (!ticketOwnerId) {
        return interaction.editReply({ content: '❌ يبدو أن هذه القناة ليست تكت صالح.', ephemeral: true });
    }

    try {
        await channel.send(`🔒 جاري إغلاق التكت بواسطة: ${interaction.user}...\nسيتم حذف هذه القناة خلال 5 ثوانٍ.`);

        const logsChannel = interaction.guild.channels.cache.get(LOGS_CHANNEL_ID);
        if (logsChannel) {
            const ticketOwner = await interaction.guild.members.fetch(ticketOwnerId).catch(() => 'المستخدم غير موجود');

            const logEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('📄 سجل إغلاق تكت')
                .addFields(
                    { name: 'صاحب التكت', value: `<@${ticketOwnerId}> (${ticketOwnerId})`, inline: true },
                    { name: 'اسم التكت', value: channel.name, inline: true },
                    { name: 'المغلق', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await logsChannel.send({ embeds: [logEmbed] });
        }

        setTimeout(async () => {
            await channel.delete('تم إغلاق التكت بواسطة المسؤول.');
        }, 5000);

    } catch (error) {
        console.error('فشل في إغلاق التكت:', error);
        await interaction.editReply({ content: '❌ حدث خطأ أثناء محاولة إغلاق التكت.', ephemeral: true });
    }
}

async function handleTicketClaim(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) {
        return interaction.editReply({ content: '❌ لا تملك صلاحية تولي التكت. هذه الصلاحية للمسؤولين فقط.', ephemeral: true });
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
            .setEmoji('🔒')
    );

    await interaction.message.edit({ components: [newComponents] });

    await channel.send(`**✋ تم تولي هذا التكت بنجاح بواسطة ${interaction.user}!**\nسيتم التعامل مع طلبك قريباً.`).then(m => m.pin());

    await interaction.editReply({ content: '✅ تم تولي التكت بنجاح. الآن أنت المسؤول الوحيد عن هذا التكت (من جانب الإدارة).', ephemeral: true });
}

// ===============================================
// 4. تسجيل أمر السلاش 
// ===============================================

client.on('ready', async () => {
    const commands = [
        {
            name: 'setup',
            description: 'ينشر رسالة نظام التكتات الرئيسية.',
            default_member_permissions: PermissionsBitField.Flags.Administrator.toString()
        },
    ];

    try {
        await client.application.commands.set(commands);
        console.log('✅ تم تسجيل أوامر السلاش بنجاح.');
    } catch (error) {
        console.error('فشل في تسجيل أوامر السلاش:', error);
    }
});


// ===============================================
// 5. تسجيل الدخول
// ===============================================
client.login(BOT_TOKEN);
