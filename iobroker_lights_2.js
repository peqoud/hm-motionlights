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
    setState(this.id+'.action.on'), status);
    log(this.id+'.action.on = '+ status);
  }
  
  setBrightness(level = this.brightness)
  {
    setState(this.id+'.action.brightness'), level);
    log(this.id+'.action.brightness = '+ status);
  }
  
  setLevel(level = this.level)
  {
    setState(this.id+'.action.level'), level);
    log(this.id+'.action.level = '+ status);
  }
}

/* Array of lights */
let lights = {
	light1: new huelight('hue-extended.0.lights.035-außen_weg_1'   , 20),
	light2: new huelight('hue-extended.0.lights.002-aussen_weg_2'  , 20),
	light3: new huelight('hue-extended.0.lights.001-aussen_weg_3'  , 20)
}

let LightOnTimeSeconds = 60;  // Time in Seconds
let LightOnTimeMs = LightOnTimeSeconds * 1000;


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
//let motionSensor2    = 'homematic.0.devices.YourDeviceId.CHANNEL.STATE';
//let brightnessSensor = 'homematic.0.devices.YourDeviceId.CHANNEL.STATE';

// MotionSensor
let brightnessThreshold = 10;

// Zeitfenster (in 24-Stunden-Format)
let MotionSensorActiveStartTime         = '17:00:00'; // Alternative - Astro mit Sonnenuntergang nutzen
let MotionSensorActiveEndTime           = '23:00:00';
var TimerOn = null; // Handler of the Timeout


// Function that turn ON lights
function turnOnLight(light_ids)
{
	for (const light of light_ids){
        log('Turn on ' + light);
		lights[light_id].setBrightness());
		lights[light_id].setSwitchLight(true);
    }
}

// Function that turn OFF lights
function turnOffLight(light_id)
{
	for (const light of light_ids){
        log('Turn off ' + light);
		lights[light_id].setSwitchLight(false);
    }
}

// Just turn all off
function turnOffAllLight()
{
	for (const light of lights){
        log('Turn off ' + light);
		lights[light_id].setSwitchLight(false);
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
	if (TimerOn != null) {clearTimeout (TimerOn));}  // Reset Timer if active
	TimerOn = setTimeout(TimerOnExpired(), LightOnTimeMs); // Start Timer for switch off
	log('Light Timer Started.');
}

// Light ON Timer expired
on({id: timerLightsOn + '.action', change: "ne"}, function (obj) {
    if(obj.state.val == 'end') {
		turnOffAllLight();
		log('Light Timer expired - Switch of all lights.');
    }
});

// Enable MotionDetection at MotionSensorActiveStartTime
schedule({hour:   MotionSensorActiveStartTime.split(':')[0], 
          minute: MotionSensorActiveStartTime.split(':')[1]},
		  second: MotionSensorActiveStartTime.split(':')[2]},
		  function () 		  
{
	// TODO: We can create 1 common ON function for all motionsensor with a regex and use
	// the obj.state.from to get the ID of the trigger sensor

	// TODO: Corner Case - The Sensor detected a Movement, but the "StarTime" was not reached yet
	// Reaching the start time shall check the Sensor input again, to see if movement is going on

	// Motion Event 1 - TODO: On which value shall they trigger??
	SubID1 = on({id: motionSensor1+'MOTION', change: "any"}, function (obj) {
		log('MotionDetected Sensor 1');
		MotionHandling('MotionSensor1Lights');
		
	});
	log("Lights Subscribed to MotionSensors 2");

	// Motion Event 2 - TODO: On which value shall they trigger??
	// SubID2 = on({id: motionSensor2, change: "any"}, function (obj) {
		// log('MotionDetected Sensor 2');
		// MotionHandling('MotionSensor2Lights');
	// });
	
    // log("Lights Subscribed to MotionSensors 2");
});


schedule({astro: "dusk", shift: 0}, async function () {
	log("Sonnuntergang");
});

// Switch OFF all lights and MotionSensorActiveEndTime  AND disable MotionDetection
schedule({hour:   MotionSensorActiveEndTime.split(':')[0], 
          minute: MotionSensorActiveEndTime.split(':')[1]},
		  second: MotionSensorActiveEndTime.split(':')[2]},
		  function () 		  
{
	unsubscribe(SubID1);
	unsubscribe(SubID2);
	log("Lights Un-Subscribed from MotionSensors");
	turnOffAllLight();
	
    log("All lights switched off");
});

