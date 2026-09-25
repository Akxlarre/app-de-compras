require('dotenv').config();
const key = process.env.GEMINI_API_KEY.replace(/"/g, '');
fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
}).then(r => r.json()).then(console.log).catch(console.error);
