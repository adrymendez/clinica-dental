import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let citas = [];

// 🔹 Obtener todas las citas
app.get('/api/citas', (req, res) => {
    res.json(citas);
});

// 🔹 Guardar nueva cita
app.post('/api/citas', (req, res) => {
    const nuevaCita = {
        id: Date.now(),
        ...req.body
    };

    citas.push(nuevaCita);

    res.json({
        mensaje: 'Cita guardada',
        id: nuevaCita.id
    });
});

// 🔹 Eliminar cita
app.delete('/api/citas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    citas = citas.filter(c => c.id !== id);
    res.json({ mensaje: 'Cita eliminada' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});