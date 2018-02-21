//By izanbf1803

const SERVER_IP = '192.168.1.200';//'<<YOUR NODE SERVER IP>>';
const PORT = '8080';
                                                    //socket connection init
var socket = io('http://'+SERVER_IP+':'+PORT);


$(function(){

    /////////////////// UI //////////////////////////////

    const FICHA_STR = {
        x: '<div class="ficha"><span class="fa fa-times" aria-hidden="true"></span></div>',
        y: '<div class="ficha"><span class="fa fa-circle-o" aria-hidden="true"></span></div>'
    }
    const WINNER_TEXT = {                               //Const var declarations
        winner: 'You are the winner!',
        loser: 'You lose...',
        tie: 'You have tied, well played!'
    }

    var ID;
    var nick;
    var waiting4join = false;
    var time = 5;
    var checkConnectionInterval;    //'Global' variabled
    var connectionErrorTEXT;
    var isMyTurn = false;
    var htmlBoard = new HTMLBoard();
    var ficha;
    var connection_lost_count = 0;

    function HTMLBoard(){  //HTMLBoard class
        this.rows = [,,,];
        for (let i=0; i<this.rows.length; i++){
            this.rows[i] = [,,,];
            for (let j=0; j<this.rows[i].length; j++){
                this.rows[i][j] = undefined;
            }
        }
    }   

    var TOAST = function(text, delay, _class){  //Show toast (like android)
        var toastContent = $('<span><b>'+text+'</b></span>');
        if (_class == undefined)
            Materialize.toast(toastContent, delay, 'rounded');
        else
            Materialize.toast(toastContent, delay, 'rounded msg_'+_class);
        
    };

    var initHTMLBoard = function(board){  //init HTMLBoard object
        for (let i=0; i<3; i++){
            for (let j=0; j<3; j++){
                board.rows[i][j] = $('div#casillas > .casilla[arraypos="'+String(i)+','+String(j)+'"]')[0];
            }
        }
    };

    var UpdateBoard = function(data){  //Set piece html in board
        $(htmlBoard.rows[parseInt(data.x)][parseInt(data.y)]).html(FICHA_STR[data.ficha]);
    };

    var hideAllDivs = function(){  //Hide all divs
        $("div#settings").fadeOut();
        $("div#main>div").fadeOut();
    };

    var connectionError = function(text){  //Notify connection error
        socket.disconnect();
        connectionErrorTEXT = text;
    }

    var checkIMG = function(url) {  //check profile image url
        return /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url);
    }

    var checkConnection = function(){   //Check socket connection, if connection lost, reload page
        if (connection_lost_count < 3) {
            if (socket.connected) {
                connection_lost_count = 0;
            }
            else {
                ++connection_lost_count;
            }
            setTimeout(checkConnection, 1000);
        }
        else {
            $("span#time-interval").html(time);
            checkConnectionInterval = setInterval(function(){
                time--;
                $("#err>span#time-interval").html(time);
            },1000);
            hideAllDivs();
            $("#err-text").html("Can't connect to server");
            if (connectionErrorTEXT != null)
                $("#err-text").html(connectionErrorTEXT);
            $("div#err").fadeIn();
            setTimeout(function(){
                clearInterval(checkConnectionInterval);
                location.reload();
            },2000);
        }
    };

    var setNick = function(__nick){
        _nick = __nick;
        localStorage.nick = _nick;
        socket.emit("setNick", {
            nick: _nick,
            img: localStorage.profileimg
        });
    };

    //Settings
    var loadSettings = function(){  //load Settings from localStorage
        $("div#settings input[type='text']").each(function(){
            var key = $(this).attr("storagekey");
            if (localStorage[key] != undefined && localStorage[key] != null && localStorage[key] != "undefined")
                $(this).val(localStorage[key]);
            $(this).next("label").addClass("active");
        });

        hideAllDivs();
        $("#settings").fadeIn();
    };

    var uploadSettings = function(){  //Check errors and save settings to localStorage
        var toUpload = {};
        var isValid = true;
        var error;
        $("div#settings input[type='text']").each(function(){
            var key = $(this).attr("storagekey");
            toUpload[key] = $(this).val();
            if (toUpload[key].length > parseInt($(this).attr("max-length"))) {
                error = key+" is too long";
                isValid = false;
                return;
            }
        });
        if ($("input#profileImg").val().length > 0 && !checkIMG($("input#profileImg").val())) {
            isValid = false;
            error = "Image URL not valid"
        }
        if (!isValid) {
            TOAST(error, 2000, "danger");
            return;
        }
        for (var i in toUpload) {
            localStorage[i] = toUpload[i];
        }
        hideAllDivs();
        $("#main>#menu").fadeIn();
        TOAST("Settings saved sucessfully", 2000, "success");
    };
    //

    var delToasts = function(){
        $(".toast").each(function(){
            $(this).fadeOut();
        });
    };

    var SETUP = function(){
        initHTMLBoard(htmlBoard);
        if (localStorage.nick != undefined && localStorage.nick != null  && localStorage.nick != "undefined") {
            setNick(localStorage.nick);
            setTimeout(checkConnection, 1000);
        } else {
            hideAllDivs();
            $("#main>#selectNick").fadeIn();
        }
    };

    SETUP(); //SETUP

    function waitingInterval() {
        let index = 0;
        let str = [".","..","..."];
        let interval = setInterval(function(){
            if (!waiting4join)
                clearInterval(interval);
            index++;
            if (index == str.length)
                index = 0;
            $("#search>#dots-interval").html(str[index]);
        }, 500); 
    }

    function joinPVP(){
        ID = socket.id;

        if (waiting4join)
            return;

        waiting4join = true;
        hideAllDivs();
        $("#main>#search").fadeIn();
        $("#search>#search-text").html("Waiting for opponent");

        waitingInterval();

        socket.emit("joinPVP");
    }

    function joinIA(){
        ID = socket.id;

        if (waiting4join)
            return;

        waiting4join = true;
        hideAllDivs();
        $("#main>#search").fadeIn();
        $("#search>#search-text").html("Waiting for IA (server)");

        waitingInterval();

        socket.emit("joinIA");
    }

    $("span.menu-button").click(function(){  //Game menus buttons
        switch ($(this).attr("action")){
            case "pvp":
                joinPVP();
                break;
            case "ia":
                joinIA();
                break;
        }
    });

    $("#nickForm").submit(function(e){
        e.preventDefault();
        TOAST("Nick saved sucessfully", 2000, "success");
        setNick( $("div#selectNick #nickValue").val() );
        hideAllDivs();
        $("#main>#menu").fadeIn();
    });

    $("div.casilla").click(function(){ //Try to do a movement
        if (!isMyTurn) {
            TOAST('Wait for enemy movement...', 1000, 'danger');
            return;
        }

        delToasts();
        socket.emit("putBox", $(this).attr("arraypos"));
    });

    $("#settings-button").click(function(){ //load settings values
        loadSettings();
    });

    $("span#settings-close").click(function(){ //Close settings menu
        hideAllDivs();
        $("#main>#menu").fadeIn();
    });

    $("#settings-form").submit(function(e){ //Save settings changes
        e.preventDefault();
        uploadSettings();
    });

    //////////////// SOCKET EVENTS //////////////////

    socket.on("joinFinished", function(data){  //Matchamking finished, show game div
        $("#search>#search-text").html("Joining lobby");
        waiting4join = false;
        hideAllDivs();
        $("#versus-text").html(data.players[0]+" vs "+data.players[1]);
        $("#main>#game").fadeIn();
    });

    socket.on("switchTurn", function(){  //Switch turn between players
        isMyTurn = !isMyTurn;
        if (isMyTurn)
            TOAST("YOUR TURN", 99999, "success");
        $("div.casilla").toggleClass("no-click");
    });

    socket.on("roomClosed", function(){ //Error, enemy disconnected and game room closed
        connectionError("Enemy disconnected");
    });

    socket.on("yourTurn", function(){  //User starts
        TOAST("YOUR TURN", 99999, "success");
        isMyTurn = true;
        $("div.casilla").toggleClass("no-click");
    });

    socket.on("updateBoard", function(data){  //update board (add new piece)
        UpdateBoard(data);
    });

    socket.on("winner", function(data){     //game over
        if (data.winner_id == "tie")
            $("div#winner > span#winner-text").html(WINNER_TEXT.tie);
        else if (data.winner_id == socket.id)
            $("div#winner > span#winner-text").html(WINNER_TEXT.winner);
        else
            $("div#winner > span#winner-text").html(WINNER_TEXT.loser);

        hideAllDivs();
        $("#main > #winner").fadeIn();

        setTimeout(function(){
            delToasts();
        },200);

        setTimeout(function(){
            location.reload();
        },5000);
    });

    socket.on("setFicha", function(data){
        ficha = FICHA_STR[data];    //Set piece
    });

});