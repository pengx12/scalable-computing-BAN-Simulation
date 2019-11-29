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
const sinkTopic = scalable + 'sink';
const changeLocationTopic = scalable + 'changeLocationTopic/';
const currentnodeTopic = scalable + deviceName;
const broadcastTopic = scalable + 'broadcast/';
const resbroadcastTopic = scalable + 'resbroadcast/'+deviceName;
let nextnodeTopic;
let backtopic='backresponseto/'+deviceName
let pubtosinkmessage=[];
//var dic = {'blood pressure':0,'blood oxygen':1, "Glucose":2,"ph level":3,"body temperature":4,"motion":5};
const device_data = { 
    'eeg-sensor': {
        'latitude':0,
        'longitude':15,
        'dutytime':3000
    }
};
let currentnodetable={ifnodework:true, id:deviceName,tonodehop:0};
currentnodetable['distosink']=Math.sqrt((device_data[deviceName].latitude)*(device_data[deviceName].latitude)+(device_data[deviceName].longitude)*(device_data[deviceName].longitude))
let distosink={deviceid:"sink", iftonodework:true,distosink:0,tonodehop:0};
distosink['distonode']=Math.sqrt((device_data[deviceName].latitude)*(device_data[deviceName].latitude)+(device_data[deviceName].longitude)*(device_data[deviceName].longitude))
let nearnodetable=[distosink];
function compare(property,prop1,prop2){
     return function(obj1,obj2){
         if (obj1.iftonodework==false)
         {
             return 1
         }
        if (obj2.iftonodework==false)
         {
             return -1
         }
         var value1 = obj1[property]*obj1[property]+obj1[prop1]*obj1[prop1];
         var value2 = obj2[property]*obj2[property]+obj2[prop1]*obj2[prop1];
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
    
    var data = JSON.stringify(getSensorData(deviceName));
    //device.subscribe(resbroadcastTopic)
    //device.publish(broadcastTopic, data);
    //device.subscribe(broadcastTopic);
    //device.subscribe(currentnodeTopic);
    device.subscribe(backtopic);
    // Start the publish loop
    infiniteLoopPublish();
});

// Function to update battery status
let lowbattery=false
function updateBatteryStatus(dischargeRate, isCharging) {
    if(isCharging) {
        if (lowbattery==true){
            lowbattery=false
            currentnodetable.ifnodework=true
        }
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
        timeOut = device_data[deviceName].dutytime;
        dischargeRate = 1;
        currentnodetable.ifnodework=true
    } else if(battery < 25) {
        timeOut = 20000;
        dischargeRate = 0.4;
        lowbattery=true
        currentnodetable.ifnodework=false
    }

    console.log('Sending sensor telemetry data to AWS IoT for ' + deviceName);
    // Publish sensor data to scalable/heart-beat-sensor topic with getSensorData
    pubtosinkmessage.push(getSensorData(deviceName));
    var data = JSON.stringify(pubtosinkmessage);
    pubtosinkmessage=[]
    publishToSink(sinkTopic,data);
    /*nearnodetable = nearnodetable.sort(compare("distosink","distonode","tonodehop"));
    //nextnodeTopic=scalable+nearnodetable[0].deviceid
    if (nearnodetable[0].deviceid=='sink'){
        if (currentnodetable.ifnodework==false)
        {
            //nextnodeTopic=scalable+nearnodetable[1].deviceid
        }
    }
    console.log(nextnodeTopic,nearnodetable)
    if(getSensorData(deviceName).oxygenPercentage < 95) {
        publishToSink(sinkTopic,data);
        setTimeout(infiniteLoopPublish, timeOut);
    }
    else
    {
        publishToSink(nextnodeTopic,data)
        if (nearnodetable[0].deviceid!='sink')
        {
            nearnodetable[0].distonode=10000
        }
    }*/
    updateBatteryStatus(dischargeRate, isCharging);
    
    // Start Infinite Loop of Publish every "timeOut" seconds
    setTimeout(infiniteLoopPublish, timeOut);
}

// Function to create a random float between minValue and maxValue
function randomIntBetween(minValue,maxValue){
    return parseInt(Math.floor(Math.min(minValue + (Math.random() * (maxValue - minValue)),maxValue)));
}
function randomFloatBetween(minValue,maxValue){
    return parseInt(Math.floor(Math.min(minValue + (Math.random() * (maxValue - minValue)),maxValue)));
}
// Generate random car data based on the deviceName
function getSensorData(deviceName) {
    let message = {
        'eeg': randomFloatBetween(1, 12)
    };
    message['battery'] = battery;
    message['latitude'] = device_data[deviceName].latitude;
    message['longitude'] = device_data[deviceName].longitude;
    message['dutytime'] = device_data[deviceName].dutytime;
    message['device'] = deviceName;
    message['datetime'] = new Date().toISOString().replace(/\..+/, '');
    message['hopnum']=currentnodetable.tonodehop
    message['distance']=currentnodetable.distosink
    message['iftonodework']=currentnodetable.ifnodework
    message['timestamp'] = ( new Date()).valueOf();
    return message;
}
function updatelocaltable(jMessage) {
}
device.on('message', function(topic, message) {
    console.log("Message Received on Topic: " + topic + ": " + message);
    if (topic==currentnodeTopic){
        var jMessage = JSON.parse(message)[0];
        let device = jMessage['device'];
        pubtosinkmessage.push(jMessage);
        let backtopic='backresponseto/'+device
        let info = getSensorData(deviceName)
        let msg1=JSON.stringify(info);
        publishToSink(backtopic,msg1);
        console.log(backtopic,msg1)
    }

    if (topic==backtopic){
        var jMessage = JSON.parse(message);
        //console.log('backMessage: ' + message);
        var device = jMessage['device'];
        var devicehopnum = jMessage['hopnum'];
        var devicedistance = jMessage['distance'];
        var ifdevicework = jMessage['iftonodework'];
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
                nearnodetable[i].iftonodework=ifdevicework
                nearnodetable = nearnodetable.sort(compare("distosink","distonode","tonodehop"));
                //break;
            }
        }
    }

    if ((topic==broadcastTopic) || (topic==resbroadcastTopic)){
        let flag=false
        var jMessage = JSON.parse(message);
        //console.log('broadcastMessage: ' + message);
        var device = jMessage['device'];
        if (device!=deviceName){
            var devicehopnum = jMessage['hopnum'];
            var devicedistance = jMessage['distance'];
            var deviceisWorking = jMessage['iftonodework'];
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
    }
    if (topic==broadcastTopic ){
        var jMessage = JSON.parse(message);
        //console.log('broadcastMessage: ' + message);
        var device = jMessage['device'];
        if (device!=deviceName){
            let resbroadcastTopic = scalable + 'resbroadcast/'+device;
            let info = getSensorData(deviceName)
            let msg1=JSON.stringify(info);
            publishToSink(resbroadcastTopic,msg1);
        }
    }
    if (topic==changeLocationTopic ){
        var jMessage = JSON.parse(message);
        //console.log('broadcastMessage: ' + message);
        setlocation(jMessage['latitude'],jMessage['longitude'],jMessage['dutytime'])
        var data = JSON.stringify(getSensorData(deviceName));
        device.publish(broadcastTopic, data);
    }
});
function setlocation(latitude,longitude,dutytime) {
    //var timeOut=30000;
    device_data[deviceName].latitude=latitude
    device_data[deviceName].longitude=longitude
    device_data[deviceName].dutytime=dutytime
    //setTimeout(setlocation, timeOut);
}
function publishToSink(topic, payload) {
    device.publish(topic, payload);
}