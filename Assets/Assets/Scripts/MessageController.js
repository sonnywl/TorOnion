#pragma strict

private var collisionTarget : String;

function Awake() {
	collisionTarget = "";
}

function OnTriggerEnter(collider:Collider){
	if(!collisionTarget.Equals(collider.name)) {
		collisionTarget = collider.name;
	}
}

function getCollisionTarget():String {
	return collisionTarget;
}