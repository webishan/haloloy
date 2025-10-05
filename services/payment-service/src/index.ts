import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'payment-service' });
});

// Payment routes
app.get('/api/payments', (req, res) => {
  res.json({ message: 'Payment service is running' });
});

app.post('/api/payments/process', (req, res) => {
  res.json({ message: 'Payment processed successfully', transactionId: 'txn_' + Date.now() });
});

app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});
