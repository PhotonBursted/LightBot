// Acquire the modules needed to run the script
var Discord = require('discord.js'),
	MusicStream = require('youtube-dl');

// A list of all commands used in the bot. Nice and neat, ain't it?
var commands = [
				{
					name: 'help',
					desc: 'Showing all available commands with usage',
					usage: '{optional: command (e.g. !help q gives all commands starting with q)}',
					callFunction: function(msg, cmd) {
						help(cmd);
					}
				},
				{
					name: 'queue add',
					desc: 'Add a song to queuehuehuehue',
					usage: '{url}',
					callFunction: function(msg, url) {
						addTrack(msg, url); 
					}
				},
				{
					name: 'queue next',
					desc: 'Skip to the next track in the queue',
					usage: '',
					callFunction: function(msg) {
						if(checkPerms(msg, currentTrack)) {
							skipToTrack(currentTrack);
						}
					}
				},
				{
					name: 'queue play',
					desc: 'Plays the queue',
					usage: '',
					callFunction: function(msg) {
						if(!bot.voiceConnection.playing) {
							playQueue();
						} else {
							sendMsg('**[Queue]** Already playing!');
						}
					}
				},
				{
					name: 'queue prev',
					desc: 'Goes to the previous track in the queue',
					usage: '',
					callFunction: function(msg) {
						if(checkPerms(msg, currentTrack)) {
							skipToTrack(currentTrack - 2);
						}
					}
				},
				{
					name: 'queue remove',
					desc: 'Removes a track from queue',
					usage: '{track position in queue}',
					callFunction: function(msg, id) {
						if(checkPerms(msg, id-1)) {
							removeTrack(id);
						}
					}
				},
				{
					name: 'queue show',
					desc: 'Display the contents of the queue',
					usage: '',
					callFunction: function() {
						showQueueContents();
					}
				},
				{
					name: 'queue skipto',
					desc: 'Skip to a certain song',
					usage: '{track position in queue}',
					callFunction: function(msg, id) {
						if(checkPerms(msg, currentTrack)) {
							skipToTrack(id-1);
						}
					}
				},
				{
					name: 'queue stop',
					desc: 'Stop currently playing music',
					usage: '',
					callFunction: function(msg) {
						if(checkPerms(msg, currentTrack)) {
							stopMusic();
						}
					}
				},
				{
					name: 'quit',
					desc: 'Stop the bot entirely',
					usage: '',
					callFunction: function(msg) {
						quit();
					}
				}
			   ];

// All bot related variables are initialized here
var bot = new Discord.Client(),
	botName = '',
	botEmail = '',
	botPassword = '';

// Settings for the channels the bot should act in.
// Change the name properties to the names of the channels the bot should interact with!
var voiceChannel = {
		name: 'MusicBot',
		id: function() {
			return bot.channels.get('name', this.name);
		}
	},
	textChannels = {
		name: ['moosiccontrols'],
		id: function() {
				channelsStr = '';
				
				for(channelName of textChannels.name) {
					channelsStr += bot.channels.get('name', channelName);
				}
				
				return channelsStr;
			}
	};

// Variables for the music queue
var queue = [],
	currentTrack,
	trackTimer;

console.log('[START] Reddy... Steddy...');

// When the bot has logged in, this will fire
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

// Whenever a new message comes in, this fires
bot.on('message', function(msg) {
	// If the message is posted in a channel listed in the textChannels object...
	if(textChannels.id().indexOf(msg.channel.toString()) != -1) {
		// Should it be a command, delete it
		if(msg.author.name != botName && msg.content.indexOf('!') === 0) {
			deleteLastMsg(msg);
		}
		
		var commandExecuted = false;
		// Loop through the commands array to see if the command is valid, then execute its respective function
		for(command of commands) {
			if(msg.content.toLowerCase().indexOf('!'+ command.name) === 0) {
				commands[commands.indexOf(command)].callFunction(msg, msg.content.substring(command.name.length + 2, msg.content.length));
				commandExecuted = true;
			}
		}
		
		// If no suitable function is found, give feedback
		if(msg.content.indexOf('!') === 0 && !commandExecuted) {
			sendMsg('**[ERROR]** Hmm... That command doesn\'t exist unfortunately!')
		}
	}
});

function addTrack(msg, url) {
	// Get info about the url which was issued
	MusicStream.getInfo(url, [], function(err, info) {
		if(err) {
			sendMsg('**[Queue] [ERROR]** Uh-oh! The URL you specified is not suitable....\nCheck spelling mistakes or whether you actually entered the URL');
		} else {
			var trackName = '';
			
			if(url.indexOf('soundcloud.com') > 0) {
				console.log('song: '+ info.uploader +' - '+ info.title);
				console.log('length:', calcSecs(info.duration));
				
				trackName = info.uploader +' - '+ info.title;
			} else if(url.indexOf('youtube.com') > 0) {
				console.log('song: '+ info.title);
				console.log('length:', info.duration);
				
				trackName = info.title;
			} else {
				info.duration = null;
			}
			
			queue.push({
				name: trackName,
				url: url,
				duration: calcSecs(info.duration),
				requester: msg.author.username
			});
			
			if(queue[queue.length - 1].duration == null) {
				sendMsg('**[Queue] [ERROR]** Track __'+ trackName +'__ not added to queue as duration wasn\'t retrievable. Sorreh!');
				console.log('[Queue] [ERROR] Track '+ trackName +' wasn\'t added because duration wasn\'t retrievable');
			}
			sendMsg('**[Queue]** Added to the queue:\n   - Name: *'+ queue[queue.length - 1].name +'*\n   - Length: *'+ formatTime(queue[queue.length - 1].duration) +'*\n   - Position: *#'+ queue.length +'*\n   - Requester: *'+ queue[queue.length - 1].requester +'*');
			console.log('[QUEUE] Added '+ JSON.stringify(queue[queue.length - 1]));
		}
	});
}

function calcSecs(time) {
	// Calculate the amount of seconds of playing time, given the input is separated by :
	var timeArr = time.split(':'),
		secs = 0;
		
	for(i=0; i<timeArr.length; i++) {
		secs += parseInt(timeArr[i]) * Math.pow(60, (timeArr.length - 1 - i));
	}
	
	return secs;
}

function checkPerms(msg, track) {
	if(queue[track] != null) {
		var isAllowed = queue[track].requester == msg.author.username;
		
		if(!isAllowed) {
			sendMsg('**[ERROR]** AY. YOU. Ya can\'t, aight? Aight.');
		}
		
		return isAllowed;
	} else {
		sendMsg('**[ERROR]** Huh. Something went wrong while checking whether you could do that. Better luck next time');
		return false;
	}
}

function deleteLastMsg(msg) {
	// Delete the last message received
	bot.deleteMessage(msg, {wait : 0}, function(error) {
		if(error != null) {
			console.log('[ERROR] [WARNING] Failed to delete message "'+ msg.content +'", because of the following error:\n'+ error);
		}
	});
}

function formatTime(time) {
	var hours = Math.floor(time/3600),
		mins = Math.floor(time/60 - Math.floor(time/3600) * 60),
		secs = Math.floor(time - Math.floor(time/60) * 60);
	
	return hours +':'+ (mins < 10 ? '0'+ mins : mins) +':'+ (secs < 10 ? '0'+ secs : secs);
}

function help(cmd) {
	// Display help for a set of commands
	cmd == null ? cmd = '' : cmd = cmd;
	var output = '**[Help]** Currently configured functions:';
	
	// Loop through all commands, seeing if it starts with the parameter contents
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
	// Plays the queue in order
	if(queue.length > 0) {
		if(currentTrack == null) {
			currentTrack = 0;
		} else {
			currentTrack = (currentTrack + 1) % queue.length;
		}
		// Plays the track specified
		playTrack(currentTrack);
		
		// Sets a timer to make sure it plays completely and is then terminated
		trackTimer = setTimeout(function() {
			toNextTrack()
		}, (queue[currentTrack].duration + 2.5) * 1000);
	} else {
		sendMsg('**[Queue]** Hmm... The queue seems empty. Consider adding some music!');
	}
}

function playTrack(track) {
	// Starts playing the track passed by the parameter
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
	// Make the bot terminate completely
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
	// Delete a track from queue
	if(queue[id-1] == null) {
		sendMsg("**[Queue] [ERROR]** That track doesn't exist");
	} else {
		sendMsg('**[Queue]** Removed track '+ id +' ('+ queue[id-1].name +')');
		console.log('[QUEUE] Removed '+ queue[id-1].name);
		queue.splice(id-1, 1);
	}
}

function sendMsg(msg) {
	// Shortcut for sending a message to the text channel
	bot.sendMessage(bot.channels.get('name', textChannels.name[0]),
					msg
				   );
}

function showQueueContents() {
	// Shows the tracks currently waiting to be played
	var output = 'Current queue:';
	
	if(queue.length > 0) {
		for(i=0; i<queue.length; i++) {
			output += '\n  - #'+ (i + 1) +': *'+ queue[i].name +'* ('+ formatTime(queue[i].duration) +')'; 
		}
	} else {
		output += '\nQueue is empty at the moment... Add new ones by typing !queue add [url]!';
	}
	
	sendMsg(output);
}

function skipToTrack(id) {
	// Makes it easy to skip to a certain track
	currentTrack = (id - 1) % queue.length;
	toNextTrack();
}

function stopMusic() {
	// Stop playing music
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

// Login with LightBot credentials
bot.login(botEmail, botPassword);