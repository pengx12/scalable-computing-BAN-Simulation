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
const currentnodeTopic = scalable + deviceName;
const broadcastTopic = scalable + 'broadcast/';
const changeLocationTopic = scalable + 'changeLocationTopic/';
const resbroadcastTopic = scalable + 'resbroadcast/'+deviceName;

let firstjoinTopic=scalable+'firstjoin'
let backfirstjoinTopic=scalable+'backfirstjoin/'+deviceName
let nextnodeTopic;
let backtopic='backresponseto/'+deviceName
let pubtosinkmessage=[];
// Create the thingShadow object with argument data
const device = awsIoT.device({
   keyPath: 'private.pem.key',
  certPath: 'certificate.pem.crt',
    caPath: '/home/ec2-user/environment/root-CA.crt',
  clientId: deviceName,
      host: endpointFile.endpointAddress
});
let device_data = { 
    "Blood-pH-level-sensor": {
        'latitude':-10,
        'longitude':10,
        'dutytime':8000
    }
};
var battery;
var isCharging = false;
let currentnodetable={ifnodework:true, id:deviceName, distosink:1.8,tonodehop:0};
currentnodetable['distosink']=Math.sqrt((device_data[deviceName].latitude)*(device_data[deviceName].latitude)+(device_data[deviceName].longitude)*(device_data[deviceName].longitude))
let distosink={deviceid:"sink", iftonodework:true,distonode:2,distosink:0,tonodehop:0};
distosink['distonode']=Math.sqrt((device_data[deviceName].latitude)*(device_data[deviceName].latitude)+(device_data[deviceName].longitude)*(device_data[deviceName].longitude))
let nearnodetable=[distosink];
// Function that gets executed when the connection to IoT is established
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
device.on('connect', function() {
    console.log('Connected to AWS IoT');
    battery = 100.0;
    var data = JSON.stringify(getSensorData(deviceName));
    
    nearnodetable = nearnodetable.sort(compare("distosink","distonode","tonodehop"));
    currentnodetable.distosink=nearnodetable[0].distonode+nearnodetable[0].distosink;
    currentnodetable.tonodehop=1+nearnodetable[0].tonodehop
    
    var data = JSON.stringify(getSensorData(deviceName));
    
    device.subscribe(backfirstjoinTopic)
    device.publish(firstjoinTopic, data)
    device.subscribe(resbroadcastTopic)
    //device.publish(broadcastTopic, data);
    device.subscribe(broadcastTopic);
    device.subscribe(currentnodeTopic);
    device.subscribe(backtopic);
    //infiniteLoopPublish();
});
let lowbattery=false
// Function to update battery status
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
// TODO change the timeOut and dischargeRate after testing to proper values!
// Function sending sensor telemetry data every 5 seconds
function infiniteLoopPublish() {
    var timeOut;
    var dischargeRate;
    console.log('Battery of ' + deviceName + ' is ' + battery + '%');
    if(battery >= 25) {
        timeOut = 8000;
        dischargeRate = 1;
        currentnodetable.ifnodework=true
    } else if(battery < 25) {
        timeOut = 20000;
        dischargeRate = 0.4;
        lowbattery=true
        currentnodetable.ifnodework=false
    }
    updateBatteryStatus(dischargeRate, isCharging);
    console.log('Sending sensor telemetry data to AWS IoT for ' + deviceName);
    // Publish sensor data to scalable/body-temperature-sensor topic with getSensorData
    
    pubtosinkmessage.push(getSensorData(deviceName));
    var data = JSON.stringify(pubtosinkmessage);
    pubtosinkmessage=[]
    //var data = JSON.stringify(getSensorData(deviceName));
    //publishToSink(sinkTopic, data);
    nearnodetable = nearnodetable.sort(compare("distosink","distonode","tonodehop"));
    nextnodeTopic=scalable+nearnodetable[0].deviceid
    console.log(nearnodetable,nextnodeTopic)
    if (nearnodetable[0].deviceid=='sink'){
        if (currentnodetable.ifnodework==false)
        {
            //nextnodeTopic=scalable+nearnodetable[1].deviceid
        }
    }
     if((getSensorData(deviceName).phlevel < 7) || (getSensorData(deviceName).phlevel>7.45) ){
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
    }

    // Start Infinite Loop of Publish every "timeOut" seconds
    setTimeout(infiniteLoopPublish, timeOut);
}

// Function to create a random float between minValue and maxValue
function randomFloatBetween(minValue,maxValue){
    return parseInt(Math.floor(Math.min(minValue + (Math.random() * (maxValue - minValue)),maxValue)));
}

// Generate random sensor data based on the deviceName
function getSensorData(deviceName) {
    let message = {
        'phlevel': randomFloatBetween(6.8, 7.8)
    };
    message['battery'] = battery;
    message['latitude'] = device_data[deviceName].latitude;
    message['longitude'] = device_data[deviceName].longitude;;
    message['dutytime'] = device_data[deviceName].dutytime;
    message['device'] = deviceName;
    message['datetime'] = new Date().toISOString().replace(/\..+/, '');
    message['hopnum']=currentnodetable.tonodehop
    message['distance']=currentnodetable.distosink
    message['iftonodework']=currentnodetable.ifnodework
    message['timestamp'] = ( new Date()).valueOf();
    return message;
}
function broadcast() {
    var data = JSON.stringify(getSensorData(deviceName));
    device.publish(broadcastTopic, data);
}
device.on('message', function(topic, message) {
    console.log("Message Received on Topic: " + topic + ": " + message);
    if (topic==backfirstjoinTopic){
        var jMessage = JSON.parse(message)
        let table=jMessage['table']
        //let curtime=(new Date()).valueOf();
        let broadcastinterval=-1000
        for (let i=0;i<table.length;i++){
            if ((table[i].ifimportant==false)&&(table[i].id!=deviceName)){
                broadcastinterval=table[i].dutytime+table[i].timestamp-(new Date()).valueOf()
                break
            }
        }
        console.log(broadcastinterval)
        if (broadcastinterval==-1000){
            infiniteLoopPublish();
        }
        else
            setTimeout(broadcast, broadcastinterval-3);
    }
    if (topic==currentnodeTopic){
        let m1=JSON.parse(message)
        for (let i=0;i<m1.length;i++){
            var jMessage = m1[i];
            let device = jMessage['device'];
            pubtosinkmessage.push(jMessage);
            let backtopic='backresponseto/'+device
            let info = getSensorData(deviceName)
            let msg1=JSON.stringify(info);
            publishToSink(backtopic,msg1);
        }
    }

    if (topic==backtopic){
        var jMessage = JSON.parse(message);
        //console.log('backMessage: ' + message);
        var device = jMessage['device'];
        var devicehopnum = jMessage['hopnum'];
        var devicedistance = jMessage['distance'];
        var deviceisTooHot = jMessage['iftonodework'];
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
            let info = {
            };
            info['latitude'] = device_data[deviceName].latitude;
            info['longitude'] = device_data[deviceName].longitude;
            info['device'] = deviceName;
            info['hopnum']=currentnodetable.tonodehop
            info['distance']=currentnodetable.distosink
            info['iftonodework']=currentnodetable.ifnodework
            info['datetime'] = new Date().toISOString().replace(/\..+/, '');
            info['timestamp'] = ( new Date()).valueOf();
            let msg1=JSON.stringify(info);
            publishToSink(resbroadcastTopic,msg1);
            console.log(resbroadcastTopic,msg1)
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