const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8100; // Puerto predeterminado

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Configuración de la base de datos
const dbConfig = {
  host: 'db',
  user: 'root',
  password: 'root',
  database: 'solar_db',
};

// Helper para cifrar contraseñas
const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');


// Endpoint para autenticación de usuarios
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = hashPassword(password);

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT id, nombre, rol FROM usuarios WHERE nombre = ? AND contraseña = ?',
      [username, hashedPassword]
    );

    await connection.end();

    if (rows.length > 0) {
      return res.status(200).json({ user: rows[0] });
    } else {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Función para descomponer los bits del estado
function procesarEstados(estado) {
  const nombresEstados = [
    'Conexión de batería',
    'Conexión de inverter',
    'Estado conversor',
    'Estado cargador',
    'Timeout',
    'Conexión ESP32',
  ];
  return nombresEstados.map((nombre, index) => ({
    nombre,
    valor: (estado >> (7 - index)) & 1, // Extrae cada bit
  }));
}

// Función para procesar el estado del inverter
function obtenerEstadoInverter(estado) {
  const estadosInverter = ['Detenido', 'Off-grid', 'Stand-by', 'On-grid'];
  const bitsInverter = estado & 0b11; // Extrae los dos bits menos significativos
  return estadosInverter[bitsInverter];
}

// Endpoint para datos de la página Home
app.get('/api/home', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT irradiancia, potencia, temp_panel_1 AS temperaturaPanel1, 
             temp_panel_2 AS temperaturaPanel2, temp_gabinete AS temperaturaNodo, 
             bateria, rssi, estado
      FROM mediciones
      WHERE nodo_id = 1
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    await connection.end();

    if (rows.length > 0) {
      const data = rows[0];
      data.estadosBooleanos = procesarEstados(data.estado);
      data.estadoInverter = obtenerEstadoInverter(data.estado); // Procesa el estado del inverter
      res.status(200).json(data);
    } else {
      res.status(404).json({ message: 'No se encontraron datos' });
    }
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para datos de potencia e irradiancia de la última hora
app.get('/api/last-hour-data', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    // Obtiene datos de la última hora basado en el último timestamp registrado
    const [rows] = await connection.execute(
      `SELECT timestamp, irradiancia, potencia 
       FROM mediciones 
       WHERE nodo_id = ? AND timestamp >= (
         SELECT MAX(timestamp) - INTERVAL 1 HOUR
         FROM mediciones
         WHERE nodo_id = ?
       )
       ORDER BY timestamp`,
      [1, 1]
    );

    await connection.end();

    if (rows.length > 0) {
      // Retorna los datos con sus timestamps
      const result = rows.map(row => ({
        timestamp: row.timestamp,
        irradiancia: row.irradiancia,
        potencia: row.potencia,
      }));
      res.status(200).json(result);
    } else {
      res.status(404).json({ message: 'No se encontraron datos en la última hora relativa al último timestamp' });
    }
  } catch (error) {
    console.error('Error al obtener datos de la última hora:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para obtener usuarios
app.get('/api/users', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, nombre, rol FROM usuarios');
    await connection.end();
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Endpoint para datos históricos
app.get('/api/historical', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT timestamp, irradiancia, potencia, temp_panel_1, temp_panel_2, temp_gabinete, rssi, bateria, estado FROM mediciones WHERE nodo_id = ? ORDER BY timestamp',
      [1]
    );
    await connection.end();

    const historicalData = rows.map((row) => ({
      fechaHora: row.timestamp,
      irradiancia: row.irradiancia,
      potencia: row.potencia,
      tempPanel1: row.temp_panel_1,
      tempPanel2: row.temp_panel_2,
      tempGabinete: row.temp_gabinete,
      rssi: row.rssi,
      bateria: row.bateria,
      estadoSistema: row.estado,
    }));

    res.status(200).json(historicalData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Endpoint para datos de la página Status
app.get('/api/status', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    // Consultar todos los datos de la tabla
    const [records] = await connection.execute(
      `SELECT timestamp, irradiancia, potencia, temp_panel_1, temp_panel_2, temp_gabinete, estado 
       FROM mediciones 
       WHERE nodo_id = ? 
       ORDER BY timestamp ASC`,
      [1]
    );

    await connection.end();

    if (records.length === 0) {
      return res.status(404).json({ message: 'No se encontraron datos' });
    }

    // Filtrar los datos por hora y minuto, tomando el valor más reciente
    const filteredData = {};
    records.forEach(record => {
      const hour = new Date(record.timestamp).getHours();
      if (!filteredData[hour] || new Date(record.timestamp) > new Date(filteredData[hour].timestamp)) {
        filteredData[hour] = record;
      }
    });

    // Obtener el último estado registrado para procesarlo correctamente
    const ultimoRegistro = records[records.length - 1]; // Último registro en la base de datos
    const estadoProcesado = procesarEstados(ultimoRegistro.estado); // Procesar solo este valor
    const estadoInverter = obtenerEstadoInverter(ultimoRegistro.estado); // Estado inverter del último registro

    // Construir la respuesta con los datos filtrados
    const response = {
      timestamps: Object.keys(filteredData).map(hour => `${hour}h`),
      irradiancia24h: Object.values(filteredData).map(record => record.irradiancia),
      potencia24h: Object.values(filteredData).map(record => record.potencia),
      temperaturasPanel1: Object.values(filteredData).map(record => record.temp_panel_1),
      temperaturasPanel2: Object.values(filteredData).map(record => record.temp_panel_2),
      temperaturasNodo: Object.values(filteredData).map(record => record.temp_gabinete),
      estadosSistema: estadoProcesado,
      estadosInverter: estadoInverter,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Endpoint para agregar un usuario
app.post('/api/users', async (req, res) => {
  const { username, role, password } = req.body;
  const hashedPassword = hashPassword(password);

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      'INSERT INTO usuarios (nombre, rol, contraseña) VALUES (?, ?, ?)',
      [username, role, hashedPassword]
    );
    await connection.end();
    res.status(201).json({ message: 'Usuario agregado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Endpoint para actualizar un usuario
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, role, password } = req.body;

  console.log('Datos recibidos en el backend:', { id, username, role, password });

  if (!username || !role) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  try {
    const userId = parseInt(id, 10);
    const connection = await mysql.createConnection(dbConfig);

    if (password) {
      const hashedPassword = hashPassword(password);
      await connection.execute(
        'UPDATE usuarios SET nombre = ?, rol = ?, contraseña = ? WHERE id = ?',
        [username, role, hashedPassword, userId]
      );
    } else {
      await connection.execute(
        'UPDATE usuarios SET nombre = ?, rol = ? WHERE id = ?',
        [username, role, userId]
      );
    }

    await connection.end();
    res.status(200).json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error en la base de datos:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Solicitud para eliminar usuario con id:', id);

  try {
    const userId = parseInt(id, 10);
    const connection = await mysql.createConnection(dbConfig);

    await connection.execute(
      'DELETE FROM usuarios WHERE id = ?',
      [userId]
    );
    
    await connection.end();
    res.status(200).json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Endpoint para recibir datos IoT (integración con AWS IoT Core)
app.post('/api/iot-data', async (req, res) => {
  try {
    // Suponemos que tu ESP32 envía este JSON:
    // {
    //   nodo_id: 1,
    //   timestamp: 1680000000000,        // en milisegundos
    //   irradiancia: 123.45,
    //   potencia: 67.89,
    //   temp_panel_1: 25.3,
    //   temp_panel_2: 24.8,
    //   temp_gabinete: 26.1,
    //   rssi: -70,
    //   bateria: 3.7,
    //   estado: 5
    // }

    const {
      nodo_id,
      timestamp,
      irradiancia,
      potencia,
      temp_panel_1,
      temp_panel_2,
      temp_gabinete,
      rssi,
      bateria,
      estado
    } = req.body;
  
    console.log('Datos recibidos de IoT:', req.body);

/*     // Crea conexión a MySQL
    const connection = await mysql.createConnection(dbConfig);

    // Inserta en la tabla 'mediciones'
    await connection.execute(
      `INSERT INTO mediciones
         (nodo_id, timestamp, irradiancia, potencia,
          temp_panel_1, temp_panel_2, temp_gabinete,
          rssi, bateria, estado)
       VALUES (?, FROM_UNIXTIME(? / 1000), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nodo_id,
        timestamp,
        irradiancia,
        potencia,
        temp_panel_1,
        temp_panel_2,
        temp_gabinete,
        rssi,
        bateria,
        estado
      ]
    );

    await connection.end(); */

    // Devuelve OK para que AWS IoT Core sepa que se procesó bien
    res.sendStatus(200);

  } catch (error) {
    console.error('Error al insertar datos IoT:', error);
    res.status(500).json({ message: 'Error al guardar datos de IoT' });
  }
});

// Servidor escuchando
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
