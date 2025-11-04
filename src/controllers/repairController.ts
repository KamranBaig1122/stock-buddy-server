import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Item from '../models/Item';
import RepairTicket from '../models/RepairTicket';
import Transaction from '../models/Transaction';

export const sendForRepair = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, locationId, quantity, vendorName, serialNumber, note, photo } = req.body;

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

    // Reduce stock
    item.locations[locationIndex].quantity -= quantity;
    await item.save();

    // Create repair ticket
    const repairTicket = new RepairTicket({
      itemId,
      locationId,
      quantity,
      vendorName,
      serialNumber,
      note,
      photo,
      createdBy: req.user?._id
    });

    await repairTicket.save();

    // Create transaction record
    const transaction = new Transaction({
      type: 'REPAIR_OUT',
      itemId,
      fromLocationId: locationId,
      quantity,
      vendorName,
      serialNumber,
      note,
      photo,
      createdBy: req.user?._id
    });

    await transaction.save();

    res.status(201).json({ message: 'Item sent for repair', repairTicket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send item for repair' });
  }
};

export const returnFromRepair = async (req: AuthRequest, res: Response) => {
  try {
    const { repairTicketId, locationId, note } = req.body;

    const repairTicket = await RepairTicket.findById(repairTicketId);
    if (!repairTicket || repairTicket.status !== 'sent') {
      return res.status(404).json({ error: 'Repair ticket not found or already processed' });
    }

    const item = await Item.findById(repairTicket.itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Add stock back
    const locationIndex = item.locations.findIndex(
      loc => loc.locationId.toString() === locationId
    );

    if (locationIndex >= 0) {
      item.locations[locationIndex].quantity += repairTicket.quantity;
    } else {
      item.locations.push({ locationId, quantity: repairTicket.quantity });
    }

    await item.save();

    // Update repair ticket
    repairTicket.status = 'returned';
    repairTicket.returnedDate = new Date();
    await repairTicket.save();

    // Create transaction record
    const transaction = new Transaction({
      type: 'REPAIR_IN',
      itemId: repairTicket.itemId,
      toLocationId: locationId,
      quantity: repairTicket.quantity,
      note,
      createdBy: req.user?._id
    });

    await transaction.save();

    res.json({ message: 'Item returned from repair', repairTicket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to return item from repair' });
  }
};

export const getRepairTickets = async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await RepairTicket.find()
      .populate('itemId', 'name sku')
      .populate('locationId', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repair tickets' });
  }
};