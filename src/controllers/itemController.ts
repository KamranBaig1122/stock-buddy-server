import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Item from '../models/Item';
import Location from '../models/Location';

export const createItem = async (req: AuthRequest, res: Response) => {
  try {
    const { name, sku, barcode, unit, threshold } = req.body;
    
    const item = new Item({
      name,
      sku,
      barcode,
      unit,
      threshold,
      locations: [],
      createdBy: req.user?._id
    });

    await item.save();
    res.status(201).json({ message: 'Item created successfully', item });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'SKU or barcode already exists' });
    }
    res.status(500).json({ error: 'Failed to create item' });
  }
};

export const getItems = async (req: AuthRequest, res: Response) => {
  try {
    const items = await Item.find({ status: 'active' })
      .populate('locations.locationId', 'name')
      .populate('createdBy', 'name');
    
    const itemsWithStock = items.map(item => ({
      ...item.toObject(),
      totalStock: item.locations.reduce((sum, loc) => sum + loc.quantity, 0),
      stockStatus: item.locations.reduce((sum, loc) => sum + loc.quantity, 0) <= item.threshold ? 'low' : 'sufficient'
    }));

    res.json(itemsWithStock);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

export const getItemById = async (req: AuthRequest, res: Response) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('locations.locationId', 'name')
      .populate('createdBy', 'name');
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};

export const updateItem = async (req: AuthRequest, res: Response) => {
  try {
    const { name, unit, threshold, status } = req.body;
    
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { name, unit, threshold, status },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item updated successfully', item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
};

export const searchItems = async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.query;
    
    const items = await Item.find({
      status: 'active',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { sku: { $regex: query, $options: 'i' } },
        { barcode: { $regex: query, $options: 'i' } }
      ]
    }).populate('locations.locationId', 'name');

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search items' });
  }
};