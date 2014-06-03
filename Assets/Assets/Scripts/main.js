#pragma strict

var node : GameObject;
var client : GameObject;
var capsule : GameObject;

// selecting guard nodes
var guardCount : int = 5;
var activeGuards : int = 3;
private var nodeCount : int = 11;
// path

private var minPath : int = 3;
private var hops : int = minPath;
private var next : int = 0; // Represents the next node in the array to go to
private var currentNode : int; // Tracking the Next Node in Order Array

// Timekeeping
// None private variables are defined in Inspector Console
var delayTime:float; 
var messageSpeed:int;
private var tcount : int;
private var startTime : float; // not sure if keeping stopwatch yet
private var textTime : String;
private var seconds : int;
private var currDelayTime :float;

private var ghash = new Hashtable();
private var nhash = new Hashtable();
private var guardPool = new Hashtable(); // all guard entries
private var order = new Array();
private var colors : Color[];

private var camPos	: Vector3;
private var cli 	: GameObject;
private var recip	: GameObject;
private var message	: GameObject;
private var controller : MessageController;

private var arrivedRecipent	: boolean;
private enum MessageStates {CLIENT, NODE, CONNECT, RETURN, RECIPENT, RESTART};
private var messageState : MessageStates;

// line color
private var c1 : Color = Color.white;
private var c2 : Color = Color(1,1,1,0);

function Awake() {
	arrivedRecipent = false;
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
	controller = message.GetComponent(MessageController);
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
}

function Start () {
	// instantiate tor nodes
	for (var i:int = 0; i < nodeCount; i++) {
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
	SelectPath();
	currentNode = next;
	messageState = MessageStates.CONNECT;
}

function FixedUpdate () {
	var controller : MessageController = message.GetComponent(MessageController);	
	var endpoint : GameObject;

	switch(messageState) {
		case MessageStates.NODE: // Runs all the way to server
			if(next < order.length) {
				endpoint = GameObject.Find("Node"+order[next]);
			} else {
				endpoint = GameObject.Find("Node"+order[order.length-1]);
			}
			// Go to Server
			if (controller.getCollisionTarget().Equals(endpoint.name)) {
				next++;
				if(next < order.length) {
					Debug.Log(colors.Length+ " next "+ next + " "+order.ToString()+ " " +endpoint.name);
					message.renderer.material.color = colors[next];
				} else {
					messageState = MessageStates.RECIPENT;
					message.renderer.material.color = Color.white;
					break;
				}
			} 				
			message.transform.LookAt(endpoint.transform);
			forward();
			break;
		case MessageStates.CONNECT:
			if(next < 0) {
				next = 0;
			}
			if(next < order.length) {
				endpoint = GameObject.Find("Node"+order[next]);
			} else {
				endpoint = GameObject.Find("Node"+order[order.length-1]);
			}
			
			if(controller.getCollisionTarget().Equals(endpoint.name)) {
				if (next == 0) {
					renderLine(endpoint, cli);
				} else if (next < order.length && next > 0) {
					//Debug.Log("CurrentNode: " +endpoint.name + " | NextNode: Node"+ order[next]);
					renderLine(endpoint, GameObject.Find("Node"+order[next-1]));
				}
				if(next == currentNode) {
					if(currentNode==order.length) {
						arrivedRecipent = false;
						messageState = MessageStates.RECIPENT;
						tcount++;
					} else {
						currentNode++;
						next--;
						messageState = MessageStates.RETURN;
					}
				} else {
					next++;
					if(next > order.length - 1) { // RECIPENT
						message.renderer.material.color = Color.white;
					} else {
						message.renderer.material.color = colors[next-1];
					}
				}
			}
			message.transform.LookAt(endpoint.transform);
			forward();
			break;
		case MessageStates.RETURN: // Runs all the way back to client
			if(next >= 0 ) {
				endpoint = GameObject.Find("Node"+order[next]);
			} else {
				endpoint = GameObject.Find(cli.name);
			}
			if (controller.getCollisionTarget().Equals(endpoint.name)) {
				next--;
				if(next >= 0) {
					message.renderer.material.color = colors[next];
				}
				if (next < 0) {
					messageState = MessageStates.CLIENT;
					message.renderer.material.color = Color.white;
				}
			}
			message.transform.LookAt(endpoint.transform);
			forward();
			break;
		case MessageStates.CLIENT:
			message.transform.LookAt(cli.transform);
			forward();
			if(controller.getCollisionTarget().Equals(cli.name)) {
				if(tcount >= 3) {
					messageState = MessageStates.RESTART;
					arrivedRecipent = false;
				} else {
					messageState = MessageStates.CONNECT;
				}
			}
			break;
		case MessageStates.RECIPENT:
			message.transform.LookAt(recip.transform);
			if(!arrivedRecipent) {
				forward();
			}
			if (controller.getCollisionTarget().Equals(recip.name)) {
				renderLine(recip, GameObject.Find("Node"+order[order.length-1]));
				arrivedRecipent = true;
				if (DelayMessage()) {
					messageState = MessageStates.RETURN;
					next--;
				}
			}
			break;
		case MessageStates.RESTART:
			if (controller.getCollisionTarget().Equals("Client")) {
				if (tcount >= 3) {
					clearRenderedLines();
					SetNewGuardPath();
					SelectGuards(guardCount);
					SetNewPath();
					Debug.Log("Node Path " + order.toString());
					startTime = Time.time;
					tcount = 0;
				}
				messageState = MessageStates.CONNECT;
			}
			break;
	}
}

function forward() {
	message.transform.position = message.transform.position  + (message.transform.forward * messageSpeed * Time.deltaTime);
}
//var lineMaterial : Material;
//function CreateLineMaterial:void()
//{
//	if( !lineMaterial )
//	{
//		lineMaterial = new Material( "Shader \"Lines/Colored Blended\" {" +
//		"SubShader { Pass { " +
//		" Blend SrcAlpha OneMinusSrcAlpha " +
//		" ZWrite Off Cull Off Fog { Mode Off } " +
//		" BindChannels {" +
//		" Bind \"vertex\", vertex Bind \"color\", color }" +
//		"} } }" );
//		lineMaterial.hideFlags = HideFlags.HideAndDontSave;
//		lineMaterial.shader.hideFlags = HideFlags.HideAndDontSave;
//	}
//}

function renderLine(start : GameObject, end : GameObject) {
	//var end = GameObject.Find("Node"+endNode);
	var line : LineRenderer = end.GetComponent(LineRenderer);
	line.SetColors(c2, c1);
	line.SetWidth(0.1f, 0.1f);
	line.SetPosition(0, end.transform.position);
	line.SetPosition(1, start.transform.position);
	line.SetVertexCount(2);
}

function clearRenderedLines() {
	for (var n = 0; n < nodeCount; n++) {
		var node : GameObject = GameObject.Find("Node"+n);
		var lr : LineRenderer = node.GetComponent(LineRenderer);
		lr.SetPosition(0, node.transform.position);
		lr.SetPosition(1, node.transform.position);
	}
	var lrcli : LineRenderer = cli.GetComponent(LineRenderer);
	lrcli.SetPosition(0, cli.transform.position);
	lrcli.SetPosition(1, cli.transform.position);
	var lrrecip : LineRenderer = cli.GetComponent(LineRenderer);
	lrrecip.SetPosition(0, recip.transform.position);
	lrrecip.SetPosition(1, recip.transform.position);
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
	arrivedRecipent = false;
	next = 0;
	hops = minPath;
	currentNode = next++;

	for (item in ghash.Keys) {
		var guard = GameObject.Find("Node"+item);
		guard.renderer.material.color = Color.cyan;
	}
	ghash.Clear();
	nhash.Clear();
	order.Clear();
}

function SelectPath (): void {
	// guard node is first, need to select nodeCount-1 more nodes in path
	for (var i:int = 0; i < minPath-1; i++) {
		var n = Random.Range(0, nodeCount-1);
		while (ghash[n] != null || nhash[n] != null)
			n = Random.Range(0, nodeCount-1);
		order.push(n);
		nhash[n] = n;
	}
	Debug.Log(minPath + " " +	order.ToString());
	controller.setNodePath(order);
}

function SetNewPath () {
	// reset params
	arrivedRecipent = false;
	next = 0;
	hops = minPath;
	nhash.Clear();
	var o = order.length;
	
	for (var i:int = 1; i < o; i++) {
		order.RemoveAt(1);
	}
	SelectPath();
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
		clearRenderedLines();
		SetNewGuardPath();
		SelectGuards(guardCount);
		SelectPath();
		SetNewPath();
		// reset position of message
		message.transform.position = Vector3(cli.transform.position.x, cli.transform.position.y, cli.transform.position.z);
		message.renderer.material.color = Color.white;
		Debug.Log("Node Path " + order.toString());
		startTime = Time.time;
		messageState = MessageStates.CONNECT;
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