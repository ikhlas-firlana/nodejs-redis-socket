const socketio = require('socket.io');
const express = require('express');
const pkg = require("./redis");
const bodyParser = require('body-parser'),
    redis = require("redis"),
    http = require('http');

    

async function main(PORT, env) { 
    try {
        client = redis.createClient(env.PORT_REDIS, env.HOST_REDIS);

        await pkg.connect(client);
    
        const app = express();
    
        const server = http.createServer(app);
        server.listen(PORT);
        // const server = app.listen(PORT,() => console.log(`app listening on port ${PORT}!`));
        // console.log(`HOST_REDIS ${env.HOST_REDIS}!`)
        // console.log(`PORT_REDIS ${env.PORT_REDIS}!`)
        const io = socketio(server, {
            transports: [ 'polling' ,'websocket' ],
            serveClient: false,
            pingInterval: 10000,
            pingTimeout: 3000,
            cookie: false
        });
    
        app.use(bodyParser.json());
    
        //set the template engine ejs
        app.set('view engine', 'ejs');
        // app.set('sockerio', io);
    
        //middlewares
        app.use(express.static('public'))
    
        app.get('/', async (req, res) => {
            try {
                res.render('index');
            } catch(e) {
                console.log(e);
                res.status(500);
            }  
        });
    
        // index
        app.get('/mock', async (req, res) => {
            try {
                const hold = await pkg.get(client, 'key');
                console.log(typeof hold, hold);
                res.send();
            } catch(e) {
                console.log(e);
                res.status(500);
            }  
        });
        // get connections
        io.on('connection', (socket) => {
            console.log('New user connected: + :', Object.keys(io.sockets.sockets).length);
            // console.log(count);
    
            //default username
            socket.username = "Anonymous"
    
            //listen on change_username
            socket.on('change_username', (data) => {
                socket.username = data.username
            })
    
            //listen on new_message
            socket.on('new_message', (data) => {
                //broadcast the new message
                console.log(`> ${JSON.stringify(data)}`);
                io.sockets.emit('new_message', {message : data.message, username : socket.username});
            })
    
            //listen on typing
            socket.on('typing', (data) => {
                socket.broadcast.emit('typing', {username : socket.username})
            });
    
            socket.on('disconnect', (reason) => { 
                console.log('Disconnect: '+reason,": ", Object.keys(io.sockets.sockets).length);
            });
    
            socket.on('error', (error) => {
                console.error('Error: ', error);
            });
        });
    
        client.on('message', (channel, message) => {
            console.log("redis channel " + channel + ": " + message);
            io.sockets.emit('new_message', {message : message, username :channel});
        
        });
        client.subscribe('yuhu channel');
    } catch(e) {
        console.error("ERROR Dead ", e);
    }
}

exports.main = main;