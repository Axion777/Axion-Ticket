// ═══════════════════════════════════════════════════════════════
// 🤖 النظام العربي المتكامل v16.1 - نسخة التحقق المزدوج
// ═══════════════════════════════════════════════════════════════

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs-extra');
const http = require('http');

// ═══════════════════════════════════════════════════════════════
// اللوجز
// ═══════════════════════════════════════════════════════════════

const logs = [];
function log(emoji, msg) {
    const time = new Date().toLocaleTimeString('ar-SA');
    const entry = `[${time}] ${emoji} ${msg}`;
    console.log(entry);
    logs.push(entry);
    try {
        fs.appendFileSync('./bot.log', entry + '\n');
    } catch(e) {}
}

log('👑', '═══════════════════════════════════════════════════');
log('👑', 'النظام العربي المتكامل v16.1 - نسخة التحقق المزدوج');
log('👑', '═══════════════════════════════════════════════════');

// ═══════════════════════════════════════════════════════════════
// التحقق من المتغيرات
// ═══════════════════════════════════════════════════════════════

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const PORT = process.env.PORT || 3000;

log('🔍', `TOKEN موجود: ${!!TOKEN}`);
log('🔍', `TOKEN الطول: ${TOKEN?.length || 0}`);
log('🔍', `OWNER_ID: ${OWNER_ID}`);
log('🔍', `PORT: ${PORT}`);

if (!TOKEN || TOKEN.length < 50) {
    log('💀', 'TOKEN غير صالح!');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// Keep Alive Server - يشتغل فوراً
// ═══════════════════════════════════════════════════════════════

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <h1>🤖 البوت العربي</h1>
        <p>الحالة: ${client?.readyAt ? '🟢 متصل' : '🟡 جاري الاتصال...'}</p>
        <p>البوت: ${client?.user?.tag || 'غير معروف'}</p>
        <p>السجلات:</p>
        <pre>${logs.slice(-20).join('\n')}</pre>
    `);
});

server.listen(PORT, '0.0.0.0', () => {
    log('🌐', `Keep Alive Server على المنفذ ${PORT}`);
});

// ═══════════════════════════════════════════════════════════════
// قاعدة البيانات
// ═══════════════════════════════════════════════════════════════

const db = {
    data: {},
    get: k => db.data[k] ?? null,
    set: (k, v) => { db.data[k] = v; db.save(); return v; },
    add: (k, n) => db.set(k, (db.get(k) || 0) + n),
    save: () => {
        try {
            fs.ensureDirSync('./data');
            fs.writeJsonSync('./data/db.json', db.data);
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
// تهيئة البوت - بدون presence
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
    // ⚠️ لا presence هنا!
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
// دالة الرد الآمنة
// ═══════════════════════════════════════════════════════════════

async function reply(msg, content, isError = false) {
    try {
        const embed = new EmbedBuilder()
            .setColor(isError ? config.colors.danger : config.colors.success)
            .setTitle(isError ? '❌ خطأ' : '✅ تم')
            .setDescription(String(content).substring(0, 4096))
            .setTimestamp()
            .setFooter({ 
                text: `النظام العربي | ${new Date().toLocaleDateString('ar-SA')}`,
                iconURL: client.user?.displayAvatarURL() || undefined
            });
        
        return await msg.reply({ embeds: [embed] });
    } catch(e1) {
        try {
            return await msg.reply({ content: (isError ? '❌ ' : '✅ ') + String(content).substring(0, 1950) });
        } catch(e2) {
            try {
                return await msg.channel.send({ content: `${msg.author} ${String(content).substring(0, 1900)}` });
            } catch(e3) {
                log('💀', 'فشل الرد!');
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// الأوامر
// ═══════════════════════════════════════════════════════════════

const commands = {
    help: {
        name: 'مساعدة',
        aliases: ['help', 'h', 'commands', 'اوامر'],
        run: async (msg) => {
            await reply(msg, 
                '**📋 قائمة الأوامر:**\n\n' +
                '⭐ **عام:** `-مساعدة` `-بينغ` `-معلومات` `-سيرفر`\n' +
                '🛡️ **إدارة:** `-حظر` `-طرد` `-مسح` `-قفل` `-فتح`\n' +
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
            await sent.edit({ 
                content: `🏓 **بينغ!**\nالبوت: ${latency}ms\nAPI: ${Math.round(client.ws.ping)}ms`
            });
        }
    },

    userinfo: {
        name: 'معلومات',
        aliases: ['userinfo', 'user', 'عني', 'عضو'],
        run: async (msg) => {
            const target = msg.mentions.members.first() || msg.member;
            await reply(msg, 
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
            await reply(msg,
                `**📢 ${g.name}**\n` +
                `الأعضاء: ${g.memberCount}\n` +
                `القنوات: ${g.channels.cache.size}\n` +
                `التاريخ: <t:${Math.floor(g.createdTimestamp / 1000)}:R>`
            );
        }
    },

    ban: {
        name: 'حظر',
        aliases: ['ban', 'تبنيد', 'بان'],
        perms: ['BanMembers'],
        run: async (msg, args) => {
            const target = msg.mentions.members.first();
            if (!target) return reply(msg, '❌ منشن العضو', true);
            
            const reason = args.slice(1).join(' ') || 'غير محدد';
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ban_yes_${target.id}_${msg.author.id}`).setLabel('تأكيد').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`ban_no_${target.id}_${msg.author.id}`).setLabel('إلغاء').setStyle(ButtonStyle.Secondary)
            );
            
            const confirmMsg = await msg.reply({
                content: `⚠️ تأكيد حظر ${target}\nالسبب: ${reason}`,
                components: [row]
            });
            
            db.set(`confirm_${confirmMsg.id}`, { target: target.id, reason, mod: msg.author.id });
        }
    },

    kick: {
        name: 'طرد',
        aliases: ['kick', 'كيك', 'اطرد'],
        perms: ['KickMembers'],
        run: async (msg, args) => {
            const target = msg.mentions.members.first();
            if (!target) return reply(msg, '❌ منشن العضو', true);
            await target.kick(args.slice(1).join(' ') || 'غير محدد');
            await reply(msg, `👢 تم طرد ${target.user.tag}`);
        }
    },

    clear: {
        name: 'مسح',
        aliases: ['clear', 'purge', 'امسح', 'تنظيف'],
        perms: ['ManageMessages'],
        run: async (msg, args) => {
            const amount = parseInt(args[0]);
            if (!amount || amount < 1 || amount > 100) return reply(msg, '❌ رقم من 1-100', true);
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
            await reply(msg, '🔒 تم قفل القناة');
        }
    },

    unlock: {
        name: 'فتح',
        aliases: ['unlock', 'افتح'],
        perms: ['ManageChannels'],
        run: async (msg) => {
            await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: true });
            await reply(msg, '🔓 تم فتح القناة');
        }
    },

    daily: {
        name: 'يومية',
        aliases: ['daily', 'هدية', 'هديه'],
        run: async (msg) => {
            const last = db.get(`daily_${msg.author.id}`);
            const now = Date.now();
            
            if (last && now - last < 86400000) {
                const hours = Math.floor((86400000 - (now - last)) / 3600000);
                return reply(msg, `⏳ انتظر ${hours} ساعة`, true);
            }
            
            const amount = Math.floor(Math.random() * 1000) + 500;
            db.add(`money_${msg.author.id}`, amount);
            db.set(`daily_${msg.author.id}`, now);
            
            await reply(msg, `🎁 حصلت على ${amount} عملة!`);
        }
    },

    balance: {
        name: 'رصيد',
        aliases: ['balance', 'bal', 'فلوس', 'كاش'],
        run: async (msg) => {
            const target = msg.mentions.users.first() || msg.author;
            const bal = db.get(`money_${target.id}`) || 0;
            await reply(msg, `💰 رصيد ${target.username}: ${bal} عملة`);
        }
    },

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
            if (!choices.includes(user)) return reply(msg, '❌ اختر: حجرة، ورقة، أو مقص', true);
            
            const bot = choices[Math.floor(Math.random() * choices.length)];
            let result = 'تعادل! 🤝';
            
            if (
                (user === 'حجرة' && bot === 'مقص') ||
                (user === 'ورقة' && bot === 'حجرة') ||
                (user === 'مقص' && bot === 'ورقة')
            ) result = 'فزت! 🎉';
            else if (user !== bot) result = 'خسرت! 😢';
            
            await reply(msg, `🎮 أنت: ${user} | أنا: ${bot}\n**${result}**`);
        }
    },

    eval: {
        name: 'تقييم',
        aliases: ['eval', 'e', 'كود'],
        run: async (msg, args) => {
            if (msg.author.id !== config.ownerID) return reply(msg, '❌ للمالك فقط!', true);
            try {
                let result = eval(args.join(' '));
                if (typeof result !== 'string') result = require('util').inspect(result, { depth: 0 });
                await reply(msg, `\`\`\`js\n${result.slice(0, 3900)}\n\`\`\``);
            } catch (err) {
                await reply(msg, `❌ ${err.message}`, true);
            }
        }
    },

    restart: {
        name: 'اعادة',
        aliases: ['restart', 'ريستارت', 'تحديث'],
        run: async (msg) => {
            if (msg.author.id !== config.ownerID) return;
            await reply(msg, '🔄 جاري إعادة التشغيل...');
            process.exit(0);
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// الأحداث
// ═══════════════════════════════════════════════════════════════

client.once('ready', () => {
    log('✅', '═══════════════════════════════════════════════════');
    log('✅', `البوت ${client.user.tag} متصل!`);
    log('✅', `السيرفرات: ${client.guilds.cache.size}`);
    log('✅', `المستخدمين: ${client.users.cache.size}`);
    log('✅', '═══════════════════════════════════════════════════');
    
    // نضبط الـ presence بعد ما نتصل
    client.user.setActivity('-مساعدة | النظام العربي', { type: 0 });
});

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
        
        if (cmd.perms) {
            const missing = cmd.perms.filter(p => 
                !msg.member.permissions.has(PermissionsBitField.Flags[p])
            );
            if (missing.length > 0) {
                return await reply(msg, `🛡️ تحتاج: ${missing.join(', ')}`, true);
            }
        }
        
        log('⌨️', `${msg.author.tag} → ${cmd.name}`);
        await cmd.run(msg, args);
        
    } catch (err) {
        log('❌', `خطأ: ${err.message}`);
    }
});

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
                await interaction.update({ content: `🔨 تم حظر ${member.user.tag}`, components: [] });
            }
        } else if (interaction.customId.startsWith('ban_no_')) {
            await interaction.update({ content: '❌ تم الإلغاء', components: [] });
        }
        
        db.set(`confirm_${interaction.message.id}`, null);
        
    } catch (err) {
        log('❌', `خطأ زر: ${err.message}`);
    }
});

client.on('error', (err) => log('❌', `Discord Error: ${err.message}`));

// ═══════════════════════════════════════════════════════════════
// تسجيل الدخول مع timeout
// ═══════════════════════════════════════════════════════════════

log('🚀', 'جاري تسجيل الدخول...');

// timeout بعد 30 ثانية
const loginTimeout = setTimeout(() => {
    log('💀', 'انتهى الوقت! client.login معلق');
    log('💡', 'الأسباب المحتملة:');
    log('💡', '1. TOKEN غلط - سوي Reset في Discord Developer Portal');
    log('💡', '2. Intents مو مفعلة - فعل الـ 3 Privileged Intents');
    log('💡', '3. Discord API معطل - انتظر شوي وجرب later');
}, 30000);

client.login(TOKEN).then(() => {
    clearTimeout(loginTimeout);
    log('✅', 'تم تسجيل الدخول بنجاح!');
}).catch((err) => {
    clearTimeout(loginTimeout);
    log('❌', `فشل الدخول: ${err.message}`);
    
    if (err.message.includes('token')) {
        log('💀', 'التوكن غلط!');
    } else if (err.message.includes('intents')) {
        log('💀', 'فعل الـ 3 Intents!');
    }
});

// معالجة أخطاء Node.js
process.on('unhandledRejection', (err) => log('❌', `Unhandled: ${err.message}`));
process.on('uncaughtException', (err) => log('💀', `Exception: ${err.message}`));
