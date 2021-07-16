let token = '';
let tuid = '';
const twitch = window.Twitch.ext;

//   GAME  VARIABLES 
let player;
let gameLife;
let running = false;
let initial = true;
let blockSpeed = 2;
let speed = 5;
let alive = true;
let diff;
let score;
let num;
let progress;
 
let overlay = document.getElementById("overlay")

//   GAME  REQUESTS 
let requestsForGame = {
  get: createRequestForGame('GET', 'getscore'),
  set: createRequestForGame('POST', 'sendscore', score),
};

//   GAME  SCORE AND LEVEL DIVS 
let scoreboard = {
	score : document.getElementById("score"),
	level : document.getElementById("level"),
}
//   GAME STARTS HERE / STARTS WHEN THE PAGE LOADS
function startGame(){
	gameArea.start();
	init();
}
//   INITIALIZING GAME
function init(){
	gameLife = 0;
	score = 0;
	diff = 20;
	num = 1;
	progress = 0;
	scoreboard.score.innerText = score;
	scoreboard.level.innerText = num;
	player = new component(30,30,"red",gameArea.canvas.width/2-5,gameArea.canvas.height/2-5,function(c){
		if(isKeyDown("shift")){
			speed = 2;  //   SETTING SPEED TO 2 WHEN HOLDING SHIFT
		}
		else{
			speed = 5;//   SETTING SPEED TO 5 WHEN NOT! HOLDING SHIFT
		}
		if(isKeyDown("w")){
			c.y -= speed;
			c.y = clamp(0,gameArea.canvas.height-c.height,c.y);
		}
		if(isKeyDown("s")){
			c.y += speed;
			c.y = clamp(0,gameArea.canvas.height-c.height,c.y);
		}
		if(isKeyDown("d")){
			c.x += speed;
			c.x = clamp(0,gameArea.canvas.width-c.width,c.x);
		}
		if(isKeyDown("a")){
			c.x -= speed;
			c.x = clamp(0,gameArea.canvas.width-c.width,c.x);
		}
	}, "image");
	gameObjects.add(player,2);
	player.update();
}

function gameUpdate(){
	if(gameLife % 10 == 0){
		if(diff >= 90){ // to calculate how fast to level up
			diff = 20;
			num += 1;
			scoreboard.level.innerText = num;
		}
		else{
			diff += .5;
			progress += diff;
		}
	}
	if(progress >= 100){
		for(let i = 0; i < num; i++){
			spawnObject();
		}
		progress = 0;
	}
	if(gameLife % 10 == 0){
		score += 1; // to increase the score by how much every sec
		scoreboard.score.innerText = score;
	}
}

function spawnObject(){
	side = Math.trunc(Math.random() * 4); // this random linked with the bottom cases to show the blocks randomly
	// side = 3
	x=0;
	y=0;
	speedX = 0;
	speedY = 0;
	switch(side){
		case 0:
			x = -20;
			y = Math.trunc(Math.random() * gameArea.canvas.height-20);
			speedX = blockSpeed;
			// ctx.fillStyle = "green";
			break;  // Left Side Blocks 
		case 2:
			x = gameArea.canvas.width;
			y = Math.trunc(Math.random() * gameArea.canvas.height-20);
			speedX = -1 * blockSpeed;
			// ctx.fillStyle = "yellow";
			break; // right Side Blocks 
		case 1:
			x = Math.trunc(Math.random() * gameArea.canvas.width-20);
			y = -20;
			speedY = blockSpeed;
			// ctx.fillStyle = "red";
			break;  // top Side Blocks 
		case 3:
			x = Math.trunc(Math.random() * gameArea.canvas.width-20);
			y = gameArea.canvas.height;
			speedY = -1 * blockSpeed;
			// ctx.fillStyle = "blue";
			break; // bottom Side Blocks 
	}
	obj = new component(60,60,"blue",x,y,function(c){
		if(c.isTouching(player)){  //  if component (player) touch component (obj) set to game lost and stop game
			alive = false;
			running = false;
			overlay.style.display = "flex";
      		// SEND SCORE HERE

			// GameLostSendData() // first type to send data 

			// when game is lost Send Data To Server
			$(function() {
				// when we lose the game
				if(!token) { return twitch.rig.log('Not authorized'); }
				twitch.rig.log('Sending Score To Backend');
				$.ajax(requestsForGame.set);
			
				// listen for incoming broadcast message from our EBS
				// this updates the score but sends it to all users
				twitch.listen('broadcast', function (target, contentType, score) {
					twitch.rig.log('Received Broadcast Score');
					SendScore(score);
				});
			});

			console.log("Game finished with a score of: "+score);
		}
		if(!c.isOnScreen()){
			gameObjects.remove(c);
		}
	}, "blocks");
	obj.speedX = speedX;
	obj.speedY = speedY;
	gameObjects.add(obj,1);
}

function component(width, height, color, x, y, action, type){
	this.width = width;
	this.height = height;
	this.color = color;
	this.x = x;
	this.speedX = 0;
	this.speedY = 0;
	this.y = y;
	this.action = action;
	
	
	if (type == "image") { // if image variable sent set the image to this
		this.img = new Image();
		this.img.src = "./images/giphy.png";
		this.img.onload = () => {
			ctx.drawImage(this.img, this.x, this.y, this.width, this.width);
		};
	}else {
		this.img = new Image();
		this.img.src = "./images/bomb.png";
		this.img.onload = () => {
			ctx.drawImage(this.img, this.x, this.y, this.width, this.width);
		};
	}

	this.update = function(){
		action(this);
		this.x += this.speedX;
		this.y += this.speedY;
		ctx = gameArea.context;
		
		ctx.fillStyle = color; // set the blocks colors
		if (type == "image") { // if image variable sent set the image 
			ctx.drawImage(this.img, this.x, this.y, this.width, this.width);
		}else{
			// ctx.fillRect(this.x, this.y, this.width, this.height);
			ctx.drawImage(this.img, this.x, this.y, this.width, this.width);
		}
		
	}

	this.isTouching = function(other){   
		let yes = true;
		if(other.x + other.width < this.x || this.x + this.width < other.x){
			yes = false;
		}
		if(other.y + other.height < this.y || this.y + this.height < other.y){
			yes = false;
		}
		return yes;
	}
	this.isOnScreen = function(){
		if(this.x + this.width > 0 || this.x < gameArea.canvas.width){
			return true;
		}
		if(this.y + this.height > 0 || this.y < gameArea.canvas.height){
			return true;
		}
		return false;
	}
	this.update();
}

let gameObjects = {
	objects : {},
	add : function(obj, layer){  //  ADDING BLOCKS 
		if(layer in gameObjects.objects){
			gameObjects.objects[layer].push(obj);
		}
		else{
			gameObjects.objects[layer] = new Array();
			gameObjects.objects[layer].push(obj);
		}
	},
	remove : function(obj){ //  REMOVING BLOCKS 
		for(let layer in gameObjects.objects){
			let i = gameObjects.objects[layer].indexOf(obj)
			if(i != -1){
				gameObjects.objects[layer].splice(i,1);
			}
		}
	},
	clear : function(){ //  CLEARS BLOCKS 
		gameObjects.objects = {};
	},
	update : function(){
		let highest = 0;
		for(let layer in gameObjects.objects){
			if(highest < layer){
				highest = layer;
			}
		}
		for(let layer = 0; layer <= highest; layer++){
			if(layer in gameObjects.objects){
				for(let i = 0; i < gameObjects.objects[layer].length; i++){
					gameObjects.objects[layer][i].update();
				}
			}
		}
	},
}

let gameArea = {
	canvas : document.getElementById("canvas"),
	start : function(){
		this.context = this.canvas.getContext("2d");
		this.interval = setInterval(updateGameArea, 20); // UPDATE CANVAS EVERY 20 milisecond
	},
	clear : function(){ //  CLEAR BLOCKS BEFORE GAME STARTSAND PUTTING THE PLAYER IN THE MIDDLE
		this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
	}
}

function updateGameArea() {
	if(running){
		gameLife += 1;
		gameArea.clear();
		gameUpdate();
		gameObjects.update();
	}
}

function clamp(low, high, test) {
	if(test < low){
		return low;
	}
	if(test > high){
		return high;
	}
	return test;
}

function start(){
	gameObjects.clear(); //  RESET GAME AND START AGAIN
	gameArea.clear();
	init();
	alive = true;
	running = true;

	overlay.style.display = "none";
}
  // when game is lost Send Data
// function GameLostSendData () { // first type to send data 
// if(!token) { return twitch.rig.log('Not authorized'); }
// 	twitch.rig.log('Sending Score');
// 	$.ajax(requestsForGame.set); // IF THERE IS A TOKEN SEND GAME SCORE
// };

function createRequestForGame (type, urlName, score) {
  twitch.rig.log( type," : Request", score);
  return {
    type: type,
    url: location.protocol + '//localhost:8081/game/' + urlName,
    success: SendScore,
    error: logError,
    data: {
      "score": score
    }
  };
}

function SendScore (score) {
  $('#score').html(score);  // Got Score From BackEnd Settings It In Game
  twitch.rig.log('Score Updated', score);
}


function setAuth (token) {
  Object.keys(requestsForGame).forEach((req) => {
    twitch.rig.log('Setting auth headers');
    requestsForGame[req].headers = { 'Authorization': 'Bearer ' + token };
  });
}

twitch.onContext(function (context) {
  twitch.rig.log(context);
});

twitch.onAuthorized(function (auth) {
  // save our credentials
  token = auth.token;
  tuid = auth.userId;

  // enable the buttons  IF Authorized
  $('#disabledInputs1').removeAttr('disabled');
  $('#disabledInputs2').removeAttr('disabled');
  $('#disabledInputs3').removeAttr('disabled');
  setAuth(token); // Set Token In Authrization Bearer
  $.ajax(requestsForGame.get); // Get Score From BackEnd
});
function logError(_, error, status) {
  twitch.rig.log('EBS request returned '+status+' ('+error+')');
}

function logSuccess(hex, status) {
  twitch.rig.log('EBS request returned '+hex+' ('+status+')');
}


