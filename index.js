const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const ms = require('ms');
require('dotenv').config();

// ====== نظام قاعدة البيانات JSON (بديل عن quick.db) ======
class JSONDatabase {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = {};
        this.init();
    }

    init() {
        try {
            if (fs.existsSync(this.filePath)) {
                this.data = fs.readJsonSync(this.filePath);
            } else {
                fs.ensureDirSync(path.dirname(this.filePath));
                this.save();
            }
        } catch (error) {
            console.error('خطأ في تهيئة قاعدة البيانات:', error);
            this.data = {};
        }
    }

    save() {
        try {
            fs.writeJsonSync(this.filePath, this.data, { spaces: 2 });
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
        }
    }

    get(key) {
        return this.data[key] ?? null;
    }

    set(key, value) {
        this.data[key] = value;
        this.save();
        return value;
    }

    delete(key) {
        delete this.data[key];
        this.save();
        return true;
    }

    add(key, amount) {
        const current = this.get(key) || 0;
        return this.set(key, current + amount);
    }

    subtract(key, amount) {
        const current = this.get(key) || 0;
        return this.set(key, current - amount);
    }

    push(key, value) {
        const arr = this.get(key) || [];
        arr.push(value);
        return this.set(key, arr);
    }
}

// إنشاء قاعدة البيانات
const db = new JSONDatabase('./data/database.json');

// ====== تهيئة البوت ======
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
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction],
    failIfNotExists: false,
    allowedMentions: { parse: ['users', 'roles'], repliedUser: true }
});

// ====== الإعدادات ======
const config = {
    prefix: '-',
    ownerID: process.env.OWNER_ID || 'YOUR_USER_ID_HERE',
    color: {
        primary: 0x5865F2,
        success: 0x57F287,
        danger: 0xED4245,
        warning: 0xFEE75C,
        info: 0xEB459E,
        gold: 0xFFD700
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
        boost: '💎',
        online: '🟢',
        idle: '🟡',
        dnd: '🔴',
        offline: '⚫'
    }
};

// ====== أنظمة التخزين ======
client.commands = new Collection();
client.cooldowns = new Map();
client.tempData = new Map();

// ====== نظام اللوج المطور ======
const log = {
    success: (msg) => console.log(`\x1b[32m[✓]\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m[✗]\x1b[0m ${msg}`),
    info: (msg) => console.log(`\x1b[34m[ℹ]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[⚠]\x1b[0m ${msg}`),
    fancy: (msg) => console.log(`\x1b[35m[★]\x1b[0m ${msg}`),
    cmd: (msg) => console.log(`\x1b[36m[⌨]\x1b[0m ${msg}`)
};

// ====== دالة إنشاء الإمبد ======
function createEmbed(title, description, color = 'primary', thumbnail = null, image = null, fields = []) {
    try {
        const embed = new EmbedBuilder()
            .setColor(config.color[color] || config.color.primary)
            .setTitle(`${config.emojis.star} ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ 
                text: `النظام العربي المتكامل | ${new Date().toLocaleDateString('ar-SA')}`, 
                iconURL: client.user?.displayAvatarURL() || undefined
            });

        if (thumbnail) embed.setThumbnail(thumbnail);
        if (image) embed.setImage(image);
        if (fields.length > 0) embed.addFields(fields);

        return embed;
    } catch (error) {
        log.error(`خطأ في إنشاء الإمبد: ${error.message}`);
        return new EmbedBuilder().setDescription('حدث خطأ').setColor(config.color.danger);
    }
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

    try {
        const btn = new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setStyle(styles[style] || ButtonStyle.Primary)
            .setDisabled(disabled);

        if (emoji) btn.setEmoji(emoji);
        return btn;
    } catch (error) {
        log.error(`خطأ في إنشاء الزر: ${error.message}`);
        return new ButtonBuilder().setCustomId('error').setLabel('خطأ').setStyle(ButtonStyle.Danger);
    }
}

// ====== نظام الأوامر ======
const commands = {
    // ====== أوامر عامة ======
    help: {
        name: 'مساعدة',
        aliases: ['help', 'h', 'commands', 'cmds', 'اوامر'],
        description: 'عرض قائمة الأوامر المتاحة',
        category: 'عام',
        usage: '-مساعدة [اسم الأمر]',
        cooldown: 3,
        execute: async (message, args) => {
            try {
                if (args[0]) {
                    const cmd = Object.values(commands).find(c => 
                        c.name === args[0] || c.aliases.includes(args[0])
                    );
                    
                    if (!cmd) {
                        return message.reply({ 
                            embeds: [createEmbed('❌ خطأ', 'الأمر غير موجود!', 'danger')] 
                        });
                    }
                    
                    const embed = createEmbed(
                        `📖 ${cmd.name}`,
                        `**الوصف:** ${cmd.description}\n**الاستخدام:** \`${cmd.usage}\`\n**الاختصارات:** ${cmd.aliases.join(', ')}\n**الفئة:** ${cmd.category}\n**الكول داون:** ${cmd.cooldown} ثانية${cmd.permissions ? `\n**الصلاحيات:** ${cmd.permissions.join(', ')}` : ''}`,
                        'info'
                    );
                    
                    return message.reply({ embeds: [embed] });
                }
                
                const categories = {};
                Object.entries(commands).forEach(([key, cmd]) => {
                    if (!categories[cmd.category]) categories[cmd.category] = [];
                    categories[cmd.category].push(`\`${cmd.name}\``);
                });
                
                const categoryEmojis = {
                    'عام': '⭐',
                    'إدارة': '🛡️',
                    'ترفيه': '🔥',
                    'اقتصاد': '💰',
                    'مستويات': '📈',
                    'دعم': '🎫',
                    'ألعاب': '🎮',
                    'موسيقى': '🎵',
                    'ذكاء اصطناعي': '🤖',
                    'إعدادات': '⚙️'
                };
                
                const embed = createEmbed(
                    '🤖 قائمة الأوامر',
                    '**مرحباً بك في النظام العربي المتكامل!**\n\nاستخدم `-مساعدة [اسم الأمر]` للتفاصيل\n\n' + 
                    Object.entries(categories).map(([cat, cmds]) => 
                        `**${categoryEmojis[cat] || config.emojis.gear} ${cat}**\n${cmds.join(' • ')}`
                    ).join('\n\n'),
                    'primary'
                );
                
                const row = new ActionRowBuilder().addComponents(
                    createButton('help_general', 'عام', 'Primary', '⭐'),
                    createButton('help_admin', 'إدارة', 'Danger', '🛡️'),
                    createButton('help_fun', 'ترفيه', 'Success', '🔥'),
                    createButton('help_economy', 'اقتصاد', 'Secondary', '💰')
                );
                
                await message.reply({ embeds: [embed], components: [row] });
            } catch (error) {
                log.error(`خطأ في أمر المساعدة: ${error.message}`);
                message.reply({ embeds: [createEmbed('❌ خطأ', 'حدث خطأ في عرض المساعدة', 'danger')] });
            }
        }
    },

    ping: {
        name: 'بينغ',
        aliases: ['ping', 'pong', 'lag', 'سرعة'],
        description: 'عرض سرعة استجابة البوت',
        category: 'عام',
        usage: '-بينغ',
        cooldown: 5,
        execute: async (message) => {
            try {
                const sent = await message.reply({ 
                    embeds: [createEmbed(config.emojis.loading + ' جاري القياس...', 'يرجى الانتظار', 'warning')] 
                });
                
                const latency = sent.createdTimestamp - message.createdTimestamp;
                const apiLatency = Math.round(client.ws.ping);
                
                const status = latency < 100 ? { text: '🟢 ممتاز', color: 'success' } : 
                              latency < 200 ? { text: '🟡 جيد', color: 'warning' } : 
                              { text: '🔴 بطيء', color: 'danger' };
                
                const embed = createEmbed(
                    '🏓 بينغ!',
                    `**سرعة البوت:** \`${latency}ms\`\n**سرعة API:** \`${apiLatency}ms\`\n**التقييم:** ${status.text}`,
                    status.color
                );
                
                await sent.edit({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر البينغ: ${error.message}`);
            }
        }
    },

    userinfo: {
        name: 'معلومات',
        aliases: ['userinfo', 'user', 'whois', 'عني', 'عضو'],
        description: 'عرض معلومات المستخدم',
        category: 'عام',
        usage: '-معلومات [@عضو]',
        cooldown: 5,
        execute: async (message, args) => {
            try {
                const target = message.mentions.members.first() || message.member;
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'لم يتم العثور على العضو', 'danger')] 
                    });
                }
                
                const roles = target.roles.cache
                    .filter(r => r.id !== message.guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(r => r.toString())
                    .slice(0, 10)
                    .join(', ') || 'لا يوجد';
                
                const statusMap = {
                    'online': '🟢 متصل',
                    'idle': '🟡 غير نشط',
                    'dnd': '🔴 لا تزعج',
                    'offline': '⚫ غير متصل',
                    'invisible': '⚫ مخفي'
                };
                
                const embed = createEmbed(
                    `${config.emojis.user} معلومات ${target.user.username}`,
                    `**الاسم:** ${target.user.tag}\n**الآيدي:** \`${target.id}\`\n**الحالة:** ${statusMap[target.presence?.status] || 'غير معروف'}\n**تاريخ الانضمام:** <t:${Math.floor(target.joinedTimestamp / 1000)}:R>\n**تاريخ التسجيل:** <t:${Math.floor(target.user.createdTimestamp / 1000)}:R>\n**الرتب [${target.roles.cache.size - 1}]:** ${roles}${target.roles.cache.size > 11 ? '\n*... وغيرها*' : ''}`,
                    'info',
                    target.user.displayAvatarURL({ dynamic: true })
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر المعلومات: ${error.message}`);
                message.reply({ embeds: [createEmbed('❌ خطأ', 'حدث خطأ في جلب المعلومات', 'danger')] });
            }
        }
    },

    serverinfo: {
        name: 'سيرفر',
        aliases: ['serverinfo', 'server', 'guild', 'السيرفر', 'سيرفرinfo'],
        description: 'عرض معلومات السيرفر',
        category: 'عام',
        usage: '-سيرفر',
        cooldown: 5,
        execute: async (message) => {
            try {
                const guild = message.guild;
                const owner = await guild.fetchOwner().catch(() => null);
                
                const embed = createEmbed(
                    `${config.emojis.channel} معلومات ${guild.name}`,
                    `**الاسم:** ${guild.name}\n**الآيدي:** \`${guild.id}\`\n**المالك:** ${owner ? owner.user.tag : 'غير معروف'}\n**الأعضاء:** ${guild.memberCount.toLocaleString()}\n**البشر:** ${guild.members.cache.filter(m => !m.user.bot).size}\n**البوتات:** ${guild.members.cache.filter(m => m.user.bot).size}\n**القنوات:** ${guild.channels.cache.size}\n**الرتب:** ${guild.roles.cache.size}\n**البوستات:** ${guild.premiumSubscriptionCount || 0} مستوى`,
                    'info',
                    guild.iconURL({ dynamic: true })
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر السيرفر: ${error.message}`);
            }
        }
    },

    // ====== أوامر الإدارة ======
    ban: {
        name: 'حظر',
        aliases: ['ban', 'b', 'تبنيد', 'بان'],
        description: 'حظر عضو من السيرفر',
        category: 'إدارة',
        usage: '-حظر @عضو [السبب]',
        cooldown: 3,
        permissions: ['BanMembers'],
        execute: async (message, args) => {
            try {
                const target = message.mentions.members.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى منشن العضو المراد حظره', 'danger')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'لا يمكنك حظر نفسك!', 'danger')] 
                    });
                }
                
                if (target.roles.highest.position >= message.member.roles.highest.position) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'لا يمكنك حظر عضو أعلى منك رتبة!', 'danger')] 
                    });
                }
                
                if (!target.bannable) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'لا يمكنني حظر هذا العضو!', 'danger')] 
                    });
                }
                
                const reason = args.slice(1).join(' ') || 'غير محدد';
                
                const row = new ActionRowBuilder().addComponents(
                    createButton(`confirm_ban_${target.id}_${message.author.id}`, 'تأكيد الحظر', 'Danger', config.emojis.ban),
                    createButton(`cancel_ban_${target.id}_${message.author.id}`, 'إلغاء', 'Secondary', config.emojis.error)
                );
                
                const embed = createEmbed(
                    '⚠️ تأكيد الحظر',
                    `هل أنت متأكد من حظر ${target}؟\n**السبب:** ${reason}`,
                    'warning'
                );
                
                const msg = await message.reply({ embeds: [embed], components: [row] });
                
                client.tempData.set(`ban_${msg.id}`, { 
                    target: target.id, 
                    reason, 
                    moderator: message.author.id,
                    timestamp: Date.now()
                });
                
                // حذف البيانات المؤقتة بعد 5 دقائق
                setTimeout(() => client.tempData.delete(`ban_${msg.id}`), 300000);
                
            } catch (error) {
                log.error(`خطأ في أمر الحظر: ${error.message}`);
                message.reply({ embeds: [createEmbed('❌ خطأ', 'حدث خطأ في عملية الحظر', 'danger')] });
            }
        }
    },

    kick: {
        name: 'طرد',
        aliases: ['kick', 'k', 'اطرد', 'كيك'],
        description: 'طرد عضو من السيرفر',
        category: 'إدارة',
        usage: '-طرد @عضو [السبب]',
        cooldown: 3,
        permissions: ['KickMembers'],
        execute: async (message, args) => {
            try {
                const target = message.mentions.members.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى منشن العضو المراد طرده', 'danger')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'لا يمكنك طرد نفسك!', 'danger')] 
                    });
                }
                
                if (target.roles.highest.position >= message.member.roles.highest.position) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'لا يمكنك طرد عضو أعلى منك رتبة!', 'danger')] 
                    });
                }
                
                const reason = args.slice(1).join(' ') || 'غير محدد';
                
                await target.kick(reason);
                
                const embed = createEmbed(
                    '👢 تم الطرد',
                    `${target.user.tag} تم طرده بنجاح\n**السبب:** ${reason}`,
                    'success'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر الطرد: ${error.message}`);
                message.reply({ embeds: [createEmbed('❌ خطأ', 'حدث خطأ في عملية الطرد', 'danger')] });
            }
        }
    },

    mute: {
        name: 'اسكات',
        aliases: ['mute', 'm', 'اسكت', 'ميوت', 'تايموت'],
        description: 'كتم عضو مؤقتاً',
        category: 'إدارة',
        usage: '-اسكات @عضو [الوقت] [السبب]',
        cooldown: 3,
        permissions: ['ModerateMembers'],
        execute: async (message, args) => {
            try {
                const target = message.mentions.members.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى منشن العضو', 'danger')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'لا يمكنك كتم نفسك!', 'danger')] 
                    });
                }
                
                if (target.roles.highest.position >= message.member.roles.highest.position) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'لا يمكنك كتم عضو أعلى منك رتبة!', 'danger')] 
                    });
                }
                
                const timeArg = args[1];
                const time = timeArg ? ms(timeArg) : null;
                
                if (timeArg && !time) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'صيغة الوقت غير صحيحة! مثال: 1h, 30m, 1d', 'danger')] 
                    });
                }
                
                const reason = args.slice(time ? 2 : 1).join(' ') || 'غير محدد';
                
                await target.timeout(time, reason);
                
                const timeText = time ? `لمدة ${timeArg}` : 'بشكل دائم';
                
                const embed = createEmbed(
                    '🔇 تم الكتم',
                    `${target.user.tag} تم كتمه ${timeText}\n**السبب:** ${reason}`,
                    'success'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر الكتم: ${error.message}`);
                message.reply({ embeds: [createEmbed('❌ خطأ', 'حدث خطأ في عملية الكتم', 'danger')] });
            }
        }
    },

    unmute: {
        name: 'فك-اسكات',
        aliases: ['unmute', 'um', 'فك', 'فك-الميوت'],
        description: 'فك الكتم عن عضو',
        category: 'إدارة',
        usage: '-فك-اسكات @عضو',
        cooldown: 3,
        permissions: ['ModerateMembers'],
        execute: async (message, args) => {
            try {
                const target = message.mentions.members.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى منشن العضو', 'danger')] 
                    });
                }
                
                if (!target.communicationDisabledUntil) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'هذا العضو غير مكتوم!', 'danger')] 
                    });
                }
                
                await target.timeout(null);
                
                const embed = createEmbed(
                    '🔊 تم فك الكتم',
                    `${target.user.tag} تم فك الكتم عنه بنجاح`,
                    'success'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في فك الكتم: ${error.message}`);
            }
        }
    },

    clear: {
        name: 'مسح',
        aliases: ['clear', 'c', 'purge', 'امسح', 'تنظيف'],
        description: 'مسح الرسائل',
        category: 'إدارة',
        usage: '-مسح [عدد]',
        cooldown: 5,
        permissions: ['ManageMessages'],
        execute: async (message, args) => {
            try {
                const amount = parseInt(args[0]);
                
                if (!amount || amount < 1 || amount > 100) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى إدخال رقم بين 1 و 100', 'danger')] 
                    });
                }
                
                const deleted = await message.channel.bulkDelete(amount + 1, true).catch(() => null);
                
                if (!deleted) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'لا يمكن مسح الرسائل الأقدم من 14 يوم', 'danger')] 
                    });
                }
                
                const embed = createEmbed(
                    '🧹 تم المسح',
                    `تم مسح ${deleted.size - 1} رسالة بنجاح`,
                    'success'
                );
                
                const msg = await message.channel.send({ embeds: [embed] });
                setTimeout(() => msg.delete().catch(() => {}), 3000);
            } catch (error) {
                log.error(`خطأ في أمر المسح: ${error.message}`);
                message.reply({ embeds: [createEmbed('❌ خطأ', 'حدث خطأ في مسح الرسائل', 'danger')] });
            }
        }
    },

    lock: {
        name: 'قفل',
        aliases: ['lock', 'l', 'اقفل', 'قفل-الشات'],
        description: 'قفل القناة',
        category: 'إدارة',
        usage: '-قفل [السبب]',
        cooldown: 5,
        permissions: ['ManageChannels'],
        execute: async (message, args) => {
            try {
                const reason = args.join(' ') || 'غير محدد';
                
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });
                
                const embed = createEmbed(
                    '🔒 تم القفل',
                    `تم قفل القناة\n**السبب:** ${reason}\n**بواسطة:** ${message.author.tag}`,
                    'danger'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر القفل: ${error.message}`);
                message.reply({ embeds: [createEmbed('❌ خطأ', 'لا يمكنني قفل هذه القناة', 'danger')] });
            }
        }
    },

    unlock: {
        name: 'فتح',
        aliases: ['unlock', 'ul', 'افتح', 'فتح-الشات'],
        description: 'فتح القناة',
        category: 'إدارة',
        usage: '-فتح',
        cooldown: 5,
        permissions: ['ManageChannels'],
        execute: async (message) => {
            try {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: true
                });
                
                const embed = createEmbed(
                    '🔓 تم الفتح',
                    `تم فتح القناة بنجاح\n**بواسطة:** ${message.author.tag}`,
                    'success'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر الفتح: ${error.message}`);
            }
        }
    },

    slowmode: {
        name: 'بطيء',
        aliases: ['slowmode', 'slow', 'slowmo', 'بطء'],
        description: 'تعيين وضع البطء',
        category: 'إدارة',
        usage: '-بطيء [الوقت بالثواني]',
        cooldown: 5,
        permissions: ['ManageChannels'],
        execute: async (message, args) => {
            try {
                const time = parseInt(args[0]) || 0;
                
                if (time < 0 || time > 21600) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'الوقت يجب أن يكون بين 0 و 21600 ثانية (6 ساعات)', 'danger')] 
                    });
                }
                
                await message.channel.setRateLimitPerUser(time);
                
                const embed = createEmbed(
                    '🐌 وضع البطء',
                    time === 0 ? 'تم إلغاء وضع البطء' : `تم تعيين وضع البطء لـ ${time} ثانية`,
                    'info'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر البطء: ${error.message}`);
            }
        }
    },

    // ====== أوامر الترفيه ======
    say: {
        name: 'قل',
        aliases: ['say', 'echo', 'اكتب', 'كرر'],
        description: 'يكرر كلامك',
        category: 'ترفيه',
        usage: '-قل [الرسالة]',
        cooldown: 3,
        execute: async (message, args) => {
            try {
                const text = args.join(' ');
                if (!text) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى كتابة شيء', 'danger')] 
                    });
                }
                
                await message.delete().catch(() => {});
                await message.channel.send(text);
            } catch (error) {
                log.error(`خطأ في أمر قل: ${error.message}`);
            }
        }
    },

    embed: {
        name: 'امبد',
        aliases: ['embed', 'e', 'تضمين', 'مضمن'],
        description: 'إنشاء رسالة مضمنة',
        category: 'ترفيه',
        usage: '-امبد [العنوان] | [الوصف]',
        cooldown: 5,
        execute: async (message, args) => {
            try {
                const text = args.join(' ');
                const parts = text.split('|').map(s => s.trim());
                
                if (parts.length < 2) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'الاستخدام: `-امبد العنوان | الوصف`', 'danger')] 
                    });
                }
                
                const [title, ...descParts] = parts;
                const description = descParts.join(' | ');
                
                const embed = createEmbed(title, description, 'primary');
                await message.channel.send({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر الامبد: ${error.message}`);
            }
        }
    },

    poll: {
        name: 'تصويت',
        aliases: ['poll', 'vote', 'استفتاء', 'تصويت'],
        description: 'إنشاء تصويت',
        category: 'ترفيه',
        usage: '-تصويت [السؤال]',
        cooldown: 10,
        execute: async (message, args) => {
            try {
                const question = args.join(' ');
                if (!question) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى كتابة السؤال', 'danger')] 
                    });
                }
                
                const embed = createEmbed(
                    '📊 ' + question,
                    `**بواسطة:** ${message.author.tag}\n\nاضغط على الرياكشن للتصويت!`,
                    'info'
                );
                
                const msg = await message.channel.send({ embeds: [embed] });
                await msg.react('👍').catch(() => {});
                await msg.react('👎').catch(() => {});
                await msg.react('🤷').catch(() => {});
            } catch (error) {
                log.error(`خطأ في أمر التصويت: ${error.message}`);
            }
        }
    },

    // ====== أوامر الاقتصاد ======
    daily: {
        name: 'يومية',
        aliases: ['daily', 'reward', 'هدية', 'هديه'],
        description: 'الحصول على المكافأة اليومية',
        category: 'اقتصاد',
        usage: '-يومية',
        cooldown: 86400,
        execute: async (message) => {
            try {
                const lastDaily = db.get(`daily_${message.author.id}`);
                const now = Date.now();
                
                if (lastDaily && now - lastDaily < 86400000) {
                    const remaining = 86400000 - (now - lastDaily);
                    const hours = Math.floor(remaining / 3600000);
                    const minutes = Math.floor((remaining % 3600000) / 60000);
                    
                    return message.reply({ 
                        embeds: [createEmbed('⏳ انتظر', `يمكنك الحصول على المكافأة بعد ${hours} ساعة و ${minutes} دقيقة`, 'warning')] 
                    });
                }
                
                const amount = Math.floor(Math.random() * 1000) + 500;
                const current = db.get(`money_${message.author.id}`) || 0;
                db.set(`money_${message.author.id}`, current + amount);
                db.set(`daily_${message.author.id}`, now);
                
                const embed = createEmbed(
                    '🎁 المكافأة اليومية',
                    `حصلت على **${amount.toLocaleString()}** عملة! 💰\n**رصيدك الحالي:** ${(current + amount).toLocaleString()}`,
                    'success'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر اليومية: ${error.message}`);
            }
        }
    },

    balance: {
        name: 'رصيد',
        aliases: ['balance', 'bal', 'فلوس', 'كاش', 'فلوسي'],
        description: 'عرض الرصيد',
        category: 'اقتصاد',
        usage: '-رصيد [@عضو]',
        cooldown: 3,
        execute: async (message, args) => {
            try {
                const target = message.mentions.users.first() || message.author;
                const balance = db.get(`money_${target.id}`) || 0;
                const bank = db.get(`bank_${target.id}`) || 0;
                
                const embed = createEmbed(
                    '💰 الرصيد',
                    `**${target.username}**\n\n💵 نقدي: **${balance.toLocaleString()}**\n🏦 بنك: **${bank.toLocaleString()}**\n💎 الكلي: **${(balance + bank).toLocaleString()}**`,
                    'info',
                    target.displayAvatarURL()
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر الرصيد: ${error.message}`);
            }
        }
    },

    deposit: {
        name: 'ايداع',
        aliases: ['deposit', 'dep', 'حط', 'حفظ'],
        description: 'إيداع فلوس في البنك',
        category: 'اقتصاد',
        usage: '-ايداع [المبلغ]',
        cooldown: 5,
        execute: async (message, args) => {
            try {
                const amount = args[0] === 'all' ? db.get(`money_${message.author.id}`) || 0 : parseInt(args[0]);
                
                if (!amount || amount <= 0) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى إدخال مبلغ صحيح', 'danger')] 
                    });
                }
                
                const balance = db.get(`money_${message.author.id}`) || 0;
                
                if (amount > balance) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'رصيدك غير كافي!', 'danger')] 
                    });
                }
                
                db.subtract(`money_${message.author.id}`, amount);
                db.add(`bank_${message.author.id}`, amount);
                
                const embed = createEmbed(
                    '🏦 تم الإيداع',
                    `تم إيداع **${amount.toLocaleString()}** في البنك\n**رصيدك:** ${(balance - amount).toLocaleString()}\n**البنك:** ${(db.get(`bank_${message.author.id}`)).toLocaleString()}`,
                    'success'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر الإيداع: ${error.message}`);
            }
        }
    },

    withdraw: {
        name: 'سحب',
        aliases: ['withdraw', 'with', 'اسحب', 'اخذ'],
        description: 'سحب فلوس من البنك',
        category: 'اقتصاد',
        usage: '-سحب [المبلغ]',
        cooldown: 5,
        execute: async (message, args) => {
            try {
                const amount = args[0] === 'all' ? db.get(`bank_${message.author.id}`) || 0 : parseInt(args[0]);
                
                if (!amount || amount <= 0) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى إدخال مبلغ صحيح', 'danger')] 
                    });
                }
                
                const bank = db.get(`bank_${message.author.id}`) || 0;
                
                if (amount > bank) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'رصيد البنك غير كافي!', 'danger')] 
                    });
                }
                
                db.add(`money_${message.author.id}`, amount);
                db.subtract(`bank_${message.author.id}`, amount);
                
                const embed = createEmbed(
                    '💵 تم السحب',
                    `تم سحب **${amount.toLocaleString()}** من البنك\n**رصيدك:** ${(db.get(`money_${message.author.id}`)).toLocaleString()}\n**البنك:** ${(bank - amount).toLocaleString()}`,
                    'success'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر السحب: ${error.message}`);
            }
        }
    },

    // ====== أوامر المستويات ======
    rank: {
        name: 'مستوى',
        aliases: ['rank', 'level', 'lvl', 'لفل', 'مستواي'],
        description: 'عرض مستواك',
        category: 'مستويات',
        usage: '-مستوى [@عضو]',
        cooldown: 5,
        execute: async (message, args) => {
            try {
                const target = message.mentions.users.first() || message.author;
                const xp = db.get(`xp_${target.id}`) || 0;
                const level = db.get(`level_${target.id}`) || 1;
                const nextLevel = level * 100;
                const progress = Math.min(Math.floor((xp / nextLevel) * 100), 100);
                
                const bar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
                
                const embed = createEmbed(
                    '📈 المستوى',
                    `**${target.username}**\n\n**المستوى:** ${level}\n**الخبرة:** ${xp}/${nextLevel}\n**التقدم:** [${bar}] ${progress}%`,
                    'info',
                    target.displayAvatarURL()
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر المستوى: ${error.message}`);
            }
        }
    },

    // ====== أوامر التذاكر ======
    ticket: {
        name: 'تذكرة',
        aliases: ['ticket', 't', 'دعم', 'مساعدة'],
        description: 'إنشاء تذكرة دعم فني',
        category: 'دعم',
        usage: '-تذكرة [السبب]',
        cooldown: 60,
        execute: async (message, args) => {
            try {
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
                            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks']
                        },
                        {
                            id: client.user.id,
                            allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ReadMessageHistory']
                        }
                    ],
                    reason: `تذكرة بواسطة ${message.author.tag}`
                }).catch(error => {
                    log.error(`خطأ في إنشاء القناة: ${error.message}`);
                    return null;
                });
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'لا يمكنني إنشاء القناة، تأكد من صلاحياتي', 'danger')] 
                    });
                }
                
                const embed = createEmbed(
                    `🎫 تذكرة #${ticketId}`,
                    `**العضو:** ${message.author.tag}\n**السبب:** ${reason}\n**الحالة:** مفتوحة\n\nالأدمن سيقومون بمساعدتك قريباً!`,
                    'info'
                );
                
                const row = new ActionRowBuilder().addComponents(
                    createButton(`close_ticket_${ticketId}`, 'إغلاق التذكرة', 'Danger', '🔒'),
                    createButton(`claim_ticket_${ticketId}_${message.author.id}`, 'استلام', 'Success', '✋')
                );
                
                await channel.send({ content: `${message.author}`, embeds: [embed], components: [row] });
                
                const successEmbed = createEmbed(
                    '✅ تم الإنشاء',
                    `تم إنشاء تذكرتك: ${channel}`,
                    'success'
                );
                
                await message.reply({ embeds: [successEmbed] });
            } catch (error) {
                log.error(`خطأ في أمر التذكرة: ${error.message}`);
                message.reply({ embeds: [createEmbed('❌ خطأ', 'حدث خطأ في إنشاء التذكرة', 'danger')] });
            }
        }
    },

    // ====== أوامر الألعاب ======
    rps: {
        name: 'حجرة',
        aliases: ['rps', 'rock', 'ورقة', 'مقص', 'حجرة-ورقة-مقص'],
        description: 'لعبة حجرة ورقة مقص',
        category: 'ألعاب',
        usage: '-حجرة [حجرة/ورقة/مقص]',
        cooldown: 5,
        execute: async (message, args) => {
            try {
                const choices = ['حجرة', 'ورقة', 'مقص'];
                const userChoice = args[0];
                
                if (!choices.includes(userChoice)) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'اختر: حجرة أو ورقة أو مقص', 'danger')] 
                    });
                }
                
                const botChoice = choices[Math.floor(Math.random() * choices.length)];
                let result;
                let color;
                
                if (userChoice === botChoice) {
                    result = 'تعادل! 🤝';
                    color = 'warning';
                } else if (
                    (userChoice === 'حجرة' && botChoice === 'مقص') ||
                    (userChoice === 'ورقة' && botChoice === 'حجرة') ||
                    (userChoice === 'مقص' && botChoice === 'ورقة')
                ) {
                    result = 'فزت! 🎉';
                    color = 'success';
                } else {
                    result = 'خسرت! 😢';
                    color = 'danger';
                }
                
                const embed = createEmbed(
                    '🎮 حجرة ورقة مقص',
                    `**اختيارك:** ${userChoice}\n**اختياري:** ${botChoice}\n\n**النتيجة:** ${result}`,
                    color
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في لعبة الحجرة: ${error.message}`);
            }
        }
    },

    coinflip: {
        name: 'عملة',
        aliases: ['coinflip', 'cf', 'flip', 'رمي-عملة'],
        description: 'رمي عملة',
        category: 'ألعاب',
        usage: '-عملة',
        cooldown: 3,
        execute: async (message) => {
            try {
                const result = Math.random() < 0.5 ? 'صورة' : 'كتابة';
                const emoji = result === 'صورة' ? '🪙' : '💰';
                
                const embed = createEmbed(
                    `${emoji} رمي العملة`,
                    `النتيجة: **${result}**`,
                    'info'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في رمي العملة: ${error.message}`);
            }
        }
    },

    // ====== أوامر الذكاء الاصطناعي ======
    ask: {
        name: 'اسأل',
        aliases: ['ask', 'ai', 'ذكاء', 'سؤال', 'سؤالي'],
        description: 'سؤال الذكاء الاصطناعي',
        category: 'ذكاء اصطناعي',
        usage: '-اسأل [سؤالك]',
        cooldown: 10,
        execute: async (message, args) => {
            try {
                const question = args.join(' ');
                if (!question) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى كتابة سؤال', 'danger')] 
                    });
                }
                
                const responses = [
                    'هذا سؤال ممتاز! الجواب يعتمد على عدة عوامل...',
                    'وفقاً لتحليلي، الإجابة هي نعم بالتأكيد! 👍',
                    'لا أعتقد ذلك، ولكن يمكنك المحاولة مرة أخرى.',
                    'الأمر معقد، يحتاج لمزيد من التفكير. 🤔',
                    'بكل تأكيد! هذا هو الحل الأمثل. ✨',
                    'أنا غير متأكد، جرب تسأل لاحقاً.',
                    'الإجابة تقع بين نعم ولا، يعتمد على الظروف.',
                    'من وجهة نظري، هذا صحيح بنسبة 80%!'
                ];
                
                const response = responses[Math.floor(Math.random() * responses.length)];
                
                const embed = createEmbed(
                    '🤖 سؤال الذكاء الاصطناعي',
                    `**سؤال:** ${question}\n\n**إجابة:** ${response}`,
                    'info'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في أمر السؤال: ${error.message}`);
            }
        }
    },

    // ====== أوامر الإعدادات ======
    setprefix: {
        name: 'بادئة',
        aliases: ['setprefix', 'prefix', 'تغيير-البادئة', 'بادئه'],
        description: 'تغيير بادئة البوت',
        category: 'إعدادات',
        usage: '-بادئة [البادئة الجديدة]',
        cooldown: 10,
        permissions: ['Administrator'],
        execute: async (message, args) => {
            try {
                const newPrefix = args[0];
                if (!newPrefix || newPrefix.length > 5) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى كتابة بادئة صحيحة (5 أحرف كحد أقصى)', 'danger')] 
                    });
                }
                
                db.set(`prefix_${message.guild.id}`, newPrefix);
                
                const embed = createEmbed(
                    '⚙️ تم التغيير',
                    `تم تغيير البادئة إلى: \`${newPrefix}\``,
                    'success'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في تغيير البادئة: ${error.message}`);
            }
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
            try {
                const channel = message.mentions.channels.first();
                if (!channel) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى منشن القناة', 'danger')] 
                    });
                }
                
                db.set(`welcome_${message.guild.id}`, channel.id);
                
                const embed = createEmbed(
                    '👋 تم التفعيل',
                    `تم تفعيل الترحيب في: ${channel}`,
                    'success'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في تفعيل الترحيب: ${error.message}`);
            }
        }
    },

    goodbye: {
        name: 'وداع',
        aliases: ['goodbye', 'setgoodbye', 'تفعيل-الوداع'],
        description: 'تفعيل نظام الوداع',
        category: 'إعدادات',
        usage: '-وداع [#القناة]',
        cooldown: 10,
        permissions: ['Administrator'],
        execute: async (message, args) => {
            try {
                const channel = message.mentions.channels.first();
                if (!channel) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى منشن القناة', 'danger')] 
                    });
                }
                
                db.set(`goodbye_${message.guild.id}`, channel.id);
                
                const embed = createEmbed(
                    '👋 تم التفعيل',
                    `تم تفعيل الوداع في: ${channel}`,
                    'success'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                log.error(`خطأ في تفعيل الوداع: ${error.message}`);
            }
        }
    },

    // ====== أوامر المالك ======
    eval: {
        name: 'تقييم',
        aliases: ['eval', 'e', 'تنفيذ', 'كود'],
        description: 'تنفيذ كود جافاسكريبت (للمالك فقط)',
        category: 'مالك',
        usage: '-تقييم [الكود]',
        cooldown: 0,
        execute: async (message, args) => {
            try {
                if (message.author.id !== config.ownerID) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ ممنوع', 'هذا الأمر للمالك فقط!', 'danger')] 
                    });
                }
                
                const code = args.join(' ');
                if (!code) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ خطأ', 'يرجى كتابة كود', 'danger')] 
                    });
                }
                
                let result = eval(code);
                if (typeof result !== 'string') result = require('util').inspect(result);
                
                const embed = createEmbed(
                    '✅ تم التنفيذ',
                    `\`\`\`js\n${result.slice(0, 4000)}\n\`\`\``,
                    'success'
                );
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                const embed = createEmbed(
                    '❌ خطأ في التنفيذ',
                    `\`\`\`js\n${error.message}\n\`\`\``,
                    'danger'
                );
                await message.reply({ embeds: [embed] });
            }
        }
    },

    restart: {
        name: 'اعادة',
        aliases: ['restart', 'reload', 'ريستارت', 'تحديث'],
        description: 'إعادة تشغيل البوت (للمالك فقط)',
        category: 'مالك',
        usage: '-اعادة',
        cooldown: 0,
        execute: async (message) => {
            try {
                if (message.author.id !== config.ownerID) {
                    return message.reply({ 
                        embeds: [createEmbed('❌ ممنوع', 'هذا الأمر للمالك فقط!', 'danger')] 
                    });
                }
                
                await message.reply({ 
                    embeds: [createEmbed('🔄 إعادة التشغيل', 'جاري إعادة تشغيل البوت...', 'warning')] 
                });
                
                process.exit(0);
            } catch (error) {
                log.error(`خطأ في إعادة التشغيل: ${error.message}`);
            }
        }
    }
};

// ====== معالجة الأحداث ======

// عند تشغيل البوت
client.once('ready', async () => {
    try {
        log.fancy('═══════════════════════════════════════════════════');
        log.success(`البوت ${client.user.tag} يعمل بنجاح!`);
        log.info(`عدد السيرفرات: ${client.guilds.cache.size}`);
        log.info(`عدد المستخدمين: ${client.users.cache.size}`);
        log.info(`عدد الأوامر: ${Object.keys(commands).length}`);
        log.fancy('═══════════════════════════════════════════════════');
        
        // تغيير الحالة كل 10 ثواني
        const updateStatus = () => {
            const statuses = [
                { name: `-مساعدة | ${client.guilds.cache.size} سيرفر`, type: 0 },
                { name: `${client.users.cache.size.toLocaleString()} مستخدم`, type: 3 },
                { name: 'النظام العربي المتكامل', type: 2 },
                { name: 'discord.gg/arabic', type: 0 }
            ];
            
            let i = 0;
            setInterval(() => {
                client.user.setActivity(statuses[i]);
                i = (i + 1) % statuses.length;
            }, 10000);
        };
        
        updateStatus();
        
        // إنشاء مجلد البيانات إذا لم يكن موجوداً
        fs.ensureDirSync('./data');
        
    } catch (error) {
        log.error(`خطأ في التشغيل: ${error.message}`);
    }
});

// عند استلام رسالة
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.guild) return;
        
        // نظام المستويات (XP)
        const xpAmount = Math.floor(Math.random() * 10) + 5;
        const currentXP = db.get(`xp_${message.author.id}`) || 0;
        const currentLevel = db.get(`level_${message.author.id}`) || 1;
        
        db.add(`xp_${message.author.id}`, xpAmount);
        
        // التحقق من الت leveling up
        const xpNeeded = currentLevel * 100;
        if (currentXP >= xpNeeded) {
            db.set(`xp_${message.author.id}`, 0);
            db.add(`level_${message.author.id}`, 1);
            
            const levelUpEmbed = createEmbed(
                '🎉 مستوى جديد!',
                `مبروك ${message.author}! وصلت للمستوى **${currentLevel + 1}**`,
                'gold'
            );
            
            message.channel.send({ embeds: [levelUpEmbed] }).catch(() => {});
        }
        
        // معالجة الأوامر
        const guildPrefix = db.get(`prefix_${message.guild.id}`) || config.prefix;
        
        if (!message.content.startsWith(guildPrefix)) return;
        
        const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
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
                    embeds: [createEmbed('🛡️ صلاحيات مفقودة', `تحتاج إلى: ${missingPerms.join(', ')}`, 'danger')] 
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
                    embeds: [createEmbed('⏳ انتظر', `يرجى الانتظار ${(remaining / 1000).toFixed(1)} ثانية`, 'warning')] 
                });
            }
        }
        
        client.cooldowns.set(cooldownKey, Date.now());
        setTimeout(() => client.cooldowns.delete(cooldownKey), cooldownTime * 1000);
        
        // تنفيذ الأمر
        log.cmd(`${message.author.tag} استخدم أمر: ${command.name}`);
        await command.execute(message, args);
        
    } catch (error) {
        log.error(`خطأ في معالجة الرسالة: ${error.message}`);
    }
});

// عند الضغط على زر
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;
        
        const { customId, user, message, member, guild } = interaction;
        
        // نظام التذاكر
        if (customId.startsWith('close_ticket_')) {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return interaction.reply({ content: 'ليس لديك صلاحية!', ephemeral: true });
            }
            
            await interaction.reply({ content: '🔒 جاري إغلاق التذكرة في 5 ثواني...', ephemeral: false });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
        
        else if (customId.startsWith('claim_ticket_')) {
            const parts = customId.split('_');
            const ticketOwnerId = parts[3];
            
            if (user.id === ticketOwnerId) {
                return interaction.reply({ content: 'لا يمكنك استلام تذكرتك بنفسك!', ephemeral: true });
            }
            
            await interaction.reply({ content: `✋ تم استلام التذكرة بواسطة ${user}`, ephemeral: false });
        }
        
        // نظام المساعدة
        else if (customId === 'help_general') {
            const embed = createEmbed('⭐ الأوامر العامة', '`-مساعدة` `-بينغ` `-معلومات` `-سيرفر`', 'primary');
            await interaction.update({ embeds: [embed] });
        }
        else if (customId === 'help_admin') {
            const embed = createEmbed('🛡️ أوامر الإدارة', '`-حظر` `-طرد` `-اسكات` `-فك-اسكات` `-مسح` `-قفل` `-فتح` `-بطيء`', 'danger');
            await interaction.update({ embeds: [embed] });
        }
        else if (customId === 'help_fun') {
            const embed = createEmbed('🔥 الأوامر الترفيهية', '`-قل` `-امبد` `-تصويت` `-حجرة` `-عملة`', 'success');
            await interaction.update({ embeds: [embed] });
        }
        else if (customId === 'help_economy') {
            const embed = createEmbed('💰 أوامر الاقتصاد', '`-يومية` `-رصيد` `-ايداع` `-سحب`', 'secondary');
            await interaction.update({ embeds: [embed] });
        }
        
        // نظام الحظر
        else if (customId.startsWith('confirm_ban_')) {
            const parts = customId.split('_');
            const targetId = parts[2];
            const moderatorId = parts[3];
            
            if (user.id !== moderatorId) {
                return interaction.reply({ content: 'ليس لديك صلاحية لهذا الإجراء!', ephemeral: true });
            }
            
            const data = client.tempData.get(`ban_${message.id}`);
            if (!data) {
                return interaction.reply({ content: 'انتهت صلاحية هذا الإجراء!', ephemeral: true });
            }
            
            const target = await guild.members.fetch(targetId).catch(() => null);
            if (target) {
                await target.ban({ reason: data.reason });
                const embed = createEmbed('🔨 تم الحظر', `${target.user.tag} تم حظره بنجاح`, 'success');
                await interaction.update({ embeds: [embed], components: [] });
                client.tempData.delete(`ban_${message.id}`);
            } else {
                await interaction.reply({ content: 'لم يتم العثور على العضو!', ephemeral: true });
            }
        }
        else if (customId.startsWith('cancel_ban_')) {
            const parts = customId.split('_');
            const moderatorId = parts[3];
            
            if (user.id !== moderatorId) {
                return interaction.reply({ content: 'ليس لديك صلاحية لهذا الإجراء!', ephemeral: true });
            }
            
            const embed = createEmbed('❌ تم الإلغاء', 'تم إلغاء عملية الحظر', 'secondary');
            await interaction.update({ embeds: [embed], components: [] });
            client.tempData.delete(`ban_${message.id}`);
        }
        
        // نظام الموسيقى
        else if (customId === 'music_pause') {
            await interaction.reply({ content: '⏸️ تم الإيقاف المؤقت', ephemeral: true });
        }
        else if (customId === 'music_skip') {
            await interaction.reply({ content: '⏭️ تم التخطي', ephemeral: true });
        }
        else if (customId === 'music_stop') {
            await interaction.reply({ content: '⏹️ تم الإيقاف', ephemeral: true });
        }
        
    } catch (error) {
        log.error(`خطأ في معالجة الزر: ${error.message}`);
    }
});

// عند انضمام عضو جديد
client.on('guildMemberAdd', async (member) => {
    try {
        const welcomeChannelId = db.get(`welcome_${member.guild.id}`);
        if (!welcomeChannelId) return;
        
        const channel = member.guild.channels.cache.get(welcomeChannelId);
        if (!channel) return;
        
        const embed = createEmbed(
            '👋 أهلاً وسهلاً!',
            `مرحباً ${member} في ${member.guild.name}!\n**العضو رقم:** ${member.guild.memberCount.toLocaleString()}\n\nنورتنا! 🎉`,
            'success',
            member.user.displayAvatarURL()
        );
        
        await channel.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
    } catch (error) {
        log.error(`خطأ في الترحيب: ${error.message}`);
    }
});

// عند مغادرة عضو
client.on('guildMemberRemove', async (member) => {
    try {
        const goodbyeChannelId = db.get(`goodbye_${member.guild.id}`);
        if (!goodbyeChannelId) return;
        
        const channel = member.guild.channels.cache.get(goodbyeChannelId);
        if (!channel) return;
        
        const embed = createEmbed(
            '👋 إلى اللقاء!',
            `${member.user.tag} غادر السيرفر\n**تبقت:** ${member.guild.memberCount.toLocaleString()} عضو`,
            'danger',
            member.user.displayAvatarURL()
        );
        
        await channel.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
        log.error(`خطأ في الوداع: ${error.message}`);
    }
});

// معالجة الأخطاء العامة
client.on('error', (error) => {
    log.error(`خطأ في العميل: ${error.message}`);
});

client.on('warn', (warning) => {
    log.warn(`تحذير: ${warning}`);
});

process.on('unhandledRejection', (error) => {
    log.error(`Unhandled Rejection: ${error.message}`);
});

process.on('uncaughtException', (error) => {
    log.error(`Uncaught Exception: ${error.message}`);
});

// ====== Keep Alive للـ Render ======
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('🤖 البوت العربي يعمل بنجاح! | Arabic Bot is Online!');
});

server.listen(3000, () => {
    log.info('Keep Alive Server يعمل على المنفذ 3000');
});

// تسجيل الدخول
client.login(process.env.TOKEN).catch(error => {
    log.error(`فشل تسجيل الدخول: ${error.message}`);
    process.exit(1);
});
