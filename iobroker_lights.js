// Script uses https://www.npmjs.com/package/iobroker.mytime for Timer handling
// https://www.smarthome-tricks.de/software-iobroker/blockly-grundlagen-trigger/#trigger-zeitplan
// https://www.iobroker.net/docu/index-81.htm?page_id=5809&lang=en#log_8211_Gives_out_the_message_into_log

/* 
Ideen:
- Sensoren nur einschaltne in der definierten Zeit (Stromsparen?)
- 
*/


let lights = {
	light1: 'homematic.0.devices.YourDeviceId.CHANNEL.STATE',
	light2: 'homematic.0.devices.YourDeviceId.CHANNEL.STATE',
	light3: 'homematic.0.devices.YourDeviceId.CHANNEL.STATE',
	light4: 'homematic.0.devices.YourDeviceId.CHANNEL.STATE',
}

// Configuration which lights to switch on
let MotionLightConfig = {
	MotionSensor1Lights: ['light1','light2','light3','light4'],
	MotionSensor2Lights: ['light1','light2']
}

// Bewegungsmelder und Helligkeitssensor Zustände definieren
let motionSensor1    = 'homematic.0.devices.YourDeviceId.CHANNEL.STATE';
let motionSensor2    = 'homematic.0.devices.YourDeviceId.CHANNEL.STATE';
let brightnessSensor = 'homematic.0.devices.YourDeviceId.CHANNEL.STATE';

// MotionSensor
let brightnessThreshold = 10;

// Zeitfenster (in 24-Stunden-Format)
let MotionSensorActiveStartTime         = '17:00:00'; // Alternative - Astro mit Sonnenuntergang nutzen
let MotionSensorActiveEndTime           = '23:00:00';

// Light Configuration
let desiredBrightness  = 20;
let LightOnTimeSeconds = 60;  // Time in Seconds
let LightOnTimeMs = LightOnTimeSeconds * 1000

// Timer configuration
timerLightsOn = 'timers.lighttimer'


// Function that turn ON lights
function turnOnLight(light_ids)
{
	for (const light of light_ids){
        //console.log('Turn on ' + light);
		setState(lights[light_id], {brightness: 100});
    }
}

// Function that turn OFF lights
function turnOffLight(light_id)
{
	for (const light of light_ids){
        //console.log('Turn off ' + light);
		setState(lights[light_id], false);
    }
}

// Just turn all off
function turnOffAllLight()
{
	for (const light of lights){
        //console.log('Turn off ' + light);
		setState(lights[light], false);
    }
}


// Helper function for time / date range detection
function currentDate() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addTime(strTime) {
    var time = strTime.split(':');
    var d    = currentDate();
    d.setHours(time[0]);
    d.setMinutes(time[1]);
    d.setSeconds(time[2]);
    return d;
}
function isTimeInRange(strLower = MotionSensorActiveStartTime, strUpper = MotionSensorActiveEndTime)
{
    var now = new Date();
    var lower = addTime(strLower);
    var upper = addTime(strUpper);
    var inRange = false;
    if (upper > lower) {
        // opens and closes in same day
        inRange = (now >= lower && now <= upper) ? true : false;
    } else {
        // closes in the following day
        inRange = (now >= upper && now <= lower) ? false : true;
    }
    return inRange;
}

// Generic FUnction for handling the Sensor and lights
function MotionHandling(MotionSensor) 
{
	// TODO: Does compareTime() also work ???
	
	// if (compareTime (startTime, endTime, 'between') ) // timeToCompare is not given, so the actual time will be used.
	if (isTimeInRange(strLower, strUpper))
	{
		turnOnLight(MotionLightConfig[MotionSensor]);
		// Start Common Timer for Lights ON
		setState(timerLightsOn + '.start', LightOnTimeMs);
	}
}

// TODO: We can create 1 common ON function for all motionsensor with a regex and use
// the obj.state.from to get the ID of the trigger sensor

// Motion Event 1 - TODO: On which value shall they trigger??
on({id: motionSensor1, change: "any"}, function (obj) {
	log('MotionDetected Sensor 1');
	MotionHandling('MotionSensor1Lights');
	
});

// Motion Event 2 - TODO: On which value shall they trigger??
on({id: motionSensor2, change: "any"}, function (obj) {
	log('MotionDetected Sensor 2');
	MotionHandling('MotionSensor2Lights');
});

// Light ON Timer expired
on({id: timerLightsOn + '.action', change: "ne"}, function (obj) {
    if(obj.state.val == 'end') {
		turnOffAllLight();
		log('Timeout - Switch of all lights.');
    }
});

// Switch OFF all lights and end time
schedule({hour:   MotionSensorActiveEndTime.split(':')[0], 
          minute: MotionSensorActiveEndTime.split(':')[1]},
		  second: MotionSensorActiveEndTime.split(':')[2]},
		  function () 		  
{
	turnOffAllLight();
    log("All lights switched off");
});

