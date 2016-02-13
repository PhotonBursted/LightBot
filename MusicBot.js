var express = require('express');
var app = express();
var http = require('http');

app.set('port', process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 3002);
app.set('ip', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");


http.createServer(app).listen(app.get('port') ,app.get('ip'), function () {
    console.log("✔ Express server listening at %s:%d ", app.get('ip'),app.get('port'));
    server();
});

// Botty stuff -------------------------------------------------------------
var Discord = require('discord.js'),
	MusicStream = require('youtube-dl');

var commands = [
				{
					name: 'help',
					desc: 'Showing all available commands with usage',
					usage: '{optional: command (!help q gives all commands starting with q)}',
					callFunction: function(cmd) { help(cmd); }
				},
				{
					name: 'queue add',
					desc: 'Add a song to queuehuehuehue',
					usage: '{url}',
					callFunction: function(url) { addTrack(url); }
				},
				{
					name: 'queue next',
					desc: 'Skip to the next track in the queue',
					usage: '',
					callFunction: function() { toNextTrack(); }
				},
				{
					name: 'queue play',
					desc: 'Plays the queue',
					usage: '',
					callFunction: function() { playQueue(); }
				},
				{
					name: 'queue prev',
					desc: 'Goes to the previous track in the queue',
					usage: '',
					callFunction: function() { toPrevTrack(); }
				},
				{
					name: 'queue remove',
					desc: 'Removes a track from queue',
					usage: '{track position in queue}',
					callFunction: function(id) { removeTrack(id); }
				},
				{
					name: 'queue show',
					desc: 'Display the contents of the queue',
					usage: '',
					callFunction: function() { showQueueContents(); }
				},
				{
					name: 'queue skipto',
					desc: 'Skip to a certain song',
					usage: '{track position in queue}',
					callFunction: function(id) { skipToTrack(id-1); }
				},
				{
					name: 'quit',
					desc: 'Stop the bot entirely',
					usage: '',
					callFunction: function() { quit(); }
				},
				{
					name: 'stop',
					desc: 'Stop currently playing music',
					usage: '',
					callFunction: function() { stopMusic(); }
				}
			   ];
	
var bot = new Discord.Client(),
	botName = 'LightBot',
	voiceChannel = {
		name: 'PCC Radio',
		id: function() {
			return bot.channels.get('name', this.name);
		}
	},
	textChannels = {
		name: ['bot-testgrounds'],
		id: function() {
			channelsStr = '';
			
			for(channelName of textChannels.name) {
				channelsStr += bot.channels.get('name', channelName);
			}
			
			return channelsStr;
		}
	};

console.log('[START] Reddy... Steddy...');

var queue = [],
	currentTrack,
	trackTimer;

bot.on('ready', function() {
	
	bot.joinVoiceChannel(voiceChannel.id());
	console.log('[JOIN] Voice channel joined');
	sendMsg("**[JOIN]** "+ ['Ayyyy look who\'s there!',
							'\\*crashes through wall\\* SOMEONE CALLED?',
							'(hey. psssst. yes you guys, could you uhm.... give me some music to play?)',
							'Yo dawgz!',
							'They told me I could become anything... So I became a Discord experiment'
	][Math.floor(Math.random() * 5)]);
});

bot.on('message', function(msg) {
	if(textChannels.id().indexOf(msg.channel.toString()) != -1) {
		if(msg.author.name != botName && msg.content.indexOf('!') === 0) {
			deleteLastMsg(msg);
		}
		
		for(command of commands) {
			if(msg.content.toLowerCase().indexOf('!'+ command.name) === 0) {
				commands[commands.indexOf(command)].callFunction(msg.content.substring(command.name.length + 2, msg.content.length));
			}
		}
	}
});

function addTrack(url) {
	MusicStream.getInfo(url, [], function(err, info) {
		if(err) {
			sendMsg('**[Queue] [ERROR]** Uh-oh! The URL you specified is not suitable....\nCheck spelling mistakes or whether you actually entered the URL');
		} else {
			var trackName = '';
			
			if(url.indexOf('soundcloud.com') > 0) {
				console.log('song: '+ info.uploader +' - '+ info.title);
				console.log('length:', calcSecs(info.duration));
				
				trackName = info.uploader +' - '+ info.title;
			} else {
				console.log('song: '+ info.title);
				console.log('length:', info.duration);
				
				trackName = info.title;
			}
			
			queue.push({
				name: trackName,
				url: url,
				duration: calcSecs(info.duration) * 1000
			});
			
			sendMsg('**[Queue]** Added to the queue:\n   - Name: *'+ queue[queue.length - 1].name +'*\n   - Length: *'+ (queue[queue.length - 1].duration / 1000) +'s*\n   - Position: *#'+ queue.length +'*');
			console.log('[QUEUE] Added '+ JSON.stringify(queue[queue.length - 1]));
		}
	});
}

function calcSecs(time) {
	var timeArr = time.split(':');
	return parseInt(time[0])*60 + parseInt(time[2]);
}

function deleteLastMsg(msg) {
	bot.deleteMessage(msg, {wait : 0}, function(error) {
		if(error != null) {
			console.log('[ERROR] [WARNING] Failed to delete message "'+ msg.content +'", because of the following error:\n'+ error);
		}
	});
}

function help(cmd) {
	cmd == null ? cmd = '' : cmd = cmd;
	var output = '**[Help]** Currently configured functions:';
	
	for(command of commands) {
		if(command.name.indexOf(cmd) === 0) {
			output += '\n__!'+ command.name +'__: '+ command.desc;
			if(command.usage != '') {
				output += '\n   *Usage: !'+ command.name +' '+ command.usage +'*';
			}
		}
	}
	
	sendMsg(output);
	console.log('[HELP] Displayed help'+ (cmd == '' ? '' : ' for '+ cmd));
}

function playQueue() {
	if(queue.length > 0) {
		if(currentTrack == null) {
			currentTrack = 0;
		} else {
			currentTrack = (currentTrack + 1) % queue.length;
		}
		playTrack(currentTrack);
		
		trackTimer = setTimeout(function() {
			toNextTrack()
		}, queue[currentTrack].duration);
	} else {
		sendMsg('**[Queue]** Hmm... The queue seems empty. Consider adding some music!');
	}
}

function playTrack(track) {
	bot.voiceConnection.playRawStream(
		MusicStream(
			queue[track].url,
			['--extract-audio'],
			{}
		),
		0.25,
		function() {}
	);
	sendMsg('**[Now Playing]** __'+ queue[track].name +'__ **(#'+ (track + 1) +'/'+ queue.length +')**');
	console.log('[Now Playing] '+ queue[track].name);
}

function quit() {
	bot.voiceConnection.destroy();
	sendMsg('**[QUIT]** '+ ['Wait... I need to leave?! IS THIS HOW IT ENDS ;_;',
							'I see how it is. You\'re trying to get rid of me... Well too bad, I\'m breaking up with you first!',
							'cri',
							'\\*runs away in disbelief\\*',
							'Such fired, many hurt, much wow'
	][Math.floor(Math.random() * 5)]);
	console.log('[QUIT] Manual shutdown');
	
	setTimeout(function() {
		process.exit(0);
	}, 500);
}

function removeTrack(id) {
	if(queue[id-1] == null) {
		sendMsg("**[Queue] [ERROR]** That track didn't exist");
	} else {
		sendMsg('**[Queue]** Removed track '+ id +' ('+ queue[id-1].name +')');
		console.log('[QUEUE] Removed '+ queue[id-1].name);
		queue.splice(id-1, 1);
	}
}

function sendMsg(msg) {
	bot.sendMessage(bot.channels.get('name', textChannels.name[0]),
					msg
				   );
}

function showQueueContents() {
	var output = 'Current queue:';
	
	if(queue.length > 0) {
		for(i=0; i<queue.length; i++) {
			output += '\n  - #'+ (i + 1) +': *'+ queue[i].name +'*'; 
		}
	} else {
		output += '\nQueue is empty at the moment... Add new ones by typing !add [url]!';
	}
	
	sendMsg(output);
}

function skipToTrack(id) {
	currentTrack = (id - 1) % queue.length;
	toNextTrack();
}

function stopMusic() {
	bot.voiceConnection.stopPlaying();
	clearTimeout(trackTimer);
	
	sendMsg('**[Queue]** Stopped playing music');
	console.log('[QUEUE] Stopped playing music');
}

function toNextTrack() {
	clearTimeout(trackTimer);
	
	bot.voiceConnection.stopPlaying();
	playQueue();
}

function toPrevTrack() {
	skipToTrack(currentTrack - 2);
	
	bot.voiceConnection.stopPlaying();
	playQueue();
}

// Login with LightBot credentials
bot.login('zghepczi@zetmail.com', 'qmPj6V3uVe8HZvnLk7gCtxsD');