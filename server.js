
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(3001);

/* 
    to do 
    - create room (live)
    - join romm (live)
*/



io.on('connection', function(socket){
    let user ={
        nom:"",
        message :Array()
    }
    
    socket.emit('message', "hello word"); 
    socket.on('message', message =>{
        user.message.push(message)
        const nom = user.nom
        socket.broadcast.emit("respence",{nom,message})
        console.log(user)
    }); 
    socket.on("nom",nom=>{
        user.nom = nom
        socket.broadcast.emit("new-user", { "nom":nom})
        console.log(nom)
    })

  });