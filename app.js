var express=require('express'),
app=express(),
server=require('http').createServer(app),
io=require('socket.io').listen(server),
mongoose=require('mongoose'),
users= {};

server.listen(3000);

mongoose.connect('mongodb://localhost/chat',function(err){
if(err)
{
console.log(err);
}
else
{
console.log('Connected');
}
});

var chatSchema=mongoose.Schema({
nick: String,
msg: String,
created: {type: Date,default: Date.now}
});

var Chat=mongoose.model('Message',chatSchema);

app.get('/',function(req,res){
res.sendfile(__dirname+'/index.html');
});
//------------ Connnection-------------------
io.sockets.on('connection',function(socket){
//------Retrieving msgs-----------------------

var query= Chat.find({});//, function(err,docs){
query.sort('-created').limit(5).exec(function(err,docs){
if(err) throw err;
console.log('Sending old msgs');
socket.emit('load old msgs' , docs);
});

//-------------New User Added-------------------
socket.on('new user',function(data,callback){ 
if(data in users){
callback(false);
}
else{
callback(true);
socket.nickname=data;
users[socket.nickname]=socket;
updateNicknames();
//io.sockets.emit('usernames',nicknames);
}
});

//---------------Send Message---------------------
socket.on('send message',function(data,callback){
		var msg=data.trim();
		if(msg.substr(0,3) =='/w '){
		msg=msg.substr(3);
		var ind=msg.indexOf(' ');
		if(ind !=-1)
		{
				var name=msg.substring(0,ind);
				var msg=msg.substring(ind + 1);
				if(name in users){
				users[name].emit('new message',{msg: msg, nick: socket.nickname}); 
				console.log('whisper');
				}else{
				callback('please enter valid user name');
				}
		} else {
		callback('Error Please Enter message to send whisper');
		} 
		} else{
		//----------------------Saving Chat Msgs--------------
		
		var newMsg=new Chat({msg: msg, nick: socket.nickname});
		newMsg.save(function(err){
		if(err) throw err;
		io.sockets.emit('new message',{msg: msg, nick: socket.nickname}); 
		});
		
		
		// socket.broadcast.emit('new message',data);
		}
		});
//-----------------------Update User Details----------------
function updateNicknames(){
io.sockets.emit('usernames', Object.keys(users));
}
//-----------------------Disconnect Users-------------------
socket.on('disconnect',function(data){
if(!socket.nickname) return;
delete users[socket.nickname];
updateNicknames();
});

});