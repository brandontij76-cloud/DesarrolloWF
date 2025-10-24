const mongoose = require("mongoose");// importa la librería Mongoose para usar MongoDB desde Node.js
const personSchema = new mongoose.Schema({
  condicionesMedicas: { type: [String], default: [] },
  alergias: { type: String, default: '' },
  medicamentosActuales: { type: String, default: '' },

    nombre:{type:String,required:true}, // nombre obligatorio
    apellido:{type:String,required:true}, // apellidos obligatorios
    edad:{type:Number, required:true, min:0, max:120}, // corregido max a 120
    genero: {type:String,enum:["Masculino","Femenino","Otro"], required: true}, // rol limitado a doctor o paciente
    telefono: {type:String, required:true,match:/^[0-9\\-]+$/}, // solo números y guiones
    email:{type:String,required:true,unique:true},// "email": texto obligatorio y debe ser único
    direccion:{type:String, required:true},
    registrado: { type: Boolean, default: false }, // si el paciente ya creó su usuario
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // referencia al User creado al registrarse
    recetas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Receta' }]
}); 

module.exports = mongoose.model("Paciente",personSchema); //modu...se modelo para que puedas usarlo en otros archivos del proyecto.
