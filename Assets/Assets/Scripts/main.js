#pragma strict

var node : GameObject;
var client : GameObject;
var capsule : GameObject;

// selecting guard nodes
var guardCount : int = 3;
var ncount : int = 8;
var ghash = new Hashtable();
var nhash = new Hashtable();
var order = new Array();

// message movement
var startTime : float;
var startPos : Vector3;
var currPos : Vector3;
var endPos : Vector3;
var duration : float = 2.0;
var recipPos : Vector3;

// path
var next : int = 0;
var hops : int = 3;
var minPath : int = 3;

function Start () {
	var camPos = this.camera.transform.position;
	
	// instantiate client and recipient
	var cli = Instantiate(client, Vector3(camPos.x - 12f, 0, camPos.z), Quaternion.identity);
	var recip = Instantiate(client, Vector3(camPos.x + 12f, 0, camPos.z), Quaternion.identity);
	cli.name = "Client";
	recip.name = "Recip";
	
	// instantiate message to clients position
	var start = GameObject.Find("Client");
	var message = Instantiate (
		capsule, 
		Vector3(start.transform.position.x, start.transform.position.y, start.transform.position.z),
		Quaternion.Euler(90.0, 90.0, 0.0)
	);
	message.name = "Message";
	
	// instantiate tor nodes
	for (var i:int = 0; i < ncount; i++) {
		var clone = Instantiate(
			node,  
			Vector3 (
				Random.Range(-Random.value*7, Random.value*7) + camPos.x, 
				0, 
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
	Debug.Log(order.toString());
	
	// start time
	startTime = Time.time;
	// start pos
	startPos = start.transform.position;
	
}

function Update () {
	// move message towards first guard node
	var message = GameObject.Find("Message");
	currPos = message.transform.position;
	var endpoint = GameObject.Find("Node"+order[next]);
	endPos = endpoint.transform.position;
	
	if (hops > 0) {
		// while hopping, check to see if at destination, if not, set up new travel params
		if ((currPos.x == endPos.x) && (currPos.z == endPos.z)) {
			next++;
			hops--;
			startPos = endPos;
			startTime = Time.time;
			Debug.Log("Next: "+next + " | hops: "+ hops);
		} else {
			//LookTo(message, endpoint, startPos, endPos);
			message.transform.position = Vector3.Lerp(startPos, endPos, (Time.time - startTime) / duration);	
		}
	} else {
		// go to recipient
		var finish = GameObject.Find("Recip");
		recipPos = finish.transform.position;
		message.transform.position = Vector3.Lerp(startPos, recipPos, (Time.time - startTime) / duration);
	}
}

function SelectGuards (guardCount : int) {
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
		//Debug.Log(item);
		var guard = GameObject.Find("Node"+item);
		guard.renderer.material.color = Color.blue;
		//guard.renderer.material.shader = Shader.Find("Specular");
		//guard.renderer.material.SetColor("_SpecColor", Color.blue);
	}
}

function SelectPath (hops : int) {
	// guard node is first, need to select ncount-1 more nodes in path
	for (var i:int = 0; i < minPath; i++) {
		var n = Random.Range(0, ncount);
		while (ghash[n] != null || nhash[n] != null)
			n = Random.Range(0, ncount);
		order.push(n);
		nhash[n] = n;
	}
}

/*function LookTo (object : GameObject, target : GameObject, startPos : Vector3, endPos : Vector3) {
	var direction = startPos - currPos;
	var forward = object.transform.forward;
	var x = Vector3.Angle(direction, forward);
	var y = 90.0;
	var z = 0.0;
	var dir = new Vector3(x + 90.0, y, z);
	Debug.Log("Direction "+dir.ToString());
	//var step = speed * Time.deltaTime;
	//var newdir = Vector3.RotateTowards(object.transform.forward, dir, 0f, 0.0);
	object.transform.eulerAngles = dir;
}*/

