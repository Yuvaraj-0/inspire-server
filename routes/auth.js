import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

const CLIENT_URL = process.env.CLIENT_BASE_URL || 'http://localhost:8080'; // ← ADD

// ─── Setup Google Strategy ─────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('✅ Google profile received:', profile.emails[0].value); // ← ADD
    const email = profile.emails[0].value;
    let user = await User.findOne({ email });
    if (user) {
      if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }
    } else {
      user = await User.create({
        email,
        googleId: profile.id,
        role: 'user'
      });
    }
    console.log('✅ User found/created:', user.email); // ← ADD
    done(null, user);
  } catch (err) {
    console.error('❌ Google strategy error:', err.message); // ← ADD
    done(err, null);
  }
}));

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const user = await User.create({ email, password, role: role || 'user' });
    const token = signToken(user._id);
    res.status(201).json({ token, user: { id: user._id.toString(), email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    res.json({ token, user: { id: user._id.toString(), email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 1: Redirect to Google
router.get('/google',
  passport.authenticate('google', {
    scope: ['email', 'profile'],
    session: false
  })
);

// Step 2: Google redirects back here
router.get('/google/callback',
  (req, res, next) => {
    console.log('✅ Google callback hit');
    console.log('Query params:', req.query); // ← see what Google sent
    next();
  },
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${CLIENT_URL}/signin?error=google_failed`,
    failureMessage: true
  }),
  (req, res) => {
    console.log('✅ User authenticated:', req.user);
    const token = signToken(req.user._id);
    const user = req.user.toJSON();
    const params = new URLSearchParams({
      token,
      user: JSON.stringify(user)
    });
    res.redirect(`${CLIENT_URL}/auth/callback?${params}`);
  }
);

export default router;