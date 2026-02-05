// ═══════════════════════════════════════════════════════════════
// 🤖 النظام العربي المتكامل v15.1 - النسخة المستقرة 100%
// ملك البقز والأخطاء - كنق البرمجة
// ═══════════════════════════════════════════════════════════════

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs-extra');
const http = require('http');
const ms = require('ms');

// ═══════════════════════════════════════════════════════════════
// نظام اللوجز الاحترافي
// ═══════════════════════════════════════════════════════════════

const logger = {
    logs: [],
    log: function(level, emoji, msg, data = '') {
        const time = new Date().toLocaleTimeString('ar-SA');
        const entry = `[${time}] ${emoji} [${level}] ${msg} ${data ? JSON.stringify(data) : ''}`;
        console.log(entry);
        this.logs.push(entry);
        
        // حفظ في ملف
        try {
            fs.appendFileSync('./bot.log', entry + '\n');
        } catch(e) {}
    },
    fatal: (m, d) => logger.log('FATAL', '💀', m, d),
    error: (m, d) => logger.log('ERROR', '❌', m, d),
    warn:  (m, d) => logger.log('WARN', '⚠️', m, d),
    info:  (m, d) => logger.log('INFO', 'ℹ️', m, d),
    success: (m, d) => logger.log('SUCCESS', '✅', m, d),
    debug: (m, d) => logger.log('DEBUG', '🔍', m, d),
    fancy: (m) => console.log(`\x1b[35m${m}\x1b[0m`)
};

logger.fancy('═══════════════════════════════════════════════════');
logger.fancy('👑 النظام العربي المتكامل v15.1 - النسخة المستقرة');
logger.fancy('═══════════════════════════════════════════════════');

// ═══════════════════════════════════════════════════════════════
// التحقق من المتغيرات البيئية
// ═══════════════════════════════════════════════════════════════

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const PORT = process.env.PORT || 3000;

logger.info('بدء التشغيل...');
logger.info(`Node.js: ${process.version}`);
logger.info(`المنفذ: ${PORT}`);

if (!TOKEN) {
    logger.fatal('TOKEN غير موجود!');
    process.exit(1);
}

if (TOKEN.length < 50) {
    logger.warn('TOKEN يبدو قصير!');
}

logger.success('TOKEN موجود ✅');
logger.info(`OWNER_ID: ${OWNER_ID || 'غير محدد'}`);

// ═══════════════════════════════════════════════════════════════
// نظام قاعدة البيانات
// ═══════════════════════════════════════════════════════════════

class Database {
    constructor() {
        this.data = {};
        this.file = './data/db.json';
        try {
            fs.ensureDirSync('./data');
            if (fs.existsSync(this.file)) {
                this.data = fs.readJsonSync(this.file);
            }
        } catch(e) {
            logger.error('فشل تحميل DB', e.message);
        }
    }
    
    save() {
        try {
            fs.writeJsonSync(this.file, this.data);
        } catch(e) {}
    }
    
    get(k) { return this.data[k] ?? null; }
    set(k, v) { this.data[k] = v; this.save(); return v; }
    add(k, n) { return this.set(k, (this.get(k) || 0) + n); }
}

const db = new Database();
logger.success('قاعدة البيانات جاهزة ✅');

// ═══════════════════════════════════════════════════════════════
// Keep Alive Server - يستخدم PORT الصحيح
// ═══════════════════════════════════════════════════════════════

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <title>🤖 البوت العربي</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial; background: #36393f; color: white; padding: 40px; }
                .status { padding: 20px; border-radius: 10px; margin: 20px 0; }
                .online { background: #3ba55d; }
                .offline { background: #ed4245; }
                .info { background: #5865f2; }
            </style>
        </head>
        <body>
            <h1>🤖 النظام العربي المتكامل</h1>
            <div class="status ${client?.readyAt ? 'online' : 'offline'}">
                <h2>${client?.readyAt ? '🟢 البوت يعمل' : '🟡 جاري الاتصال...'}</h2>
                <p>${client?.user?.tag || 'غير متصل'}</p>
            </div>
            <div class="info">
                <p>📊 السيرفرات: ${client?.guilds?.cache?.size || 0}</p>
                <p>👥 المستخدمين: ${client?.users?.cache?.size || 0}</p>
                <p>⏱️ مدة التشغيل: ${Math.floor((Date.now() - startTime) / 1000)} ثانية</p>
            </div>
            <hr>
            <p>🕐 آخر تحديث: ${new Date().toLocaleString('ar-SA')}</p>
        </body>
        </html>
    `);
});

const startTime = Date.now();

server.listen(PORT, () => {
    logger.success(`🌐 Keep Alive Server يعمل على المنفذ ${PORT}`);
});

// ═══════════════════════════════════════════════════════════════
// تهيئة البوت
// ═══════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction],
    failIfNotExists: false,
    allowedMentions: { parse: ['users', 'roles'], repliedUser: true }
});

// ═══════════════════════════════════════════════════════════════
// الإعدادات
// ═══════════════════════════════════════════════════════════════

const config = {
    prefix: '-',
    ownerID: OWNER_ID || '0',
    color: {
        primary: 0x5865F2,
        success: 0x57F287,
        danger: 0xED4245,
        warning: 0xFEE75C,
        info: 0xEB459E
    }
};

// ═══════════════════════════════════════════════════════════════
// دوال مساعدة
// ═══════════════════════════════════════════════════════════════

function createEmbed(title, desc, color = 'primary') {
    try {
        return new EmbedBuilder()
            .setColor(config.color[color] || config.color.primary)
            .setTitle(title?.substring(0, 256) || 'بدون عنوان')
            .setDescription(desc?.substring(0, 4096) || '')
            .setTimestamp()
            .setFooter({ 
                text: `النظام العربي | ${new Date().toLocaleDateString('ar-SA')}`,
                iconURL: client.user?.displayAvatarURL() || undefined
            });
    } catch(e) {
        return new EmbedBuilder().setDescription('⚠️ خطأ').setColor(config.color.danger);
    }
}

// ═══════════════════════════════════════════════════════════════
// الأوامر
// ═══════════════════════════════════════════════════════════════

const commands = {
    help: {
        name: 'مساعدة',
        aliases: ['help', 'h', 'commands', 'اوامر'],
        category: 'عام',
        execute: async (msg, args) => {
            const embed = createEmbed(
                '🤖 قائمة الأوامر',
                '**الأوامر المتاحة:**\n\n' +
                '⭐ **عام:** `-مساعدة` `-بينغ` `-معلومات` `-سيرفر`\n' +
                '🛡️ **إدارة:** `-حظر` `-طرد` `-اسكات` `-مسح` `-قفل`\n' +
                '💰 **اقتصاد:** `-يومية` `-رصيد` `-ايداع` `-سحب`\n' +
                '🎮 **ترفيه:** `-قل` `-حجرة` `-تصويت`',
                'primary'
            );
            await msg.reply({ embeds: [embed] });
        }
    },

    ping: {
        name: 'بينغ',
        aliases: ['ping', 'pong', 'سرعة'],
        category: 'عام',
        execute: async (msg) => {
            const sent = await msg.reply({ embeds: [createEmbed('⏳ جاري القياس...', 'انتظر', 'warning')] });
            const latency = sent.createdTimestamp - msg.createdTimestamp;
            
            await sent.edit({ 
                embeds: [createEmbed(
                    '🏓 بينغ!',
                    `**البوت:** ${latency}ms\n**API:** ${Math.round(client.ws.ping)}ms`,
                    latency < 100 ? 'success' : 'warning'
                )]
            });
        }
    },

    userinfo: {
        name: 'معلومات',
        aliases: ['userinfo', 'user', 'عني', 'عضو'],
        category: 'عام',
        execute: async (msg) => {
            const target = msg.mentions.members.first() || msg.member;
            const embed = createEmbed(
                `👤 ${target.user.username}`,
                `**الآيدي:** \`${target.id}\`\n**تاريخ الانضمام:** <t:${Math.floor(target.joinedTimestamp / 1000)}:R>\n**الرتب:** ${target.roles.cache.size - 1}`,
                'info',
                target.user.displayAvatarURL()
            );
            await msg.reply({ embeds: [embed] });
        }
    },

    serverinfo: {
        name: 'سيرفر',
        aliases: ['serverinfo', 'server', 'السيرفر'],
        category: 'عام',
        execute: async (msg) => {
            const g = msg.guild;
            const embed = createEmbed(
                `📢 ${g.name}`,
                `**الأعضاء:** ${g.memberCount}\n**القنوات:** ${g.channels.cache.size}\n**التاريخ:** <t:${Math.floor(g.createdTimestamp / 1000)}:R>`,
                'info',
                g.iconURL()
            );
            await msg.reply({ embeds: [embed] });
        }
    },

    // إدارة
    ban: {
        name: 'حظر',
        aliases: ['ban', 'تبنيد', 'بان'],
        category: 'إدارة',
        permissions: ['BanMembers'],
        execute: async (msg, args) => {
            const target = msg.mentions.members.first();
            if (!target) return msg.reply({ embeds: [createEmbed('❌ خطأ', 'منشن العضو', 'danger')] });
            
            const reason = args.slice(1).join(' ') || 'غير محدد';
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ban_${target.id}`).setLabel('تأكيد').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`cancel_${target.id}`).setLabel('إلغاء').setStyle(ButtonStyle.Secondary)
            );
            
            const m = await msg.reply({ 
                embeds: [createEmbed('⚠️ تأكيد الحظر', `حظر ${target}؟\nالسبب: ${reason}`, 'warning')],
                components: [row]
            });
            
            db.set(`temp_${m.id}`, { action: 'ban', target: target.id, reason, mod: msg.author.id });
        }
    },

    kick: {
        name: 'طرد',
        aliases: ['kick', 'كيك', 'اطرد'],
        category: 'إدارة',
        permissions: ['KickMembers'],
        execute: async (msg, args) => {
            const target = msg.mentions.members.first();
            if (!target) return msg.reply({ embeds: [createEmbed('❌ خطأ', 'منشن العضو', 'danger')] });
            
            await target.kick(args.slice(1).join(' ') || 'غير محدد');
            await msg.reply({ embeds: [createEmbed('👢 تم الطرد', `${target.user.tag} تم طرده`, 'success')] });
        }
    },

    clear: {
        name: 'مسح',
        aliases: ['clear', 'purge', 'امسح', 'تنظيف'],
        category: 'إدارة',
        permissions: ['ManageMessages'],
        execute: async (msg, args) => {
            const amount = parseInt(args[0]);
            if (!amount || amount < 1 || amount > 100) {
                return msg.reply({ embeds: [createEmbed('❌ خطأ', 'رقم من 1-100', 'danger')] });
            }
            
            const deleted = await msg.channel.bulkDelete(amount + 1, true);
            const m = await msg.channel.send({ embeds: [createEmbed('🧹 تم المسح', `تم مسح ${deleted.size - 1} رسالة`, 'success')] });
            setTimeout(() => m.delete().catch(() => {}), 3000);
        }
    },

    lock: {
        name: 'قفل',
        aliases: ['lock', 'اقفل'],
        category: 'إدارة',
        permissions: ['ManageChannels'],
        execute: async (msg) => {
            await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: false });
            await msg.reply({ embeds: [createEmbed('🔒 تم القفل', 'تم قفل القناة', 'danger')] });
        }
    },

    unlock: {
        name: 'فتح',
        aliases: ['unlock', 'افتح'],
        category: 'إدارة',
        permissions: ['ManageChannels'],
        execute: async (msg) => {
            await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: true });
            await msg.reply({ embeds: [createEmbed('🔓 تم الفتح', 'تم فتح القناة', 'success')] });
        }
    },

    // اقتصاد
    daily: {
        name: 'يومية',
        aliases: ['daily', 'هدية', 'هديه'],
        category: 'اقتصاد',
        execute: async (msg) => {
            const last = db.get(`daily_${msg.author.id}`);
            const now = Date.now();
            
            if (last && now - last < 86400000) {
                const remaining = 86400000 - (now - last);
                const hours = Math.floor(remaining / 3600000);
                return msg.reply({ embeds: [createEmbed('⏳ انتظر', `بعد ${hours} ساعة`, 'warning')] });
            }
            
            const amount = Math.floor(Math.random() * 1000) + 500;
            db.add(`money_${msg.author.id}`, amount);
            db.set(`daily_${msg.author.id}`, now);
            
            await msg.reply({ 
                embeds: [createEmbed('🎁 مكافأة يومية', `حصلت على ${amount} عملة! رصيدك: ${db.get(`money_${msg.author.id}`)}`, 'success')] 
            });
        }
    },

    balance: {
        name: 'رصيد',
        aliases: ['balance', 'bal', 'فلوس', 'كاش'],
        category: 'اقتصاد',
        execute: async (msg) => {
            const target = msg.mentions.users.first() || msg.author;
            const bal = db.get(`money_${target.id}`) || 0;
            const bank = db.get(`bank_${target.id}`) || 0;
            
            await msg.reply({ 
                embeds: [createEmbed('💰 الرصيد', `**${target.username}**\n💵 نقدي: ${bal}\n🏦 بنك: ${bank}\n💎 الكلي: ${bal + bank}`, 'info', target.displayAvatarURL())] 
            });
        }
    },

    // ترفيه
    say: {
        name: 'قل',
        aliases: ['say', 'echo', 'اكتب'],
        category: 'ترفيه',
        execute: async (msg, args) => {
            const text = args.join(' ');
            if (!text) return;
            await msg.delete().catch(() => {});
            await msg.channel.send(text);
        }
    },

    rps: {
        name: 'حجرة',
        aliases: ['rps', 'حجرة-ورقة-مقص'],
        category: 'ترفيه',
        execute: async (msg, args) => {
            const choices = ['حجرة', 'ورقة', 'مقص'];
            const userChoice = args[0];
            
            if (!choices.includes(userChoice)) {
                return msg.reply({ embeds: [createEmbed('❌ خطأ', 'اختر: حجرة، ورقة، أو مقص', 'danger')] });
            }
            
            const botChoice = choices[Math.floor(Math.random() * choices.length)];
            let result = 'تعادل! 🤝';
            let color = 'warning';
            
            if (
                (userChoice === 'حجرة' && botChoice === 'مقص') ||
                (userChoice === 'ورقة' && botChoice === 'حجرة') ||
                (userChoice === 'مقص' && botChoice === 'ورقة')
            ) {
                result = 'فزت! 🎉';
                color = 'success';
            } else if (userChoice !== botChoice) {
                result = 'خسرت! 😢';
                color = 'danger';
            }
            
            await msg.reply({ 
                embeds: [createEmbed('🎮 حجرة ورقة مقص', `أنت: ${userChoice}\nأنا: ${botChoice}\n\n${result}`, color)] 
            });
        }
    },

    // مالك
    eval: {
        name: 'تقييم',
        aliases: ['eval', 'e', 'كود'],
        category: 'مالك',
        execute: async (msg, args) => {
            if (msg.author.id !== config.ownerID) {
                return msg.reply({ embeds: [createEmbed('❌ ممنوع', 'للمالك فقط!', 'danger')] });
            }
            
            try {
                let result = eval(args.join(' '));
                if (typeof result !== 'string') result = require('util').inspect(result, { depth: 0 });
                await msg.reply({ embeds: [createEmbed('✅ نتيجة', `\`\`\`js\n${result.slice(0, 4000)}\n\`\`\``, 'success')] });
            } catch (err) {
                await msg.reply({ embeds: [createEmbed('❌ خطأ', err.message, 'danger')] });
            }
        }
    },

    restart: {
        name: 'اعادة',
        aliases: ['restart', 'ريستارت', 'تحديث'],
        category: 'مالك',
        execute: async (msg) => {
            if (msg.author.id !== config.ownerID) return;
            await msg.reply({ embeds: [createEmbed('🔄 إعادة تشغيل', 'جاري...', 'warning')] });
            process.exit(0);
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// الأحداث
// ═══════════════════════════════════════════════════════════════

client.once('ready', () => {
    logger.fancy('═══════════════════════════════════════════════════');
    logger.success(`البوت ${client.user.tag} متصل!`);
    logger.info(`السيرفرات: ${client.guilds.cache.size}`);
    logger.info(`المستخدمين: ${client.users.cache.size}`);
    logger.fancy('═══════════════════════════════════════════════════');
    
    client.user.setActivity('-مساعدة | النظام العربي', { type: 0 });
});

client.on('messageCreate', async (msg) => {
    try {
        if (msg.author.bot || !msg.guild) return;
        if (!msg.content.startsWith(config.prefix)) return;
        
        const args = msg.content.slice(config.prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        
        const cmd = Object.values(commands).find(c => c.name === cmdName || c.aliases.includes(cmdName));
        if (!cmd) return;
        
        // صلاحيات
        if (cmd.permissions) {
            const missing = cmd.permissions.filter(p => !msg.member.permissions.has(PermissionsBitField.Flags[p]));
            if (missing.length > 0) {
                return msg.reply({ embeds: [createEmbed('🛡️ صلاحيات', `تحتاج: ${missing.join(', ')}`, 'danger')] });
            }
        }
        
        logger.info(`أمر: ${cmd.name} من ${msg.author.tag}`);
        await cmd.execute(msg, args);
        
    } catch (err) {
        logger.error('خطأ في أمر', err.message);
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;
        
        const data = db.get(`temp_${interaction.message.id}`);
        if (!data) return;
        
        if (interaction.customId.startsWith('ban_')) {
            if (interaction.user.id !== data.mod) {
                return interaction.reply({ content: 'ليس لديك صلاحية!', ephemeral: true });
            }
            
            const member = await interaction.guild.members.fetch(data.target);
            await member.ban({ reason: data.reason });
            await interaction.update({ 
                embeds: [createEmbed('🔨 تم الحظر', `${member.user.tag} تم حظره`, 'success')],
                components: []
            });
            db.set(`temp_${interaction.message.id}`, null);
        }
        
        if (interaction.customId.startsWith('cancel_')) {
            await interaction.update({ 
                embeds: [createEmbed('❌ تم الإلغاء', 'تم إلغاء العملية', 'secondary')],
                components: []
            });
            db.set(`temp_${interaction.message.id}`, null);
        }
        
    } catch (err) {
        logger.error('خطأ في interaction', err.message);
    }
});

// أخطاء
client.on('error', (err) => logger.error('Discord Error', err.message));
process.on('unhandledRejection', (err) => logger.error('Unhandled Rejection', err.message));
process.on('uncaughtException', (err) => logger.fatal('Uncaught Exception', err.message));

// ═══════════════════════════════════════════════════════════════
// تسجيل الدخول
// ═══════════════════════════════════════════════════════════════

logger.info('🔄 جاري الاتصال...');

client.login(TOKEN).then(() => {
    logger.success('✅ تم تسجيل الدخول!');
}).catch((err) => {
    logger.fatal('❌ فشل الدخول!', err.message);
    
    if (err.message.includes('token')) {
        logger.error('🔴 التوكن غلط!');
    } else if (err.message.includes('intents')) {
        logger.error('🔴 فعل الـ 3 Intents في Discord Developer Portal');
    }
});
