
module.exports = function(app){

	var event = require('../controllers/event.controllers');
	app.get('/listall',event.listAll);		// get info of all event
	app.delete('/event/clear',event.clear);
	app.route('/event')
		.get(event.getEvent)	// get info of event
		.post(event.postEvent)  // create event
		.put(event.putEvent)	// modify event
		.delete(event.deleteEvent);	// delete event
	app.route('/event/stat')
		.get(event.getStat)
		.put(event.putStat);
	app.get('/event/new',event.newEvent);
 	app.get('/event/hot',event.gethotEvent);
 	
 	app.get('/update/perday',event.updateStatperDay);
 	app.get('/update/hot',event.updatehotEvent);

//--------------------------------------------------//
 	app.get('/event/search',event.searchEvent);

 	app.get('/',event.hi);
}	