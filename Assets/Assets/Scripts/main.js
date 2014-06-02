#pragma strict

var node : GameObject;
var client : GameObject;
var capsule : GameObject;

// selecting guard nodes
var guardCount : int = 5;
var activeGuards : int = 3;
var ncount : int = 11;
// path
var hops : int = 5;
var minPath : int = 5;
private var next : int = 0;

// Timekeeping
var tcount : int;
var startTime : float; // not sure if keeping stopwatch yet
var textTime : String;
var seconds : int;
var delayTime:int= 3;
var messageSpeed:int = 6;
private var currDelayTime :int;

private var ghash = new Hashtable();
private var nhash = new Hashtable();
private var guardPool = new Hashtable(); // all guard entries
private var order = new Array();
private var colors : Color[];

private var camPos	: Vector3;
private var cli 	: GameObject;
private var recip	: GameObject;
private var message	: GameObject;
private var arrived	: boolean;
private var rewind : boolean;

private enum MessageStates {CLIENT, NODE, RECIPENT, RESTART};
private var messageState : MessageStates;

function Awake() {
	arrived = false;
	camPos = this.camera.transform.position;
	// instantiate client and recipient
	cli = Instantiate(client, Vector3(camPos.x - 10f, 3, camPos.z), Quaternion.identity);
	cli.renderer.material.color = Color.blue;
	recip = Instantiate(client, Vector3(camPos.x + 10f, 3, camPos.z), Quaternion.identity);
	recip.renderer.material.color = Color.red;
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
	var c = 1;
	for(var i:int = 0; i < hops; i++) {
		colors[i] = new Color(1.0, (1.0 - 1.0/c), (1.0 - 1.0/c), 1);
		c++;
	}

	// select flagged guard nodes (default nodes 0-4)
	for (var g = 0; g < guardCount; g++) {
		guardPool[g] = g;
	}
	
	// start timer
	startTime = Time.time;
	
	currDelayTime = delayTime;
	messageState = MessageStates.NODE;
}

function Start () {
	// instantiate tor nodes
	for (var i:int = 0; i < ncount; i++) {
		var clone:GameObject = Instantiate(
			node,  
			Vector3 (
				Random.Range(-7, 7) + camPos.x, 
				3, 
				Random.Range(-7, 7) + camPos.z
			), 
			Quaternion.identity
		);
		clone.name = "Node"+i;
	}
	// select client's guard nodes
	SelectGuards(guardCount);
	// create path
	SelectPath(hops);
	var controller : MessageController = message.GetComponent(MessageController);
	controller.setNodePath(order);
	Debug.Log("Node Path " + order.toString());
}

function FixedUpdate () {
	var controller : MessageController = message.GetComponent(MessageController);
	switch(messageState) {
		case MessageStates.NODE:
			//Debug.Log("Next " + next + " " + order.length + " " + arrived);
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
					message.renderer.material.color = Color.white;
				}
			}
			message.transform.LookAt(endpoint.transform);
			break;
		case MessageStates.CLIENT:
			message.transform.LookAt(cli.transform);
			messageState = MessageStates.RESTART;
			break;
		case MessageStates.RECIPENT:
			message.transform.LookAt(recip.transform);
			if (controller.getCollisionTarget().Equals(recip.name)) {
				if (DelayMessage()) {
					messageState = MessageStates.NODE;
					next--;
					arrived = true;
				}
			}
			break;
		case MessageStates.RESTART:
			if (controller.getCollisionTarget().Equals("Client")) {
				tcount++;
				if (tcount >= 3) {
					SetNewGuardPath();
					SelectGuards(guardCount);
					SelectPath(hops);
					Debug.Log("Node Path " + order.toString());
					startTime = Time.time;
					tcount = 0;
				} else {
					SetNewPath();
					Debug.Log("Node Path " + order.toString());
				}
				messageState = MessageStates.NODE;
			}
			break;
	}
	message.transform.position = message.transform.position  + (message.transform.forward * messageSpeed * Time.deltaTime);
	//Debug.Log("Next " + next+ " Message State " + messageState);
}

function SelectGuards (guardCount : int): void {
	var count = 0;
	var first = true; // assign guard node as first node in path always
	
	while (count < activeGuards) {
		var selected = Random.Range(0, guardCount-1);
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
	// make all guards cyan
	for (item in guardPool.Keys) {
		var passiveGuard = GameObject.Find("Node"+item);
		passiveGuard.renderer.material.color = Color.cyan;
	}
	// make active guards yellow
	for (item in ghash.Keys) {
		var activeGuard = GameObject.Find("Node"+item);
		activeGuard.renderer.material.color = Color.yellow;
	}
}

function SetNewGuardPath () {
	// reset params
	arrived = false;
	next = 0;
	hops = minPath;
	
	for (item in ghash.Keys) {
		var guard = GameObject.Find("Node"+item);
		guard.renderer.material.color = Color.cyan;
	}
	ghash.Clear();
	nhash.Clear();
	order.Clear();
}

function SelectPath (hops : int): void {
	// guard node is first, need to select ncount-1 more nodes in path
	for (var i:int = 0; i < minPath; i++) {
		var n = Random.Range(0, ncount-1);
		while (ghash[n] != null || nhash[n] != null)
			n = Random.Range(0, ncount-1);
		order.push(n);
		nhash[n] = n;
	}
}

function SetNewPath () {
	// reset params
	arrived = false;
	next = 0;
	hops = minPath;
	nhash.Clear();
	var o = order.length;
	for (var i:int = 1; i < o; i++) {
		order.RemoveAt(1);
	}
	SelectPath(hops);
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
	SetTimer();
	
	// play again button
	if (GUI.Button(Rect(Screen.width - 100,Screen.height - 50,80,40),"Play Again")) {
		// select new guard nodes and new path
		SetNewGuardPath();
		SelectGuards(guardCount);
		SelectPath(hops);
		
		// reset position of message
		message.transform.position = Vector3(cli.transform.position.x, cli.transform.position.y, cli.transform.position.z);
		Debug.Log("Node Path " + order.toString());
		startTime = Time.time;
		messageState = MessageStates.NODE;
		var controller : MessageController = message.GetComponent(MessageController);
		controller.setNodePath(order);
	}
	
	// label for client
	var cliPos = Camera.main.WorldToScreenPoint(cli.transform.position);
	GUI.Label(Rect(cliPos.x - 15, cliPos.y + 10, 70, 50), "Client"); 
	
	// label for recip
	var recipPos = Camera.main.WorldToScreenPoint(recip.transform.position);
	GUI.Label(Rect(recipPos.x - 25, recipPos.y + 10, 70, 50), "Recipient");
	
	// title and names
	var styleTitle = new GUIStyle();
	styleTitle.fontSize = 16;
	styleTitle.fontStyle = FontStyle.Bold;
	styleTitle.normal.textColor = Color.white;
	GUI.Label(Rect(10, 10, 200, 30), "TOR Onion Routing and Guard Entry", styleTitle);
	GUI.Label(Rect(10, 30, 220, 30), "By Anthony Wang & Sonny Lin");
	
	// legend for nodes
	GUI.Label(Rect(10, 55, 150, 30), "Legend:");
	var stylePassive = new GUIStyle();
	stylePassive.normal.textColor = Color.cyan;
	var styleActive = new GUIStyle();
	styleActive.normal.textColor = Color.yellow;
	GUI.Label(Rect(10, 75, 150, 30), "Existing Guard Nodes", stylePassive);
	GUI.Label(Rect(10, 90, 150, 30), "Client's Guard Nodes", styleActive);
	GUI.Label(Rect(10, 100, 150, 30), "Regular Nodes");
}

function SetTimer () {
	// timer
	var guiTime = Time.time - startTime;
	var seconds : int = guiTime % 60;
	textTime = String.Format(":{0:00}", seconds);
	var styleTimer = new GUIStyle();
	styleTimer.normal.textColor = Color.gray;
	GUI.Label(Rect(Screen.width - 130 , Screen.height - 35,80,40), textTime, styleTimer);
}