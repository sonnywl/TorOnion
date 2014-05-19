#pragma strict

var node : GameObject;
var client : GameObject;
var capsule : GameObject;

// selecting guard nodes
var guardCount : int = 3;
var ncount : int = 8;
// path
var hops : int = 3;
var minPath : int = 3;
private var next : int = 0;

// Time
var delayTime:int= 3;
var messageSpeed:int = 6;
private var currDelayTime :int;

private var ghash = new Hashtable();
private var nhash = new Hashtable();
private var order = new Array();
private var colors : Color[];

private var camPos	: Vector3;
private var cli 	: GameObject;
private var recip	: GameObject;
private var message	: GameObject;
private var arrived	: boolean;

private enum MessageStates {CLIENT, NODE, RECIPENT};
private var messageState : MessageStates;

function Awake() {
	arrived = false;
	camPos = this.camera.transform.position;
	// instantiate client and recipient
	cli = Instantiate(client, Vector3(camPos.x - 10f, 3, camPos.z), Quaternion.identity);
	recip = Instantiate(client, Vector3(camPos.x + 10f, 3, camPos.z), Quaternion.identity);
	// instantiate message to clients position
	message = Instantiate (
		capsule, 
		Vector3(cli.transform.position.x, cli.transform.position.y, cli.transform.position.z),
		Quaternion.Euler(90.0, 90.0, 0.0)
	);
	cli.name = "Client";
	recip.name = "Recip";
	message.name = "Message";
	
	// set colors
	colors = new Color[hops];
	var c = hops;
	for(var i:int = 0; i < hops; i++) {
		colors[i] = new Color(1.0, (1.0 - 1.0/c), 0, 1);
		c--;
	}
	
	currDelayTime = delayTime;
	messageState = MessageStates.NODE;
}

function Start () {
	// instantiate tor nodes
	for (var i:int = 0; i < ncount; i++) {
		var clone:GameObject = Instantiate(
			node,  
			Vector3 (
				Random.Range(-Random.value*7, Random.value*7) + camPos.x, 
				3, 
				Random.Range(-Random.value*7, Random.value*7) + camPos.z
			), 
			Quaternion.identity
		);
		clone.name = "Node"+i;
	}
	// select guard nodes
	SelectGuards(guardCount);
	// create path
	SelectPath(hops);
	Debug.Log("Node Path " + order.toString());
}

function FixedUpdate () {
	var controller : MessageController = message.GetComponent(MessageController);
	switch(messageState) {
		case MessageStates.NODE:
			Debug.Log("Next " + next + " " + order.length + " " + arrived);
			var endpoint : GameObject = GameObject.Find("Node"+order[next]);
			var endPos : Vector3 = endpoint.transform.position;
			if(arrived) {
				if (controller.getCollisionTarget().Equals(endpoint.name)) {
					if(next >= 1) {
						message.renderer.material.color = colors[next-1];
					}
					next--;
					if (next < 0) {
						messageState = MessageStates.CLIENT;
						message.renderer.material.color = Color.white;
					}
				}
			} else {
				if (controller.getCollisionTarget().Equals(endpoint.name)) {
					next++;
					hops--;
					if(next != 0) {
						message.renderer.material.color = colors[next-1];
					} else if (next == 0) {
						message.renderer.material.color = Color.white;
					}
				} 
				if(hops == 0 || next >= order.length - 1) {
					messageState = MessageStates.RECIPENT;
				}
			}
			message.transform.LookAt(endpoint.transform);
			break;
		case MessageStates.CLIENT:
			message.transform.LookAt(cli.transform);
			break;
		case MessageStates.RECIPENT:
			message.transform.LookAt(recip.transform);
			if(controller.getCollisionTarget().Equals(recip.name)){
				if(DelayMessage()){
					messageState = MessageStates.NODE;
					next--;
					arrived = true;
				}
			}
			break;
	}
	message.transform.position = message.transform.position  + (message.transform.forward * messageSpeed * Time.deltaTime);
	Debug.Log("Next " + next+ " Message State " + messageState);
}

function SelectGuards (guardCount : int): void {
	var count = 0;
	var first = true; // assign guard node as first node in path always
	
	while (count < guardCount) {
		var selected = Random.Range(0, ncount-1);
		if (ghash[selected] != null) {
			continue;
		} else {
			ghash[selected] = selected;
			if (first) {
				order.push(selected);
				first = false;
			}
			count++;
		}
	}
	//Debug.Log("Guard node count: " + ghash.Count);	
	for (item in ghash.Keys) {
		var guard = GameObject.Find("Node"+item);
		guard.renderer.material.color = Color.blue;
	}
}

function SelectPath (hops : int): void {
	// guard node is first, need to select ncount-1 more nodes in path
	for (var i:int = 0; i < minPath; i++) {
		var n = Random.Range(0, ncount);
		while (ghash[n] != null || nhash[n] != null)
			n = Random.Range(0, ncount);
		order.push(n);
		nhash[n] = n;
	}
}

function clearPath () {
	for (item in ghash.Keys) {
		var guard = GameObject.Find("Node"+item);
		guard.renderer.material.color = Color.white;
	}
	ghash.Clear();
	nhash.Clear();
	order.Clear();
}

function DelayMessage(): boolean {
	if(currDelayTime <= 0) {
		currDelayTime = delayTime;
		return true;
	}
	currDelayTime -= Time.deltaTime;
	return false;
}

function OnGUI() {
	if (GUI.Button(Rect(Screen.width - 200,Screen.height- 50,100,40),"Play Again")) {
		arrived = false;
		next = 0;
		hops = 3;
		// select new guard nodes and new path
		clearPath();
		SelectGuards(guardCount);
		SelectPath(hops);
		Debug.Log("Node Path " + order.toString());
		messageState = MessageStates.NODE;
	}
}