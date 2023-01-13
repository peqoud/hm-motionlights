// Script uses https://www.npmjs.com/package/iobroker.mytime for Timer handling
// https://www.smarthome-tricks.de/software-iobroker/blockly-grundlagen-trigger/#trigger-zeitplan
// https://www.iobroker.net/docu/index-81.htm?page_id=5809&lang=en#log_8211_Gives_out_the_message_into_log

/* 
Ideen:
- Sensoren nur einschaltne in der definierten Zeit (Stromsparen?)
- 
*/

/*
States for HUE lights:
+) action.on
+) action.brightness
+) action.level
*/
class huelight {
  constructor(id, brightness = 20, level = 0) {
    this.id         = id;
    this.brightness = brightness;
    this.level      = level;
  }
  
  setSwitchLight(status)
  {
    //setState(this.id+'.action.on', status);
    log(this.id+'.action.on = '+ status);
  }
  
  setBrightness(brightness = this.brightness)
  {
    //setState(this.id+'.action.brightness', brightness);
    log(this.id+'.action.brightness = '+ brightness);
  }
  
  setLevel(level = this.level)
  {
    //setState(this.id+'.action.level', level);
    log(this.id+'.action.level = '+ level);
  }
}

/* Array of lights: id, brightness, level. */
let lights = {
	light1: new huelight('hue-extended.0.lights.035-außen_weg_1'   , 20),
	light2: new huelight('hue-extended.0.lights.002-aussen_weg_2'  , 20),
	light3: new huelight('hue-extended.0.lights.001-aussen_weg_3'  , 20)
}

// Wie lange bleiben die Lichter ein?
let LightOnTimeSeconds = 60;  // Time in Seconds
let LightOnTimeMs      = LightOnTimeSeconds * 1000;


// Configuration which lights to switch on
let MotionLightConfig = {
	MotionSensor1Lights: ['light1','light2','light3'],
	MotionSensor2Lights: ['light1','light2']
}

// Bewegungsmelder und Helligkeitssensor Zustände definieren
/*
States:
+) .MOTION
+) .MOTION_DETECTION_ACTIVE
+) .ILLUMINATION
+) .CURRENT_ILLUMINATION

*/
let motionSensor1    = 'hm-rpc.0.000BD569A36E1D.1';
let motionSensor2    = 'hm-rpc.0.0031DD8997AC21.1';
//let brightnessSensor = 'homematic.0.devices.YourDeviceId.CHANNEL.STATE';

// MotionSensor
let brightnessThreshold = 10;

// Zeitfenster (in 24-Stunden-Format)
let MotionSensorActiveStartTime         = '21:24:00'; // Alternative - Astro mit Sonnenuntergang nutzen
let MotionSensorActiveEndTime           = '21:26:00';
var TimerOn = null; // Handler of the Timeout


// Function that turn ON lights
function turnOnLight(light_ids)
{
	for (const light of light_ids){
        log('Turn on ' + light);
		lights[light].setBrightness();
		lights[light].setSwitchLight(true);
    }
}

// Function that turn OFF lights
function turnOffLight(light_ids)
{
	for (const light of light_ids){
        log('Turn off ' + light);
		lights[light].setSwitchLight(false);
    }
}

// Just turn all off
function turnOffAllLight()
{
	for (const light in lights){
        log('Turn off ' + light);
		lights[light].setSwitchLight(false);
    }
}


function TimerOnExpired()
{
	TimerOn = null;
	turnOffAllLight();
	log('Light Timer expired - Switch of all lights.');
}

// Generic Function for handling the Sensor and lights
function MotionHandling(MotionSensor) 
{
	// Switch ON the respective light
	turnOnLight(MotionLightConfig[MotionSensor]);
	
	// Start Common Timer for Lights ON
	if (TimerOn != null) {clearTimeout (TimerOn);}  // Reset Timer if active
	TimerOn = setTimeout(TimerOnExpired, LightOnTimeMs); // Start Timer for switch off
	log('Light Timer Started.');
}

// Light ON Timer expired
//({id: timerLightsOn + '.action', change: "ne"}, function (obj) {
//    if(obj.state.val == 'end') {
//		turnOffAllLight();
//		log('Light Timer expired - Switch of all lights.');
//    }
//});


// Variable for subscriptions
var SubID1 = null;
var SubID2 = null;

// Enable MotionDetection at MotionSensorActiveStartTime
function activate_motionsensors()
{
	// TODO: We can create 1 common ON function for all motionsensor with a regex and use
	// the obj.state.from to get the ID of the trigger sensor

	// TODO: Corner Case - The Sensor detected a Movement, but the "StarTime" was not reached yet
	// Reaching the start time shall check the Sensor input again, to see if movement is going on

	// Motion Event 1 - TODO: On which value shall they trigger??
	SubID1 = on({id: motionSensor1+'.MOTION', change: "any"}, function (obj) {
		log('Sensor 1 MOTION changed to ' + obj.state.val);
		MotionHandling('MotionSensor1Lights');
		
	});
	log("Lights Subscribed to MotionSensors 1");

	// Motion Event 2 - TODO: On which value shall they trigger??
	SubID2 = on({id: motionSensor2+'.MOTION', change: "any"}, function (obj) {
		log('Sensor 2 MOTION changed to ' + obj.state.val);
		MotionHandling('MotionSensor2Lights');
	});
	
    log("Lights Subscribed to MotionSensors 2");
}

/* --------- MAIN ------------ */

/* Wait for Start Time */ 
schedule(`${MotionSensorActiveStartTime.split(':')[1]} ${MotionSensorActiveStartTime.split(':')[0]} * * *`,
         activate_motionsensors ); 		  


/* Wait for dusk */
schedule({astro: "dusk", shift: 0}, async function () {
	log("Sonnuntergang - nothing done");
});

// Switch OFF all lights and MotionSensorActiveEndTime AND disable MotionDetection
schedule({hour:   MotionSensorActiveEndTime.split(':')[0], 
          minute: MotionSensorActiveEndTime.split(':')[1],
		  second: MotionSensorActiveEndTime.split(':')[2]},
		  function () 		  
{
	if (SubID1 != null) {unsubscribe (SubID1);log("Un-Subscribed from MotionSensors 1")};  // unsub if set
	if (SubID2 != null) {unsubscribe (SubID2);log("Un-Subscribed from MotionSensors 2")};  // unsub if set
	
	turnOffAllLight();
	
    log("All lights switched off");
});

// timeToCompare is not given, so the actual time will be used
// If the scripts starts within the active time, enable the sensors
if (compareTime (MotionSensorActiveStartTime, MotionSensorActiveEndTime, 'between') )
{
	// enable sensors
    console.log('Script Started and MotionSensor Enabled');
	activate_motionsensors ();
}
else {
    console.log('Script Started and MotionSensor NOT Enabled');
}
