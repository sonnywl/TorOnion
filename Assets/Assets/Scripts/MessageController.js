#pragma strict

private var collisionTarget : String;
private var nodePath : Array;

function Awake() {
	collisionTarget = "";
}

function OnTriggerEnter(collider:Collider){
	if(nodePath != null){
		for(var i:int = 0; i < nodePath.length; i++) {
			if(!collisionTarget.Equals(nodePath[i])) {
				collisionTarget = collider.name;
			}
		}
	} else {
		if(!collisionTarget.Equals(collider.name)) {
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