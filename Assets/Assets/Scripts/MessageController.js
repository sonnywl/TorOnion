#pragma strict

private var collisionTarget : String;
private var nodePath : Array;

function Awake() {
	collisionTarget = "";
}

function OnTriggerEnter(collider:Collider){
	for(var i:int = 0; i < nodePath.length; i++) {
		if(collider.name.Equals("Node"+nodePath[i])) {
			collisionTarget = collider.name;
		} else if(!collider.name.Contains("Node")) {
			collisionTarget = collider.name;
		}
	}
}

function setNodePath(path:Array){
	nodePath = path;
}

function getCollisionTarget():String {
	return collisionTarget;
}