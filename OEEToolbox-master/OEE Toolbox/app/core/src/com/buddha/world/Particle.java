package com.buddha.world;

import com.badlogic.gdx.math.Vector2;

public class Particle {
	
	public Vector2 pos;
	public Vector2 oldPos;
	public float mass;
	public float friction = 1;
	
	public Particle(float x, float y, float mass) {
		pos = new Vector2(x, y);
		oldPos = new Vector2(x, y);
		this.mass = mass;
	}
	
	public void update() {
		float tempX = pos.x;
		float tempY = pos.y;
		pos.add((pos.x-oldPos.x)*friction, (pos.y-oldPos.y)*friction);
		oldPos.set(tempX, tempY);
	}
	
	public void addImpulse(float x, float y) {
		oldPos.sub(x, y);
	}
	
	public void translate(float x, float y) {
		float xv = pos.x-oldPos.x;
		float yv = pos.y-oldPos.y;
		pos.set(pos.x+x, pos.y+y);
		oldPos.set(pos.x-xv, pos.y-yv);
	}
	
	public void resetVel() {
		oldPos.set(pos);
	}
	
	public void setVel(float x, float y) {
		oldPos.set(pos.x-x, pos.y-y);
	}
	
	public float getXVel() {
		return pos.x-oldPos.x;
	}
	
	public float getYVel() {
		return pos.y-oldPos.y;
	}
	
	public float getSpeed() {
		return pos.dst(oldPos);
	}
	
	public void bounce(float xa, float ya, float atX, float atY) {
		float xv = getXVel();
		float yv = getYVel();
		float vel = xa*xv+ya*yv;
		pos.set(atX, atY);
		setVel(xv-2*xa*vel, yv-2*ya*vel);
	}
}

