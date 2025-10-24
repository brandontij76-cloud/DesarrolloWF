// models/Cita.js
const mongoose = require('mongoose');

const citaSchema = new mongoose.Schema({
  pacienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paciente',
    required: true
  },
  pacienteNombre: {
    type: String,
    required: true
  },
  pacienteApellido: {
    type: String,
    required: true
  },
  pacienteEdad: {
    type: Number,
    required: true
  },
  pacienteGenero: {
    type: String,
    required: true
  },
  pacienteEmail: {
    type: String,
    required: true
  },
  fechaCita: {
    type: Date,
    required: true
  },
  horaCita: {
    type: String,
    required: true
  },
  motivo: {
    type: String,
    default: ''
  },
  estado: {
    type: String,
    enum: ['programada', 'completada', 'cancelada', 'reprogramada'],
    default: 'programada'
  },
  doctorNombre: {
    type: String,
    default: ''
  },
  notas: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Cita', citaSchema);