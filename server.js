//By izanbf1803

var express = require("express"),
    app = express(),
    server = require("http").createServer(app),
    io = require("socket.io").listen(server);

server.listen(process.env.PORT || 8080);

function getLocalIP(){
    var os = require('os');
    var interfaces = os.networkInterfaces();
    var addresses = [];
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            var address = interfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    return addresses;
}

console.log("|--------------|");
console.log("| Game Started |");
console.log("|--------------|");
console.log(getLocalIP());
console.log("");

///////////////////////////////////////////////

function Player(_id) {
	this.isMyTurn = false;
	this.nick = undefined;
    this.img = undefined;
	this.room = undefined;
	this.id = _id;
    this.ficha = undefined;
}

function Board() {
	this.movementCount = 0;
    this.rows = [,,,];
    for (var i = 0; i < 3; i++) {
        this.rows[i] = [,,,];
        for (var j = 0; j < 3; j++) {
            this.rows[i][j] = null;
        }
    }
}


var FICHAS = ['x', 'y'];
var clients = {};
var queue = [];
var rooms = [];


var randomRange = function(min, max) { //Random range including min and max as values
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
 

var notifyWinner = function(room, ficha) {
	var winnerID;
	if (ficha != "tie")
		winnerID = rooms[room].users[FICHAS.indexOf(ficha)];
	else
		winnerID = "tie";
	io.sockets.in(room).emit("winner", {
		winner_id: winnerID
	});
};

var checkWinner = function(room, board, ficha) {
	for (var i = 0; i < 3; i++){
		var xCount = 0, yCount = 0;
		for (var j = 0; j < 3; j++){
			if (board.rows[i][j] == ficha)
				xCount++;
			if (board.rows[j][i] == ficha)
				yCount++;

			if (xCount == 3 || yCount == 3) {
				notifyWinner(room, ficha);
				return;
			}
		}
	}

	var diagonalCount = 0;
	for (var i = 0, j = 0; i < 3; i++, j++) {
		if (board.rows[i][j] == ficha)
			diagonalCount++;
	}
	if (diagonalCount == 3) {
		notifyWinner(room, ficha);
		return;
	}

	diagonalCount = 0;
	for (var i = 0, j = 2; i < 3; i++, j--) {
		if (board.rows[i][j] == ficha)
			diagonalCount++;
	}
	if (diagonalCount == 3) {
		notifyWinner(room, ficha);
		return;
	}

	if (board.movementCount == 9)
		notifyWinner(room, "tie");
};

io.sockets.on("connection", function(socket){

    clients[socket.id] = new Player(socket.id);

    socket.on("setNick", function(data){
        var _img;
        if (data.img != undefined)
            _img = data.img.replace(/<|>/g);
        clients[socket.id].nick = data.nick;
        clients[socket.id].img = _img;
    });

    socket.on("join", function(){
        if (clients[socket.id].nick == null)
            return;
        queue[queue.length] = socket.id;
    });

    socket.on("putBox", function(data){
    	if (!clients[socket.id].isMyTurn)
    		return;

        var xy = data.split(',');
        var _room = clients[socket.id].room;

        if (rooms[_room].board.rows[xy[0]][xy[1]] != null)
        	return;

        var ficha = clients[socket.id].ficha;

        rooms[_room].board.rows[xy[0]][xy[1]] = ficha;
        rooms[_room].board.movementCount++;

        checkWinner(_room, rooms[_room].board, ficha);

        var indexOfPlayer = rooms[_room].users.indexOf(socket.id);
        clients[ rooms[_room].users[ indexOfPlayer ^ 1 ] ].isMyTurn = true; //New player enabled
        clients[socket.id].isMyTurn = false; //Old player locked
        var otherPlayerId = clients[rooms[clients[socket.id].room].users[indexOfPlayer ^ 1]].id;
        
        io.sockets.in(_room).emit("switchTurn");

        io.sockets.in(rooms[_room].id).emit("updateBoard", {
            x: xy[0],
            y: xy[1],
            ficha: ficha
        });
    });

    socket.on("disconnect",function(){
        io.sockets.in(clients[socket.id].room).emit("roomClosed");
        index_on_queue = queue.indexOf(socket.id);
        if (index_on_queue != -1)
            queue.splice(index_on_queue, 1);

        delete rooms[clients[socket.id].room];
        delete clients[socket.id];
    });

});

setInterval(function(){ //Connect players in queue
    while (queue.length > 1) {
        var l = queue.length-1;
        var r_id = String(rooms.length);

        rooms[rooms.length] = {
            users: [queue[l-1], queue[l]],
            id: r_id,
            board: new Board()
        };

        io.sockets.connected[queue[l-1]].join(r_id);
        io.sockets.connected[queue[l]].join(r_id);

        clients[io.sockets.connected[queue[l-1]].id].room = r_id;
        clients[io.sockets.connected[queue[l]].id].room = r_id;

        var _players = [], nicks = [];
        nicks[0] = clients[io.sockets.connected[queue[l-1]].id].nick;
        nicks[1] = clients[io.sockets.connected[queue[l]].id].nick;

        if (clients[io.sockets.connected[queue[l-1]].id].img != undefined) //Set img if is avaliable
            _players[0] = nicks[0]+' <img class="profile-img" src="'+clients[io.sockets.connected[queue[l-1]].id].img+'"></img>';
        else
            _players[0] = nicks[0];
        if (clients[io.sockets.connected[queue[l]].id].img != undefined)
            _players[1] = '<img class="profile-img" src="'+clients[io.sockets.connected[queue[l]].id].img+'"></img> '+nicks[1];
        else
            _players[1] = nicks[1];

        clients[io.sockets.connected[queue[l-1]].id].ficha = FICHAS[rooms[r_id].users.indexOf(queue[l-1])];
        clients[io.sockets.connected[queue[l]].id].ficha = FICHAS[rooms[r_id].users.indexOf(queue[l])];
        io.sockets.connected[queue[l-1]].emit("setFicha", clients[io.sockets.connected[queue[l-1]].id].ficha);
        io.sockets.connected[queue[l]].emit("setFicha", clients[io.sockets.connected[queue[l]].id].ficha);

        io.sockets.in(r_id).emit("joinFinished", {
            players: _players
        });

        var randSelection = randomRange(0,1);

        io.sockets.connected[queue[l-randSelection]].emit("yourTurn");
        clients[queue[l-randSelection]].isMyTurn = true;


        queue.splice(queue[l-1], 1);
        queue.splice(queue[l], 1);
    }
},100);