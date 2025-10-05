import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'analytics-service' });
});

// Analytics routes
app.get('/api/analytics/dashboard', (req, res) => {
  res.json({ message: 'Analytics service is running' });
});

app.get('/api/analytics/reports', (req, res) => {
  res.json({ message: 'Reports generated successfully' });
});

app.listen(PORT, () => {
  console.log(`Analytics service running on port ${PORT}`);
});
