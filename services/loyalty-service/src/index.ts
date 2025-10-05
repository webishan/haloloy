import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'loyalty-service' });
});

// Loyalty routes
app.get('/api/loyalty/points', (req, res) => {
  res.json({ message: 'Loyalty service is running' });
});

app.post('/api/loyalty/earn', (req, res) => {
  res.json({ message: 'Points earned successfully', points: 100 });
});

app.listen(PORT, () => {
  console.log(`Loyalty service running on port ${PORT}`);
});
