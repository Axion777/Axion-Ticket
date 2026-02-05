// ═══════════════════════════════════════════════════════════════
// 🤖 النظام العربي المتكامل - النسخة الملكية v15.0
// ملك البقز والأخطاء - كنق البرمجة
// ═══════════════════════════════════════════════════════════════

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const ms = require('ms');
const http = require('http');

// ═══════════════════════════════════════════════════════════════
// نظام اللوجز الملكي - يعمل حتى لو كل شي فشل
// ═══════════════════════════════════════════════════════════════

const LOG_LEVELS = {
    FATAL: { color: '\x1b[35m', emoji: '💀', level: 0 },
    ERROR: { color: '\x1b[31m', emoji: '❌', level: 1 },
    WARN:  { color: '\x1b[33m', emoji: '⚠️', level: 2 },
    INFO:  { color: '\x1b[34m', emoji: 'ℹ️', level: 3 },
    SUCCESS: { color: '\x1b[32m', emoji: '✅', level: 4 },
    DEBUG: { color: '\x1b[36m', emoji: '🔍', level: 5 },
    FANCY: { color: '\x1b[35m', emoji: '👑', level: 6 }
};

class RoyalLogger {
    constructor() {
        this.logs = [];
        this.startTime = Date.now();
        this.initLogFile();
    }

    initLogFile() {
        try {
            fs.ensureDirSync('./logs');
            this.logFile = `./logs/bot_${new Date().toISOString().split('T')[0]}.log`;
        } catch (e) {
            console.error('فشل إنشاء مجلد اللوجز:', e.message);
        }
    }

    log(level, message, data = null) {
        const config = LOG_LEVELS[level] || LOG_LEVELS.INFO;
        const timestamp = new Date().toLocaleString('ar-SA');
        const logEntry = {
            time: timestamp,
            level: level,
            message: message,
            data: data,
            uptime: Date.now() - this.startTime
        };

        this.logs.push(logEntry);

        // طباعة ملونة في الكونسول
        const output = `${config.color}[${config.emoji} ${level}] \x1b[0m \x1b[90m[${timestamp}]\x1b[0m ${message}`;
        console.log(output);

        // حفظ في الملف
        try {
            const fileOutput = `[${timestamp}] [${level}] ${message}${data ? ' | DATA: ' + JSON.stringify(data) : ''}\n`;
            fs.appendFileSync(this.logFile, fileOutput);
        } catch (e) {
            // نتجاهل أخطاء الكتابة في الملف
        }

        return logEntry;
    }

    fatal(msg, data) { return this.log('FATAL', msg, data); }
    error(msg, data) { return this.log('ERROR', msg, data); }
    warn(msg, data)  { return this.log('WARN', msg, data); }
    info(msg, data)  { return this.log('INFO', msg, data); }
    success(msg, data) { return this.log('SUCCESS', msg, data); }
    debug(msg, data) { return this.log('DEBUG', msg, data); }
    fancy(msg, data) { return this.log('FANCY', msg, data); }

    getDiagnostics() {
        return {
            totalLogs: this.logs.length,
            errors: this.logs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length,
            warnings: this.logs.filter(l => l.level === 'WARN').length,
            uptime: Date.now() - this.startTime,
            last10Logs: this.logs.slice(-10)
        };
    }
}

const logger = new RoyalLogger();

// ═══════════════════════════════════════════════════════════════
// نظام الأمان - التحقق من المتغيرات قبل ما يفشل أي شي
// ═══════════════════════════════════════════════════════════════

logger.fancy('═══════════════════════════════════════════════════');
logger.fancy('🤖 النظام العربي المتكامل - النسخة الملكية v15.0');
logger.fancy('👑 ملك البقز والأخطاء');
logger.fancy('═══════════════════════════════════════════════════');

// التحقق من Node.js version
const nodeVersion = process.version;
logger.info(`Node.js version: ${nodeVersion}`);

if (parseInt(nodeVersion.slice(1)) < 18) {
    logger.fatal('Node.js يجب أن يكون 18 أو أعلى!');
    process.exit(1);
}

// التحقق من التوكن
const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;

logger.info('التحقق من المتغيرات البيئية...');

if (!TOKEN) {
    logger.fatal('TOKEN غير موجود! تأكد من إضافته في Environment Variables');
    logger.info('رابط المساعدة: https://render.com/docs/environment-variables');
    
    // نشتغل بـ Keep Alive بس عشان ما يطفي السيرفر
    startKeepAliveOnly();
} else {
    logger.success('TOKEN موجود ✅');
    logger.debug(`TOKEN length: ${TOKEN.length}`);
    logger.debug(`TOKEN starts with: ${TOKEN.substring(0, 10)}...`);
    
    if (TOKEN.length < 50) {
        logger.warn('TOKEN يبدو قصير! تأكد أنه كامل');
    }
}

if (!OWNER_ID) {
    logger.warn('OWNER_ID غير موجود! بعض الأوامر لن تعمل');
} else {
    logger.success(`OWNER_ID: ${OWNER_ID} ✅`);
}

// ═══════════════════════════════════════════════════════════════
// نظام قاعدة البيانات - يعمل حتى لو SQLite فشل
// ═══════════════════════════════════════════════════════════════

class SafeDatabase {
    constructor() {
        this.data = {};
        this.memoryMode = false;
        this.init();
    }

    init() {
        try {
            // نحاول نسوي JSON file
            this.filePath = './data/database.json';
            fs.ensureDirSync('./data');
            
            if (fs.existsSync(this.filePath)) {
                this.data = fs.readJsonSync(this.filePath);
                logger.success('قاعدة البيانات JSON محملة ✅');
            } else {
                this.save();
                logger.success('قاعدة بيانات جديدة تم إنشاؤها ✅');
            }
        } catch (error) {
            logger.error('فشل تحميل قاعدة البيانات، الانتقال لوضع الذاكرة', error.message);
            this.memoryMode = true;
            this.data = {};
        }
    }

    save() {
        if (this.memoryMode) return;
        try {
            fs.writeJsonSync(this.filePath, this.data, { spaces: 2 });
        } catch (error) {
            logger.error('فشل حفظ البيانات', error.message);
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

    add(key, amount) {
        const current = this.get(key) || 0;
        return this.set(key, current + amount);
    }

    subtract(key, amount) {
        return this.add(key, -amount);
    }
}

const db = new SafeDatabase();

// ═══════════════════════════════════════════════════════════════
// Keep Alive Server - يشتغل دائماً حتى لو البوت فشل
// ═══════════════════════════════════════════════════════════════

function startKeepAliveOnly() {
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <h1>🤖 البوت في وضع الطوارئ</h1>
            <p>التوكن غير موجود! أضف TOKEN في Environment Variables</p>
            <p>الوقت: ${new Date().toLocaleString('ar-SA')}</p>
        `);
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        logger.success(`Keep Alive يعمل على المنفذ ${PORT} (وضع الطوارئ)`);
    });
}

const keepAliveServer = http.createServer((req, res) => {
    const diagnostics = logger.getDiagnostics();
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
        status: client.readyAt ? 'online' : 'connecting',
        bot: client.user ? {
            tag: client.user.tag,
            id: client.user.id,
            guilds: client.guilds.cache.size,
            users: client.users.cache.size
        } : null,
        uptime: Date.now() - logger.startTime,
        diagnostics: diagnostics,
        timestamp: new Date().toISOString()
    }, null, 2));
});

// ═══════════════════════════════════════════════════════════════
// تهيئة البوت - مع معالجة أخطاء شاملة
// ═══════════════════════════════════════════════════════════════

let client;

try {
    client = new Client({
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
        allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
        presence: {
            status: 'online',
            activities: [{ name: 'جاري التشغيل...', type: 0 }]
        }
    });

    logger.success('Client تم إنشاؤه بنجاح ✅');
} catch (error) {
    logger.fatal('فشل إنشاء Client!', error.message);
    startKeepAliveOnly();
    return;
}

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
        info: 0xEB459E,
        gold: 0xFFD700
    }
};

// ═══════════════════════════════════════════════════════════════
// دوال مساعدة آمنة
// ═══════════════════════════════════════════════════════════════

function safeCreateEmbed(title, description, color = 'primary') {
    try {
        return new EmbedBuilder()
            .setColor(config.color[color] || config.color.primary)
            .setTitle(title?.substring(0, 256) || 'بدون عنوان')
            .setDescription(description?.substring(0, 4096) || 'بدون وصف')
            .setTimestamp()
            .setFooter({ 
                text: `النظام العربي | ${new Date().toLocaleDateString('ar-SA')}`, 
                iconURL: client.user?.displayAvatarURL() || undefined
            });
    } catch (error) {
        logger.error('خطأ في إنشاء Embed', error.message);
        return new EmbedBuilder().setDescription('⚠️ خطأ في العرض').setColor(config.color.danger);
    }
}

// ═══════════════════════════════════════════════════════════════
// نظام الأوامر المُحسّن
// ═══════════════════════════════════════════════════════════════

const commands = {
    help: {
        name: 'مساعدة',
        aliases: ['help', 'h', 'commands'],
        description: 'عرض قائمة الأوامر',
        category: 'عام',
        cooldown: 3,
        execute: async (message, args) => {
            logger.info(`أمر مساعدة من ${message.author.tag}`);
            
            const embed = safeCreateEmbed(
                '🤖 قائمة الأوامر',
                '**الأوامر المتاحة:**\n\n⭐ **عام:** `-مساعدة` `-بينغ` `-معلومات`\n🛡️ **إدارة:** `-حظر` `-طرد` `-مسح`\n💰 **اقتصاد:** `-يومية` `-رصيد`',
                'primary'
            );
            
            await message.reply({ embeds: [embed] });
        }
    },

    ping: {
        name: 'بينغ',
        aliases: ['ping', 'pong'],
        description: 'اختبار سرعة البوت',
        category: 'عام',
        cooldown: 5,
        execute: async (message) => {
            const sent = await message.reply({ embeds: [safeCreateEmbed('⏳ جاري القياس...', 'انتظر', 'warning')] });
            const latency = sent.createdTimestamp - message.createdTimestamp;
            
            const embed = safeCreateEmbed(
                '🏓 بينغ!',
                `**البوت:** ${latency}ms\n**API:** ${Math.round(client.ws.ping)}ms`,
                latency < 100 ? 'success' : 'warning'
            );
            
            await sent.edit({ embeds: [embed] });
        }
    },

    // أمر التقييم (للمالك فقط)
    eval: {
        name: 'تقييم',
        aliases: ['eval', 'e'],
        description: 'تنفيذ كود (للمالك فقط)',
        category: 'مالك',
        execute: async (message, args) => {
            if (message.author.id !== config.ownerID) {
                return message.reply({ embeds: [safeCreateEmbed('❌ ممنوع', 'للمالك فقط!', 'danger')] });
            }
            
            const code = args.join(' ');
            try {
                let result = eval(code);
                if (typeof result !== 'string') result = require('util').inspect(result, { depth: 0 });
                
                await message.reply({ 
                    embeds: [safeCreateEmbed('✅ نتيجة', `\`\`\`js\n${result.slice(0, 4000)}\n\`\`\``, 'success')] 
                });
            } catch (error) {
                await message.reply({ 
                    embeds: [safeCreateEmbed('❌ خطأ', error.message, 'danger')] 
                });
            }
        }
    },

    // أمر تشخيص النظام
    diagnostics: {
        name: 'تشخيص',
        aliases: ['diag', 'status', 'system'],
        description: 'عرض حالة النظام',
        category: 'مالك',
        execute: async (message) => {
            if (message.author.id !== config.ownerID) return;
            
            const diag = logger.getDiagnostics();
            const embed = safeCreateEmbed(
                '🔍 تشخيص النظام',
                `**الأخطاء:** ${diag.errors}\n**التحذيرات:** ${diag.warnings}\n**إجمالي اللوجز:** ${diag.totalLogs}\n**المدة:** ${(diag.uptime / 1000).toFixed(1)}s\n**الذاكرة:** ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
                'info'
            );
            
            await message.reply({ embeds: [embed] });
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// معالجة الأحداث - مع Try-Catch في كل مكان
// ═══════════════════════════════════════════════════════════════

client.once('ready', () => {
    try {
        logger.fancy('═══════════════════════════════════════════════════');
        logger.success(`✅ البوت ${client.user.tag} متصل بنجاح!`);
        logger.info(`📊 السيرفرات: ${client.guilds.cache.size}`);
        logger.info(`👥 المستخدمين: ${client.users.cache.size}`);
        logger.info(`⌨️ الأوامر: ${Object.keys(commands).length}`);
        logger.fancy('═══════════════════════════════════════════════════');

        // تحديث الحالة
        client.user.setActivity('-مساعدة | النظام العربي', { type: 0 });
    } catch (error) {
        logger.error('خطأ في حدث ready', error.message);
    }
});

client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.guild) return;
        
        const prefix = config.prefix;
        if (!message.content.startsWith(prefix)) return;
        
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = Object.values(commands).find(cmd => 
            cmd.name === commandName || cmd.aliases.includes(commandName)
        );
        
        if (!command) return;
        
        logger.info(`تنفيذ: ${command.name} بواسطة ${message.author.tag}`);
        
        await command.execute(message, args);
        
    } catch (error) {
        logger.error('خطأ في معالجة الرسالة', error.message);
        try {
            await message.reply({ 
                embeds: [safeCreateEmbed('❌ خطأ', 'حدث خطأ غير متوقع!', 'danger')] 
            });
        } catch (e) {
            // نتجاهل
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;
        await interaction.reply({ content: '✅ تم!', ephemeral: true });
    } catch (error) {
        logger.error('خطأ في Interaction', error.message);
    }
});

// معالجة الأخطاء العامة
client.on('error', (error) => {
    logger.error('Discord Client Error', error.message);
});

client.on('warn', (warning) => {
    logger.warn('Discord Warning', warning);
});

client.on('disconnect', () => {
    logger.warn('البوت انفصل! جاري المحاولة لل reconnect...');
});

client.on('reconnecting', () => {
    logger.info('جاري إعادة الاتصال...');
});

// أخطاء العملية
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled Rejection', error.message);
});

process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught Exception', error.message);
    // ما نطفي البوت، نحاول نكمل
});

// ═══════════════════════════════════════════════════════════════
// تشغيل Keep Alive Server
// ═══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;
keepAliveServer.listen(PORT, () => {
    logger.success(`🌐 Keep Alive Server يعمل على http://localhost:${PORT}`);
    logger.info(`📡 رابط التشخيص: https://your-service.onrender.com`);
});

// ═══════════════════════════════════════════════════════════════
// تسجيل الدخول - مع معالجة أخطاء مفصلة
// ═══════════════════════════════════════════════════════════════

if (!TOKEN) {
    logger.fatal('لا يوجد TOKEN! البوت لن يشتغل.');
    logger.info('💡 الحل: أضف TOKEN في Environment Variables في Render');
} else {
    logger.info('🔄 جاري تسجيل الدخول...');
    
    client.login(TOKEN).then(() => {
        logger.success('✅ تم تسجيل الدخول بنجاح!');
    }).catch((error) => {
        logger.fatal('❌ فشل تسجيل الدخول!', error.message);
        
        if (error.message.includes('token')) {
            logger.error('🔴 التوكن غلط أو منتهي!');
            logger.info('💡 الحل: سوي Reset Token في Discord Developer Portal');
        } else if (error.message.includes('intents')) {
            logger.error('🔴 الـ Intents مو مفعلة!');
            logger.info('💡 الحل: فعل الـ 3 Intents في Discord Developer Portal');
        } else if (error.message.includes('disallowed')) {
            logger.error('🔴 البوت محظور أو معطل!');
        }
        
        // نستمر في Keep Alive حتى لو فشل الدخول
        logger.info('🟡 Keep Alive Server مستمر في العمل...');
    });
}

// ═══════════════════════════════════════════════════════════════
// نظام المراقبة الذاتية
// ═══════════════════════════════════════════════════════════════

setInterval(() => {
    const diag = logger.getDiagnostics();
    logger.debug(`مراقبة: ${diag.errors} أخطاء, ${diag.warnings} تحذيرات, ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
}, 60000); // كل دقيقة
