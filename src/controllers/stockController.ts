import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Item from '../models/Item';
import Transaction from '../models/Transaction';
import mongoose from 'mongoose';

export const addStock = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, locationId, quantity, note, photo } = req.body;

    console.log('Add stock request:', { itemId, locationId, quantity, note });

    if (!itemId || !locationId || !quantity) {
      return res.status(400).json({ error: 'itemId, locationId, and quantity are required' });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Update item location stock
    const locationIndex = item.locations.findIndex(
      loc => loc.locationId.toString() === locationId
    );

    if (locationIndex >= 0) {
      item.locations[locationIndex].quantity += quantity;
    } else {
      item.locations.push({ locationId: new mongoose.Types.ObjectId(locationId), quantity });
    }

    await item.save();

    // Create transaction record
    const transaction = new Transaction({
      type: 'ADD',
      itemId,
      toLocationId: locationId,
      quantity,
      note,
      photo,
      createdBy: req.user?._id
    });

    await transaction.save();

    res.status(201).json({ message: 'Stock added successfully', transaction });
  } catch (error) {
    console.error('Add stock error:', error);
    res.status(500).json({ error: 'Failed to add stock', details: error });
  }
};

export const transferStock = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, fromLocationId, toLocationId, quantity, note } = req.body;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if sufficient stock exists at source location
    const fromLocationIndex = item.locations.findIndex(
      loc => loc.locationId.toString() === fromLocationId
    );

    if (fromLocationIndex < 0 || item.locations[fromLocationIndex].quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock at source location' });
    }

    // Update source location
    item.locations[fromLocationIndex].quantity -= quantity;

    // Update destination location
    const toLocationIndex = item.locations.findIndex(
      loc => loc.locationId.toString() === toLocationId
    );

    if (toLocationIndex >= 0) {
      item.locations[toLocationIndex].quantity += quantity;
    } else {
      item.locations.push({ locationId: new mongoose.Types.ObjectId(toLocationId), quantity });
    }

    await item.save();

    // Create transaction record
    const transaction = new Transaction({
      type: 'TRANSFER',
      itemId,
      fromLocationId,
      toLocationId,
      quantity,
      note,
      status: req.user?.role === 'admin' ? 'approved' : 'pending',
      createdBy: req.user?._id
    });

    await transaction.save();

    res.status(201).json({ message: 'Stock transfer initiated', transaction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to transfer stock' });
  }
};

export const getStockByLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { locationId } = req.params;

    const items = await Item.find({ 
      status: 'active',
      'locations.locationId': locationId 
    }).populate('locations.locationId', 'name');

    const stockData = items.map(item => {
      const locationStock = item.locations.find(
        loc => loc.locationId._id.toString() === locationId
      );
      
      return {
        item: {
          id: item._id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          threshold: item.threshold
        },
        quantity: locationStock?.quantity || 0,
        status: (locationStock?.quantity || 0) <= item.threshold ? 'low' : 'sufficient'
      };
    });

    res.json(stockData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
};