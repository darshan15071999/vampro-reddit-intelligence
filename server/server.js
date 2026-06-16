import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './database/init.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite Database on startup
initializeDatabase().then(() => {
  console.log('✅ SQLite Database initialized successfully.');
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
});

// Basic Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Vampro Backend is running' });
});

// Import and mount routes
import pipelineRoutes from './routes/pipeline.js';
import providerRoutes from './routes/providers.js';
import analyticsRoutes from './routes/analytics.js';
import setupRoutes from './routes/setup.js';
import redditRoutes from './routes/reddit.js';
import probabilityRoutes from './routes/probability.js';

app.use('/api/pipeline', pipelineRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/reddit', redditRoutes);
app.use('/api/probability', probabilityRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
