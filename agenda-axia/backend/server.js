const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Armazenamento em memória (substitua por banco de dados depois)
let appointments = [];

// Rotas
app.get('/api/available-slots', (req, res) => {
    const { date } = req.query;
    const slots = generateTimeSlots();

    // Filtra slots ocupados
    const bookedSlots = appointments.filter(a => a.date === date);
    const availableSlots = slots.filter(slot => {
        return !bookedSlots.some(booked =>
            (slot.start >= booked.start && slot.start < booked.end) ||
            (slot.end > booked.start && slot.end <= booked.end)
        );
    });

    res.json(availableSlots);
});

app.post('/api/book-appointment', (req, res) => {
    const { date, start, end, client } = req.body;

    // Verifica conflitos
    const hasConflict = appointments.some(a =>
        a.date === date &&
        ((start >= a.start && start < a.end) ||
            (end > a.start && end <= a.end))
    );

    if (hasConflict) {
        return res.status(400).json({ error: 'Horário já reservado' });
    }

    // Adiciona ao "banco de dados"
    appointments.push({ date, start, end, client });

    res.json({ success: true });
});

function generateTimeSlots() {
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
        slots.push(
            { start: `${hour}:00`, end: `${hour}:30` },
            { start: `${hour}:30`, end: `${hour + 1}:00` }
        );
    }
    return slots;
}

const PORT = process.env.PORT || 3001;