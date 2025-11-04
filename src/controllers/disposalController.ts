import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Item from '../models/Item';
import Transaction from '../models/Transaction';

export const requestDisposal = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, locationId, quantity, reason, note, photo } = req.body;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check stock availability
    const locationIndex = item.locations.findIndex(
      loc => loc.locationId.toString() === locationId
    );

    if (locationIndex < 0 || item.locations[locationIndex].quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock at location' });
    }

    // Create disposal transaction (pending approval)
    const transaction = new Transaction({
      type: 'DISPOSE',
      itemId,
      fromLocationId: locationId,
      quantity,
      reason,
      note,
      photo,
      status: 'pending',
      createdBy: req.user?._id
    });

    await transaction.save();

    res.status(201).json({ message: 'Disposal request submitted for approval', transaction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request disposal' });
  }
};

export const approveDisposal = async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId, approved } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction || transaction.type !== 'DISPOSE' || transaction.status !== 'pending') {
      return res.status(404).json({ error: 'Disposal request not found or already processed' });
    }

    if (approved) {
      const item = await Item.findById(transaction.itemId);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Reduce stock
      const locationIndex = item.locations.findIndex(
        loc => loc.locationId?.toString() === transaction.fromLocationId?.toString()
      );

      if (locationIndex >= 0) {
        item.locations[locationIndex].quantity -= transaction.quantity;
        await item.save();
      }

      transaction.status = 'approved';
    } else {
      transaction.status = 'rejected';
    }

    transaction.approvedBy = req.user?._id as any;
    transaction.approvedAt = new Date();
    await transaction.save();

    res.json({ 
      message: `Disposal ${approved ? 'approved' : 'rejected'} successfully`, 
      transaction 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process disposal approval' });
  }
};

export const getPendingDisposals = async (req: AuthRequest, res: Response) => {
  try {
    const disposals = await Transaction.find({ 
      type: 'DISPOSE', 
      status: 'pending' 
    })
      .populate('itemId', 'name sku')
      .populate('fromLocationId', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json(disposals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending disposals' });
  }
};