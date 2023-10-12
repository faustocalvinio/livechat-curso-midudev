const dotenv = require('dotenv');
const express = require('express');
const logger = require('morgan');
const { createClient } = require('@libsql/client');
const { Server } = require('socket.io');
const  { createServer } = require('http'); 

const port = process.env.PORT || 3000;

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server,{
    connectionStateRecovery:{}
});

const db = createClient({
    url: 'libsql://curso-live-chat-faustocalvinio.turso.io',
    authToken: process.env.DB_TOKEN
});
  
// const test = async () => {
//     await db.execute(`
//     CREATE TABLE IF NOT EXISTS messages (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       content TEXT,
//       user TEXT
//     )
//   `)
// }


// test();

io.on('connection', async (socket) => {
    console.log('a user has connected!')
  
    socket.on('disconnect', () => {
      console.log('an user has disconnected')
    })
  
    socket.on('chat message', async (msg) => {
      let result
      const username = socket.handshake.auth.username ?? 'anonymous'
      console.log({ username })
      try {
        result = await db.execute({
          sql: 'INSERT INTO messages (content, user) VALUES (:msg, :username)',
          args: { msg, username }
        })
      } catch (e) {
        console.error(e)
        return
      }
  
      io.emit('chat message', msg, result.lastInsertRowid.toString(), username)
    })

    if (!socket.recovered) { // <- recuperase los mensajes sin conexión
      try {
        const results = await db.execute({
          sql: 'SELECT id, content, user FROM messages WHERE id > ?',
          args: [socket.handshake.auth.serverOffset ?? 0]
        })
  
        results.rows.forEach(row => {
          socket.emit('chat message', row.content, row.id.toString(), row.user)
        })
      } catch (e) {
        console.error(e)
      }
    }
});

app.use(logger('dev'));

app.route('/').get((req, res) => {   
        
    res.sendFile(process.cwd() + '/client/index.html');       
   
});

server.listen(port);

console.log('Hola mundo en consola');