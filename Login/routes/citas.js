// routes/citas.js
const express = require('express');
const router = express.Router();
const Cita = require('../models/Cita');

// GET - Obtener todas las citas
router.get('/', async (req, res) => {
  try {
    const citas = await Cita.find().sort({ fechaCita: 1, horaCita: 1 });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener cita por ID
router.get('/:id', async (req, res) => {
  try {
    const cita = await Cita.findById(req.params.id);
    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json(cita);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Crear nueva cita
router.post('/', async (req, res) => {
  try {
    
    // Normalizar fechaCita (guardar UTC para evitar desfase por zona horaria)
    const body = { ...req.body };
    if (typeof body.fechaCita === 'string') {
      const s = body.fechaCita.trim();
      let y,m,d;
      if (s.includes('-')) { [y,m,d] = s.split('-').map(Number); }
      else { const parts = s.split('/').map(Number); d=parts[0]; m=parts[1]; y=parts[2]; }
      body.fechaCita = new Date(Date.UTC(y, (m||1)-1, d||1));
    }
    const nuevaCita = new Cita(body);
    
    const citaGuardada = await nuevaCita.save();
    res.status(201).json(citaGuardada);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT - Actualizar cita
router.put('/:id', async (req, res) => {
  try {
    const citaActualizada = await Cita.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!citaActualizada) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json(citaActualizada);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE - Eliminar cita
router.delete('/:id', async (req, res) => {
  try {
    const citaEliminada = await Cita.findByIdAndDelete(req.params.id);
    if (!citaEliminada) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json({ message: 'Cita eliminada correctamente', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener citas por paciente
router.get('/paciente/:pacienteId', async (req, res) => {
  try {
    const citas = await Cita.find({ pacienteId: req.params.pacienteId }).sort({ fechaCita: 1 });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener citas por fecha
router.get('/fecha/:fecha', async (req, res) => {
  try {
    const fecha = new Date(req.params.fecha);
    const siguienteFecha = new Date(fecha);
    siguienteFecha.setDate(siguienteFecha.getDate() + 1);
    
    const citas = await Cita.find({
      fechaCita: {
        $gte: fecha,
        $lt: siguienteFecha
      }
    }).sort({ horaCita: 1 });
    
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;