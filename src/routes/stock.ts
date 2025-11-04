import { Router } from 'express';
import { addStock, transferStock, getStockByLocation } from '../controllers/stockController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/add', authenticateToken, addStock);
router.post('/transfer', authenticateToken, transferStock);
router.get('/location/:locationId', authenticateToken, getStockByLocation);

export default router;