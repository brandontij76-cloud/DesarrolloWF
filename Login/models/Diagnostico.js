const mongoose = require('mongoose');

const diagnosticoSchema = new mongoose.Schema({
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
  fecha: {
    type: Date,
    required: true,
    default: Date.now
  },
  diagnostico: {
    type: String,
    required: true
  },
  tratamiento: {
    type: String,
    default: ''
  },
  observaciones: {
    type: String,
    default: ''
  },
  doctorNombre: {
    type: String,
    required: true
  },
  notasMedico: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Diagnostico', diagnosticoSchema);