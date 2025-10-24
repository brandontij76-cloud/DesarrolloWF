// Receta.js - Modelo con acciones específicas para gestión de recetas médicas

const mongoose = require('mongoose');

const recetaSchema = new mongoose.Schema({
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
  fechaEmision: {
    type: Date,
    required: true
  },
  fechaValidez: {
    type: Date,
    required: true
  },
  
  // 🩺 SECCIÓN DIAGNÓSTICO (Integrado desde el frontend)
  diagnostico: {
    codigoCIE10: {
      type: String,
      default: ''
    },
    descripcion: {
      type: String,
      required: true
    },
    hallazgosClinicos: {
      type: String,
      default: ''
    }
  },
  diagnosticoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Diagnostico',
    default: null
  },
  
  // 💊 SECCIÓN MEDICAMENTOS
  medicamentos: [{
    nombre: {
      type: String,
      required: true
    },
    dosis: {
      type: String,
      required: true
    },
    frecuencia: {
      type: String,
      required: true
    },
    duracion: {
      type: String,
      default: ''
    },
    instruccionesEspeciales: {
      type: String,
      default: ''
    }
  }],
  
  // 📝 INSTRUCCIONES Y NOTAS
  instruccionesGenerales: {
    type: String,
    default: ''
  },
  notasMedico: {
    type: String,
    default: ''
  },
  doctorNombre: {
    type: String,
    required: true
  },
  
  // 📊 ESTADO Y CONTROL
  estado: {
    type: String,
    enum: ['activa', 'expirada', 'cancelada'],
    default: 'activa'
  }
}, {
  timestamps: true
});

// 🔧 MÉTODOS DE INSTANCIA (Acciones específicas)

// 1. Validar si la receta está activa
recetaSchema.methods.estaActiva = function() {
  const hoy = new Date();
  return this.estado === 'activa' && new Date(this.fechaValidez) >= hoy;
};

// 2. Marcar como expirada automáticamente
recetaSchema.methods.marcarComoExpirada = function() {
  const hoy = new Date();
  if (new Date(this.fechaValidez) < hoy && this.estado === 'activa') {
    this.estado = 'expirada';
    return true;
  }
  return false;
};

// 3. Obtener medicamentos formateados
recetaSchema.methods.obtenerMedicamentosFormateados = function() {
  return this.medicamentos.map(med => ({
    medicamento: `${med.nombre} ${med.dosis}`,
    frecuencia: med.frecuencia,
    duracion: med.duracion ? `${med.duracion} días` : 'No especificada',
    instrucciones: med.instruccionesEspeciales || 'Ninguna'
  }));
};

// 4. Generar resumen para impresión
recetaSchema.methods.generarResumen = function() {
  return {
    paciente: `${this.pacienteNombre} ${this.pacienteApellido}`,
    edad: this.pacienteEdad,
    genero: this.pacienteGenero,
    fechaEmision: this.fechaEmision,
    fechaValidez: this.fechaValidez,
    diagnostico: this.diagnostico.descripcion,
    cantidadMedicamentos: this.medicamentos.length,
    estado: this.estado,
    doctor: this.doctorNombre
  };
};

// 🔧 MÉTODOS ESTÁTICOS (Acciones a nivel de colección)

// 1. Buscar recetas por paciente
recetaSchema.statics.buscarPorPaciente = function(pacienteId) {
  return this.find({ pacienteId })
    .sort({ fechaEmision: -1 })
    .populate('diagnosticoId', 'descripcion sintomas tratamiento');
};

// 2. Buscar recetas activas
recetaSchema.statics.obtenerRecetasActivas = function() {
  const hoy = new Date();
  return this.find({
    estado: 'activa',
    fechaValidez: { $gte: hoy }
  }).populate('pacienteId', 'nombre apellido telefono');
};

// 3. Buscar recetas por médico
recetaSchema.statics.buscarPorDoctor = function(doctorNombre) {
  return this.find({ doctorNombre })
    .sort({ fechaEmision: -1 })
    .populate('pacienteId', 'nombre apellido email');
};

// 4. Obtener recetas próximas a expirar
recetaSchema.statics.obtenerProximasAExpirar = function(dias = 7) {
  const hoy = new Date();
  const fechaLimite = new Date();
  fechaLimite.setDate(hoy.getDate() + dias);
  
  return this.find({
    estado: 'activa',
    fechaValidez: {
      $gte: hoy,
      $lte: fechaLimite
    }
  }).populate('pacienteId', 'nombre apellido telefono email');
};

// 5. Estadísticas de recetas
recetaSchema.statics.obtenerEstadisticas = async function() {
  const total = await this.countDocuments();
  const activas = await this.countDocuments({ estado: 'activa' });
  const expiradas = await this.countDocuments({ estado: 'expirada' });
  const canceladas = await this.countDocuments({ estado: 'cancelada' });
  
  const hoy = new Date();
  const expiranEstaSemana = await this.countDocuments({
    estado: 'activa',
    fechaValidez: {
      $gte: hoy,
      $lte: new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
  });
  
  return {
    total,
    activas,
    expiradas,
    canceladas,
    expiranEstaSemana,
    porcentajeActivas: total > 0 ? ((activas / total) * 100).toFixed(1) : 0
  };
};

// 🔧 MIDDLEWARE (Acciones automáticas)

// 1. Actualizar estado antes de guardar
recetaSchema.pre('save', function(next) {
  // Actualizar estado basado en fecha de validez
  if (this.isModified('fechaValidez') || this.isNew) {
    const hoy = new Date();
    if (new Date(this.fechaValidez) < hoy) {
      this.estado = 'expirada';
    }
  }
  next();
});

// 2. Actualizar referencias en paciente cuando se crea una receta
recetaSchema.post('save', async function(doc) {
  try {
    const Paciente = mongoose.model('Paciente');
    await Paciente.findByIdAndUpdate(
      doc.pacienteId,
      { $addToSet: { recetas: doc._id } }
    );
  } catch (error) {
    console.error('Error actualizando referencias del paciente:', error);
  }
});

// 3. Limpiar referencias cuando se elimina una receta
recetaSchema.post('remove', async function(doc) {
  try {
    const Paciente = mongoose.model('Paciente');
    await Paciente.findByIdAndUpdate(
      doc.pacienteId,
      { $pull: { recetas: doc._id } }
    );
  } catch (error) {
    console.error('Error limpiando referencias del paciente:', error);
  }
});

module.exports = mongoose.model('Receta', recetaSchema);