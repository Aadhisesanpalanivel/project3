const express = require('express');
const Event = require('../models/Event');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.userId };
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Test route to check MongoDB connection
router.get('/test', async (req, res) => {
    try {
        const count = await Event.countDocuments();
        res.json({ 
            message: 'MongoDB connection is working!',
            eventsCount: count,
            status: 'success'
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'MongoDB connection error',
            error: error.message,
            status: 'error'
        });
    }
});

// Get all events
router.get('/', async (req, res) => {
    try {
        const { search, category, status } = req.query;
        let query = {};

        // Search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Category filter
        if (category) {
            query.category = category;
        }

        // Status filter
        if (status) {
            query.status = status;
        }

        const events = await Event.find(query)
            .populate('createdBy', 'name email')
            .populate('registeredParticipants.user', 'name email')
            .sort({ date: 1 });

        res.json(events);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Create event
router.post('/', async (req, res) => {
    try {
        const eventData = {
            ...req.body,
            createdBy: req.user.id,
            registeredParticipants: []
        };
        const event = await Event.create(eventData);
        res.status(201).json(event);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get single event
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('registeredParticipants.user', 'name email');
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json(event);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update event
router.put('/:id', async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete event
router.delete('/:id', async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Register for event
router.post('/:id/register', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('registeredParticipants.user', 'name');
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if event is full
        if (event.registeredParticipants.length >= event.capacity) {
            return res.status(400).json({ message: 'Event is full' });
        }

        // Check if user is already registered
        if (event.isUserRegistered(req.user.id)) {
            return res.status(400).json({ message: 'Already registered for this event' });
        }

        // Add user to registered participants
        event.registeredParticipants.push({
            user: req.user.id,
            registeredAt: new Date()
        });

        await event.save();

        res.json({ 
            message: 'Successfully registered for event',
            event
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Unregister from event
router.post('/:id/unregister', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('registeredParticipants.user', 'name');
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user is registered
        if (!event.isUserRegistered(req.user.id)) {
            return res.status(400).json({ message: 'Not registered for this event' });
        }

        // Remove user from registered participants
        event.registeredParticipants = event.registeredParticipants.filter(
            participant => participant.user.toString() !== req.user.id.toString()
        );

        await event.save();

        res.json({ 
            message: 'Successfully unregistered from event',
            event
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get user's registered events
router.get('/user/registered', async (req, res) => {
    try {
        const events = await Event.find({
            'registeredParticipants.user': req.user.id
        })
        .populate('createdBy', 'name email')
        .populate('registeredParticipants.user', 'name email')
        .sort({ date: 1 });

        res.json(events);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get events created by user
router.get('/user/created', async (req, res) => {
    try {
        const events = await Event.find({ createdBy: req.user.id })
            .populate('createdBy', 'name email')
            .populate('registeredParticipants.user', 'name email')
            .sort({ date: 1 });

        res.json(events);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
