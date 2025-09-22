import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'notification-service' });
});

// Notification routes
app.get('/api/notifications', (req, res) => {
  res.json({ message: 'Notification service is running' });
});

app.post('/api/notifications/send', (req, res) => {
  res.json({ message: 'Notification sent successfully' });
});

app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});
