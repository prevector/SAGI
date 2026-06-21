package com.buddha.agent;

import com.buddha.world.Circle;

public class Ball {
	public Circle circle;
	public float z = 0;
	public float dz = 0;
	public float gravity = 0.05f;
	
	public Ball(float x, float y) {
		circle = new Circle(x, y, 0.7f,0.3f);
		circle.particle.friction = 0.992f;
		circle.particle.addImpulse(0.5f, 0.5f);
	}
	
	public void update() {
		if(z < 0) {
			z = 0;
			dz = -dz*0.8f;
		}
		dz-=gravity;
		z+=dz;
	}
}
