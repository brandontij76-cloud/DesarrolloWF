const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const Paciente = require("./models/Paciente");
const Receta = require("./models/Receta"); 
const Cita = require("./models/Cita"); 

// Para Mostrar si se importaron bien los modelos 
console.log("✅ Modelo User importado:", User);
console.log("✅ Modelo Paciente importado:", Paciente);
console.log("✅ Modelo Receta importado:", Receta);

const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

// Middleware para procesar datos JSON y formularios
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));
app.use('/Presentation', express.static(path.join(__dirname, "../Presentation")));
app.use('/pantallaPaciente', express.static(path.join(__dirname, "../pantallaPaciente")));

// Base de datos temporal
const USERS = {
  usuario: "1234",
  admin: "adminpass"
};

// Conexión a base de datos Mongo
mongoose.connect("mongodb://127.0.0.1:27017/miLogin", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("conectado a MongoDB"))
.catch(err => console.error("Error al conectar: ", err));

//Ruta para Registrar usuarios 
app.post("/register", async (req, res) => {
  try {
    const { email, password, rol, nombre } = req.body;
    
    if (rol === "paciente") {
      const pacienteExistente = await Paciente.findOne({ email });
      if (!pacienteExistente) {
        return res.status(400).json({ error: "El correo no fue pre-registrado por un doctor. Pídale al doctor que lo agregue antes." });
      }
      if (pacienteExistente.registrado) {
        return res.status(400).json({ error: "Paciente ya registrado. Inicie sesión." });
      }
    }

    const existente = await User.findOne({ email });
    if (existente) {
      return res.status(400).json({ error: "El correo ya fue registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuevoUsuario = new User({
      ...req.body,
      password: hashedPassword,
    });
    await nuevoUsuario.save();

    if (rol === "paciente") {
      await Paciente.findOneAndUpdate({ email }, { registrado: true, user: nuevoUsuario._id });
    }

    res.status(201).json({
      mensaje: "Usuario Creado",
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//Ruta para Iniciar Sesion 
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const usuario = await User.findOne({ email });
    
    if (!usuario) {
      return res.status(401).json({ mensaje: "Usuario no encontrado" });
    }
    
    const esValida = await bcrypt.compare(password, usuario.password);
   
    if (!esValida) {
      return res.status(401).json({ mensaje: "Contraseña Incorrecta" });
    }
    
    console.log("Login exitoso");
    res.json({
      mensaje: "Login Exitoso",
      rol: usuario.rol,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error en el Login" });
  }
});

//Ruta temporal para reset password
app.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const usuario = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );
    
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    res.json({ mensaje: "Contraseña actualizada", email: usuario.email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Ruta para obtener todos los usuarios 
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

// Endpoint para que el doctor agregue un paciente
app.post("/api/doctor/add-paciente", async (req, res) => {
  try {
    const data = req.body;
    if (!data.email) {
      return res.status(400).json({ error: "Se requiere email del paciente" });
    }
    const existing = await Paciente.findOne({ email: data.email });
    if (existing) {
      return res.status(400).json({ error: "Paciente ya pre-registrado" });
    }
    const paciente = new Paciente({ ...data, registrado: false });
    await paciente.save();
    res.status(201).json({ message: "Paciente pre-registrado", paciente });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/doctor/pacientes/:doctorId", async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const pacientes = await Paciente.find({ doctor: doctorId });
    res.json(pacientes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener los pacientes" });
  }
});

// ELIMINA ESTAS RUTAS VIEJAS DE RECETAS - SE MOVIERON AL ROUTER
// app.post("/api/recetas", async (req, res) => { ... });
// app.get("/api/pacientes/:id/recetas", async (req, res) => { ... });

//Rutas para Registrar Pacientes 
app.post("/api/pacientes", async (req, res) => {
  console.log("LLego un nuevo paciente");
  console.log(req.body);

  try {
    const { nombre, apellido, edad, genero, telefono, email, direccion } = req.body;
    
    const existente = await User.findOne({ email });
    if (existente) {
      return res.status(400).json({ error: "El paciente ya fue registrado" });
    }

    const nuevoPaciente = new Paciente({
      nombre,
      apellido,
      edad,
      genero,
      telefono,
      email,
      direccion
    });

    await nuevoPaciente.save();

    res.status(201).json({ mensaje: "Paciente registrado", Paciente: nuevoPaciente });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//Obtener todos Los pacientes 
app.get("/api/pacientes", async (req, res) => {
  console.log("Pacientes Registrados");
  try {
    const pacientes = await Paciente.find();

    console.table(pacientes.map(p => ({
      nombre: p.nombre,
      apellido: p.apellido,
      edad: p.edad,
      email: p.email
    })));

    res.json(pacientes);
  } catch (err) {
    console.error("Error al obtener pacientes:", err.message);
    res.status(500).json({ error: "Error al obtener los pacientes" });
  }
});

// Eliminar Paciente por ID
app.delete('/api/pacientes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'ID invalido' });
    }

    const eliminado = await Paciente.findByIdAndDelete(id);
    if (!eliminado) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    return res.json({ message: 'Paciente eliminado', paciente: eliminado });
  } catch (error) {
    console.error('Error eliminando paciente por id:', error);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

// OBTENER UN PACIENTE SEGUN SU ID
app.get("/api/pacientes/:id", async (req, res) => {
  console.log("Buscando paciente con id:", req.params.id);
  try {
    const paciente = await Paciente.findById(req.params.id);
    if (!paciente) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    res.json(paciente);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar el paciente" });
  }
});

// ACTUALIZAR UN PACIENTE SEGUN SU ID
app.put("/api/pacientes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, edad, genero, telefono, email, direccion } = req.body;

    if (!nombre || !apellido || !edad || !genero || !telefono || !email) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const pacienteActualizado = await Paciente.findByIdAndUpdate(
      id,
      { nombre, apellido, edad, genero, telefono, email, direccion },
      { new: true }
    );

    if (!pacienteActualizado) {
      return res.status(400).json({ error: "Paciente no encontrado" });
    }

    res.status(200).json({
      mensaje: "Paciente actualizado correctamente",
      paciente: pacienteActualizado
    });
  } catch (error) {
    console.error("Error al actualizar el paciente:", error);
    res.status(500).json({ error: "Error al actualizar el paciente" });
  }
});

// IMPORTAR RUTAS DE RECETAS - RUTA CORREGIDA
const recetasRoutes = require('./routes/recetas');
app.use('/api/recetas', recetasRoutes);

const citasRoutes = require('./routes/citas'); 
app.use('/api/citas', citasRoutes); 

// Iniciando El servidor 
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Obtener paciente por email
app.get("/api/pacientes/email/:email", async (req, res) => {
  try {
    const paciente = await Paciente.findOne({ email: req.params.email });
    if (!paciente) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }
    res.json(paciente);
  } catch (error) {
    console.error("Error al buscar paciente por email:", error);
    res.status(500).json({ error: "Error al buscar el paciente" });
  }
});

// Obtener recetas por paciente
app.get("/api/recetas/paciente/:pacienteId", async (req, res) => {
  try {
    const recetas = await Receta.find({ paciente: req.params.pacienteId })
                              .populate('doctor', 'nombre apellido')
                              .sort({ fechaEmision: -1 });
    res.json(recetas);
  } catch (error) {
    console.error("Error al obtener recetas del paciente:", error);
    res.status(500).json({ error: "Error al obtener recetas" });
  }
});

// Obtener citas por paciente
app.get("/api/citas/paciente/:pacienteId", async (req, res) => {
  try {
    const citas = await Cita.find({ paciente: req.params.pacienteId })
                           .populate('doctor', 'nombre apellido')
                           .sort({ fechaCita: 1 });
    res.json(citas);
  } catch (error) {
    console.error("Error al obtener citas del paciente:", error);
    res.status(500).json({ error: "Error al obtener citas" });
  }
});

// Obtener diagnósticos por paciente
app.get("/api/diagnosticos/paciente/:pacienteId", async (req, res) => {
  try {
    const diagnosticos = await Diagnostico.find({ paciente: req.params.pacienteId })
                                         .populate('doctor', 'nombre apellido')
                                         .sort({ fecha: -1 });
    res.json(diagnosticos);
  } catch (error) {
    console.error("Error al obtener diagnósticos del paciente:", error);
    res.status(500).json({ error: "Error al obtener diagnósticos" });
  }
});

// Crear diagnóstico
app.post('/api/diagnosticos', async (req, res) => {
  try {
    if (!req.body || !req.body.pacienteId || !req.body.doctor || !req.body.descripcion) {
      return res.status(400).json({ message: 'pacienteId, doctor y descripcion son requeridos' });
    }
    const diag = await (typeof Diagnostico !== 'undefined'
      ? Diagnostico.create(req.body)
      : Promise.reject(new Error('Modelo Diagnostico no disponible')));
    res.status(201).json(diag);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});
