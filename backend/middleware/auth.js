const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/security');
const JWT_SECRET = jwtSecret();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Rate limiter for AI endpoints: 20 requests per hour per user/IP
const aiRequestCounts = new Map();

function aiRateLimiter(req, res, next) {
  const key = (req.user && req.user.id) ? `user_${req.user.id}` : `ip_${req.ip}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour

  if (!aiRequestCounts.has(key)) {
    aiRequestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  const record = aiRequestCounts.get(key);
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
    return next();
  }

  if (record.count >= 20) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 20 AI requests per hour.' });
  }

  record.count++;
  next();
}

// Export a callable function (acts as the auth middleware) that also exposes
// named members. This makes both call sites work without edits:
//   const auth = require('../middleware/auth');                  -> middleware
//   const { authenticateToken } = require('../middleware/auth'); -> named
module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;
module.exports.aiRateLimiter = aiRateLimiter;
