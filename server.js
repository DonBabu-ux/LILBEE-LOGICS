import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

async function readDB() {
    return await fs.readJson(DB_FILE);
}

async function writeDB(data) {
    await fs.writeJson(DB_FILE, data, { spaces: 2 });
}

app.post('/api/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    const db = await readDB();

    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: "Email already exists" });
    }

    const newUser = {
        uid: "user_" + Date.now(),
        email,
        password,
        role: "user",
        name: "",
        avatar: "",
        isBanned: false,
        joinedAt: Date.now()
    };

    db.users.push(newUser);
    await writeDB(db);
    res.json(newUser);
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const db = await readDB();
    const user = db.users.find(u => u.email === email && u.password === password);

    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json(user);
});

app.get('/api/posts', async (req, res) => {
    const db = await readDB();
    res.json(db.posts);
});

app.post('/api/posts', async (req, res) => {
    const { uid, email, content } = req.body;
    const db = await readDB();

    const user = db.users.find(u => u.uid === uid);
    if (user && user.isBanned) {
        return res.status(403).json({ error: "You are banned from posting" });
    }

    const newPost = {
        id: Date.now().toString(),
        uid,
        email,
        content,
        timestamp: Date.now()
    };

    db.posts.unshift(newPost);
    await writeDB(db);
    res.json(newPost);
});

app.delete('/api/posts/:id', async (req, res) => {
    const { id } = req.params;
    const db = await readDB();
    db.posts = db.posts.filter(p => p.id !== id);
    await writeDB(db);
    res.json({ success: true });
});

app.get('/api/requests', async (req, res) => {
    const { uid } = req.query;
    const db = await readDB();

    if (uid) {
        res.json(db.requests.filter(r => r.uid === uid));
    } else {
        res.json(db.requests);
    }
});

app.post('/api/requests', async (req, res) => {
    const { uid, type, desc } = req.body;
    const db = await readDB();

    const newRequest = {
        id: Date.now().toString(),
        uid,
        type,
        desc,
        status: "pending",
        timestamp: Date.now()
    };

    db.requests.unshift(newRequest);
    await writeDB(db);
    res.json(newRequest);
});

app.patch('/api/requests/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const db = await readDB();

    const reqIdx = db.requests.findIndex(r => r.id === id);
    if (reqIdx > -1) {
        db.requests[reqIdx].status = status;
        await writeDB(db);
        res.json(db.requests[reqIdx]);
    } else {
        res.status(404).json({ error: "Request not found" });
    }
});

app.get('/api/users', async (req, res) => {
    const db = await readDB();
    res.json(db.users);
});

app.patch('/api/users/:uid', async (req, res) => {
    const { uid } = req.params;
    const updates = req.body;
    const db = await readDB();

    const userIdx = db.users.findIndex(u => u.uid === uid);
    if (userIdx > -1) {
        db.users[userIdx] = { ...db.users[userIdx], ...updates };
        await writeDB(db);
        res.json(db.users[userIdx]);
    } else {
        if (updates.email) {
            const newUser = {
                uid: uid || "user_" + Date.now(),
                isBanned: false,
                role: "user",
                joinedAt: Date.now(),
                ...updates
            };
            db.users.push(newUser);
            await writeDB(db);
            res.json(newUser);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    }
});

app.post('/api/users', async (req, res) => {
    const { email, password } = req.body;
    const db = await readDB();

    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: "Email already exists" });
    }

    const newUser = {
        uid: "user_" + Date.now(),
        email,
        password,
        role: "user",
        name: "",
        avatar: "",
        isBanned: false,
        joinedAt: Date.now()
    };

    db.users.push(newUser);
    await writeDB(db);
    res.json(newUser);
});

app.get('/api/chat', async (req, res) => {
    const db = await readDB();
    res.json(db.chat);
});

app.post('/api/chat', async (req, res) => {
    const { uid, email, msg } = req.body;
    const db = await readDB();

    const newMsg = {
        id: Date.now().toString(),
        uid,
        email,
        msg,
        timestamp: Date.now()
    };

    db.chat.push(newMsg);
    await writeDB(db);
    res.json(newMsg);
});

app.delete('/api/chat/:id', async (req, res) => {
    const { id } = req.params;
    const db = await readDB();
    db.chat = db.chat.filter(c => c.id !== id);
    await writeDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
