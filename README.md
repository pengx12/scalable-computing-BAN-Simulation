# scalable-computing-BAN-Simulation

Possible Scenario:
We have (3 or 4) instances implementing BAN and another implementing some processing machine like the device connected to the home doctor.
In processing instance, we use 4 normal entities and 4 alarm entities to receive and process data from patients and give notification or alarm to the doctor. They have different energy and duty cycle and QoS. We separate different personal data to different sensors for security consideration. In that way, they have no chance to get approach to others’ sensitive data.
In BAN instance, we use 9 local entities to represent sensors and 1 to represent sink as a personal server to process data and send it to Internet. So we place sink in the center of the human body. (They only send themselves email.)

Challenges:

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

