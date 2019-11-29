var fs = require("fs")
// Require readline for input from the console
const readline = require('readline');

// Require AWS IoT Device SDK
const awsIoT = require('aws-iot-device-sdk');

// Load the endpoint from file
const endpointFile = require('/home/ec2-user/environment/endpoint.json');

// Fetch the deviceName from the current folder name
const deviceName = __dirname.split('/').pop();
const importantdevice=['ecg-sensor','eeg-sensor','insulin-sensor']
// Build constants
const keyPath = 'private.pem.key';
const certPath = 'certificate.pem.crt';
const caPath = '/home/ec2-user/environment/root-CA.crt';
const clientId = deviceName;
const host = endpointFile.endpointAddress;

// publish topic name
var pubTopic = '';
const scalable = 'scalable/';
const sinkTopic = scalable + 'sink';
let firstjoinTopic=scalable+'firstjoin'
var table=[]
let DoctorTopic='DoctorTopic/'+'patient1'
let DoctorEmergencyTopic='DoctorEmergencyTopic/'+'patient1'
let msglsttodoctor=[]
// Use the awsIoT library to create device object using the constants created before
const device = awsIoT.device({
   keyPath: keyPath,
  certPath: certPath,
    caPath: caPath,
  clientId: clientId,
      host: host
});

// Interface for console input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to publish payload to IoT topic
function publishToSensorTopic(topic, payload) {
    // Publish to specified IoT topic using device object that you created
    device.publish(topic, payload);
}
let connecttodoctorTopic='connecttodoctorTopic'
device.on('connect', function() {
    console.log('Connected to AWS IoT as Sink!');
    let data={'name':'patient1'}
    let msg=JSON.stringify(data)
    device.publish(connecttodoctorTopic,msg)
    device.subscribe(sinkTopic);
    device.subscribe(firstjoinTopic)
    infinitecheck();
});
function infinitecheck() {
    var timeOut=30000;
    let curtime=( new Date()).valueOf();
    for (let i=0;i<table.length;i++){
        if (curtime-table[i].timestamp>3*table[i].dutytime){
            console.log('Warn ',table[i].id)
            let jMessage={'alert': table[i].id+'is not working, please check'}
            let message=JSON.stringify(jMessage);
            publishToSensorTopic('scalable/sink/email/alert', message);
        }
    }
    let message=JSON.stringify(msglsttodoctor)
    msglsttodoctor=[]
    publishToSensorTopic(DoctorTopic,message)
    setTimeout(infinitecheck, timeOut);
}

device.on('message', function(topic, message) {
    var jMessage1 = JSON.parse(message);
    if (topic==firstjoinTopic){
        
        let msg1=JSON.stringify({'table':table});
        
        let backfirstjoinTopic=scalable+'backfirstjoin/'+jMessage1['device']
        publishToSensorTopic(backfirstjoinTopic,msg1);
        console.log(jMessage1,backfirstjoinTopic,msg1)
        return
    }
    
    msglsttodoctor.push(jMessage1)
    for (let i=0;i<jMessage1.length;i++){
        var jMessage=jMessage1[i]
        var device = jMessage['device'];
        var deviceBattery = jMessage['battery'];
        var deviceLatitude = jMessage['latitude'];
        var deviceLongitude = jMessage['longitude'];
        var deviceDateTime = jMessage['datetime'];
        let curnode={'id':device,'dutytime': jMessage['dutytime'], 'timestamp':jMessage['timestamp'],'ifimportant':false}
        for (let i=0;i<importantdevice.length;i++)
        {
            if (device == importantdevice[i]){
                curnode['ifimportant']=true
                break
            }
        }
        let flag=false
        for (let i=0;i<table.length;i++){
            if (table[i].id==device){
                flag=true
                table[i]=curnode;
                break;
            }
        }
        if (flag==false){
            table.push(curnode)
        }
        console.log(table)
        console.log('Message Recevied from ' + device);
        if(device == 'body-temperature-sensor') {
            var temperature = jMessage['bodytemperature'];
            let str1="Arzoo's temperature is abnormal :"+temperature
            jMessage['alert']=str1
            let message1=JSON.stringify(jMessage);
            console.log('message1'+message1)
            //publishToSensorTopic(DoctorEmergencyTopic,message1)
            if(temperature > 104) {
                // publishToSensorTopic('scalable/sink/email/alert', message);
                publishToSensorTopic(DoctorEmergencyTopic,message1)
            }
        } else if(device == 'ecg-sensor') {
            //var systole = jMessage['systole'];
            //var distole = jMessage['distole'];
            var beats = jMessage['heartbeats']; 
            let str1="Arzoo's hearbeat is abnormal :"+beats
            jMessage['alert']=str1
            message=JSON.stringify(jMessage);
            if(beats < 60 || beats > 100 ) {
                // publishToSensorTopic('scalable/sink/email/alert', message);
                publishToSensorTopic(DoctorEmergencyTopic,message)
            }
        } 
        
        else if(device == 'respiration-sensor') {
            var respiratoryRate = jMessage['respiratoryRate']; 
            let str1="Arzoo's respiratory rate is abnormal :"+respiratoryRate
            jMessage['alert']=str1
            message=JSON.stringify(jMessage);
            if(respiratoryRate < 12 || respiratoryRate > 25 ) {
                // publishToSensorTopic('scalable/sink/email/alert', message);
                publishToSensorTopic(DoctorEmergencyTopic,message)
            }
        }
        else if(device == 'insulin-sensor') {
            var glucoseLevel = jMessage['glucoseLevel'];
            let str1="Arzoo's  glucose level is abnormal :"+glucoseLevel
            jMessage['alert']=str1
            message=JSON.stringify(jMessage);
            if(glucoseLevel < 3 || glucoseLevel > 9 ) {
                // publishToSensorTopic('scalable/sink/email/alert', message);
                publishToSensorTopic(DoctorEmergencyTopic,message)
            }
        } else if(device == 'oxygen-level-sensor') {
            var oxygenPercentage = jMessage['oxygenPercentage'];
            let str1="Arzoo's oxygen percentage is abnormal :"+oxygenPercentage
            jMessage['alert']=str1
            message=JSON.stringify(jMessage);
            console.log(message)
            if(oxygenPercentage < 95) {
                // publishToSensorTopic('scalable/sink/email/alert', message);
                publishToSensorTopic(DoctorEmergencyTopic,message)
            }
        }
        else if(device == 'Blood-pH-level-sensor') {
            var phlevel = jMessage['phlevel'];
            let str1="Arzoo's PH level is abnormal :"+phlevel
            jMessage['alert']=str1
            message=JSON.stringify(jMessage);
            console.log(message)
            if((phlevel < 7.35) ||(phlevel>7.45)) {
                // publishToSensorTopic('scalable/sink/email/alert', message);
                publishToSensorTopic(DoctorEmergencyTopic,message)
            }
            
        } else if(device == 'blood-pressure-sensor') {
            //var oxygenPercentage = jMessage['oxygenPercentage'];
            var systole = jMessage['systole'];
            var distole = jMessage['distole'];
            
            let str1="Arzoo's blood pressure is abnormal :"+systole + "/" + distole
            jMessage['alert']=str1
            message=JSON.stringify(jMessage);
            if((systole>=140 && distole>=90) || (systole <120 && distole < 80) ) {
                // publishToSensorTopic('scalable/sink/email/alert', message);
                publishToSensorTopic(DoctorEmergencyTopic,message)
            }
        } else if(device == 'hemoglobin-sensor') {
            var hemoglobin = jMessage['hemoglobin'];
            let str1="Arzoo's hemoglobin is abnormal :"+hemoglobin
            jMessage['alert']=str1
            message=JSON.stringify(jMessage);
            if(hemoglobin < 13 || hemoglobin > 16) {
                // publishToSensorTopic('scalable/sink/email/alert', message);
                publishToSensorTopic(DoctorEmergencyTopic,message)
            }
        }
    
        if(deviceBattery <= 25.0) {
            publishToSensorTopic(sinkTopic + device, 'true');
        } else if(deviceBattery >= 100.0) {
            publishToSensorTopic(sinkTopic + device, 'false');
        }
    }

    console.log('Message: ' + message);
    
    
        let backtopic='backresponseto/'+device
        let info = {
        };
        info['latitude'] = 0;
        info['longitude'] = 0;
        info['device'] = deviceName;
        info['hopnum']=0
        info['distance']=0
        info['iftonodework']=true
        info['datetime'] = new Date().toISOString().replace(/\..+/, '');
        info['timestamp'] = ( new Date()).valueOf();
        let msg1=JSON.stringify(info);
        publishToSensorTopic(backtopic,msg1);
        writefile(message)
});
function writefile(content){
    //console.log("准备写入文件");
    fs.writeFile('log.txt', (content+'\n'), { 'flag': 'a' },  function(err) {
        if (err) {
           return console.error(err);
        }
    });
}