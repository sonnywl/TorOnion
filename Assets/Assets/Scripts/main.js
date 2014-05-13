#pragma strict

var node:GameObject;

function Start () {
	for(var i:int = 0; i < 5; i++){
		Instantiate(node,  
		Vector3(Random.value*10 + this.camera.transform.position.x, 
		0, 
		Random.value*10 + this.camera.transform.position.z), Quaternion.identity);
	}
}

function Update () {

}