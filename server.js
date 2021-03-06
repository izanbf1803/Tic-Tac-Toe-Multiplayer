//By izanbf1803

var express = require("express"),
    app = express(),
    server = require("http").createServer(app),
    io = require("socket.io").listen(server),
    execSync = require("child_process").execSync;

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
        this.rows[i] = [,,];
        for (var j = 0; j < 3; j++) {
            this.rows[i][j] = null;
        }
    }
}


var FICHAS = ['x', 'y'];
var clients = {};
var pvp_queue = [];
var ia_queue = [];
var pvp_rooms = [];
var ia_rooms = [];
var room_id = 0;


var randomRange = function(min, max) { //Random range including min and max as values
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
 

var notifyWinner = function(r_id, ficha) {
    if (r_id[0] == 'P') { // PVP
        var winnerID;
        if (ficha != "tie")
            winnerID = pvp_rooms[r_id].users[FICHAS.indexOf(ficha)];
        else
            winnerID = "tie";
        io.sockets.in(r_id).emit("winner", {
            winner_id: winnerID
        });
    }
    else if (r_id[0] == 'I') { // IA
        var winnerID;
        if (ficha == "tie")
            winnerID = "tie";
        else if (ficha == FICHAS[0])
            winnerID = ia_rooms[r_id].user;
        else
            winnerID = -1;
        io.sockets.in(r_id).emit("winner", {
            winner_id: winnerID
        });
    }
};

var checkWinner = function(r_id, board, ficha, simulation) {
    for (var i = 0; i < 3; i++){
        var xCount = 0, yCount = 0;
        for (var j = 0; j < 3; j++){
            if (board.rows[i][j] == ficha)
                xCount++;
            if (board.rows[j][i] == ficha)
                yCount++;

            if (xCount == 3 || yCount == 3) {
                if (!simulation)
                    notifyWinner(r_id, ficha);
                return ficha;
            }
        }
    }

    var diagonalCount = 0;
    for (var i = 0, j = 0; i < 3; i++, j++) {
        if (board.rows[i][j] == ficha)
            diagonalCount++;
    }
    if (diagonalCount == 3) {
        if (!simulation)
            notifyWinner(r_id, ficha);
        return ficha;
    }

    diagonalCount = 0;
    for (var i = 0, j = 2; i < 3; i++, j--) {
        if (board.rows[i][j] == ficha)
            diagonalCount++;
    }
    if (diagonalCount == 3) {
        if (!simulation)
            notifyWinner(r_id, ficha);
        return ficha;
    }

    if (board.movementCount == 9) {
        if (!simulation)
            notifyWinner(r_id, "tie");
        return "tie";
    }

    return null;
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

    socket.on("joinPVP", function(){
        if (clients[socket.id].nick == null)
            return;
        pvp_queue.push(socket.id);
    });

    socket.on("joinIA", function(){
        if (clients[socket.id].nick == null)
            return;
        ia_queue.push(socket.id);
    });

    socket.on("putBox", function(data){
        if (!clients[socket.id].isMyTurn)
            return;

        var xy = data.split(',');
        var r_id = clients[socket.id].room;

        if (r_id[0] == 'P') { // PVP
            if (pvp_rooms[r_id].board.rows[xy[0]][xy[1]] != null)
                return;

            var ficha = clients[socket.id].ficha;

            pvp_rooms[r_id].board.rows[xy[0]][xy[1]] = ficha;
            pvp_rooms[r_id].board.movementCount++;

            if (checkWinner(r_id, pvp_rooms[r_id].board, ficha, false) == null) {
                var indexOfPlayer = pvp_rooms[r_id].users.indexOf(socket.id);
                clients[ pvp_rooms[r_id].users[ indexOfPlayer ^ 1 ] ].isMyTurn = true; //New player enabled
                clients[socket.id].isMyTurn = false; //Old player locked
                var otherPlayerId = clients[pvp_rooms[clients[socket.id].room].users[indexOfPlayer ^ 1]].id;
                
                io.sockets.in(r_id).emit("switchTurn");

                io.sockets.in(pvp_rooms[r_id].id).emit("updateBoard", {
                    x: xy[0],
                    y: xy[1],
                    ficha: ficha
                });
            }
        }
        else if (r_id[0] == 'I') { // IA
            if (ia_rooms[r_id].board.rows[xy[0]][xy[1]] != null)
                return;

            var ficha = clients[socket.id].ficha;

            ia_rooms[r_id].board.rows[xy[0]][xy[1]] = ficha;
            ia_rooms[r_id].board.movementCount++;

            if (checkWinner(r_id, ia_rooms[r_id].board, ficha, false) == null) {
                clients[socket.id].isMyTurn = false; //Old player locked

                io.sockets.connected[socket.id].emit("switchTurn");
                io.sockets.connected[socket.id].emit("updateBoard", {
                    x: xy[0],
                    y: xy[1],
                    ficha: ficha
                });

                IA_turn(socket, r_id, null);
            }
        }
    });

    socket.on("disconnect",function(){
        io.sockets.in(clients[socket.id].room).emit("roomClosed");
        index_on_pvp_queue = pvp_queue.indexOf(socket.id);
        if (index_on_pvp_queue != -1)
            pvp_queue.splice(index_on_pvp_queue, 1);

        delete pvp_rooms[clients[socket.id].room];
        delete clients[socket.id];
    });

});

function pvp_queue_serve(){ //Connect players in pvp_queue
    while (pvp_queue.length > 1) {
        var l = 1;
        var r_id = "PVP"+String(room_id++);

        pvp_rooms[r_id] = {
            users: [pvp_queue[l-1], pvp_queue[l]],
            id: r_id,
            board: new Board()
        };

        io.sockets.connected[pvp_queue[l-1]].join(r_id);
        io.sockets.connected[pvp_queue[l]].join(r_id);

        clients[io.sockets.connected[pvp_queue[l-1]].id].room = r_id;
        clients[io.sockets.connected[pvp_queue[l]].id].room = r_id;

        var _players = [], nicks = [];
        nicks[0] = clients[io.sockets.connected[pvp_queue[l-1]].id].nick;
        nicks[1] = clients[io.sockets.connected[pvp_queue[l]].id].nick;

        if (clients[io.sockets.connected[pvp_queue[l-1]].id].img != undefined) //Set img if is avaliable
            _players[0] = nicks[0]+' <img class="profile-img" src="'+clients[io.sockets.connected[pvp_queue[l-1]].id].img+'"></img>';
        else
            _players[0] = nicks[0];
        if (clients[io.sockets.connected[pvp_queue[l]].id].img != undefined)
            _players[1] = '<img class="profile-img" src="'+clients[io.sockets.connected[pvp_queue[l]].id].img+'"></img> '+nicks[1];
        else
            _players[1] = nicks[1];

        clients[io.sockets.connected[pvp_queue[l-1]].id].ficha = FICHAS[pvp_rooms[r_id].users.indexOf(pvp_queue[l-1])];
        clients[io.sockets.connected[pvp_queue[l]].id].ficha = FICHAS[pvp_rooms[r_id].users.indexOf(pvp_queue[l])];
        io.sockets.connected[pvp_queue[l-1]].emit("setFicha", clients[io.sockets.connected[pvp_queue[l-1]].id].ficha);
        io.sockets.connected[pvp_queue[l]].emit("setFicha", clients[io.sockets.connected[pvp_queue[l]].id].ficha);

        io.sockets.in(r_id).emit("joinFinished", {
            players: _players
        });

        var randSelection = randomRange(0,1);

        io.sockets.connected[pvp_queue[l-randSelection]].emit("yourTurn");
        clients[pvp_queue[l-randSelection]].isMyTurn = true;

        pvp_queue.shift();
        pvp_queue.shift();
    }
}

function ia_queue_serve(){
    while (ia_queue.length > 0) {
        var r_id = "IA"+String(room_id++);
        var socket = io.sockets.connected[ia_queue[0]];

        ia_rooms[r_id] = {
            user: ia_queue[0],
            id: r_id,
            board: new Board()
        };

        socket.join(r_id);

        clients[socket.id].room = r_id;

        var nick = clients[socket.id].nick;
        var _players = [nick, "IA"];

        if (clients[socket.id].img != undefined) // Set img if is avaliable
            _players[0] += ' <img class="profile-img" src="'+clients[socket.id].img+'"></img>';

        clients[socket.id].ficha = FICHAS[0];
        socket.emit("setFicha", clients[socket.id].ficha);

        socket.emit("joinFinished", {
            players: _players
        });

        var randSelection = randomRange(0,1);

        if (randSelection) {
            socket.emit("yourTurn");
            clients[socket.id].isMyTurn = true;
        }
        else {
            //var x = [0, 2][randomRange(0, 1)];
            //var y = [0, 2][randomRange(0, 1)];
            //IA_turn(socket, r_id, [x, y]);
            IA_turn(socket, r_id, null);
        }

        ia_queue.shift();
    }
}

function IA_move(socket, r_id, move)
{
    ia_rooms[r_id].board.rows[move[0]][move[1]] = FICHAS[1];
    ia_rooms[r_id].board.movementCount++;

    if (checkWinner(r_id, ia_rooms[r_id].board, FICHAS[1], false) == null) {
        clients[socket.id].isMyTurn = true; //Old player unlocked

        socket.emit("switchTurn");
        socket.emit("updateBoard", {
            x: move[0],
            y: move[1],
            ficha: FICHAS[1]
        });
    }
}

function IA_turn(socket, r_id, move) {
    if (move != null) {
        IA_move(socket, r_id, move);
    }
    else {
        var room = ia_rooms[r_id];
        var board_str = "";

        for (var x = 0; x < 3; ++x) {
            for (var y = 0; y < 3; ++y) {
                board_str += (room.board.rows[x][y] == null ? '-' : room.board.rows[x][y]);
            }
        }

        var result = execSync("minimax.exe " + board_str).toString();
        // console.log("=>"+board_str);
        // console.log("<="+result);
        IA_move(socket, r_id, [parseInt(result[0]), parseInt(result[1])]);
    }
}

setInterval(pvp_queue_serve, 1000);
setInterval(ia_queue_serve, 1000);