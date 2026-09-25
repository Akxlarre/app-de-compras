require('dotenv').config();
const key = process.env.GEMINI_API_KEY.replace(/"/g, '');
fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key)
  .then(r => r.json())
  .then(data => console.log(data.models?.map(m => m.name)))
  .catch(console.error);
