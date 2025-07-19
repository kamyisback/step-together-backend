const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { StreamChat } = require('stream-chat');
const mongoose = require('mongoose');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Replace with your Stream credentials
const STREAM_API_KEY = 'mdv8ah5tjd5w';
const STREAM_API_SECRET = '5c3gy5a433dxn7x7d5nq5q4hzf3u4z3yzn9t58gc9cznzcyeq3s2pypqke76r7zg';
const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

// === MongoDB Atlas Setup ===
// 1. Replace <username>, <password>, and <cluster-url> with your Atlas info
// 2. Example: mongodb+srv://myuser:mypassword@cluster0.abcde.mongodb.net/stepbystep?retryWrites=true&w=majority
const MONGODB_URI = 'mongodb+srv://kamy:MtdCPOG6o9Mj00T8@cluster0.ipw2kit.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  email: String,
  name: String,
  password: String,
  role: { type: String, default: 'client' } // 'coach' or 'client'
});
const User = mongoose.model('User', userSchema);

// Removed seed logic for initial coach

function sanitizeUserId(email) {
  return email.toLowerCase().replace(/[^a-z0-9@_-]/g, '_');
}

// Register endpoint
app.post('/register', async (req, res) => {
  const { email, name, password, role } = req.body;
  const userId = sanitizeUserId(email);
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name, and password are required.' });
  }
  const existing = await User.findOne({ userId });
  if (existing) {
    return res.status(400).json({ error: 'User already exists.' });
  }
  const hash = await bcrypt.hash(password, 10);
  // Let the schema default handle the role if not provided
  await User.create({ userId, email, name, password: hash, ...(role && { role }) });
  const token = serverClient.createToken(userId);
  res.json({ token, name });
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const userId = sanitizeUserId(email);
  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const token = serverClient.createToken(userId);
  res.json({ token, name: user.name, role: user.role });
});

// GET /coaches endpoint
app.get('/coaches', async (req, res) => {
  const coaches = await User.find({ role: 'coach' }, { password: 0 });
  res.json(coaches);
});

// Health check
app.get('/', (req, res) => {
  res.send('Step By Step backend is running with MongoDB Atlas!');
});

// Join user to all community channels
app.post('/joinCommunityChannels', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  try {
    // Fetch all channels of custom type "community"
    const channels = await serverClient.queryChannels({ type: 'community' });
    await Promise.all(
      channels.map(async (ch) => {
        const isMember = ch.state.members.some((m) => m.user_id === userId);
        if (!isMember) {
          await serverClient.channel('community', ch.id).addMembers([userId]);
        }
      })
    );
    res.json({ joined: true, channels: channels.length });
  } catch (err) {
    console.error('joinCommunityChannels error', err);
    res.status(500).json({ error: 'Failed to join community channels' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
}); 