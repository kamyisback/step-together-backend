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

// === Seed base courses (run once at startup) ===
async function seedCourses() {
  const baseCourses = [
    {
      id: 'kickstart7',
      title: '7-Day Kickstart',
      coverURL: 'https://ohio.stream-io-cdn.com/1405499/images/58621ff6-e1c7-4a0a-b73a-f174e061e20b.messaging--members-kzql9NDxXojvpZYMnqK8Cjsp-.jpg?Key-Pair-Id=APKAIHG36VEWPDULE23Q&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9vaGlvLnN0cmVhbS1pby1jZG4uY29tLzE0MDU0OTkvaW1hZ2VzLzU4NjIxZmY2LWUxYzctNGEwYS1iNzNhLWYxNzRlMDYxZTIwYi5tZXNzYWdpbmctLW1lbWJlcnMta3pxbDlORHhYb2p2cFpZTW5xSzhDanNwLS5qcGc~Km9oPTIwMDIqb3c9MzAwMCoiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3NTQ1MTY5MzJ9fX1dfQ__&Signature=pENtQmh3WiV~8XME-8m7K5hKBgYV2tqjClxv35mKbgLRqh1JMB1Es0kCKrbj7XQhFVF85lm68JWk880JwL-8DNdOmbMNPGq64ipo-bI-DaUCE9AffX2-2CIm6aGBQaUS-TNygT-63mG~-JmV8mZR7jeNQLiyjHUwmbZl0dg0IHVWW4xyS2BgU1cLsHm5GO28Zt7LxgeXwBF1yw32TWgUSGgGkGLG7pFE6zpwUBV08j3wc2FDX0DR~Il2mPglfGOznOO8~O4pwc7ZaNdjRxvFYxd~LtvvkBDZW5Bra~M01tJlKKfxDNlfqO51X0f3MpC8b9B8ujEQeRCprxV1It~JNQ__&oh=2002&ow=3000',
      isFree: true
    },
    {
      id: 'stepTogether',
      title: 'Step Together Program',
      coverURL: 'https://ohio.stream-io-cdn.com/1405499/images/4c98ceee-776b-4957-8b2e-6550949c896f.messaging--members-6TiLv6ulQZbKbAxQfzHXQJD-_.jpg?Key-Pair-Id=APKAIHG36VEWPDULE23Q&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9vaGlvLnN0cmVhbS1pby1jZG4uY29tLzE0MDU0OTkvaW1hZ2VzLzRjOThjZWVlLTc3NmItNDk1Ny04YjJlLTY1NTA5NDljODk2Zi5tZXNzYWdpbmctLW1lbWJlcnMtNlRpTHY2dWxRWmJLYkF4UWZ6SFhRSkQtXy5qcGc~Km9oPTI4NDgqb3c9NDI4OCoiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3NTQ1MjIxNTZ9fX1dfQ__&Signature=lOJDT5sOYzbuqailbJ~VnPugrd15aLLJbgW8dEw-Y8YsUz-3UmSxe4v3u8CUnSjoqff0rkCuTHmiRyWtKDP7DW4JbeaMVDIEx~ksQ5~OzT4zJB~RVWuinxPczi9~GEF0KhbNY8gY49QDuhhT8A9w~TLLQlAGbv8RhGVcH~oEmhWF5bJ1tGILzWbnm-NZd2coBksnkXBujHob3vF32wPECwrk2Praupb5hsqYl7qe0MrScDqAOhqo9WYY71YT9J3bWDri328H5-NX6tsCeL2CHHW-H0sH5eu3l6KbQLQNb5Bj67FvpTzBoFlKksd9WdqxbjyLb1llAr0xPOc5BpfegA__&oh=2848&ow=4288',
      isFree: false
    }
  ];

  for (const c of baseCourses) {
    await Course.updateOne({ id: c.id }, c, { upsert: true });
  }
}

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true }, // Stable ID for Stream Chat: user_[ObjectId]
  email: String,                          // User's current email for authentication
  emailHistory: [{                        // Previous emails for support/recovery
    email: String,
    changedAt: { type: Date, default: Date.now }
  }],
  name: String,
  password: String,
  role: { type: String, default: 'client' } // 'coach' or 'client'
});
const User = mongoose.model('User', userSchema);

// === Course & Access Schemas ===
const courseSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  title: String,
  coverURL: String,
  isFree: { type: Boolean, default: false }
});
const Course = mongoose.model('Course', courseSchema);

const courseAccessSchema = new mongoose.Schema({
  userId: String,
  courseId: String,
  unlockedAt: { type: Date, default: Date.now }
});
courseAccessSchema.index({ userId: 1, courseId: 1 }, { unique: true });
const CourseAccess = mongoose.model('CourseAccess', courseAccessSchema);

// call seeding after models initialized
seedCourses();

// === LogEntry Schema ===
const logEntrySchema = new mongoose.Schema({
  messageId: { type: String, unique: true },
  coachId: String,
  text: String,
  imageUrls: [String],
  createdAt: Date,
  category: { type: String, default: 'food' }
});
logEntrySchema.index({ coachId: 1, createdAt: -1 });
const LogEntry = mongoose.model('LogEntry', logEntrySchema);
// Removed seed logic for initial coach



// Register endpoint
app.post('/register', async (req, res) => {
  const { email, name, password, role } = req.body;
  
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name, and password are required.' });
  }
  
  // Normalize email to lowercase for case-insensitive handling
  const normalizedEmail = email.toLowerCase().trim();
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // Check if email already exists (case-insensitive)
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(400).json({ error: 'Email already in use' });
  }
  
  const hash = await bcrypt.hash(password, 10);
  
  // Create new user and use MongoDB ObjectId as stable Stream user ID
  const newUser = await User.create({ 
    email: normalizedEmail, 
    name, 
    password: hash, 
    ...(role && { role }) 
  });
  
  // Update user with stable userId based on ObjectId
  const stableUserId = `user_${newUser._id.toString()}`;
  newUser.userId = stableUserId;
  await newUser.save();
  
  const token = serverClient.createToken(stableUserId);
  res.json({ token, name, role: role || 'client', userId: stableUserId });
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  
  // Normalize email to lowercase for case-insensitive handling
  const normalizedEmail = email.toLowerCase().trim();
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Use the stored stable userId for Stream token
  const token = serverClient.createToken(user.userId);
  res.json({ token, name: user.name, role: user.role, userId: user.userId });
});

// GET /coaches endpoint
app.get('/coaches', async (req, res) => {
  const coaches = await User.find({ role: 'coach' }, { password: 0 });
  res.json(coaches);
});

// GET /users endpoint (all users)
app.get('/users', async (req, res) => {
  const users = await User.find({}, { password: 0 });
  res.json(users);
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
        try {
          await serverClient.channel(ch.type, ch.id).addMembers([userId]);
        } catch (e) {
          // Ignore error if user already member
          if (e.code !== 16) { // 16 = user already a member
            console.error(`addMembers failed for channel ${ch.id}`, e);
          }
        }
      })
    );
    res.json({ joined: true, channels: channels.length });
  } catch (err) {
    console.error('joinCommunityChannels error', err);
    res.status(500).json({ error: 'Failed to join community channels' });
  }
});

// ==== Log Endpoints ====

// Create a log entry (called by mobile after broadcast succeeds, or can be used by webhook)
app.post('/logEntry', async (req, res) => {
  const { messageId, coachId, text, imageUrls, createdAt, category } = req.body;
  if (!messageId || !coachId || !createdAt) {
    return res.status(400).json({ error: 'messageId, coachId, createdAt required' });
  }
  try {
    console.log(`💾 Saving log entry: messageId=${messageId}, coachId=${coachId}, createdAt=${createdAt}`);
    
    // Parse the ISO8601 string to ensure proper Date conversion
    const parsedDate = new Date(createdAt);
    console.log(`💾 Parsed date: ${parsedDate.toISOString()}`);
    
    const result = await LogEntry.updateOne(
      { messageId },
      { messageId, coachId, text: text || '', imageUrls: imageUrls || [], createdAt: parsedDate, category: category || 'food' },
      { upsert: true }
    );
    
    console.log(`💾 Save result:`, result);
    
    // Verify what was actually saved
    const saved = await LogEntry.findOne({ messageId }).select('messageId coachId createdAt category');
    console.log(`💾 Verified saved entry:`, {
      messageId: saved?.messageId,
      coachId: saved?.coachId,
      createdAt: saved?.createdAt?.toISOString(),
      category: saved?.category
    });
    
    res.json({ saved: true });
  } catch (err) {
    console.error('logEntry save error', err);
    res.status(500).json({ error: 'Failed to save log entry' });
  }
});

// Get logs for a coach and optional date (YYYY-MM-DD)
app.get('/logs', async (req, res) => {
  const { coachId, date, page = 0, pageSize = 20, tzOffset = "0" } = req.query;
  if (!coachId || !date) {
    return res.status(400).json({ error: 'coachId and date required' });
  }
  try {
    const offsetMinutes = parseInt(tzOffset);
    // Interpret provided date as local day in the user's timezone.
    const start = new Date(date);
    start.setMinutes(start.getMinutes() - offsetMinutes);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const entries = await LogEntry.find({
      coachId,
      createdAt: { $gte: start, $lt: end }
    })
      .sort({ createdAt: -1 })
      .skip(parseInt(page) * parseInt(pageSize))
      .limit(parseInt(pageSize));
    // caching
    res.set('Cache-Control', 'public, max-age=30');
    // simple ETag based on count + latest updatedAt
    const etag = `${entries.length}-${entries[0]?.updatedAt?.getTime() || 0}`;
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    res.set('ETag', etag);
    res.json(entries);
  } catch (err) {
    console.error('logs query error', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get dates that have log entries for a coach within a date range
app.get('/logs/dates', async (req, res) => {
  const { coachId, startDate, endDate, tzOffset = "0" } = req.query;
  if (!coachId || !startDate || !endDate) {
    return res.status(400).json({ error: 'coachId, startDate, and endDate required' });
  }
  try {
    const offsetMinutes = parseInt(tzOffset);
    
    console.log(`🔍 /logs/dates query: coachId=${coachId}, range=${startDate} to ${endDate}, tzOffset=${offsetMinutes}`);
    
    // Parse dates and convert to UTC for database query
    // Client sends dates in their local timezone, we need to query in UTC
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');
    
    console.log(`🔍 Query range in UTC: ${start.toISOString()} to ${end.toISOString()}`);
    
    // Get all log entries in the date range
    const entries = await LogEntry.find({
      coachId,
      createdAt: { $gte: start, $lte: end }
    }).select('createdAt messageId');
    
    console.log(`🔍 Found ${entries.length} entries:`, entries.map(e => ({ 
      messageId: e.messageId, 
      createdAt: e.createdAt.toISOString() 
    })));
    
    // Extract unique dates in the user's local timezone
    const dateSet = new Set();
    entries.forEach(entry => {
      // Convert UTC createdAt to user's local timezone
      const localDate = new Date(entry.createdAt.getTime() + (offsetMinutes * 60 * 1000));
      const dateString = localDate.toISOString().split('T')[0];
      console.log(`🔍 Entry ${entry.createdAt.toISOString()} -> local ${dateString}`);
      dateSet.add(dateString);
    });
    
    const dates = Array.from(dateSet).sort();
    console.log(`🔍 Returning dates: ${JSON.stringify(dates)}`);
    
    // Reduce cache time for debugging
    res.set('Cache-Control', 'public, max-age=30');
    res.json(dates);
  } catch (err) {
    console.error('logs/dates query error', err);
    res.status(500).json({ error: 'Failed to fetch log dates' });
  }
});

// Delete a log entry
app.delete('/logEntry/:messageId', async (req, res) => {
  const { messageId } = req.params;
  const { coachId } = req.query;
  
  if (!messageId || !coachId) {
    return res.status(400).json({ error: 'messageId and coachId required' });
  }
  
  try {
    console.log(`🗑️ Deleting log entry: messageId=${messageId}, coachId=${coachId}`);
    
    // First check if the entry exists
    const existing = await LogEntry.findOne({ messageId, coachId }).select('messageId coachId createdAt');
    if (existing) {
      console.log(`🗑️ Found entry to delete:`, {
        messageId: existing.messageId,
        coachId: existing.coachId,
        createdAt: existing.createdAt.toISOString()
      });
    } else {
      console.log(`🗑️ Entry not found for deletion`);
    }
    
    const result = await LogEntry.deleteOne({ messageId, coachId });
    console.log(`🗑️ Delete result:`, result);
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Log entry not found or not authorized' });
    }
    
    console.log(`✅ Successfully deleted log entry: ${messageId}`);
    res.json({ deleted: true, messageId });
  } catch (err) {
    console.error('logEntry delete error', err);
    res.status(500).json({ error: 'Failed to delete log entry' });
  }
});

// === Course Endpoints ====

// GET /courses?userId=abc
app.get('/courses', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const courses = await Course.find();
    const accesses = await CourseAccess.find({ userId });
    const set = new Set(accesses.map(a => a.courseId));
    const payload = courses.map(c => ({
      id: c.id,
      title: c.title,
      coverURL: c.coverURL,
      locked: !c.isFree && !set.has(c.id)
    }));
    res.json(payload);
  } catch (err) {
    console.error('courses error', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// POST /unlockCourse { userId, courseId }
app.post('/unlockCourse', async (req, res) => {
  const { userId, courseId } = req.body;
  if (!userId || !courseId) return res.status(400).json({ error: 'userId & courseId required' });
  try {
    await CourseAccess.updateOne({ userId, courseId }, { userId, courseId }, { upsert: true });
    res.json({ unlocked: true });
  } catch (err) {
    console.error('unlockCourse error', err);
    res.status(500).json({ error: 'Failed to unlock course' });
  }
});

// POST /removeCourse { userId, courseId }
app.post('/removeCourse', async (req, res) => {
  const { userId, courseId } = req.body;
  if (!userId || !courseId) return res.status(400).json({ error: 'userId & courseId required' });
  try {
    await CourseAccess.deleteOne({ userId, courseId });
    res.json({ removed: true });
  } catch (err) {
    console.error('removeCourse error', err);
    res.status(500).json({ error: 'Failed to remove course access' });
  }
});

// Update user email
app.post('/updateEmail', async (req, res) => {
  const { oldEmail, newEmail } = req.body;
  if (!oldEmail || !newEmail) return res.status(400).json({ error: 'oldEmail and newEmail are required' });
  
  try {
    // Normalize emails to lowercase for case-insensitive handling
    const normalizedOldEmail = oldEmail.toLowerCase().trim();
    const normalizedNewEmail = newEmail.toLowerCase().trim();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedNewEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if new email is already taken
    const existingUser = await User.findOne({ email: normalizedNewEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Find user by old email first
    const user = await User.findOne({ email: normalizedOldEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Add current email to history before updating
    user.emailHistory.push({
      email: normalizedOldEmail,
      changedAt: new Date()
    });
    
    // Update to new email
    user.email = normalizedNewEmail;
    
    // Save changes
    const updatedUser = await user.save();
    
    res.json({ 
      success: true, 
      email: updatedUser.email, 
      userId: updatedUser.userId,
      emailHistoryCount: updatedUser.emailHistory.length
    });
  } catch (err) {
    console.error('updateEmail error:', err);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// Get user email history (for support purposes)
app.get('/user-email-history/:email', async (req, res) => {
  const { email } = req.params;
  if (!email) return res.status(400).json({ error: 'Email parameter required' });
  
  try {
    // Normalize email for case-insensitive search
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find user by current email
    const user = await User.findOne({ email: normalizedEmail }, { 
      email: 1, 
      emailHistory: 1, 
      name: 1, 
      userId: 1,
      role: 1,
      _id: 1
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      userId: user.userId,
      name: user.name,
      role: user.role,
      currentEmail: user.email,
      emailHistory: user.emailHistory.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt)), // Most recent first
      totalEmailChanges: user.emailHistory.length
    });
  } catch (err) {
    console.error('user-email-history error:', err);
    res.status(500).json({ error: 'Failed to get user email history' });
  }
});

// Search user by any previous email (for support recovery)
app.get('/find-user-by-email/:email', async (req, res) => {
  const { email } = req.params;
  if (!email) return res.status(400).json({ error: 'Email parameter required' });
  
  try {
    // Normalize email for case-insensitive search
    const normalizedEmail = email.toLowerCase().trim();
    
    // Search in both current email and email history
    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { 'emailHistory.email': normalizedEmail }
      ]
    }, { 
      email: 1, 
      emailHistory: 1, 
      name: 1, 
      userId: 1,
      role: 1,
      _id: 1
    });
    
    if (!user) {
      return res.status(404).json({ error: 'No user found with this email (current or historical)' });
    }
    
    // Check if the searched email is current or historical
    const isCurrentEmail = user.email === normalizedEmail;
    const historicalEntry = user.emailHistory.find(h => h.email === normalizedEmail);
    
    res.json({
      userId: user.userId,
      name: user.name,
      role: user.role,
      currentEmail: user.email,
      searchedEmail: normalizedEmail,
      isCurrentEmail,
      wasHistoricalEmail: !!historicalEntry,
      historicalEmailDate: historicalEntry?.changedAt,
      emailHistory: user.emailHistory.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt)),
      totalEmailChanges: user.emailHistory.length
    });
  } catch (err) {
    console.error('find-user-by-email error:', err);
    res.status(500).json({ error: 'Failed to search for user by email' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
}); 