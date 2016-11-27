// Dependencies
const http    = require('http');
const fs      = require('fs');
const path    = require('path');

const io      = require('socket.io'); // websocket
const model   = require('./model.js');

// Config
const PORT = 3000;
const STATIC_PATH = './public';

// Create server and websocket
var server = http.createServer(function(req, res) {
    var url = req.url == '/' ? '/index.html' : req.url;
    var file = path.join(path.resolve(STATIC_PATH), url); // Get file path
    var stream = fs.createReadStream(file); // Get file stream

    stream.on('error', function(error) { // Show 404 if file not found
        res.writeHead(404, 'Not Found');
        res.write('404 File Not Found');
        res.end();
    });

    res.statusCode = 200;
    stream.pipe(res);
});

// Create websocket
var ws = io(server);

ws.on('connection', function(socket) {
    socket.app_invalid_tries = 0;


    socket.on('adduser', function(data, response) {
        model.isValidToken(data.token).then(function() {
            return model.check('username', data.data.username);
        }).then(function() {
            return model.check('email', data.data.email);
        }).then(function() {
            return model.create(data.data);
        }).then(function(doc) {
            response({ success: true, username: doc.username });
        }).catch(function(err) {
            response({ success: false, reason: err });
        });
    });

    socket.on('removeuser', function(data, response) {
        model.isValidToken(data.token).then(function() {
            return model.removeUser(data.id);
        }).then(function(r) {
            response({ success: true });
        }).catch(function(err){
            response({ success: false, reason: err });
        });
    });

    socket.on('updateuser', function(data, response) {
        model.isValidToken(data.token).then(function() {
            return model.updateUser(data.id, data.update);
        }).then(function(r) {
            response({ success: true });
        }).catch(function(err){
            response({ success: false, reason: err });
        });
    });

    socket.on('getAllUsers', function(data, response) {
        model.isValidToken(data.token).then(function() {
            return model.getAllUsers();
        }).then(function(users) {
            response({ success: true, users: users });
        }).catch(function(err) {
            response({ success: false, reason: err });
        })
    });

    socket.on('init_login', function(data, response) {
        model.getToken(data.username, data.ctok).then(function(token) {
            response({ success: true, stok: token.stok, token: token.token });
        }).catch(function(err) {
            response({ success: false, reason: err });
        });
    });

    socket.on('finish_login', function(data, response) {
        model.findToken(data.token).then(function(token) {
            model.get(token.uname).then(function(doc) {
                var hp = doc.password;
                var hall = data.password;


                if (hall === model.sha1(hp + token.stok + token.ctok)) {
                    model.verifyToken(token.token).then(function() {
                        response({ success: true, token: token.token });
                    });
                } else {
                    response({ success: false, reason: 'password and username doesnt match' });
                }
            }).catch(function(err) {
                response({ success: false, reason: err });
            });
        }).catch(function(err) {
            response({ success: false, reason: err });
        });
    });

    socket.on('register', function(data, response) {
        model.check('username', data.username).then(function() {
            return model.check('email', data.email);
        }).then(function() {
            return model.create(data);
        }).then(function(doc) {
            response({ success: true, username: doc.username });
        }).catch(function(err) {
            response({ success: false, reason: err });
        });
    });
});






server.listen(PORT, function() {
    console.log('Server is ready at http://localhost:' + PORT);
});
