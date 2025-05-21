const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const owner = 'ireliaGTA';
const repo = 'AUTO-GTA';
const filePath = 'keys.json';  // Đường dẫn file keys.json trong repo (cập nhật nếu khác)
const branch = 'main';         // Nhánh chính của repo (thường là main hoặc master)

const headers = {
  Authorization: `token ${process.env.GITHUB_TOKEN}`,
  'User-Agent': 'KeyPanel',
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('views'));

async function getKeyFile() {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  const res = await axios.get(url, { headers });
  const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
  return { keys: JSON.parse(content), sha: res.data.sha };
}

async function updateKeyFile(keys, sha) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const encoded = Buffer.from(JSON.stringify(keys, null, 2)).toString('base64');
  await axios.put(url, {
    message: 'Update keys from admin panel',
    content: encoded,
    sha,
    branch
  }, { headers });
}

app.get('/keys', async (req, res) => {
  try {
    const { keys } = await getKeyFile();
    res.json(keys);
  } catch (err) {
    res.status(500).send('Lỗi đọc file key');
  }
});

app.post('/add', async (req, res) => {
  const { key, expiry } = req.body;
  try {
    const { keys, sha } = await getKeyFile();
    if (keys.find(k => k.key === key)) return res.send('Key đã tồn tại');
    keys.push({ key, expiry });
    await updateKeyFile(keys, sha);
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Lỗi thêm key');
  }
});

app.get('/delete/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const { keys, sha } = await getKeyFile();
    const filtered = keys.filter(k => k.key !== key);
    if (filtered.length === keys.length) return res.send('Không tìm thấy key');
    await updateKeyFile(filtered, sha);
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Lỗi xoá key');
  }
});

app.listen(port, () => {
  console.log(`Server chạy tại http://localhost:${port}`);
});
