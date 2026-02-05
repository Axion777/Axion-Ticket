// ═══════════════════════════════════════════════════════════════
// 🤖 النظام العربي المتكامل v16.0 - النسخة الخالدة
// لا تموت أبداً - حتى لو فشل كل شي
// ═══════════════════════════════════════════════════════════════

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs-extra');
const http = require('http');

// ═══════════════════════════════════════════════════════════════
// نظام اللوجز الفائق
// ═══════════════════════════════════════════════════════════════

const startTime = Date.now();
const logs = [];

function log(emoji, msg, error = null) {
    const time = new Date().toLocaleTimeString('ar-SA');
    const entry = `[${time}] ${emoji} ${msg}`;
    console.log(entry);
    logs.push({ time, emoji, msg, error: error?.message });
    
    // حفظ في ملف
    try {
        fs.appendFileSync('./bot.log', entry + (error ? ` | ERROR: ${error.message}` : '') + '\n');
    } catch(e) {}
}

log('👑', '═══════════════════════════════════════════════════');
log('👑', 'النظام العربي المتكامل v16.0 - النسخة الخالدة');
log('👑', '═══════════════════════════════════════════════════');

// ═══════════════════════════════════════════════════════════════
// التحقق من المتغيرات
// ═══════════════════════════════════════════════════════════════

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const PORT = process.env.PORT || 3000;

if (!TOKEN) {
    log('💀', 'TOKEN غير موجود! exiting...');
    process.exit(1);
}

log('✅', `TOKEN موجود (الطول: ${TOKEN.length})`);
log('✅', `OWNER_ID: ${OWNER_ID}`);
log('✅', `PORT: ${PORT}`);

// ═══════════════════════════════════════════════════════════════
// قاعدة البيانات
// ═══════════════════════════════════════════════════════════════

const db = {
    data: {},
    get: function(k) { return this.data[k] ?? null; },
    set: function(k, v) { this.data[k] = v; this.save(); return v; },
    add: function(k, n) { return this.set(k, (this.get(k) || 0) + n); },
    save: function() {
        try {
            fs.ensureDirSync('./data');
            fs.writeJsonSync('./data/db.json', this.data);
        } catch(e) {}
    }
};

try {
    if (fs.existsSync('./data/db.json')) {
        db.data = fs.readJsonSync('./data/db.json');
    }
} catch(e) {}

log('✅', 'قاعدة البيانات جاهزة');

// ═══════════════════════════════════════════════════════════════
// Keep Alive Server - يشتغل فوراً ولا يتوقف أبداً
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
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; 
                    padding: 40px;
                    min-height: 100vh;
                    margin: 0;
                }
                .container { max-width: 800px; margin: 0 auto; }
                .status { 
                    padding: 30px; 
                    border-radius: 20px; 
                    margin: 20px 0;
                    backdrop-filter: blur(10px);
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                }
                .online { border-left: 5px solid #00ff88; }
                .offline { border-left: 5px solid #ff4757; }
                .connecting { border-left: 5px solid #ffa502; }
                h1 { font-size: 3em; margin-bottom: 10px; }
                .stat { 
                    display: inline-block; 
                    margin: 10px 20px 10px 0;
                    padding: 15px 25px;
                    background: rgba(0,0,0,0.2);
                    border-radius: 10px;
                }
                .logs { 
                    background: rgba(0,0,0,0.3); 
                    padding: 20px; 
                    border-radius: 10px;
                    max-height: 300px;
                    overflow-y: auto;
                    font-family: monospace;
                    font-size: 12px;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 النظام العربي المتكامل</h1>
                <div class="status ${client?.readyAt ? 'online' : client?.ws?.status === 0 ? 'connecting' : 'offline'}">
                    <h2>${client?.readyAt ? '🟢 البوت متصل ويعمل بكفاءة' : client?.ws?.status === 0 ? '🟡 جاري الاتصال بالديسكورد...' : '🔴 البوت غير متصل'}</h2>
                    <p style="font-size: 1.2em;"><strong>${client?.user?.tag || 'غير معروف'}</strong></p>
                    <p>⏱️ مدة التشغيل: ${Math.floor((Date.now() - startTime) / 1000)} ثانية</p>
                </div>
                
                <div class="status">
                    <h3>📊 الإحصائيات</h3>
                    <div class="stat">🏘️ السيرفرات: ${client?.guilds?.cache?.size || 0}</div>
                    <div class="stat">👥 المستخدمين: ${client?.users?.cache?.size || 0}</div>
                    <div class="stat">⌨️ الأوامر: 15</div>
                    <div class="stat">📡 حالة الاتصال: ${client?.ws?.ping || 'N/A'}ms</div>
                </div>

                <div class="logs">
                    <h3>📝 آخر 10 سجلات:</h3>
                    ${logs.slice(-10).map(l => `<div>[${l.time}] ${l.emoji} ${l.msg}</div>`).join('')}
                </div>
                
                <p style="text-align: center; margin-top: 30px; opacity: 0.8;">
                    🕐 آخر تحديث: ${new Date().toLocaleString('ar-SA')}
                </p>
            </div>
        </body>
        </html>
    `);
});

// إشعار فوري أن السيرفر يعمل
server.listen(PORT, '0.0.0.0', () => {
    log('🌐', `Keep Alive Server يعمل على http://0.0.0.0:${PORT}`);
});

// ═══════════════════════════════════════════════════════════════
// تهيئة البوت - مع معالجة أخطاء شاملة
// ═══════════════════════════════════════════════════════════════

let client;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

function createClient() {
    return new Client({
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
        presence: {
            status: 'online',
            activities: [{ name: 'جاري التشغيل...', type: 0 }]
        }
    });
}

const config = {
    prefix: '-',
    ownerID: OWNER_ID || '0',
    colors: {
        primary: 0x5865F2,
        success: 0x57F287,
        danger: 0xED4245,
        warning: 0xFEE75C,
        info: 0xEB459E
    }
};

// ═══════════════════════════════════════════════════════════════
// دالة الرد الآمنة - لا تفشل أبداً
// ═══════════════════════════════════════════════════════════════

async function sendReply(message, content, isError = false) {
    const maxRetries = 3;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            // محاولة 1: ريبلاي مع إمبد
            const embed = new EmbedBuilder()
                .setColor(isError ? config.colors.danger : config.colors.success)
                .setTitle(isError ? '❌ خطأ' : '✅ تم')
                .setDescription(String(content).substring(0, 4096))
                .setTimestamp()
                .setFooter({ 
                    text: `النظام العربي | ${new Date().toLocaleDateString('ar-SA')}`,
                    iconURL: client.user?.displayAvatarURL() || undefined
                });
            
            return await message.reply({ embeds: [embed], allowedMentions: { repliedUser: true } });
        } catch (e1) {
            log('⚠️', `فشل الريبلاي المحاولة ${i+1}`, e1);
            
            try {
                // محاولة 2: ريبلاي نصي
                return await message.reply({ 
                    content: (isError ? '❌ ' : '✅ ') + String(content).substring(0, 1950),
                    allowedMentions: { repliedUser: false }
                });
            } catch (e2) {
                try {
                    // محاولة 3: إرسال في الشات
                    return await message.channel.send({ 
                        content: `${message.author} ${(isError ? '❌ ' : '✅ ') + String(content).substring(0, 1900)}`
                    });
                } catch (e3) {
                    log('❌', `فشلت جميع المحاولات ${i+1}`, e3);
                }
            }
        }
        
        // انتظر قبل المحاولة التالية
        await new Promise(r => setTimeout(r, 1000));
    }
    
    return null;
}

// ═══════════════════════════════════════════════════════════════
// الأوامر - مضمونة 100%
// ═══════════════════════════════════════════════════════════════

const commands = {
    help: {
        name: 'مساعدة',
        aliases: ['help', 'h', 'commands', 'اوامر', 'الاوامر'],
        run: async (msg) => {
            await sendReply(msg, 
                '**📋 قائمة الأوامر:**\n\n' +
                '⭐ **عام:**\n`-مساعدة` `-بينغ` `-معلومات` `-سيرفر`\n\n' +
                '🛡️ **إدارة:**\n`-حظر` `-طرد` `-اسكات` `-مسح` `-قفل` `-فتح`\n\n' +
                '💰 **اقتصاد:**\n`-يومية` `-رصيد`\n\n' +
                '🎮 **ترفيه:**\n`-قل` `-حجرة` `-تصويت`'
            );
        }
    },

    ping: {
        name: 'بينغ',
        aliases: ['ping', 'pong', 'سرعة', 'لاق'],
        run: async (msg) => {
            const sent = await msg.reply({ content: '⏳ جاري القياس...' });
            const latency = sent.createdTimestamp - msg.createdTimestamp;
            await sent.edit({ 
                content: `🏓 **بينغ!**\n🤖 البوت: ${latency}ms\n📡 API: ${Math.round(client.ws.ping)}ms\n📊 الحالة: ${latency < 100 ? '🟢 ممتاز' : latency < 200 ? '🟡 جيد' : '🔴 بطيء'}`
            });
        }
    },

    userinfo: {
        name: 'معلومات',
        aliases: ['userinfo', 'user', 'عني', 'عضو', 'يوزر'],
        run: async (msg) => {
            const target = msg.mentions.members.first() || msg.member;
            const roles = target.roles.cache
                .filter(r => r.id !== msg.guild.id)
                .map(r => r.name)
                .slice(0, 5)
                .join(', ') || 'لا يوجد';
            
            await sendReply(msg, 
                `**👤 ${target.user.username}**\n\n` +
                `🆔 الآيدي: \`${target.id}\`\n` +
                `📅 الانضمام: <t:${Math.floor(target.joinedTimestamp / 1000)}:R>\n` +
                `🎂 التسجيل: <t:${Math.floor(target.user.createdTimestamp / 1000)}:R>\n` +
                `🎭 الرتب (${target.roles.cache.size - 1}): ${roles}${target.roles.cache.size > 6 ? '...' : ''}`
            );
        }
    },

    serverinfo: {
        name: 'سيرفر',
        aliases: ['serverinfo', 'server', 'السيرفر', 'سيرفرinfo'],
        run: async (msg) => {
            const g = msg.guild;
            await sendReply(msg,
                `**📢 ${g.name}**\n\n` +
                `👥 الأعضاء: ${g.memberCount.toLocaleString()}\n` +
                `🤖 البوتات: ${g.members.cache.filter(m => m.user.bot).size}\n` +
                `📺 القنوات: ${g.channels.cache.size}\n` +
                `🎭 الرتب: ${g.roles.cache.size}\n` +
                `💎 البوستات: ${g.premiumSubscriptionCount || 0}\n` +
                `📅 الإنشاء: <t:${Math.floor(g.createdTimestamp / 1000)}:R>`
            );
        }
    },

    ban: {
        name: 'حظر',
        aliases: ['ban', 'تبنيد', 'بان', 'حظر-عضو'],
        perms: ['BanMembers'],
        run: async (msg, args) => {
            const target = msg.mentions.members.first();
            if (!target) return sendReply(msg, '❌ **منشن العضو المراد حظره**\nمثال: `-حظر @عضو سبام`', true);
            
            if (target.id === msg.author.id) return sendReply(msg, '❌ لا يمكنك حظر نفسك!', true);
            if (target.id === client.user.id) return sendReply(msg, '❌ لا يمكنك حظري!', true);
            if (!target.bannable) return sendReply(msg, '❌ لا يمكنني حظر هذا العضو (رتبته أعلى مني)', true);
            
            const reason = args.slice(1).join(' ') || 'غير محدد';
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ban_yes_${target.id}_${msg.author.id}`)
                    .setLabel('✅ تأكيد الحظر')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`ban_no_${target.id}_${msg.author.id}`)
                    .setLabel('❌ إلغاء')
                    .setStyle(ButtonStyle.Secondary)
            );
            
            const confirmMsg = await msg.reply({
                content: `⚠️ **تأكيد الحظر**\n\n👤 العضو: ${target}\n📝 السبب: ${reason}\n👮‍♂️ بواسطة: ${msg.author.tag}`,
                components: [row],
                allowedMentions: { parse: [] }
            });
            
            db.set(`confirm_${confirmMsg.id}`, {
                type: 'ban',
                target: target.id,
                reason: reason,
                mod: msg.author.id,
                time: Date.now()
            });
        }
    },

    kick: {
        name: 'طرد',
        aliases: ['kick', 'كيك', 'اطرد', 'طرد-عضو'],
        perms: ['KickMembers'],
        run: async (msg, args) => {
            const target = msg.mentions.members.first();
            if (!target) return sendReply(msg, '❌ منشن العضو', true);
            
            if (!target.kickable) return sendReply(msg, '❌ لا يمكنني طرد هذا العضو', true);
            
            const reason = args.slice(1).join(' ') || 'غير محدد';
            await target.kick(reason);
            await sendReply(msg, `👢 **تم طرد** ${target.user.tag}\nالسبب: ${reason}`);
        }
    },

    mute: {
        name: 'اسكات',
        aliases: ['mute', 'ميوت', 'اسكت', 'كتم'],
        perms: ['ModerateMembers'],
        run: async (msg, args) => {
            const target = msg.mentions.members.first();
            if (!target) return sendReply(msg, '❌ منشن العضو', true);
            
            const timeArg = args[1];
            const time = timeArg ? require('ms')(timeArg) : null;
            const reason = args.slice(time ? 2 : 1).join(' ') || 'غير محدد';
            
            await target.timeout(time, reason);
            await sendReply(msg, `🔇 **تم الكتم**\nالعضو: ${target.user.tag}\nالمدة: ${timeArg || 'دائم'}\nالسبب: ${reason}`);
        }
    },

    clear: {
        name: 'مسح',
        aliases: ['clear', 'purge', 'امسح', 'تنظيف', 'مسح-الشات'],
        perms: ['ManageMessages'],
        run: async (msg, args) => {
            const amount = parseInt(args[0]);
            if (!amount || amount < 1 || amount > 100) {
                return sendReply(msg, '❌ أدخل رقم من 1 إلى 100', true);
            }
            
            const deleted = await msg.channel.bulkDelete(amount + 1, true).catch(() => null);
            if (!deleted) return sendReply(msg, '❌ لا يمكن مسح الرسائل الأقدم من 14 يوم', true);
            
            const m = await msg.channel.send(`🧹 تم مسح ${deleted.size - 1} رسالة بنجاح`);
            setTimeout(() => m.delete().catch(() => {}), 3000);
        }
    },

    lock: {
        name: 'قفل',
        aliases: ['lock', 'اقفل', 'قفل-الشات', 'قفل-القناة'],
        perms: ['ManageChannels'],
        run: async (msg) => {
            await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: false });
            await sendReply(msg, '🔒 **تم قفل القناة**\nلا يمكن للأعضاء الكتابة الآن');
        }
    },

    unlock: {
        name: 'فتح',
        aliases: ['unlock', 'افتح', 'فتح-الشات', 'فتح-القناة'],
        perms: ['ManageChannels'],
        run: async (msg) => {
            await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: true });
            await sendReply(msg, '🔓 **تم فتح القناة**\nيمكن للأعضاء الكتابة الآن');
        }
    },

    slowmode: {
        name: 'بطيء',
        aliases: ['slowmode', 'slow', 'بطء', 'slowmo'],
        perms: ['ManageChannels'],
        run: async (msg, args) => {
            const seconds = parseInt(args[0]) || 0;
            await msg.channel.setRateLimitPerUser(seconds);
            await sendReply(msg, seconds === 0 ? '🐌 **تم إلغاء وضع البطء**' : `🐌 **تم تعيين وضع البطء**\nالمدة: ${seconds} ثانية`);
        }
    },

    daily: {
        name: 'يومية',
        aliases: ['daily', 'هدية', 'هديه', 'مكافأة'],
        run: async (msg) => {
            const last = db.get(`daily_${msg.author.id}`);
            const now = Date.now();
            
            if (last && now - last < 86400000) {
                const remaining = 86400000 - (now - last);
                const hours = Math.floor(remaining / 3600000);
                const mins = Math.floor((remaining % 3600000) / 60000);
                return sendReply(msg, `⏳ **انتظر**\nيمكنك الحصول على المكافأة بعد: ${hours} ساعة و ${mins} دقيقة`, true);
            }
            
            const amount = Math.floor(Math.random() * 1000) + 500;
            db.add(`money_${msg.author.id}`, amount);
            db.set(`daily_${msg.author.id}`, now);
            
            const total = db.get(`money_${msg.author.id}`);
            await sendReply(msg, `🎁 **مكافأة يومية!**\n💰 حصلت على: ${amount.toLocaleString()} عملة\n💎 رصيدك الكلي: ${total.toLocaleString()}`);
        }
    },

    balance: {
        name: 'رصيد',
        aliases: ['balance', 'bal', 'فلوس', 'كاش', 'فلوسي'],
        run: async (msg) => {
            const target = msg.mentions.users.first() || msg.author;
            const bal = db.get(`money_${target.id}`) || 0;
            const bank = db.get(`bank_${target.id}`) || 0;
            
            await sendReply(msg, 
                `💰 **رصيد ${target.username}**\n\n` +
                `💵 نقدي: ${bal.toLocaleString()}\n` +
                `🏦 بنك: ${bank.toLocaleString()}\n` +
                `💎 الكلي: ${(bal + bank).toLocaleString()}`
            );
        }
    },

    say: {
        name: 'قل',
        aliases: ['say', 'echo', 'اكتب', 'كرر'],
        run: async (msg, args) => {
            const text = args.join(' ');
            if (!text) return;
            await msg.delete().catch(() => {});
            await msg.channel.send(text);
        }
    },

    rps: {
        name: 'حجرة',
        aliases: ['rps', 'حجرة-ورقة-مقص', 'ورقة', 'مقص'],
        run: async (msg, args) => {
            const choices = ['حجرة', 'ورقة', 'مقص'];
            const user = args[0];
            
            if (!choices.includes(user)) {
                return sendReply(msg, '❌ اختر واحد من:\n🪨 حجرة\n📄 ورقة\n✂️ مقص', true);
            }
            
            const bot = choices[Math.floor(Math.random() * choices.length)];
            const emojis = { 'حجرة': '🪨', 'ورقة': '📄', 'مقص': '✂️' };
            
            let result = 'تعادل! 🤝';
            let color = 'warning';
            
            if (
                (user === 'حجرة' && bot === 'مقص') ||
                (user === 'ورقة' && bot === 'حجرة') ||
                (user === 'مقص' && bot === 'ورقة')
            ) {
                result = 'فزت! 🎉';
                color = 'success';
            } else if (user !== bot) {
                result = 'خسرت! 😢';
                color = 'danger';
            }
            
            await sendReply(msg, 
                `🎮 **حجرة ورقة مقص**\n\n` +
                `أنت: ${emojis[user]} ${user}\n` +
                `أنا: ${emojis[bot]} ${bot}\n\n` +
                `**النتيجة: ${result}**`
            );
        }
    },

    poll: {
        name: 'تصويت',
        aliases: ['poll', 'vote', 'استفتاء', 'تصويت-سريع'],
        run: async (msg, args) => {
            const question = args.join(' ');
            if (!question) return sendReply(msg, '❌ اكتب السؤال', true);
            
            const pollMsg = await msg.channel.send(`📊 **${question}**\n\n👍 نعم | 👎 لا | 🤷 محايد`);
            await pollMsg.react('👍');
            await pollMsg.react('👎');
            await pollMsg.react('🤷');
        }
    },

    eval: {
        name: 'تقييم',
        aliases: ['eval', 'e', 'كود', 'تنفيذ'],
        run: async (msg, args) => {
            if (msg.author.id !== config.ownerID) {
                return sendReply(msg, '❌ هذا الأمر للمالك فقط!', true);
            }
            
            const code = args.join(' ');
            if (!code) return sendReply(msg, '❌ اكتب الكود', true);
            
            try {
                let result = eval(code);
                if (typeof result !== 'string') result = require('util').inspect(result, { depth: 0 });
                
                await sendReply(msg, `\`\`\`js\n${result.slice(0, 3900)}\n\`\`\``);
            } catch (err) {
                await sendReply(msg, `❌ **خطأ في التنفيذ:**\n\`\`\`${err.message}\`\`\``, true);
            }
        }
    },

    restart: {
        name: 'اعادة',
        aliases: ['restart', 'ريستارت', 'تحديث', 'ريبوت'],
        run: async (msg) => {
            if (msg.author.id !== config.ownerID) return;
            await sendReply(msg, '🔄 **جاري إعادة تشغيل البوت...**');
            setTimeout(() => process.exit(0), 1000);
        }
    },

    // أمر التشخيص
    diag: {
        name: 'تشخيص',
        aliases: ['diag', 'system', 'status', 'حالة'],
        run: async (msg) => {
            if (msg.author.id !== config.ownerID) return;
            
            await sendReply(msg,
                `🔍 **تشخيص النظام**\n\n` +
                `⏱️ مدة التشغيل: ${Math.floor((Date.now() - startTime) / 1000)} ثانية\n` +
                `📊 حالة الاتصال: ${client.ws.status}\n` +
                `📡 البينغ: ${client.ws.ping}ms\n` +
                `🏘️ السيرفرات: ${client.guilds.cache.size}\n` +
                `👥 المستخدمين: ${client.users.cache.size}\n` +
                `📝 عدد السجلات: ${logs.length}`
            );
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// الأحداث - معالجة شاملة
// ═══════════════════════════════════════════════════════════════

function setupEvents() {
    // جاهز
    client.once('ready', () => {
        reconnectAttempts = 0;
        log('✅', '═══════════════════════════════════════════════════');
        log('✅', `البوت ${client.user.tag} متصل بنجاح!`);
        log('✅', `السيرفرات: ${client.guilds.cache.size}`);
        log('✅', `المستخدمين: ${client.users.cache.size}`);
        log('✅', `البينغ: ${client.ws.ping}ms`);
        log('✅', '═══════════════════════════════════════════════════');
        
        client.user.setActivity('-مساعدة | النظام العربي المتكامل', { type: 0 });
    });

    // رسائل
    client.on('messageCreate', async (msg) => {
        try {
            if (!msg.guild || msg.author.bot) return;
            if (!msg.content.startsWith(config.prefix)) return;
            
            const args = msg.content.slice(config.prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            
            const cmd = Object.values(commands).find(c => 
                c.name === cmdName || c.aliases.includes(cmdName)
            );
            
            if (!cmd) return;
            
            // صلاحيات
            if (cmd.perms) {
                const missing = cmd.perms.filter(p => 
                    !msg.member.permissions.has(PermissionsBitField.Flags[p])
                );
                if (missing.length > 0) {
                    return await sendReply(msg, `🛡️ **تحتاج صلاحية:** ${missing.join(', ')}`, true);
                }
            }
            
            log('⌨️', `${msg.author.tag} → ${cmd.name}`);
            await cmd.run(msg, args);
            
        } catch (err) {
            log('❌', `خطأ في أمر: ${err.message}`, err);
            try {
                await sendReply(msg, '❌ حدث خطأ غير متوقع!', true);
            } catch(e) {}
        }
    });

    // أزرار
    client.on('interactionCreate', async (interaction) => {
        try {
            if (!interaction.isButton()) return;
            
            const data = db.get(`confirm_${interaction.message.id}`);
            if (!data) return;
            
            if (interaction.user.id !== data.mod) {
                return await interaction.reply({ content: '❌ ليس لديك صلاحية!', ephemeral: true });
            }
            
            if (interaction.customId.startsWith('ban_yes_')) {
                const member = await interaction.guild.members.fetch(data.target).catch(() => null);
                if (member) {
                    await member.ban({ reason: data.reason });
                    await interaction.update({ 
                        content: `🔨 **تم الحظر**\nالعضو: ${member.user.tag}\nالسبب: ${data.reason}`,
                        components: [] 
                    });
                } else {
                    await interaction.update({ content: '❌ العضو غير موجود', components: [] });
                }
            } else if (interaction.customId.startsWith('ban_no_')) {
                await interaction.update({ content: '❌ تم الإلغاء', components: [] });
            }
            
            db.set(`confirm_${interaction.message.id}`, null);
            
        } catch (err) {
            log('❌', `خطأ في زر: ${err.message}`, err);
        }
    });

    // أخطاء
    client.on('error', (err) => {
        log('❌', `Discord Error: ${err.message}`, err);
    });

    client.on('shardError', (err) => {
        log('❌', `Shard Error: ${err.message}`, err);
    });

    client.on('disconnect', () => {
        log('⚠️', 'انقطع الاتصال! جاري إعادة المحاولة...');
        attemptReconnect();
    });
}

// ═══════════════════════════════════════════════════════════════
// نظام إعادة الاتصال الذكي
// ═══════════════════════════════════════════════════════════════

function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT) {
        log('💀', 'تجاوزت محاولات إعادة الاتصال! سأبقى حياً على Keep Alive Server');
        return;
    }
    
    reconnectAttempts++;
    const delay = Math.min(reconnectAttempts * 5000, 60000); // 5s, 10s, 15s... max 60s
    
    log('🔄', `محاولة إعادة اتصال ${reconnectAttempts}/${MAX_RECONNECT} بعد ${delay/1000} ثانية...`);
    
    setTimeout(() => {
        client.destroy().catch(() => {});
        client = createClient();
        setupEvents();
        
        client.login(TOKEN).catch((err) => {
            log('❌', `فشلت المحاولة ${reconnectAttempts}: ${err.message}`);
            attemptReconnect();
        });
    }, delay);
}

// ═══════════════════════════════════════════════════════════════
// بدء التشغيل
// ═══════════════════════════════════════════════════════════════

client = createClient();
setupEvents();

log('🚀', 'جاري تسجيل الدخول...');

client.login(TOKEN).then(() => {
    log('✅', 'تم تسجيل الدخول!');
}).catch((err) => {
    log('❌', `فشل أولي: ${err.message}`, err);
    
    if (err.message.includes('token')) {
        log('💀', 'التوكن غلط! تحقق من TOKEN في Render');
    } else if (err.message.includes('intents')) {
        log('💀', 'فعل الـ 3 Privileged Intents في Discord Developer Portal!');
    }
    
    // نحاول ن reconnect حتى لو فشل أول مرة
    attemptReconnect();
});

// معالجة أخطاء Node.js
process.on('unhandledRejection', (err) => {
    log('❌', `Unhandled Rejection: ${err.message}`, err);
});

process.on('uncaughtException', (err) => {
    log('💀', `Uncaught Exception: ${err.message}`, err);
    // لا نطفي، نحاول نكمل
});

// إشعار كل 5 دقايق أن البوت حي
setInterval(() => {
    if (client.readyAt) {
        log('💓', `القلب ينبض | السيرفرات: ${client.guilds.cache.size} | البينغ: ${client.ws.ping}ms`);
    } else {
        log('💛', 'البوت غير متصل، لكن Keep Alive يعمل');
    }
}, 300000);
