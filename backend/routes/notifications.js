const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { emitToUser } = require('../config/socket');

router.use(auth);

router.get('/', async (req, res) => {
    try {
        const { isRead, page = 1, limit = 20 } = req.query;
        const filter = { recipient: req.userId };
        if (isRead !== undefined) filter.isRead = isRead === 'true';
        const notifications = await Notification.find(filter).populate('sender', 'name role')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
        const total = await Notification.countDocuments(filter);
        const unreadCount = await Notification.countDocuments({ recipient: req.userId, isRead: false });
        res.json({ success: true, data: notifications, unreadCount, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/', async (req, res) => {
    try {
        const notification = new Notification({ ...req.body, sender: req.userId });
        await notification.save();
        emitToUser(req.body.recipient.toString(), 'notification:new', notification);
        res.status(201).json({ success: true, data: notification });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/:id/read', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() }, { new: true });
        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
        res.json({ success: true, data: notification });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/read-all', async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.userId, isRead: false }, { isRead: true, readAt: new Date() });
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
