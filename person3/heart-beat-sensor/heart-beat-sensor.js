// Require AWS IoT Device SDK
const awsIoT = require('aws-iot-device-sdk');

// Require crypto for random numbers generation
const crypto = require('crypto');

// Load the endpoint from file
const endpointFile = require('/home/ec2-user/environment/endpoint.json');

// Fetch the deviceName from the folder name
const deviceName = __dirname.split('/').pop();

// Topic names to subscribe too.
const scalable = 'scalable/';
const sinkTopic = scalable + 'sink/';

const currentnodeTopic = scalable + deviceName;
const broadcastTopic = scalable + 'broadcast/';

var nextnodeTopic = scalable + 'bodytemperature/';
var backtopic='backresponseto/'+deviceName
//var dic = {'blood pressure':0,'blood oxygen':1, "Glucose":2,"ph level":3,"body temperature":4,"motion":5};
var heartbeatbodytemperature={tonode:"bodytemperature",deviceid:"body-temperature-sensor", iftonodework:true, id:"heartbeat",distonode:2,distosink:2,tonodehop:1};
var heartbeatBloodPHLevel={tonode:"Bloodphlevel",deviceid:"Blood-pH-level-sensor", iftonodework:true, id:"heartbeat",distonode:2,distosink:2.1,tonodehop:1};
var nearnodetable=[heartbeatBloodPHLevel,heartbeatbodytemperature];
let currentnodetable={ifnodework:true, id:"heartbeat",distosink:2.2,tonodehop:1};
function compare(property,prop1,prop2){
         return function(obj1,obj2){
             var value1 = obj1[property]+obj1[prop1];
             var value2 = obj2[property]+obj2[prop1];
             if (value1==value2){
                 return obj1[prop2]-obj2[prop2];
             }
             return value1 - value2;     // 升序
         }
    }
// Create the thingShadow object with argument data
const device = awsIoT.device({
   keyPath: 'private.pem.key',
  certPath: 'certificate.pem.crt',
    caPath: '/home/ec2-user/environment/root-CA.crt',
  clientId: deviceName,
      host: endpointFile.endpointAddress
});

var battery;
var isCharging = false;

// Function that gets executed when the connection to IoT is established
device.on('connect', function() {
    console.log('Connected to AWS IoT');
    battery = 100.0;
    nearnodetable = nearnodetable.sort(compare("distosink","distonode","tonodehop"));
    currentnodetable.distosink=nearnodetable[0].distonode+nearnodetable[0].distosink;
    currentnodetable.tonodehop=1+nearnodetable[0].tonodehop
    
    device.subscribe(broadcastTopic);
    var data = JSON.stringify(getSensorData(deviceName));
    device.publish(broadcastTopic, data);
    //device.subscribe(sinkTopic);
    device.subscribe(currentnodeTopic);
    device.subscribe(backtopic);
    // Start the publish loop
    infiniteLoopPublish();
});

// Function to update battery status
function updateBatteryStatus(dischargeRate, isCharging) {
    if(isCharging) {
        if(battery >= 100.0) {
            console.log('battery fully charged!');
        } else {
            battery+=1.0;
        }
    } else {
        if(battery <= 0.0) {
            console.log('battery fully discharged! shutting down device!');
        } else {
            battery-=dischargeRate;
        }
    }
}

// Function sending car telemetry data every 5 seconds
function infiniteLoopPublish() {
    var timeOut;
    var dischargeRate;

    console.log('Battery of ' + deviceName + ' is ' + battery + '%');
    if(battery >= 25) {
        timeOut = 5000;
        dischargeRate = 1;
    } else if(battery < 25) {
        timeOut = 2000;
        dischargeRate = 0.4;
    }

    console.log('Sending sensor telemetry data to AWS IoT for ' + deviceName);
    // Publish sensor data to scalable/heart-beat-sensor topic with getSensorData
    var data = JSON.stringify(getSensorData(deviceName));
    nearnodetable = nearnodetable.sort(compare("distosink","distonode","tonodehop"));
    console.log(nearnodetable);
    nextnodeTopic=scalable+nearnodetable[0].deviceid
    publishToSink(nextnodeTopic,data)
    nearnodetable[0].distonode+=10000

    updateBatteryStatus(dischargeRate, isCharging);
    // Start Infinite Loop of Publish every "timeOut" seconds
    setTimeout(infiniteLoopPublish, timeOut);
}

// Function to create a random float between minValue and maxValue
function randomIntBetween(minValue,maxValue){
    return parseInt(Math.floor(Math.min(minValue + (Math.random() * (maxValue - minValue)),maxValue)));
}
const device_data = { 
    'heart-beat-sensor': {
        'latitude':-3,
        'longitude':-2
    }
};
// Generate random car data based on the deviceName
function getSensorData(deviceName) {
    let message = {
        'systole': randomIntBetween(1, 101),
        'distole': randomIntBetween(101, 700),
        'beats': randomIntBetween(65, 75)
    };
    message['battery'] = battery;
    message['latitude'] = device_data[deviceName].latitude;
    message['longitude'] = device_data[deviceName].longitude;
    message['device'] = deviceName;
    message['datetime'] = new Date().toISOString().replace(/\..+/, '');
    return message;
}

device.on('message', function(topic, message) {
    console.log("Message Received on Topic: " + topic + ": " + message);
    if(sinkTopic + deviceName == topic) {
        if(message == 'true') {
            isCharging = true;
        } else if (message == 'false') {
            isCharging = false;
        } else {
            console.log('Unknown value for charger status! not modifying the exisiting value!');
        }
    }
    
    if (topic==backtopic){
        var jMessage = JSON.parse(message);
        console.log('backMessage: ' + message);
        var device = jMessage['device'];
        var devicehopnum = jMessage['hopnum'];
        var devicedistance = jMessage['distance'];
        var deviceisTooHot = jMessage['isTooHot'];
        var deviceDateTime = jMessage['datetime'];
        var deviceTimeStamp = jMessage['timestamp'];
        for (var i=0;i<nearnodetable.length;i++){
            if (nearnodetable[i].deviceid==device){
                nearnodetable[i].distosink=devicedistance;
                nearnodetable[i].tonodehop=devicehopnum;
                let nextlatitude = jMessage['latitude'];
                let nextlongitude = jMessage['longitude'];
                let curlatitude =device_data[deviceName].latitude;
                let curlongitude = device_data[deviceName].longitude;
                let disbetween2nodes=Math.sqrt((nextlatitude-curlatitude)*(nextlatitude-curlatitude)+(nextlongitude-curlongitude)*(nextlongitude-curlongitude))
                nearnodetable[i].distonode=disbetween2nodes;
                console.log(JSON.stringify(nearnodetable[i]));
                nearnodetable = nearnodetable.sort(compare("distosink","distonode","tonodehop"));
                //break;
            }
        }
    }
    if (topic==broadcastTopic){
        let flag=false
        var jMessage = JSON.parse(message);
        console.log('broadcastMessage: ' + message);
        var device = jMessage['device'];
        var devicehopnum = jMessage['hopnum'];
        var devicedistance = jMessage['distance'];
        var deviceisWorking = jMessage['working'];
        var deviceDateTime = jMessage['datetime'];
        var deviceTimeStamp = jMessage['timestamp'];
        let nextlatitude = jMessage['latitude'];
        let nextlongitude = jMessage['longitude'];
        let curlatitude =device_data[deviceName].latitude;
        let curlongitude = device_data[deviceName].longitude;
        let disbetween2nodes=Math.sqrt((nextlatitude-curlatitude)*(nextlatitude-curlatitude)+(nextlongitude-curlongitude)*(nextlongitude-curlongitude))
        let possiblenextnode={deviceid:device, iftonodework:deviceisWorking, distonode:disbetween2nodes,distosink:devicedistance,tonodehop:devicehopnum};
        for (let i=0;i<nearnodetable.length;i++){
            if (nearnodetable[i].deviceid==device){
                flag=true
                nearnodetable[i]=possiblenextnode;
                break;
            }
        }
        if (flag==false){
            nearnodetable.push(possiblenextnode)
        }
    }
});

function publishToSink(topic, payload) {
    device.publish(topic, payload);
}