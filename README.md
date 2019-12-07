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

## Detailed Project Description:

### Possible Scenario:
We have (3 or 4) instances implementing BAN and another implementing some processing machine like the device connected to the home doctor.
In processing instance, we use 4 normal entities and 4 alarm entities to receive and process data from patients and give notification or alarm to the doctor. They have different energy and duty cycle and QoS. We separate different personal data to different sensors for security consideration. In that way, they have no chance to get approach to others’ sensitive data.
In BAN instance, we use 9 local entities to represent sensors and 1 to represent sink as a personal server to process data and send it to Internet.
### BAN Intra-network:
In the body area inner network, we use 9 local entities to represent different sensors (like ECG, EEG) and 1 to represent sink as a personal server to process data and send it to receiver instance. So, we place sink in the center of the human body. Considering energy consumption and node availability, we implement the transmission protocol based on LAEEBA. 
We divide the sensors into two categories: extremely significant ones (ECG, EEG, etc.) and not so important ones (body temperature sensor, blood pressure sensor, etc.). For the former kind of sensors, we let it transmit to sink directly while all other ordinary sensors form a peer to peer multi-hop network to save energy. Specifically, if the data is abnormal and needs to warn somebody, it will also be transmitted directly to sink.
#### In this way we solve the challenges below:
* #### Routing Selection
In the multi-hop network, we choose route based on the device status like remaining battery and distance between nodes as well as hop number based on LAEEBA. Each sensor maintains a dynamic table of the status of their neighborhood to select a best way to get to sink. 
The delay node to gather information from other nodes and send to sink is selected based on the distance and remained energy. We assume processing data cost less energy than transmitting data. So, we will always find best route based on distance first. If distance is same, we will choose the journey with less hop. If a node’s battery is less than a safe value, it will not perform as a delay node anymore.
When some devices join in the network or move and change its direction, a broadcast will also be stimulated, all the nodes linked to it will update their local table to select routes. Once current best route is updated, the sensor will inform their neighbors to update responsively.
The sink will check if every nodes work and transmit data regularly, if some nodes die, a warn signal will be sent to user. If a delay node dies, the ordinary node related to it cannot receive its response information and will update local table and choose another route.
* #### Energy Consumption
As longer distance means more energy consumed to transmit data, we introduce relay nodes in multi-hop network to save energy. Once a relay node does not have enough battery, we will let it rest and update routing. Its own data will be transmitted to nearby nodes.
For significant sensors, it will only communicate with sink directly and will not waste any energy in other communication.
Sustainability
Taking sustainability into consideration, we introduce duty cycle in the network. When not transmitting data, sensors will sleep to delay their working time. As only not so important sensors form the multi-hop network, we assume that they can send the data not so frequently and do not have a strict time limit. 
So, we synchronize all the nodes sharing a same delay node and let them wake in the same time and communicate. A table of their awake timestamp and duty-free interval will be stored in the sink and sent to new nodes when they join in the network.
* #### Scalability
As mentioned, we have duty cycle in our system. However, delay nodes need to know new nodes coming and also transmitting data for them.
So, in our implementation, when a new device joins the network, it will first connect to the sink and get the sleep time and intervals and other status of all the devices in the network. When others become awake, the newcomer will broadcast its basic data like Id, location as well as energy status to all the neighbors and the neighbors will re-calculate their best route to sink and send back their information. 
* #### QoS
We separate the important sensor like EEG, ECG into a single-hop network to protect their stability strictly without any extra energy consuming or possible data pollution or loss.
Every connection in the network needs a feedback to guarantee QoS. if a delay node does not give feedback, the data generation node will judge it as died and change to another route.
The sink will check regularly if all nodes are working and warn the user when not receiving message for a long time. 
* #### Security and Privacy
Every device in the system is bond to a specific certificate. 
The data only transforms in local network, so it has greater privacy and security.
In the network, the ID and status is always checked in every connection.
If a delay node has too many linked nodes and transmit for them for a long time, it may become hot and cause damage to human being. So, we will check its status and change the delay node to another one.
### BAN Inter-network:
In practice, We use 4 IoT instances as 4 different BAN devices related to patients and another to represent receiving and processing machine (In our scenario it is connected to the home doctor). Once there is something wrong, the doctor will be notified to take measures. Here we use AWS Simple Notification Services to send email as a simulation. The peer-to-peer routing protocol is similar to the implementation method in BAN inner-network. 
* #### Security and Privacy
In processing instance, we use 5 normal entities and 5 alarm entities to receive and process normal data and alarm data (if some indicator is out of normal range) separately. Normal entities only receive and store daily health data regularly. While alarm entities handle those abnormal messages and send it immediately to the doctor. The process is separated to guarantee stability.
In our implementation, 4 normal entities and 4 alarm entities are bond to the 4 particular BAN instances separately. In real world, the physical separation makes the data safer and guarantee user privacy better. Nobody has chance to get approach to others’ sensitive data. In our simulation, it is guaranteed by separate certificates.
* #### Scalability
We also reserve two optional entities as receivers for later-join nodes. It will communicate with a new instance when it joins the network and then allocate a fixed receiver to handle the further transmitting. However, if there is no spare receiver, it can also perform as a temporary processor. In this way, the intra network is scalable and flexible. In future it can even adapt to other kind of IoT like vehicle network if certain API is given.
* #### QoS
We divide receivers into 2 categories to protect stability of abnormal information receivers strictly without any pollution. In addition, different user will have different receivers, they will not interfere each other in the network.
Every connection in the network needs a feedback to guarantee QoS. if it does not, the sink will warn the users that the receiver of doctor cannot work normally.
The receiver will check regularly if all instances are working and warn the user that there may something wrong with the sink when not receiving message for a long time. By checking in the two ends, the reliability of the system can then be guaranteed.
### Reference
*  Khan, R. A., & Pathan, A.-S. K. (2018). The state-of-the-art wireless body area sensor networks: A survey. International Journal of Distributed Sensor Networks. https://doi.org/10.1177/1550147718768994
*  S. Ahmed, N. Javaid, M. Akbar, A. Iqbal, Z. A. Khan and U. Qasim, "LAEEBA: Link Aware and Energy Efficient Scheme for Body Area Networks," 2014 IEEE 28th International Conference on Advanced Information Networking and Applications, Victoria, BC, 2014, pp. 435-440. doi: 10.1109/AINA.2014.54

