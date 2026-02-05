const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('quick.db');
const moment = require('moment');
const ms = require('ms');

// تهيئة البوت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction]
});

// الإعدادات العامة
const config = {
    prefix: '-',
    ownerID: 'YOUR_USER_ID_HERE', // حط آيدي حسابك هنا
    color: {
        primary: 0x5865F2,    // أزرق ديسكورد
        success: 0x57F287,    // أخضر
        danger: 0xED4245,     // أحمر
        warning: 0xFEE75C,    // أصفر
        info: 0xEB459E        // وردي
    },
    emojis: {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        loading: '⏳',
        crown: '👑',
        shield: '🛡️',
        gear: '⚙️',
        star: '⭐',
        fire: '🔥',
        robot: '🤖',
        user: '👤',
        channel: '📢',
        role: '🎭',
        ban: '🔨',
        kick: '👢',
        mute: '🔇',
        unmute: '🔊',
        warn: '⚡',
        clear: '🧹',
        slowmode: '🐌',
        lock: '🔒',
        unlock: '🔓',
        ticket: '🎫',
        giveaway: '🎉',
        poll: '📊',
        music: '🎵',
        game: '🎮',
        economy: '💰',
        level: '📈',
        welcome: '👋',
        goodbye: '👋',
        boost: '💎',
        nitro: '🚀',
        verified: '✔️',
        unverified: '❌',
        online: '🟢',
        idle: '🟡',
        dnd: '🔴',
        offline: '⚫'
    }
};

// تخزين البيانات
client.commands = new Collection();
client.aliases = new Collection();
client.cooldowns = new Collection();
client.events = new Collection();

// ====== نظام اللوج الملون ======
const log = {
    success: (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m✗\x1b[0m ${msg}`),
    info: (msg) => console.log(`\x1b[34mℹ\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
    fancy: (msg) => console.log(`\x1b[35m★\x1b[0m ${msg}`)
};

// ====== دالة إنشاء الإمبد العربي ======
function createArabicEmbed(title, description, color = 'primary', thumbnail = null, image = null) {
    const embed = new EmbedBuilder()
        .setColor(config.color[color] || config.color.primary)
        .setTitle(`${config.emojis.star} ${title}`)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ 
            text: `النظام العربي المتكامل | ${moment().format('YYYY/MM/DD')}`, 
            iconURL: client.user?.displayAvatarURL() 
        });
    
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    
    return embed;
}

// ====== دالة إنشاء الأزرار ======
function createButton(customId, label, style = 'Primary', emoji = null, disabled = false) {
    const styles = {
        'Primary': ButtonStyle.Primary,
        'Secondary': ButtonStyle.Secondary,
        'Success': ButtonStyle.Success,
        'Danger': ButtonStyle.Danger,
        'Link': ButtonStyle.Link
    };
    
    const btn = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(styles[style] || ButtonStyle.Primary)
        .setDisabled(disabled);
    
    if (emoji) btn.setEmoji(emoji);
    return btn;
}

// ====== دالة إنشاء القوائم المنسدلة ======
function createSelectMenu(customId, placeholder, options) {
    return new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .addOptions(options);
}

// ====== نظام الأوامر ======
const commands = {
    // ====== أوامر عامة ======
    help: {
        name: 'مساعدة',
        aliases: ['help', 'h', 'commands', 'cmds'],
        description: 'عرض قائمة الأوامر المتاحة',
        category: 'عام',
        usage: '-مساعدة [اسم الأمر]',
        cooldown: 3,
        execute: async (message, args) => {
            if (args[0]) {
                const cmd = Object.values(commands).find(c => 
                    c.name === args[0] || c.aliases.includes(args[0])
                );
                
                if (!cmd) {
                    return message.reply({ 
                        embeds: [createArabicEmbed('❌ خطأ', 'الأمر غير موجود!', 'danger')] 
                    });
                }
                
                const embed = createArabicEmbed(
                    `📖 ${cmd.name}`,
                    `**الوصف:** ${cmd.description}\n**الاستخدام:** \`${cmd.usage}\`\n**الاختصارات:** ${cmd.aliases.join(', ')}\n**الفئة:** ${cmd.category}\n**الكول داون:** ${cmd.cooldown} ثانية`,
                    'info'
                );
                
                return message.reply({ embeds: [embed] });
            }
            
            const categories = {};
            Object.entries(commands).forEach(([key, cmd]) => {
                if (!categories[cmd.category]) categories[cmd.category] = [];
                categories[cmd.category].push(`\`${cmd.name}\``);
            });
            
            const embed = createArabicEmbed(
                '🤖 قائمة الأوامر',
                '**مرحباً بك في النظام العربي المتكامل!**\n\nاستخدم `-مساعدة [اسم الأمر]` للتفاصيل\n\n' + 
                Object.entries(categories).map(([cat, cmds]) => 
                    `**${config.emojis.gear} ${cat}**\n${cmds.join(' • ')}`
                ).join('\n\n'),
                'primary'
            );
            
            const row = new ActionRowBuilder().addComponents(
                createButton('help_general', 'عام', 'Primary', config.emojis.star),
                createButton('help_admin', 'إدارة', 'Danger', config.emojis.shield),
                createButton('help_fun', 'ترفيه', 'Success', config.emojis.fire),
                createButton('help_economy', 'اقتصاد', 'Secondary', config.emojis.economy)
            );
            
            message.reply({ embeds: [embed], components: [row] });
        }
    },

    ping: {
        name: 'بينغ',
        aliases: ['ping', 'pong', 'lag'],
        description: 'عرض سرعة استجابة البوت',
        category: 'عام',
        usage: '-بينغ',
        cooldown: 5,
        execute: async (message) => {
            const sent = await message.reply({ 
                embeds: [createArabicEmbed(config.emojis.loading + ' جاري القياس...', 'يرجى الانتظار', 'warning')] 
            });
            
            const latency = sent.createdTimestamp - message.createdTimestamp;
            const apiLatency = Math.round(client.ws.ping);
            
            const embed = createArabicEmbed(
                '🏓 بينغ!',
                `**سرعة البوت:** \`${latency}ms\`\n**سرعة API:** \`${apiLatency}ms\`\n**التقييم:** ${latency < 100 ? '🟢 ممتاز' : latency < 200 ? '🟡 جيد' : '🔴 بطيء'}`,
                latency < 100 ? 'success' : latency < 200 ? 'warning' : 'danger'
            );
            
            sent.edit({ embeds: [embed] });
        }
    },

    userinfo: {
        name: 'معلومات',
        aliases: ['userinfo', 'user', 'whois', 'عني'],
        description: 'عرض معلومات المستخدم',
        category: 'عام',
        usage: '-معلومات [@عضو]',
        cooldown: 5,
        execute: async (message, args) => {
            const target = message.mentions.members.first() || message.member;
            
            const roles = target.roles.cache
                .filter(r => r.id !== message.guild.id)
                .map(r => r.toString())
                .join(', ') || 'لا يوجد';
            
            const embed = createArabicEmbed(
                `${config.emojis.user} معلومات ${target.user.username}`,
                `**الاسم:** ${target.user.tag}\n**الآيدي:** \`${target.id}\`\n**تاريخ الانضمام:** <t:${Math.floor(target.joinedTimestamp / 1000)}:R>\n**تاريخ التسجيل:** <t:${Math.floor(target.user.createdTimestamp / 1000)}:R>\n**الرتب [${target.roles.cache.size - 1}]:** ${roles}\n**الحالة:** ${target.presence?.status || 'غير معروف'}`,
                'info',
                target.user.displayAvatarURL({ dynamic: true })
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    serverinfo: {
        name: 'سيرفر',
        aliases: ['serverinfo', 'server', 'guild', 'السيرفر'],
        description: 'عرض معلومات السيرفر',
        category: 'عام',
        usage: '-سيرفر',
        cooldown: 5,
        execute: async (message) => {
            const guild = message.guild;
            
            const embed = createArabicEmbed(
                `${config.emojis.channel} معلومات ${guild.name}`,
                `**الاسم:** ${guild.name}\n**الآيدي:** \`${guild.id}\`\n**المالك:** <@${guild.ownerId}>\n**الأعضاء:** ${guild.memberCount}\n**القنوات:** ${guild.channels.cache.size}\n**الرتب:** ${guild.roles.cache.size}\n**تاريخ الإنشاء:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\n**البوستات:** ${guild.premiumSubscriptionCount || 0}`,
                'info',
                guild.iconURL({ dynamic: true })
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    // ====== أوامر الإدارة ======
    ban: {
        name: 'حظر',
        aliases: ['ban', 'b', 'تبنيد'],
        description: 'حظر عضو من السيرفر',
        category: 'إدارة',
        usage: '-حظر @عضو [السبب]',
        cooldown: 3,
        permissions: ['BanMembers'],
        execute: async (message, args) => {
            const target = message.mentions.members.first();
            if (!target) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'يرجى منشن العضو المراد حظره', 'danger')] 
                });
            }
            
            if (target.id === message.author.id) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'لا يمكنك حظر نفسك!', 'danger')] 
                });
            }
            
            const reason = args.slice(1).join(' ') || 'غير محدد';
            
            const row = new ActionRowBuilder().addComponents(
                createButton('confirm_ban_' + target.id, 'تأكيد الحظر', 'Danger', config.emojis.ban),
                createButton('cancel_ban_' + target.id, 'إلغاء', 'Secondary', config.emojis.error)
            );
            
            const embed = createArabicEmbed(
                '⚠️ تأكيد الحظر',
                `هل أنت متأكد من حظر ${target}؟\n**السبب:** ${reason}`,
                'warning'
            );
            
            const msg = await message.reply({ embeds: [embed], components: [row] });
            
            // حفظ البيانات مؤقتاً
            db.set(`ban_${msg.id}`, { target: target.id, reason, moderator: message.author.id });
        }
    },

    kick: {
        name: 'طرد',
        aliases: ['kick', 'k', 'اطرد'],
        description: 'طرد عضو من السيرفر',
        category: 'إدارة',
        usage: '-طرد @عضو [السبب]',
        cooldown: 3,
        permissions: ['KickMembers'],
        execute: async (message, args) => {
            const target = message.mentions.members.first();
            if (!target) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'يرجى منشن العضو المراد طرده', 'danger')] 
                });
            }
            
            const reason = args.slice(1).join(' ') || 'غير محدد';
            
            await target.kick(reason);
            
            const embed = createArabicEmbed(
                '👢 تم الطرد',
                `${target.user.tag} تم طرده بنجاح\n**السبب:** ${reason}`,
                'success'
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    mute: {
        name: 'اسكات',
        aliases: ['mute', 'm', 'اسكت', 'ميوت'],
        description: 'كتم عضو',
        category: 'إدارة',
        usage: '-اسكات @عضو [الوقت] [السبب]',
        cooldown: 3,
        permissions: ['ModerateMembers'],
        execute: async (message, args) => {
            const target = message.mentions.members.first();
            if (!target) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'يرجى منشن العضو', 'danger')] 
                });
            }
            
            const time = args[1] ? ms(args[1]) : null;
            const reason = args.slice(2).join(' ') || 'غير محدد';
            
            await target.timeout(time, reason);
            
            const embed = createArabicEmbed(
                '🔇 تم الكتم',
                `${target.user.tag} تم كتمه ${time ? `لمدة ${args[1]}` : 'للأبد'}\n**السبب:** ${reason}`,
                'success'
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    clear: {
        name: 'مسح',
        aliases: ['clear', 'c', 'purge', 'امسح'],
        description: 'مسح الرسائل',
        category: 'إدارة',
        usage: '-مسح [عدد]',
        cooldown: 5,
        permissions: ['ManageMessages'],
        execute: async (message, args) => {
            const amount = parseInt(args[0]);
            
            if (!amount || amount < 1 || amount > 100) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'يرجى إدخال رقم بين 1 و 100', 'danger')] 
                });
            }
            
            const deleted = await message.channel.bulkDelete(amount + 1, true);
            
            const embed = createArabicEmbed(
                '🧹 تم المسح',
                `تم مسح ${deleted.size - 1} رسالة بنجاح`,
                'success'
            );
            
            const msg = await message.channel.send({ embeds: [embed] });
            setTimeout(() => msg.delete(), 3000);
        }
    },

    lock: {
        name: 'قفل',
        aliases: ['lock', 'l', 'اقفل'],
        description: 'قفل القناة',
        category: 'إدارة',
        usage: '-قفل [السبب]',
        cooldown: 5,
        permissions: ['ManageChannels'],
        execute: async (message, args) => {
            const reason = args.join(' ') || 'غير محدد';
            
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: false
            });
            
            const embed = createArabicEmbed(
                '🔒 تم القفل',
                `تم قفل القناة\n**السبب:** ${reason}\n**بواسطة:** ${message.author.tag}`,
                'danger'
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    unlock: {
        name: 'فتح',
        aliases: ['unlock', 'ul', 'افتح'],
        description: 'فتح القناة',
        category: 'إدارة',
        usage: '-فتح',
        cooldown: 5,
        permissions: ['ManageChannels'],
        execute: async (message) => {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: true
            });
            
            const embed = createArabicEmbed(
                '🔓 تم الفتح',
                `تم فتح القناة بنجاح\n**بواسطة:** ${message.author.tag}`,
                'success'
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    slowmode: {
        name: 'بطيء',
        aliases: ['slowmode', 'slow', 'slowmo'],
        description: 'تعيين وضع البطء',
        category: 'إدارة',
        usage: '-بطيء [الوقت بالثواني]',
        cooldown: 5,
        permissions: ['ManageChannels'],
        execute: async (message, args) => {
            const time = parseInt(args[0]) || 0;
            
            await message.channel.setRateLimitPerUser(time);
            
            const embed = createArabicEmbed(
                '🐌 وضع البطء',
                time === 0 ? 'تم إلغاء وضع البطء' : `تم تعيين وضع البطء لـ ${time} ثانية`,
                'info'
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    // ====== أوامر الترفيه ======
    say: {
        name: 'قل',
        aliases: ['say', 'echo', 'اكتب'],
        description: 'يكرر كلامك',
        category: 'ترفيه',
        usage: '-قل [الرسالة]',
        cooldown: 3,
        execute: async (message, args) => {
            const text = args.join(' ');
            if (!text) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'يرجى كتابة شيء', 'danger')] 
                });
            }
            
            message.delete();
            message.channel.send(text);
        }
    },

    embed: {
        name: 'امبد',
        aliases: ['embed', 'e', 'تضمين'],
        description: 'إنشاء رسالة مضمنة',
        category: 'ترفيه',
        usage: '-امبد [العنوان] | [الوصف]',
        cooldown: 5,
        execute: async (message, args) => {
            const text = args.join(' ');
            const [title, description] = text.split('|').map(s => s.trim());
            
            if (!title || !description) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'الاستخدام: `-امبد العنوان | الوصف`', 'danger')] 
                });
            }
            
            const embed = createArabicEmbed(title, description, 'primary');
            message.channel.send({ embeds: [embed] });
        }
    },

    poll: {
        name: 'تصويت',
        aliases: ['poll', 'vote', 'استفتاء'],
        description: 'إنشاء تصويت',
        category: 'ترفيه',
        usage: '-تصويت [السؤال]',
        cooldown: 10,
        execute: async (message, args) => {
            const question = args.join(' ');
            if (!question) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'يرجى كتابة السؤال', 'danger')] 
                });
            }
            
            const embed = createArabicEmbed(
                '📊 ' + question,
                `**بواسطة:** ${message.author.tag}\n\nاضغط على الرياكشن للتصويت!`,
                'info'
            );
            
            const msg = await message.channel.send({ embeds: [embed] });
            await msg.react('👍');
            await msg.react('👎');
            await msg.react('🤷');
        }
    },

    // ====== أوامر الاقتصاد ======
    daily: {
        name: 'يومية',
        aliases: ['daily', 'reward', 'هدية'],
        description: 'الحصول على المكافأة اليومية',
        category: 'اقتصاد',
        usage: '-يومية',
        cooldown: 86400,
        execute: async (message) => {
            const amount = Math.floor(Math.random() * 1000) + 500;
            const current = db.get(`money_${message.author.id}`) || 0;
            db.set(`money_${message.author.id}`, current + amount);
            
            const embed = createArabicEmbed(
                '🎁 المكافأة اليومية',
                `حصلت على **${amount}** عملة! 💰\n**رصيدك الحالي:** ${current + amount}`,
                'success'
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    balance: {
        name: 'رصيد',
        aliases: ['balance', 'bal', 'فلوس', 'كاش'],
        description: 'عرض الرصيد',
        category: 'اقتصاد',
        usage: '-رصيد [@عضو]',
        cooldown: 3,
        execute: async (message, args) => {
            const target = message.mentions.users.first() || message.author;
            const balance = db.get(`money_${target.id}`) || 0;
            const bank = db.get(`bank_${target.id}`) || 0;
            
            const embed = createArabicEmbed(
                '💰 الرصيد',
                `**${target.username}**\n\n💵 نقدي: **${balance}**\n🏦 بنك: **${bank}**\n💎 الكلي: **${balance + bank}**`,
                'info',
                target.displayAvatarURL()
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    // ====== أوامر المستويات ======
    rank: {
        name: 'مستوى',
        aliases: ['rank', 'level', 'lvl', 'لفل'],
        description: 'عرض مستواك',
        category: 'مستويات',
        usage: '-مستوى [@عضو]',
        cooldown: 5,
        execute: async (message, args) => {
            const target = message.mentions.users.first() || message.author;
            const xp = db.get(`xp_${target.id}`) || 0;
            const level = db.get(`level_${target.id}`) || 1;
            const nextLevel = level * 100;
            const progress = Math.floor((xp / nextLevel) * 100);
            
            const bar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
            
            const embed = createArabicEmbed(
                '📈 المستوى',
                `**${target.username}**\n\n**المستوى:** ${level}\n**الخبرة:** ${xp}/${nextLevel}\n**التقدم:** [${bar}] ${progress}%`,
                'info',
                target.displayAvatarURL()
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    // ====== أوامر التذاكر ======
    ticket: {
        name: 'تذكرة',
        aliases: ['ticket', 't', 'دعم'],
        description: 'إنشاء تذكرة دعم فني',
        category: 'دعم',
        usage: '-تذكرة [السبب]',
        cooldown: 60,
        execute: async (message, args) => {
            const reason = args.join(' ') || 'غير محدد';
            const ticketId = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            const channel = await message.guild.channels.create({
                name: `تذكرة-${ticketId}`,
                type: 0,
                permissionOverwrites: [
                    {
                        id: message.guild.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: message.author.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                    }
                ]
            });
            
            const embed = createArabicEmbed(
                `🎫 تذكرة #${ticketId}`,
                `**العضو:** ${message.author.tag}\n**السبب:** ${reason}\n**الحالة:** مفتوحة`,
                'info'
            );
            
            const row = new ActionRowBuilder().addComponents(
                createButton('close_ticket_' + ticketId, 'إغلاق التذكرة', 'Danger', '🔒'),
                createButton('claim_ticket_' + ticketId, 'استلام', 'Success', '✋')
            );
            
            await channel.send({ content: `${message.author}`, embeds: [embed], components: [row] });
            
            const successEmbed = createArabicEmbed(
                '✅ تم الإنشاء',
                `تم إنشاء تذكرتك: ${channel}`,
                'success'
            );
            
            message.reply({ embeds: [successEmbed] });
        }
    },

    // ====== أوامر الألعاب ======
    rps: {
        name: 'حجرة',
        aliases: ['rps', 'rock', 'ورقة', 'مقص'],
        description: 'لعبة حجرة ورقة مقص',
        category: 'ألعاب',
        usage: '-حجرة [حجرة/ورقة/مقص]',
        cooldown: 5,
        execute: async (message, args) => {
            const choices = ['حجرة', 'ورقة', 'مقص'];
            const userChoice = args[0];
            
            if (!choices.includes(userChoice)) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'اختر: حجرة أو ورقة أو مقص', 'danger')] 
                });
            }
            
            const botChoice = choices[Math.floor(Math.random() * choices.length)];
            let result;
            
            if (userChoice === botChoice) result = 'تعادل!';
            else if (
                (userChoice === 'حجرة' && botChoice === 'مقص') ||
                (userChoice === 'ورقة' && botChoice === 'حجرة') ||
                (userChoice === 'مقص' && botChoice === 'ورقة')
            ) result = 'فزت! 🎉';
            else result = 'خسرت! 😢';
            
            const embed = createArabicEmbed(
                '🎮 حجرة ورقة مقص',
                `**اختيارك:** ${userChoice}\n**اختياري:** ${botChoice}\n\n**النتيجة:** ${result}`,
                result.includes('فزت') ? 'success' : result.includes('خسرت') ? 'danger' : 'warning'
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    // ====== أوامر الموسيقى (وهمية للعرض) ======
    play: {
        name: 'شغل',
        aliases: ['play', 'p', 'اغنية'],
        description: 'تشغيل أغنية (نظام وهمي للعرض)',
        category: 'موسيقى',
        usage: '-شغل [اسم الأغنية]',
        cooldown: 5,
        execute: async (message, args) => {
            const song = args.join(' ');
            if (!song) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'يرجى كتابة اسم الأغنية', 'danger')] 
                });
            }
            
            const embed = createArabicEmbed(
                '🎵 جاري التشغيل',
                `**${song}**\n\nالرجاء الانتظار...`,
                'info'
            );
            
            const row = new ActionRowBuilder().addComponents(
                createButton('music_pause', 'إيقاف مؤقت', 'Primary', '⏸️'),
                createButton('music_skip', 'تخطي', 'Secondary', '⏭️'),
                createButton('music_stop', 'إيقاف', 'Danger', '⏹️')
            );
            
            message.reply({ embeds: [embed], components: [row] });
        }
    },

    // ====== أوامر الذكاء الاصطناعي ======
    ask: {
        name: 'اسأل',
        aliases: ['ask', 'ai', 'ذكاء', 'سؤال'],
        description: 'سؤال الذكاء الاصطناعي (وهمي)',
        category: 'ذكاء اصطناعي',
        usage: '-اسأل [سؤالك]',
        cooldown: 10,
        execute: async (message, args) => {
            const question = args.join(' ');
            if (!question) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'يرجى كتابة سؤال', 'danger')] 
                });
            }
            
            const responses = [
                'هذا سؤال ممتاز! الجواب يعتمد على عدة عوامل...',
                'وفقاً لتحليلي، الإجابة هي نعم بالتأكيد!',
                'لا أعتقد ذلك، ولكن يمكنك المحاولة مرة أخرى.',
                'الأمر معقد، يحتاج لمزيد من التفكير.',
                'بكل تأكيد! هذا هو الحل الأمثل.',
                'أنا غير متأكد، جرب تسأل لاحقاً.'
            ];
            
            const response = responses[Math.floor(Math.random() * responses.length)];
            
            const embed = createArabicEmbed(
                '🤖 سؤال الذكاء الاصطناعي',
                `**سؤال:** ${question}\n\n**إجابة:** ${response}`,
                'info'
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    // ====== أوامر الإعدادات ======
    setprefix: {
        name: 'بادئة',
        aliases: ['setprefix', 'prefix', 'تغيير-البادئة'],
        description: 'تغيير بادئة البوت',
        category: 'إعدادات',
        usage: '-بادئة [البادئة الجديدة]',
        cooldown: 10,
        permissions: ['Administrator'],
        execute: async (message, args) => {
            const newPrefix = args[0];
            if (!newPrefix) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'يرجى كتابة البادئة الجديدة', 'danger')] 
                });
            }
            
            db.set(`prefix_${message.guild.id}`, newPrefix);
            
            const embed = createArabicEmbed(
                '⚙️ تم التغيير',
                `تم تغيير البادئة إلى: \`${newPrefix}\``,
                'success'
            );
            
            message.reply({ embeds: [embed] });
        }
    },

    welcome: {
        name: 'ترحيب',
        aliases: ['welcome', 'setwelcome', 'تفعيل-الترحيب'],
        description: 'تفعيل نظام الترحيب',
        category: 'إعدادات',
        usage: '-ترحيب [#القناة]',
        cooldown: 10,
        permissions: ['Administrator'],
        execute: async (message, args) => {
            const channel = message.mentions.channels.first();
            if (!channel) {
                return message.reply({ 
                    embeds: [createArabicEmbed('❌ خطأ', 'يرجى منشن القناة', 'danger')] 
                });
            }
            
            db.set(`welcome_${message.guild.id}`, channel.id);
            
            const embed = createArabicEmbed(
                '👋 تم التفعيل',
                `تم تفعيل الترحيب في: ${channel}`,
                'success'
            );
            
            message.reply({ embeds: [embed] });
        }
    }
};

// ====== معالجة الأحداث ======

// عند تشغيل البوت
client.once('ready', async () => {
    log.fancy('═══════════════════════════════════════');
    log.success(`البوت ${client.user.tag} يعمل بنجاح!`);
    log.info(`عدد السيرفرات: ${client.guilds.cache.size}`);
    log.info(`عدد المستخدمين: ${client.users.cache.size}`);
    log.info(`عدد الأوامر: ${Object.keys(commands).length}`);
    log.fancy('═══════════════════════════════════════');
    
    // تغيير الحالة كل 10 ثواني
    const statuses = [
        { name: `-مساعدة | ${client.guilds.cache.size} سيرفر`, type: 0 },
        { name: `${client.users.cache.size} مستخدم`, type: 3 },
        { name: 'النظام العربي المتكامل', type: 2 },
        { name: 'discord.gg/arabic', type: 0 }
    ];
    
    let i = 0;
    setInterval(() => {
        client.user.setActivity(statuses[i]);
        i = (i + 1) % statuses.length;
    }, 10000);
});

// عند استلام رسالة
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    // الحصول على البادئة المخصصة أو الافتراضية
    const guildPrefix = db.get(`prefix_${message.guild.id}`) || config.prefix;
    
    if (!message.content.startsWith(guildPrefix)) return;
    
    const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    // البحث عن الأمر
    const command = Object.values(commands).find(cmd => 
        cmd.name === commandName || cmd.aliases.includes(commandName)
    );
    
    if (!command) return;
    
    // التحقق من الصلاحيات
    if (command.permissions) {
        const missingPerms = command.permissions.filter(perm => 
            !message.member.permissions.has(PermissionsBitField.Flags[perm])
        );
        
        if (missingPerms.length > 0) {
            return message.reply({ 
                embeds: [createArabicEmbed('🛡️ صلاحيات مفقودة', `تحتاج إلى: ${missingPerms.join(', ')}`, 'danger')] 
            });
        }
    }
    
    // التحقق من الكول داون
    const cooldownKey = `${command.name}_${message.author.id}`;
    const cooldownTime = command.cooldown || 3;
    const lastUsed = client.cooldowns.get(cooldownKey);
    
    if (lastUsed) {
        const remaining = (lastUsed + (cooldownTime * 1000)) - Date.now();
        if (remaining > 0) {
            return message.reply({ 
                embeds: [createArabicEmbed('⏳ انتظر', `يرجى الانتظار ${(remaining / 1000).toFixed(1)} ثانية`, 'warning')] 
            });
        }
    }
    
    client.cooldowns.set(cooldownKey, Date.now());
    setTimeout(() => client.cooldowns.delete(cooldownKey), cooldownTime * 1000);
    
    // تنفيذ الأمر
    try {
        await command.execute(message, args);
    } catch (error) {
        log.error(`خطأ في أمر ${command.name}: ${error.message}`);
        message.reply({ 
            embeds: [createArabicEmbed('❌ خطأ', 'حدث خطأ أثناء تنفيذ الأمر!', 'danger')] 
        });
    }
});

// عند الضغط على زر
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const { customId, user, message } = interaction;
    
    // نظام التذاكر
    if (customId.startsWith('close_ticket_')) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: 'ليس لديك صلاحية!', ephemeral: true });
        }
        
        await interaction.reply({ content: 'جاري إغلاق التذكرة...', ephemeral: true });
        setTimeout(() => interaction.channel.delete(), 3000);
    }
    
    else if (customId.startsWith('claim_ticket_')) {
        await interaction.reply({ content: `تم استلام التذكرة بواسطة ${user}`, ephemeral: false });
    }
    
    // نظام المساعدة
    else if (customId === 'help_general') {
        const embed = createArabicEmbed('⭐ الأوامر العامة', '`-مساعدة` `-بينغ` `-معلومات` `-سيرفر`', 'primary');
        interaction.update({ embeds: [embed] });
    }
    else if (customId === 'help_admin') {
        const embed = createArabicEmbed('🛡️ أوامر الإدارة', '`-حظر` `-طرد` `-اسكات` `-مسح` `-قفل` `-فتح` `-بطيء`', 'danger');
        interaction.update({ embeds: [embed] });
    }
    else if (customId === 'help_fun') {
        const embed = createArabicEmbed('🔥 الأوامر الترفيهية', '`-قل` `-امبد` `-تصويت` `-حجرة`', 'success');
        interaction.update({ embeds: [embed] });
    }
    else if (customId === 'help_economy') {
        const embed = createArabicEmbed('💰 أوامر الاقتصاد', '`-يومية` `-رصيد` `-مستوى`', 'secondary');
        interaction.update({ embeds: [embed] });
    }
    
    // نظام الحظر
    else if (customId.startsWith('confirm_ban_')) {
        const data = db.get(`ban_${message.id}`);
        if (!data) return interaction.reply({ content: 'انتهت صلاحية هذا الإجراء!', ephemeral: true });
        
        const target = await interaction.guild.members.fetch(data.target).catch(() => null);
        if (target) {
            await target.ban({ reason: data.reason });
            const embed = createArabicEmbed('🔨 تم الحظر', `${target.user.tag} تم حظره بنجاح`, 'success');
            interaction.update({ embeds: [embed], components: [] });
        }
    }
    else if (customId.startsWith('cancel_ban_')) {
        const embed = createArabicEmbed('❌ تم الإلغاء', 'تم إلغاء عملية الحظر', 'secondary');
        interaction.update({ embeds: [embed], components: [] });
    }
    
    // نظام الموسيقى (وهمي)
    else if (customId === 'music_pause') {
        interaction.reply({ content: '⏸️ تم الإيقاف المؤقت', ephemeral: true });
    }
    else if (customId === 'music_skip') {
        interaction.reply({ content: '⏭️ تم التخطي', ephemeral: true });
    }
    else if (customId === 'music_stop') {
        interaction.reply({ content: '⏹️ تم الإيقاف', ephemeral: true });
    }
});

// عند انضمام عضو جديد
client.on('guildMemberAdd', async (member) => {
    const welcomeChannelId = db.get(`welcome_${member.guild.id}`);
    if (!welcomeChannelId) return;
    
    const channel = member.guild.channels.cache.get(welcomeChannelId);
    if (!channel) return;
    
    const embed = createArabicEmbed(
        '👋 أهلاً وسهلاً!',
        `مرحباً ${member} في ${member.guild.name}!\n**العضو رقم:** ${member.guild.memberCount}`,
        'success',
        member.user.displayAvatarURL()
    );
    
    channel.send({ content: `${member}`, embeds: [embed] });
});

// تسجيل الدخول
client.login(process.env.TOKEN);
