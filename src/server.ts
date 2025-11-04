import express from 'express';

const app = express();
const PORT = 5000;

app.get('/', (req, res) => {
  res.json({
    message: 'StockBuddy Backend is LIVE!',
    timestamp: new Date().toISOString(),
    status: 'Server Running'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});