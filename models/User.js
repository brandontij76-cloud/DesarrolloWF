const mongoose = require("mongoose");// importa la librería Mongoose para usar MongoDB desde Node.js
const userSchema = new mongoose.Schema({// crea un esquema (plantilla-tabla) para los documentos de usuario
    nombre:{type:String,required:true},// campo "nombre": texto y obligatorio
    email:{type:String,required:true,unique:true},// "email": texto obligatorio y debe ser único
    password:{type:String,required:true},// "password": texto obligatorio
    rol:{type:String,enum:["doctor","paciente"], required: true},// "rol": solo "doctor" o "paciente", obligatorio
    historial:[{fecha:String,descripcion:String}], // "historial": arreglo de objetos con fecha y descripción
    medicina:[{nombre:String,dosis:String}] //// "medicina": arreglo de objetos con nombre y dosis
});

//mongoose.model("User",userSchema); Crea un modelo llamado user basado en la plantilla userSchema
module.exports = mongoose.model("User",userSchema); //module.exports= Exporta ese modelo para que puedas usarlo en otros archivos del proyecto.
