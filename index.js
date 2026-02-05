// ═══════════════════════════════════════════════════════════════
// 🤖 النظام العربي المتكامل v15.2 - النسخة المضمونة 100%
// ═══════════════════════════════════════════════════════════════

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs-extra');
const http = require('http');

// ═══════════════════════════════════════════════════════════════
// اللوج البسيط والفعال
// ═══════════════════════════════════════════════════════════════

const log = (emoji, msg) => {
    const time = new Date().toLocaleTimeString('ar-SA');
    console.log(`[${time}] ${emoji} ${msg}`);
};

log('👑', '═══════════════════════════════════════════════════');
log('👑', 'النظام العربي المتكامل v15.2 - النسخة المضمونة');
log('👑', '═══════════════════════════════════════════════════');

// ═══════════════════════════════════════════════════════════════
// التحقق من المتغيرات
// ═══════════════════════════════════════════════════════════════

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const PORT = process.env.PORT || 3000;

if (!TOKEN) {
    log('❌', 'TOKEN غير موجود!');
    process.exit(1);
}

log('✅', 'TOKEN موجود');
log('ℹ️', `OWNER_ID: ${OWNER_ID}`);

// ═══════════════════════════════════════════════════════════════
// قاعدة البيانات
// ═══════════════════════════════════════════════════════════════

const db = {
    data: {},
    get: function(k) { return this.data[k] ?? null; },
    set: function(k, v) { this.data[k] = v; return v; },
    add: function(k, n) { return this.set(k, (this.get(k) || 0) + n); }
};

try {
    fs.ensureDirSync('./data');
    if (fs.existsSync('./data/db.json')) {
        db.data = fs.readJsonSync('./data/db.json');
    }
} catch(e) {}

const saveDB = () => {
    try { fs.writeJsonSync('./data/db.json', db.data); } catch(e) {}
};

log('✅', 'قاعدة البيانات جاهزة');

// ═══════════════════════════════════════════════════════════════
// Keep Alive Server
// ═══════════════════════════════════════════════════════════════

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>🤖 البوت العربي</h1><p>الحالة: ${client.readyAt ? '🟢 متصل' : '🟡 جاري الاتصال'}</p><p>البوت: ${client.user?.tag || 'غير معروف'}</p>`);
});

server.listen(PORT, () => log('🌐', `Keep Alive Server على المنفذ ${PORT}`));

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
    failIfNotExists: false
});

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
// دالة الإمبد الآمنة 100%
// ═══════════════════════════════════════════════════════════════

function makeEmbed(title, description, colorName = 'primary') {
    try {
        const color = config.colors[colorName] || config.colors.primary;
        return new EmbedBuilder()
            .setColor(color)
            .setTitle(String(title).substring(0, 256))
            .setDescription(String(description).substring(0, 4096))
            .setTimestamp()
            .setFooter({ 
                text: `النظام العربي | ${new Date().toLocaleDateString('ar-SA')}`,
                iconURL: client.user?.displayAvatarURL() || undefined
            });
    } catch(e) {
        // لو فشل الإمبد، نرجع نص عادي
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// دالة الرد الآمنة 100%
// ═══════════════════════════════════════════════════════════════

async function safeReply(message, content, isError = false) {
    try {
        // نحاول نرسل إمبد
        const embed = makeEmbed(
            isError ? '❌ خطأ' : '✅ تم',
            content,
            isError ? 'danger' : 'success'
        );
        
        if (embed) {
            return await message.reply({ embeds: [embed] });
        }
    } catch(e) {
        log('⚠️', `فشل إرسال الإمبد: ${e.message}`);
    }
    
    // لو فشل الإمبد، نرسل نص عادي
    try {
        return await message.reply({ content: content.substring(0, 2000) });
    } catch(e2) {
        log('❌', `فشل إرسال الرد: ${e2.message}`);
        
        // آخر محاولة: نرسل في الشات بدون ريبلاي
        try {
            return await message.channel.send({ content: `${message.author} ${content.substring(0, 1900)}` });
        } catch(e3) {
            log('💀', 'فشل كل المحاولات!');
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// الأوامر - مبسطة ومضمونة
// ═══════════════════════════════════════════════════════════════

const commands = {
    // ═══ عامة ═══
    help: {
        name: 'مساعدة',
        aliases: ['help', 'h', 'commands', 'اوامر'],
        run: async (msg) => {
            await safeReply(msg, 
                '**📋 قائمة الأوامر:**\n\n' +
                '⭐ **عام:** `-مساعدة` `-بينغ` `-معلومات` `-سيرفر`\n' +
                '🛡️ **إدارة:** `-حظر` `-طرد` `-اسكات` `-مسح` `-قفل` `-فتح`\n' +
                '💰 **اقتصاد:** `-يومية` `-رصيد`\n' +
                '🎮 **ترفيه:** `-قل` `-حجرة`'
            );
        }
    },

    ping: {
        name: 'بينغ',
        aliases: ['ping', 'pong', 'سرعة'],
        run: async (msg) => {
            const sent = await msg.reply({ content: '⏳ جاري القياس...' });
            const latency = sent.createdTimestamp - msg.createdTimestamp;
            await sent.edit({ content: `🏓 **بينغ!**\nالبوت: ${latency}ms\nAPI: ${Math.round(client.ws.ping)}ms` });
        }
    },

    userinfo: {
        name: 'معلومات',
        aliases: ['userinfo', 'user', 'عني', 'عضو'],
        run: async (msg) => {
            const target = msg.mentions.members.first() || msg.member;
            await safeReply(msg, 
                `**👤 ${target.user.username}**\n` +
                `الآيدي: \`${target.id}\`\n` +
                `الانضمام: <t:${Math.floor(target.joinedTimestamp / 1000)}:R>\n` +
                `الرتب: ${target.roles.cache.size - 1}`
            );
        }
    },

    serverinfo: {
        name: 'سيرفر',
        aliases: ['serverinfo', 'server', 'السيرفر'],
        run: async (msg) => {
            const g = msg.guild;
            await safeReply(msg,
                `**📢 ${g.name}**\n` +
                `الأعضاء: ${g.memberCount}\n` +
                `القنوات: ${g.channels.cache.size}\n` +
                `تاريخ الإنشاء: <t:${Math.floor(g.createdTimestamp / 1000)}:R>`
            );
        }
    },

    // ═══ إدارة ═══
    ban: {
        name: 'حظر',
        aliases: ['ban', 'تبنيد', 'بان'],
        perms: ['BanMembers'],
        run: async (msg, args) => {
            const target = msg.mentions.members.first();
            if (!target) return safeReply(msg, '❌ منشن العضو المراد حظره', true);
            
            const reason = args.slice(1).join(' ') || 'غير محدد';
            
            // تأكيد بالأزرار
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ban_yes_${target.id}_${msg.author.id}`)
                    .setLabel('✅ تأكيد')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`ban_no_${target.id}_${msg.author.id}`)
                    .setLabel('❌ إلغاء')
                    .setStyle(ButtonStyle.Secondary)
            );
            
            const confirmMsg = await msg.reply({
                content: `⚠️ **تأكيد الحظر**\nالعضو: ${target}\nالسبب: ${reason}`,
                components: [row]
            });
            
            // حفظ البيانات مؤقتاً
            db.set(`confirm_${confirmMsg.id}`, {
                type: 'ban',
                target: target.id,
                reason: reason,
                mod: msg.author.id,
                time: Date.now()
            });
            saveDB();
        }
    },

    kick: {
        name: 'طرد',
        aliases: ['kick', 'كيك', 'اطرد'],
        perms: ['KickMembers'],
        run: async (msg, args) => {
            const target = msg.mentions.members.first();
            if (!target) return safeReply(msg, '❌ منشن العضو', true);
            
            await target.kick(args.slice(1).join(' ') || 'غير محدد');
            await safeReply(msg, `👢 **تم طرد** ${target.user.tag}`);
        }
    },

    clear: {
        name: 'مسح',
        aliases: ['clear', 'purge', 'امسح', 'تنظيف'],
        perms: ['ManageMessages'],
        run: async (msg, args) => {
            const amount = parseInt(args[0]);
            if (!amount || amount < 1 || amount > 100) {
                return safeReply(msg, '❌ أدخل رقم من 1 إلى 100', true);
            }
            
            const deleted = await msg.channel.bulkDelete(amount + 1, true);
            const m = await msg.channel.send(`🧹 تم مسح ${deleted.size - 1} رسالة`);
            setTimeout(() => m.delete().catch(() => {}), 3000);
        }
    },

    lock: {
        name: 'قفل',
        aliases: ['lock', 'اقفل'],
        perms: ['ManageChannels'],
        run: async (msg) => {
            await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: false });
            await safeReply(msg, '🔒 **تم قفل القناة**');
        }
    },

    unlock: {
        name: 'فتح',
        aliases: ['unlock', 'افتح'],
        perms: ['ManageChannels'],
        run: async (msg) => {
            await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: true });
            await safeReply(msg, '🔓 **تم فتح القناة**');
        }
    },

    // ═══ اقتصاد ═══
    daily: {
        name: 'يومية',
        aliases: ['daily', 'هدية', 'هديه'],
        run: async (msg) => {
            const last = db.get(`daily_${msg.author.id}`);
            const now = Date.now();
            
            if (last && now - last < 86400000) {
                const hours = Math.floor((86400000 - (now - last)) / 3600000);
                return safeReply(msg, `⏳ انتظر ${hours} ساعة`, true);
            }
            
            const amount = Math.floor(Math.random() * 1000) + 500;
            db.add(`money_${msg.author.id}`, amount);
            db.set(`daily_${msg.author.id}`, now);
            saveDB();
            
            const total = db.get(`money_${msg.author.id}`);
            await safeReply(msg, `🎁 **مكافأة يومية!**\nحصلت على: ${amount} عملة\nرصيدك الكلي: ${total}`);
        }
    },

    balance: {
        name: 'رصيد',
        aliases: ['balance', 'bal', 'فلوس', 'كاش'],
        run: async (msg) => {
            const target = msg.mentions.users.first() || msg.author;
            const bal = db.get(`money_${target.id}`) || 0;
            await safeReply(msg, `💰 **رصيد ${target.username}**\n${bal} عملة`);
        }
    },

    // ═══ ترفيه ═══
    say: {
        name: 'قل',
        aliases: ['say', 'echo', 'اكتب'],
        run: async (msg, args) => {
            const text = args.join(' ');
            if (!text) return;
            await msg.delete().catch(() => {});
            await msg.channel.send(text);
        }
    },

    rps: {
        name: 'حجرة',
        aliases: ['rps', 'حجرة-ورقة-مقص'],
        run: async (msg, args) => {
            const choices = ['حجرة', 'ورقة', 'مقص'];
            const user = args[0];
            
            if (!choices.includes(user)) {
                return safeReply(msg, '❌ اختر: حجرة، ورقة، أو مقص', true);
            }
            
            const bot = choices[Math.floor(Math.random() * choices.length)];
            let result = 'تعادل! 🤝';
            
            if (
                (user === 'حجرة' && bot === 'مقص') ||
                (user === 'ورقة' && bot === 'حجرة') ||
                (user === 'مقص' && bot === 'ورقة')
            ) result = 'فزت! 🎉';
            else if (user !== bot) result = 'خسرت! 😢';
            
            await safeReply(msg, `🎮 **حجرة ورقة مقص**\nأنت: ${user}\nأنا: ${bot}\n\n**${result}**`);
        }
    },

    // ═══ مالك ═══
    eval: {
        name: 'تقييم',
        aliases: ['eval', 'e', 'كود'],
        run: async (msg, args) => {
            if (msg.author.id !== config.ownerID) {
                return safeReply(msg, '❌ للمالك فقط!', true);
            }
            
            try {
                let result = eval(args.join(' '));
                if (typeof result !== 'string') result = require('util').inspect(result, { depth: 0 });
                await safeReply(msg, `\`\`\`js\n${result.slice(0, 3900)}\n\`\`\``);
            } catch (err) {
                await safeReply(msg, `❌ **خطأ:**\n${err.message}`, true);
            }
        }
    },

    restart: {
        name: 'اعادة',
        aliases: ['restart', 'ريستارت', 'تحديث'],
        run: async (msg) => {
            if (msg.author.id !== config.ownerID) return;
            await safeReply(msg, '🔄 **جاري إعادة التشغيل...**');
            process.exit(0);
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// الأحداث - معالجة آمنة 100%
// ═══════════════════════════════════════════════════════════════

client.once('ready', () => {
    log('✅', '═══════════════════════════════════════════════════');
    log('✅', `البوت ${client.user.tag} متصل!`);
    log('✅', `السيرفرات: ${client.guilds.cache.size}`);
    log('✅', `المستخدمين: ${client.users.cache.size}`);
    log('✅', '═══════════════════════════════════════════════════');
    
    client.user.setActivity('-مساعدة | النظام العربي', { type: 0 });
});

client.on('messageCreate', async (msg) => {
    try {
        // التحققات الأساسية
        if (!msg.guild) return; // لا نرد على DM
        if (msg.author.bot) return; // لا نرد على بوتات
        if (!msg.content.startsWith(config.prefix)) return; // يبدأ بالبادئة
        
        const args = msg.content.slice(config.prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        
        // البحث عن الأمر
        const cmd = Object.values(commands).find(c => 
            c.name === cmdName || c.aliases.includes(cmdName)
        );
        
        if (!cmd) return; // أمر غير موجود
        
        log('⌨️', `أمر: ${cmd.name} من ${msg.author.tag}`);
        
        // التحقق من الصلاحيات
        if (cmd.perms) {
            const missing = cmd.perms.filter(p => !msg.member.permissions.has(PermissionsBitField.Flags[p]));
            if (missing.length > 0) {
                return await safeReply(msg, `🛡️ **تحتاج صلاحية:** ${missing.join(', ')}`, true);
            }
        }
        
        // تنفيذ الأمر
        await cmd.run(msg, args);
        
    } catch (err) {
        log('❌', `خطأ في أمر: ${err.message}`);
        console.error(err);
    }
});

// معالجة الأزرار (التأكيدات)
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;
        
        const data = db.get(`confirm_${interaction.message.id}`);
        if (!data) return;
        
        // التحقق من صاحب الأمر
        if (interaction.user.id !== data.mod) {
            return await interaction.reply({ content: '❌ ليس لديك صلاحية!', ephemeral: true });
        }
        
        if (interaction.customId.startsWith('ban_yes_')) {
            const member = await interaction.guild.members.fetch(data.target).catch(() => null);
            if (member) {
                await member.ban({ reason: data.reason });
                await interaction.update({ 
                    content: `🔨 **تم حظر** ${member.user.tag}`, 
                    components: [] 
                });
            } else {
                await interaction.update({ 
                    content: '❌ **العضو غير موجود**', 
                    components: [] 
                });
            }
        } else if (interaction.customId.startsWith('ban_no_')) {
            await interaction.update({ 
                content: '❌ **تم الإلغاء**', 
                components: [] 
            });
        }
        
        db.set(`confirm_${interaction.message.id}`, null);
        saveDB();
        
    } catch (err) {
        log('❌', `خطأ في interaction: ${err.message}`);
    }
});

// معالجة الأخطاء العامة
client.on('error', (err) => log('❌', `Discord Error: ${err.message}`));
process.on('unhandledRejection', (err) => log('❌', `Unhandled: ${err.message}`));
process.on('uncaughtException', (err) => log('💀', `Exception: ${err.message}`));

// ═══════════════════════════════════════════════════════════════
// تسجيل الدخول
// ═══════════════════════════════════════════════════════════════

log('🔄', 'جاري الاتصال...');

client.login(TOKEN).then(() => {
    log('✅', 'تم تسجيل الدخول!');
}).catch((err) => {
    log('❌', `فشل الدخول: ${err.message}`);
    if (err.message.includes('token')) log('💡', 'التوكن غلط!');
    if (err.message.includes('intents')) log('💡', 'فعل الـ 3 Intents!');
});
