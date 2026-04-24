const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/drug-reviews', require('./routes/drugReviews'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/claims', require('./routes/claims'));
app.use('/api/controlled', require('./routes/controlled'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/interactions', require('./routes/interactions'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/adverse-events', require('./routes/adverseEvents'));
app.use('/api/workflow', require('./routes/workflow'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/audit-log', require('./routes/auditLog'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/financials', require('./routes/financials'));
app.use('/api/scheduling', require('./routes/scheduling'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
