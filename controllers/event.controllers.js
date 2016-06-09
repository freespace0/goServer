var Event = require('mongoose').model('Event'); // collections
var Channel = require('mongoose').model('Channel');
var fs = require('fs');
var path = require('path');
var time = require('time');
exports.listAll = function(request,response,next){
	Event.find({},function(err,events){
		if(err) return next(err);
		else response.json(events);
	});
}

exports.getEvent = function(request,response,next){
	var id = request.query.id;
	Event.findById(id,function(err,event){
		if(err) return next(err);
		else if(!event) response.status(404).send('event not found');
		else{
			var fields = ['title','about','video','channel','location','date_time','picture','picture_large','year_require','faculty_require'];
			if(request.query.stat) fields.push(['visited']);
			var info = {};
			for(var i=0; i<fields.length; i++){
				if(event[fields[i]]){
					if((fields[i]==='year_require'||fields[i]==='faculty_require')){
						if(event[fields[i]].length>0){
							info[fields[i]] = event[fields[i]];
						}
					}
					else{
						info[fields[i]] = event[fields[i]];
					}
				}
			}
			response.json(info);
		}
	});
}

exports.postEvent = function(request,response,next){
	var d = new time.Date().setTimezone('Asia/Bangkok');
	var date = d.getMonth()+'/'+d.getDate()+'/'+d.getFullYear();	
	console.log(d);
	var newEvent = new Event(request.body);
	console.log(newEvent);
	newEvent.visit_per_day.push({});
	newEvent.visit_per_day[0][date]=0;
	newEvent.save(function(err){
		if(err) return next(err);
		else{ 
			var channelId = newEvent.channel;
			var condition = {$push:{}};
			condition.$push.events = newEvent._id;
			Channel.findByIdAndUpdate(channelId,condition,function(err,channel){
				if(err) return next(err);
				else if(!channel) response.status(404).send('channel not found');
				else response.status(201).send(newEvent._id);
			});
		}
	});
}

exports.putEvent = function(request,response,next){
	var id = request.query.id;
	Event.findByIdAndUpdate(id,{
		$set:request.body,
		$currentDate:{lastModified:"Date"}
	},function(err,updatedEvent){
		if(err) return next(err);
		else if(!updatedEvent) response.status(404).send('event not found');
		else response.json("done");
	});
}


var updateDeleteEventToChannel = function(channelId,eventId,response){
	Channel.findById(channelId,function(err,channel){
		if(err) response.send('Something went wrong');
		else if(!channel) response.status(404).send('channel not found');
		else{
			channel.events_bin.push(eventId);
			channel.events.splice(channel.events.indexOf(eventId),1);
			channel.update(channel,function(err){
				if(err) response.send('Something went wrong');
				else response.send('done');
			});
		}
	});
}

exports.deleteEvent = function(request,response,next){
	var id = request.query.id;
	Event.findByIdAndUpdate(id,{
		tokenDelete:true,
		lastModified:Date()
	},function(err,event){
		if (err) return next(err);
		else if(!event) response.send('event not found');
		else updateDeleteEventToChannel(event.channel,id,response);
	});
}


exports.getStat = function(request,response,next){
	var id = request.query.id;
	Event.findById(id,function(err,event){
		if(err) return next(err);
		else{
			if(!event) response.status(404).send("event not found");
			else{
				var info={};
				var fields = ['visited','visit_per_day'];
				for(var i=0;i<fields.length;i++){
					info[fields[i]]=event[fields[i]];
				}
				response.json(info);
			}
		}
	});
}

exports.putStat = function(request,response,next){
	var id = request.query.id;
	var d = new time.Date().setTimezone('Asia/Bangkok');
	var date = d.getMonth()+'/'+d.getDate()+'/'+d.getFullYear();
	Event.findById(id,function(err,event){
		if(err) return next(err);
		else if(!event) response.status(404).send('event not found');
		else{
			event.lastModified = d;
			event.visited+=1;
			if(!event.visit_per_day[event.visit_per_day.length-1].hasOwnProperty(date)){
				event.visit_per_day.push({});
				event.visit_per_day[event.visit_per_day.length-1][date]=1;
			}
			else event.visit_per_day[event.visit_per_day.length-1][date]+=1;
			event.update(event,function(err){
				if(err) return next(err);
				else response.send('done');
			});
		}
	});
}

exports.clear = function(request,response,next){
	var id = request.query.id;
	Event.findByIdAndRemove(id,function(err,event){
		if(err) response.send(err);
		else {
		Channel.findById(event.channel,function(err,channel){
			if(err) response.send('somgthing went wrong');
			else if(!channel) response.send('channel not found');
			else{
				channel.events.splice(channel.events.indexOf(id),1);
				channel.update(channel,function(err){
					if(err) return next(err);
					else response.send('removed:'+id);		
				})
			}
		});
		}
	});
}

exports.newEvent = function(request,response,next){
	Event.find({tokenDelete:{$ne:true}},function(err,events){
		if(err) return next(err);
		else {
			var info = [] ;
			var fields = ['_id','title','picture','location','date_time'] ;
			var index = 0;
			var terminator = (request.query.top) ? (Math.max(0,events.length-request.query.top)) : 0;
			for(var j=events.length-1; j>=terminator;j--){
				info[index] = {};
				for(var i=0; i<fields.length; i++){
					info[index][fields[i]] = events[j][fields[i]];
					}
				index++;
			}
			response.json(info);
		}
	});
}

exports.updateStatperDay = function(request,response,next){
	var d = new time.Date().setTimezone('Asia/Bangkok');
	var date = d.getMonth()+'/'+d.getDate()+'/'+d.getFullYear();
	Event.find({tokenDelete:{$ne:true}},function(err,events){
		events.forEach(function(event){
			if(!event.visit_per_day[event.visit_per_day.length-1].hasOwnProperty(date)){
				event.visit_per_day.push({});
				event.visit_per_day[event.visit_per_day.length-1][date]=0;
				event.update(event,function(err){
					if(err) return next(err);

				});
			}
		});	
		response.send('done');
	});


//		for(var i=0 ;i<events.length;i++){
//			if(!events[i].visit_per_day[events[i].visit_per_day.length-1].hasOwnProperty(date)){
//				events[i].visit_per_day.push({});
//				events[i].visit_per_day[events[i].visit_per_day.length-1][date] = 0;
//				events[i].update(events[i],function(err){
//					if(err) return next(err);					
//				});	
//			}
//		}
//	});
}

var checkhot = function(hot,event){
	if(!hot['first']) hot['first']=event;
	else if(event.momentum>=hot['first'].momentum){
		if(hot['second'])	hot['third'] = hot['second'];
		hot['second'] = hot['first'];
		hot['first'] = event;
	}
	else if(!hot['second'])	hot['second']=event;
	else if(event.momentum>=hot.second.momentum){
		hot['third'] = hot['second'];
		hot['second'] = event;
	}
	else if(!hot['third'] || event.momentum>=hoกกt.third.momentum)	hot['third']=event;
	return hot;
}


exports.updatehotEvent = function(request,response,next){
 	var hot = {};
 	Event.find({tokenDelete:{$ne:true}},function(err,events){
 		for(var i=0;i<events.length;i++){
 			events[i].momentum = 0;
 			var t = Math.max(0,events[i].visit_per_day.length-3);
 			for(var j=events[i].visit_per_day.length-1;j>=t;j--){
 				for(var key in events[i].visit_per_day[j]){
 					events[i].momentum+=events[i].visit_per_day[j][key];
 				}
 			}
 			events[i].update(events[i],function(err){
 				if(err) return next(err);
 			});
 			hot = checkhot(hot,events[i]);
 		}
 		var field = ['_id','title','picture','momentum'];
 		var result={};
 		for(var key in hot){
 			result[key] = {};
 			for(var i=0;i<field.length;i++){
 				result[key][field[i]] = hot[key][field[i]];
 			}
 		}

 		fs.writeFile(path.join(__dirname,'../data/hotEvent.json'),JSON.stringify(result,null,2),function(err,data){
 			if(err) return next(err);
 			else response.send('done');
 		});		
 		
 	});
}



exports.gethotEvent = function(request,response,next){
	response.sendFile(path.join(__dirname,'../data/hotEvent.json'));
}



