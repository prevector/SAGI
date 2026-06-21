package com.buddha.phys3d;

import com.badlogic.gdx.math.Vector3;

public class Particle3 {
	public Vector3 pos;
	public Vector3 oldPos;
	public float mass;
	public float friction = 1f;
	
	public Particle3(float x, float y, float z, float mass) {
		pos = new Vector3(x, y, z);
		oldPos = new Vector3(x, y, z);
		this.mass = mass;
	}
	
	public void update() {
		float tempX = pos.x;
		float tempY = pos.y;
		float tempZ = pos.z;
		pos.add((pos.x-oldPos.x)*friction, (pos.y-oldPos.y)*friction, (pos.z-oldPos.z)*friction);
		oldPos.set(tempX, tempY,tempZ);
	}
	
	public void addImpulse(float x, float y, float z) {
		oldPos.sub(x, y, z);
	}
	
	public void resetVel() {
		oldPos.set(pos);
	}
	
	public void setVel(float x, float y, float z) {
		oldPos.set(pos.x-x, pos.y-y, pos.z-z);
	}
	
	public float getXVel() {
		return pos.x-oldPos.x;
	}
	
	public float getYVel() {
		return pos.y-oldPos.y;
	}
	
	public float getZVel() {
		return pos.z-oldPos.z;
	}
}
