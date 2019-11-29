# scalable-computing-BAN-Simulation

# About the Project:
  In this project we were required to implement a scalable peer to peer Body Area Network system by using 4 different AWS EC2 instances and each instance with 10 local entities (Sensors). Our Scenario was that we considered 4 different AWS instances as 4 different patients and 1 other instance as a Doctor. Each patient has 9 sensors in his/her body and 1 local sink.   
  For example: Heart-beat sensor, Oxygen-level, Insulin, EEG, Hemoglobin sensor etc. These sensors collect the data regularly from the body and send it to the local sink.  
  The Data from the local sink gets transferred to the Doctor in real-time. In case of abnormal readings from the sensor, an email alert is sent to the doctor for further actions to be taken.

#### Sensors Used:
* Blood pH level 
* Blood pressure
* Body temperature
* ECG Sensor
*	EEG Sensor
*	Hemoglobin Sensor
*	Insulin Sensor
*	Oxygen Sensor
*	Respiration Sensor

#### Platforms Used:
* AWS IOT Core
*	AS Cloud9
*	AWS IAM
*	AWS EC2
*	AWS Simple Notification Services

#### Environment Setup:
*	We are creating sensor Things and connect them to AWS IoT Core service so they can send telemetry data on an IoT Topic.
*	To connect those Sensors, you will create an IoT Thing, Certificate and Policy. The Thing will represent a sensors or sink.
*	The Certificate will be used to authenticate to AWS IoT Core and the Policy will define sensors and sink can do once authenticated. 
*	Sensors will be simulated in a Cloud9 environment.


1. Create an IAM Policy by going to AWS management console -> Services -> IAM -> Policies- > create policies -> click the JSON tab and replace with following:
 ```json
 {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "greengrass:*",
        "iot:*",
        "iotanalytics:*",
        "cloud9:*",
        "lambda:*",
        "s3:*",
        "sns:*",
        "iam:*",
        "cognito-identity:*",
        "cognito-sync:*",
        "cognito-idp:*",
        "logs:*",
        "ec2:*",
        "cloudwatch:*",
        "kms:ListAliases",
        "kms:DescribeKey",
        "cloudformation:DescribeStackResources",
        "tag:getResources"
      ],
      "Resource": "*"
    }
  ]
}
```
Click review policy -> Enter name of policy -> Create policy       

2. Download the AWS IoT Certificate Authority Public Certificate that will be used in the code by running following command
   * `cd ~/environment`
   * `wget -O root-CA.crt https://www.amazontrust.com/repository/AmazonRootCA1.pem`

3. In AWS management Console create Cloud9 environment. All the sensor scripting will take place here.

4. Download the AWS IoT CA Public Cert.


Steps For Creating the Sensors run the following commands:
* `mkdir ~/environment/SENSOR_NAME`  (For creating a sensor folder)
* `cd SENSOR_NAM`
* `aws iot create-thing --thing-name SENSOR NAME`
* `aws iot create-keys-and-certificate --set-as-active --certificate-pem-outfile certificate.pem.crt --private-key-outfile private.pem.key`
* `aws iot attach-policy --policy-name WRITE_POLICY_NAME_HERE --target arn`
* `aws iot attach-thing-principal --thing-name SENSOR_NAME --principal arn`
* copy code in `SENSOR_NAME.js` file
* `cd ..`( come out of that directory and repeat for other sensors)


5. In the Cloud9 terminal, run this command to get your specific endpoint.
   * `aws iot describe-endpoint --endpoint-type iot:Data-ATS > ~/environment/endpoint.json`

6. To execute the code run following command:
   * `cd ~/environment/SENSOR_FILE`
   * `node SENSOR_FILE.js`
   * `node SINK.js` (To receive data at sink node)

7. To Create a SNS Topic
    * In the AWS Management Console, under services, click SNS service on the dashboard.
	* Under Topic – Create Topic
	* Provide Topic Name – For instance BodyTemp
	* Once the topic name is created, you need to create a subscription to start the process of subscribing your email address to the new SNS topic.
	* Select the protocol as email and enter an email address for Endpoint.
	* Confirm the subscription to the SNS topic by clicking the link in the email provided.
8. To create IAM ROLE
	* In the AWS Management Console, click IAM 
	* Under Roles, select create Roles
	* Select type of trusted entity as AWS service
	* Select IoT for choose the service that will use this role.
	* Select IoT for select your use case.
	* Provide Role Name – For instance, IoT Role.
9. Create an IoT Rule
	* In the AWS Management Console, click IoT Core  
	* Under Act, Create a Rule
	* Provide Name - For Instance EmailAlert
	* Click Add action for Set one or more actions
	* Select Send a message as an SNS push notification
	* Select the topic name provided (EmailAlert) for SNS Target.
	* Select IoT Role for chose or create a role to grant AWS IoT access to perform this action
	* For the Rule query statement, for instance add – 
	* ```SELECT alertBodyTemperature, alertEEG , alertBloodPressure, alertHemoglobin, alertInsulin AS message FROM 'scalable/sink/email/alert'```
	* Create Rule.

### Detailed Project Description:

#### Possible Scenario:
We have (3 or 4) instances implementing BAN and another implementing some processing machine like the device connected to the home doctor.
In processing instance, we use 4 normal entities and 4 alarm entities to receive and process data from patients and give notification or alarm to the doctor. They have different energy and duty cycle and QoS. We separate different personal data to different sensors for security consideration. In that way, they have no chance to get approach to others’ sensitive data.
In BAN instance, we use 9 local entities to represent sensors and 1 to represent sink as a personal server to process data and send it to Internet. So we place sink in the center of the human body. (They only send themselves email.)

#### Challenges:

1.	Energy consuming.
We need to find a routing algorithm that consumes less energy when guarantee QoS.
Then we divide the sensors into two categories: extremely significant ones and not so important ones. For the former kind of sensors, we let it transmit to sink directly while others will transmit data through other relay nodes. As longer distance means more energy consumed to transmit data, all the ordinary sensors form a peer to peer multi-hop network to save energy. Each sensor maintains a dynamic table of the status of their neighborhood to select a best way to get to sink. Specifically, if the data is unnormal and needs to warn somebody, it will also be transmitted directly to sink.

2.	Duty Cycle
As sensors needs to sleep to delay their working time, especially for those not so important ones. But some former nodes need to know new nodes coming and also transferring data for them.
When a new device joins the network, it will first connect to the sink and get the sleep time and intervals and other status of all the devices in the network. When others become awake, they will broadcast its basic data like Id, location as well as energy status to all the neighbors and the neighbors will re-calculate their best route to sink and send back their information. Once best route is updated, the sensor will inform their neighbors to update responsively. 

3.	Dying nodes or reselect routes
The forward node is selected based on the distance and remained energy. We assume processing data cost less energy than transmitting data. So, we will always find best route based on distance. If distance is same, we will choose the journey with less hop. Once a relay node does not have so much battery, we will let it rest and update routing. When some devices move and change its direction, a broadcast will also be stimulated.
To guarantee QoS, a relay node needs to give response to leaf node and if it does not, the leaf node will judge it as died and change to another route. The sink will also check if every node work well and if not, it will give some notification.
About duty cycle, as we only put the ordinary sensor in the multi-hop network, we assume that they can send the data not so frequently and consume not much energy. Based on that we forward their awake timestamp and duty-free interval and sync all the nodes sharing a same forward node.

